import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as fs from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 🔥 CORS cho dev + ngrok
  app.enableCors({
    origin: '*',
  });

  // 🔥 API prefix đồng bộ với FE proxy /api
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 🔥 đảm bảo folder tồn tại
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots', { recursive: true });
  }

  app.useStaticAssets(join(process.cwd(), 'screenshots'), {
    prefix: '/screenshots',
  });

  const port = process.env.PORT || 3000;

  // 🔥 QUAN TRỌNG: cho phép access từ ngrok / máy khác
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Backend running: http://localhost:${port}`);
}

bootstrap();