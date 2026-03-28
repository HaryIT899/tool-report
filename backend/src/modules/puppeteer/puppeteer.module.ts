import { Module } from '@nestjs/common';
import { PuppeteerService } from './puppeteer.service';
import { PuppeteerAdvancedService } from './puppeteer-advanced.service';
import { ReportServicesModule } from '../report-services/report-services.module';

@Module({
  imports: [ReportServicesModule],
  providers: [PuppeteerService, PuppeteerAdvancedService],
  exports: [PuppeteerService, PuppeteerAdvancedService],
})
export class PuppeteerModule {}
