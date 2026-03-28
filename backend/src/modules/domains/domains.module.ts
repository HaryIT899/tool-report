import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DomainsService } from './domains.service';
import { DomainsController } from './domains.controller';
import { Domain, DomainSchema } from './schemas/domain.schema';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Domain.name, schema: DomainSchema }]),
    TemplatesModule,
  ],
  controllers: [DomainsController],
  providers: [DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}
