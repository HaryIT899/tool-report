/**
 * Human-like interaction utilities for Puppeteer
 * Provides realistic typing, clicking, and scrolling to avoid bot detection
 */

import { Page, ElementHandle } from 'puppeteer';

/**
 * Get a random delay in milliseconds with natural variance
 */
export function getRandomDelay(min = 500, max = 2000): number {
  // Add some natural variance using normal distribution
  const range = max - min;
  const mean = min + range / 2;
  const variance = range / 6;
  
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  
  let delay = Math.floor(mean + gaussian * variance);
  delay = Math.max(min, Math.min(max, delay));
  
  return delay;
}

/**
 * Sleep for a specified duration
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Move mouse in a natural curved path (Bezier curve)
 */
async function moveMouseNaturally(
  page: Page,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): Promise<void> {
  const steps = getRandomDelay(20, 40);
  
  // Create random control points for Bezier curve
  const cpX1 = startX + (endX - startX) * 0.3 + (Math.random() - 0.5) * 100;
  const cpY1 = startY + (endY - startY) * 0.3 + (Math.random() - 0.5) * 100;
  const cpX2 = startX + (endX - startX) * 0.7 + (Math.random() - 0.5) * 100;
  const cpY2 = startY + (endY - startY) * 0.7 + (Math.random() - 0.5) * 100;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    
    // Cubic Bezier curve formula
    const x = Math.pow(1 - t, 3) * startX +
              3 * Math.pow(1 - t, 2) * t * cpX1 +
              3 * (1 - t) * Math.pow(t, 2) * cpX2 +
              Math.pow(t, 3) * endX;
              
    const y = Math.pow(1 - t, 3) * startY +
              3 * Math.pow(1 - t, 2) * t * cpY1 +
              3 * (1 - t) * Math.pow(t, 2) * cpY2 +
              Math.pow(t, 3) * endY;
    
    await page.mouse.move(x, y);
    await sleep(getRandomDelay(5, 15));
  }
}

/**
 * Perform random mouse movements (like a human reading the page)
 */
export async function randomMouseMovements(page: Page, count: number = 2): Promise<void> {
  const viewport = await page.viewport();
  if (!viewport) return;
  
  for (let i = 0; i < count; i++) {
    const x = Math.random() * viewport.width;
    const y = Math.random() * viewport.height;
    
    const currentMouse = await page.evaluate(() => ({
      x: (window as any).__mouseX || 0,
      y: (window as any).__mouseY || 0,
    }));
    
    await moveMouseNaturally(page, currentMouse.x, currentMouse.y, x, y);
    
    await page.evaluate((mx, my) => {
      (window as any).__mouseX = mx;
      (window as any).__mouseY = my;
    }, x, y);
    
    await sleep(getRandomDelay(200, 500));
  }
}

/**
 * Random thinking pause (like a human reading or thinking)
 */
export async function thinkingPause(): Promise<void> {
  const pauseType = Math.random();
  
  if (pauseType < 0.3) {
    // Short pause - quick read
    await sleep(getRandomDelay(800, 1500));
  } else if (pauseType < 0.7) {
    // Medium pause - reading carefully
    await sleep(getRandomDelay(1500, 3000));
  } else {
    // Long pause - thinking or checking something
    await sleep(getRandomDelay(3000, 5000));
  }
}

/**
 * Perform random human-like scrolling on the page
 */
export async function randomScroll(page: Page, options: { smooth?: boolean } = {}): Promise<void> {
  const { smooth = true } = options;
  
  await page.evaluate(async (smoothScroll) => {
    const scrolls = Math.floor(Math.random() * 3) + 1;
    const direction = Math.random() < 0.5 ? 1 : -1;
    
    for (let i = 0; i < scrolls; i++) {
      const distance = (Math.floor(Math.random() * 300) + 100) * direction;
      
      if (smoothScroll) {
        window.scrollBy({ top: distance, behavior: 'smooth' });
      } else {
        window.scrollBy(0, distance);
      }
      
      // Variable delay between scrolls (like reading)
      const delay = Math.random() * 800 + 300;
      await new Promise((r) => setTimeout(r, delay));
    }
  }, smooth);
  
  await sleep(getRandomDelay(200, 500));
}

/**
 * Scroll to element naturally before interacting
 */
