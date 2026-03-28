import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProxiesService } from '../modules/proxies/proxies.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const proxiesService = app.get(ProxiesService);

  const sampleProxies = [
    {
      host: '185.199.229.156',
      port: 7492,
      username: 'proxyuser',
      password: 'proxypass',
      type: 'http',
    },
    {
      host: '185.199.228.220',
      port: 7300,
      username: 'proxyuser',
      password: 'proxypass',
      type: 'http',
    },
    {
      host: '185.199.231.45',
      port: 8382,
      type: 'http',
    },
  ];

  console.log('Seeding proxies...');

  const existingProxies = await proxiesService.findAll();

  if (existingProxies.length === 0) {
    for (const proxyData of sampleProxies) {
      try {
        await proxiesService.create(proxyData);
        console.log(`✓ Created proxy: ${proxyData.host}:${proxyData.port}`);
      } catch (error) {
        console.log(`✗ Error creating proxy ${proxyData.host}: ${error.message}`);
      }
    }
    console.log('Proxy seeding completed!');
  } else {
    console.log('Proxies already exist. Skipping seed.');
  }

  await app.close();
}

bootstrap();
