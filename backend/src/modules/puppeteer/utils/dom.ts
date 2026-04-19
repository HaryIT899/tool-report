/**
 * DOM element detection and interaction utilities
 * Provides robust element finding with multiple selector strategies
 */

import { Page, ElementHandle } from 'puppeteer';

/**
 * Find a visible and interactable element using multiple selector strategies
 */
export async function findVisibleElement(
  page: Page,
  selectors: string[],
): Promise<ElementHandle | null> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (!element) continue;

      // Check if element is visible and usable
      const isUsable = await element.evaluate((el: any) => {
        const e = el as HTMLInputElement;
        const type = (e.getAttribute?.('type') || '').toLowerCase();
        
        // Skip hidden/disabled elements
        if (type && ['hidden', 'checkbox', 'radio', 'button', 'submit'].includes(type)) {
          return false;
        }
        if (e.disabled || e.readOnly) return false;

        // Check visibility
        const rect = e.getBoundingClientRect();
        const computed = window.getComputedStyle(e);
        return (
          rect.width > 5 &&
          rect.height > 5 &&
          computed.display !== 'none' &&
          computed.visibility !== 'hidden' &&
          e.offsetParent !== null
        );
      });

      if (isUsable) return element;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Find element by aria-label containing specific text
 */
export async function findByAriaLabel(
  page: Page,
  kind: 'input' | 'textarea' | 'select' | 'button',
  searchText: string,
): Promise<ElementHandle<Element> | null> {
  const text = searchText.toLowerCase();
  const xpath = `//${kind}[contains(translate(@aria-label,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"), "${text}")]`;
  
  try {
    const nodes = await page.$x(xpath);
    return (nodes[0] as ElementHandle<Element>) || null;
  } catch {
    return null;
  }
}

/**
 * Find input element with multiple fallback strategies
 */
export async function findInput(page: Page, keywords: string[]): Promise<ElementHandle | null> {
  // Try aria-label first
  for (const keyword of keywords) {
    const el = await findByAriaLabel(page, 'input', keyword);
    if (el) return el;
  }

  // Try CSS selectors
  const cssSelectors = keywords.flatMap((keyword) => {
    const kw = keyword.toLowerCase().replace(/\s+/g, '-');
    return [
      `input[aria-label*="${keyword}" i]`,
      `input[placeholder*="${keyword}" i]`,
      `input[name*="${kw}"]`,
      `input[id*="${kw}"]`,
    ];
  });

  return findVisibleElement(page, cssSelectors);
}

/**
 * Find textarea element with multiple fallback strategies
 */
export async function findTextarea(
  page: Page,
  keywords: string[],
): Promise<ElementHandle | null> {
  // Try aria-label first
  for (const keyword of keywords) {
    const el = await findByAriaLabel(page, 'textarea', keyword);
    if (el) return el;
  }

  // Try placeholder
  for (const keyword of keywords) {
    const text = keyword.toLowerCase();
    const xpath = `//textarea[contains(translate(@placeholder,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"), "${text}")]`;
    try {
      const nodes = await page.$x(xpath);
      if (nodes.length > 0) return nodes[0] as ElementHandle;
    } catch {}
  }

  // Try following heading
  for (const keyword of keywords) {
    const escaped = keyword.replace(/"/g, '\\"');
    const xpath = `//*[self::h1 or self::h2 or self::h3 or self::label or self::p][contains(normalize-space(.), "${escaped}")]/following::textarea[1]`;
    try {
      const nodes = await page.$x(xpath);
      if (nodes.length > 0) return nodes[0] as ElementHandle;
    } catch {}
  }

  // Try CSS selectors
  const cssSelectors = keywords.flatMap((keyword) => {
    const kw = keyword.toLowerCase().replace(/\s+/g, '-');
    return [
      `textarea[aria-label*="${keyword}" i]`,
      `textarea[placeholder*="${keyword}" i]`,
      `textarea[name*="${kw}"]`,
      `textarea[id*="${kw}"]`,
    ];
  });

  return findVisibleElement(page, cssSelectors);
}

/**
 * Click first matching element from XPath list
 */
export async function clickFirstXPath(page: Page, xpaths: string[]): Promise<boolean> {
  for (const xpath of xpaths) {
    try {
      const handles = await page.$x(xpath);
      for (const handle of handles) {
        try {
          const box = await handle.boundingBox();
          if (!box) continue;

          await handle.evaluate((el: HTMLElement) => {
            el.scrollIntoView({ block: 'center', inline: 'center' });
          });

          await (handle as any).click({ delay: 30 });
          return true;
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * Wait for dynamic content to load using a condition function
 */
export async function waitForDynamicContent(
  page: Page,
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 10000,
): Promise<boolean> {
  try {
    await page.waitForFunction(condition, { timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize URL input (add https:// if missing)
 */
export function normalizeUrl(input: string): string {
  const cleaned = input.replace(/[`"'""'']/g, '').trim();
  if (!cleaned) return cleaned;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    return parsed.hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Check if two domains match (including subdomains)
 */
export function isDomainMatch(domain1: string, domain2: string): boolean {
  if (!domain1 || !domain2) return false;
  const d1 = domain1.toLowerCase();
  const d2 = domain2.toLowerCase();
  
  if (d1 === d2) return true;
  if (d1.endsWith(`.${d2}`) || d2.endsWith(`.${d1}`)) return true;
  
  return false;
}

/**
 * Check all checkboxes on the page
 */
export async function checkAllCheckboxes(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Role-based checkboxes
    const roleCheckboxes = Array.from(
      document.querySelectorAll('[role="checkbox"]'),
    ) as HTMLElement[];
    
    for (const checkbox of roleCheckboxes) {
      const isDisabled =
        checkbox.getAttribute('aria-disabled') === 'true' ||
        (checkbox as any).disabled === true;
      const isChecked = checkbox.getAttribute('aria-checked') === 'true';
      
      if (!isDisabled && !isChecked) {
        checkbox.click();
      }
    }

    // Native checkboxes
    const inputs = Array.from(
      document.querySelectorAll('input[type="checkbox"]'),
    ) as HTMLInputElement[];
    
    for (const input of inputs) {
      if (!input.disabled && !input.checked) {
        const label = input.closest('label') as HTMLElement | null;
        if (label) {
          label.click();
        } else {
          input.click();
        }
      }
    }
  });
}

/**
 * Select first radio button matching text
 */
export async function selectRadioByText(page: Page, texts: string[]): Promise<boolean> {
  return await page.evaluate((textList) => {
    const norm = (s: string) => (s || '').trim().toLowerCase();
    const wanted = new Set(textList.map(norm));
    
    const radios = Array.from(document.querySelectorAll('[role="radio"]')) as HTMLElement[];
    
    for (const radio of radios) {
      const text = norm(radio.innerText || radio.textContent || '');
      const isDisabled =
        radio.getAttribute('aria-disabled') === 'true' || (radio as any).disabled === true;
      const isChecked = radio.getAttribute('aria-checked') === 'true';
      
      if (!isDisabled && !isChecked && wanted.has(text)) {
        radio.click();
        return true;
      }
    }
    
    return false;
  }, texts);
}
