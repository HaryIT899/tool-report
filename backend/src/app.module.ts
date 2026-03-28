import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DomainsModule } from './modules/domains/domains.module';
import { ReportServicesModule } from './modules/report-services/report-services.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ReportLogsModule } from './modules/report-logs/report-logs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { WhoisModule } from './modules/whois/whois.module';
import { QueuesModule } from './modules/queues/queues.module';
import { PuppeteerModule } from './modules/puppeteer/puppeteer.module';
import { ProxiesModule } from './modules/proxies/proxies.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    QueuesModule,
    AuthModule,
    UsersModule,
    DomainsModule,
    ReportServicesModule,
    AccountsModule,
    ReportLogsModule,
    ReportsModule,
    TemplatesModule,
    WhoisModule,
    PuppeteerModule,
    ProxiesModule,
  ],
})
export class AppModule {}
