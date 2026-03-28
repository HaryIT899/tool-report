# Domain Abuse Report Management System

A production-ready full-stack application for semi-automated domain abuse reporting with browser automation, job queuing, and Chrome extension support.

## Overview

This system helps users efficiently manage and report abusive domains to multiple services including Google Safe Browsing, Cloudflare, and others. It features semi-automated form filling while respecting captcha requirements and user verification.

## Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **BullMQ** - Job queue for background processing
- **Redis** - Queue storage and caching
- **JWT** - Secure authentication
- **Puppeteer** - Browser automation (non-headless)
- **WHOIS** - Domain information detection

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool
- **Ant Design** - Professional UI components
- **React Router** - Client-side routing
- **Axios** - HTTP client

### Browser Automation
- **Puppeteer** - Automated form filling
- **Chrome Extension** - Cross-tab autofill support

## Key Features

### 🔐 Authentication & Security
- User registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- Secure API endpoints

### 📊 Domain Management
- Add individual domains
- **Bulk import** via CSV or text (comma/newline separated)
- Track domain status (pending/processing/reported/failed)
- Delete domains
- Progress tracking per domain

### 🤖 Semi-Automated Reporting
- **BullMQ job queue** for background processing
- **Puppeteer browser automation** (non-headless mode)
- Auto-fill forms on report websites
- **User completes captcha manually** (no bypass)
- Multi-tab reporting support

### 📧 Email Account Rotation
- Manage multiple reporting email accounts
- Automatic rotation to prevent rate limiting
- Track usage statistics
- Ban/activate accounts

### 📝 Report Templates
- Pre-defined abuse templates:
  - Phishing
  - Malware Distribution
  - Spam
  - Copyright Infringement
  - Trademark Infringement
  - Scam/Fraud
- Auto-fill descriptions

### 📈 Report Tracking
- Complete report history
- Success/failure tracking
- Service-specific logs
- Real-time queue statistics

### 🔍 WHOIS Integration
- Automatic registrar detection
- Nameserver identification
- Suggest relevant report services based on infrastructure

### 🎯 Advanced UX
- **Keyboard shortcuts** (Ctrl+Enter for Report All)
- Real-time progress indicators
- Queue status monitoring
- Sidebar with statistics
- Report logs drawer

### 🧩 Chrome Extension
- Auto-fill forms across multiple tabs
- Content script injection
- Manual fill popup interface
- Supported on all major abuse report sites

## Project Structure

```
tool-report/
├── backend/                         # NestJS Backend
│   ├── src/
│   │   ├── auth/                    # Authentication module
│   │   ├── users/                   # User management
│   │   ├── domains/                 # Domain CRUD + bulk import
│   │   ├── accounts/                # Email account rotation
│   │   ├── reports/                 # Report orchestration
│   │   ├── report-services/         # Service definitions
│   │   ├── report-logs/             # Report history tracking
│   │   ├── templates/               # Abuse templates
│   │   ├── whois/                   # WHOIS detection
│   │   ├── puppeteer/               # Browser automation
│   │   ├── queues/                  # BullMQ queue & processor
│   │   └── scripts/                 # Seed scripts
│   ├── .env.example
│   └── package.json
│
├── frontend/                        # React Frontend
│   ├── src/
│   │   ├── components/              # Reusable components
│   │   ├── pages/                   # Login, Register, Dashboard
│   │   ├── services/                # API configuration
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── chrome-extension/                # Chrome Extension
│   ├── manifest.json                # Extension config
│   ├── background.js                # Service worker
│   ├── content.js                   # Content script
│   ├── popup.html                   # Popup UI
│   ├── popup.js                     # Popup logic
│   └── icons/                       # Extension icons
│
└── README.md                        # This file
```

## Prerequisites

- **Node.js** v18+ 
- **MongoDB** v6+
- **Redis** v7+
- **Chrome Browser** (for extension)
- **npm** or **yarn**

## Quick Start

### 1. Install Redis

**Windows:**
```bash
# Download from https://github.com/microsoftarchive/redis/releases
# Or use WSL/Docker
docker run -d -p 6379:6379 redis:alpine
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

### 2. Install MongoDB

**Windows:**
- Download from https://www.mongodb.com/try/download/community
- Install as a service

**Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

### 3. Setup Backend

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Seed report services
npm run seed

# Start backend
npm run start:dev
```

Backend runs on `http://localhost:3000`

### 4. Setup Frontend

```bash
cd frontend
npm install

# Start frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

### 5. Install Chrome Extension

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. Copy the extension ID
6. Update backend `.env` with the extension ID

## Environment Configuration

### Backend `.env`

```env
# Application
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/domain-abuse-db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=change-this-to-a-secure-random-string
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Puppeteer
PUPPETEER_HEADLESS=false
PUPPETEER_TIMEOUT=60000

# Chrome Extension
EXTENSION_ID=your-extension-id-here
```

## Usage Guide

### 1. Register & Login
- Navigate to `http://localhost:5173`
- Create a new account
- Login with credentials

