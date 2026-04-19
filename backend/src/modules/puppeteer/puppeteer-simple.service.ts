import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer-extra';
import StealthPlugin = require('puppeteer-extra-plugin-stealth');
import { Browser } from 'puppeteer';
import { Proxy } from '../proxies/schemas/proxy.schema';

puppeteer.use(StealthPlugin());

export interface OpenPageOptions {
  profilePath: string;
  reportUrl: string;
  payload: any;
  proxy?: Proxy;
}

export type SimpleStageCallback = (event: {
  stage: string;
  message?: string;
}) => void | Promise<void>;

/**
 * PuppeteerSimpleService
 *
 * Orchestrator-only service: Opens Chrome with correct profile + URL with #dar=payload
 * Does NOT fill forms - extension handles all filling logic
 */
@Injectable()
export class PuppeteerSimpleService {
  private readonly logger = new Logger(PuppeteerSimpleService.name);
  private browsers: Map<string, Browser> = new Map();

  constructor(private configService: ConfigService) {}

  private encodePayload(payload: any): string {
    const json = JSON.stringify(payload);
    const utf8 = new TextEncoder().encode(json);
    const base64 = Buffer.from(utf8).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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

  async openPageWithPayload(
    options: OpenPageOptions,
    onStage?: SimpleStageCallback,
  ): Promise<{ success: boolean; error?: string; tabUrl?: string }> {
    try {
      await onStage?.({ stage: 'get_browser', message: 'Getting browser instance' });
      const browser = await this.getBrowser(options.profilePath, options.proxy);

      await onStage?.({ stage: 'encode_payload', message: 'Encoding payload' });
      const encoded = this.encodePayload(options.payload);
      const finalUrl = `${options.reportUrl}#dar=${encoded}`;

      this.logger.log(`Opening URL: ${finalUrl.substring(0, 100)}...`);
      await onStage?.({ stage: 'open_page', message: `Opening ${options.reportUrl}` });

      const page = await browser.newPage();

      if (options.proxy?.username && options.proxy?.password) {
        await onStage?.({ stage: 'proxy_auth', message: 'Authenticating proxy' });
        await page.authenticate({
          username: options.proxy.username,
          password: options.proxy.password,
        });
      }

      await onStage?.({ stage: 'stealth_patch', message: 'Applying stealth settings' });
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

      await onStage?.({ stage: 'navigate', message: `Navigating to report page` });
      await page.goto(finalUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.configService.get('PUPPETEER_TIMEOUT', 60000),
      });

      await onStage?.({
        stage: 'page_loaded',
        message: 'Page loaded. Extension will handle auto-fill.',
      });

      this.logger.log(
        `Page opened successfully. Extension should detect payload and auto-fill the form.`,
      );

      // Keep page open - extension will handle everything
      return {
        success: true,
        tabUrl: finalUrl.substring(0, 200),
      };
    } catch (error) {
      this.logger.error(`Error opening page: ${error.message}`);
      await onStage?.({ stage: 'error', message: error.message });
      return {
        success: false,
        error: error.message,
      };
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
