import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ReportsService } from '../modules/reports/reports.service';
import { DomainsService } from '../modules/domains/domains.service';
import { ReportServicesService } from '../modules/report-services/report-services.service';
import { AccountsService } from '../modules/accounts/accounts.service';

/**
 * CLI Tool to trigger report jobs
 *
 * Usage:
 *   npm run trigger -- --account=acc1 --domain=evil.com --reason="Phishing site" --services=all
 *   npm run trigger -- --accountId=507f1f77bcf86cd799439011 --domainId=507f191e810c19729de860ea
 *
 * Options:
 *   --account=<email>        Account email to use (will auto-select if not provided)
 *   --accountId=<id>         Account MongoDB ID
 *   --domain=<domain>        Domain to report (e.g., evil.com)
 *   --domainId=<id>          Existing domain MongoDB ID
 *   --reason=<reason>        Reason for report
 *   --services=<ids|all>     Comma-separated service IDs or "all"
 *   --userId=<id>            User ID (defaults to first user)
 *
 * Examples:
 *   # Create and report new domain
 *   npm run trigger -- --account=test@gmail.com --domain=phishing.com --reason="Phishing attack" --services=all
 *
 *   # Report existing domain with specific account
 *   npm run trigger -- --accountId=123abc --domainId=456def --services=all
 *
 *   # Report with auto-selected account
 *   npm run trigger -- --domain=scam.com --reason="Scam site" --services=all
 */

async function main() {
  console.log('🚀 Domain Abuse Report - CLI Trigger Tool\n');

  const args = process.argv.slice(2);
  const opts: any = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      opts[key] = value;
    }
  }

  if (!opts.domain && !opts.domainId) {
    console.error('❌ Error: Either --domain or --domainId is required\n');
    console.log('Usage: npm run trigger -- --domain=evil.com --reason="Phishing" --services=all');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const reportsService = app.get(ReportsService);
  const domainsService = app.get(DomainsService);
  const reportServicesService = app.get(ReportServicesService);
  const accountsService = app.get(AccountsService);

  try {
    // Get or create user
    let userId = opts.userId;
    if (!userId) {
      // Get first user (you may want to add UsersService to get user by username)
      userId = process.env.DEFAULT_USER_ID || '000000000000000000000001';
      console.log(`ℹ️  Using default userId: ${userId}`);
    }

    // Get or create account
    let accountId = opts.accountId;
    if (!accountId && opts.account) {
      const accounts = await accountsService.findAll();
      const account = accounts.find((a) => a.email === opts.account);
      if (account) {
        accountId = account._id.toString();
        console.log(`✅ Found account: ${account.email} (${accountId})`);
      } else {
        console.error(`❌ Account not found: ${opts.account}`);
        console.log('\nAvailable accounts:');
        accounts.forEach((a) => console.log(`  - ${a.email} (${a._id})`));
        process.exit(1);
      }
    } else if (accountId) {
      const account = await accountsService.findById(accountId);
      if (account) {
        console.log(`✅ Using account: ${account.email} (${accountId})`);
      } else {
        console.error(`❌ Account not found: ${accountId}`);
        process.exit(1);
      }
    } else {
      console.log('ℹ️  No account specified, will auto-select');
    }

    // Get or create domain
    let domainId = opts.domainId;
    if (!domainId && opts.domain) {
      const reason = opts.reason || 'Abuse report triggered via CLI';
      console.log(`\n📝 Creating domain: ${opts.domain}`);
      console.log(`   Reason: ${reason}`);

      const domain = await domainsService.create(
        {
          domain: opts.domain,
          reason,
        },
        userId,
      );
      domainId = domain._id.toString();
      console.log(`✅ Domain created: ${domainId}`);
    } else {
      const domain = await domainsService.findById(domainId, userId);
      console.log(`\n✅ Using existing domain: ${domain.domain} (${domainId})`);
    }

    // Get services
    const allServices = await reportServicesService.findAll();
    const activeServices = allServices.filter((s) => s.active !== false);

    let serviceIds: string[] = [];
    if (opts.services === 'all') {
      serviceIds = activeServices.map((s) => s._id.toString());
      console.log(`\n📋 Selected all ${serviceIds.length} active services:`);
      activeServices.forEach((s) => console.log(`   - ${s.name}`));
    } else if (opts.services) {
      serviceIds = opts.services.split(',').map((id: string) => id.trim());
      console.log(`\n📋 Selected ${serviceIds.length} service(s)`);
    } else {
      console.error('❌ Error: --services is required (use "all" or comma-separated IDs)');
      console.log('\nAvailable services:');
      activeServices.forEach((s) => console.log(`   - ${s.name} (${s._id})`));
      process.exit(1);
    }

    // Trigger report
    console.log(`\n🚀 Triggering report jobs...`);
    const result = await reportsService.reportDomainWithAccount(
      domainId,
      serviceIds,
      userId,
      accountId,
    );

    console.log(`\n✅ ${result.message}`);
    console.log(`\nJobs queued:`);
    result.jobs.forEach((job: any) => {
      console.log(`   - Job ${job.jobId}: ${job.service} (Account: ${job.account || 'auto'})`);
      console.log(`     Log ID: ${job.logId}`);
    });

    console.log('\n✅ Done! Jobs are now in the queue.');
    console.log(
      'ℹ️  Extension will auto-fill forms when Chrome opens with the payload in URL hash.\n',
    );
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
