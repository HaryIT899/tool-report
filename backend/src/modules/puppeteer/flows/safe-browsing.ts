/**
 * Safe Browsing phishing report form handler
 * https://safebrowsing.google.com/safebrowsing/report_phish
 */

import { Page } from 'puppeteer';
import { humanType, selectDropdown, sleep, getRandomDelay, clickButtonByText, randomMouseMovements, thinkingPause, randomScroll } from '../utils/human';
import { findVisibleElement, normalizeUrl } from '../utils/dom';
import { ReportStageCallback } from '../types';

export async function handleSafeBrowsingPhish(
  page: Page,
  domain: string,
  reason: string,
  onStage?: ReportStageCallback,
): Promise<void> {
  try {
    await onStage?.({ stage: 'sb_start', message: 'Reading Safe Browsing form' });

    // Wait for form to load
    await page.waitForSelector('input, textarea, [role="combobox"], select', { timeout: 30000 });
    
    // Human-like: Read the page first (MUCH SLOWER)
    await randomScroll(page);
    await sleep(getRandomDelay(2000, 3500)); // Longer initial read
    await randomMouseMovements(page, 3);
    await sleep(getRandomDelay(1500, 2500)); // Longer observation

    // Prepare the URL to report
    const reportUrl = normalizeUrl(domain);
    await onStage?.({ stage: 'sb_set_url', message: 'Setting URL to report' });

    // Store expected URL in window for tracking
    await page.evaluate((url) => {
      (window as any).__sbWantedUrl = url;
      (window as any).__sbUrlOk = false;
    }, reportUrl);

    // Look for the URL field (human behavior) - SLOWER
    await randomMouseMovements(page, 2);
    await sleep(getRandomDelay(1200, 2200));

    // Find URL input field with comprehensive selectors
    const urlSelectors = [
      'input[formcontrolname="url"]',
      'input[formcontrolname*="url" i]',
      'md-input-container input',
      'input[type="url"]',
      'input[aria-label*="url" i]',
      'input[placeholder*="url" i]',
    ];

    // Try XPath for better matching
    const urlByXPath = await page.$x(
      '//input[@formcontrolname="url" or contains(translate(@formcontrolname,"URL","url"), "url")] | ' +
      '//label[contains(normalize-space(.), "URL to report")]/following::input[1] | ' +
      '//*[contains(normalize-space(.), "URL to report")]/ancestor::md-input-container[1]//input',
    );

    const urlByCss = await page.$$(urlSelectors.join(','));
    const candidates = [...urlByXPath, ...urlByCss];

    // Remove duplicates
    const seen = new Set();
    const uniqueCandidates = candidates.filter((h) => {
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    });

    // Try each candidate
    let urlSet = false;
    for (const input of uniqueCandidates) {
      const success = await humanType(page, input as any, reportUrl, { verifyValue: true });
      if (success) {
        urlSet = true;
        await page.evaluate(() => {
          (window as any).__sbUrlOk = true;
        });
        break;
      }
    }

    await onStage?.({
      stage: 'sb_set_url_result',
      message: urlSet ? `URL set successfully: ${reportUrl}` : `Failed to set URL`,
    });

    if (!urlSet) {
      console.log('[SafeBrowsing] URL input not found or set failed');
    }

    // Check what was entered (human behavior) - LONGER
    await sleep(getRandomDelay(1500, 2500));
    
    // Look at other fields before continuing
    await randomMouseMovements(page, 1);
    await sleep(getRandomDelay(1000, 2000));

    // Select Threat Type
    await onStage?.({ stage: 'sb_threat_type', message: 'Selecting threat type' });
    
    // Think about which option to choose (LONGER)
    await sleep(getRandomDelay(2000, 4000));
    
    const threatOk = await selectDropdown(
      page,
      ['Threat Type', 'Kiểu mối đe doạ', 'Kiểu mối đe dọa'],
      ['Social Engineering', 'Tấn công phi kỹ thuật', 'Phishing', 'Social engineering'],
      { fallbackArrowDown: true },
    );
    await onStage?.({
      stage: 'sb_threat_type_result',
      message: threatOk ? 'Threat type selected' : 'Threat type selection uncertain',
    });

    // Confirm selection (human behavior) - LONGER
    await sleep(getRandomDelay(1200, 2200));
    await randomMouseMovements(page, 1);

    // Select Threat Category
    await onStage?.({ stage: 'sb_threat_category', message: 'Selecting threat category' });
    
    // Read the options (LONGER)
    await sleep(getRandomDelay(1000, 2000));
    
    const categoryOk = await selectDropdown(
      page,
      ['Threat Category', 'Danh mục mối đe doạ', 'Danh mục mối đe dọa'],
      ['Other', 'Khác'],
      { fallbackArrowDown: true },
    );
    await onStage?.({
      stage: 'sb_threat_category_result',
      message: categoryOk ? 'Threat category selected' : 'Category selection uncertain',
    });

    // Verify selection (LONGER)
    await sleep(getRandomDelay(1200, 2000));

    // Fill additional details textarea
    await onStage?.({ stage: 'sb_details', message: 'Setting additional details' });
    
    // Scroll to see the textarea
    await randomScroll(page);
    await sleep(getRandomDelay(1000, 2000));
    
    const textareaSelectors = [
      'textarea[aria-label*="thông tin" i]',
      'textarea[placeholder*="thông tin" i]',
      'textarea[aria-label*="details" i]',
      'textarea[placeholder*="details" i]',
      'textarea',
    ];

    const textarea = await findVisibleElement(page, textareaSelectors);
    if (textarea) {
      // Think about what to write (MUCH LONGER - very human-like)
      await sleep(getRandomDelay(3000, 5000));
      await humanType(page, textarea, reason.slice(0, 800), { verifyValue: false });
      // Read what was written (LONGER)
      await sleep(getRandomDelay(2000, 3500));
    }

    // Look around before submitting (LONGER)
    await randomMouseMovements(page, 2);
    await sleep(getRandomDelay(1500, 2500));

    // Submit the form
    await onStage?.({ stage: 'sb_submit', message: 'Clicking submit' });
    
    // Final review pause before submitting (VERY LONG - very human)
    await sleep(getRandomDelay(2500, 4500));
    
    const submitted = await clickButtonByText(page, ['gửi', 'submit', 'send']);

    // Wait for submission with longer delay
    await sleep(getRandomDelay(2500, 4000));

    // Check for success
    const success = await page.evaluate(() => {
      const text = (document.body?.innerText || '').toLowerCase();
      const isSuccess =
        text.includes('status of submission') ||
        text.includes('submission was successful') ||
        text.includes('submitted successfully');
      (window as any).__sbSubmitted = isSuccess;
      return isSuccess;
    });

    await onStage?.({
      stage: 'sb_submit_result',
      message: success ? 'Submission detected' : 'Submission status unclear - may need manual verification',
    });
  } catch (e: any) {
    console.log('[SafeBrowsing] Error:', e?.message);
    await onStage?.({ stage: 'sb_error', message: e?.message || String(e) });
  }
}
