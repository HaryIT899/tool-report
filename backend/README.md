# Domain Abuse Backend

Production-ready NestJS backend with browser automation, job queuing, and email rotation for domain abuse reporting.

## Tech Stack

- **NestJS** v10 - Progressive Node.js framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **BullMQ** - Job queue system
- **Redis** - Queue storage
- **Puppeteer** - Browser automation
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **WHOIS** - Domain information lookup

## Architecture

### Clean Architecture Pattern

```
backend/
├── src/
│   ├── auth/                    # Authentication & authorization
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   └── *.module.ts
│   │
│   ├── users/                   # User management
│   │   ├── schemas/
│   │   └── *.service.ts
│   │
│   ├── domains/                 # Domain CRUD + bulk import
│   │   ├── schemas/
│   │   ├── dto/
│   │   └── *.controller.ts
│   │
│   ├── accounts/                # Email account rotation
│   │   ├── schemas/
│   │   └── *.service.ts
│   │
│   ├── reports/                 # Report orchestration
│   │   └── *.service.ts         # Coordinates reporting flow
│   │
│   ├── report-services/         # Service definitions
│   │   ├── schemas/
│   │   └── *.service.ts         # CRUD + seeding
│   │
│   ├── report-logs/             # Report history & tracking
│   │   ├── schemas/
│   │   └── *.service.ts
│   │
│   ├── templates/               # Abuse description templates
│   │   └── *.service.ts
│   │
│   ├── whois/                   # WHOIS lookup & detection
│   │   └── *.service.ts
│   │
│   ├── puppeteer/               # Browser automation
│   │   └── puppeteer.service.ts # Non-headless browser control
│   │
│   ├── queues/                  # BullMQ configuration
│   │   ├── report.queue.ts      # Queue definitions
│   │   ├── report.processor.ts  # Job processor
│   │   └── queues.module.ts     # Queue setup
│   │
│   ├── scripts/                 # Utility scripts
│   │   └── seed.ts              # Database seeding
│   │
│   ├── app.module.ts            # Root module
│   └── main.ts                  # Application entry
│
├── .env.example
├── package.json
└── tsconfig.json
```

## Installation

### Prerequisites

1. **Node.js** v18+
   ```bash
   node --version
   ```

2. **MongoDB** v6+
   ```bash
   mongod --version
   ```

3. **Redis** v7+
   ```bash
   redis-cli --version
   ```

### Setup Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/domain-abuse-db
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173
   PUPPETEER_HEADLESS=false
   PUPPETEER_TIMEOUT=60000
   EXTENSION_ID=your-chrome-extension-id
   ```

3. **Start services**
   
   **MongoDB:**
   ```bash
   # Windows (as service)
   net start MongoDB
   
   # Linux
   sudo systemctl start mongodb
   
   # macOS
   brew services start mongodb-community
   
   # Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

   **Redis:**
   ```bash
   # Windows (download from https://github.com/microsoftarchive/redis)
   # Or use Docker:
   docker run -d -p 6379:6379 --name redis redis:alpine
   
   # Linux
   sudo systemctl start redis
   
   # macOS
   brew services start redis
   ```

4. **Seed database**
   ```bash
   npm run seed
   ```

5. **Start development server**
   ```bash
   npm run start:dev
   ```

   Server runs on: `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |

### Domains

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/domains` | Get all user domains | Yes |
| POST | `/api/domains` | Create single domain | Yes |
| POST | `/api/domains/bulk-import` | Bulk import domains | Yes |
| PATCH | `/api/domains/:id` | Update domain | Yes |
| DELETE | `/api/domains/:id` | Delete domain | Yes |

### Reports

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/reports/domain/:id` | Queue reports for domain | Yes |
| POST | `/api/reports/all` | Queue all pending domains | Yes |
| GET | `/api/reports/queue-stats` | Get queue statistics | Yes |

### Report Services

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/report-services` | Get all services | Yes |

### Report Logs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/report-logs` | Get user report history | Yes |
| GET | `/api/report-logs/stats` | Get statistics | Yes |
| GET | `/api/report-logs/domain/:id` | Get domain logs | Yes |

### Accounts

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/accounts` | Get all email accounts | Yes |
| POST | `/api/accounts` | Create account | Yes |
| PATCH | `/api/accounts/:id` | Update account | Yes |
| DELETE | `/api/accounts/:id` | Delete account | Yes |
| POST | `/api/accounts/reset-stats` | Reset usage stats | Yes |

### Templates

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/templates` | Get abuse templates | No |

