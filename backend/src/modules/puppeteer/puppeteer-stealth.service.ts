/**
 * Enhanced Stealth Puppeteer Service
 * Integrates all anti-detection measures: fingerprinting, session story, captcha detection, etc.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { applyFingerprint, getFingerprintForLocation, getRandomViewport } from './utils/fingerprint';
import { playSessionStory, playLightStory, shouldAbandonSession } from './utils/session-story';
import { detectCaptcha, isPageBlocked, detectRateLimit } from './utils/captcha-detector';
import { validateSubmissionSuccess } from './utils/success-validator';
import { rateLimiter, domainRateLimiter } from './utils/rate-limiter';

puppeteer.use(StealthPlugin());

export interface StealthSessionOptions {
  domain: string;
  accountId?: string;
  proxyCountry?: string;
  userDataDir?: string;
  skipStory?: boolean;
  headless?: boolean;
}

export interface StealthSessionResult {
  success: boolean;
  browser?: Browser;
  page?: Page;
  sessionAbandoned?: boolean;
  captchaDetected?: boolean;
  rateLimited?: boolean;
  error?: string;
}

@Injectable()
export class PuppeteerStealthService {
  private readonly logger = new Logger(PuppeteerStealthService.name);

  /**
   * Create a fully stealthy browser session
   */
  async createStealthSession(options: StealthSessionOptions): Promise<StealthSessionResult> {
    const {
      domain,
      accountId,
      proxyCountry = 'US',
      userDataDir,
      skipStory = false,
      headless = false,
    } = options;

    try {
      // 1. Rate limiting checks
      if (accountId) {
        const accountCheck = rateLimiter.canUseAccount(accountId);
        if (!accountCheck.allowed) {
          this.logger.warn(`Rate limit: ${accountCheck.reason}`);
          return {
            success: false,
            rateLimited: true,
            error: accountCheck.reason,
          };
        }
      }

      const domainCheck = domainRateLimiter.canReportDomain(domain);
      if (!domainCheck.allowed) {
        this.logger.warn(`Domain rate limit: ${domainCheck.reason}`);
        return {
          success: false,
          rateLimited: true,
          error: domainCheck.reason,
        };
      }

      // 2. Check if session should be abandoned (simulate real user behavior)
      if (shouldAbandonSession()) {
        this.logger.log('Session randomly abandoned (simulating real user)');
        return {
          success: false,
          sessionAbandoned: true,
        };
      }

      // 3. Get fingerprint config based on proxy location
      const fingerprintConfig = getFingerprintForLocation(proxyCountry);
      const viewport = getRandomViewport();

      // 4. Launch browser with stealth
      const launchOptions: any = {
        headless: headless ? 'new' : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-blink-features=AutomationControlled',
          `--lang=${fingerprintConfig.locale}`,
        ],
        defaultViewport: viewport,
        ignoreHTTPSErrors: true,
      };

      if (userDataDir) {
        launchOptions.userDataDir = userDataDir;
      }

      const browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      // 5. Apply fingerprint patches
      await applyFingerprint(page, fingerprintConfig);

      // 6. Set additional headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': `${fingerprintConfig.locale},${fingerprintConfig.locale?.split('-')[0]};q=0.9`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      // 7. Play session story (browsing journey)
      if (!skipStory) {
        try {
          await playSessionStory(page, { domain, skipStory });
        } catch (error) {
          this.logger.warn('Session story failed, using light story', error);
          await playLightStory(page);
        }
      }

      // 8. Record usage
      if (accountId) {
        rateLimiter.recordUsage(accountId);
      }
      domainRateLimiter.recordDomainReport(domain);

      return {
        success: true,
        browser,
        page,
      };

    } catch (error) {
      this.logger.error('Failed to create stealth session', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Navigate to URL with CAPTCHA/block detection
   */
  async navigateWithDetection(
    page: Page,
    url: string,
    options: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' } = {},
  ): Promise<{ success: boolean; captchaDetected?: boolean; blocked?: boolean; error?: string }> {
    try {
      const { waitUntil = 'networkidle2' } = options;

      await page.goto(url, { waitUntil, timeout: 30000 });

      // Wait a bit for any async CAPTCHAs
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check for CAPTCHA
      const captcha = await detectCaptcha(page);
      if (captcha.detected) {
        this.logger.warn(`CAPTCHA detected: ${captcha.type}`);
        return {
          success: false,
          captchaDetected: true,
          error: captcha.message,
        };
      }

      // Check if blocked
      const blocked = await isPageBlocked(page);
      if (blocked) {
        this.logger.warn('Page appears to be blocked');
        return {
          success: false,
          blocked: true,
          error: 'Page blocked or requires verification',
        };
      }

      // Check for rate limiting
      const rateLimit = await detectRateLimit(page);
      if (rateLimit) {
        this.logger.warn('Rate limiting detected on page');
        return {
          success: false,
          blocked: true,
          error: 'Rate limit detected',
        };
      }

      return { success: true };

    } catch (error) {
      this.logger.error('Navigation error', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Validate submission with comprehensive checks
   */
  async validateSubmission(
    page: Page,
    initialUrl: string,
    serviceName: string,
  ): Promise<{ success: boolean; confidence: string; details: string[] }> {
    try {
      const result = await validateSubmissionSuccess(page, {
        waitForNavigationMs: 5000,
        initialUrl,
      });

      this.logger.log(
        `Validation for ${serviceName}: ${result.success ? 'SUCCESS' : 'FAILED'} ` +
        `(confidence: ${result.confidence}, indicators: ${result.indicators.length})`,
      );

      return {
        success: result.success,
        confidence: result.confidence,
        details: result.indicators,
      };

    } catch (error) {
      this.logger.error('Validation error', error);
      return {
        success: false,
        confidence: 'low',
        details: ['Validation error: ' + (error as Error).message],
      };
    }
  }

  /**
   * Close session safely
   */
  async closeSession(browser: Browser): Promise<void> {
    try {
      await browser.close();
    } catch (error) {
      this.logger.error('Error closing browser', error);
    }
  }

  /**
   * Get rate limiter stats
   */
  getRateLimiterStats(accountId: string) {
    return {
      account: rateLimiter.getAccountStats(accountId),
      nextAvailableIn: rateLimiter.getMinWaitTime(),
    };
  }
}
