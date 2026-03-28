import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { Account, AccountSchema } from './schemas/account.schema';
import { ProfileManagerService } from './profile-manager.service';
import { PuppeteerModule } from '../puppeteer/puppeteer.module';
import { AccountsSessionHealthService } from './accounts-session-health.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
    PuppeteerModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService, ProfileManagerService, AccountsSessionHealthService],
  exports: [AccountsService, ProfileManagerService],
})
export class AccountsModule {}
