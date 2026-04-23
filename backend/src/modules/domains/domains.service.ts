import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Domain, DomainDocument } from './schemas/domain.schema';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { parse } from 'csv-parse/sync';
import { TemplatesService } from '../templates/templates.service';

@Injectable()
export class DomainsService {
  constructor(
    @InjectModel(Domain.name) private domainModel: Model<DomainDocument>,
    private templatesService: TemplatesService,
  ) {}

  async create(createDomainDto: CreateDomainDto, userId: string): Promise<DomainDocument> {
    if (!createDomainDto.reason && !createDomainDto.template) {
      throw new BadRequestException('Either reason or template must be provided');
    }

    let reason = createDomainDto.reason || '';
    if (!reason && createDomainDto.template) {
      reason = await this.templatesService.getDescription(createDomainDto.template, {
        domain: createDomainDto.domain,
      });
      if (!reason) {
        throw new BadRequestException('Template not found');
      }
    }

    const domain = new this.domainModel({
      ...createDomainDto,
      reason,
      createdBy: userId,
    });
    return domain.save();
  }

  async bulkImport(
    bulkImportDto: BulkImportDto,
    userId: string,
  ): Promise<{ imported: number; failed: number }> {
    const { domains, reason, template } = bulkImportDto;
    let domainList: string[] = [];

    if (domains.includes(',')) {
      try {
        const records = parse(domains, {
          skip_empty_lines: true,
          trim: true,
        });
        domainList = records.flat().filter((d) => d && d.trim());
      } catch (error) {
        domainList = domains
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean);
      }
    } else {
      domainList = domains
        .split('\n')
        .map((d) => d.trim())
        .filter(Boolean);
    }

    let imported = 0;
    let failed = 0;

    const templateObj = template ? await this.templatesService.getById(template) : null;
    const templateDescription = templateObj?.description || '';

    for (const domainName of domainList) {
      try {
        await this.domainModel.create({
          domain: domainName,
          reason:
            reason ||
            (templateDescription
              ? templateDescription
                  .replaceAll('{{domain}}', domainName)
                  .replaceAll('{domain}', domainName)
              : '') ||
            'Abuse',
          template,
          createdBy: userId,
        });
        imported++;
      } catch (error) {
        failed++;
      }
    }

    return { imported, failed };
  }

  async findAll(userId: string): Promise<DomainDocument[]> {
    return this.domainModel.find({ createdBy: userId }).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string, userId: string): Promise<DomainDocument> {
    const domain = await this.domainModel.findOne({ _id: id, createdBy: userId }).exec();
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }
    return domain;
  }

  async update(
    id: string,
    updateDomainDto: UpdateDomainDto,
    userId: string,
  ): Promise<DomainDocument> {
    if (updateDomainDto.template && !updateDomainDto.reason) {
      const domain = await this.findById(id, userId);
      updateDomainDto.reason = await this.templatesService.getDescription(
        updateDomainDto.template,
        {
          domain: domain.domain,
        },
      );
      if (!updateDomainDto.reason) {
        throw new BadRequestException('Template not found');
      }
    }

    const domain = await this.domainModel
      .findOneAndUpdate({ _id: id, createdBy: userId }, updateDomainDto, { new: true })
      .exec();
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }
    return domain;
  }

  async updateReportProgress(
    id: string,
    serviceId: string,
    totalServices: number,
    status: 'success' | 'failed',
  ): Promise<DomainDocument> {
    const domain = await this.domainModel.findById(id).exec();
    if (domain) {
      if (status === 'success') {
        if (!domain.reportedServices.includes(serviceId)) {
          domain.reportedServices.push(serviceId);
        }
        if (Array.isArray((domain as any).failedServices)) {
          (domain as any).failedServices = (domain as any).failedServices.filter(
            (s) => s !== serviceId,
          );
        }
      } else {
        if (!Array.isArray((domain as any).failedServices)) {
          (domain as any).failedServices = [];
        }
        if (!(domain as any).failedServices.includes(serviceId)) {
          (domain as any).failedServices.push(serviceId);
        }
      }
      const safeTotal = typeof totalServices === 'number' ? totalServices : 0;
      const attempted =
        domain.reportedServices.length +
        (Array.isArray((domain as any).failedServices) ? (domain as any).failedServices.length : 0);
      domain.reportProgress = safeTotal > 0 ? Math.round((attempted / safeTotal) * 100) : 0;
      if (safeTotal > 0 && attempted >= safeTotal) {
        const failedCount = Array.isArray((domain as any).failedServices)
          ? (domain as any).failedServices.length
          : 0;
        domain.status = failedCount > 0 ? 'failed' : 'reported';
      }
      return domain.save();
    }
    return domain;
  }

  async updateUrls(
    id: string,
    userId: string,
    urls: { authorizedUrl?: string; infringingUrls?: string; workDescription?: string },
  ): Promise<DomainDocument> {
    const domain = await this.domainModel
      .findOneAndUpdate(
        { _id: id, createdBy: userId },
        {
          $set: {
            authorizedUrl: urls.authorizedUrl,
            infringingUrls: urls.infringingUrls,
            workDescription: urls.workDescription,
          },
        },
        { new: true },
      )
      .exec();
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }
    return domain;
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.domainModel.deleteOne({ _id: id, createdBy: userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Domain not found');
    }
  }
}
