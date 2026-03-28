# Frequently Asked Questions (FAQ)

Common questions and answers about the Domain Abuse Report Tool.

## General Questions

### What is this tool for?

This tool helps you efficiently report abusive domains (phishing, malware, spam, etc.) to multiple reporting services like Google Safe Browsing, Cloudflare, and others. It semi-automates the reporting process while maintaining ethical standards.

### Is this tool free to use?

Yes, the source code is open-source under MIT license. You can use, modify, and deploy it freely. However, you'll need to pay for hosting infrastructure (server, database, etc.).

### Is this tool legal?

Yes, when used for legitimate abuse reporting purposes. The tool is designed to help report actual abusive domains to official reporting services. However, you must:
- Only report genuine abuse
- Not make false reports
- Comply with each service's terms of service
- Follow applicable laws in your jurisdiction

---

## Technical Questions

### What are the system requirements?

**Minimum:**
- Node.js v18+
- MongoDB v6+
- Redis v7+
- 2GB RAM
- 10GB storage

**Recommended:**
- 4GB+ RAM (for Puppeteer)
- 20GB+ storage
- SSD for database
- Stable internet connection

### Why do I need Redis?

Redis is used for the job queue system (BullMQ). It stores:
- Pending report jobs
- Job status and results
- Queue statistics
- Background processing coordination

### Can I use a different database?

The system is built specifically for MongoDB. To use PostgreSQL or MySQL, you would need to:
- Replace Mongoose with TypeORM or Prisma
- Rewrite all schemas
- Update module configurations
- Significant refactoring required

Not recommended unless you have specific requirements.

### Does this work on Windows?

Yes! The system works on:
- ✅ Windows 10/11
- ✅ Linux (Ubuntu, Debian, etc.)
- ✅ macOS
- ✅ Docker (all platforms)

For Windows, you can use:
- Native installations (MongoDB, Redis, Node.js)
- WSL2 (Windows Subsystem for Linux)
- Docker Desktop

---

## Features & Functionality

### How does the automation work?

**Semi-Automation:**
1. System opens report pages
2. System auto-fills form fields (domain, reason, email)
3. **User completes captcha manually**
4. **User submits form manually**
5. System logs the result

**Important:** The system does NOT bypass captchas or submit forms automatically. This ensures ethical use and compliance with terms of service.

### Can I add custom report services?

Yes! You can add new services by:

1. Adding to seed script:
```typescript
{
  name: 'My Custom Service',
  reportUrl: 'https://example.com/report',
  type: 'autofill_supported',
  active: true,
}
```

2. Update Chrome extension manifest
3. Add form selectors if needed
4. Reseed database

### What is bulk import?

Bulk import allows you to add multiple domains at once by:
- Pasting text (one domain per line)
- Comma-separated list
- CSV format

Example:
```
evil1.com
evil2.com
evil3.com
```

Or:
```
evil1.com, evil2.com, evil3.com
```

### How does email rotation work?

The system maintains a pool of email addresses. When creating a report:
1. System selects the least recently used active email
2. Uses that email in the report
3. Updates usage statistics
4. Next report gets a different email

This prevents rate limiting and distributes load.

### What are templates?

Templates are pre-written descriptions for common abuse types:
- Phishing
- Malware
- Spam
- Copyright infringement
- Trademark infringement
- Scam/fraud

Select a template and it automatically fills the reason field with professional language.

### What is WHOIS detection?

WHOIS lookup identifies:
- Domain registrar
- Nameservers
- Registration date
- Expiration date

The system uses this to:
- Suggest relevant report services
- Enhance domain information
- Track patterns

---

## Setup & Installation

### Do I need to install Chrome?

For Puppeteer browser automation, yes. The system uses Chrome/Chromium to open and control browser pages.

For the Chrome extension, obviously yes.

### Can I use Firefox?

The backend (Puppeteer) uses Chrome/Chromium only. However, you could:
- Create a Firefox extension (different API)
- Use Playwright instead of Puppeteer (supports Firefox)

Not included by default.

### How do I get a JWT secret?

Generate a secure random string:

```bash
# Linux/macOS
openssl rand -base64 64

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Online
# Visit: https://generate-random.org/api-token-generator
```

Use at least 32 characters for security.

### Where do I get report service URLs?

Default services are pre-configured:
- Google Spam
- Google Phishing
- Google DMCA
- Cloudflare Abuse
- Radix Abuse

You can find more report services by searching for:
- "Report phishing to [service]"
- "Report spam to [registrar]"
- Check registrar/hosting provider abuse pages

---

## Usage Questions

### How many domains can I import?

