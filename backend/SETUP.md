# Backend Setup Guide

## Prerequisites

- Node.js 18+
- MongoDB 5.0+
- Redis 6.0+

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
# Server
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/domain-abuse

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Puppeteer
PUPPETEER_HEADLESS=false
PUPPETEER_TIMEOUT=60000

# Chrome Extension (optional)
EXTENSION_ID=your-extension-id
```

### 3. Start MongoDB

```bash
# Windows
mongod

# Linux/Mac
sudo systemctl start mongod
```

### 4. Start Redis

```bash
# Windows
redis-server

# Linux/Mac
sudo systemctl start redis
```

### 5. Seed Database

```bash
# Seed all data (services, accounts, proxies)
npm run seed:all

# Or seed individually
npm run seed          # Report services
npm run seed:accounts # Email accounts
npm run seed:proxies  # Proxy servers
```

### 6. Start Backend

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Domains
- `GET /domains` - List all domains
- `POST /domains` - Add domain
- `POST /domains/bulk-import` - Bulk import
- `PATCH /domains/:id` - Update domain
- `DELETE /domains/:id` - Delete domain

### Reports
- `POST /reports/domain/:id` - Report single domain
- `POST /reports/all` - Report all pending domains
- `GET /reports/queue-stats` - Get queue statistics
- `POST /reports/queue/pause` - Pause queue
- `POST /reports/queue/resume` - Resume queue
- `POST /reports/queue/clean` - Clean completed/failed jobs

### Proxies
- `GET /proxies` - List all proxies
- `POST /proxies` - Add proxy
- `PATCH /proxies/:id` - Update proxy status
- `DELETE /proxies/:id` - Delete proxy
- `POST /proxies/reset-stats` - Reset usage stats

### Accounts
- `GET /accounts` - List email accounts
- `POST /accounts` - Add account
- `PATCH /accounts/:id` - Update account status
- `DELETE /accounts/:id` - Delete account

### Report Logs
- `GET /report-logs` - List all logs
- `GET /report-logs/stats` - Get statistics
- `GET /report-logs/domain/:id` - Get logs for domain

### Templates
- `GET /templates` - List abuse templates

### WHOIS
- `GET /whois/lookup?domain=example.com` - Lookup domain
- `GET /whois/suggestions?domain=example.com` - Get suggested services

## Advanced Features

### Proxy Rotation
- Automatic proxy rotation per job
- Proxy failure detection (3 strikes = banned)
- LRU (Least Recently Used) algorithm

### Anti-Detection
- puppeteer-extra with stealth plugin
- Random user agents
- Human-like behavior simulation
- Random delays and scrolling
- Non-headless browser mode

### Queue Management
- BullMQ with Redis
- Configurable concurrency
- Retry mechanism (3 attempts with exponential backoff)
- Pause/Resume/Clean controls

### Screenshot Capture
- Automatic screenshots saved to `screenshots/` folder
- Viewable in report logs

## Troubleshooting

### Redis Connection Error
```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG
```

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongo --eval "db.runCommand({ connectionStatus: 1 })"
```

### Puppeteer Issues
```bash
# Linux: Install Chromium dependencies
sudo apt-get install -y \
  libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
  libgbm1 libasound2 libxrandr2 libxcomposite1 \
  libxdamage1 libxfixes3 libxshmfence1

# Set environment variable
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
npm install puppeteer
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=3001
```

## Production Deployment

### Using PM2

```bash
npm install -g pm2
npm run build
pm2 start dist/main.js --name domain-abuse-backend
pm2 save
pm2 startup
```

### Using Docker

```bash
docker build -t domain-abuse-backend .
docker run -p 3000:3000 --env-file .env domain-abuse-backend
```

## Security Recommendations

1. Change JWT_SECRET in production
2. Enable MongoDB authentication
3. Set Redis password
4. Use HTTPS/SSL
5. Enable rate limiting
6. Set up firewall rules
7. Regular security updates

## Performance Tips

1. Add MongoDB indexes:
```javascript
db.domains.createIndex({ status: 1, createdBy: 1 });
db.report_logs.createIndex({ domainId: 1, createdAt: -1 });
db.proxies.createIndex({ status: 1, lastUsedAt: 1 });
```

2. Adjust Redis memory:
```bash
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

3. Configure BullMQ concurrency in `reports.service.ts`:
```typescript
await this.reportQueue.add('report-domain', jobData, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  // Limit concurrent jobs
  limiter: { max: 2, duration: 1000 }
});
```

## Monitoring

Check queue stats:
```bash
curl http://localhost:3000/reports/queue-stats
```

View logs:
```bash
# Development
tail -f logs/development.log

# Production with PM2
pm2 logs domain-abuse-backend
```

## Support

For issues:
1. Check logs in `logs/` folder
2. Verify all services are running (MongoDB, Redis)
3. Check `.env` configuration
4. Review API endpoint responses
