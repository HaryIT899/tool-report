import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AccountsService } from '../modules/accounts/accounts.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const accountsService = app.get(AccountsService);

  const defaultAccounts = [
    { email: 'reporter1@example.com' },
    { email: 'reporter2@example.com' },
    { email: 'reporter3@example.com' },
  ];

  for (const account of defaultAccounts) {
    try {
      await accountsService.create(account);
      console.log(`Created account: ${account.email}`);
    } catch (error) {
      console.log(`Account already exists: ${account.email}`);
    }
  }

  await app.close();
  console.log('Account seeding completed!');
  process.exit(0);
}

bootstrap();