**Technical limits:**
- No hard limit in code
- Limited by database storage
- Recommend batches of 100-500

**Practical limits:**
- Processing time increases with count
- Browser tabs consume memory
- Captcha fatigue (user must solve many)

### How long does reporting take?

**Per domain:**
- Auto-fill: ~5 seconds
- Captcha: ~15-30 seconds (user time)
- Submit: ~5 seconds
- **Total: ~30-40 seconds per service**

**For 10 domains × 5 services:**
- 50 reports total
- ~25-30 minutes of user time (captchas)
- Plus system processing time

### Can I automate captcha solving?

**No.** This is intentional. Automating captcha solving:
- Violates terms of service
- May be illegal
- Defeats the purpose of captcha
- Could get your accounts banned

The tool is designed for **semi-automation** only.

### What happens if a report fails?

1. System logs the error
2. Job retries automatically (up to 3 attempts)
3. If still failing, marked as "failed"
4. You can view error in logs
5. Can retry manually if desired

### Can I schedule automatic reports?

Not built-in, but you could:
1. Add cron job to trigger `/api/reports/all`
2. Use task scheduler
3. Still requires user to complete captchas

**Note:** Unattended automated reporting is not recommended and may violate service terms.

---

## Chrome Extension

### Why isn't the extension working?

**Common issues:**

1. **Not on supported page:**
   - Only works on configured report sites
   - Check manifest.json for supported URLs

2. **Extension not loaded:**
   - Go to `chrome://extensions/`
   - Ensure extension is enabled
   - Check for error messages

3. **Page not fully loaded:**
   - Wait for page to finish loading
   - Try refreshing the page

4. **Form structure changed:**
   - Website may have updated
   - Update selectors in content.js

### How do I update the extension?

1. Edit files in `chrome-extension/` folder
2. Go to `chrome://extensions/`
3. Click refresh icon on extension card
4. Test changes

### Can I publish the extension?

Yes, but:
- Create professional icons
- Test thoroughly
- Write store description
- Submit to Chrome Web Store ($5 fee)
- Follow Chrome Web Store policies

Or distribute privately to your team.

---

## Troubleshooting

### "Cannot connect to MongoDB"

**Solutions:**
1. Check MongoDB is running: `mongosh`
2. Verify connection string in `.env`
3. Check authentication credentials
4. Ensure database exists
5. Check network/firewall

### "Cannot connect to Redis"

**Solutions:**
1. Check Redis is running: `redis-cli ping`
2. Verify host/port in `.env`
3. Check password if configured
4. Ensure Redis is accepting connections
5. Check firewall rules

### "Jobs are stuck in queue"

**Solutions:**
1. Check queue stats: `GET /api/reports/queue-stats`
2. Verify Redis connection
3. Check worker is running (backend should process jobs)
4. Review backend logs for errors
5. Restart backend if needed

### "Puppeteer won't open browser"

**Solutions:**
1. Set `PUPPETEER_HEADLESS=false` in `.env`
2. Install Chrome/Chromium
3. Check display server (Linux X11/Wayland)
4. Verify system permissions
5. Check Puppeteer logs

### "Forms not auto-filling"

**Solutions:**
1. Website structure may have changed
2. Update selectors in `puppeteer.service.ts` or `content.js`
3. Use extension popup for manual fill
4. Open browser console for errors
5. Check if field names changed

### "Frontend shows 401 errors"

**Solutions:**
1. Login again (token may have expired)
2. Check JWT_SECRET matches between sessions
3. Verify token in localStorage
4. Check backend logs for validation errors
5. Clear localStorage and login fresh

---

## Performance

### System is slow

**Check:**
1. Database indexes are created
2. Redis is performing well
3. Adequate RAM for Puppeteer
4. Too many concurrent jobs
5. Network latency

**Optimize:**
1. Add database indexes
2. Reduce queue concurrency
3. Increase server resources
4. Use faster storage (SSD)
5. Enable caching

### Too many browser tabs open

**Solutions:**
1. Close tabs after submission
2. Reduce concurrency in queue
3. Use extension mode instead of Puppeteer
4. Process in smaller batches
5. Increase RAM

---

## Security & Privacy

### Is my data secure?

**Security measures:**
- Passwords hashed with bcrypt
- JWT tokens for authentication
- HTTPS in production (recommended)
- Environment variables for secrets
- Input validation on all endpoints
- CORS protection

**Your responsibility:**
- Use strong passwords
- Keep JWT_SECRET secure
- Enable MongoDB authentication
- Use secure Redis password
- Regular security updates

### Can others see my domains?

No. Each user can only see their own domains. The system enforces user-specific queries using `createdBy` field.

