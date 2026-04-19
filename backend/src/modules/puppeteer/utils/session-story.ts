/**
 * Session Story - Simulate realistic browsing journey before reporting
 * This makes the session look like a real user, not a bot going directly to report form
 */

import { Page } from 'puppeteer';
import { sleep, getRandomDelay, randomScroll, randomMouseMovements } from './human';

export interface SessionStoryOptions {
  domain: string;
  skipStory?: boolean; // For testing, can skip
}

/**
 * Simulate a realistic browsing journey before going to report form
 * Pattern: Search → View results → Click result → Read page → Navigate to report
 */
export async function playSessionStory(page: Page, options: SessionStoryOptions): Promise<void> {
  if (options.skipStory) {
    console.log('[SessionStory] Skipping story (skipStory=true)');
    return;
  }

  try {
    console.log('[SessionStory] Starting browsing journey...');
    
    // Step 1: Start at Google homepage (looks natural)
    console.log('[SessionStory] 1. Opening Google...');
    await page.goto('https://www.google.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Look around the page
    await randomScroll(page);
    await sleep(getRandomDelay(2000, 4000));
    await randomMouseMovements(page, 2);
    await sleep(getRandomDelay(1000, 2000));

    // Step 2: Search for something related to the domain
    console.log('[SessionStory] 2. Searching...');
    const searchTerms = [
      `${options.domain} reviews`,
      `${options.domain} scam`,
      `${options.domain} complaints`,
      `about ${options.domain}`,
      `${options.domain} legitimate`,
    ];
    const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    // Find search box
    const searchBox = await page.$('textarea[name="q"], input[name="q"]');
    if (searchBox) {
      await sleep(getRandomDelay(800, 1500));
      
      // Type search term slowly
      for (const char of searchTerm) {
        await page.keyboard.sendCharacter(char);
        await sleep(getRandomDelay(80, 200));
      }
      
      await sleep(getRandomDelay(500, 1200));
      await page.keyboard.press('Enter');
      
      // Wait for results
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await sleep(getRandomDelay(1500, 3000));
    }

    // Step 3: Scroll through search results (reading)
    console.log('[SessionStory] 3. Reading search results...');
    await randomScroll(page);
    await sleep(getRandomDelay(3000, 6000)); // Read results
    await randomMouseMovements(page, 3);
    await sleep(getRandomDelay(2000, 4000));

    // Scroll more
    await randomScroll(page);
    await sleep(getRandomDelay(2000, 4000));

    // Step 4: Maybe click a result (50% chance)
    if (Math.random() < 0.5) {
      console.log('[SessionStory] 4. Clicking a search result...');
      
      const clickResult = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'))
          .filter(a => {
            const href = (a as HTMLAnchorElement).href;
            return href && 
                   !href.includes('google.com') && 
                   !href.includes('webcache') &&
                   (a as HTMLElement).offsetParent !== null;
          });
        
        if (links.length > 0) {
          const randomLink = links[Math.floor(Math.random() * Math.min(5, links.length))];
          (randomLink as HTMLElement).scrollIntoView({ block: 'center' });
          (randomLink as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (clickResult) {
        // Wait for navigation
        await sleep(getRandomDelay(2000, 4000));
        
        // Stay on page (reading)
        await randomScroll(page);
        await sleep(getRandomDelay(5000, 15000)); // Read content
        await randomMouseMovements(page, 2);
        await sleep(getRandomDelay(2000, 4000));
        
        // Go back to Google
        await page.goBack({ waitUntil: 'networkidle2' }).catch(() => {});
        await sleep(getRandomDelay(1500, 3000));
      }
    }

    // Step 5: Final pause before navigating to report form
    console.log('[SessionStory] 5. Preparing to report...');
    await randomMouseMovements(page, 2);
    await sleep(getRandomDelay(2000, 5000));

    console.log('[SessionStory] Journey complete. Now proceeding to report form...');
    
  } catch (error) {
    console.log('[SessionStory] Error during story:', (error as Error).message);
    // Continue anyway - story is optional enrichment
  }
}

/**
 * Lighter version - just visit Google briefly then go to form
 */
export async function playLightStory(page: Page): Promise<void> {
  try {
    console.log('[SessionStory] Playing light story...');
    
    await page.goto('https://www.google.com', { 
      waitUntil: 'networkidle2',
      timeout: 20000 
    });
    
    await randomScroll(page);
    await sleep(getRandomDelay(2000, 4000));
    await randomMouseMovements(page, 1);
    await sleep(getRandomDelay(1000, 2000));
    
    console.log('[SessionStory] Light story complete.');
  } catch (error) {
    console.log('[SessionStory] Error in light story:', (error as Error).message);
  }
}

/**
 * Simulate abandonment (user gets distracted and leaves)
 * Returns true if session should be abandoned
 */
export function shouldAbandonSession(): boolean {
  // 3% chance to abandon (simulate real user behavior)
  return Math.random() < 0.03;
}