export async function scrollToElement(page: Page, element: ElementHandle): Promise<void> {
  await element.evaluate((el: HTMLElement) => {
    el.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center', 
      inline: 'center' 
    });
  });
  
  // Wait for scroll animation + reading time
  await sleep(getRandomDelay(500, 1000));
}

/**
 * Type text slowly with human-like random delays and occasional mistakes
 * This is the CORE function for all text input
 */
export async function humanType(
  page: Page,
  element: ElementHandle | string,
  text: string,
  options: { clearFirst?: boolean; verifyValue?: boolean } = {},
): Promise<boolean> {
  const { clearFirst = true, verifyValue = true } = options;

  try {
    // Get element handle if selector was passed
    const handle = typeof element === 'string' ? await page.$(element) : element;
    if (!handle) {
      console.log('[humanType] Element not found');
      return false;
    }

    // Move mouse to element naturally before clicking
    const box = await handle.boundingBox();
    if (box) {
      const currentMouse = await page.evaluate(() => ({
        x: (window as any).__mouseX || 0,
        y: (window as any).__mouseY || 0,
      }));
      
      const targetX = box.x + box.width / 2 + (Math.random() * 20 - 10);
      const targetY = box.y + box.height / 2 + (Math.random() * 20 - 10);
      
      await moveMouseNaturally(page, currentMouse.x, currentMouse.y, targetX, targetY);
      
      await page.evaluate((x, y) => {
        (window as any).__mouseX = x;
        (window as any).__mouseY = y;
      }, targetX, targetY);
    }

    // Scroll into view with slight delay
    await handle.evaluate((el: HTMLElement) => {
      el.scrollIntoView({ block: 'center', inline: 'center' });
    });
    await sleep(getRandomDelay(300, 600));

    // Sometimes hover before clicking (like reading the field)
    if (Math.random() < 0.4) {
      await sleep(getRandomDelay(400, 800));
    }

    // Focus element with clicks (sometimes takes 2-3 clicks like humans)
    const clicks = Math.random() < 0.2 ? 2 : 1;
    for (let i = 0; i < clicks; i++) {
      await handle.click({ delay: getRandomDelay(20, 50) });
      await sleep(getRandomDelay(100, 300));
    }

    // Clear existing content if requested
    if (clearFirst) {
      // Random chance to use different clear methods
      if (Math.random() < 0.5) {
        // Select all then delete
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await sleep(getRandomDelay(100, 200));
        await page.keyboard.press('Backspace');
      } else {
        // Triple click to select then type (very human-like)
        await handle.click({ clickCount: 3 });
        await sleep(getRandomDelay(50, 150));
      }
      await sleep(getRandomDelay(100, 250));
    }

    // Type MUCH slower with realistic human behavior
    const chars = text.split('');
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      
      // EVEN SLOWER typing speed - very realistic human typing (150-450ms per character)
      // This is 3-4x slower than original to avoid bot detection
      let charDelay = getRandomDelay(150, 450);
      
      // Even slower for special characters
      if (/[^a-zA-Z0-9\s]/.test(char)) {
        charDelay = getRandomDelay(250, 600);
      }
      
      // Slower for uppercase (need to press Shift)
      if (/[A-Z]/.test(char)) {
        charDelay = getRandomDelay(200, 500);
      }
      
      // Random long pauses (like thinking, looking at keyboard, or getting distracted)
      const shouldPause = Math.random() < 0.20; // 20% chance (increased)
      if (shouldPause) {
        await sleep(getRandomDelay(700, 2000)); // Even longer pauses
      }
      
      // Rare typing mistake (2% chance for realism)
      if (text.length > 10 && Math.random() < 0.02 && i < chars.length - 3) {
        // Type wrong character
        const wrongChar = String.fromCharCode(char.charCodeAt(0) + 1);
        await page.keyboard.sendCharacter(wrongChar);
        await sleep(getRandomDelay(200, 500));
        
        // Realize mistake and fix it
        await page.keyboard.press('Backspace');
        await sleep(getRandomDelay(300, 700)); // Pause to think
        await page.keyboard.sendCharacter(char);
        await sleep(charDelay);
      } else {
        // Normal typing - type character then wait
        await page.keyboard.sendCharacter(char);
        await sleep(charDelay);
      }
      
      // Longer pauses at word boundaries (like thinking of next word)
      if (char === ' ' && Math.random() < 0.5) { // 50% chance
        await sleep(getRandomDelay(400, 1000)); // Longer word pauses
      }
      
      // More frequent "distraction" pause mid-sentence (2% chance)
      if (Math.random() < 0.02) {
        await sleep(getRandomDelay(1500, 3000)); // Even longer distraction
      }
    }

    // Even longer pause after typing (reviewing what was typed carefully)
    await sleep(getRandomDelay(800, 1800));

    // Verify value was set correctly
    if (verifyValue) {
      const value = await handle.evaluate((el: any) => {
        return el.value || el.textContent || '';
      });
      const normalized = (value || '').trim();
      const expected = text.trim();
      
      if (normalized === expected) {
        return true;
      } else {
        console.log(`[humanType] Value mismatch: got "${normalized}", expected "${expected}"`);
        // Fallback: set value directly
        await handle.evaluate((el: any, val: string) => {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement?.prototype || {},
            'value',
          )?.set;
          if (nativeSetter && el instanceof HTMLInputElement) {
            nativeSetter.call(el, val);
          } else {
            el.value = val;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, text);
        return true;
      }
    }

    return true;
  } catch (e: any) {
    console.log('[humanType] Error:', e?.message);
    return false;
  }
}

