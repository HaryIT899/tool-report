import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { REPORT_QUEUE, ReportJobData } from './report.queue';
import { ReportLogsService } from '../report-logs/report-logs.service';
import { PuppeteerAdvancedService } from '../puppeteer/puppeteer-advanced.service';
import { PuppeteerSimpleService } from '../puppeteer/puppeteer-simple.service';
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
    private puppeteerSimpleService: PuppeteerSimpleService,
    private proxiesService: ProxiesService,
    private domainsService: DomainsService,
    private reportServicesService: ReportServicesService,
    private accountsService: AccountsService,
  ) {
    super();
  }

  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async process(job: Job<ReportJobData>): Promise<any> {
    this.logger.log(`Processing report job ${job.id} for domain ${job.data.domain}`);

    // Random delay between jobs (3-10s)
    const delayMs = this.getRandomDelay(3000, 10000);
    this.logger.log(`Delaying ${delayMs}ms before starting job ${job.id}`);
    await this.sleep(delayMs);

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
      const configuredRaw = (process.env.PROFILES_DIR || '').trim();
      const configured = configuredRaw.replace(/^"+|"+$/g, '');
      const isWindowsLongPathPrefixOnly =
        configured === '\\\\?' || configured === '\\\\?\\' || configured === '\\\\?\\\\';
      const isWindowsLongPathButMissingTarget =
        configured.startsWith('\\\\?\\') && configured.length <= '\\\\?\\'.length + 1;
      const useConfigured =
        !!configured &&
        !isWindowsLongPathPrefixOnly &&
        !isWindowsLongPathButMissingTarget &&
        configured !== '\\?' &&
        configured !== '\\?\\';
      const profilesRoot = useConfigured
        ? path.resolve(configured)
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
      let result: { success?: boolean; error?: string; tabUrl?: string } | undefined;

      // Build payload for extension
      const payload = {
        domain: job.data.domain,
        reason: job.data.reason,
        email: job.data.email,
        // Add any additional fields needed by extension
        name: job.data.email?.split('@')[0] || '',
        // For Google DMCA
        firstName: process.env.DMCA_FIRST_NAME || 'User',
        lastName: process.env.DMCA_LAST_NAME || 'Demo',
        company: process.env.DMCA_COMPANY || '',
        signature: process.env.DMCA_FIRST_NAME + ' ' + process.env.DMCA_LAST_NAME || 'User Demo',
        workDescription: job.data.reason,
        authorizedUrl: process.env.DMCA_AUTHORIZED_URL || '',
        infringingUrls: job.data.domain,
        // For Cloudflare
        title: process.env.CF_TITLE || '',
        phone: process.env.CF_TELE || '',
        // For Safe Browsing
        urlToReport: job.data.domain.startsWith('http')
          ? job.data.domain
          : `https://${job.data.domain}`,
        safeBrowsingThreatType: 'Tấn công phi kỹ thuật',
        safeBrowsingThreatCategory: 'Lừa đảo qua mạng xã hội',
        autoSubmit: process.env.AUTO_SUBMIT === 'true',
      };

      if (!shouldUseAccount) {
        const profilePath = path.join(profilesRoot, 'profile_default');
        await fs.promises.mkdir(profilePath, { recursive: true });
        result = await this.puppeteerSimpleService.openPageWithPayload(
          {
            profilePath,
            reportUrl: targetService.reportUrl,
            payload,
            proxy,
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

          // Update payload with account email
          payload.email = account.email;
          payload.name = account.email.split('@')[0];

          result = await this.puppeteerSimpleService.openPageWithPayload(
            {
              profilePath,
              reportUrl: targetService.reportUrl,
              payload,
              proxy,
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
      if (result.error || !result.success) {
        throw new Error(result.error || 'Failed to open page');
      }
      const updateData: any = { status: 'success' };
      if (result.tabUrl) {
        await this.reportLogsService.appendEvent(
          reportLog._id.toString(),
          'tab_opened',
          `Opened: ${result.tabUrl}`,
        );
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
