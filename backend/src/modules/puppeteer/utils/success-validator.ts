/**
 * Success Validation Utilities
 * Validates if form submission was actually successful
 */

import { Page } from 'puppeteer';

export interface ValidationResult {
  success: boolean;
  confidence: 'high' | 'medium' | 'low';
  indicators: string[];
  finalUrl?: string;
}

/**
 * Comprehensive success validation after form submission
 */
export async function validateSubmissionSuccess(
  page: Page,
  options: {
    waitForNavigationMs?: number;
    initialUrl?: string;
  } = {},
): Promise<ValidationResult> {
  const { waitForNavigationMs = 5000, initialUrl } = options;

  const indicators: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  try {
    // Wait a bit for any redirects or DOM updates
    await new Promise(resolve => setTimeout(resolve, waitForNavigationMs));

    const finalUrl = page.url();

    // Check 1: URL changed (usually indicates success)
    if (initialUrl && finalUrl !== initialUrl) {
      indicators.push('URL changed');
      
      // Common success URL patterns
      if (
        finalUrl.includes('success') ||
        finalUrl.includes('thank') ||
        finalUrl.includes('confirm') ||
        finalUrl.includes('complete')
      ) {
        indicators.push('Success pattern in URL');
        confidence = 'high';
      }
    }

    // Check 2: Look for success messages in page
    const pageAnalysis = await page.evaluate(() => {
      const bodyText = (document.body?.innerText || '').toLowerCase();
      const title = document.title.toLowerCase();
      
      const results = {
        hasSuccessMessage: false,
        hasErrorMessage: false,
        successKeywords: [] as string[],
        errorKeywords: [] as string[],
        formStillPresent: false,
      };

      // Success keywords
      const successKeywords = [
        'thank you',
        'thanks',
        'submitted successfully',
        'submission successful',
        'we have received',
        'received your report',
        'report submitted',
        'successfully submitted',
        'confirmation',
        'confirmed',
      ];

      // Error keywords
      const errorKeywords = [
        'error',
        'failed',
        'something went wrong',
        'please try again',
        'invalid',
        'submission failed',
        'could not',
        'unable to',
      ];

      // Check for success
      for (const keyword of successKeywords) {
        if (bodyText.includes(keyword) || title.includes(keyword)) {
          results.hasSuccessMessage = true;
          results.successKeywords.push(keyword);
        }
      }

      // Check for errors
      for (const keyword of errorKeywords) {
        if (bodyText.includes(keyword) || title.includes(keyword)) {
          results.hasErrorMessage = true;
          results.errorKeywords.push(keyword);
        }
      }

      // Check if submit button still present (might indicate form didn't submit)
      const submitButtons = Array.from(
        document.querySelectorAll('button[type="submit"], input[type="submit"]')
      );
      results.formStillPresent = submitButtons.length > 0;

      return results;
    });

    // Analyze results
    if (pageAnalysis.hasSuccessMessage) {
      indicators.push(`Success message found: ${pageAnalysis.successKeywords.join(', ')}`);
      confidence = 'high';
    }

    if (pageAnalysis.hasErrorMessage) {
      indicators.push(`Error message found: ${pageAnalysis.errorKeywords.join(', ')}`);
      confidence = 'low';
      
      return {
        success: false,
        confidence,
        indicators,
        finalUrl,
      };
    }

    // Check 3: Form disappeared (good sign)
    if (!pageAnalysis.formStillPresent && !pageAnalysis.hasErrorMessage) {
      indicators.push('Form no longer present');
      if (confidence === 'low') confidence = 'medium';
    }

    // Check 4: Look for success indicators in DOM
    const domIndicators = await page.evaluate(() => {
      // Success classes/IDs
      const successElements = document.querySelectorAll(
        '[class*="success"], [class*="confirm"], [id*="success"], [id*="confirm"]'
      );
      
      // Error classes/IDs
      const errorElements = document.querySelectorAll(
        '[class*="error"], [class*="alert"], [class*="danger"]'
      );

      return {
        hasSuccessElements: successElements.length > 0,
        hasErrorElements: errorElements.length > 0,
        successCount: successElements.length,
        errorCount: errorElements.length,
      };
    });

    if (domIndicators.hasSuccessElements) {
      indicators.push(`Found ${domIndicators.successCount} success element(s)`);
      if (confidence !== 'high') confidence = 'medium';
    }

    if (domIndicators.hasErrorElements && !domIndicators.hasSuccessElements) {
      indicators.push(`Found ${domIndicators.errorCount} error element(s)`);
      confidence = 'low';
    }

    // Final decision
    const success = confidence === 'high' || 
                   (confidence === 'medium' && indicators.length >= 2);

    return {
      success,
      confidence,
      indicators,
      finalUrl,
    };

  } catch (error) {
    console.log('[SuccessValidator] Error during validation:', (error as Error).message);
    
    return {
      success: false,
      confidence: 'low',
      indicators: ['Validation error: ' + (error as Error).message],
    };
  }
}

/**
 * Wait for and detect success/error state
 */
export async function waitForSubmissionResult(
  page: Page,
  timeoutMs: number = 10000,
): Promise<'success' | 'error' | 'timeout'> {
  try {
    const result = await Promise.race([
      // Wait for success indicators
      page.waitForFunction(
        () => {
          const text = (document.body?.innerText || '').toLowerCase();
          return text.includes('thank you') || 
                 text.includes('submitted successfully') ||
                 text.includes('we have received');
        },
        { timeout: timeoutMs }
      ).then(() => 'success' as const),

      // Wait for error indicators
      page.waitForFunction(
        () => {
          const text = (document.body?.innerText || '').toLowerCase();
          return text.includes('error') ||
                 text.includes('failed') ||
                 text.includes('something went wrong');
        },
        { timeout: timeoutMs }
      ).then(() => 'error' as const),

      // Timeout
      new Promise<'timeout'>((resolve) => 
        setTimeout(() => resolve('timeout'), timeoutMs)
      ),
    ]);

    return result;
  } catch (error) {
    return 'timeout';
  }
}

/**
 * Validate specific service success patterns
 */
export function getServiceSuccessPatterns(serviceName: string): {
  urlPatterns: string[];
  textPatterns: string[];
} {
  const patterns: Record<string, { urlPatterns: string[]; textPatterns: string[] }> = {
    'Google Spam': {
      urlPatterns: [],
      textPatterns: ['thank you', 'report submitted', 'we have received'],
    },
    'Google Phishing': {
      urlPatterns: ['status of submission'],
      textPatterns: ['submission was successful', 'submitted successfully'],
    },
    'Radix': {
      urlPatterns: [],
      textPatterns: ['thank you', 'we have received', 'submitted'],
    },
    'Cloudflare': {
      urlPatterns: ['success'],
      textPatterns: ['thank you', 'abuse report submitted'],
    },
  };

  return patterns[serviceName] || { urlPatterns: [], textPatterns: [] };
}
