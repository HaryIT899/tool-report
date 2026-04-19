/**
 * Google Search feedback report handler
 * Reports search results through Google's feedback mechanism
 */

import { Page } from 'puppeteer';
import { sleep, getRandomDelay, randomScroll } from '../utils/human';
import { clickFirstXPath, normalizeUrl, extractDomain, isDomainMatch } from '../utils/dom';
import { ReportStageCallback } from '../types';

export async function handleGoogleSearchReport(
  page: Page,
  domain: string,
  reason: string,
  onStage?: ReportStageCallback,
): Promise<void> {
  try {
    await onStage?.({ stage: 'gg_search_start', message: 'Starting Google Search report flow' });

    const searchUrl = normalizeUrl(domain);
    const targetDomain = extractDomain(searchUrl);

    await onStage?.({ stage: 'gg_search_input', message: `Searching for: ${searchUrl}` });
    await sleep(getRandomDelay(1000, 2000));

    // Find search input with multiple selectors
    const searchInputSelectors = [
      'textarea#APjFqb',
      'textarea.gLFyf',
      'input[name="q"]',
      'textarea[name="q"]',
      'input[title="Tìm kiếm"]',
      'textarea[title="Tìm kiếm"]',
      'input[aria-label*="ìm kiếm" i]',
      'textarea[aria-label*="earch" i]',
    ];

    let searchInputFound = false;
    for (const selector of searchInputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000, visible: true });
        const element = await page.$(selector);
        if (!element) continue;

        // Verify visibility
        const isVisible = await element.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const computed = window.getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            computed.display !== 'none' &&
            computed.visibility !== 'hidden'
          );
        });

        if (!isVisible) continue;

        await onStage?.({ stage: 'gg_search_fill', message: `Found search input: ${selector}` });

        // Scroll into view
        await element.evaluate((el) => {
          (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
        });
        await sleep(getRandomDelay(300, 600));

        // Click and clear
        await element.click({ clickCount: 1, delay: 20 });
        await sleep(getRandomDelay(200, 400));

        try {
          await page.keyboard.down('Control');
          await page.keyboard.press('KeyA');
          await page.keyboard.up('Control');
          await page.keyboard.press('Backspace');
        } catch {}

        // Type search query
        await page.keyboard.type(searchUrl, { delay: 75 });
        await onStage?.({ stage: 'gg_search_typed', message: `Query typed: ${searchUrl}` });
        
        searchInputFound = true;
        await sleep(getRandomDelay(500, 800));
        break;
      } catch {
        continue;
      }
    }

    if (!searchInputFound) {
      throw new Error('Search input not found');
    }

    // Submit search
    try {
      const submitButton = await page.$('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      } else {
        await page.keyboard.press('Enter');
      }
      await onStage?.({ stage: 'gg_search_submit', message: 'Search submitted' });
    } catch {
      await page.keyboard.press('Enter');
    }

    await onStage?.({ stage: 'gg_search_wait', message: 'Waiting for search results' });

    // Wait for results to load
    await page.waitForFunction(
      () => {
        const selectors = ['div.g', '#rso > div', 'div[data-ved]'];
        for (const sel of selectors) {
          const results = document.querySelectorAll(sel);
          const withCite = Array.from(results).filter((el) => el.querySelector('cite'));
          if (withCite.length > 3) return true;
        }
        return false;
      },
      { timeout: 60000 },
    );

    await sleep(getRandomDelay(1000, 2000));
    await onStage?.({ stage: 'gg_search_results', message: 'Scanning search results' });

    // Find search results
    const resultSelectors = ['div.g', '#rso > div', 'div[data-ved]'];
    let resultHandles: any[] = [];
    
    for (const sel of resultSelectors) {
      const els = await page.$$(sel);
      const withCite: any[] = [];
      for (const el of els) {
        try {
          const cite = await el.$('cite');
          if (cite) withCite.push(el);
        } catch {}
      }
      if (withCite.length > 3) {
        resultHandles = withCite;
        break;
      }
    }

    // Match target domain
    let matchedResult: { found: boolean; index: number; domain: string } = {
      found: false,
      index: -1,
      domain: '',
    };

    for (let i = 0; i < resultHandles.length; i++) {
      const result = resultHandles[i];
      let resultDomain = '';
      
      try {
        const citeText = await result.$eval('cite', (el: any) => String(el.textContent || '').trim());
        if (citeText) resultDomain = extractDomain(citeText);
      } catch {}

      if (!resultDomain) {
        try {
          const href = await result.$eval('a[href]', (el: any) => String(el.getAttribute('href') || ''));
          if (href) resultDomain = extractDomain(href);
        } catch {}
      }

      if (resultDomain && isDomainMatch(resultDomain, targetDomain)) {
        matchedResult = { found: true, index: i, domain: resultDomain };
        break;
      }
    }

    if (!matchedResult.found) {
      await onStage?.({
        stage: 'gg_not_found',
        message: `Domain not found in search results: ${targetDomain}`,
      });
      return;
    }

    await onStage?.({
      stage: 'gg_found',
      message: `Found result at index ${matchedResult.index}: ${matchedResult.domain}`,
    });

    // Check for CAPTCHA
    const captchaDetected = await page.evaluate(() => {
      const text = (document.body?.innerText || '').toLowerCase();
      const iframes = document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="captcha"]');
      return text.includes('verify you are human') || iframes.length > 0;
    });

    if (captchaDetected) {
      await onStage?.({ stage: 'gg_captcha', message: 'CAPTCHA detected - cannot proceed' });
      return;
    }

    // Open result menu (three dots)
    await onStage?.({ stage: 'gg_open_menu', message: 'Opening result menu' });

    let menuOpened = false;
    const result = resultHandles[matchedResult.index];
    
    if (result) {
      const menuSelectors = [
        '[aria-label*="More options" i]',
        '[aria-label*="About this result" i]',
        '[aria-label*="more" i]',
        '[aria-label*="tùy chọn" i]',
      ];

      for (const sel of menuSelectors) {
        try {
          const btn = await result.$(sel);
          if (btn) {
            await btn.click({ delay: 30 });
            menuOpened = true;
            break;
          }
        } catch {}
      }
    }

    if (!menuOpened) {
      await onStage?.({ stage: 'gg_menu_failed', message: 'Could not open menu' });
      return;
    }

    await sleep(getRandomDelay(800, 1500));

    // Click Feedback option
    await onStage?.({ stage: 'gg_find_feedback', message: 'Looking for Feedback button' });

    const feedbackClicked = await clickFirstXPath(page, [
      '//*[self::a or self::button or @role="menuitem"][contains(., "Phản hồi")]',
      '//*[self::a or self::button or @role="menuitem"][contains(., "Feedback")]',
      '//*[self::a or self::button or @role="menuitem"][contains(., "Report")]',
      '//*[self::a or self::button or @role="menuitem"][contains(., "Báo cáo")]',
    ]);

    if (!feedbackClicked) {
      await onStage?.({ stage: 'gg_feedback_not_found', message: 'Feedback button not found' });
      return;
    }

    await sleep(getRandomDelay(1000, 2000));
    await onStage?.({ stage: 'gg_feedback_modal', message: 'Feedback modal opened' });

    await page.waitForSelector('[role="dialog"], [aria-modal="true"]', { timeout: 10000 });

    // Select reason
    await onStage?.({ stage: 'gg_select_reason', message: 'Selecting "Other reason"' });
    await clickFirstXPath(page, [
      '//*[self::label or @role="radio"][contains(., "Lý do khác")]',
      '//*[self::label or @role="radio"][contains(., "Other")]',
      '//*[self::label or @role="radio"][contains(., "Khác")]',
    ]);

    await sleep(getRandomDelay(500, 1000));

    // Select category
    await onStage?.({ stage: 'gg_select_category', message: 'Selecting category' });
    await clickFirstXPath(page, [
      '//*[self::label or @role="radio"][contains(., "Nội dung rác")]',
      '//*[self::label or @role="radio"][contains(., "Spam")]',
      '//*[self::label or @role="radio"][contains(., "spam")]',
      '//*[self::label or @role="radio"][contains(., "Inappropriate")]',
    ]);

    await sleep(getRandomDelay(500, 1000));

    // Fill feedback textarea
    await onStage?.({ stage: 'gg_fill_details', message: 'Filling feedback textarea' });

    let textareaFilled = false;
    try {
      const dialog = await page.$('[role="dialog"], [aria-modal="true"]');
      const textarea = dialog ? await dialog.$('textarea') : await page.$('textarea');
      
      if (textarea) {
        await textarea.click({ delay: 30 });
        await sleep(getRandomDelay(300, 800));

        try {
          await page.keyboard.down('Control');
          await page.keyboard.press('KeyA');
          await page.keyboard.up('Control');
          await page.keyboard.press('Backspace');
        } catch {}

        await page.keyboard.type(reason.slice(0, 500), { delay: 50 });
        textareaFilled = true;
      }
    } catch (e: any) {
      console.log('[GoogleSearch] Textarea fill error:', e?.message);
    }

    await onStage?.({
      stage: 'gg_textarea_filled',
      message: textareaFilled ? 'Textarea filled' : 'Textarea not found',
    });

    await sleep(getRandomDelay(500, 1000));

    // Submit
    await onStage?.({ stage: 'gg_submit', message: 'Clicking Submit' });

    const submitClicked = await clickFirstXPath(page, [
      '//*[self::button or @role="button"][contains(., "Gửi")]',
      '//*[self::button or @role="button"][contains(., "Submit")]',
      '//*[self::button or @role="button"][contains(., "Send")]',
    ]);

    if (!submitClicked) {
      await onStage?.({ stage: 'gg_submit_not_found', message: 'Submit button not found' });
      return;
    }

    await sleep(getRandomDelay(1500, 2500));

    // Check success
    const submitted = await page.evaluate(() => {
      const text = (document.body?.innerText || '').toLowerCase();
      return (
        text.includes('thank you') ||
        text.includes('cảm ơn') ||
        text.includes('submitted') ||
        text.includes('đã gửi')
      );
    });

    await onStage?.({
      stage: 'gg_submit_result',
      message: submitted ? 'Feedback submitted successfully' : 'Submission status unclear',
    });
  } catch (e: any) {
    console.log('[GoogleSearch] Error:', e?.message);
    await onStage?.({ stage: 'gg_error', message: e?.message || String(e) });
  }
}