### What data is stored?

**Database stores:**
- User credentials (hashed passwords)
- Domains you add
- Email accounts you configure
- Report logs (history)
- Service definitions

**Not stored:**
- Captcha responses
- Report website credentials
- Browser cookies
- Personal browsing data

### Is data encrypted?

**In transit:**
- Use HTTPS in production
- TLS for database connections (if configured)

**At rest:**
- Passwords: bcrypt hashed
- Tokens: JWT signed
- Other data: MongoDB default encryption (if enabled)

For additional encryption, configure:
- MongoDB encryption at rest
- Disk encryption on server

---

## Advanced Usage

### Can I run multiple workers?

Yes! Start multiple backend instances:

```bash
# PM2 cluster mode
pm2 start dist/main.js -i 4

# Or manual instances
pm2 start dist/main.js --name worker-1
pm2 start dist/main.js --name worker-2
```

All workers share the same Redis queue.

### Can I customize form selectors?

Yes, edit:
- Backend: `src/puppeteer/puppeteer.service.ts`
- Extension: `chrome-extension/content.js`

Add your own selector patterns for specific websites.

### How do I add rate limiting?

Install throttler:
```bash
npm install @nestjs/throttler
```

Configure in `app.module.ts`:
```typescript
ThrottlerModule.forRoot({
  ttl: 60,      // 60 seconds
  limit: 10,    // 10 requests
})
```

### Can I export reports?

Not built-in currently. To add:

1. Create export endpoint:
```typescript
@Get('export')
async export(@Request() req) {
  const domains = await this.domainsService.findAll(req.user.userId);
  // Convert to CSV
  return csv;
}
```

2. Add frontend button
3. Download as CSV file

---

## Business & Compliance

### Can I use this commercially?

Yes, under MIT license. You can:
- Use for your business
- Modify the code
- Deploy for clients
- Charge for services
- No attribution required (but appreciated)

### GDPR compliance?

To be GDPR compliant:
- Add privacy policy
- Implement data deletion
- Add consent mechanisms
- Enable data export
- Document data processing

The tool itself doesn't collect analytics or share data.

### Terms of Service considerations?

**Important:** When using this tool, you must:
- Read and comply with report service ToS
- Not abuse reporting systems
- Not submit false reports
- Not attempt to bypass security measures
- Use responsibly

**The tool respects:**
- Captcha requirements
- Manual submission requirement
- Rate limits (via email rotation)
- Service policies

---

## Development

### How do I contribute?

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Test thoroughly
5. Submit pull request
6. Follow code style guidelines

### Can I request features?

Yes! Create an issue with:
- Feature description
- Use case
- Expected behavior
- Why it's needed

### How do I report bugs?

Create an issue with:
- Bug description
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Error messages/logs
- Screenshots if applicable

### Where's the test suite?

Tests are not included in initial release. To add:

**Backend:**
```bash
npm install --save-dev @nestjs/testing jest
```

**Frontend:**
```bash
npm install --save-dev vitest @testing-library/react
```

---

## Integration Questions

### Can I integrate with Slack?

Yes! Add Slack notifications:

```typescript
// Install Slack SDK
npm install @slack/web-api

// In report processor
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_TOKEN);

await slack.chat.postMessage({
  channel: '#abuse-reports',
  text: `Domain ${domain} reported successfully!`,
});
```

### Can I integrate with webhooks?

Yes! Add webhook endpoint:

```typescript
@Post('webhook')
async webhook(@Body() data) {
  // Send to external service
  await axios.post(process.env.WEBHOOK_URL, data);
}
```

Call after each report completion.

### Can I use this with my existing system?

Yes, the API is RESTful and can be integrated with any system that can make HTTP requests. Use the API endpoints documented in API_TESTING.md.

---

## Email & Accounts

### Why do I need multiple email accounts?

**Benefits:**
- Prevents rate limiting
- Distributes load
- Backup if one gets banned
- Professional approach

