/**
 * Refactored Puppeteer Advanced Service
 * Production-grade browser automation with anti-detection and human-like behavior
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer-extra';
import StealthPlugin = require('puppeteer-extra-plugin-stealth');
import { Browser, Page } from 'puppeteer';
import * as fs from 'fs';

import { ReportPageData, ReportStageCallback, GoogleAuthState, GoogleLoginResult } from './types';
import { sleep, getRandomDelay, randomScroll } from './utils/human';
import { normalizeUrl } from './utils/dom';

// Form handlers
import { handleSafeBrowsingPhish } from './flows/safe-browsing';
import { handleSearchConsoleSpam } from './flows/search-console';
import { handleGoogleDmcaSearch } from './flows/google-dmca';
import { handleGoogleSearchReport } from './flows/google-search-report';
import { handleCloudflareRegistrarWhois } from './flows/cloudflare-whois';
import { handleRadixAbuse } from './flows/radix-abuse';

import { ReportServicesService } from '../report-services/report-services.service';

puppeteer.use(StealthPlugin());

@Injectable()
export class PuppeteerAdvancedService {
  private readonly logger = new Logger(PuppeteerAdvancedService.name);
  private browsers: Map<string, Browser> = new Map();

  constructor(
    private configService: ConfigService,
    private reportServicesService: ReportServicesService,
  ) {}

  /**
   * Encode payload for Google Search extension
   */
  private encodePayload(payload: any): string {
    const json = JSON.stringify(payload);
    const utf8 = new TextEncoder().encode(json);
    const base64 = Buffer.from(utf8).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Get browser cookie signals for Google authentication
   */
  private async getGoogleCookieSignals(page: Page): Promise<string[]> {
    const cookies = [
      ...(await page.cookies('https://accounts.google.com/')),
      ...(await page.cookies('https://myaccount.google.com/')),
      ...(await page.cookies('https://www.google.com/')),
    ];
    
    const names = new Set(cookies.map((c) => c.name));
    const signals = [
      'SID',
      'HSID',
      'SSID',
      'APISID',
      'SAPISID',
      'SIDCC',
      '__Secure-1PSID',
      '__Secure-3PSID',
      '__Secure-3PAPISID',
      '__Secure-1PAPISID',
    ].filter((n) => names.has(n));
    
    return signals;
  }

  /**
   * Detect Google authentication state with comprehensive checks
   */
  private async detectGoogleAuthState(page: Page): Promise<GoogleAuthState> {
    const url = page.url();

    // Check for login page
    const needsRelogin = await page.evaluate(() => {
      const emailInput =
        document.querySelector('#identifierId') ||
        document.querySelector('input[type="email"][name="identifier"]') ||
        document.querySelector('input[type="email"]');
      return !!emailInput;
    });

    // Check for account avatar/profile indicators
    const avatarSignals = await page.evaluate(() => {
      const selectors = [
        'a[href*="SignOutOptions"]',
        '[aria-label*="Google Account"]',
        'img[alt*="Google Account"]',
      ];
      return selectors.some((s) => !!document.querySelector(s));
    });

    // Check for blocking/suspicious activity
    const text = await page.evaluate(() => (document.body?.innerText || '').slice(0, 20000));
    const lower = text.toLowerCase();
    
    const captchaHits = await page.evaluate(() => {
      const selectors = [
        'iframe[src*="recaptcha"]',
        '.g-recaptcha',
        'textarea[name="g-recaptcha-response"]',
        'iframe[src*="hcaptcha"]',
        'textarea[name="h-captcha-response"]',
        'iframe[src*="challenges.cloudflare.com"]',
        'input[name="cf-turnstile-response"]',
        'iframe[src*="turnstile"]',
      ];
      return selectors.filter((s) => !!document.querySelector(s)).length;
    });

    const locked =
      url.includes('/sorry/') ||
      url.includes('sorry.google.com') ||
      captchaHits > 0 ||
      (url.includes('accounts.google.com') &&
        (lower.includes('unusual traffic') ||
          lower.includes('try again later') ||
          lower.includes("verify it's you") ||
          lower.includes('suspicious') ||
          lower.includes('too many requests')));

    // Check authentication cookies
    const cookieSignals = await this.getGoogleCookieSignals(page);
    const hasAuthCookies = cookieSignals.length > 0;

    if (locked) {
      return {
        loggedIn: false,
        locked: true,
        needsRelogin: false,
        reason: 'Google flagged/locked',
      };
    }

    if (url.includes('accounts.google.com') && needsRelogin) {
      return {
        loggedIn: false,
        locked: false,
        needsRelogin: true,
        reason: 'Redirected to login',
      };
    }

    // Check for marketing page (not logged in)
    const marketingSignals = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('a,button'))
        .map((el) => (el.textContent || '').trim().toLowerCase())
        .filter(Boolean);
      return {
        hasGoToGoogleAccount: texts.some((t) => t.includes('go to google account')),
        hasCreateAccount: texts.some((t) => t.includes('create an account')),
        hasSignIn: texts.some((t) => t === 'sign in' || t.includes('sign in')),
      };
    });

    const isMarketingNotSignedIn =
      url.includes('myaccount.google.com') &&
      !hasAuthCookies &&
      (marketingSignals.hasGoToGoogleAccount ||
        marketingSignals.hasCreateAccount ||
        marketingSignals.hasSignIn);

    if (isMarketingNotSignedIn) {
      return {
        loggedIn: false,
        locked: false,
        needsRelogin: true,
        reason: 'Not signed in (marketing page)',
      };
    }

    const loggedIn =
      (hasAuthCookies && (avatarSignals || url.includes('myaccount.google.com'))) ||
      (url.includes('myaccount.google.com') && avatarSignals && !needsRelogin);

    return {
      loggedIn,
      locked: false,
      needsRelogin: !loggedIn && needsRelogin,
      reason: loggedIn
        ? `Authenticated (${cookieSignals.join(',') || 'no-cookie-signal'})`
        : 'Not logged in',
    };
  }

  /**
   * Validate Google session is active
   */
  async validateGoogleSession(
    profilePath: string,
    proxy?: any,
    onStage?: ReportStageCallback,
  ): Promise<boolean> {
    const state = await this.getGoogleSessionState(profilePath, proxy, onStage);
    return state.status === 'ACTIVE';
  }

  /**
   * Get Google session state
   */
  async getGoogleSessionState(
    profilePath: string,
    proxy?: any,
    onStage?: ReportStageCallback,
  ): Promise<{ status: 'ACTIVE' | 'NEED_RELOGIN' | 'LOCKED'; reason?: string }> {
    let page: Page | undefined;
    
    try {
      await onStage?.({ stage: 'session_check', message: 'Checking Google session' });
      const browser = await this.getBrowser(profilePath, proxy);
      page = await browser.newPage();
      
      await page.goto('https://myaccount.google.com/', {
        waitUntil: 'networkidle2',
        timeout: this.configService.get('PUPPETEER_TIMEOUT', 60000),
      });

      const state = await this.detectGoogleAuthState(page);
      
      await onStage?.({
        stage: 'session_check_done',
        message: state.loggedIn
          ? 'Logged in'
          : state.locked
            ? 'Account locked/suspicious'
            : 'Not logged in',
      });

      if (state.reason) {
        await onStage?.({ stage: 'session_check_detail', message: state.reason });
      }

      if (state.locked) return { status: 'LOCKED', reason: state.reason };
      if (state.loggedIn) return { status: 'ACTIVE', reason: state.reason };
      return { status: 'NEED_RELOGIN', reason: state.reason };
    } catch (e: any) {
      this.logger.error(`Session check error: ${e?.message}`);
      return { status: 'NEED_RELOGIN', reason: e?.message };
    } finally {
      if (page) {
        try {
          await page.close();
        } catch {}
      }
    }
  }

  /**
   * Prepare Google login (manual)
   */
  async prepareGoogleLogin(
    profilePath: string,
    proxy?: any,
    onStage?: ReportStageCallback,
  ): Promise<boolean> {
    const headless = this.configService.get('PUPPETEER_HEADLESS', 'false') === 'true';
    
    if (headless) {
      await onStage?.({
        stage: 'login_unavailable',
        message: 'Manual login requires PUPPETEER_HEADLESS=false',
      });
      return false;
    }

    await onStage?.({ stage: 'login_prepare', message: 'Opening Google login' });
    
    const browser = await this.getBrowser(profilePath, proxy);
    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

    try {
      // Close extra pages
      for (const extra of pages.slice(1)) {
        try {
          await extra.close();
        } catch {}
      }

      try {
        await page.bringToFront();
      } catch {}

      await page.goto('https://accounts.google.com/', {
        waitUntil: 'domcontentloaded',
        timeout: this.configService.get('PUPPETEER_TIMEOUT', 60000),
      });

      try {
        await page.bringToFront();
      } catch {}

      const initial = await this.detectGoogleAuthState(page);
      
      if (initial.loggedIn) {
        await onStage?.({
          stage: 'login_ready',
          message: 'Already logged in',
        });
        return true;
      }

      if (initial.locked) {
        await onStage?.({ stage: 'login_blocked', message: 'Google flagged/locked' });
        return false;
      }

      await onStage?.({
        stage: 'login_wait',
        message: 'Waiting for manual login in Chrome window',
      });

      const waitMs = Number(this.configService.get('GOOGLE_LOGIN_WAIT_MS', 10 * 60 * 1000));
      const deadline = Date.now() + waitMs;

      while (Date.now() < deadline) {
        const state = await this.detectGoogleAuthState(page);
        
        if (state.locked) {
          await onStage?.({ stage: 'login_blocked', message: state.reason || 'Blocked' });
          return false;
        }
        
        if (state.loggedIn) {
          await onStage?.({ stage: 'login_detected', message: state.reason || 'Logged in' });
          return true;
        }
        
        await sleep(2000);
      }

      const ok = await this.validateGoogleSession(profilePath, proxy, onStage);
      await onStage?.({
        stage: 'login_done',
        message: ok ? 'Login success' : 'Login not detected',
      });
      
      return ok;
    } catch (e: any) {
      this.logger.error(`Prepare login error: ${e?.message}`);
      await onStage?.({ stage: 'login_error', message: e?.message });
      return false;
    } finally {
      if (this.configService.get('CLOSE_LOGIN_TAB', 'false') === 'true') {
        try {
          await page.close();
        } catch {}
      }
    }
  }

  /**
   * Automatic Google login (email + password)
   */
  async autoLoginGoogle(
    profilePath: string,
    email: string,
    password: string,
    proxy?: any,
    onStage?: ReportStageCallback,
  ): Promise<GoogleLoginResult> {
    await onStage?.({ stage: 'login_auto_start', message: 'Attempting automatic Google login' });

    const browser = await this.getBrowser(profilePath, proxy);
    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

    try {
      // Close extra pages
      for (const extra of pages.slice(1)) {
        try {
          await extra.close();
        } catch {}
      }

      try {
        await page.bringToFront();
      } catch {}

      await page.goto('https://accounts.google.com/', {
        waitUntil: 'domcontentloaded',
        timeout: this.configService.get('PUPPETEER_TIMEOUT', 60000),
      });

      const initial = await this.detectGoogleAuthState(page);
      
      if (initial.locked) {
        return { ok: false, status: 'LOCKED', reason: initial.reason || 'Google blocked' };
      }
      
      if (initial.loggedIn) {
        return { ok: true, status: 'ACTIVE', reason: initial.reason || 'Already logged in' };
      }

      // Fill email
      await onStage?.({ stage: 'login_auto_email', message: 'Filling email' });
      await page.waitForSelector('#identifierId, input[type="email"]', { timeout: 30000 });

      const emailInput = await page.$('#identifierId');
      if (emailInput) {
        await emailInput.click({ delay: 20 });
        await sleep(getRandomDelay(200, 400));
        await emailInput.type(email, { delay: getRandomDelay(50, 150) });
      }

      await sleep(getRandomDelay(200, 600));

      const identifierNext =
        (await page.$('#identifierNext button')) || (await page.$('#identifierNext'));
      if (identifierNext) {
        await identifierNext.click();
      } else {
        await page.keyboard.press('Enter');
      }

      await sleep(getRandomDelay(800, 1400));

      const afterEmailState = await this.detectGoogleAuthState(page);
      if (afterEmailState.locked) {
        return { ok: false, status: 'LOCKED', reason: afterEmailState.reason || 'Google blocked' };
      }

      // Check for email errors
      const emailError = await page.evaluate(() => {
        const raw = (document.body?.innerText || '').slice(0, 20000);
        const lower = raw.toLowerCase();
        if (
          lower.includes("couldn't find your google account")
        )
          return 'Account not found';
        if (lower.includes('enter an email') || lower.includes('enter your email'))
          return 'Email required';
        return null;
      });

      if (emailError) {
        return { ok: false, status: 'INVALID', reason: emailError };
      }

      // Fill password
      await onStage?.({ stage: 'login_auto_password', message: 'Filling password' });
      await page.waitForSelector('input[type="password"][name="Passwd"], input[type="password"]', {
        timeout: 30000,
      });

      const passwordInput = await page.$('input[type="password"][name="Passwd"]');
      if (passwordInput) {
        await passwordInput.click({ delay: 20 });
        await sleep(getRandomDelay(200, 400));
        await passwordInput.type(password, { delay: getRandomDelay(50, 150) });
      }

      await sleep(getRandomDelay(200, 600));

      const passwordNext =
        (await page.$('#passwordNext button')) || (await page.$('#passwordNext'));
      if (passwordNext) {
        await passwordNext.click();
      } else {
        await page.keyboard.press('Enter');
      }

      await sleep(getRandomDelay(1200, 2200));

      // Check for password errors
      const passwordError = await page.evaluate(() => {
        const raw = (document.body?.innerText || '').slice(0, 20000);
        const lower = raw.toLowerCase();
        if (lower.includes('wrong password')) return 'Wrong password';
        if (lower.includes('try again') && lower.includes('password')) return 'Password rejected';
        if (lower.includes('2-step verification') || lower.includes('2 step verification'))
          return '2FA required';
        if (lower.includes("verify it's you"))
          return 'Verify required';
        return null;
      });

      if (passwordError === 'Wrong password' || passwordError === 'Password rejected') {
        return { ok: false, status: 'INVALID', reason: passwordError };
      }

      if (passwordError === '2FA required' || passwordError === 'Verify required') {
        await onStage?.({ stage: 'login_auto_2fa', message: passwordError });
        return { ok: false, status: 'NEED_RELOGIN', reason: passwordError };
      }

      // Verify final state
      const state = await this.getGoogleSessionState(profilePath, proxy, onStage);
      
      if (state.status === 'ACTIVE') {
        return { ok: true, status: 'ACTIVE', reason: state.reason };
      }
      if (state.status === 'LOCKED') {
        return { ok: false, status: 'LOCKED', reason: state.reason };
      }
      
      return { ok: false, status: 'NEED_RELOGIN', reason: state.reason || 'Not logged in' };
    } catch (e: any) {
      const msg = e?.message || String(e);
      this.logger.error(`Auto login error: ${msg}`);
      await onStage?.({ stage: 'login_auto_error', message: msg });
      return { ok: false, status: 'NEED_RELOGIN', reason: msg };
    }
  }

  /**
   * Get or create browser instance
   */
  async getBrowser(profilePath: string, proxy?: any): Promise<Browser> {
    const proxyKey = proxy ? `${proxy.type}:${proxy.host}:${proxy.port}` : 'direct';
    const key = `${profilePath}::${proxyKey}`;

    if (this.browsers.has(key) && this.browsers.get(key)?.connected) {
      return this.browsers.get(key);
    }

    const browserURL = this.configService.get<string>('CHROME_BROWSER_URL');
    if (browserURL) {
      const browser = await puppeteer.connect({ browserURL });
      this.browsers.set(key, browser);
      this.logger.log(`Connected to existing Chrome at ${browserURL}`);
      return browser;
    }

    const headless = this.configService.get('PUPPETEER_HEADLESS', 'false') === 'true';
    const executablePath = this.configService.get<string>('PUPPETEER_EXECUTABLE_PATH');
    const channel = this.configService.get<string>(
      'PUPPETEER_CHANNEL',
      headless ? undefined : 'chrome',
    );

    const customUserAgent = this.configService.get<string>('PUPPETEER_USER_AGENT');
    let userAgent: string | undefined = customUserAgent;

    if (!userAgent && this.configService.get('PUPPETEER_RANDOM_UA', 'false') === 'true') {
      try {
        const UAModule = require('user-agents');
        const UAClass = UAModule && (UAModule.default || UAModule);
        userAgent = UAClass ? new UAClass({ deviceCategory: 'desktop' }).toString() : undefined;
      } catch {
        this.logger.warn('user-agents module not available');
      }
    }

    const launchOptions: any = {
      headless,
      userDataDir: profilePath,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-first-run',
        '--no-default-browser-check',
        '--start-maximized',
      ],
      defaultViewport: null,
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--enable-automation'],
    };

    if (process.platform !== 'win32') {
      launchOptions.args.push(
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      );
    }

    if (userAgent) {
      launchOptions.args.push(`--user-agent=${userAgent}`);
    }

    if (proxy) {
      const proxyUrl = `${proxy.type}://${proxy.host}:${proxy.port}`;
      launchOptions.args.push(`--proxy-server=${proxyUrl}`);
      this.logger.log(`Launching with proxy: ${proxyUrl}`);
    }

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    } else if (channel) {
      launchOptions.channel = channel;
    }

    const browser = await puppeteer.launch(launchOptions);
    this.browsers.set(key, browser);

    this.logger.log(`Browser launched: ${key}`);
    return browser;
  }

  /**
   * Open report page and auto-fill form
   */
  async openReportPage(
    data: ReportPageData,
    onStage?: ReportStageCallback,
  ): Promise<{ screenshot?: string; error?: string }> {
    let page: Page | undefined;

    try {
      await onStage?.({ stage: 'get_browser', message: 'Getting browser instance' });
      
      if (!data.profilePath) {
        throw new Error('Missing profilePath');
      }

      const browser = await this.getBrowser(data.profilePath, data.proxy);
      const services = await this.reportServicesService.findAll();
      const service = services.find((s) => s._id.toString() === data.serviceId);

      if (!service) {
        throw new Error('Report service not found');
      }

      this.logger.log(`Opening ${service.name} report page for ${data.domain}`);
      await onStage?.({ stage: 'new_page', message: 'Opening new page' });

      page = await browser.newPage();

      // Set page title with proxy info
      if (data.proxy) {
        const proxyInfo = `${data.proxy.host}:${data.proxy.port}`;
        await page.evaluateOnNewDocument((info) => {
          const originalTitle = document.title;
          Object.defineProperty(document, 'title', {
            get: () => `[Proxy: ${info}] ${originalTitle}`,
            set: () => {},
          });
        }, proxyInfo);
        this.logger.log(`Using proxy: ${proxyInfo}`);
      }

      // Authenticate proxy if needed
      if (data.proxy?.username && data.proxy?.password) {
        await onStage?.({ stage: 'proxy_auth', message: 'Authenticating proxy' });
        await page.authenticate({
          username: data.proxy.username,
          password: data.proxy.password,
        });
      }

      // Set viewport with slight randomization
      await onStage?.({ stage: 'set_viewport', message: 'Setting viewport' });
      await page.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1,
      });

      // Apply stealth patches
      await onStage?.({ stage: 'stealth_patch', message: 'Applying stealth settings' });

      if (data.proxy) {
        await page.evaluateOnNewDocument((proxyInfo) => {
          console.log(
            '%c🌐 Using Proxy: ' + proxyInfo,
            'color: blue; font-weight: bold; font-size: 14px;',
          );
        }, `${data.proxy.host}:${data.proxy.port} (${data.proxy.type})`);
      }

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        (window.navigator as any).chrome = {
          runtime: {},
        };

        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });

      // Prepare URL
      let finalUrl = service.reportUrl;
      const isGoogleSearchReport =
        service.reportUrl.includes('www.google.com') && service.reportUrl.includes('?hl=vi');

      if (isGoogleSearchReport) {
        const payload = {
          domain: data.domain,
          reason: data.reason,
        };
        const encoded = this.encodePayload(payload);
        finalUrl = `${service.reportUrl}#dar=${encoded}`;
        this.logger.log('Google Search: Using extension mode');
        await onStage?.({ stage: 'extension_mode', message: 'Using extension for Google Search' });
      }

      // Navigate to page
      this.logger.log(`Navigating to ${finalUrl.substring(0, 100)}...`);
      await onStage?.({ stage: 'navigate', message: `Navigating to ${service.reportUrl}` });

      await page.goto(finalUrl, {
        waitUntil: 'networkidle2',
        timeout: this.configService.get('PUPPETEER_TIMEOUT', 60000),
      });

      await onStage?.({ stage: 'page_loaded', message: 'Page loaded' });
      await sleep(getRandomDelay(1000, 3000));
      await randomScroll(page);
      await sleep(getRandomDelay(800, 1500));

      // Check for redirects and blocks
      const currentUrl = page.url();
      
      if (currentUrl.includes('accounts.google.com')) {
        await onStage?.({
          stage: 'login_required',
          message: 'Redirected to Google login - session expired',
        });
        throw new Error('AUTH_REQUIRED: Google login required');
      }

      if (currentUrl.includes('/sorry/') || currentUrl.includes('sorry.google.com')) {
        await onStage?.({
          stage: 'google_blocked',
          message: 'Google block page detected',
        });
        throw new Error('LOCKED: Google block page');
      }

      // Check for suspicious activity signals
      const blockSignals = await page.evaluate(() => {
        const raw = (document.body?.innerText || '').slice(0, 20000);
        const lower = raw.toLowerCase();
        const hits: string[] = [];
        if (lower.includes('unusual traffic')) hits.push('unusual_traffic');
        if (lower.includes("verify it's you"))
          hits.push('verify_its_you');
        if (lower.includes('suspicious')) hits.push('suspicious');
        if (lower.includes('try again later')) hits.push('try_again_later');
        if (lower.includes('too many requests')) hits.push('too_many_requests');
        return { hits };
      });

      if (blockSignals?.hits?.length) {
        await onStage?.({
          stage: 'google_blocked',
          message: `Google blocked: ${blockSignals.hits.join(', ')}`,
        });
        throw new Error(`LOCKED: Google blocked (${blockSignals.hits.join(',')})`);
      }

      this.logger.log('Auto-filling form with human-like behavior');
      await onStage?.({ stage: 'autofill', message: 'Auto-filling fields' });

      // Route to appropriate form handler
      const isDmca = service.reportUrl.includes('reportcontent.google.com/forms/dmca_search');

      if (!isDmca && !isGoogleSearchReport) {
        // Generic form fill for simple forms
        await page.evaluate(
          (domain, reason, email) => {
            const fillInput = (selectors: string[], value: string) => {
              for (const selector of selectors) {
                const element = document.querySelector(selector) as
                  | HTMLInputElement
                  | HTMLTextAreaElement;
                if (element) {
                  element.value = value;
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  return true;
                }
              }
              return false;
            };

            const domainSelectors = [
              'input[name="url"]',
              'input[name="domain"]',
              'input[type="url"]',
              'textarea[name="url"]',
            ];

            const reasonSelectors = [
              'textarea[name="description"]',
              'textarea[name="reason"]',
              'textarea[name="details"]',
              'textarea[name="comments"]',
            ];

            const emailSelectors = [
              'input[name="email"]',
              'input[type="email"]',
            ];

            fillInput(domainSelectors, domain);
            fillInput(reasonSelectors, reason);
            if (email) fillInput(emailSelectors, email);
          },
          data.domain,
          data.reason,
          data.email,
        );
      }

      await sleep(getRandomDelay(1000, 2000));
      await randomScroll(page);

      // Call specific form handlers
      if (isGoogleSearchReport) {
        await onStage?.({ stage: 'form_specific', message: 'Google Search feedback handling' });
        await handleGoogleSearchReport(page, data.domain, data.reason, onStage);
      }
      
      if (service.reportUrl.includes('search.google.com/search-console/report-spam')) {
        await onStage?.({ stage: 'form_specific', message: 'Search Console spam form' });
        await handleSearchConsoleSpam(page, data.domain, data.reason, onStage);
      }
      
      if (service.reportUrl.includes('safebrowsing.google.com/safebrowsing/report_phish')) {
        await onStage?.({ stage: 'form_specific', message: 'Safe Browsing phishing form' });
        await handleSafeBrowsingPhish(page, data.domain, data.reason, onStage);
      }
      
      if (service.reportUrl.includes('reportcontent.google.com/forms/dmca_search')) {
        await onStage?.({ stage: 'form_specific', message: 'Google DMCA form' });
        await handleGoogleDmcaSearch(page, data.domain, data.reason, data.email, onStage);
      }
      
      if (service.reportUrl.includes('abuse.cloudflare.com')) {
        await onStage?.({ stage: 'form_specific', message: 'Cloudflare WHOIS form' });
        await handleCloudflareRegistrarWhois(page, data.domain, data.reason, data.email, onStage);
      }
      
      if (service.reportUrl.includes('abuse.radix.website')) {
        await onStage?.({ stage: 'form_specific', message: 'Radix abuse form' });
        await handleRadixAbuse(page, data.domain, data.reason, data.email, onStage);
      }

      // Check for CAPTCHA
      const captchaSignals = await page.evaluate(() => {
        const selectors = [
          'iframe[src*="recaptcha"]',
          '.g-recaptcha',
          'textarea[name="g-recaptcha-response"]',
          'iframe[src*="hcaptcha"]',
          'textarea[name="h-captcha-response"]',
          'iframe[src*="challenges.cloudflare.com"]',
          'input[name="cf-turnstile-response"]',
          'iframe[src*="turnstile"]',
        ];
        const hits = selectors.filter((s) => !!document.querySelector(s));
        return { hits };
      });

      if (captchaSignals?.hits?.length) {
        await onStage?.({
          stage: 'captcha_required',
          message: `CAPTCHA detected (${captchaSignals.hits.length} signal(s))`,
        });
      } else {
        await onStage?.({ stage: 'captcha_check', message: 'No CAPTCHA detected' });
      }

      // Take screenshot
      await fs.promises.mkdir('screenshots', { recursive: true });
      const screenshotPath = `screenshots/${Date.now()}-${data.domain.replace(/[^a-z0-9]/gi, '_')}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await onStage?.({ stage: 'screenshot', message: 'Screenshot saved' });

      this.logger.log(`Form filled for ${data.domain}. Screenshot: ${screenshotPath}`);
      
      await onStage?.({
        stage: 'waiting_manual',
        message: 'Awaiting manual verification and submit',
      });

      return { screenshot: screenshotPath };
    } catch (error: any) {
      this.logger.error(`Error opening report page: ${error?.message}`);
      await onStage?.({ stage: 'error', message: error?.message });

      if (page) {
        try {
          await page.close();
        } catch (e: any) {
          this.logger.error(`Error closing page: ${e?.message}`);
        }
      }

      return { error: error?.message };
    }
  }

  /**
   * Close browser for specific profile/proxy combination
   */
  async closeBrowser(profilePath: string, proxy?: any): Promise<void> {
    const proxyKey = proxy ? `${proxy.type}:${proxy.host}:${proxy.port}` : 'direct';
    const key = `${profilePath}::${proxyKey}`;
    const browser = this.browsers.get(key);

    if (browser) {
      await browser.close();
      this.browsers.delete(key);
      this.logger.log(`Browser closed: ${key}`);
    }
  }

  /**
   * Close all browsers
   */
  async closeAllBrowsers(): Promise<void> {
    for (const [key, browser] of this.browsers.entries()) {
      if (browser.connected) {
        await browser.close();
        this.logger.log(`Browser closed: ${key}`);
      }
    }
    this.browsers.clear();
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.closeAllBrowsers();
  }
}
