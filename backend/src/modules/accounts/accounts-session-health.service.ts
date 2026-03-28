import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { PuppeteerAdvancedService } from '../puppeteer/puppeteer-advanced.service';

@Injectable()
export class AccountsSessionHealthService implements OnModuleInit {
  private readonly logger = new Logger(AccountsSessionHealthService.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private accountsService: AccountsService,
    private puppeteerAdvancedService: PuppeteerAdvancedService,
  ) {}

  async onModuleInit() {
    await this.accountsService.normalizeStatuses();

    const intervalMs = Number(process.env.SESSION_HEALTHCHECK_INTERVAL_MS || 30 * 60 * 1000);
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;

    this.timer = setInterval(() => {
      this.runOnce().catch((e) => this.logger.error(e?.message || String(e)));
    }, intervalMs);
    this.timer.unref?.();
  }

  private async runOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const now = Date.now();
      const minAgeMs = Number(process.env.SESSION_HEALTHCHECK_MIN_AGE_MS || 15 * 60 * 1000);
      const accounts = await this.accountsService.findAll();
      const candidates = accounts.filter((a) => {
        if (a.status !== 'ACTIVE') return false;
        const last = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        return now - last >= minAgeMs;
      });

      for (const account of candidates) {
        if (!account.profilePath) continue;
        const state = await this.puppeteerAdvancedService.getGoogleSessionState(
          account.profilePath,
        );
        if (state.status !== 'ACTIVE') {
          await this.accountsService.update(account._id.toString(), { status: state.status });
        }
      }
    } finally {
      this.running = false;
    }
  }
}
