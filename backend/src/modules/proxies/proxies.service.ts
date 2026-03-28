import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proxy, ProxyDocument } from './schemas/proxy.schema';
import { CreateProxyDto } from './dto/create-proxy.dto';
import { UpdateProxyDto } from './dto/update-proxy.dto';

@Injectable()
export class ProxiesService {
  private readonly logger = new Logger(ProxiesService.name);

  constructor(@InjectModel(Proxy.name) private proxyModel: Model<ProxyDocument>) {}

  async create(createProxyDto: CreateProxyDto): Promise<ProxyDocument> {
    const proxy = new this.proxyModel(createProxyDto);
    return proxy.save();
  }

  async findAll(): Promise<ProxyDocument[]> {
    return this.proxyModel.find().exec();
  }

  async findById(id: string): Promise<ProxyDocument | null> {
    return this.proxyModel.findById(id).exec();
  }

  async update(id: string, updateProxyDto: UpdateProxyDto): Promise<ProxyDocument | null> {
    return this.proxyModel.findByIdAndUpdate(id, updateProxyDto, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.proxyModel.findByIdAndDelete(id).exec();
  }

  async getNextAvailableProxy(): Promise<ProxyDocument | null> {
    const activeProxies = await this.proxyModel
      .find({ status: 'active' })
      .sort({ lastUsedAt: 1, useCount: 1 })
      .limit(1)
      .exec();

    if (activeProxies.length === 0) {
      this.logger.warn('No active proxies available');
      return null;
    }

    const proxy = activeProxies[0];

    await this.proxyModel.findByIdAndUpdate(proxy._id, {
      lastUsedAt: new Date(),
      $inc: { useCount: 1 },
    });

    return proxy;
  }

  async markProxyAsFailed(proxyId: string): Promise<void> {
    const proxy = await this.findById(proxyId);

    if (!proxy) return;

    const newFailCount = proxy.failCount + 1;

    if (newFailCount >= 3) {
      await this.proxyModel.findByIdAndUpdate(proxyId, {
        status: 'banned',
        $inc: { failCount: 1 },
      });
      this.logger.warn(`Proxy ${proxy.host}:${proxy.port} marked as banned after 3 failures`);
    } else {
      await this.proxyModel.findByIdAndUpdate(proxyId, {
        $inc: { failCount: 1 },
      });
    }
  }

  async markProxyAsSuccess(proxyId: string): Promise<void> {
    await this.proxyModel.findByIdAndUpdate(proxyId, {
      failCount: 0,
    });
  }

  async resetUsageStats(): Promise<void> {
    await this.proxyModel.updateMany({}, { lastUsedAt: null, useCount: 0, failCount: 0 });
    this.logger.log('Proxy usage stats reset');
  }

  getProxyUrl(proxy: Proxy): string {
    if (proxy.username && proxy.password) {
      return `${proxy.type}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    }
    return `${proxy.type}://${proxy.host}:${proxy.port}`;
  }
}
