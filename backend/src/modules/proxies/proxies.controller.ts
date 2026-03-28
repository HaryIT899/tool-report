import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { CreateProxyDto } from './dto/create-proxy.dto';
import { UpdateProxyDto } from './dto/update-proxy.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('proxies')
@UseGuards(JwtAuthGuard)
export class ProxiesController {
  constructor(private readonly proxiesService: ProxiesService) {}

  @Post()
  create(@Body() createProxyDto: CreateProxyDto) {
    return this.proxiesService.create(createProxyDto);
  }

  @Get()
  findAll() {
    return this.proxiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proxiesService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProxyDto: UpdateProxyDto) {
    return this.proxiesService.update(id, updateProxyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.proxiesService.delete(id);
  }

  @Post('reset-stats')
  resetStats() {
    return this.proxiesService.resetUsageStats();
  }
}
