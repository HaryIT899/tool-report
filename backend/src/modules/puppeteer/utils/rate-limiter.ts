/**
 * Rate Limiting and Throttling
 * Prevents too many requests per account/IP in short time
 */

export interface AccountUsage {
  accountId: string;
  lastUsed: number;
  usageCount: number;
  hourlyCount: number;
  hourStartTime: number;
}

class RateLimiter {
  private accountUsage: Map<string, AccountUsage> = new Map();
  
  // Configurable limits
  private readonly MAX_REPORTS_PER_HOUR = 3;
  private readonly MIN_DELAY_BETWEEN_REPORTS_MS = 2 * 60 * 1000; // 2 minutes
  private readonly COOLDOWN_PERIOD_MS = 10 * 60 * 1000; // 10 minutes after hitting limit

  /**
   * Check if account can be used for new report
   */
  canUseAccount(accountId: string): { allowed: boolean; reason?: string; waitTimeMs?: number } {
    const now = Date.now();
    const usage = this.accountUsage.get(accountId);

    if (!usage) {
      // First time use
      return { allowed: true };
    }

    // Check hourly limit
    const hourElapsed = now - usage.hourStartTime;
    if (hourElapsed < 60 * 60 * 1000) {
      // Still within current hour
      if (usage.hourlyCount >= this.MAX_REPORTS_PER_HOUR) {
        const remainingTime = 60 * 60 * 1000 - hourElapsed;
        return {
          allowed: false,
          reason: `Account ${accountId} exceeded hourly limit (${this.MAX_REPORTS_PER_HOUR}/hour)`,
          waitTimeMs: remainingTime,
        };
      }
    }

    // Check minimum delay between reports
    const timeSinceLastUse = now - usage.lastUsed;
    if (timeSinceLastUse < this.MIN_DELAY_BETWEEN_REPORTS_MS) {
      const remainingTime = this.MIN_DELAY_BETWEEN_REPORTS_MS - timeSinceLastUse;
      return {
        allowed: false,
        reason: `Account ${accountId} used too recently (min ${this.MIN_DELAY_BETWEEN_REPORTS_MS / 1000}s between reports)`,
        waitTimeMs: remainingTime,
      };
    }

    return { allowed: true };
  }

  /**
   * Record account usage
   */
  recordUsage(accountId: string): void {
    const now = Date.now();
    const usage = this.accountUsage.get(accountId);

    if (!usage) {
      this.accountUsage.set(accountId, {
        accountId,
        lastUsed: now,
        usageCount: 1,
        hourlyCount: 1,
        hourStartTime: now,
      });
      return;
    }

    // Check if we're in a new hour
    const hourElapsed = now - usage.hourStartTime;
    if (hourElapsed >= 60 * 60 * 1000) {
      // Reset hourly counter
      usage.hourlyCount = 1;
      usage.hourStartTime = now;
    } else {
      usage.hourlyCount++;
    }

    usage.lastUsed = now;
    usage.usageCount++;

    this.accountUsage.set(accountId, usage);
  }

  /**
   * Get account statistics
   */
  getAccountStats(accountId: string): AccountUsage | null {
    return this.accountUsage.get(accountId) || null;
  }

  /**
   * Reset account usage (for testing or manual reset)
   */
  resetAccount(accountId: string): void {
    this.accountUsage.delete(accountId);
  }

  /**
   * Clean up old entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [accountId, usage] of this.accountUsage.entries()) {
      if (now - usage.lastUsed > maxAge) {
        this.accountUsage.delete(accountId);
      }
    }
  }

  /**
   * Get wait time before next available account
   */
  getMinWaitTime(): number {
    let minWait = 0;
    const now = Date.now();

    for (const usage of this.accountUsage.values()) {
      const timeSinceLastUse = now - usage.lastUsed;
      const remainingTime = this.MIN_DELAY_BETWEEN_REPORTS_MS - timeSinceLastUse;
      
      if (remainingTime > 0 && (minWait === 0 || remainingTime < minWait)) {
        minWait = remainingTime;
      }
    }

    return minWait;
  }

  /**
   * Get list of available accounts
   */
  getAvailableAccounts(allAccountIds: string[]): string[] {
    return allAccountIds.filter(id => this.canUseAccount(id).allowed);
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Domain-specific rate limiting
 */
class DomainRateLimiter {
  private domainUsage: Map<string, { lastReportTime: number; count: number }> = new Map();
  
  private readonly MIN_DELAY_BETWEEN_SAME_DOMAIN_MS = 30 * 60 * 1000; // 30 minutes

  canReportDomain(domain: string): { allowed: boolean; reason?: string; waitTimeMs?: number } {
    const now = Date.now();
    const usage = this.domainUsage.get(domain);

    if (!usage) {
      return { allowed: true };
    }

    const timeSinceLastReport = now - usage.lastReportTime;
    if (timeSinceLastReport < this.MIN_DELAY_BETWEEN_SAME_DOMAIN_MS) {
      const remainingTime = this.MIN_DELAY_BETWEEN_SAME_DOMAIN_MS - timeSinceLastReport;
      return {
        allowed: false,
        reason: `Domain ${domain} reported too recently (min ${this.MIN_DELAY_BETWEEN_SAME_DOMAIN_MS / 60000} minutes)`,
        waitTimeMs: remainingTime,
      };
    }

    return { allowed: true };
  }

  recordDomainReport(domain: string): void {
    const now = Date.now();
    const usage = this.domainUsage.get(domain);

    if (!usage) {
      this.domainUsage.set(domain, { lastReportTime: now, count: 1 });
    } else {
      usage.lastReportTime = now;
      usage.count++;
    }
  }

  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

    for (const [domain, usage] of this.domainUsage.entries()) {
      if (now - usage.lastReportTime > maxAge) {
        this.domainUsage.delete(domain);
      }
    }
  }
}

export const domainRateLimiter = new DomainRateLimiter();

/**
 * Run cleanup periodically
 */
export function startRateLimiterCleanup(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  return setInterval(() => {
    rateLimiter.cleanup();
    domainRateLimiter.cleanup();
    console.log('[RateLimiter] Cleanup completed');
  }, intervalMs);
}