### 2. Add Email Accounts (Optional)
- Go to Accounts section
- Add email addresses for rotation
- System will automatically rotate emails when reporting

### 3. Add Domains

**Single Domain:**
- Click "Add Domain"
- Enter domain and reason
- Optionally select a template

**Bulk Import:**
- Click "Bulk Import"
- Paste domains (one per line or comma-separated)
- Select template
- Click Import

### 4. Report Domains

**Method 1: Report Single Domain**
- Click "Report All" on a domain row
- System queues jobs for all report services
- Browser tabs open with auto-filled forms
- Complete captchas manually
- Submit forms

**Method 2: Report All Pending**
- Click "Report All Pending" button
- Or press **Ctrl+Enter** (keyboard shortcut)
- All pending domains are queued
- Browser automation starts

**Method 3: Manual Reporting**
- Click individual service buttons in sidebar
- Browser opens report URL
- Use Chrome extension popup to fill form
- Complete captcha and submit

### 5. Monitor Progress
- View real-time queue statistics in sidebar
- Check domain progress bars
- Click "Logs" to view report history
- Monitor success/failure rates

## API Documentation

### Authentication

**POST** `/api/auth/register`
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**POST** `/api/auth/login`
```json
{
  "username": "string",
  "password": "string"
}
```

### Domains

**GET** `/api/domains` - Get all user domains

**POST** `/api/domains` - Create single domain
```json
{
  "domain": "string",
  "reason": "string",
  "template": "string" (optional)
}
```

**POST** `/api/domains/bulk-import` - Bulk import
```json
{
  "domains": "domain1.com\ndomain2.com\ndomain3.com",
  "reason": "string",
  "template": "string" (optional)
}
```

**PATCH** `/api/domains/:id` - Update domain
**DELETE** `/api/domains/:id` - Delete domain

### Reports

**POST** `/api/reports/domain/:id` - Queue reports for domain
```json
{
  "serviceIds": ["service1", "service2"]
}
```

**POST** `/api/reports/all` - Queue all pending domains

**GET** `/api/reports/queue-stats` - Get queue statistics

### Report Services

**GET** `/api/report-services` - Get all services

### Report Logs

**GET** `/api/report-logs` - Get user's report history
**GET** `/api/report-logs/stats` - Get statistics
**GET** `/api/report-logs/domain/:id` - Get domain-specific logs

### Accounts

**GET** `/api/accounts` - Get all email accounts
**POST** `/api/accounts` - Create account
**PATCH** `/api/accounts/:id` - Update account
**DELETE** `/api/accounts/:id` - Delete account
**POST** `/api/accounts/reset-stats` - Reset usage statistics

### Templates

**GET** `/api/templates` - Get all abuse templates

### WHOIS

**GET** `/api/whois/lookup?domain=example.com` - WHOIS lookup
**GET** `/api/whois/suggestions?domain=example.com` - Get suggested services

## Database Schema

### User
```typescript
{
  _id: ObjectId,
  username: string (unique),
  email: string (unique),
  password: string (hashed),
  role: string,
  createdAt: Date
}
```

### Domain
```typescript
{
  _id: ObjectId,
  domain: string,
  reason: string,
  status: 'pending' | 'processing' | 'reported' | 'failed',
  createdBy: ObjectId (User),
  registrar: string,
  nameserver: string,
  template: string,
  reportedServices: string[],
  reportProgress: number,
  createdAt: Date,
  updatedAt: Date
}
```

### Account
```typescript
{
  _id: ObjectId,
  email: string (unique),
  status: 'active' | 'banned' | 'inactive',
  lastUsedAt: Date,
  reportCount: number,
  createdAt: Date
}
```

### ReportService
```typescript
{
  _id: ObjectId,
  name: string,
  reportUrl: string,
  type: 'manual' | 'autofill_supported',
  active: boolean
}
```

### ReportLog
```typescript
{
  _id: ObjectId,
  domainId: ObjectId (Domain),
  serviceId: ObjectId (ReportService),
  userId: ObjectId (User),
  accountId: ObjectId (Account),
  email: string,
  status: 'pending' | 'success' | 'failed' | 'processing',
  errorMessage: string,
  jobId: string,
  createdAt: Date,
  updatedAt: Date
}
```

## Architecture

### Job Queue Flow

1. User clicks "Report All"
2. Backend creates BullMQ jobs for each domain+service combination
3. Jobs are queued in Redis
4. Worker processes jobs sequentially
5. Puppeteer opens browser tabs with auto-filled forms
6. User completes captchas manually
7. System logs results in ReportLog collection
8. Domain status updates automatically

### Email Rotation

1. System maintains pool of email accounts
2. When creating report job, `getNextAvailableAccount()` selects least-used email
3. Account usage counter increments
4. Accounts can be marked as "banned" if blocked by services
5. Reset stats periodically to balance usage

### Browser Automation Flow

**Puppeteer Mode:**
- Backend launches Puppeteer browser (non-headless)
- Opens report URL in new page
- Injects JavaScript to fill form fields
- Waits for user to complete captcha
- User submits manually

