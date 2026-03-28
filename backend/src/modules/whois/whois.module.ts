import { Module } from '@nestjs/common';
import { WhoisService } from './whois.service';
import { WhoisController } from './whois.controller';

@Module({
  controllers: [WhoisController],
  providers: [WhoisService],
  exports: [WhoisService],
})
export class WhoisModule {}
