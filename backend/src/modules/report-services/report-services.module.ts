import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportServicesService } from './report-services.service';
import { ReportServicesController } from './report-services.controller';
import { ReportService, ReportServiceSchema } from './schemas/report-service.schema';
import { ReportLog, ReportLogSchema } from './schemas/report-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReportService.name, schema: ReportServiceSchema },
      { name: ReportLog.name, schema: ReportLogSchema },
    ]),
  ],
  controllers: [ReportServicesController],
  providers: [ReportServicesService],
  exports: [ReportServicesService],
})
export class ReportServicesModule {}
