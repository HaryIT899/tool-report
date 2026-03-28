# Production Deployment Guide

Complete guide for deploying the Domain Abuse Report Tool to production.

## Pre-Deployment Checklist

### Code Preparation

- [ ] All tests passing
- [ ] Linting errors fixed
- [ ] Dependencies up to date
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Git repository clean

### Environment Preparation

- [ ] Production database setup (MongoDB)
- [ ] Production cache setup (Redis)
- [ ] Domain name registered
- [ ] SSL certificate obtained
- [ ] Server/hosting provisioned
- [ ] Backup strategy defined

### Configuration

- [ ] Strong JWT secret generated (64+ chars)
- [ ] Production database credentials
- [ ] Production Redis credentials
- [ ] CORS origin updated
- [ ] Environment variables secured
- [ ] Secrets management configured

---

## Deployment Options

## Option 1: Traditional VPS Deployment

### Requirements

- Ubuntu 20.04+ or similar Linux distribution
- 2GB+ RAM
- 20GB+ storage
- Root access

### Step 1: Server Setup

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Redis
sudo apt-get install redis-server -y
sudo systemctl start redis
sudo systemctl enable redis

# Install Nginx
sudo apt-get install nginx -y

# Install PM2
sudo npm install -g pm2

# Install build tools
sudo apt-get install build-essential -y
```

### Step 2: Clone & Setup Backend

```bash
# Create app directory
sudo mkdir -p /var/www/domain-abuse
sudo chown -R $USER:$USER /var/www/domain-abuse
cd /var/www/domain-abuse

# Clone or upload code
# Assuming code is uploaded to /var/www/domain-abuse

# Backend setup
cd backend
npm ci --only=production

# Create .env
nano .env
```

**Production .env:**
```env
PORT=3000
NODE_ENV=production

MONGODB_URI=mongodb://localhost:27017/domain-abuse-db
REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-super-secure-64-character-random-string-here-change-this
JWT_EXPIRES_IN=7d

CORS_ORIGIN=https://yourdomain.com

PUPPETEER_HEADLESS=false
PUPPETEER_TIMEOUT=60000
```

```bash
# Build backend
npm run build

# Seed database
npm run seed:all

# Start with PM2
pm2 start dist/main.js --name domain-abuse-api
pm2 save
pm2 startup
```

### Step 3: Setup Frontend

```bash
cd /var/www/domain-abuse/frontend

# Update API URL in src/services/api.js
nano src/services/api.js
# Change baseURL to: https://yourdomain.com/api

# Install and build
npm ci
npm run build

