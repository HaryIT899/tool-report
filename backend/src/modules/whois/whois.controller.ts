import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WhoisService } from './whois.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('whois')
@UseGuards(JwtAuthGuard)
export class WhoisController {
  constructor(private whoisService: WhoisService) {}

  @Get('lookup')
  async lookup(@Query('domain') domain: string) {
    return this.whoisService.lookup(domain);
  }

  @Get('suggestions')
  async getSuggestions(@Query('domain') domain: string) {
    const suggestions = await this.whoisService.detectSuggestedServices(domain);
    return { suggestions };
  }
}
