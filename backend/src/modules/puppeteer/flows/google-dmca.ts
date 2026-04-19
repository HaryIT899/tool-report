/**
 * Google DMCA Search form handler
 * https://reportcontent.google.com/forms/dmca_search
 */

import { Page } from 'puppeteer';
import { humanType, sleep, getRandomDelay, randomScroll } from '../utils/human';
import { findInput, findTextarea, checkAllCheckboxes, normalizeUrl } from '../utils/dom';
import { ReportStageCallback } from '../types';

export async function handleGoogleDmcaSearch(
  page: Page,
  domain: string,
  reason: string,
  email?: string,
  onStage?: ReportStageCallback,
): Promise<void> {
  try {
    await page.waitForSelector('textarea, input, select', { timeout: 30000 });
    await sleep(getRandomDelay(600, 1200));
    await randomScroll(page);

    // Check for email verification gate
    const emailGate = await page.evaluate(() => {
      const text = (document.body?.innerText || '').toLowerCase();
      return (
        (text.includes('enter your email address') || text.includes('email address')) &&
        !!document.querySelector('input[type="email"]') &&
        Array.from(document.querySelectorAll('button,[role="button"]')).some(
          (b) => (b.textContent || '').trim().toLowerCase() === 'verify',
        )
      );
    });

    if (emailGate) {
      await onStage?.({ stage: 'dmca_email_gate', message: 'Email verification step detected' });
      const gateEmail = (email || process.env.DMCA_EMAIL || '').trim();
      
      if (gateEmail) {
        const emailInput = await findInput(page, ['email']);
        if (emailInput) {
          await humanType(page, emailInput, gateEmail);
        }

        // Click verify button
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button,[role="button"]')).find(
            (b) => (b.textContent || '').trim().toLowerCase() === 'verify',
          ) as HTMLElement | undefined;
          if (btn) btn.click();
        });

        await sleep(getRandomDelay(800, 1400));
        
        // Wait for form to appear
        await page.waitForFunction(
          () =>
            !!document.querySelector('textarea[aria-label*="Enter your description" i]') ||
            !!document.querySelector('input[aria-label*="First name" i]'),
          { timeout: 30000 },
        );
      }
    }

    // Prepare form data
    const normUrl = normalizeUrl(domain);
    const extractFirstUrl = (text: string): string | undefined => {
      const match = text.match(/https?:\/\/[^\s)]+/i);
      return match ? match[0] : undefined;
    };

    const seed = Math.floor(Math.random() * 9000) + 1000;
    const firstName = (process.env.DMCA_FIRST_NAME || `Demo${seed}`).trim();
    const lastName = (process.env.DMCA_LAST_NAME || `User${seed}`).trim();
    const company = (process.env.DMCA_COMPANY || `Demo Company ${seed}`).trim();
    const workDescription = (process.env.DMCA_WORK_DESCRIPTION || reason || '').trim();
    const authorizedUrl = (
      process.env.DMCA_AUTHORIZED_URL ||
      extractFirstUrl(reason) ||
      'https://example.com/'
    ).trim();
    const infringingUrls = (process.env.DMCA_INFRINGING_URLS || normUrl || '').trim();

    await onStage?.({ stage: 'dmca_fill', message: 'Filling DMCA form fields' });

    // Fill basic info
    const firstNameEl = await findInput(page, ['first name', 'tên']);
    const lastNameEl = await findInput(page, ['last name', 'họ']);
    const companyEl = await findInput(page, ['company name', 'company', 'tên công ty']);

    if (firstNameEl) await humanType(page, firstNameEl, firstName);
    if (lastNameEl) await humanType(page, lastNameEl, lastName);
    if (companyEl) await humanType(page, companyEl, company);

    // Fill textareas
    const workDescEl = await findTextarea(page, [
      'describe the copyrighted work',
      'xác định và mô tả tác phẩm có bản quyền',
      'enter your description here',
    ]);
    if (workDescEl && workDescription) {
      await humanType(page, workDescEl, workDescription);
    }

    const authorizedEl = await findTextarea(page, [
      'where can we see an authorized example',
      'chúng tôi có thể xem mẫu được cấp phép',
      'enter your examples here',
    ]);
    if (authorizedEl && authorizedUrl) {
      await humanType(page, authorizedEl, authorizedUrl);
    }

    const infringingEl = await findTextarea(page, [
      'location of infringing material',
      'vị trí của tài liệu vi phạm',
      'infringing material',
      'enter your url',
    ]);
    if (infringingEl && infringingUrls) {
      await humanType(page, infringingEl, infringingUrls);
    }

    // Fallback: set textareas by placeholder
    await page.evaluate(
      (desc, auth, infr) => {
        const setByPlaceholder = (contains: string, value: string) => {
          const nodes = Array.from(document.querySelectorAll('textarea')) as HTMLTextAreaElement[];
          const el = nodes.find((n) =>
            (n.getAttribute('placeholder') || '').toLowerCase().includes(contains),
          );
          if (el) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        };
        if (desc) setByPlaceholder('enter your description', desc);
        if (auth) setByPlaceholder('enter your examples', auth);
        if (infr) setByPlaceholder('enter your url', infr);
      },
      workDescription,
      authorizedUrl,
      infringingUrls,
    );

    // Handle date selection
    try {
      const dateSelect = await page.$('select[aria-label*="signed on this date" i]');
      if (dateSelect) {
        await page.evaluate((sel: HTMLSelectElement) => {
          if (sel.options.length > 1 && sel.selectedIndex === 0) {
            sel.selectedIndex = 1;
            sel.dispatchEvent(new Event('input', { bubbles: true }));
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, dateSelect);
      }
    } catch (e: any) {
      console.log('[DMCA] Date select error:', e?.message);
    }

    // Check all checkboxes and radios
    await checkAllCheckboxes(page);

    // Select "myself" radio if present
    await page.evaluate(() => {
      const radios = Array.from(document.querySelectorAll('[role="radio"]')) as HTMLElement[];
      const myself = radios.find((r) => {
        const text = (r.innerText || r.textContent || '').trim().toLowerCase();
        return text.includes('myself') || text.includes('bản thân tôi');
      });
      if (myself && myself.getAttribute('aria-checked') !== 'true') {
        myself.click();
      }
    });

    // Fill signature (derived from name fields)
    const signatureValue = await page.evaluate(() => {
      const pick = (needle: string) => {
        const nodes = Array.from(
          document.querySelectorAll('input[aria-label]'),
        ) as HTMLInputElement[];
        return nodes.find((i) =>
          (i.getAttribute('aria-label') || '').toLowerCase().includes(needle),
        );
      };
      const fn = pick('first name') || pick('tên');
      const ln = pick('last name') || pick('họ');
      const first = (fn?.value || '').trim();
      const last = (ln?.value || '').trim();
      return [first, last].filter(Boolean).join(' ').trim();
    });

    const signatureEl = await findInput(page, ['signature', 'chữ ký']);
    if (signatureEl) {
      await humanType(page, signatureEl, signatureValue || `${firstName} ${lastName}`);
    }

    await sleep(getRandomDelay(500, 1200));
    await randomScroll(page);

    await onStage?.({
      stage: 'dmca_ready',
      message: 'DMCA form filled - awaiting manual captcha + submit',
    });
  } catch (e: any) {
    console.log('[DMCA] Error:', e?.message);
    await onStage?.({ stage: 'dmca_error', message: e?.message || String(e) });
  }
}
