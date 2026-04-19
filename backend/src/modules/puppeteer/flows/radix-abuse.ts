/**
 * Radix domain abuse report handler
 * https://abuse.radix.website/
 */

import { Page } from 'puppeteer';
import { humanType, sleep, getRandomDelay, randomMouseMovements, randomScroll, humanClick } from '../utils/human';
import { extractDomain } from '../utils/dom';
import { ReportStageCallback } from '../types';

export async function handleRadixAbuse(
  page: Page,
  domain: string,
  reason: string,
  email?: string,
  onStage?: ReportStageCallback,
): Promise<void> {
  try {
    await onStage?.({ stage: 'radix_start', message: 'Reading Radix form (phase 1)' });
    await page.waitForSelector('#search', { timeout: 30000 });
    
    // Human-like: Read the page first
    await randomScroll(page);
    await sleep(getRandomDelay(1000, 2000));
    await randomMouseMovements(page, 2);
    await sleep(getRandomDelay(800, 1500));

    // Prepare domain
    const host = extractDomain(domain);

    // Fill search field
    const searchEl = await page.$('#search');
    if (searchEl) {
      await sleep(getRandomDelay(500, 1000)); // Read field first
      await humanType(page, searchEl, host);
      await sleep(getRandomDelay(800, 1500)); // Review what was typed
    }

    // Look for submit button
    await randomMouseMovements(page, 1);
    await sleep(getRandomDelay(600, 1200));

    // Submit search - IMPROVED selector for <button><p>Submit</p></button>
    await onStage?.({ stage: 'radix_submit_phase1', message: 'Submitting phase 1' });
    
    let submitted = false;
    
    // Try multiple ways to find and click the button
    try {
      // Method 1: XPath with contains text in p tag
      const submitByXPath = await page.$x(
        '//button[@type="submit" and .//p[contains(text(),"Submit")]] | ' +
        '//button[@type="submit" and contains(.,"Submit")]'
      );
      
      if (submitByXPath.length > 0) {
        await humanClick(page, submitByXPath[0] as any);
        submitted = true;
      }
    } catch (e) {
      console.log('[Radix] XPath click failed:', (e as any)?.message);
    }
    
    // Method 2: CSS selector + evaluate
    if (!submitted) {
      try {
        submitted = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
          for (const btn of buttons) {
            const text = btn.textContent || '';
            if (text.toLowerCase().includes('submit')) {
              (btn as HTMLElement).scrollIntoView({ block: 'center' });
              (btn as HTMLElement).click();
              return true;
            }
          }
          return false;
        });
      } catch (e) {
        console.log('[Radix] Evaluate click failed:', (e as any)?.message);
      }
    }
    
    // Method 3: Fallback to Enter key
    if (!submitted) {
      await sleep(getRandomDelay(300, 600));
      await page.keyboard.press('Enter');
    }
    
    await sleep(getRandomDelay(1000, 2000));

    // Wait for phase 2
    await onStage?.({ stage: 'radix_phase2_wait', message: 'Waiting for phase 2' });
    await page.waitForFunction(
      () =>
        !!document.querySelector('button.accordion-button[data-bs-target="#report-other"]') ||
        !!document.querySelector('#report-other') ||
        Array.from(document.querySelectorAll('button')).some(
          (b) => (b.textContent || '').trim().toLowerCase() === 'report as other',
        ),
      { timeout: 30000 },
    );

    // Human-like: Read phase 2 page
    await randomScroll(page);
    await sleep(getRandomDelay(1000, 2000));
    await randomMouseMovements(page, 2);
    await sleep(getRandomDelay(800, 1500));
    
    await onStage?.({ stage: 'radix_phase2', message: 'Selecting "Report As Other"' });

    // Expand "Other" accordion - with human-like behavior
    try {
      const accordionBtn = await page.$('button.accordion-button[data-bs-target="#report-other"]');
      if (accordionBtn) {
        await humanClick(page, accordionBtn);
      } else {
        // Fallback
        await page.evaluate(() => {
          const btn = document.querySelector(
            'button.accordion-button[data-bs-target="#report-other"]',
          ) as HTMLElement | null;
          if (btn) {
            btn.scrollIntoView({ block: 'center', inline: 'center' });
            btn.click();
          }
        });
      }
    } catch (e: any) {
      console.log('[Radix] Accordion expand error:', e?.message);
    }

    await sleep(getRandomDelay(800, 1500));

    // Click "Report As Other" button
    try {
      const reportOtherBtn = await page.$x(
        '//*[@id="report-other"]//button[normalize-space(.)="Report As Other"] | ' +
        '//button[normalize-space(.)="Report As Other"]',
      );
      if (reportOtherBtn.length > 0) {
        await (reportOtherBtn[0] as any).click({ delay: 30 });
      }
    } catch (e: any) {
      console.log('[Radix] Report button click error:', e?.message);
    }

    // Fill report form
    await onStage?.({ stage: 'radix_fill', message: 'Filling Radix report details' });
    await page.waitForSelector('input, textarea, button', { timeout: 30000 });
    
    // Human-like: Read the form
    await randomScroll(page);
    await sleep(getRandomDelay(1200, 2000));
    await randomMouseMovements(page, 2);
    await sleep(getRandomDelay(800, 1500));

    const seed = Math.floor(Math.random() * 9000) + 1000;
    const nameValue =
      (process.env.RADIX_NAME || '').trim() ||
      (process.env.CF_NAME || '').trim() ||
      `${(process.env.DMCA_FIRST_NAME || 'Demo').trim()} ${(process.env.DMCA_LAST_NAME || String(seed)).trim()}`.trim();

    const messageValue = reason.slice(0, 1500);

    // Helper to fill text inputs
    const fillTextInput = async (selectors: string[], value: string) => {
      for (const sel of selectors) {
        const el = await page.$(sel);
        if (el) {
          await humanType(page, el, value);
          return true;
        }
      }
      return false;
    };

    // Fill name
    await sleep(getRandomDelay(500, 1000)); // Read name field
    await fillTextInput(
      ['#name', 'input[name="name"]', 'input[placeholder*="name" i]'],
      nameValue,
    );
    await sleep(getRandomDelay(800, 1500)); // Verify

    // Fill email
    if (email) {
      await sleep(getRandomDelay(500, 1000)); // Read email field
      await fillTextInput(['#email', 'input[type="email"]'], email);
      await sleep(getRandomDelay(800, 1500)); // Verify
    }

    // Scroll to message field
    await randomScroll(page);
    await sleep(getRandomDelay(600, 1200));

    // Fill message
    if (messageValue) {
      await sleep(getRandomDelay(1500, 3000)); // Think about what to write
      await fillTextInput(
        ['#message', 'textarea#message', 'textarea[name="message"]'],
        messageValue,
      );
      await sleep(getRandomDelay(1500, 2500)); // Review message
    }

    // Check agreement checkbox
    await sleep(getRandomDelay(600, 1200)); // Read checkbox text
    try {
      const check = await page.$('#checkFormData');
      if (check) {
        await humanClick(page, check);
      }
    } catch (e: any) {
      console.log('[Radix] Checkbox click error:', e?.message);
    }
    await sleep(getRandomDelay(500, 1000));

    // Wait for submit button to become enabled
    try {
      await page.waitForFunction(
        () => {
          const btns = Array.from(
            document.querySelectorAll('button[type="submit"]'),
          ) as HTMLButtonElement[];
          const btn = btns.find((b) => (b.textContent || '').trim().toLowerCase() === 'submit');
          if (!btn) return false;
          return !btn.disabled && btn.getAttribute('aria-disabled') !== 'true';
        },
        { timeout: 15000 },
      );
    } catch (e: any) {
      console.log('[Radix] Submit button wait error:', e?.message);
    }

    // Look for submit button
    await randomMouseMovements(page, 2);
    await sleep(getRandomDelay(1000, 2000));
    
    // Final review before submit
    await sleep(getRandomDelay(2000, 4000));

    // Click submit - IMPROVED for <button><p>Submit</p></button>
    await onStage?.({ stage: 'radix_submit_final', message: 'Submitting final form' });
    
    let finalSubmitted = false;
    
    try {
      // Method 1: XPath for button with p tag
      const submit2 = await page.$x(
        '//button[@type="submit" and .//p[contains(text(),"Submit")] and not(@disabled)] | ' +
        '//button[@type="submit" and contains(.,"Submit") and not(@disabled)]'
      );
      
      if (submit2.length > 0) {
        await humanClick(page, submit2[0] as any);
        finalSubmitted = true;
      }
    } catch (e: any) {
      console.log('[Radix] Submit XPath click error:', e?.message);
    }
    
    // Method 2: Evaluate and click
    if (!finalSubmitted) {
      try {
        finalSubmitted = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
          for (const btn of buttons) {
            const htmlBtn = btn as HTMLButtonElement;
            if (!htmlBtn.disabled && htmlBtn.getAttribute('aria-disabled') !== 'true') {
              const text = htmlBtn.textContent || '';
              if (text.toLowerCase().includes('submit')) {
                htmlBtn.scrollIntoView({ block: 'center' });
                htmlBtn.click();
                return true;
              }
            }
          }
          return false;
        });
      } catch (e: any) {
        console.log('[Radix] Submit evaluate click error:', e?.message);
      }
    }

    await sleep(getRandomDelay(2000, 3500));

    // Check for success
    const done = await page.evaluate(() => {
      const text = (document.body?.innerText || '').toLowerCase();
      return text.includes('thank you') || text.includes('submitted') || text.includes('we have received');
    });

    await onStage?.({
      stage: done ? 'radix_done' : 'radix_ready',
      message: done ? 'Radix report submitted' : 'Radix form filled - verify and submit if needed',
    });
  } catch (e: any) {
    console.log('[Radix] Error:', e?.message);
    await onStage?.({ stage: 'radix_error', message: e?.message || String(e) });
  }
}