# Copy build to Nginx directory
sudo mkdir -p /var/www/html/domain-abuse
sudo cp -r dist/* /var/www/html/domain-abuse/
```

### Step 4: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/domain-abuse
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/html/domain-abuse;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/domain-abuse /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 5: SSL Certificate

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

### Step 6: Firewall

```bash
# Configure UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Step 7: Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs domain-abuse-api

# System monitoring
htop
```

---

## Option 2: Docker Deployment

### Step 1: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose -y
```

### Step 2: Update Configuration

**docker-compose.yml** (already created):
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    ...
  redis:
    image: redis:alpine
    ...
  backend:
    build: ./backend
    ...
```

Update environment variables in `docker-compose.yml`

### Step 3: Build & Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Step 4: Nginx Reverse Proxy

Configure Nginx on host to proxy to Docker containers.

---

## Option 3: Cloud Platform Deployment

### AWS Deployment

**Services Used:**
- EC2 (backend)
- DocumentDB (MongoDB)
- ElastiCache (Redis)
- S3 + CloudFront (frontend)
- Route53 (DNS)
- Certificate Manager (SSL)

**Steps:**
1. Launch EC2 instance
2. Setup DocumentDB cluster
3. Setup ElastiCache Redis
4. Deploy backend to EC2
5. Build frontend and upload to S3
6. Configure CloudFront distribution
7. Setup Route53 DNS
8. Configure security groups

### DigitalOcean Deployment

**Droplet Setup:**
```bash
# Create droplet (Ubuntu 22.04)
# Follow VPS deployment steps above
```

**Managed Databases:**
- Use DigitalOcean Managed MongoDB
- Use DigitalOcean Managed Redis
- Update connection strings in .env

### Heroku Deployment (Backend)

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create domain-abuse-api

# Add MongoDB add-on
heroku addons:create mongodb:sandbox

# Add Redis add-on
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-frontend.com

# Deploy
git push heroku main

# Run seed
heroku run npm run seed:all
```

### Vercel Deployment (Frontend)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel

# Production
vercel --prod
```

### Netlify Deployment (Frontend)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
cd frontend
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

---

## Environment Variables (Production)

### Backend

```env
# REQUIRED
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://user:pass@host:port/database?authSource=admin
REDIS_HOST=production-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=strong-redis-password
JWT_SECRET=very-long-random-string-64-chars-minimum-use-strong-generator
CORS_ORIGIN=https://yourdomain.com

# OPTIONAL
JWT_EXPIRES_IN=7d
PUPPETEER_HEADLESS=false
PUPPETEER_TIMEOUT=60000
EXTENSION_ID=chrome-extension-id
```

### Generate Secure Secrets

```bash
# JWT Secret (64 bytes)
openssl rand -base64 64

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Or online: https://www.random.org/strings/
```

---

## Database Setup (Production)

### MongoDB

**Authentication:**
```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "strong-password-here",
  roles: ["root"]
})

# Create application user
use domain-abuse-db
db.createUser({
  user: "appuser",
  pwd: "app-password-here",
  roles: ["readWrite"]
})
```

**Connection String:**
```
mongodb://appuser:app-password-here@localhost:27017/domain-abuse-db?authSource=domain-abuse-db
```

**Indexes:**
```javascript
use domain-abuse-db

// Domains
db.domains.createIndex({ createdBy: 1, status: 1 })
db.domains.createIndex({ domain: 1 })
db.domains.createIndex({ createdAt: -1 })

// Report Logs
db.reportlogs.createIndex({ userId: 1, createdAt: -1 })
db.reportlogs.createIndex({ domainId: 1 })
db.reportlogs.createIndex({ status: 1 })

// Users
db.users.createIndex({ username: 1 })
db.users.createIndex({ email: 1 })

// Accounts
db.accounts.createIndex({ email: 1 })
db.accounts.createIndex({ status: 1, lastUsedAt: 1 })
```

### Redis

**Configuration:**
```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Set password
requirepass your-strong-redis-password

# Bind to localhost (if on same server)
bind 127.0.0.1

# Enable persistence
appendonly yes

# Restart
sudo systemctl restart redis
```

---

## Security Hardening

### Backend Security

1. **Rate Limiting**

Install throttler:
```bash
npm install @nestjs/throttler
```

Add to `app.module.ts`:
```typescript
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 10,
})
```

2. **Helmet (Security Headers)**

```bash
npm install helmet
```

In `main.ts`:
```typescript
import helmet from 'helmet';
app.use(helmet());
```

3. **CORS Strictness**

In `main.ts`:
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### Database Security

- Enable authentication
- Use strong passwords
- Restrict network access
- Regular backups
- Encryption at rest

### Redis Security

- Set strong password
- Bind to localhost only
- Disable dangerous commands
- Enable persistence

### Server Security

```bash
# Automatic security updates
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Fail2ban
sudo apt-get install fail2ban
sudo systemctl enable fail2ban

# SSH hardening
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

---

## Monitoring & Logging

### Application Monitoring

**PM2 Dashboard:**
```bash
pm2 plus
# Follow instructions to connect
```

**Custom Monitoring:**
```bash
# Install monitoring tool
npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Log Management

**Backend Logs:**
```bash
# PM2 logs
pm2 logs domain-abuse-api

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo journalctl -u mongod -f
```

**Log Rotation:**
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/domain-abuse

/var/log/domain-abuse/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### Monitoring Tools

**Recommended:**
- **PM2 Plus** - Process monitoring
- **New Relic** - APM
- **DataDog** - Infrastructure monitoring
- **Sentry** - Error tracking
- **Prometheus + Grafana** - Metrics

---

## Backup Strategy

### MongoDB Backup

**Automated Backup Script:**
```bash
#!/bin/bash
# save as /usr/local/bin/backup-mongodb.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
DB_NAME="domain-abuse-db"

mkdir -p $BACKUP_DIR

mongodump \
  --uri="mongodb://appuser:password@localhost:27017/$DB_NAME?authSource=$DB_NAME" \
  --out="$BACKUP_DIR/$TIMESTAMP"

# Compress
tar -czf "$BACKUP_DIR/$TIMESTAMP.tar.gz" "$BACKUP_DIR/$TIMESTAMP"
rm -rf "$BACKUP_DIR/$TIMESTAMP"

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $TIMESTAMP.tar.gz"
```

**Schedule with Cron:**
```bash
# Edit crontab
crontab -e

# Add line (daily at 2 AM)
0 2 * * * /usr/local/bin/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

### Redis Backup

Redis automatically saves to disk (if configured):
```bash
# Trigger manual save
redis-cli SAVE

# Backup RDB file
cp /var/lib/redis/dump.rdb /backups/redis/dump-$(date +%Y%m%d).rdb
```

### Application Backup

```bash
# Backup application files
tar -czf /backups/app/domain-abuse-$(date +%Y%m%d).tar.gz /var/www/domain-abuse

# Backup environment
cp /var/www/domain-abuse/backend/.env /backups/config/.env-$(date +%Y%m%d)
```

---

## SSL/TLS Setup

### Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (configured automatically)
sudo certbot renew --dry-run
```

### Custom Certificate

If you have your own certificate:
```bash
# Copy certificate files
sudo cp certificate.crt /etc/ssl/certs/
sudo cp private.key /etc/ssl/private/
sudo cp ca-bundle.crt /etc/ssl/certs/

# Update Nginx config
ssl_certificate /etc/ssl/certs/certificate.crt;
ssl_certificate_key /etc/ssl/private/private.key;
```

---

## Performance Optimization

### Backend Optimization

**1. Enable Compression:**
```typescript
// main.ts
import compression from 'compression';
app.use(compression());
```

**2. Add Caching:**
```bash
npm install cache-manager
```

**3. Database Indexes:**
See Database Setup section above

**4. Connection Pooling:**
Already configured in Mongoose

### Frontend Optimization

**1. Build Optimization:**

`vite.config.js`:
```javascript
export default defineConfig({
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd'],
        },
      },
    },
  },
});
```

**2. Nginx Caching:**

Add to Nginx config:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Redis Optimization

```bash
# Edit config
sudo nano /etc/redis/redis.conf

# Set max memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Restart
sudo systemctl restart redis
```

---

## Scaling

### Vertical Scaling

**Increase Resources:**
- More RAM for Puppeteer
- More CPU cores for workers
- Faster storage (SSD)

### Horizontal Scaling

**Load Balancer Setup:**
```nginx
upstream backend {
    least_conn;
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

**Multiple Workers:**
```bash
# Start multiple PM2 instances
pm2 start dist/main.js -i 4 --name domain-abuse-api
```

**Shared Redis:**
- All backend instances connect to same Redis
- BullMQ handles job distribution

**Shared MongoDB:**
- Replica set for high availability
- Read replicas for queries

---

## CI/CD Pipeline

### GitHub Actions Example

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Build Backend
        run: |
          cd backend
          npm ci
          npm run build
      
      - name: Build Frontend
        run: |
          cd frontend
          npm ci
          npm run build
      
      - name: Deploy to Server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          source: "backend/dist,frontend/dist"
          target: "/var/www/domain-abuse"
      
      - name: Restart Services
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/domain-abuse
            pm2 restart domain-abuse-api
            sudo systemctl reload nginx
```

---

## Health Checks

### Add Health Endpoint

`backend/src/health/health.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date(),
      mongodb: this.connection.readyState === 1 ? 'connected' : 'disconnected',
    };
  }
}
```

### Uptime Monitoring

Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake
- Custom script

**Custom Health Check Script:**
```bash
#!/bin/bash
ENDPOINT="https://yourdomain.com/api/health"
RESPONSE=$(curl -s $ENDPOINT)

if echo "$RESPONSE" | grep -q "ok"; then
    echo "Health check passed"
else
    echo "Health check failed!"
    # Send alert (email, Slack, etc.)
fi
```

---

## Disaster Recovery

### Backup Restore

**MongoDB:**
```bash
mongorestore --uri="mongodb://user:pass@host:port/db" /backups/mongodb/20240120/
```

**Redis:**
```bash
sudo systemctl stop redis
sudo cp /backups/redis/dump.rdb /var/lib/redis/
sudo chown redis:redis /var/lib/redis/dump.rdb
sudo systemctl start redis
```

**Application:**
```bash
cd /var/www
tar -xzf /backups/app/domain-abuse-20240120.tar.gz
cd domain-abuse/backend
pm2 restart domain-abuse-api
```

### Rollback Strategy

```bash
# Keep previous version
mv /var/www/domain-abuse /var/www/domain-abuse-backup
# Deploy new version
# If issues occur:
rm -rf /var/www/domain-abuse
mv /var/www/domain-abuse-backup /var/www/domain-abuse
pm2 restart domain-abuse-api
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check disk space
- Verify backups

**Weekly:**
- Review performance metrics
- Check security updates
- Audit user activity

**Monthly:**
- Update dependencies
- Rotate secrets (if policy requires)
- Review and clean old data

### Update Procedure

```bash
# Pull latest code
cd /var/www/domain-abuse
git pull

# Backend update
cd backend
npm install
npm run build
pm2 restart domain-abuse-api

# Frontend update
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/html/domain-abuse/

# Clear cache
sudo systemctl reload nginx
```

---

## Troubleshooting Production

### High Memory Usage

```bash
# Check processes
htop

# PM2 memory
pm2 monit

# Restart if needed
pm2 restart domain-abuse-api
```

### Database Connection Issues

```bash
# Check MongoDB
sudo systemctl status mongod

# Check connections
mongosh --eval "db.serverStatus().connections"

# Check logs
sudo journalctl -u mongod --since "1 hour ago"
```

### Queue Not Processing

```bash
# Check Redis
redis-cli ping

# Check queue
redis-cli
> LLEN bull:report-queue:wait
> LLEN bull:report-queue:active

# Restart backend
pm2 restart domain-abuse-api
```

---

## Cost Estimation

### VPS Hosting (DigitalOcean)

- Droplet (2GB RAM): $12/month
- Managed MongoDB: $15/month
- Managed Redis: $10/month
- Domain: $12/year
- **Total**: ~$37/month

### Cloud Hosting (AWS)

- EC2 t3.small: $15/month
- DocumentDB: $50/month
- ElastiCache: $15/month
- S3 + CloudFront: $5/month
- Route53: $1/month
- **Total**: ~$86/month

### Minimal Setup

- Shared VPS: $5/month
- Self-hosted MongoDB + Redis
- Cloudflare (free SSL/CDN)
- **Total**: ~$5/month

---

## Launch Checklist

### Pre-Launch

- [ ] All services running
- [ ] Database seeded
- [ ] Backups configured
- [ ] SSL certificate active
- [ ] Monitoring setup
- [ ] Error tracking enabled
- [ ] DNS configured
- [ ] Firewall rules set

### Launch

- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Update DNS
- [ ] Test all features
- [ ] Monitor logs
- [ ] Check performance

### Post-Launch

- [ ] Monitor for 24 hours
- [ ] Check error rates
- [ ] Verify backups
- [ ] Test disaster recovery
- [ ] Document any issues
- [ ] Plan improvements

---

## Support & Maintenance

### Getting Help

- Review logs first
- Check health endpoints
- Test database connections
- Verify environment variables
- Check firewall rules
- Review recent changes

### Emergency Contacts

Document:
- Server provider support
- Database administrator
- DevOps engineer
- System administrator

---

## Rollback Plan

If deployment fails:

1. **Identify issue** (logs, monitoring)
2. **Assess severity** (critical vs minor)
3. **Decision**: Fix forward or rollback
4. **Rollback** (if needed):
   ```bash
   pm2 stop domain-abuse-api
   cd /var/www/domain-abuse
   git checkout previous-stable-tag
   cd backend && npm install && npm run build
   pm2 start domain-abuse-api
   ```
5. **Verify** rollback worked
6. **Post-mortem** analysis

---

## Production Deployment Complete! 🚀

Your Domain Abuse Report Tool is now live and ready to handle production traffic.
