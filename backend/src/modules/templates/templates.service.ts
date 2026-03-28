import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { Template as TemplateEntity, TemplateDocument } from './schemas/template.schema';

export interface Template {
  id: string;
  name: string;
  description: string;
}

@Injectable()
export class TemplatesService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(@InjectModel(TemplateEntity.name) private templateModel: Model<TemplateDocument>) {}

  async onModuleInit() {
    await this.seedTemplates();
  }

  async getAll(): Promise<Template[]> {
    const templates = await this.templateModel.find().sort({ name: 1 }).lean().exec();
    return templates.map((t) => ({ id: t.key, name: t.name, description: t.description }));
  }

  async getById(id: string): Promise<Template | null> {
    const template = await this.templateModel.findOne({ key: id }).lean().exec();
    if (!template) return null;
    return { id: template.key, name: template.name, description: template.description };
  }

  async getDescription(id: string, variables?: Record<string, string>): Promise<string> {
    const template = await this.getById(id);
    if (!template) return '';
    return this.render(template.description, variables);
  }

  async create(dto: CreateTemplateDto): Promise<Template> {
    const key = dto.key?.trim() || this.slugify(dto.name) || `template-${Date.now()}`;
    const created = await this.templateModel.create({
      key,
      name: dto.name,
      description: dto.description,
    });
    return { id: created.key, name: created.name, description: created.description };
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<Template | null> {
    const updated = await this.templateModel
      .findOneAndUpdate({ key: id }, dto, { new: true })
      .exec();
    if (!updated) return null;
    return { id: updated.key, name: updated.name, description: updated.description };
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.templateModel.deleteOne({ key: id }).exec();
    return (res.deletedCount || 0) > 0;
  }

  private render(text: string, variables?: Record<string, string>): string {
    if (!variables) return text;
    let out = text;
    for (const [k, v] of Object.entries(variables)) {
      out = out.replaceAll(`{{${k}}}`, v).replaceAll(`{${k}}`, v);
    }
    return out;
  }

  private slugify(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async seedTemplates(): Promise<void> {
    try {
      const count = await this.templateModel.countDocuments().exec();
      if (count > 0) return;

      await this.templateModel.insertMany([
        {
          key: 'phishing',
          name: 'Phishing',
          description:
            'This domain is being used for phishing attacks, attempting to steal user credentials and personal information through deceptive web pages that impersonate legitimate services.',
        },
        {
          key: 'malware',
          name: 'Malware Distribution',
          description:
            'This domain is distributing malware, hosting malicious software that infects visitor computers, steals data, or compromises system security.',
        },
        {
          key: 'spam',
          name: 'Spam',
          description:
            'This domain is being used to send unsolicited bulk emails (spam), promoting fraudulent schemes, and distributing unwanted commercial content.',
        },
        {
          key: 'copyright',
          name: 'Copyright Infringement',
          description:
            'This domain is hosting copyrighted content without authorization, including pirated software, movies, music, or other protected intellectual property.',
        },
        {
          key: 'trademark',
          name: 'Trademark Infringement',
          description:
            'This domain is using trademarked names, logos, or brands without permission to deceive users or profit from brand confusion.',
        },
        {
          key: 'scam',
          name: 'Scam/Fraud',
          description:
            'This domain is operating a fraudulent scheme designed to deceive users and steal money or personal information through false promises or deceptive practices.',
        },
      ]);

      this.logger.log('Templates seeded successfully');
    } catch (e) {
      this.logger.error(`Template seeding failed: ${e.message}`);
    }
  }
}
