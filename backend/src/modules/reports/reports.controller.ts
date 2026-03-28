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
}