### WHOIS

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/whois/lookup?domain=x` | WHOIS lookup | Yes |
| GET | `/api/whois/suggestions?domain=x` | Get suggested services | Yes |

## Modules

### Auth Module
- User registration with validation
- Login with JWT token generation
- Password hashing with bcrypt (10 rounds)
- JWT strategy for protected routes

### Domains Module
- CRUD operations for domains
- Bulk import (CSV/text)
- Status tracking (pending → processing → reported/failed)
- Progress tracking per domain
- Template support

### Accounts Module
- Email account management
- Automatic rotation (least-used first)
- Usage tracking
- Status management (active/banned/inactive)

### Reports Module
- Orchestrates report submission
- Queues BullMQ jobs
- Coordinates with Puppeteer service
- Updates domain status

### Report Services Module
- Manages report service definitions
- Seed default services
- Type classification (manual/autofill_supported)

### Report Logs Module
- Tracks all report attempts
- Links domain, service, account, and user
- Status tracking with error messages
- Statistics aggregation

### Templates Module
- Pre-defined abuse descriptions
- 6 default templates (phishing, malware, spam, etc.)
- Easy template selection

### WHOIS Module
- Domain registration info lookup
- Registrar detection
- Nameserver identification
- Suggests relevant report services

### Puppeteer Module
- Browser automation service
- Non-headless mode (user sees browser)
- Auto-fill form fields
- Waits for manual captcha completion

### Queues Module
- BullMQ configuration
- Redis connection
- Job processor
- Queue management

## BullMQ Job Queue

### Queue Configuration

```typescript
// Redis connection
{
  host: 'localhost',
  port: 6379,
  password: '',
}

// Job options
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
}
```

### Job Processing Flow

1. **Job Creation**: `ReportsService.reportDomain()`
2. **Queue**: Job added to Redis
3. **Processing**: `ReportProcessor.process()`
4. **Execution**: Puppeteer opens browser
5. **Logging**: Status saved to ReportLog
6. **Completion**: Domain status updated

### Monitoring Jobs

```bash
# Using BullMQ Board (optional)
npm install -g bullmq-board
bullmq-board --redis localhost --port 6379
```

## Puppeteer Automation

### Configuration

```typescript
// Non-headless mode (user sees browser)
puppeteer.launch({
  headless: false,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--start-maximized',
  ],
  defaultViewport: null,
})
```

### Form Filling Strategy

The service uses multiple selector patterns to find form fields:

**Domain/URL fields:**
- `input[name="url"]`
- `input[type="url"]`
- `input[name="domain"]`
- `#url`, `#domain`

**Reason/Description fields:**
- `textarea[name="description"]`
- `textarea[name="reason"]`
- `#description`, `#reason`

**Email fields:**
- `input[type="email"]`
- `input[name="email"]`
- `#email`

### Browser Lifecycle

- Browser launches on first job
- Stays open for multiple jobs
- Closes on application shutdown
- Auto-restart if connection lost

## Email Rotation

### Algorithm

```typescript
// Get least recently used active account
const account = await accountModel
  .findOne({ status: 'active' })
  .sort({ lastUsedAt: 1, reportCount: 1 })
  .exec();

// Update usage
account.lastUsedAt = new Date();
account.reportCount += 1;
await account.save();
```

### Account Management

**Add accounts:**
```bash
POST /api/accounts
{
  "email": "reporter1@example.com"
}
```

**Mark as banned:**
```bash
PATCH /api/accounts/:id
{
  "status": "banned"
}
```

**Reset statistics:**
```bash
POST /api/accounts/reset-stats
```

## Seeding Database

The seed script populates default report services:

```bash
npm run seed
```

Creates:
- Google Spam Report
- Google Phishing Report
- Google DMCA
- Cloudflare Abuse
- Radix Abuse

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3000 | No |
| NODE_ENV | Environment | development | No |
| MONGODB_URI | MongoDB connection | mongodb://localhost:27017/domain-abuse-db | Yes |
| REDIS_HOST | Redis host | localhost | Yes |
| REDIS_PORT | Redis port | 6379 | Yes |
| REDIS_PASSWORD | Redis password | - | No |
| JWT_SECRET | JWT signing key | - | Yes |
| JWT_EXPIRES_IN | Token expiration | 7d | No |
| CORS_ORIGIN | Allowed origin | http://localhost:5173 | Yes |
| PUPPETEER_HEADLESS | Headless mode | false | No |
| PUPPETEER_TIMEOUT | Page timeout (ms) | 60000 | No |
| EXTENSION_ID | Chrome extension ID | - | No |

## Testing

### Manual Testing

```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'

# Test domain creation
curl -X POST http://localhost:3000/api/domains \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"domain":"evil.com","reason":"Phishing"}'
```

### Redis Queue Inspection

```bash
# Connect to Redis CLI
redis-cli

# List all keys
KEYS *

# Check queue length
LLEN bull:report-queue:wait

# View job data
HGETALL bull:report-queue:job-id
```

## Production Deployment

### Build

```bash
npm run build
```

### Environment

