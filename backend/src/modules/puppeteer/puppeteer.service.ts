import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser, Page } from 'puppeteer';
import { ReportServicesService } from '../report-services/report-services.service';

export interface ReportPageData {
  domain: string;
  reason: string;
  email?: string;
  serviceId: string;
}

@Injectable()
export class PuppeteerService {
  private readonly logger = new Logger(PuppeteerService.name);
  private browser: Browser;

  constructor(
    private configService: ConfigService,
    private reportServicesService: ReportServicesService,
  ) {}

  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      const headless = this.configService.get('PUPPETEER_HEADLESS', 'false') === 'true';
      this.browser = await puppeteer.launch({
        headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--start-maximized',
        ],
        defaultViewport: null,
      });
      this.logger.log('Browser launched');
    }
    return this.browser;
  }

  async openReportPage(data: ReportPageData): Promise<void> {
    const browser = await this.getBrowser();
    const services = await this.reportServicesService.findAll();
    const service = services.find((s) => s._id.toString() === data.serviceId);

    if (!service) {
      throw new Error('Report service not found');
    }

    this.logger.log(`Opening ${service.name} report page for ${data.domain}`);

    const page: Page = await browser.newPage();

    await page.goto(service.reportUrl, {
      waitUntil: 'networkidle2',
      timeout: this.configService.get('PUPPETEER_TIMEOUT', 60000),
    });

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
        ];

        const reasonSelectors = [
          'textarea[name="description"]',
          'textarea[name="reason"]',
          'textarea[name="details"]',
          'textarea[name="comments"]',
          'textarea[name="message"]',
          '#description',
          '#reason',
          '#details',
        ];

        const emailSelectors = ['input[name="email"]', 'input[type="email"]', '#email'];

        fillInput(domainSelectors, domain);
        fillInput(reasonSelectors, reason);
        if (email) {
          fillInput(emailSelectors, email);
        }

        console.log('Form fields auto-filled by Puppeteer');
      },
      data.domain,
      data.reason,
      data.email,
    );

    this.logger.log(
      `Form auto-filled for ${data.domain}. User must complete captcha and submit manually.`,
    );
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Browser closed');
    }
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }
}
