import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { REPORT_QUEUE } from './report.queue';
import { ReportProcessor } from './report.processor';
import { ReportLogsModule } from '../report-logs/report-logs.module';
import { PuppeteerModule } from '../puppeteer/puppeteer.module';
import { ProxiesModule } from '../proxies/proxies.module';
import { DomainsModule } from '../domains/domains.module';
import { ReportServicesModule } from '../report-services/report-services.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: REPORT_QUEUE,
    }),
    ReportLogsModule,
    PuppeteerModule,
    ProxiesModule,
    DomainsModule,
    ReportServicesModule,
    AccountsModule,
  ],
  providers: [ReportProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