**Not required:** System works with zero accounts (uses generic info or user's email).

### How many email accounts should I add?

**Recommendations:**
- Small use: 1-3 accounts
- Medium use: 5-10 accounts
- Heavy use: 10-20 accounts

More accounts = better distribution.

### What if an account gets banned?

1. System marks it as "banned" status
2. No longer selected for rotation
3. Add new account to replace
4. Can reactivate later if ban lifted

---

## Browser Automation

### Why non-headless mode?

**Reasons:**
1. Allows user to see what's happening
2. User can complete captchas
3. Transparency and control
4. Easier debugging
5. Ethical considerations

### Can I run in headless mode?

Yes, set `PUPPETEER_HEADLESS=true` in `.env`, but:
- Captchas will fail
- User can't interact
- Many sites detect headless mode
- Not recommended for this use case

### How many tabs can be open at once?

**Limits:**
- Memory: ~100MB per tab
- System RAM: limits concurrent tabs
- User attention: can only solve one captcha at a time

**Recommendation:**
- Process jobs sequentially (default)
- Or use low concurrency (2-3)

### Does Puppeteer use a lot of resources?

Yes:
- RAM: ~200-500MB per browser instance
- CPU: Moderate usage
- Disk: Minimal

For production, allocate:
- 2GB+ RAM
- 2+ CPU cores

---

## Deployment

### Where can I deploy this?

**Options:**
1. **VPS** - DigitalOcean, Linode, Vultr
2. **Cloud** - AWS, Google Cloud, Azure
3. **PaaS** - Heroku (backend), Vercel (frontend)
4. **Self-hosted** - Your own server
5. **Docker** - Any platform supporting containers

See DEPLOYMENT.md for detailed guides.

### What's the cheapest way to deploy?

**Option 1: Minimal VPS ($5/month)**
- Small VPS (1GB RAM)
- Self-host MongoDB + Redis
- Free SSL (Let's Encrypt)
- Cloudflare for CDN

**Option 2: Free Tier (Limited)**
- MongoDB Atlas (free tier)
- Redis Cloud (free tier)
- Vercel (frontend, free)
- Heroku (backend, limited free hours)

**Limitations:** Free tiers have limits and may not support Puppeteer.

### Can I use managed databases?

Yes! Recommended for production:

**MongoDB:**
- MongoDB Atlas
- AWS DocumentDB
- DigitalOcean Managed MongoDB

**Redis:**
- Redis Cloud
- AWS ElastiCache
- DigitalOcean Managed Redis

Update connection strings in `.env`.

---

## Errors & Issues

### "Module not found" errors

**Solutions:**
1. Delete `node_modules`: `rm -rf node_modules`
2. Reinstall: `npm install`
3. Check Node.js version: `node --version`
4. Clear npm cache: `npm cache clean --force`

### "Port already in use"

**Solutions:**
1. Change port in `.env` (backend) or `vite.config.js` (frontend)
2. Kill process using port:
   ```bash
   # Linux/macOS
   lsof -ti:3000 | xargs kill
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <pid> /F
   ```

### "Authentication failed" on API calls

**Solutions:**
1. Check token in localStorage
2. Verify JWT_SECRET is same across restarts
3. Token may have expired (login again)
4. Check Authorization header format: `Bearer <token>`

### Browser opens but doesn't fill forms

**Solutions:**
1. Check website hasn't changed structure
2. Update selectors in code
3. Check JavaScript console for errors
4. Try extension popup manual fill
5. Some sites may block automation

---

## Performance Questions

### How fast can I report domains?

**Sequential processing:**
- 1 domain × 5 services = 5 jobs
- ~30-40 seconds per job (user time for captcha)
- ~3-5 minutes per domain total

**Parallel processing:**
- Multiple tabs open
- User completes captchas in parallel
- Faster but requires more attention

### Can I process reports in background?

**Semi-background:**
- Jobs queue automatically
- Browser opens in foreground
- User must be present for captchas

**Full background:** Not possible due to captcha requirement.

### How do I optimize performance?

1. Add database indexes
2. Use SSD storage
3. Increase RAM (for Puppeteer)
4. Use managed databases (faster)
5. Enable compression
6. Add caching layer
7. Optimize queries

---

## Customization

### Can I change the UI theme?

Yes! Edit `frontend/src/App.jsx`:

```javascript
<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#your-color',  // Primary color
      borderRadius: 6,                // Border radius
      // ... more tokens
    },
  }}
>
```

Or use Ant Design's built-in themes.

### Can I add custom fields to domains?

Yes:

1. Update domain schema:
```typescript
@Prop()
customField: string;
```

2. Update DTOs
3. Update frontend forms
4. Run migration (if needed)

### Can I white-label this tool?

Yes! Under MIT license you can:
- Change branding
- Modify UI completely
- Add your logo
- Remove attribution
- Deploy as your own product

---

## Maintenance

### How often should I update?

**Dependencies:**
- Security updates: Immediately
- Minor updates: Monthly
- Major updates: Quarterly

**Application:**
- Bug fixes: As needed
- Features: As needed

### How do I backup data?

**MongoDB:**
```bash
mongodump --uri="..." --out=/backups/
```

**Redis:**
```bash
redis-cli SAVE
cp /var/lib/redis/dump.rdb /backups/
```

See DEPLOYMENT.md for automated backup scripts.

### What data should I backup?

**Critical:**
- MongoDB database (all collections)
- `.env` file (secrets)
- Custom configurations

**Optional:**
- Redis queue data
- Application logs
- Chrome extension config

---

## Limits & Constraints

### What are the limitations?

**By design:**
- User must complete captchas
- User must submit forms manually
- No fully automated reporting
- No captcha bypass

**Technical:**
- Memory usage (Puppeteer)
- Browser tab limits
- User time required
- Service rate limits

### How many reports per day?

**No hard limit** in the tool, but:
- Report services may have rate limits
- User time is bottleneck (captchas)
- Email accounts may be limited
- Ethical considerations

**Realistic:**
- Small scale: 10-50 reports/day
- Medium scale: 50-200 reports/day
- Large scale: 200-500 reports/day

Depends on:
- Number of services
- User availability
- Account pool size
- Service rate limits

---

## Legal & Ethical

### Is it legal to automate form filling?

**Generally yes**, for legitimate purposes:
- The tool doesn't bypass security
- User completes critical steps (captcha, submit)
- Reports are legitimate
- Complies with ToS (when used properly)

**Consult legal counsel** for your specific jurisdiction.

### What should I NOT do with this tool?

**Prohibited uses:**
- ❌ Submit false reports
- ❌ Harass legitimate websites
- ❌ Bypass captchas automatically
- ❌ Violate terms of service
- ❌ Automate malicious reporting
- ❌ Overwhelm reporting services
- ❌ Submit spam reports

### What should I DO with this tool?

**Legitimate uses:**
- ✅ Report actual phishing sites
- ✅ Report malware distribution
- ✅ Report copyright violations
- ✅ Report spam domains
- ✅ Report scam websites
- ✅ Protect users from abuse
- ✅ Maintain internet safety

---

## Future Features

### What's on the roadmap?

**Planned features:**
- CSV export
- Schedule reports
- Custom service templates
- API webhooks
- Better analytics
- Mobile app
- Multi-language support

**Community requested:**
- Submit feature requests via issues
- Vote on existing requests
- Contribute pull requests

### Can I sponsor development?

The project is open-source. You can:
- Contribute code
- Report bugs
- Improve documentation
- Share with others
- Star the repository

---

## Getting Help

### Where can I get support?

1. **Documentation:**
   - README.md
   - SETUP_GUIDE.md
   - DEPLOYMENT.md
   - ARCHITECTURE.md

2. **GitHub Issues:**
   - Search existing issues
   - Create new issue
   - Provide details

3. **Community:**
   - Discussions tab
   - Stack Overflow (tag: domain-abuse-tool)

4. **Code:**
   - Read inline comments
   - Check module READMEs
   - Review examples

### How do I ask for help?

**Good question includes:**
1. What you're trying to do
2. What you expected
3. What actually happened
4. Error messages/logs
5. Environment details (OS, Node version, etc.)
6. Steps to reproduce

**Bad question:**
- "It doesn't work"
- "Help!"
- "Error in backend"

### Can I hire someone to setup/customize?

Yes! You can:
- Hire a developer familiar with NestJS/React
- Post on freelance platforms
- Contact consultants
- Engage agencies

The code is well-documented to facilitate this.

---

## Best Practices

### Recommended workflow

1. **Start small:** Test with 5-10 domains
2. **Monitor results:** Check logs and success rate
3. **Scale gradually:** Increase batch size
4. **Rotate accounts:** Use multiple emails
5. **Review regularly:** Check for banned accounts
6. **Stay updated:** Keep dependencies current
7. **Backup data:** Regular backups

### Tips for efficient reporting

1. Use templates for consistent messaging
2. Add domains in batches
3. Use bulk import for large lists
4. Monitor queue to avoid overload
5. Process during low-traffic hours
6. Keep browser focused for captchas
7. Review failed reports and retry

### Common mistakes to avoid

- ❌ Not reading documentation
- ❌ Skipping environment configuration
- ❌ Not backing up data
- ❌ Reporting legitimate sites
- ❌ Ignoring rate limits
- ❌ Running headless without handling captchas
- ❌ Not monitoring logs

---

## Still have questions?

1. Check the documentation files
2. Search GitHub issues
3. Review code comments
4. Create a new issue with details

## Quick Reference

**Need to:**
- Setup? → SETUP_GUIDE.md
- Deploy? → DEPLOYMENT.md
- Understand? → ARCHITECTURE.md
- Test API? → API_TESTING.md
- See features? → FEATURES.md
- Install? → INSTALL.md
- Visual workflows? → WORKFLOW.md