/**
 * Click an element with human-like behavior
 */
export async function humanClick(
  page: Page,
  element: ElementHandle | string,
  options: { moveMouseFirst?: boolean; doubleClick?: boolean } = {},
): Promise<boolean> {
  const { moveMouseFirst = true, doubleClick = false } = options;

  try {
    const handle = typeof element === 'string' ? await page.$(element) : element;
    if (!handle) {
      console.log('[humanClick] Element not found');
      return false;
    }

    // Scroll into view with natural delay
    await handle.evaluate((el: HTMLElement) => {
      el.scrollIntoView({ block: 'center', inline: 'center' });
    });
    await sleep(getRandomDelay(200, 500));

    // Move mouse to element first (more human-like with curved path)
    if (moveMouseFirst) {
      const box = await handle.boundingBox();
      if (box) {
        const currentMouse = await page.evaluate(() => ({
          x: (window as any).__mouseX || 0,
          y: (window as any).__mouseY || 0,
        }));
        
        // Random point within the element (not always center)
        const x = box.x + box.width * (0.3 + Math.random() * 0.4);
        const y = box.y + box.height * (0.3 + Math.random() * 0.4);
        
        await moveMouseNaturally(page, currentMouse.x, currentMouse.y, x, y);
        
        await page.evaluate((mx, my) => {
          (window as any).__mouseX = mx;
          (window as any).__mouseY = my;
        }, x, y);
        
        // Hover for a moment before clicking (like reading)
        await sleep(getRandomDelay(200, 600));
      }
    }

    // Click with realistic delay
    const clickCount = doubleClick ? 2 : 1;
    await handle.click({ delay: getRandomDelay(30, 80), clickCount });
    
    // Natural pause after clicking
    await sleep(getRandomDelay(300, 700));

    return true;
  } catch (e: any) {
    console.log('[humanClick] Error:', e?.message);
    return false;
  }
}

/**
 * Select an option from a dropdown using keyboard navigation
 * More reliable and human-like than DOM manipulation
 */
