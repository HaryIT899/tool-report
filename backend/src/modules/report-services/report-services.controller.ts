import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportServicesService } from './report-services.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('report-services')
@UseGuards(JwtAuthGuard)
export class ReportServicesController {
  constructor(private reportServicesService: ReportServicesService) {}

  @Get()
  async findAll() {
    return this.reportServicesService.findAll();
  }
}
