import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DomainsModule } from '../domains/domains.module';
import { ReportServicesModule } from '../report-services/report-services.module';
import { AccountsModule } from '../accounts/accounts.module';
import { QueuesModule } from '../queues/queues.module';
import { ReportLogsModule } from '../report-logs/report-logs.module';
import { PuppeteerModule } from '../puppeteer/puppeteer.module';
import { ProxiesModule } from '../proxies/proxies.module';

@Module({
  imports: [
    QueuesModule,
    DomainsModule,
    ReportServicesModule,
    AccountsModule,
    ReportLogsModule,
    PuppeteerModule,
    ProxiesModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
