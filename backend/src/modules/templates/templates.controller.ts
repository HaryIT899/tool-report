import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  getAll() {
    return this.templatesService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const template = await this.templatesService.getById(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    const updated = await this.templatesService.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Template not found');
    }
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const ok = await this.templatesService.delete(id);
    if (!ok) {
      throw new NotFoundException('Template not found');
    }
    return { message: 'Template deleted successfully' };
  }
}
