import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportLogsService } from './report-logs.service';
import { ReportLogsController } from './report-logs.controller';
import { ReportLog, ReportLogSchema } from '../report-services/schemas/report-log.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: ReportLog.name, schema: ReportLogSchema }])],
  controllers: [ReportLogsController],
  providers: [ReportLogsService],
  exports: [ReportLogsService],
})
export class ReportLogsModule {}
