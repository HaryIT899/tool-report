import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReportService, ReportServiceDocument } from './schemas/report-service.schema';
import { ReportLog, ReportLogDocument } from './schemas/report-log.schema';

@Injectable()
export class ReportServicesService implements OnModuleInit {
  private readonly logger = new Logger(ReportServicesService.name);

  constructor(
    @InjectModel(ReportService.name) private reportServiceModel: Model<ReportServiceDocument>,
    @InjectModel(ReportLog.name) private reportLogModel: Model<ReportLogDocument>,
  ) {}

  async onModuleInit() {
    await this.seedServices();
  }

  async findAll(): Promise<ReportServiceDocument[]> {
    return this.reportServiceModel.find().exec();
  }

  async createLog(domainId: string, serviceId: string, status: string): Promise<ReportLogDocument> {
    const log = new this.reportLogModel({
      domainId,
      serviceId,
      status,
    });
    return log.save();
  }

  async seedServices(): Promise<void> {
    try {
      const count = await this.reportServiceModel.countDocuments().exec();
      if (count > 0) {
        this.logger.log('Report services already exist, skipping seed');
        return;
      }

      const services = [
        {
          name: 'Google Spam',
          reportUrl: 'https://search.google.com/search-console/report-spam',
          type: 'autofill_supported',
          active: true,
        },
        {
          name: 'Google Phishing',
          reportUrl: 'https://safebrowsing.google.com/safebrowsing/report_phish/',
          type: 'autofill_supported',
          active: true,
        },
        {
          name: 'Google Search Feedback',
          reportUrl: 'https://www.google.com/?hl=vi',
          type: 'autofill_supported',
          active: true,
        },
        // {
        //   name: 'Google DMCA',
        //   reportUrl: 'https://reportcontent.google.com/forms/dmca_search',
        //   type: 'autofill_supported',
        //   active: true,
        // },
        // {
        //   name: 'Cloudflare Abuse',
        //   reportUrl: 'https://abuse.cloudflare.com/',
        //   type: 'autofill_supported',
        //   active: true,
        // },
        {
          name: 'Radix Abuse',
          reportUrl: 'https://abuse.radix.website/',
          type: 'autofill_supported',
          active: true,
        },
      ];

      await this.reportServiceModel.insertMany(services);
      this.logger.log('Report services seeded successfully');
    } catch (e) {
      this.logger.error(`Report services seeding failed: ${e.message}`);
    }
  }
}
