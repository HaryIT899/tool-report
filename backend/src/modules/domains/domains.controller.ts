import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DomainsService } from './domains.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('domains')
@UseGuards(JwtAuthGuard)
export class DomainsController {
  constructor(private domainsService: DomainsService) {}

  @Post()
  async create(@Body() createDomainDto: CreateDomainDto, @Request() req) {
    return this.domainsService.create(createDomainDto, req.user.userId);
  }

  @Post('bulk-import')
  async bulkImport(@Body() bulkImportDto: BulkImportDto, @Request() req) {
    const result = await this.domainsService.bulkImport(bulkImportDto, req.user.userId);
    return {
      message: `Imported ${result.imported} domains successfully. ${result.failed} failed.`,
      ...result,
    };
  }

  @Get()
  async findAll(@Request() req) {
    return this.domainsService.findAll(req.user.userId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDomainDto: UpdateDomainDto, @Request() req) {
    return this.domainsService.update(id, updateDomainDto, req.user.userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.domainsService.delete(id, req.user.userId);
    return { message: 'Domain deleted successfully' };
  }
}
