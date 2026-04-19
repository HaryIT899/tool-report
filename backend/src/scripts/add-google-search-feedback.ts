import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { ReportServiceDocument } from '../modules/report-services/schemas/report-service.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const reportServiceModel = app.get<Model<ReportServiceDocument>>('ReportServiceModel');

  // Check if Google Search Feedback already exists
  const existing = await reportServiceModel
    .findOne({
      name: 'Google Search Feedback',
    })
    .exec();

  if (existing) {
    console.log('✓ Google Search Feedback already exists');
  } else {
    await reportServiceModel.create({
      name: 'Google Search Feedback',
      reportUrl: 'https://www.google.com/?hl=vi',
      type: 'autofill_supported',
      active: true,
    });
    console.log('✓ Google Search Feedback service added successfully');
  }

  // Show all services
  const allServices = await reportServiceModel.find().exec();
  console.log('\n📋 All Report Services:');
  allServices.forEach((service, index) => {
    console.log(`${index + 1}. ${service.name} - ${service.reportUrl}`);
  });

  await app.close();
  process.exit(0);
}

bootstrap();
