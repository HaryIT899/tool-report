/**
 * Google Search Console spam report handler
 * https://search.google.com/search-console/report-spam
 */

import { Page } from 'puppeteer';
import { humanType, sleep, getRandomDelay, clickButtonByText, randomMouseMovements, thinkingPause, randomScroll } from '../utils/human';
import { findVisibleElement, clickFirstXPath, extractDomain } from '../utils/dom';
import { ReportStageCallback } from '../types';

export async function handleSearchConsoleSpam(
  page: Page,
  domain: string,
  reason: string,
  onStage?: ReportStageCallback,
): Promise<void> {
  try {
    const host = extractDomain(domain);
    const query = host ? `site:${host}` : domain;
    const details = reason.slice(0, 300);

    // Human-like behavior: Look around the page first (SLOWER)
    await onStage?.({ stage: 'sc_initial_read', message: 'Reading the form' });
    await randomScroll(page);
    await sleep(getRandomDelay(1500, 2500)); // Longer read time
    await randomMouseMovements(page, 2);
    await sleep(getRandomDelay(1000, 2000)); // Longer observation

    // Fill Page URL
    await onStage?.({ stage: 'sc_set_url', message: 'Setting Page URL field' });
    const urlInput = await findVisibleElement(page, [
      'input[aria-label="Page URL"]',
      'input[type="url"]',
      'input[name="url"]',
    ]);

    if (urlInput) {
      // Longer pause like reading the field label carefully
      await sleep(getRandomDelay(800, 1500));
      await humanType(page, urlInput, domain);
    }

    // Longer pause after filling URL (like checking what was entered)
    await sleep(getRandomDelay(2000, 3500));

    // Helper to detect if we reached step 2
    const detectStep2 = async () =>
      page.evaluate(() => {
        const text = (document.body?.innerText || '').toLowerCase();
        return (
          text.includes('step 2/2') ||
          text.includes('step 2 of 2') ||
          !!document.querySelector('input#c121') ||
          !!document.querySelector('textarea#c125') ||
          !!document.querySelector('input[placeholder*="Exact query"]') ||
          !!document.querySelector('textarea[placeholder*="anything else"]') ||
          !!document.querySelector('input.VfPpkd-fmcmS-wGMbrd[type="text"]')
        );
      });

    // Helper to select reason radio button
    const selectReason = async (text: string) => {
      // Try multiple strategies to find and click the option
      
      // Strategy 1: Find li with role="option" containing the text
      const clickedOption = await page.evaluate((targetText) => {
        const wanted = targetText.trim().toLowerCase();
        const options = Array.from(document.querySelectorAll('li[role="option"]')) as HTMLElement[];
        
        for (const option of options) {
          const optionText = (option.innerText || option.textContent || '').trim().toLowerCase();
          if (optionText.includes(wanted)) {
            option.scrollIntoView({ block: 'center', inline: 'center' });
            option.click();
            return true;
          }
        }
        return false;
      }, text);

      if (clickedOption) {
        await sleep(getRandomDelay(300, 600));
        return true;
      }

      // Strategy 2: XPath approach
      const clicked = await clickFirstXPath(page, [
        `//*[normalize-space(.)="${text}"]//ancestor::*[@role="option"][1]`,
        `//*[@role="option" and contains(., "${text}")]`,
        `//*[normalize-space(.)="${text}"]//ancestor::*[@role="radio" or @role="button" or self::label or self::button][1]`,
        `//*[normalize-space(.)="${text}"]`,
      ]);

      if (clicked) {
        await sleep(getRandomDelay(300, 600));
        return true;
      }

      // Strategy 3: Find any element with role="radio" containing the text
      return await page.evaluate((targetText) => {
        const wanted = targetText.trim().toLowerCase();
        const radios = Array.from(document.querySelectorAll('[role="radio"], [role="option"]')) as HTMLElement[];
        const match = radios.find((r) =>
          (r.innerText || '').trim().toLowerCase().includes(wanted),
        );
        if (match) {
          match.scrollIntoView({ block: 'center', inline: 'center' });
          match.click();
          return true;
        }
        return false;
      }, text);
    };

    // Helper to click Continue button
    const clickContinue = async () => {
      // Strategy 1: Find button by class "VfPpkd-RLmnJb" (the div that represents the button ripple)
      const clickedByClass = await page.evaluate(() => {
        // Look for the parent button of VfPpkd-RLmnJb div
        const rippleDiv = document.querySelector('div.VfPpkd-RLmnJb');
        if (rippleDiv) {
          const btn = rippleDiv.closest('button') as HTMLButtonElement;
          if (btn) {
            const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
            if (!disabled) {
              btn.scrollIntoView({ block: 'center', inline: 'center' });
              btn.click();
              return { found: true, disabled: false };
            }
            return { found: true, disabled: true };
          }
        }
        return null;
      });

      if (clickedByClass) return clickedByClass;

      // Strategy 2: Standard approach - find by text
      return page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button,[role="button"],a')).find((e) =>
          (e.textContent || '').trim().toLowerCase().includes('continue'),
        ) as HTMLElement | undefined;
        if (!btn) return { found: false, disabled: false };
        const disabled = !!(btn as any).disabled || btn.getAttribute('aria-disabled') === 'true';
        if (!disabled) {
          btn.scrollIntoView({ block: 'center', inline: 'center' });
          btn.click();
        }
        return { found: true, disabled };
      });
    };

    // Try to progress through step 1 with human-like behavior
    const preferred = 'Other';
    for (let i = 0; i < 3; i++) {
      if (await detectStep2()) break;

      // Read the options first (human behavior) - SLOWER
      await randomMouseMovements(page, 1);
      await sleep(getRandomDelay(1000, 2000));

      await onStage?.({ stage: 'sc_choose_reason', message: `Choosing reason: ${preferred}` });
      const selected = await selectReason(preferred);
      await onStage?.({
        stage: 'sc_reason_click',
        message: selected ? 'Reason selected' : 'Reason click uncertain',
      });

      // Longer pause after selecting (like confirming the choice)
      await sleep(getRandomDelay(1000, 2000));

      const cont = await clickContinue();
      await onStage?.({
        stage: 'sc_continue',
        message: cont.found
          ? cont.disabled
            ? 'Continue button disabled'
            : 'Continue clicked'
          : 'Continue button not found',
      });

      if (cont.found && cont.disabled) {
        // Realize mistake and choose again
        await sleep(getRandomDelay(800, 1500));
        await selectReason('Other');
        await sleep(getRandomDelay(1000, 2000));
        await clickContinue();
      }

      // Wait for page transition with longer natural variation
      await sleep(getRandomDelay(2000, 3500));
    }

    // Check if we made it to step 2
    if (!(await detectStep2())) {
      await onStage?.({
        stage: 'sc_stuck_step1',
        message: 'Still on Step 1 - may require manual selection',
      });
    }

    // Fill step 2 details
    await onStage?.({ stage: 'sc_fill_details', message: 'Filling additional details' });

    // Look around step 2 form (human behavior) - SLOWER
    await randomMouseMovements(page, 1);
    await sleep(getRandomDelay(1500, 2500));

    const queryInput = await findVisibleElement(page, [
      'input#c121',
      'input[placeholder*="Exact query"]',
      'input[aria-label*="Exact query"]',
      'input.VfPpkd-fmcmS-wGMbrd',
    ]);

    if (queryInput) {
      // Read the field label first (longer)
      await sleep(getRandomDelay(1000, 2000));
      await humanType(page, queryInput, query);
      // Verify what was typed (longer)
      await sleep(getRandomDelay(1000, 2000));
    }

    // Scroll to see textarea
    await randomScroll(page);
    await sleep(getRandomDelay(1000, 1800));

    const detailsArea = await findVisibleElement(page, [
      'textarea#c125',
      'textarea[placeholder*="anything else"]',
      'textarea[aria-label*="anything else"]',
      'textarea.VfPpkd-fmcmS-wGMbrd',
      'textarea',
    ]);

    if (detailsArea) {
      // Think about what to write (much longer)
      await sleep(getRandomDelay(2000, 4000));
      await humanType(page, detailsArea, details);
      // Review what was written (longer)
      await sleep(getRandomDelay(1500, 3000));
    }

    // Move mouse randomly before submitting (like looking for submit button)
    await randomMouseMovements(page, 2);
    await sleep(getRandomDelay(1200, 2200));

    // Try to submit
    await onStage?.({ stage: 'sc_submit', message: 'Attempting to submit' });
    
    // Final review before clicking submit (very important pause)
    await sleep(getRandomDelay(2000, 4000));
    
    // Try to find and click submit button
    const submitClicked = await page.evaluate(() => {
      // Strategy 1: Find by VfPpkd-RLmnJb class (Material Design button ripple)
      const rippleDivs = Array.from(document.querySelectorAll('div.VfPpkd-RLmnJb'));
      for (const rippleDiv of rippleDivs) {
        const btn = rippleDiv.closest('button') as HTMLButtonElement;
        if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
          const text = (btn.textContent || '').trim().toLowerCase();
          if (text.includes('submit') || text.includes('next') || text.includes('continue') || text.includes('report') || text.includes('send')) {
            btn.scrollIntoView({ block: 'center', inline: 'center' });
            btn.click();
            return true;
          }
        }
      }
      return false;
    });

    if (!submitClicked) {
      await clickButtonByText(page, ['Next', 'Continue', 'Submit', 'Report', 'Send']);
    }

    // Wait for submission with longer delay
    await sleep(getRandomDelay(2500, 4000));

    // Check for completion
    const done = await page.evaluate(() => {
      const text = (document.body?.innerText || '').toLowerCase();
      return text.includes('thank you') || text.includes('submitted') || text.includes('report submitted');
    });

    await onStage?.({
      stage: done ? 'sc_done' : 'sc_wait',
      message: done ? 'Report submitted' : 'Awaiting manual finalization',
    });
  } catch (e: any) {
    console.log('[SearchConsole] Error:', e?.message);
    await onStage?.({ stage: 'sc_error', message: e?.message || String(e) });
  }
}