**Chrome Extension Mode:**
- Web app opens multiple tabs via extension
- Extension detects supported pages
- Content script auto-fills forms
- User completes captchas
- User submits forms

## Report Services

Default services included:

| Service | URL | Type |
|---------|-----|------|
| Google Spam | https://search.google.com/search-console/report-spam | autofill_supported |
| Google Phishing | https://safebrowsing.google.com/safebrowsing/report_phish/ | autofill_supported |
| Google DMCA | https://reportcontent.google.com/forms/dmca_search | autofill_supported |
| Cloudflare Abuse | https://abuse.cloudflare.com/ | autofill_supported |
| Radix Abuse | https://abuse.radix.website/ | autofill_supported |

## Security Considerations

### What This System Does:
✅ Auto-fills publicly available form fields
✅ Opens report URLs in browser
✅ Tracks report submission status
✅ Rotates email addresses
✅ Manages domain lists

### What This System Does NOT Do:
❌ Bypass captchas automatically
❌ Submit forms without user interaction
❌ Violate terms of service
❌ Perform malicious automation
❌ Hide user identity

**Important:** Users must manually complete captchas and submit all forms. This system provides semi-automation to improve efficiency while maintaining ethical standards.

## Development

### Backend Scripts

```bash
npm run start:dev     # Development with hot reload
npm run build         # Build for production
npm run start:prod    # Production server
npm run seed          # Seed report services
npm run lint          # Lint code
npm run format        # Format code
```

### Frontend Scripts

```bash
npm run dev           # Development server
npm run build         # Production build
npm run preview       # Preview build
npm run lint          # Lint code
```

## Deployment

### Backend Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   JWT_SECRET=strong-random-secret
   MONGODB_URI=mongodb://user:pass@host:port/database
   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

2. **Build & Start**
   ```bash
   npm run build
   npm run start:prod
   ```

3. **Seed Data**
   ```bash
   npm run seed
   ```

### Frontend Deployment

1. **Update API URL** in `src/services/api.js`
   ```javascript
   baseURL: 'https://your-api-domain.com/api'
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Deploy `dist` folder** to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Any static hosting service

### Chrome Extension Distribution

**Development:**
- Load unpacked from `chrome://extensions/`

**Production:**
1. Create icons (16px, 48px, 128px)
2. Test thoroughly
3. Zip the extension folder
4. Submit to Chrome Web Store (optional)
5. Or distribute as unpacked extension to team

## Monitoring & Logging

### Queue Monitoring

Access queue statistics via:
- Dashboard sidebar (real-time)
- API endpoint: `GET /api/reports/queue-stats`

### Report Logs

View detailed logs:
- Click "Logs" button on any domain
- API endpoint: `GET /api/report-logs`
- Filter by domain, service, status

### Statistics

Dashboard displays:
- Total reports submitted
- Success rate
- Failed reports
- Active vs processing jobs

## Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

### MongoDB Connection Issues
```bash
# Check MongoDB status
mongosh
# Or
mongo
```

### Puppeteer Issues

**Browser won't open:**
- Check `PUPPETEER_HEADLESS=false` in .env
- Install Chrome/Chromium
- Check system permissions

**Form fields not filling:**
- Check website structure hasn't changed
- Update selectors in `puppeteer.service.ts`
- Use Chrome extension as fallback

### Extension Issues

**Not auto-filling:**
- Verify extension is enabled
- Check permissions granted
- Refresh extension after code changes
- Check browser console for errors

**Not detecting pages:**
- Ensure URL matches patterns in manifest
- Check content script injection
- Verify host_permissions

## Performance Optimization

### Queue Configuration

Adjust concurrency in `queues.module.ts`:
```typescript
BullModule.registerQueue({
  name: REPORT_QUEUE,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})
```

### Database Indexing

Add indexes for frequently queried fields:
```javascript
// In respective schemas
@Index({ createdBy: 1, status: 1 })
@Index({ email: 1 })
```

## Keyboard Shortcuts

- **Ctrl + Enter** - Report all pending domains
- Standard browser shortcuts for navigation

## Future Enhancements

- [ ] Schedule automated reporting
- [ ] Custom report service templates
- [ ] Advanced WHOIS data analysis
- [ ] Email verification before use
- [ ] Rate limiting per service
- [ ] Export reports to CSV
- [ ] Webhook notifications
- [ ] Multi-language support
- [ ] API rate limit detection
- [ ] Browser extension improvements

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- Create an issue in the repository
- Check documentation in each module
- Review inline code comments

## Legal & Ethical Use

This tool is designed for legitimate abuse reporting purposes only:
- Report actual phishing sites
- Report copyright violations
- Report spam domains
- Report malware distribution

**Do not use this tool to:**
- Make false reports
- Harass legitimate websites
- Violate terms of service
- Perform malicious activities

Users are responsible for ensuring their use complies with all applicable laws and service terms of use.

## Acknowledgments

Built with modern web technologies and best practices for:
- Clean architecture
- Scalable design
- Security-first approach
- User-friendly interface
- Ethical automation
