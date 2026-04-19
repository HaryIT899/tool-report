import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer-extra';
import StealthPlugin = require('puppeteer-extra-plugin-stealth');
import { Browser, Page } from 'puppeteer';
import { Proxy } from '../proxies/schemas/proxy.schema';
import { ReportServicesService } from '../report-services/report-services.service';
import * as fs from 'fs';

puppeteer.use(StealthPlugin());

export interface ReportPageData {
  domain: string;
  reason: string;
  email?: string;
  serviceId: string;
  proxy?: Proxy;
  profilePath?: string;
}

export type ReportStageCallback = (event: {
  stage: string;
  message?: string;
}) => void | Promise<void>;

@Injectable()
export class PuppeteerAdvancedService {
  private readonly logger = new Logger(PuppeteerAdvancedService.name);
  private browsers: Map<string, Browser> = new Map();

  constructor(
    private configService: ConfigService,
    private reportServicesService: ReportServicesService,
  ) {}

  private encodePayload(payload: any): string {
    const json = JSON.stringify(payload);
    const utf8 = new TextEncoder().encode(json);
    const base64 = Buffer.from(utf8).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private getRandomDelay(min = 500, max = 2000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async typeSlowly(page: Page, selector: string, text: string): Promise<void> {
    const element = await page.$(selector);
    if (element) {
      await element.click();
      await this.sleep(this.getRandomDelay(300, 800));

      for (const char of text) {
        await element.type(char, { delay: this.getRandomDelay(50, 150) });
      }
    }
  }

  private async randomScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      const scrolls = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < scrolls; i++) {
        window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
        await new Promise((r) => setTimeout(r, Math.random() * 500 + 200));
      }
    });
  }

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

  private async detectGoogleAuthState(
    page: Page,
  ): Promise<{ loggedIn: boolean; locked: boolean; needsRelogin: boolean; reason?: string }> {
    const url = page.url();

    const needsRelogin = await page.evaluate(() => {
      const emailInput =
        document.querySelector('#identifierId') ||
        document.querySelector('input[type="email"][name="identifier"]') ||
        document.querySelector('input[type="email"]');
      return !!emailInput;
    });

    const avatarSignals = await page.evaluate(() => {
      const selectors = [
        'a[href*="SignOutOptions"]',
        '[aria-label*="Google Account"]',
        'img[alt*="Google Account"]',
      ];
      return selectors.some((s) => !!document.querySelector(s));
    });

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
      const hits = selectors.filter((s) => !!document.querySelector(s));
      return hits.length;
    });
    const locked =
      url.includes('/sorry/') ||
      url.includes('sorry.google.com') ||
      captchaHits > 0 ||
      (url.includes('accounts.google.com') &&
        (lower.includes('unusual traffic') ||
          lower.includes('try again later') ||
          lower.includes('verify it’s you') ||
          lower.includes("verify it's you") ||
          lower.includes('suspicious') ||
          lower.includes('too many requests')));

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
      return { loggedIn: false, locked: false, needsRelogin: true, reason: 'Redirected to login' };
    }

    const marketingSignals = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('a,button'))
        .map((el) => (el.textContent || '').trim().toLowerCase())
        .filter(Boolean);
      const hasGoToGoogleAccount = texts.some((t) => t.includes('go to google account'));
      const hasCreateAccount = texts.some((t) => t.includes('create an account'));
      const hasSignIn = texts.some((t) => t === 'sign in' || t.includes('sign in'));
      return { hasGoToGoogleAccount, hasCreateAccount, hasSignIn };
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
        reason: 'Not signed in (myaccount marketing page)',
      };
    }

    const loggedIn =
      (hasAuthCookies && (avatarSignals || url.includes('myaccount.google.com'))) ||
      (url.includes('myaccount.google.com') && avatarSignals && !needsRelogin);
    return {
      loggedIn,
      locked: false,
      needsRelogin: !loggedIn && needsRelogin,
      reason: loggedIn ? `OK (${cookieSignals.join(',') || 'no-cookie-signal'})` : 'Not logged in',
    };
  }

  async validateGoogleSession(
    profilePath: string,
    proxy?: Proxy,
    onStage?: ReportStageCallback,
  ): Promise<boolean> {
    const state = await this.getGoogleSessionState(profilePath, proxy, onStage);
    return state.status === 'ACTIVE';
  }

  async getGoogleSessionState(
    profilePath: string,
    proxy?: Proxy,
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
    } finally {
      if (page) {
        try {
          await page.close();
        } catch {}
      }
    }
  }

  async prepareGoogleLogin(
    profilePath: string,
    proxy?: Proxy,
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
    await onStage?.({ stage: 'login_prepare', message: 'Opening Google login for manual sign-in' });
    const browser = await this.getBrowser(profilePath, proxy);
    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());
    try {
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
          message: 'Already logged in (session cookies present for this profile)',
        });
        return true;
      }
      if (initial.locked) {
        await onStage?.({ stage: 'login_blocked', message: 'Google flagged/locked' });
        return false;
      }

      await onStage?.({
        stage: 'login_wait',
        message: 'Waiting for manual login in the opened Chrome window',
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
        await this.sleep(2000);
      }

      const ok = await this.validateGoogleSession(profilePath, proxy, onStage);
      await onStage?.({
        stage: 'login_done',
        message: ok ? 'Login success' : 'Login not detected',
      });
      return ok;
    } finally {
      if (this.configService.get('CLOSE_LOGIN_TAB', 'false') === 'true') {
        try {
          await page.close();
        } catch {}
      }
    }
  }

  async autoLoginGoogle(
    profilePath: string,
    email: string,
    password: string,
    proxy?: Proxy,
    onStage?: ReportStageCallback,
  ): Promise<{
    ok: boolean;
    status: 'ACTIVE' | 'NEED_RELOGIN' | 'INVALID' | 'LOCKED';
    reason?: string;
  }> {
    await onStage?.({ stage: 'login_auto_start', message: 'Attempting automatic Google login' });

    const browser = await this.getBrowser(profilePath, proxy);
    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

    try {
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

      await onStage?.({ stage: 'login_auto_email', message: 'Filling email' });
      await page.waitForSelector('#identifierId, input[type="email"]', { timeout: 30000 });
      await this.typeSlowly(page, '#identifierId', email);
      await this.sleep(this.getRandomDelay(200, 600));

      const identifierNext =
        (await page.$('#identifierNext button')) || (await page.$('#identifierNext'));
      if (identifierNext) {
        await identifierNext.click();
      } else {
        await page.keyboard.press('Enter');
      }

      await this.sleep(this.getRandomDelay(800, 1400));

      const afterEmailState = await this.detectGoogleAuthState(page);
      if (afterEmailState.locked) {
        return { ok: false, status: 'LOCKED', reason: afterEmailState.reason || 'Google blocked' };
      }

      const emailError = await page.evaluate(() => {
        const raw = (document.body?.innerText || '').slice(0, 20000);
        const lower = raw.toLowerCase();
        if (
          lower.includes('couldn’t find your google account') ||
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

      await onStage?.({ stage: 'login_auto_password', message: 'Filling password' });
      await page.waitForSelector('input[type="password"][name="Passwd"], input[type="password"]', {
        timeout: 30000,
      });
      await this.typeSlowly(page, 'input[type="password"][name="Passwd"]', password);
      await this.sleep(this.getRandomDelay(200, 600));

      const passwordNext =
        (await page.$('#passwordNext button')) || (await page.$('#passwordNext'));
      if (passwordNext) {
        await passwordNext.click();
      } else {
        await page.keyboard.press('Enter');
      }

      await this.sleep(this.getRandomDelay(1200, 2200));

      const passwordError = await page.evaluate(() => {
        const raw = (document.body?.innerText || '').slice(0, 20000);
        const lower = raw.toLowerCase();
        if (lower.includes('wrong password')) return 'Wrong password';
        if (lower.includes('try again') && lower.includes('password')) return 'Password rejected';
        if (lower.includes('2-step verification') || lower.includes('2 step verification'))
          return '2FA required';
        if (lower.includes('verify it’s you') || lower.includes("verify it's you"))
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
      await onStage?.({ stage: 'login_auto_error', message: msg });
      return { ok: false, status: 'NEED_RELOGIN', reason: msg };
    }
  }

  async getBrowser(profilePath: string, proxy?: Proxy): Promise<Browser> {
    const proxyKey = proxy ? `${proxy.type}:${proxy.host}:${proxy.port}` : 'direct';
    const key = `${profilePath}::${proxyKey}`;

    if (this.browsers.has(key) && this.browsers.get(key)?.connected) {
      return this.browsers.get(key);
    }

    const browserURL = this.configService.get<string>('CHROME_BROWSER_URL');
    if (browserURL) {
      const browser = await puppeteer.connect({ browserURL });
      this.browsers.set(key, browser);
      this.logger.log(`Connected to existing Chrome at ${browserURL} (key: ${key})`);
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
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const UAModule = require('user-agents');
        const UAClass = UAModule && (UAModule.default || UAModule);
        userAgent = UAClass ? new UAClass({ deviceCategory: 'desktop' }).toString() : undefined;
      } catch {
        userAgent = undefined;
        this.logger.warn('user-agents not available; proceeding without random UA');
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
      this.logger.log(`Launching browser with proxy: ${proxyUrl}`);
    }

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    } else if (channel) {
      launchOptions.channel = channel;
    }

    const browser = await puppeteer.launch(launchOptions);
    this.browsers.set(key, browser);

    this.logger.log(`Browser launched with key: ${key}`);
    return browser;
  }

  async openReportPage(
    data: ReportPageData,
    onStage?: ReportStageCallback,
  ): Promise<{ screenshot?: string; error?: string }> {
    let page: Page;

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
      await onStage?.({ stage: 'new_page', message: 'Opening a new page' });

      page = await browser.newPage();

      // Set page title to show proxy info
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

      if (data.proxy?.username && data.proxy?.password) {
        await onStage?.({ stage: 'proxy_auth', message: 'Authenticating proxy' });
        await page.authenticate({
          username: data.proxy.username,
          password: data.proxy.password,
        });
      }

      await onStage?.({ stage: 'set_viewport', message: 'Setting viewport' });
      await page.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1,
      });

      await onStage?.({ stage: 'stealth_patch', message: 'Applying stealth settings' });

      // Log proxy info in browser console
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
        this.logger.log(`Google Search: Appending hash for extension`);
        await onStage?.({ stage: 'extension_mode', message: 'Using extension for Google Search' });
      }

      this.logger.log(`Navigating to ${finalUrl.substring(0, 100)}...`);
      await onStage?.({ stage: 'navigate', message: `Navigating to ${service.reportUrl}` });

      await page.goto(finalUrl, {
        waitUntil: 'networkidle2',
        timeout: this.configService.get('PUPPETEER_TIMEOUT', 60000),
      });

      await onStage?.({ stage: 'page_loaded', message: 'Page loaded' });
      await this.sleep(this.getRandomDelay(1000, 3000));
      await this.randomScroll(page);
      await this.sleep(this.getRandomDelay(800, 1500));

      const currentUrl = page.url();
      if (currentUrl.includes('accounts.google.com')) {
        await onStage?.({
          stage: 'login_required',
          message: 'Redirected to Google login. Profile session is missing/expired.',
        });
        throw new Error('AUTH_REQUIRED: Google login required');
      }
      if (currentUrl.includes('/sorry/') || currentUrl.includes('sorry.google.com')) {
        await onStage?.({
          stage: 'google_blocked',
          message: 'Google block page detected (sorry page)',
        });
        throw new Error('LOCKED: Google block page');
      }

      const blockSignals = await page.evaluate(() => {
        const raw = (document.body?.innerText || '').slice(0, 20000);
        const lower = raw.toLowerCase();
        const hits: string[] = [];
        if (lower.includes('unusual traffic')) hits.push('unusual_traffic');
        if (lower.includes('verify it’s you') || lower.includes("verify it's you"))
          hits.push('verify_its_you');
        if (lower.includes('suspicious')) hits.push('suspicious');
        if (lower.includes('try again later')) hits.push('try_again_later');
        if (lower.includes('too many requests')) hits.push('too_many_requests');
        return { hits };
      });
      if (blockSignals?.hits?.length) {
        await onStage?.({
          stage: 'google_blocked',
          message: `Google suspicious/blocked signal(s): ${blockSignals.hits.join(', ')}`,
        });
        throw new Error(`LOCKED: Google blocked (${blockSignals.hits.join(',')})`);
      }

      this.logger.log('Auto-filling form fields with human-like behavior');
      await onStage?.({ stage: 'autofill', message: 'Auto-filling fields' });

      const isDmca = service.reportUrl.includes('reportcontent.google.com/forms/dmca_search');
      if (!isDmca && !isGoogleSearchReport) {
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
              'input[name="website"]',
              'input[type="url"]',
              'textarea[name="url"]',
              '#url',
              '#domain',
              '#website',
            ];

            const reasonSelectors = [
              'textarea[name="description"]',
              'textarea[name="reason"]',
              'textarea[name="details"]',
              'textarea[name="comments"]',
              'textarea[name="message"]',
              'textarea[name="info"]',
              '#description',
              '#reason',
              '#details',
              '#comments',
            ];

            const emailSelectors = [
              'input[name="email"]',
              'input[type="email"]',
              'input[name="contact"]',
              '#email',
              '#contact_email',
            ];

            fillInput(domainSelectors, domain);
            fillInput(reasonSelectors, reason);
            if (email) {
              fillInput(emailSelectors, email);
            }
          },
          data.domain,
          data.reason,
          data.email,
        );
      }

      await this.sleep(this.getRandomDelay(1000, 2000));
      await this.randomScroll(page);

      if (isGoogleSearchReport) {
        await onStage?.({ stage: 'form_specific', message: 'Google Search feedback handling' });
        await this.handleGoogleSearchReport(page, data.domain, data.reason, onStage);
      }
      if (service.reportUrl.includes('search.google.com/search-console/report-spam')) {
        await onStage?.({ stage: 'form_specific', message: 'Search Console spam form handling' });
        await this.handleSearchConsoleSpam(page, data.domain, data.reason, onStage);
      }
      if (service.reportUrl.includes('safebrowsing.google.com/safebrowsing/report_phish')) {
        await onStage?.({
          stage: 'form_specific',
          message: 'Safe Browsing phishing form handling',
        });
        await this.handleSafeBrowsingPhish(page, data.domain, data.reason, onStage);
      }
      if (service.reportUrl.includes('reportcontent.google.com/forms/dmca_search')) {
        await onStage?.({ stage: 'form_specific', message: 'Google DMCA form handling' });
        await this.handleGoogleDmcaSearch(page, data.domain, data.reason, data.email, onStage);
      }
      if (service.reportUrl.includes('abuse.cloudflare.com')) {
        await onStage?.({
          stage: 'form_specific',
          message: 'Cloudflare Registrar WHOIS form handling',
        });
        await this.handleCloudflareRegistrarWhois(
          page,
          data.domain,
          data.reason,
          data.email,
          onStage,
        );
      }
      if (service.reportUrl.includes('abuse.radix.website')) {
        await onStage?.({ stage: 'form_specific', message: 'Radix Abuse form handling' });
        await this.handleRadixAbuse(page, data.domain, data.reason, data.email, onStage);
      }

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
          message: `Captcha detected (${captchaSignals.hits.length} signal(s))`,
        });
      } else {
        await onStage?.({ stage: 'captcha_check', message: 'No captcha signal detected' });
      }

      let screenshotMessage = 'Screenshot saved';
      if (service.reportUrl.includes('safebrowsing.google.com/safebrowsing/report_phish')) {
        try {
          const state = await page.evaluate(() => {
            const norm = (s: string) => (s || '').replace(/\s+/g, ' ').trim();

            const findMdSelectValueByLabel = (labelText: string) => {
              const labels = Array.from(
                document.querySelectorAll('label,span,div,p'),
              ) as HTMLElement[];
              const label = labels.find((el) => norm(el.textContent || '') === labelText);
              const root =
                (label?.closest('md-input-container') as HTMLElement) ||
                (label?.closest('md-select') as HTMLElement) ||
                (label?.parentElement as HTMLElement) ||
                null;
              const valueEl =
                (root?.querySelector(
                  '.md-select-value, md-select-value, .md-select-value span',
                ) as HTMLElement | null) || null;
              const raw = norm(valueEl?.textContent || '');
              return raw;
            };

            const wanted = norm((window as any).__sbWantedUrl || '');
            const urlOk = (window as any).__sbUrlOk;
            const urlCandidates = (window as any).__sbUrlCandidateCount;
            const submitted = (window as any).__sbSubmitted;

            const urlInput =
              (document.querySelector('input[formcontrolname="url"]') as HTMLInputElement | null) ||
              (document.querySelector(
                'input[formcontrolname*="url" i]',
              ) as HTMLInputElement | null) ||
              (document.querySelector(
                'input[id^="mat-input-"][aria-required="true"]',
              ) as HTMLInputElement | null) ||
              (document.querySelector(
                'input[id^="mat-input-"][required]',
              ) as HTMLInputElement | null) ||
              null;
            const urlValue = norm(urlInput?.value || '');

            const threatType = findMdSelectValueByLabel('Threat Type');
            const threatCategory = findMdSelectValueByLabel('Threat Category');

            return {
              urlValue,
              wanted,
              urlOk: typeof urlOk === 'boolean' ? urlOk : null,
              urlCandidates: typeof urlCandidates === 'number' ? urlCandidates : null,
              submitted: typeof submitted === 'boolean' ? submitted : null,
              threatType: norm(threatType),
              threatCategory: norm(threatCategory),
            };
          });

          const parts = [
            `SB url="${state.urlValue || ''}"`,
            state.wanted ? `want="${state.wanted}"` : null,
            state.urlOk !== null ? `ok=${String(state.urlOk)}` : null,
            state.urlCandidates !== null ? `cand=${String(state.urlCandidates)}` : null,
            state.submitted !== null ? `submitted=${String(state.submitted)}` : null,
            state.threatType ? `type="${state.threatType}"` : null,
            state.threatCategory ? `cat="${state.threatCategory}"` : null,
          ].filter(Boolean);
          screenshotMessage = `Screenshot saved (${parts.join(' ')})`.slice(0, 240);
        } catch {}
      }

      await fs.promises.mkdir('screenshots', { recursive: true });
      const screenshotPath = `screenshots/${Date.now()}-${data.domain.replace(/[^a-z0-9]/gi, '_')}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await onStage?.({ stage: 'screenshot', message: screenshotMessage });

      this.logger.log(
        `Form auto-filled for ${data.domain}. Screenshot saved. User must complete captcha and submit manually.`,
      );
      if (service.reportUrl.includes('safebrowsing.google.com/safebrowsing/report_phish')) {
        let submitted = false;
        try {
          submitted = await page.evaluate(() => (window as any).__sbSubmitted === true);
        } catch {}
        await onStage?.({
          stage: 'waiting_manual',
          message: submitted ? 'Submitted successfully' : 'Waiting for manual captcha + submit',
        });
      } else {
        await onStage?.({
          stage: 'waiting_manual',
          message: 'Waiting for manual captcha + submit',
        });
      }

      return { screenshot: screenshotPath };
    } catch (error) {
      this.logger.error(`Error opening report page: ${error.message}`);
      await onStage?.({ stage: 'error', message: error.message });

      if (page) {
        try {
          await page.close();
        } catch (e) {
          this.logger.error(`Error closing page: ${e.message}`);
        }
      }

      return { error: error.message };
    }
  }

  private async handleSafeBrowsingPhish(
    page: Page,
    domain: string,
    reason: string,
    onStage?: ReportStageCallback,
  ): Promise<void> {
    try {
      await onStage?.({ stage: 'sb_start', message: 'Filling Safe Browsing form fields' });

      await page.waitForSelector('input, textarea, [role="combobox"], select', { timeout: 30000 });

      await onStage?.({ stage: 'sb_set_url', message: 'Setting URL to report' });
      const reportUrl = (() => {
        const d0 = String(domain || '').trim();
        const d = d0.replace(/[`"'“”‘’]/g, '').trim();
        if (!d) return d;
        if (/^https?:\/\//i.test(d)) return d;
        return `https://${d}`;
      })();
      try {
        await page.evaluate((u) => {
          (window as any).__sbWantedUrl = u;
          (window as any).__sbUrlOk = false;
          (window as any).__sbUrlCandidateCount = 0;
        }, reportUrl);
      } catch {}
      let urlOk = false;
      let urlCandidateCount = 0;
      try {
        const urlByContainer = await (async () => {
          try {
            const containers = await page.$x(
              [
                '//*[contains(normalize-space(.), "URL to report")]/ancestor::md-input-container[1]',
                '//*[contains(normalize-space(.), "URL cần báo cáo")]/ancestor::md-input-container[1]',
                '//*[contains(normalize-space(.), "URL to report")]/ancestor::*[contains(@class,"mat-mdc-form-field")][1]',
                '//*[contains(normalize-space(.), "URL cần báo cáo")]/ancestor::*[contains(@class,"mat-mdc-form-field")][1]',
              ].join(' | '),
            );
            for (const c of containers) {
              const input = await c.$('input');
              if (input) return input;
            }
          } catch {}
          return null;
        })();

        const urlInputsByXPath = await page.$x(
          [
            '//input[@formcontrolname="url" or contains(translate(@formcontrolname,"URL","url"), "url")]',
            '//label[contains(normalize-space(.), "URL to report")]/following::input[1]',
            '//label[contains(normalize-space(.), "URL cần báo cáo")]/following::input[1]',
            '//input[contains(translate(@aria-label,"URLTORPE","urltorpe"), "url") or contains(translate(@placeholder,"URLTORPE","urltorpe"), "url")]',
            '//*[contains(normalize-space(.), "URL to report")]/ancestor::md-input-container[1]//input',
            '//*[contains(normalize-space(.), "URL cần báo cáo")]/ancestor::md-input-container[1]//input',
            '//md-input-container[.//*[contains(normalize-space(.), "URL to report")]]//input',
            '//md-input-container[.//*[contains(normalize-space(.), "URL cần báo cáo")]]//input',
          ].join(' | '),
        );
        const urlInputsByCss = await page.$$(
          [
            'input[formcontrolname="url"]',
            'input[formcontrolname*="url" i]',
            'input[matinput][formcontrolname="url"]',
            'input.mat-mdc-input-element[formcontrolname="url"]',
            'input[id^="mat-input-"][formcontrolname="url"]',
            'md-input-container input',
            'input[type="url"]',
            'input[name*="url" i]',
            'input[id*="url" i]',
            'input[aria-label*="url" i]',
            'input[placeholder*="url" i]',
          ].join(','),
        );

        const seen = new Set<any>();
        const candidates = [urlByContainer, ...urlInputsByXPath, ...urlInputsByCss]
          .filter(Boolean)
          .filter((h) => {
            if (seen.has(h)) return false;
            seen.add(h);
            return true;
          });
        urlCandidateCount = candidates.length;

        for (const input of candidates) {
          try {
            const usable = await input.evaluate((el) => {
              const e = el as HTMLInputElement;
              const type = (e.getAttribute('type') || '').toLowerCase();
              if (type && ['hidden', 'checkbox', 'radio', 'button', 'submit'].includes(type))
                return false;
              if ((e as any).disabled) return false;
              if ((e as any).readOnly) return false;
              const rect = e.getBoundingClientRect();
              const visible = rect.width > 5 && rect.height > 5;
              return visible;
            });
            if (!usable) continue;
          } catch {}

          try {
            await input.evaluate((el) => {
              (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
            });
          } catch {}
          try {
            await (input as any).click({ delay: 20 });
          } catch {}
          try {
            await (input as any).click({ clickCount: 3, delay: 20 });
          } catch {}
          try {
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Control');
          } catch {}
          try {
            await (input as any).type(reportUrl, { delay: 10 });
          } catch {}
          try {
            await page.keyboard.type(reportUrl, { delay: 10 });
          } catch {}
          try {
            const ok = await input.evaluate((el, d) => {
              const v = (el as HTMLInputElement).value || '';
              return v.trim() === String(d || '').trim();
            }, reportUrl);
            if (ok) {
              urlOk = true;
              break;
            }
          } catch {}
          try {
            const ok = await input.evaluate((el, d) => {
              const e = el as HTMLInputElement;
              const nativeSetter = Object.getOwnPropertyDescriptor(
                (window as any).HTMLInputElement.prototype,
                'value',
              )?.set;
              if (nativeSetter) nativeSetter.call(e, d);
              else (e as any).value = d;
              e.dispatchEvent(new Event('input', { bubbles: true }));
              e.dispatchEvent(new Event('change', { bubbles: true }));
              const v = e.value || '';
              return v.trim() === String(d || '').trim();
            }, reportUrl);
            if (ok) {
              urlOk = true;
              break;
            }
          } catch {}
        }
      } catch {}
      if (!urlOk) {
        try {
          const retryOk = await page.evaluate((u) => {
            const norm = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
            const containers = Array.from(
              document.querySelectorAll('md-input-container'),
            ) as HTMLElement[];
            const container =
              containers.find((c) => (c.textContent || '').includes('URL to report')) || null;
            if (!container) return false;
            const inputs = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];
            const input = inputs.find((i) => {
              const type = (i.getAttribute('type') || '').toLowerCase();
              if (type && ['hidden', 'checkbox', 'radio', 'button', 'submit'].includes(type))
                return false;
              const rect = i.getBoundingClientRect();
              if (rect.width <= 5 || rect.height <= 5) return false;
              if ((i as any).disabled) return false;
              if ((i as any).readOnly) return false;
              return true;
            });
            if (!input) return false;
            const nativeSetter = Object.getOwnPropertyDescriptor(
              (window as any).HTMLInputElement.prototype,
              'value',
            )?.set;
            if (nativeSetter) nativeSetter.call(input, u);
            else (input as any).value = u;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return norm(input.value) === norm(u);
          }, reportUrl);
          if (retryOk) urlOk = true;
        } catch {}
      }
      try {
        await page.evaluate(
          (ok, c) => {
            (window as any).__sbUrlOk = ok;
            (window as any).__sbUrlCandidateCount = c;
          },
          urlOk,
          urlCandidateCount,
        );
      } catch {}
      await onStage?.({
        stage: 'sb_set_url_result',
        message: urlOk
          ? `URL set (${reportUrl})`
          : `Failed to set URL (candidates=${urlCandidateCount}, url=${reportUrl})`,
      });

      await this.sleep(this.getRandomDelay(300, 700));

      const selectDropdownOption = async (params: {
        fieldLabels: string[];
        optionTexts?: string[];
        fallbackArrowDown?: boolean;
      }) => {
        const opened = await page.evaluate((p) => {
          const norm = (s: string) => (s || '').trim().toLowerCase();
          const labelSet = new Set(p.fieldLabels.map((s) => norm(s)));

          const isVisible = (el: Element) => {
            const e = el as HTMLElement;
            return !!(e && e.offsetParent !== null && e.getClientRects().length > 0);
          };

          const candidates = Array.from(document.querySelectorAll('label,span,div,p')).filter(
            (el) => labelSet.has(norm(el.textContent || '')) && isVisible(el),
          ) as HTMLElement[];

          const clickTargetForLabel = (labelEl: HTMLElement) => {
            const root =
              (labelEl.closest('md-input-container') as HTMLElement) ||
              (labelEl.closest('md-select') as HTMLElement) ||
              (labelEl.closest('.md-input-container') as HTMLElement) ||
              (labelEl.closest('[role="group"]') as HTMLElement) ||
              (labelEl.parentElement as HTMLElement);
            if (!root) return false;

            const inside =
              (root.querySelector(
                '[role="combobox"],[aria-haspopup="listbox"],md-select,.md-select-value,[tabindex="0"]',
              ) as HTMLElement) || null;

            const target = inside || (labelEl.nextElementSibling as HTMLElement) || root;
            if (!target) return false;
            target.scrollIntoView({ block: 'center', inline: 'center' });
            target.click();
            return true;
          };

          for (const labelEl of candidates) {
            if (clickTargetForLabel(labelEl)) return true;
          }

          const boxes = Array.from(
            document.querySelectorAll('[role="combobox"],[aria-haspopup="listbox"],md-select'),
          ) as HTMLElement[];
          const box = boxes[0];
          if (!box) return false;
          box.scrollIntoView({ block: 'center', inline: 'center' });
          box.click();
          return true;
        }, params);

        if (!opened) return false;
        await this.sleep(this.getRandomDelay(250, 450));
        try {
          await page.waitForFunction(
            () =>
              !!document.querySelector('md-option') ||
              !!document.querySelector('[role="option"]') ||
              !!document.querySelector('.md-option'),
            { timeout: 1500 },
          );
        } catch {}

        const desired = (params.optionTexts || [])
          .map((s) => (s || '').trim().toLowerCase())
          .filter(Boolean);

        const optionHandles = await page.$$('md-option, [role="option"], .md-option');
        const getText = async (h: any) => {
          try {
            const t = await page.evaluate((el) => (el.textContent || '').trim(), h);
            return (t || '').trim();
          } catch {
            return '';
          }
        };

        let best: any | undefined;
        if (desired.length > 0) {
          for (const h of optionHandles) {
            const t = (await getText(h)).toLowerCase();
            if (desired.some((d) => t === d || t.includes(d))) {
              best = h;
              break;
            }
          }
        }

        if (!best) {
          for (const h of optionHandles) {
            const t = (await getText(h)).toLowerCase();
            if (t && t !== 'none') {
              best = h;
              break;
            }
          }
        }

        if (best) {
          try {
            await best.evaluate((el: any) => {
              (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
            });
          } catch {}
          try {
            await best.click({ delay: 20 });
            return true;
          } catch {}
          try {
            const box = await best.boundingBox();
            if (box) {
              await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 30 });
              return true;
            }
          } catch {}
        }

        if (params.fallbackArrowDown) {
          try {
            await page.keyboard.press('ArrowDown');
            await this.sleep(this.getRandomDelay(80, 150));
            await page.keyboard.press('Enter');
            return true;
          } catch {}
        }

        return false;
      };

      await onStage?.({
        stage: 'sb_threat_type',
        message: 'Selecting threat type (phishing/social engineering)',
      });
      const threatOk = await selectDropdownOption({
        fieldLabels: ['Threat Type', 'Kiểu mối đe doạ', 'Kiểu mối đe dọa'],
        optionTexts: [
          'Social Engineering',
          'Tấn công phi kỹ thuật',
          'Phishing',
          'Social engineering',
        ],
        fallbackArrowDown: true,
      });
      await onStage?.({
        stage: 'sb_threat_type_result',
        message: threatOk ? 'Threat type selected' : 'Failed to select threat type',
      });

      await this.sleep(this.getRandomDelay(300, 700));

      await onStage?.({ stage: 'sb_threat_category', message: 'Selecting threat category' });
      const categoryOk = await selectDropdownOption({
        fieldLabels: ['Threat Category', 'Danh mục mối đe doạ', 'Danh mục mối đe dọa'],
        optionTexts: ['Other', 'Khác'],
        fallbackArrowDown: true,
      });
      await onStage?.({
        stage: 'sb_threat_category_result',
        message: categoryOk ? 'Threat category selected' : 'Failed to select threat category',
      });

      await this.sleep(this.getRandomDelay(300, 700));

      await onStage?.({ stage: 'sb_details', message: 'Setting additional details' });
      await page.evaluate(
        (txt) => {
          const areas = Array.from(document.querySelectorAll('textarea')) as HTMLTextAreaElement[];
          const area =
            areas.find((a) => {
              const aria = (a.getAttribute('aria-label') || '').toLowerCase();
              const ph = (a.getAttribute('placeholder') || '').toLowerCase();
              return (
                aria.includes('thông tin') ||
                ph.includes('thông tin') ||
                aria.includes('details') ||
                ph.includes('details')
              );
            }) || areas[0];
          if (area) {
            area.focus();
            area.value = txt;
            area.dispatchEvent(new Event('input', { bubbles: true }));
            area.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        (reason || '').slice(0, 800),
      );

      await this.sleep(this.getRandomDelay(300, 700));

      await onStage?.({ stage: 'sb_submit', message: 'Clicking submit (Gửi/Submit)' });
      await page.evaluate(() => {
        const btn = Array.from(
          document.querySelectorAll('button,[role="button"],input[type="submit"]'),
        ).find((e) => {
          const t = ((e as any).value || e.textContent || '').trim().toLowerCase();
          return t === 'gửi' || t.includes('gửi') || t.includes('submit') || t.includes('send');
        }) as HTMLElement | undefined;
        if (btn && (btn as any).disabled !== true && btn.getAttribute('aria-disabled') !== 'true') {
          btn.click();
        }
      });

      await this.sleep(this.getRandomDelay(800, 1500));
      try {
        const submitted = await page.evaluate(() => {
          const t = (document.body?.innerText || '').toLowerCase();
          const ok =
            t.includes('status of submission') ||
            t.includes('submission was successful') ||
            t.includes('submitted successfully');
          (window as any).__sbSubmitted = ok;
          return ok;
        });
        await onStage?.({
          stage: 'sb_submit_result',
          message: submitted ? 'Submission detected' : 'Submission not detected',
        });
      } catch {}
    } catch (e: any) {
      await onStage?.({ stage: 'sb_error', message: e?.message || String(e) });
    }
  }

  private async handleSearchConsoleSpam(
    page: Page,
    domain: string,
    reason: string,
    onStage?: ReportStageCallback,
  ): Promise<void> {
    try {
      let host = domain;
      try {
        host = new URL(domain).hostname || domain;
      } catch {}
      const query = host ? `site:${host}` : domain;
      const details = (reason || '').slice(0, 300);

      await onStage?.({ stage: 'sc_set_url', message: 'Setting Page URL field' });
      await page.evaluate((d) => {
        const urlInput =
          (document.querySelector('input[aria-label="Page URL"]') as HTMLInputElement) ||
          (document.querySelector('input[type="url"]') as HTMLInputElement) ||
          (document.querySelector('input[name="url"]') as HTMLInputElement);
        if (urlInput) {
          urlInput.value = d;
          urlInput.dispatchEvent(new Event('input', { bubbles: true }));
          urlInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, domain);

      await this.sleep(this.getRandomDelay(300, 800));

      const preferred = 'Other';

      const detectStep2 = async () =>
        page.evaluate(() => {
          const t = (document.body?.innerText || '').toLowerCase();
          const hasStepText = t.includes('step 2/2') || t.includes('step 2 of 2');
          const hasExactQuery =
            !!document.querySelector('input[placeholder*="Exact query"]') ||
            !!document.querySelector('input[aria-label*="Exact query"]');
          const hasAnythingElse =
            !!document.querySelector('textarea[placeholder*="anything else"]') ||
            !!document.querySelector('textarea[aria-label*="anything else"]');
          return hasStepText || hasExactQuery || hasAnythingElse;
        });

      const selectReason = async (text: string) => {
        const exactTextNodes = await page.$x(`//*[normalize-space(.)="${text}"]`);
        if (exactTextNodes.length > 0) {
          for (const node of exactTextNodes) {
            const clickable = await node.$x(
              'ancestor::*[@role="radio" or @role="button" or self::label or self::button][1]',
            );
            const target: any = clickable[0] || node;
            try {
              await target.evaluate((el) => {
                (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
              });
            } catch {}
            try {
              await target.click({ delay: 20 });
              return true;
            } catch {}
            try {
              const box = await target.boundingBox();
              if (box) {
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
                  delay: 30,
                });
                return true;
              }
            } catch {}
          }
        }

        const radioClicked = await page.evaluate((t) => {
          const wanted = t.trim().toLowerCase();
          const radios = Array.from(document.querySelectorAll('[role="radio"]')) as HTMLElement[];
          const match = radios.find((r) =>
            (r.innerText || '').trim().toLowerCase().includes(wanted),
          );
          if (match) {
            match.scrollIntoView({ block: 'center', inline: 'center' });
            match.click();
            return true;
          }
          const candidates = Array.from(
            document.querySelectorAll('button,[role="button"],label,div'),
          ) as HTMLElement[];
          const el = candidates.find((e) =>
            (e.innerText || '').trim().toLowerCase().startsWith(wanted),
          );
          if (el) {
            el.scrollIntoView({ block: 'center', inline: 'center' });
            el.click();
            return true;
          }
          return false;
        }, text);
        return radioClicked;
      };

      const clickContinue = async () =>
        page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button,[role="button"],a')).find((e) =>
            (e.textContent || '').trim().toLowerCase().includes('continue'),
          ) as HTMLElement | undefined;
          if (!btn) return { found: false, disabled: false };
          const asBtn = btn as any;
          const disabledAttr = !!asBtn.disabled || btn.getAttribute('aria-disabled') === 'true';
          if (!disabledAttr) btn.click();
          return { found: true, disabled: disabledAttr };
        });

      for (let i = 0; i < 3; i++) {
        const isStep2 = await detectStep2();
        if (isStep2) break;

        await onStage?.({ stage: 'sc_choose_reason', message: `Choosing reason: ${preferred}` });
        const selected = await selectReason(preferred);
        await onStage?.({
          stage: 'sc_reason_click',
          message: selected ? 'Reason clicked' : 'Reason not found/click failed',
        });
        await this.sleep(this.getRandomDelay(300, 700));

        const cont = await clickContinue();
        await onStage?.({
          stage: 'sc_continue',
          message: cont.found
            ? cont.disabled
              ? 'Continue disabled'
              : 'Continue clicked'
            : 'Continue not found',
        });

        if (cont.found && cont.disabled) {
          await onStage?.({ stage: 'sc_reason_fallback', message: 'Trying fallback reason click' });
          await selectReason('Other');
          await this.sleep(this.getRandomDelay(300, 700));
          await clickContinue();
        }
        await this.sleep(this.getRandomDelay(800, 1400));
      }

      if (!(await detectStep2())) {
        await onStage?.({
          stage: 'sc_stuck_step1',
          message: 'Still on Step 1. Reason selection may be required or blocked by UI.',
        });
      }

      await onStage?.({ stage: 'sc_fill_details', message: 'Filling additional details' });
      await page.evaluate(
        (q, d) => {
          const queryInput =
            (document.querySelector('input[placeholder*="Exact query"]') as HTMLInputElement) ||
            (document.querySelector('input[aria-label*="Exact query"]') as HTMLInputElement);
          if (queryInput) {
            queryInput.value = q;
            queryInput.dispatchEvent(new Event('input', { bubbles: true }));
            queryInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          const detailsArea =
            (document.querySelector(
              'textarea[placeholder*="anything else"]',
            ) as HTMLTextAreaElement) ||
            (document.querySelector(
              'textarea[aria-label*="anything else"]',
            ) as HTMLTextAreaElement) ||
            (document.querySelector('textarea') as HTMLTextAreaElement);
          if (detailsArea) {
            detailsArea.value = d;
            detailsArea.dispatchEvent(new Event('input', { bubbles: true }));
            detailsArea.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        query,
        details,
      );

      await this.sleep(this.getRandomDelay(300, 700));

      await onStage?.({ stage: 'sc_next', message: 'Trying Next/Submit' });
      await page.evaluate(() => {
        const clickByTexts = (texts: string[]) => {
          for (const tx of texts) {
            const lower = tx.toLowerCase();
            const el = Array.from(document.querySelectorAll('button,[role="button"],a')).find((e) =>
              (e.textContent || '').trim().toLowerCase().includes(lower),
            ) as HTMLElement | undefined;
            if (el) {
              el.click();
              return true;
            }
          }
          return false;
        };
        clickByTexts(['Next', 'Continue', 'Submit', 'Report', 'Send']);
      });

      await this.sleep(this.getRandomDelay(800, 1500));

      await onStage?.({ stage: 'sc_submit', message: 'Trying explicit Submit' });
      await page.evaluate(() => {
        const btns = Array.from(
          document.querySelectorAll('button,[role="button"]'),
        ) as HTMLElement[];
        const submitBtn = btns.find((b) =>
          (b.textContent || '').trim().toLowerCase().includes('submit'),
        );
        if (
          submitBtn &&
          !(submitBtn as any).disabled &&
          submitBtn.getAttribute('aria-disabled') !== 'true'
        ) {
          submitBtn.click();
        }
      });

      const done = await page.evaluate(() => {
        const t = (document.body?.innerText || '').toLowerCase();
        return t.includes('thank you') || t.includes('submitted') || t.includes('report submitted');
      });
      if (done) {
        await onStage?.({ stage: 'sc_done', message: 'Spam report submitted (detected)' });
      } else {
        await onStage?.({ stage: 'sc_wait', message: 'Awaiting user to finalize submission' });
      }
    } catch (e: any) {
      await onStage?.({ stage: 'sc_error', message: e?.message || String(e) });
    }
  }

  private async handleGoogleDmcaSearch(
    page: Page,
    domain: string,
    reason: string,
    email?: string,
    onStage?: ReportStageCallback,
  ): Promise<void> {
    try {
      await page.waitForSelector('textarea, input, select', { timeout: 30000 });
      await this.sleep(this.getRandomDelay(600, 1200));
      await this.randomScroll(page);

      try {
        const emailGate = await page.evaluate(() => {
          const t = (document.body?.innerText || '').toLowerCase();
          const hasEnterEmail =
            t.includes('enter your email address') ||
            t.includes('email address') ||
            t.includes('ログインして開始してください') ||
            t.includes('またはメールアドレスを入力してください');
          const hasEmailInput = !!document.querySelector('input[type="email"]');
          const hasVerifyButton = Array.from(
            document.querySelectorAll('button,[role="button"]'),
          ).some((b) => (b.textContent || '').trim().toLowerCase() === 'verify');
          return hasEnterEmail && hasEmailInput && hasVerifyButton;
        });

        if (emailGate) {
          await onStage?.({
            stage: 'dmca_email_gate',
            message: 'DMCA email verification step detected',
          });
          const gateEmail = (email || process.env.DMCA_EMAIL || '').trim();
          if (gateEmail) {
            const emailInput = await page.$('input[type="email"]');
            if (emailInput) {
              await emailInput.click({ clickCount: 3, delay: 20 });
              await emailInput.type(gateEmail, { delay: this.getRandomDelay(20, 80) });
            }
            const verifyBtn = await page.$x(
              [
                '//button[normalize-space(.)="Verify"]',
                '//*[@role="button" and normalize-space(.)="Verify"]',
              ].join(' | '),
            );
            if (verifyBtn.length) {
              await (verifyBtn[0] as any).click({ delay: 30 });
            }
          }

          await this.sleep(this.getRandomDelay(800, 1400));
          await page.waitForFunction(
            () =>
              !!document.querySelector('textarea[aria-label*="Enter your description" i]') ||
              !!document.querySelector('input[aria-label*="First name" i]') ||
              !!document.querySelector('[role="button"][aria-label*="Signed on this date" i]'),
            { timeout: 30000 },
          );
        }
      } catch {}

      const normUrl = (() => {
        const d0 = String(domain || '').trim();
        const d = d0.replace(/[`"'“”‘’]/g, '').trim();
        if (!d) return d;
        if (/^https?:\/\//i.test(d)) return d;
        return `https://${d}`;
      })();

      const extractFirstUrl = (text: string): string | undefined => {
        const m = String(text || '').match(/https?:\/\/[^\s)]+/i);
        if (!m) return undefined;
        return m[0];
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

      const findByAriaContains = async (kind: 'input' | 'textarea' | 'select', text: string) => {
        const t = text.toLowerCase();
        const xp = `//${kind}[contains(translate(@aria-label,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"), "${t}")]`;
        try {
          const nodes = await page.$x(xp);
          return nodes[0] || null;
        } catch {
          return null;
        }
      };

      const findInput = async (keys: string[]) => {
        for (const k of keys) {
          const el = await findByAriaContains('input', k);
          if (el) return el;
        }
        return null;
      };

      const findTextarea = async (keys: string[]) => {
        for (const k of keys) {
          const el = await findByAriaContains('textarea', k);
          if (el) return el;
        }
        return null;
      };
      const findTextareaByPlaceholder = async (phrases: string[]) => {
        for (const p of phrases) {
          const t = p.toLowerCase();
          const xp = `//textarea[contains(translate(@placeholder,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"), "${t}")]`;
          try {
            const nodes = await page.$x(xp);
            if (nodes.length) return nodes[0];
          } catch {}
        }
        return null;
      };
      const findTextareaByAriaLabel = async (phrases: string[]) => {
        for (const p of phrases) {
          const t = p.toLowerCase();
          const xp = `//textarea[@aria-label and contains(translate(@aria-label,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"), "${t}")]`;
          try {
            const nodes = await page.$x(xp);
            if (nodes.length) return nodes[0];
          } catch {}
        }
        return null;
      };
      const findTextareaAfterHeading = async (phrases: string[]) => {
        for (const p of phrases) {
          const escaped = p.replace(/"/g, '\\"');
          const xp = [
            `//*[self::h1 or self::h2 or self::h3 or self::label or self::p][contains(normalize-space(.), "${escaped}")]/following::textarea[1]`,
          ].join(' | ');
          try {
            const nodes = await page.$x(xp);
            if (nodes.length) return nodes[0];
          } catch {}
        }
        return null;
      };

      const clickAndType = async (handle: any, value: string) => {
        try {
          await handle.evaluate((el: HTMLElement) =>
            el.scrollIntoView({ block: 'center', inline: 'center' }),
          );
        } catch {}
        try {
          await handle.click({ clickCount: 3, delay: 20 });
        } catch {}
        try {
          await handle.evaluate((el: any) => {
            if (typeof el.value === 'string') el.value = '';
          });
        } catch {}
        try {
          await handle.type(value, { delay: this.getRandomDelay(30, 120) });
        } catch {}
      };

      await onStage?.({ stage: 'dmca_fill', message: 'Filling DMCA form fields' });

      const firstNameEl = await findInput(['first name', 'tên']);
      const lastNameEl = await findInput(['last name', 'họ']);
      const companyEl = await findInput(['company name', 'tên công ty', 'company']);
      const signatureEl = await findInput(['signature', 'chữ ký']);

      if (firstNameEl) await clickAndType(firstNameEl, firstName);
      if (lastNameEl) await clickAndType(lastNameEl, lastName);
      if (companyEl) await clickAndType(companyEl, company);

      const workDescEl =
        (await findTextarea([
          'describe the copyrighted work',
          'xác định và mô tả tác phẩm có bản quyền',
        ])) ||
        (await findTextareaByAriaLabel(['enter your description here'])) ||
        (await findTextareaByPlaceholder(['enter your description here'])) ||
        (await findTextareaAfterHeading(['Identify and describe the copyrighted work']));
      if (workDescEl && workDescription) await clickAndType(workDescEl, workDescription);

      const authorizedEl =
        (await findTextarea([
          'where can we see an authorized example',
          'chúng tôi có thể xem mẫu được cấp phép của tác phẩm ở đâu',
        ])) ||
        (await findTextareaByAriaLabel(['enter your examples here'])) ||
        (await findTextareaByPlaceholder(['enter your examples here'])) ||
        (await findTextareaAfterHeading(['Where can we see an authorized example of the work?']));
      if (authorizedEl && authorizedUrl) await clickAndType(authorizedEl, authorizedUrl);

      const infringingEl =
        (await findTextarea([
          'location of infringing material',
          'vị trí của tài liệu vi phạm',
          'infringing material',
        ])) ||
        (await findTextareaByAriaLabel(['enter your url', 'enter your url(s) here'])) ||
        (await findTextareaByPlaceholder(['enter your url(s) here'])) ||
        (await findTextareaAfterHeading(['Location of infringing material']));
      if (infringingEl && infringingUrls) await clickAndType(infringingEl, infringingUrls);

      try {
        await page.evaluate(
          (desc, auth, infr) => {
            const setByPlaceholder = (contains: string, value: string) => {
              const nodes = Array.from(
                document.querySelectorAll('textarea'),
              ) as HTMLTextAreaElement[];
              const el = nodes.find((n) =>
                (n.getAttribute('placeholder') || '').toLowerCase().includes(contains),
              );
              if (el) {
                el.value = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
              return false;
            };
            setByPlaceholder('enter your description', desc || '');
            setByPlaceholder('enter your examples', auth || '');
            setByPlaceholder('enter your url', infr || '');
          },
          workDescription,
          authorizedUrl,
          infringingUrls,
        );
      } catch {}

      try {
        const dateSelect = (await findByAriaContains('select', 'signed on this date')) as any;
        if (dateSelect) {
          await page.evaluate((sel: HTMLSelectElement) => {
            if (sel.options.length > 1 && sel.selectedIndex === 0) {
              sel.selectedIndex = 1;
              sel.dispatchEvent(new Event('input', { bubbles: true }));
              sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, dateSelect);
        }
      } catch {}

      try {
        await page.evaluate(() => {
          const isDisabled = (el: HTMLElement) =>
            el.getAttribute('aria-disabled') === 'true' || (el as any).disabled === true;

          const clickIfNeeded = (el: HTMLElement) => {
            const aria = (el.getAttribute('aria-checked') || '').toLowerCase();
            if (!isDisabled(el) && aria !== 'true') el.click();
          };

          const roleCheckboxes = Array.from(
            document.querySelectorAll('[role="checkbox"]'),
          ) as HTMLElement[];
          for (const b of roleCheckboxes) clickIfNeeded(b);

          const inputs = Array.from(
            document.querySelectorAll('input[type="checkbox"], input[type="radio"]'),
          ) as HTMLInputElement[];
          for (const i of inputs) {
            if (i.disabled) continue;
            if (i.type === 'checkbox' && i.checked) continue;
            if (i.type === 'radio' && i.checked) continue;
            const label = (i.closest('label') as HTMLElement | null) || null;
            if (label) {
              label.click();
              continue;
            }
            (i as any).click?.();
          }

          const roleRadios = Array.from(
            document.querySelectorAll('[role="radio"]'),
          ) as HTMLElement[];
          for (const r of roleRadios) {
            const aria = (r.getAttribute('aria-checked') || '').toLowerCase();
            if (!isDisabled(r) && aria !== 'true') {
              const t = (r.innerText || r.textContent || '').trim().toLowerCase();
              if (t.includes('myself') || t.includes('bản thân tôi')) {
                r.click();
              }
            }
          }

          const ripples = Array.from(document.querySelectorAll('material-ripple')) as HTMLElement[];
          for (const ripple of ripples) {
            let cur: HTMLElement | null = ripple.parentElement;
            for (let depth = 0; depth < 8 && cur; depth++) {
              const role = (cur.getAttribute('role') || '').toLowerCase();
              if (role === 'checkbox' || role === 'radio') {
                clickIfNeeded(cur);
                break;
              }
              if (
                role === 'button' ||
                cur.tagName === 'BUTTON' ||
                cur.getAttribute('tabindex') !== null ||
                cur.getAttribute('aria-label')
              ) {
                if (!isDisabled(cur)) {
                  cur.click();
                }
                break;
              }
              cur = cur.parentElement;
            }
          }
        });
      } catch {}

      try {
        await page.evaluate(() => {
          const radios = Array.from(document.querySelectorAll('[role="radio"]')) as HTMLElement[];
          const text = (el: HTMLElement) =>
            (el.innerText || el.textContent || '').trim().toLowerCase();
          const wanted = ['bản thân tôi', 'myself'];
          let target: HTMLElement | null = null;
          for (const r of radios) {
            const t = text(r);
            if (wanted.some((w) => t.includes(w))) {
              target = r;
              break;
            }
          }
          if (!target && radios.length) target = radios[0];
          if (target && target.getAttribute('aria-checked') !== 'true') {
            target.click();
          }
        });
      } catch {}

      try {
        const openDate = await page.$x(
          [
            '//*[@role="button" and contains(translate(@aria-label,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"), "signed on this date")]',
            '//*[@role="button" and contains(normalize-space(.), "Select a date")]',
          ].join(' | '),
        );
        if (openDate.length) {
          await (openDate[0] as any).click();
          await this.sleep(this.getRandomDelay(500, 900));
          const day = new Date().getDate();
          const dateText = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          await page.evaluate((d) => {
            const within = (root: ParentNode) => {
              const items = Array.from(
                root.querySelectorAll('button,[role="option"],[role="gridcell"]'),
              ) as HTMLElement[];
              for (const it of items) {
                const t = (it.innerText || it.textContent || '').trim();
                const aria = (it.getAttribute('aria-label') || '').toLowerCase();
                const disabled =
                  (it as any).disabled === true || it.getAttribute('aria-disabled') === 'true';
                if (
                  !disabled &&
                  (t === String(d) || aria.includes(` ${d},`) || aria.endsWith(` ${d}`))
                ) {
                  it.click();
                  return true;
                }
              }
              return false;
            };
            const dlg = document.querySelector('[role="dialog"]') || document.body;
            if (!within(dlg)) {
              within(document.body);
            }
          }, day);

          await this.sleep(this.getRandomDelay(300, 600));
          await page.evaluate((value) => {
            const dlg =
              (document.querySelector('[role="dialog"]') as HTMLElement | null) || document.body;
            const label = Array.from(dlg.querySelectorAll('span,label,div')).find(
              (el) => (el.textContent || '').trim().toLowerCase() === 'date',
            ) as HTMLElement | undefined;
            const input =
              (label
                ? (label.closest('label')?.querySelector('input') as HTMLInputElement | null) ||
                  (label.parentElement?.querySelector('input') as HTMLInputElement | null)
                : null) ||
              (dlg.querySelector(
                'input[type="text"][aria-required="true"]',
              ) as HTMLInputElement | null) ||
              (dlg.querySelector('input[type="text"]') as HTMLInputElement | null);

            if (input) {
              input.focus();
              input.value = value;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(
                new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
              );
              input.dispatchEvent(
                new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter' }),
              );
            }

            const buttons = Array.from(
              dlg.querySelectorAll('button,[role="button"]'),
            ) as HTMLElement[];
            const ok = buttons.find((b) => {
              const t = (b.textContent || '').trim().toLowerCase();
              return t === 'ok' || t.includes('done') || t.includes('apply') || t.includes('save');
            });
            ok?.click();
          }, dateText);
        }
      } catch {}

      const signatureValue = await page.evaluate(() => {
        const pick = (needle: string) => {
          const n = needle.toLowerCase();
          const nodes = Array.from(
            document.querySelectorAll('input[aria-label]'),
          ) as HTMLInputElement[];
          return nodes.find((i) =>
            ((i.getAttribute('aria-label') || '') as string).toLowerCase().includes(n),
          );
        };
        const fn = pick('first name') || pick('tên');
        const ln = pick('last name') || pick('họ');
        const a = (fn?.value || '').trim();
        const b = (ln?.value || '').trim();
        return [a, b].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      });

      if (signatureEl)
        await clickAndType(signatureEl, signatureValue || `${firstName} ${lastName}`);

      try {
        await page.evaluate(() => {
          const boxes = Array.from(
            document.querySelectorAll('input[type="checkbox"]'),
          ) as HTMLInputElement[];
          for (const b of boxes) {
            if (!b.checked) {
              b.click();
            }
          }
        });
      } catch {}

      await this.sleep(this.getRandomDelay(500, 1200));
      await this.randomScroll(page);
      await onStage?.({
        stage: 'dmca_ready',
        message: 'DMCA form filled; waiting for captcha + submit',
      });
    } catch (e: any) {
      await onStage?.({ stage: 'dmca_error', message: e?.message || String(e) });
    }
  }

  private async handleCloudflareRegistrarWhois(
    page: Page,
    domain: string,
    reason: string,
    email?: string,
    onStage?: ReportStageCallback,
  ): Promise<void> {
    try {
      await onStage?.({ stage: 'cfw_start', message: 'Navigating to WHOIS form' });
      try {
        await page.goto('https://abuse.cloudflare.com/registrar_whois', {
          waitUntil: 'networkidle2',
          timeout: this.configService.get('PUPPETEER_TIMEOUT', 60000),
        } as any);
      } catch {}
      await onStage?.({ stage: 'cfw_form', message: 'Filling Cloudflare WHOIS fields' });
      await page.waitForSelector('input, textarea', { timeout: 30000 });
      await this.sleep(this.getRandomDelay(600, 1200));
      await this.randomScroll(page);

      const seed = Math.floor(Math.random() * 9000) + 1000;
      const nameValue =
        (process.env.CF_NAME || '').trim() ||
        `${(process.env.DMCA_FIRST_NAME || 'Demo').trim()} ${(process.env.DMCA_LAST_NAME || String(seed)).trim()}`.trim();
      const titleValue = (process.env.CF_TITLE || '').trim();
      const companyValue = (process.env.CF_COMPANY || '').trim();
      const teleValue = (process.env.CF_TELE || '').trim();

      let host = String(domain || '').trim();
      try {
        host = new URL(domain).hostname || domain;
      } catch {}
      const urlsValue = host ? host : domain;
      const commentsValue = (reason || '').slice(0, 1000);

      const typeSel = async (selector: string, value: string) => {
        const el = await page.$(selector);
        if (el) {
          await el.click({ clickCount: 3, delay: 20 });
          await el.type(value, { delay: this.getRandomDelay(20, 80) });
        }
      };

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
        await urlsEl.click({ clickCount: 3, delay: 20 });
        await urlsEl.type(urlsValue, { delay: this.getRandomDelay(20, 80) });
      }
      const cmtEl = await page.$('textarea[name="comments"]');
      if (cmtEl) {
        await cmtEl.click({ clickCount: 3, delay: 20 });
        await cmtEl.type(commentsValue, { delay: this.getRandomDelay(20, 80) });
      }

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
          const first = findByText('please forward my report to the website owner');
          ensureChecked(first || null);
          const second = findByText('include my name and contact information');
          ensureChecked(second || null);
        });
      } catch {}

      await onStage?.({
        stage: 'cfw_ready',
        message: 'Cloudflare WHOIS filled; waiting for manual submit',
      });
    } catch (e: any) {
      await onStage?.({ stage: 'cfw_error', message: e?.message || String(e) });
    }
  }

  private async handleRadixAbuse(
    page: Page,
    domain: string,
    reason: string,
    email?: string,
    onStage?: ReportStageCallback,
  ): Promise<void> {
    try {
      await onStage?.({ stage: 'radix_start', message: 'Filling Radix report (phase 1)' });
      await page.waitForSelector('#search', { timeout: 30000 });
      await this.sleep(this.getRandomDelay(400, 900));

      let host = String(domain || '').trim();
      host = host.replace(/[`"'“”‘’]/g, '').trim();
      try {
        host = new URL(host).hostname || host;
      } catch {}

      const searchEl = await page.$('#search');
      if (searchEl) {
        await searchEl.click({ clickCount: 3, delay: 20 });
        await searchEl.type(host, { delay: this.getRandomDelay(20, 80) });
      }

      try {
        const submitButtons = await page.$x(
          [
            '//button[@type="submit" and .//p[normalize-space(.)="Submit"]]',
            '//button[@type="submit" and normalize-space(.)="Submit"]',
          ].join(' | '),
        );
        if (submitButtons.length) {
          await (submitButtons[0] as any).click({ delay: 30 });
        } else {
          await page.keyboard.press('Enter');
        }
      } catch {
        try {
          await page.keyboard.press('Enter');
        } catch {}
      }

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

      await this.sleep(this.getRandomDelay(400, 900));
      await onStage?.({ stage: 'radix_phase2', message: 'Selecting Other → Report As Other' });

      try {
        await page.evaluate(() => {
          const btn = document.querySelector(
            'button.accordion-button[data-bs-target="#report-other"]',
          ) as HTMLElement | null;
          if (btn) {
            btn.scrollIntoView({ block: 'center', inline: 'center' });
            btn.click();
          }
        });
      } catch {}

      await this.sleep(this.getRandomDelay(300, 700));

      try {
        const reportOtherBtn = await page.$x(
          [
            '//*[@id="report-other"]//button[normalize-space(.)="Report As Other"]',
            '//button[normalize-space(.)="Report As Other"]',
          ].join(' | '),
        );
        if (reportOtherBtn.length) {
          await (reportOtherBtn[0] as any).click({ delay: 30 });
        }
      } catch {}

      await onStage?.({ stage: 'radix_fill', message: 'Filling Radix report details' });
      await page.waitForSelector('input, textarea, button', { timeout: 30000 });
      await this.sleep(this.getRandomDelay(400, 900));

      const seed = Math.floor(Math.random() * 9000) + 1000;
      const nameValue =
        (process.env.RADIX_NAME || '').trim() ||
        (process.env.CF_NAME || '').trim() ||
        `${(process.env.DMCA_FIRST_NAME || 'Demo').trim()} ${(process.env.DMCA_LAST_NAME || String(seed)).trim()}`.trim();

      const fillTextInput = async (selectors: string[], value: string) => {
        for (const sel of selectors) {
          const el = await page.$(sel);
          if (el) {
            await el.click({ clickCount: 3, delay: 20 });
            await el.type(value, { delay: this.getRandomDelay(20, 80) });
            return true;
          }
        }
        return false;
      };

      await fillTextInput(
        [
          '#name',
          'input[name="name"]',
          'input[placeholder*="name" i]',
          'input[aria-label*="name" i]',
        ],
        nameValue,
      );
      if (email) {
        await fillTextInput(['#email', 'input[type="email"]'], email);
      }

      const messageValue = (reason || '').slice(0, 1500);
      if (messageValue) {
        await fillTextInput(
          ['#message', 'textarea#message', 'textarea[name="message"]'],
          messageValue,
        );
      }

      try {
        const check = await page.$('#checkFormData');
        if (check) await (check as any).click({ delay: 20 });
      } catch {}

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
      } catch {}

      try {
        const submit2 = await page.$x(
          [
            '//button[@type="submit" and .//p[normalize-space(.)="Submit"] and not(@disabled)]',
            '//button[@type="submit" and normalize-space(.)="Submit" and not(@disabled)]',
          ].join(' | '),
        );
        if (submit2.length) {
          await (submit2[0] as any).click({ delay: 30 });
        }
      } catch {}

      await this.sleep(this.getRandomDelay(800, 1500));
      const done = await page.evaluate(() => {
        const t = (document.body?.innerText || '').toLowerCase();
        return t.includes('thank you') || t.includes('submitted') || t.includes('we have received');
      });
      await onStage?.({
        stage: done ? 'radix_done' : 'radix_ready',
        message: done
          ? 'Radix report submitted (detected)'
          : 'Radix filled; verify and submit if needed',
      });
    } catch (e: any) {
      await onStage?.({ stage: 'radix_error', message: e?.message || String(e) });
    }
  }

  private async handleGoogleSearchReport(
    page: Page,
    domain: string,
    reason: string,
    onStage?: ReportStageCallback,
  ): Promise<void> {
    try {
      await onStage?.({ stage: 'gg_search_start', message: 'Starting Google Search report flow' });

      let searchUrl = String(domain || '').trim();
      searchUrl = searchUrl.replace(/[`"'""'']/g, '').trim();
      if (!/^https?:\/\//i.test(searchUrl)) {
        searchUrl = `https://${searchUrl}`;
      }

      let targetDomain = '';
      try {
        const url = new URL(searchUrl);
        targetDomain = url.hostname.toLowerCase();
      } catch {
        targetDomain = searchUrl.toLowerCase();
      }

      await onStage?.({
        stage: 'gg_search_input',
        message: `Searching for: ${searchUrl}`,
      });

      await this.sleep(this.getRandomDelay(1000, 2000));

      const searchInputSelectors = [
        'textarea#APjFqb',
        'textarea.gLFyf',
        'input[name="q"]',
        'textarea[name="q"]',
        'input[title="Tìm kiếm"]',
        'textarea[title="Tìm kiếm"]',
        'input[aria-label="Tìm kiếm"]',
        'textarea[aria-label="Tìm kiếm"]',
      ];

      let searchInputFound = false;
      for (const selector of searchInputSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000, visible: true });
          const element = await page.$(selector);
          if (!element) continue;

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

          await onStage?.({
            stage: 'gg_search_fill',
            message: `Found search input: ${selector}`,
          });

          try {
            await element.evaluate((el) => {
              (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
            });
          } catch {}

          await this.sleep(this.getRandomDelay(300, 600));

          await element.click({ clickCount: 1, delay: 20 });
          await this.sleep(this.getRandomDelay(200, 400));

          try {
            await element.click({ clickCount: 3, delay: 20 });
          } catch {}

          await this.sleep(this.getRandomDelay(200, 400));

          try {
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Control');
          } catch {}
          try {
            await page.keyboard.press('Backspace');
          } catch {}
          await page.keyboard.type(searchUrl, { delay: 75 });

          await onStage?.({
            stage: 'gg_search_typed',
            message: `Query typed via keyboard: ${searchUrl}`,
          });
          searchInputFound = true;

          await this.sleep(this.getRandomDelay(500, 800));
          break;
        } catch (e) {
          continue;
        }
      }

      if (!searchInputFound) {
        throw new Error('Search input not found with any selector');
      }

      try {
        const submitButton = await page.$('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await onStage?.({
            stage: 'gg_search_submit',
            message: 'Search submitted via button click',
          });
        } else {
          await page.keyboard.press('Enter');
          await onStage?.({
            stage: 'gg_search_submit',
            message: 'Search submitted via Enter key',
          });
        }
      } catch {
        await page.keyboard.press('Enter');
        await onStage?.({ stage: 'gg_search_submit', message: 'Search submitted via Enter key' });
      }

      await onStage?.({ stage: 'gg_search_wait', message: 'Waiting for search results' });

      await page.waitForFunction(
        () => {
          const selectors = ['div.g', '#rso > div', 'div[data-ved]'];
          for (const sel of selectors) {
            const results = document.querySelectorAll(sel);
            const withCite = Array.from(results).filter((el) => el.querySelector('cite'));
            if (withCite.length > 3) {
              return true;
            }
          }
          return false;
        },
        { timeout: 60000 },
      );

      await this.sleep(this.getRandomDelay(1000, 2000));
      await onStage?.({ stage: 'gg_search_results', message: 'Scanning search results' });

      const unwrapGoogleUrl = (url: string): string => {
        try {
          if (url.includes('google.com/url?q=')) {
            const parsed = new URL(url);
            const qParam = parsed.searchParams.get('q');
            return qParam || url;
          }
        } catch {}
        return url;
      };

      const extractDomain = (url: string): string => {
        try {
          const unwrapped = unwrapGoogleUrl(url);
          const parsed = new URL(unwrapped);
          return String(parsed.hostname || '').toLowerCase();
        } catch {
          return '';
        }
      };

      const isDomainMatch = (resultDomain: string, target: string): boolean => {
        if (!resultDomain || !target) return false;
        if (resultDomain === target) return true;
        if (resultDomain.endsWith(`.${target}`)) return true;
        return false;
      };

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

      let matchedResult: { found: boolean; index: number; domain: string } = {
        found: false,
        index: -1,
        domain: '',
      };
      for (let i = 0; i < resultHandles.length; i++) {
        const result = resultHandles[i];
        let resultDomain = '';
        try {
          const citeText = await result.$eval('cite', (el: any) =>
            String(el.textContent || '').trim(),
          );
          if (citeText) resultDomain = extractDomain(citeText);
        } catch {}
        if (!resultDomain) {
          try {
            const href = await result.$eval('a[href]', (el: any) =>
              String(el.getAttribute('href') || ''),
            );
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
          message: `NOT_FOUND_ON_GOOGLE: No result found for domain ${targetDomain}`,
        });
        return;
      }

      await onStage?.({
        stage: 'gg_found',
        message: `Found matching result at index ${matchedResult.index}: ${matchedResult.domain}`,
      });

      const captchaDetected = await page.evaluate(() => {
        const text = (document.body?.innerText || '').toLowerCase();
        const iframes = document.querySelectorAll(
          'iframe[src*="recaptcha"], iframe[src*="captcha"]',
        );
        return text.includes('verify you are human') || iframes.length > 0;
      });

      if (captchaDetected) {
        await onStage?.({
          stage: 'gg_captcha',
          message: 'NEED_VERIFY: CAPTCHA detected, cannot proceed',
        });
        return;
      }

      await onStage?.({ stage: 'gg_open_menu', message: 'Opening result menu (3 dots)' });

      let menuOpened = false;
      try {
        const result = resultHandles[matchedResult.index];
        if (result) {
          const menuSelectors = [
            '[aria-label*="More options" i]',
            '[aria-label*="About this result" i]',
            '[aria-label*="more" i]',
            '[aria-label*="tùy chọn" i]',
            '[aria-label*="tuỳ chọn" i]',
          ];
          for (const sel of menuSelectors) {
            const btn = await result.$(sel);
            if (!btn) continue;
            const box = await btn.boundingBox();
            if (!box) continue;
            await btn.click({ delay: 30 });
            menuOpened = true;
            break;
          }

          if (!menuOpened) {
            const fallbackBtn = await result.$('button, [role="button"]');
            if (fallbackBtn) {
              const box = await fallbackBtn.boundingBox();
              if (box) {
                await fallbackBtn.click({ delay: 30 });
                menuOpened = true;
              }
            }
          }
        }
      } catch {}

      if (!menuOpened) {
        await onStage?.({
          stage: 'gg_menu_failed',
          message: 'Could not find or click menu button',
        });
      }

      await this.sleep(this.getRandomDelay(800, 1500));

      await onStage?.({ stage: 'gg_find_feedback', message: 'Looking for Feedback button' });

      const clickFirstXPath = async (xpaths: string[]) => {
        for (const xp of xpaths) {
          let handles: any[] = [];
          try {
            handles = await page.$x(xp);
          } catch {
            handles = [];
          }
          for (const h of handles) {
            try {
              const box = await h.boundingBox();
              if (!box) continue;
              await h.click({ delay: 30 });
              return true;
            } catch {}
          }
        }
        return false;
      };

      const feedbackClicked = await clickFirstXPath([
        '//*[self::a or self::button or @role="menuitem" or @role="button"][contains(., "Phản hồi")]',
        '//*[self::a or self::button or @role="menuitem" or @role="button"][contains(., "Feedback")]',
        '//*[self::a or self::button or @role="menuitem" or @role="button"][contains(., "Report")]',
        '//*[self::a or self::button or @role="menuitem" or @role="button"][contains(., "Báo cáo")]',
      ]);

      if (!feedbackClicked) {
        await onStage?.({
          stage: 'gg_feedback_not_found',
          message: 'Feedback button not found in menu',
        });
        return;
      }

      await this.sleep(this.getRandomDelay(1000, 2000));
      await onStage?.({ stage: 'gg_feedback_modal', message: 'Feedback modal opened' });

      await page.waitForSelector('[role="dialog"], [aria-modal="true"]', { timeout: 10000 });

      await onStage?.({
        stage: 'gg_select_reason',
        message: 'Selecting "Other reason" / "Lý do khác"',
      });

      await clickFirstXPath([
        '//*[self::label or self::button or @role="radio" or @role="button"][contains(., "Lý do khác")]',
        '//*[self::label or self::button or @role="radio" or @role="button"][contains(., "Other")]',
        '//*[self::label or self::button or @role="radio" or @role="button"][contains(., "Khác")]',
      ]);

      await this.sleep(this.getRandomDelay(500, 1000));

      await onStage?.({
        stage: 'gg_select_category',
        message: 'Selecting category (e.g. "Nội dung rác")',
      });

      await clickFirstXPath([
        '//*[self::label or self::button or @role="radio" or @role="option" or @role="button"][contains(., "Nội dung rác")]',
        '//*[self::label or self::button or @role="radio" or @role="option" or @role="button"][contains(., "Spam")]',
        '//*[self::label or self::button or @role="radio" or @role="option" or @role="button"][contains(., "spam")]',
        '//*[self::label or self::button or @role="radio" or @role="option" or @role="button"][contains(., "Không phù hợp")]',
        '//*[self::label or self::button or @role="radio" or @role="option" or @role="button"][contains(., "Inappropriate")]',
      ]);

      await this.sleep(this.getRandomDelay(500, 1000));

      await onStage?.({ stage: 'gg_fill_details', message: 'Filling feedback textarea' });

      let textareaFilled = false;
      try {
        const dialog = (await page.$('[role="dialog"], [aria-modal="true"]')) || null;
        const textarea =
          (dialog ? await dialog.$('textarea') : null) || (await page.$('textarea')) || null;
        if (textarea) {
          const box = await textarea.boundingBox();
          if (box) {
            await textarea.click({ delay: 30 });
            await this.sleep(this.getRandomDelay(300, 800));
            try {
              await page.keyboard.down('Control');
              await page.keyboard.press('KeyA');
              await page.keyboard.up('Control');
            } catch {}
            try {
              await page.keyboard.press('Backspace');
            } catch {}
            await page.keyboard.type(String(reason || '').slice(0, 500), { delay: 50 });
            textareaFilled = true;
          }
        }
      } catch {}

      await onStage?.({
        stage: 'gg_textarea_filled',
        message: textareaFilled ? 'Textarea filled with reason' : 'Textarea not found',
      });

      await this.sleep(this.getRandomDelay(500, 1000));

      await onStage?.({ stage: 'gg_submit', message: 'Clicking Submit / Gửi' });

      const submitClicked = await clickFirstXPath([
        '//*[self::button or @role="button"][contains(., "Gửi")]',
        '//*[self::button or @role="button"][contains(., "Submit")]',
        '//*[self::button or @role="button"][contains(., "Send")]',
      ]);

      if (!submitClicked) {
        await onStage?.({
          stage: 'gg_submit_not_found',
          message: 'Submit button not found or disabled',
        });
        return;
      }

      await this.sleep(this.getRandomDelay(1500, 2500));

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
        message: submitted ? 'Successfully submitted feedback' : 'Submission status unclear',
      });
    } catch (e: any) {
      await onStage?.({ stage: 'gg_error', message: e?.message || String(e) });
    }
  }

  async closeBrowser(profilePath: string, proxy?: Proxy): Promise<void> {
    const proxyKey = proxy ? `${proxy.type}:${proxy.host}:${proxy.port}` : 'direct';
    const key = `${profilePath}::${proxyKey}`;
    const browser = this.browsers.get(key);

    if (browser) {
      await browser.close();
      this.browsers.delete(key);
      this.logger.log(`Browser closed for key: ${key}`);
    }
  }

  async closeAllBrowsers(): Promise<void> {
    for (const [key, browser] of this.browsers.entries()) {
      if (browser.connected) {
        await browser.close();
        this.logger.log(`Browser closed: ${key}`);
      }
    }
    this.browsers.clear();
  }

  async onModuleDestroy() {
    await this.closeAllBrowsers();
  }
}
