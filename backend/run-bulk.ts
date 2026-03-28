import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ReportsService } from './src/modules/reports/reports.service';
import { ReportServicesService } from './src/modules/report-services/report-services.service';
import mongoose from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const reportsService = app.get(ReportsService);
  const reportServicesService = app.get(ReportServicesService);

  // Kết nối thẳng DB để lấy domain
  await mongoose.connect('mongodb://localhost:27017/domain-abuse-db');
  const db = mongoose.connection.db;

  // Lấy dịch vụ (Service)
  const services = await reportServicesService.findAll();
  
  // Lấy đúng 2 dịch vụ anh muốn demo
  const targetServices = services.filter(s => 
    s.reportUrl === 'https://safebrowsing.google.com/safebrowsing/report_phish/' ||
    s.reportUrl === 'https://search.google.com/search-console/report-spam'
  );

  if (targetServices.length === 0) {
    console.error('❌ Không tìm thấy dịch vụ nào trong Database!');
    await app.close();
    process.exit(1);
  }

  const serviceIdsToRun = targetServices.map(s => s._id.toString());
  console.log(`🚀 Sẽ chạy báo cáo cho ${targetServices.length} dịch vụ:`);
  targetServices.forEach(s => console.log(`   - ${s.name} (${s.reportUrl})`));

  // Lấy toàn bộ danh sách domain từ Database (các domain đang hiển thị trên UI)
  const dbDomains = await db.collection('domains').find({}).toArray();

  if (dbDomains.length === 0) {
    console.log('⚠️ Không tìm thấy domain nào trong Database. Vui lòng thêm domain trên giao diện web rồi chạy lại lệnh.');
    await app.close();
    process.exit(0);
  }

  console.log(`\n⏳ Đang xử lý ${dbDomains.length} domains từ Database (Giao diện Web)...`);

  let queuedCount = 0;
  const user = await db.collection('users').findOne({});
  const fallbackUserId = user ? user._id.toString() : new mongoose.Types.ObjectId().toString();

  for (const domainDoc of dbDomains) {
    const domainName = domainDoc.domain;
    try {
      const domainId = domainDoc._id.toString();
      const currentUserId = domainDoc.createdBy ? domainDoc.createdBy.toString() : fallbackUserId;
      
      // Xếp hàng Job
      const result = await reportsService.reportDomain(
        domainId,
        serviceIdsToRun,
        currentUserId
      );
      
      console.log(`✅ [${domainName}] ${result.message}`);
      queuedCount++;
    } catch (error: any) {
      console.error(`❌ [${domainName}] Lỗi:`, error.message);
    }
  }

  console.log(`\n🎉 Hoàn tất! Đã queue thành công ${queuedCount}/${dbDomains.length} domains.`);
  await app.close();
  process.exit(0);
}

bootstrap();