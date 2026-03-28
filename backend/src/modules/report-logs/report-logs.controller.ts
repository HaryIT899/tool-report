import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ReportLogsService } from './report-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('report-logs')
@UseGuards(JwtAuthGuard)
export class ReportLogsController {
  constructor(private reportLogsService: ReportLogsService) {}

  @Get()
  async getUserLogs(@Request() req) {
    return this.reportLogsService.findByUser(req.user.userId);
  }

  @Get('stats')
  async getStats(@Request() req) {
    return this.reportLogsService.getStatsByUser(req.user.userId);
  }

  @Get('domain/:domainId')
  async getDomainLogs(@Param('domainId') domainId: string) {
    return this.reportLogsService.findByDomain(domainId);
  }
}
