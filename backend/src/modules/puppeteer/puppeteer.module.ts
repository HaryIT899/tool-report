import { Module } from '@nestjs/common';
import { PuppeteerService } from './puppeteer.service';
import { PuppeteerAdvancedService } from './puppeteer-advanced.service';
import { PuppeteerSimpleService } from './puppeteer-simple.service';
import { ReportServicesModule } from '../report-services/report-services.module';

@Module({
  imports: [ReportServicesModule],
  providers: [PuppeteerService, PuppeteerAdvancedService, PuppeteerSimpleService],
  exports: [PuppeteerService, PuppeteerAdvancedService, PuppeteerSimpleService],
})
export class PuppeteerModule {}
