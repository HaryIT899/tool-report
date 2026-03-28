import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReportService, ReportServiceDocument } from './schemas/report-service.schema';
import { ReportLog, ReportLogDocument } from './schemas/report-log.schema';

@Injectable()
export class ReportServicesService {
  constructor(
    @InjectModel(ReportService.name) private reportServiceModel: Model<ReportServiceDocument>,
    @InjectModel(ReportLog.name) private reportLogModel: Model<ReportLogDocument>,
  ) {}

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
    const count = await this.reportServiceModel.countDocuments().exec();
    if (count > 0) {
      console.log('Report services already seeded');
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
    console.log('Report services seeded successfully');
  }
}
