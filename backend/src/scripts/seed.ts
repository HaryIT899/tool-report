import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ReportServicesService } from '../modules/report-services/report-services.service';
import { TemplatesService } from '../modules/templates/templates.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const reportServicesService = app.get(ReportServicesService);
  await reportServicesService.seedServices();

  const templatesService = app.get(TemplatesService);
  await templatesService.seedTemplates();

  await app.close();
  console.log('Seeding completed!');
  process.exit(0);
}

bootstrap();
