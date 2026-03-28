import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ReportsService } from './src/modules/reports/reports.service';
import { ReportServicesService } from './src/modules/report-services/report-services.service';
import mongoose from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const reportsService = app.get(ReportsService);
  const reportServicesService = app.get(ReportServicesService);

  const services = await reportServicesService.findAll();
  const spamService = services.find((s) => s.name === 'Google Spam');
  const phishService = services.find((s) => s.name === 'Google Phishing');

  if (!spamService || !phishService) {
    console.error('Missing services');
    process.exit(1);
  }

  const domainId = '69c4b0a610adc6a6255ea807';
  const userId = '69bd03145136650f825575de'; // Admin user ID? Wait, let's look up the user ID from the domain
  
  // Connect to DB directly to find the domain and its createdBy
  await mongoose.connect('mongodb://localhost:27017/domain-abuse-db');
  const domainDoc = await mongoose.connection.db.collection('domains').findOne({ _id: new mongoose.Types.ObjectId(domainId) });
  
  if (!domainDoc) {
    console.error('Domain not found');
    process.exit(1);
  }
  
  const result = await reportsService.reportDomain(
    domainId,
    [spamService._id.toString(), phishService._id.toString()],
    domainDoc.createdBy.toString()
  );

  console.log('Queued for real domain:', result);
  await app.close();
  process.exit(0);
}

bootstrap();
