import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { REPORT_QUEUE, ReportJobData } from './report.queue';
import { ReportLogsService } from '../report-logs/report-logs.service';
import { PuppeteerAdvancedService } from '../puppeteer/puppeteer-advanced.service';
import { ProxiesService } from '../proxies/proxies.service';
import { DomainsService } from '../domains/domains.service';
import { ReportServicesService } from '../report-services/report-services.service';
import { AccountsService } from '../accounts/accounts.service';
import * as fs from 'fs';
import * as path from 'path';

@Processor(REPORT_QUEUE, { concurrency: 2 })
@Injectable()
export class ReportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private reportLogsService: ReportLogsService,
    private puppeteerService: PuppeteerAdvancedService,
    private proxiesService: ProxiesService,
    private domainsService: DomainsService,
    private reportServicesService: ReportServicesService,
    private accountsService: AccountsService,
  ) {
    super();
  }

  async process(job: Job<ReportJobData>): Promise<any> {
    this.logger.log(`Processing report job ${job.id} for domain ${job.data.domain}`);

    const proxy = await this.proxiesService.getNextAvailableProxy();

    const existingLog = await this.reportLogsService.findByJobId(String(job.id));
    const logData: any = {
      domainId: job.data.domainId,
      serviceId: job.data.serviceId,
      userId: job.data.userId,
      accountId: job.data.accountId,
      email: job.data.email,
      status: 'processing',
      jobId: String(job.id),
    };

    if (proxy) {
      logData.proxyId = proxy._id;
      logData.proxyHost = `${proxy.host}:${proxy.port}`;
      this.logger.log(`Using proxy: ${logData.proxyHost}`);
    } else {
      this.logger.warn('No proxy available, proceeding without proxy');
    }

    const reportLog = existingLog
      ? await this.reportLogsService.update(existingLog._id.toString(), logData)
      : await this.reportLogsService.create(logData);
    this.logger.log(
      `${existingLog ? 'Using existing' : 'Created new'} logId=${reportLog._id.toString()} jobId=${job.id}`,
    );
    const services = await this.reportServicesService.findAll();
    const totalActiveServices = services.filter((s) => s.active !== false).length;
    await this.reportLogsService.appendEvent(
      reportLog._id.toString(),
      'job_started',
      'Job started',
    );

    try {
      const profilesRoot = process.env.PROFILES_DIR
        ? path.resolve(process.env.PROFILES_DIR)
        : path.resolve(process.cwd(), 'profiles');
      await fs.promises.mkdir(profilesRoot, { recursive: true });

      const targetService = services.find((s) => s._id.toString() === job.data.serviceId);
      const requiresGoogleSession =
        !!targetService &&
        (String(targetService.reportUrl || '').includes('search.google.com/search-console') ||
          String(targetService.reportUrl || '').includes('reportcontent.google.com'));

      const shouldUseAccount = requiresGoogleSession;
      const maxAccountTries = Number(process.env.ACCOUNT_MAX_RETRY || 3);
      const tried: string[] = [];
      let lastAuthError: string | undefined;
      let result: { screenshot?: string; error?: string } | undefined;

      if (!shouldUseAccount) {
        const profilePath = path.join(profilesRoot, 'profile_default');
        await fs.promises.mkdir(profilePath, { recursive: true });
        result = await this.puppeteerService.openReportPage(
          {
            domain: job.data.domain,
            reason: job.data.reason,
            email: job.data.email,
            serviceId: job.data.serviceId,
            proxy: proxy,
            profilePath,
          },
          async (event) => {
            await this.reportLogsService.appendEvent(
              reportLog._id.toString(),
              event.stage,
              event.message,
            );
          },
        );
      } else {
        for (let attempt = 0; attempt < maxAccountTries; attempt++) {
          let account = null;

          if (attempt === 0 && job.data.accountId) {
            const a = await this.accountsService.findById(job.data.accountId);
            if (a && a.status === 'ACTIVE') account = a;
            if (a && a.status !== 'ACTIVE') {
              await this.accountsService.update(a._id.toString(), { status: 'NEED_RELOGIN' });
            }
          }

          if (!account) {
            account = await this.accountsService.getNextActiveAccount(tried);
          }

          if (!account) {
            throw new Error(lastAuthError || 'No ACTIVE account available');
          }

          tried.push(account._id.toString());
          const profilePath =
            account.profilePath || path.join(profilesRoot, account._id.toString());
          await fs.promises.mkdir(profilePath, { recursive: true });

          await this.reportLogsService.update(reportLog._id.toString(), {
            accountId: account._id as any,
            email: account.email,
          } as any);

          if (requiresGoogleSession) {
            const state = await this.puppeteerService.getGoogleSessionState(
              profilePath,
              proxy,
              async (event) => {
                await this.reportLogsService.appendEvent(
                  reportLog._id.toString(),
                  event.stage,
                  event.message,
                );
              },
            );
            if (state.status !== 'ACTIVE') {
              await this.accountsService.update(account._id.toString(), { status: state.status });
              lastAuthError = state.reason || 'Google session not active';
              continue;
            }
          }

          result = await this.puppeteerService.openReportPage(
            {
              domain: job.data.domain,
              reason: job.data.reason,
              email: account.email,
              serviceId: job.data.serviceId,
              proxy: proxy,
              profilePath,
            },
            async (event) => {
              await this.reportLogsService.appendEvent(
                reportLog._id.toString(),
                event.stage,
                event.message,
              );
            },
          );

          if (result?.error?.includes('LOCKED:')) {
            await this.accountsService.update(account._id.toString(), { status: 'LOCKED' });
            lastAuthError = result.error;
            continue;
          }
          if (result?.error?.includes('AUTH_REQUIRED')) {
            await this.accountsService.update(account._id.toString(), { status: 'NEED_RELOGIN' });
            lastAuthError = result.error;
            continue;
          }

          break;
        }
      }

      if (!result) {
        throw new Error(lastAuthError || 'No result');
      }
      if (result.error) {
        throw new Error(result.error);
      }
      const updateData: any = { status: 'success' };
      if (result.screenshot) {
        updateData.screenshot = result.screenshot;
      }

      await this.reportLogsService.update(reportLog._id.toString(), updateData);
      await this.reportLogsService.appendEvent(
        reportLog._id.toString(),
        'job_success',
        'Job finished',
      );

      await this.domainsService.updateReportProgress(
        job.data.domainId,
        job.data.serviceId,
        totalActiveServices,
        'success',
      );

      if (proxy) {
        await this.proxiesService.markProxyAsSuccess(proxy._id.toString());
      }

      this.logger.log(`Job ${job.id} completed successfully`);
      return { success: true, logId: reportLog._id };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);

      await this.reportLogsService.updateStatus(reportLog._id.toString(), 'failed', error.message);
      await this.reportLogsService.appendEvent(
        reportLog._id.toString(),
        'job_failed',
        error.message,
      );
      await this.domainsService.updateReportProgress(
        job.data.domainId,
        job.data.serviceId,
        totalActiveServices,
        'failed',
      );

      if (proxy) {
        await this.proxiesService.markProxyAsFailed(proxy._id.toString());
      }

      throw error;
    }
  }
}