export async function selectDropdown(
  page: Page,
  fieldLabels: string[],
  optionTexts: string[],
  options: { fallbackArrowDown?: boolean } = {},
): Promise<boolean> {
  const { fallbackArrowDown = true } = options;

  try {
    // Find and click the dropdown to open it
    const opened = await page.evaluate((labels) => {
      const norm = (s: string) => (s || '').trim().toLowerCase();
      const labelSet = new Set(labels.map(norm));

      const isVisible = (el: Element) => {
        const e = el as HTMLElement;
        return !!(e && e.offsetParent !== null && e.getClientRects().length > 0);
      };

      // Find label matching one of our targets
      const candidates = Array.from(document.querySelectorAll('label,span,div,p')).filter(
        (el) => labelSet.has(norm(el.textContent || '')) && isVisible(el),
      ) as HTMLElement[];

      for (const labelEl of candidates) {
        const root =
          (labelEl.closest('md-input-container') as HTMLElement) ||
          (labelEl.closest('md-select') as HTMLElement) ||
          (labelEl.closest('.md-input-container') as HTMLElement) ||
          (labelEl.closest('[role="group"]') as HTMLElement) ||
          (labelEl.parentElement as HTMLElement);

        if (root) {
          const target =
            (root.querySelector(
              '[role="combobox"],[aria-haspopup="listbox"],md-select,.md-select-value',
            ) as HTMLElement) || root;
          target.scrollIntoView({ block: 'center', inline: 'center' });
          target.click();
          return true;
        }
      }

      // Fallback: click first visible dropdown
      const boxes = Array.from(
        document.querySelectorAll('[role="combobox"],[aria-haspopup="listbox"],md-select'),
      ) as HTMLElement[];
      if (boxes.length > 0) {
        boxes[0].scrollIntoView({ block: 'center', inline: 'center' });
        boxes[0].click();
        return true;
      }

      return false;
    }, fieldLabels);

    if (!opened) {
      console.log('[selectDropdown] Could not open dropdown');
      return false;
    }

    // Longer delay after opening dropdown (reading all options carefully)
    await sleep(getRandomDelay(800, 1600));

    // Wait for options to appear
    try {
      await page.waitForFunction(
        () =>
          !!document.querySelector('md-option') ||
          !!document.querySelector('[role="option"]') ||
          !!document.querySelector('.md-option'),
        { timeout: 2000 },
      );
    } catch {
      console.log('[selectDropdown] Options did not appear');
    }

    // Try keyboard navigation first (most human-like)
    const desired = optionTexts.map((s) => s.trim().toLowerCase()).filter(Boolean);

    if (desired.length > 0 && fallbackArrowDown) {
      // Use arrow keys to navigate (very human-like)
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        // Check current focused option
        const currentText = await page.evaluate(() => {
          const focused = document.querySelector('[role="option"][aria-selected="true"]') ||
            document.querySelector('md-option.md-focused') ||
            document.activeElement;
          return (focused?.textContent || '').trim().toLowerCase();
        });

        if (desired.some((d) => currentText.includes(d) || currentText === d)) {
          // Found it! Pause like confirming choice (longer)
          await sleep(getRandomDelay(400, 900));
          await page.keyboard.press('Enter');
          await sleep(getRandomDelay(500, 1000));
          return true;
        }

        // Press arrow down with realistic delay (reading each option carefully)
        await page.keyboard.press('ArrowDown');
        await sleep(getRandomDelay(300, 700)); // Much slower - reading each option
        attempts++;
      }
    }

    // Fallback: click the option directly
    const optionHandles = await page.$$('md-option, [role="option"], .md-option');
    for (const handle of optionHandles) {
      const text = await handle.evaluate((el) => (el.textContent || '').trim().toLowerCase());
      if (desired.some((d) => text === d || text.includes(d))) {
        await humanClick(page, handle);
        return true;
      }
    }

    // Last resort: select first non-empty option
    if (optionHandles.length > 0) {
      for (const handle of optionHandles) {
        const text = await handle.evaluate((el) => (el.textContent || '').trim().toLowerCase());
        if (text && text !== 'none') {
          await humanClick(page, handle);
          return true;
        }
      }
    }

    console.log('[selectDropdown] No matching option found');
    return false;
  } catch (e: any) {
    console.log('[selectDropdown] Error:', e?.message);
    return false;
  }
}

/**
 * Click a button by text content
 */
export async function clickButtonByText(
  page: Page,
  texts: string[],
): Promise<boolean> {
  try {
    const clicked = await page.evaluate((textList) => {
      const norm = (s: string) => (s || '').trim().toLowerCase();
      const buttons = Array.from(
        document.querySelectorAll('button,[role="button"],input[type="submit"]'),
      ) as HTMLElement[];

      for (const text of textList) {
        const target = norm(text);
        const btn = buttons.find((b) => {
          const btnText = norm((b as any).value || b.textContent || '');
          return btnText === target || btnText.includes(target);
        });

        if (btn && !(btn as any).disabled && btn.getAttribute('aria-disabled') !== 'true') {
          btn.scrollIntoView({ block: 'center', inline: 'center' });
          btn.click();
          return true;
        }
      }
      return false;
    }, texts);

    if (clicked) {
      await sleep(getRandomDelay(300, 700));
    }

    return clicked;
  } catch (e: any) {
    console.log('[clickButtonByText] Error:', e?.message);
    return false;
  }
}
