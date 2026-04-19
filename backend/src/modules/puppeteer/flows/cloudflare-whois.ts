/**
 * Cloudflare Registrar WHOIS abuse report handler
 * https://abuse.cloudflare.com/registrar_whois
 */

import { Page } from 'puppeteer';
import { humanType, sleep, getRandomDelay, randomScroll } from '../utils/human';
import { extractDomain } from '../utils/dom';
import { ReportStageCallback } from '../types';

export async function handleCloudflareRegistrarWhois(
  page: Page,
  domain: string,
  reason: string,
  email?: string,
  onStage?: ReportStageCallback,
): Promise<void> {
  try {
    await onStage?.({ stage: 'cfw_start', message: 'Navigating to WHOIS form' });

    // Navigate to form
    try {
      await page.goto('https://abuse.cloudflare.com/registrar_whois', {
        waitUntil: 'networkidle2',
        timeout: 60000,
      } as any);
    } catch (e: any) {
      console.log('[CloudflareWHOIS] Navigation error:', e?.message);
    }

    await onStage?.({ stage: 'cfw_form', message: 'Filling Cloudflare WHOIS fields' });
    await page.waitForSelector('input, textarea', { timeout: 30000 });
    await sleep(getRandomDelay(600, 1200));
    await randomScroll(page);

    // Prepare form data
    const seed = Math.floor(Math.random() * 9000) + 1000;
    const nameValue =
      (process.env.CF_NAME || '').trim() ||
      `${(process.env.DMCA_FIRST_NAME || 'Demo').trim()} ${(process.env.DMCA_LAST_NAME || String(seed)).trim()}`.trim();
    const titleValue = (process.env.CF_TITLE || '').trim();
    const companyValue = (process.env.CF_COMPANY || '').trim();
    const teleValue = (process.env.CF_TELE || '').trim();

    const host = extractDomain(domain);
    const urlsValue = host || domain;
    const commentsValue = reason.slice(0, 1000);

    // Helper to type into field
    const typeSel = async (selector: string, value: string) => {
      const el = await page.$(selector);
      if (el) {
        await humanType(page, el, value);
      }
    };

    // Fill form fields
    await typeSel('input[name="name"]', nameValue);
    
    if (email) {
      await typeSel('input[name="email"]', email);
      await typeSel('input[name="email2"]', email);
    }
    
    if (titleValue) await typeSel('input[name="title"]', titleValue);
    if (companyValue) await typeSel('input[name="company"]', companyValue);
    if (teleValue) await typeSel('input[name="tele"]', teleValue);

    const urlsEl = await page.$('textarea[name="urls"]');
    if (urlsEl) {
      await humanType(page, urlsEl, urlsValue);
    }

    const cmtEl = await page.$('textarea[name="comments"]');
    if (cmtEl) {
      await humanType(page, cmtEl, commentsValue);
    }

    // Check required checkboxes
    try {
      await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label')) as HTMLElement[];
        const findByText = (s: string) =>
          labels.find((l) => (l.textContent || '').trim().toLowerCase().includes(s));
        
        const ensureChecked = (label: HTMLElement | undefined | null) => {
          if (!label) return;
          const input = label.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
          if (input && !input.checked) label.click();
        };

        ensureChecked(findByText('please forward my report'));
        ensureChecked(findByText('include my name and contact information'));
      });
    } catch (e: any) {
      console.log('[CloudflareWHOIS] Checkbox error:', e?.message);
    }

    await onStage?.({
      stage: 'cfw_ready',
      message: 'Cloudflare WHOIS form filled - awaiting manual submit',
    });
  } catch (e: any) {
    console.log('[CloudflareWHOIS] Error:', e?.message);
    await onStage?.({ stage: 'cfw_error', message: e?.message || String(e) });
  }
}