Ensure production settings:
```env
NODE_ENV=production
JWT_SECRET=strong-random-64-char-string
MONGODB_URI=mongodb://user:pass@host:port/db?authSource=admin
REDIS_HOST=production-redis-host
REDIS_PASSWORD=strong-redis-password
CORS_ORIGIN=https://yourdomain.com
PUPPETEER_HEADLESS=false
```

### Process Management

Use PM2 for production:

```bash
npm install -g pm2

# Start
pm2 start dist/main.js --name domain-abuse-api

# Monitor
pm2 monit

# Logs
pm2 logs

# Restart
pm2 restart domain-abuse-api
```

### Docker Support (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
```

## Security Best Practices

1. **Never commit `.env` file**
2. **Use strong JWT secrets** (64+ characters)
3. **Enable MongoDB authentication** in production
4. **Use Redis password** in production
5. **Implement rate limiting** for API endpoints
6. **Validate all user inputs** (already implemented)
7. **Keep dependencies updated**

## Monitoring

### Health Checks

Add health endpoint (optional):
```typescript
@Get('health')
async health() {
  return { status: 'ok', timestamp: new Date() };
}
```

### Logging

Configure Winston or use NestJS Logger:
```typescript
this.logger.log('Processing job');
this.logger.error('Job failed', error);
this.logger.warn('Rate limit approaching');
```

## Common Issues

### MongoDB Connection Failed
```bash
# Check MongoDB is running
mongosh
# Or
mongo

# Check connection string in .env
# Ensure authentication if enabled
```

### Redis Connection Failed
```bash
# Test Redis
redis-cli ping
# Should return: PONG

# Check .env settings
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Puppeteer Won't Launch
```bash
# Install Chrome/Chromium
# Linux: sudo apt-get install chromium-browser
# Check permissions
# Set PUPPETEER_HEADLESS=false in .env
```

### Jobs Not Processing
```bash
# Check Redis queue
redis-cli
> LLEN bull:report-queue:wait

# Check worker is running
# Restart application
npm run start:dev
```

## Performance Tuning

### Database Indexes

Add indexes for better query performance:
```typescript
// In domain.schema.ts
@Index({ createdBy: 1, status: 1 })
@Index({ domain: 1 })

// In report-log.schema.ts
@Index({ userId: 1, createdAt: -1 })
@Index({ domainId: 1 })
```

### Queue Concurrency

Adjust in `report.processor.ts`:
```typescript
@Processor(REPORT_QUEUE, { concurrency: 3 })
```

### Connection Pooling

MongoDB connection pooling is automatic with Mongoose.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Start production build |
| `npm run start:dev` | Development with hot-reload |
| `npm run start:debug` | Debug mode |
| `npm run build` | Build for production |
| `npm run seed` | Seed report services |
| `npm run lint` | Lint TypeScript files |
| `npm run format` | Format with Prettier |

## Advanced Features

### Email Rotation

```typescript
// Automatically selects least-used active email
const account = await accountsService.getNextAvailableAccount();
```

### WHOIS Detection

```typescript
// Detect infrastructure and suggest services
const whoisInfo = await whoisService.lookup('example.com');
const suggestions = await whoisService.detectSuggestedServices('example.com');
```

### Bulk Import

Supports multiple formats:
- Newline-separated: `domain1.com\ndomain2.com`
- Comma-separated: `domain1.com, domain2.com`
- CSV format: `domain,reason\ndomain1.com,phishing`

### Job Retries

Failed jobs automatically retry with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 5 seconds delay
- Attempt 3: 25 seconds delay (5s * 5)

## Maintenance

### Clear Old Logs

```typescript
// Add scheduled task (optional)
import { Cron } from '@nestjs/schedule';

@Cron('0 0 * * 0') // Weekly
async cleanOldLogs() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await this.reportLogModel.deleteMany({
    createdAt: { $lt: thirtyDaysAgo }
  });
}
```

### Database Backup

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/domain-abuse-db" --out=/backup/

# MongoDB restore
mongorestore --uri="mongodb://localhost:27017/domain-abuse-db" /backup/domain-abuse-db/
```

### Redis Backup

```bash
# Redis saves automatically (if configured)
# Manual save:
redis-cli SAVE
```

## Extending the System

### Adding New Report Service

1. Add to seed script:
   ```typescript
   {
     name: 'New Service',
     reportUrl: 'https://example.com/report',
     type: 'autofill_supported',
     active: true,
   }
   ```

2. Update Chrome extension `manifest.json`:
   ```json
   "https://example.com/*"
   ```

3. Add selectors to content script if needed

### Custom Job Processors

Create new processor:
```typescript
@Processor('custom-queue')
export class CustomProcessor extends WorkerHost {
  async process(job: Job) {
    // Custom logic
  }
}
```

## License

MIT
