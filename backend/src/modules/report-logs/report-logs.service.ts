import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReportLog, ReportLogDocument } from '../report-services/schemas/report-log.schema';

@Injectable()
export class ReportLogsService {
  constructor(@InjectModel(ReportLog.name) private reportLogModel: Model<ReportLogDocument>) {}

  async create(logData: Partial<ReportLog>): Promise<ReportLogDocument> {
    const log = new this.reportLogModel(logData);
    return log.save();
  }

  async findByDomain(domainId: string): Promise<ReportLogDocument[]> {
    return this.reportLogModel
      .find({ domainId })
      .populate('serviceId')
      .populate('accountId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByDomainAndUser(domainId: string, userId: string): Promise<ReportLogDocument[]> {
    return this.reportLogModel
      .find({ domainId, userId })
      .populate('serviceId')
      .populate('accountId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUser(userId: string, limit = 100): Promise<ReportLogDocument[]> {
    return this.reportLogModel
      .find({ userId })
      .populate('domainId')
      .populate('serviceId')
      .populate('accountId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findByJobId(jobId: string): Promise<ReportLogDocument> {
    return this.reportLogModel.findOne({ jobId }).exec();
  }

  async deleteByDomainAndUser(domainId: string, userId: string): Promise<number> {
    const res = await this.reportLogModel.deleteMany({ domainId, userId }).exec();
    return res.deletedCount || 0;
  }

  async update(id: string, updateData: Partial<ReportLog>): Promise<ReportLogDocument> {
    return this.reportLogModel
      .findByIdAndUpdate(id, { ...updateData, updatedAt: new Date() }, { new: true })
      .exec();
  }

  async updateStatus(
    id: string,
    status: string,
    errorMessage?: string,
  ): Promise<ReportLogDocument> {
    return this.reportLogModel
      .findByIdAndUpdate(id, { status, errorMessage, updatedAt: new Date() }, { new: true })
      .exec();
  }

  async appendEvent(id: string, stage: string, message?: string): Promise<ReportLogDocument> {
    const now = new Date();
    return this.reportLogModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            stage,
            stageMessage: message,
            stageUpdatedAt: now,
            updatedAt: now,
          },
          $push: {
            events: {
              stage,
              message,
              at: now,
            },
          },
        },
        { new: true },
      )
      .exec();
  }

  async getStatsByUser(userId: string) {
    const logs = await this.reportLogModel.find({ userId }).exec();

    return {
      total: logs.length,
      success: logs.filter((l) => l.status === 'success').length,
      failed: logs.filter((l) => l.status === 'failed').length,
      pending: logs.filter((l) => l.status === 'pending').length,
      processing: logs.filter((l) => l.status === 'processing').length,
    };
  }
}
