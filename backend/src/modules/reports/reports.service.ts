import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { REPORT_QUEUE, ReportJobData } from '../queues/report.queue';
import { DomainsService } from '../domains/domains.service';
import { ReportServicesService } from '../report-services/report-services.service';
import { AccountsService } from '../accounts/accounts.service';
import { ReportLogsService } from '../report-logs/report-logs.service';
import { PuppeteerAdvancedService } from '../puppeteer/puppeteer-advanced.service';
import { ProxiesService } from '../proxies/proxies.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectQueue(REPORT_QUEUE) private reportQueue: Queue,
    private domainsService: DomainsService,
    private reportServicesService: ReportServicesService,
    private accountsService: AccountsService,
    private reportLogsService: ReportLogsService,
    private puppeteerAdvancedService: PuppeteerAdvancedService,
    private proxiesService: ProxiesService,
  ) {}

  private filterServices(services: any[]): any[] {
    const onlyUrlRaw = (process.env.REPORT_ONLY_SERVICE_URL || '').trim();
    const onlyNameRaw = (process.env.REPORT_ONLY_SERVICE_NAME || '').trim().toLowerCase();
    const excludeUrlRaw = (process.env.REPORT_EXCLUDE_SERVICE_URL || '').trim();
    const excludeNameRaw = (process.env.REPORT_EXCLUDE_SERVICE_NAME || '').trim().toLowerCase();
    const onlyUrls = onlyUrlRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const onlyNames = onlyNameRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const excludeUrls = excludeUrlRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const excludeNames = excludeNameRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    let filtered = services;
    if (onlyUrls.length) {
      filtered = filtered.filter((s) => {
        const serviceUrl = String(s.reportUrl || '').toLowerCase();
        let serviceHost = '';
        try {
          serviceHost = new URL(serviceUrl).hostname.toLowerCase();
        } catch {
          // ignore
        }
        return onlyUrls.some((u) => {
          const v = u.toLowerCase();
          if (!v) return false;
          if (serviceUrl.includes(v)) return true;
          try {
            const onlyHost = new URL(v).hostname.toLowerCase();
            if (onlyHost && serviceHost) {
              return serviceHost === onlyHost || serviceHost.endsWith(`.${onlyHost}`);
            }
          } catch {
            // If not a full URL, treat as host/path fragment
            if (serviceHost && v.includes('.')) {
              return serviceHost === v || serviceHost.endsWith(`.${v}`);
            }
          }
          return false;
        });
      });
    }
    if (onlyNames.length) {
      filtered = filtered.filter((s) => {
        const n = String(s.name || '').toLowerCase();
        return onlyNames.some((x) => n.includes(x));
      });
    }
    if (excludeUrls.length) {
      filtered = filtered.filter((s) => {
        const serviceUrl = String(s.reportUrl || '').toLowerCase();
        let serviceHost = '';
        try {
          serviceHost = new URL(serviceUrl).hostname.toLowerCase();
        } catch {
          // ignore
        }
        return !excludeUrls.some((u) => {
          const v = u.toLowerCase();
          if (!v) return false;
          if (serviceUrl.includes(v)) return true;
          try {
            const exclHost = new URL(v).hostname.toLowerCase();
            if (exclHost && serviceHost) {
              return serviceHost === exclHost || serviceHost.endsWith(`.${exclHost}`);
            }
          } catch {
            if (serviceHost && v.includes('.')) {
              return serviceHost === v || serviceHost.endsWith(`.${v}`);
            }
          }
          return false;
        });
      });
    }
    if (excludeNames.length) {
      filtered = filtered.filter((s) => {
        const n = String(s.name || '').toLowerCase();
        return !excludeNames.some((x) => n.includes(x));
      });
    }
    return filtered;
  }

  async reportDomain(domainId: string, serviceIds: string[], userId: string) {
    return this.reportDomainWithAccount(domainId, serviceIds, userId, undefined);
  }

  async reportDomainWithAccount(
    domainId: string,
    serviceIds: string[],
    userId: string,
    accountId?: string,
  ) {
    this.logger.log(
      `reportDomain requested: domainId=${domainId} services=${serviceIds.length} accountId=${accountId || 'auto'}`,
    );
    const domain = await this.domainsService.findById(domainId, userId);

    const services = this.filterServices(await this.reportServicesService.findAll());
    const hasOnly =
      !!(process.env.REPORT_ONLY_SERVICE_URL || '').trim() ||
      !!(process.env.REPORT_ONLY_SERVICE_NAME || '').trim();
    const selectedServices = hasOnly
      ? services
      : services.filter((s) => serviceIds.includes(s._id.toString()));
    if (selectedServices.length === 0) {
      return {
        message: 'No report services selected',
        jobs: [],
      };
    }

    const jobs = [];
    for (const service of selectedServices) {
      let account = null;
      if (accountId) {
        // Use specific account
        account = await this.accountsService.findById(accountId);
        if (!account) {
          throw new Error(`Account ${accountId} not found`);
        }
      } else {
        // Auto-select account
        account = await this.accountsService.getNextAvailableAccount();
      }

      const jobData: ReportJobData = {
        domainId: domain._id.toString(),
        serviceId: service._id.toString(),
        userId,
        domain: domain.domain,
        reason: domain.reason,
        accountId: account?._id.toString(),
        email: account?.email,
      };

      const job = await this.reportQueue.add('report-domain', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });

      const log = await this.reportLogsService.create({
        domainId: domain._id as any,
        serviceId: service._id as any,
        userId: userId as any,
        accountId: account?._id as any,
        email: account?.email,
        status: 'pending',
        jobId: String(job.id),
      } as any);
      await this.reportLogsService.appendEvent(
        log._id.toString(),
        'queued',
        `Queued job for ${service.name} with account ${account?.email || 'default'}`,
      );
      this.logger.log(`Queued jobId=${job.id} service=${service.name} logId=${log._id.toString()}`);

      jobs.push({ jobId: job.id, service: service.name, logId: log._id, account: account?.email });
    }

    await this.domainsService.update(
      domainId,
      { status: 'processing', reportedServices: [], failedServices: [], reportProgress: 0 },
      userId,
    );

    return {
      message: `Queued ${jobs.length} report jobs`,
      jobs,
    };
  }

  async reportAllDomains(userId: string) {
    const domains = await this.domainsService.findAll(userId);
    const pendingDomains = domains.filter((d) => d.status === 'pending');
    const services = this.filterServices(await this.reportServicesService.findAll());

    if (services.length === 0) {
      return {
        message: `Queued 0 report jobs for ${pendingDomains.length} domains`,
        domains: pendingDomains.length,
        jobs: 0,
      };
    }

    let totalJobs = 0;

    for (const domain of pendingDomains) {
      for (const service of services) {
        const account = await this.accountsService.getNextAvailableAccount();

        const jobData: ReportJobData = {
          domainId: domain._id.toString(),
          serviceId: service._id.toString(),
          userId,
          domain: domain.domain,
          reason: domain.reason,
          accountId: account?._id.toString(),
          email: account?.email,
        };

        const job = await this.reportQueue.add('report-domain', jobData);
        const log = await this.reportLogsService.create({
          domainId: domain._id as any,
          serviceId: service._id as any,
          userId: userId as any,
          accountId: account?._id as any,
          email: account?.email,
          status: 'pending',
          jobId: String(job.id),
        } as any);
        await this.reportLogsService.appendEvent(
          log._id.toString(),
          'queued',
          `Queued job for ${service.name}`,
        );
        this.logger.log(
          `Queued jobId=${job.id} service=${service.name} logId=${log._id.toString()}`,
        );
        totalJobs++;
      }

      await this.domainsService.update(
        domain._id.toString(),
        { status: 'processing', reportedServices: [], failedServices: [], reportProgress: 0 },
        userId,
      );
    }

    return {
      message: `Queued ${totalJobs} report jobs for ${pendingDomains.length} domains`,
      domains: pendingDomains.length,
      jobs: totalJobs,
    };
  }

  async runPuppeteerTool(
    domainId: string,
    serviceId: string,
    userId: string,
    body?: { email?: string; accountId?: string; proxyId?: string },
  ) {
    this.logger.log(`runPuppeteerTool called with body: ${JSON.stringify(body)}`);

    const domain = await this.domainsService.findById(domainId, userId);
    const services = this.filterServices(await this.reportServicesService.findAll());
    const service = services.find((s) => s._id.toString() === serviceId);
    if (!service) {
      return { ok: false, error: 'Report service not found' };
    }

    let profilePath: string;
    let email = (body?.email || '').trim();
    let accountId: string | undefined;
    let proxy = null;

    // Handle proxy selection
    if (body?.proxyId) {
      // Use specific proxy if provided
      proxy = await this.proxiesService.findById(body.proxyId);
      if (!proxy) {
        return { ok: false, error: 'Proxy not found' };
      }
      if (proxy.status !== 'active') {
        return { ok: false, error: 'Proxy is not active' };
      }
      this.logger.log(`Using specific proxy: ${proxy.host}:${proxy.port}`);
    } else {
      // Auto-select proxy (similar to account rotation)
      proxy = await this.proxiesService.getNextAvailableProxy();
      if (proxy) {
        this.logger.log(`Auto-selected proxy: ${proxy.host}:${proxy.port}`);
      } else {
        this.logger.log('No proxy available, using direct connection');
      }
    }

    if (body?.accountId) {
      const account = await this.accountsService.ensureProfilePathById(body.accountId);
      if (!account) {
        return { ok: false, error: 'Account not found' };
      }
      profilePath = account.profilePath;
      accountId = account._id.toString();
      if (!email) email = account.email;
    } else {
      // Auto-select an available account instead of using default profile
      const account = await this.accountsService.getNextAvailableAccount();
      if (account) {
        profilePath = account.profilePath;
        accountId = account._id.toString();
        if (!email) email = account.email;
        this.logger.log(`Auto-selected account: ${email} for tool`);
      } else {
        // Fallback to default profile if no account available
        const configuredRaw = (process.env.PROFILES_DIR || '').trim();
        const configured = configuredRaw.replace(/^"+|"+$/g, '');
        const profilesRoot = configured
          ? path.resolve(configured)
          : path.resolve(process.cwd(), 'profiles');
        await fs.promises.mkdir(profilesRoot, { recursive: true });
        profilePath = path.join(profilesRoot, 'profile_tool_default');
        await fs.promises.mkdir(profilePath, { recursive: true });
        this.logger.warn('No account available, using default profile');
      }
    }

    const events: { stage: string; message?: string }[] = [];
    const result = await this.puppeteerAdvancedService.openReportPage(
      {
        domain: domain.domain,
        reason: domain.reason,
        email: email || undefined,
        serviceId: service._id.toString(),
        profilePath,
        proxy: proxy || undefined,
      },
      async (event) => {
        events.push({ stage: event.stage, message: event.message });
      },
    );

    return {
      ok: !result.error,
      service: { id: service._id.toString(), name: service.name, reportUrl: service.reportUrl },
      domain: { id: domain._id.toString(), domain: domain.domain },
      account: accountId ? { id: accountId, email } : null,
      proxy: proxy ? { id: proxy._id.toString(), host: proxy.host, port: proxy.port } : null,
      profilePath,
      events,
      ...result,
    };
  }

  async resetDomain(domainId: string, userId: string) {
    const domain = await this.domainsService.findById(domainId, userId);

    const logs = await this.reportLogsService.findByDomainAndUser(domainId, userId);
    const jobIds = Array.from(
      new Set(logs.map((l) => String(l.jobId || '').trim()).filter(Boolean)),
    );

    let removedJobs = 0;
    let notRemovedJobs = 0;
    for (const jobId of jobIds) {
      try {
        const job = await this.reportQueue.getJob(jobId);
        if (!job) continue;
        await job.remove();
        removedJobs++;
      } catch {
        notRemovedJobs++;
      }
    }

    const deletedLogs = await this.reportLogsService.deleteByDomainAndUser(domainId, userId);

    await this.domainsService.update(
      domainId,
      { status: 'pending', reportedServices: [], failedServices: [], reportProgress: 0 },
      userId,
    );

    return {
      message: `Reset done for ${domain.domain}`,
      deletedLogs,
      removedJobs,
      notRemovedJobs,
    };
  }

  async getQueueStats() {
    const waiting = await this.reportQueue.getWaitingCount();
    const active = await this.reportQueue.getActiveCount();
    const completed = await this.reportQueue.getCompletedCount();
    const failed = await this.reportQueue.getFailedCount();
    const isPaused = await this.reportQueue.isPaused();

    return {
      waiting,
      active,
      completed,
      failed,
      isPaused,
    };
  }

  async pauseQueue() {
    await this.reportQueue.pause();
    return { message: 'Queue paused successfully' };
  }

  async resumeQueue() {
    await this.reportQueue.resume();
    return { message: 'Queue resumed successfully' };
  }

  async cleanQueue() {
    await this.reportQueue.clean(0, 1000, 'completed');
    await this.reportQueue.clean(0, 1000, 'failed');
    return { message: 'Queue cleaned successfully' };
  }
}
