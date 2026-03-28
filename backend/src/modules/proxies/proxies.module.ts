import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProxiesService } from './proxies.service';
import { ProxiesController } from './proxies.controller';
import { Proxy, ProxySchema } from './schemas/proxy.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Proxy.name, schema: ProxySchema }])],
  controllers: [ProxiesController],
  providers: [ProxiesService],
  exports: [ProxiesService],
})
export class ProxiesModule {}
