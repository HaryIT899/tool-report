import { Controller, Post, Get, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post('domain/:id')
  async reportDomain(
    @Param('id') id: string,
    @Body() body: { serviceIds: string[] },
    @Request() req,
  ) {
    return this.reportsService.reportDomain(id, body.serviceIds, req.user.userId);
  }

  @Post('domain/:id/reset')
  async resetDomain(@Param('id') id: string, @Request() req) {
    return this.reportsService.resetDomain(id, req.user.userId);
  }

  @Post('all')
  async reportAll(@Request() req) {
    return this.reportsService.reportAllDomains(req.user.userId);
  }

  @Get('queue-stats')
  async getQueueStats() {
    return this.reportsService.getQueueStats();
  }

  @Post('queue/pause')
  async pauseQueue() {
    return this.reportsService.pauseQueue();
  }

  @Post('queue/resume')
  async resumeQueue() {
    return this.reportsService.resumeQueue();
  }

  @Post('queue/clean')
  async cleanQueue() {
    return this.reportsService.cleanQueue();
  }

  @Post('tool/domain/:domainId/service/:serviceId')
  async runTool(
    @Param('domainId') domainId: string,
    @Param('serviceId') serviceId: string,
    @Body() body: { email?: string; accountId?: string },
    @Request() req,
  ) {
    return this.reportsService.runPuppeteerTool(domainId, serviceId, req.user.userId, body);
  }

  @Post('trigger')
  async triggerReport(
    @Body()
    body: {
      accountId?: string;
      domainId: string;
      serviceIds: string[];
    },
    @Request() req,
  ) {
    return this.reportsService.reportDomainWithAccount(
      body.domainId,
      body.serviceIds,
      req.user.userId,
      body.accountId,
    );
  }
}
