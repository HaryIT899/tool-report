/**
 * CAPTCHA Detection Utilities
 * Detects various CAPTCHA types and stops automation immediately
 */

import { Page } from 'puppeteer';

export interface CaptchaDetectionResult {
  detected: boolean;
  type?: 'recaptcha' | 'hcaptcha' | 'cloudflare' | 'funcaptcha' | 'generic';
  message?: string;
}

/**
 * Comprehensive CAPTCHA detection
 */
export async function detectCaptcha(page: Page): Promise<CaptchaDetectionResult> {
  try {
    const result = await page.evaluate(() => {
      // Check for reCAPTCHA
      if (
        document.querySelector('iframe[src*="recaptcha"]') ||
        document.querySelector('[class*="recaptcha"]') ||
        document.querySelector('#recaptcha') ||
        (window as any).grecaptcha
      ) {
        return { detected: true, type: 'recaptcha' as const };
      }

      // Check for hCaptcha
      if (
        document.querySelector('iframe[src*="hcaptcha"]') ||
        document.querySelector('[class*="hcaptcha"]') ||
        (window as any).hcaptcha
      ) {
        return { detected: true, type: 'hcaptcha' as const };
      }

      // Check for Cloudflare challenge
      if (
        document.querySelector('#challenge-form') ||
        document.querySelector('.cf-browser-verification') ||
        document.title.includes('Attention Required') ||
        document.title.includes('Just a moment')
      ) {
        return { detected: true, type: 'cloudflare' as const };
      }

      // Check for FunCaptcha (Arkose Labs)
      if (
        document.querySelector('[id*="funcaptcha"]') ||
        document.querySelector('[class*="funcaptcha"]') ||
        (window as any).FunCaptcha
      ) {
        return { detected: true, type: 'funcaptcha' as const };
      }

      // Generic CAPTCHA keywords in page text
      const bodyText = document.body?.innerText?.toLowerCase() || '';
      const captchaKeywords = [
        'verify you are human',
        'verify you\'re human',
        'prove you are human',
        'are you a robot',
        'complete the captcha',
        'security check',
        'unusual traffic',
      ];

      for (const keyword of captchaKeywords) {
        if (bodyText.includes(keyword)) {
          return { detected: true, type: 'generic' as const };
        }
      }

      return { detected: false };
    });

    if (result.detected) {
      const message = `CAPTCHA detected: ${result.type}`;
      console.log(`[CaptchaDetector] ${message}`);
      return { ...result, message };
    }

    return result;
  } catch (error) {
    console.log('[CaptchaDetector] Error during detection:', (error as Error).message);
    return { detected: false };
  }
}

/**
 * Check if page is blocked or requires verification
 */
export async function isPageBlocked(page: Page): Promise<boolean> {
  try {
    const blocked = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.toLowerCase() || '';
      const title = document.title.toLowerCase();
      
      const blockKeywords = [
        'access denied',
        'forbidden',
        '403',
        'blocked',
        'suspicious activity',
        'unusual traffic',
        'verify it\'s you',
        'verify identity',
        'rate limit',
        'too many requests',
      ];

      for (const keyword of blockKeywords) {
        if (bodyText.includes(keyword) || title.includes(keyword)) {
          return true;
        }
      }

      return false;
    });

    if (blocked) {
      console.log('[CaptchaDetector] Page appears to be blocked');
    }

    return blocked;
  } catch (error) {
    return false;
  }
}

/**
 * Wait and periodically check for CAPTCHA (for async CAPTCHAs)
 */
export async function monitorForCaptcha(
  page: Page,
  durationMs: number = 5000,
  checkIntervalMs: number = 1000,
): Promise<CaptchaDetectionResult> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < durationMs) {
    const result = await detectCaptcha(page);
    if (result.detected) {
      return result;
    }
    
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  
  return { detected: false };
}

/**
 * Check for rate limiting messages
 */
export async function detectRateLimit(page: Page): Promise<boolean> {
  try {
    const rateLimit = await page.evaluate(() => {
      const text = (document.body?.innerText || '').toLowerCase();
      const rateLimitKeywords = [
        'too many requests',
        'rate limit',
        'try again later',
        'slow down',
        'exceeded',
        'quota',
      ];
      
      return rateLimitKeywords.some(keyword => text.includes(keyword));
    });

    if (rateLimit) {
      console.log('[CaptchaDetector] Rate limiting detected');
    }

    return rateLimit;
  } catch (error) {
    return false;
  }
}
