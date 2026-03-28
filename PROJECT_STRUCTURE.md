# Complete Project Structure

Visual overview of all files and folders in the Domain Abuse Report Tool.

## Full Directory Tree

```
tool-report/
│
├── backend/                                 # NestJS Backend
│   ├── src/
│   │   ├── auth/                           # Authentication Module
│   │   │   ├── dto/
│   │   │   │   ├── register.dto.ts         # Registration validation
│   │   │   │   └── login.dto.ts            # Login validation
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts       # JWT guard
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts         # JWT strategy
│   │   │   ├── auth.controller.ts          # Auth endpoints
│   │   │   ├── auth.service.ts             # Auth logic
│   │   │   └── auth.module.ts              # Auth module config
│   │   │
│   │   ├── users/                          # Users Module
│   │   │   ├── schemas/
│   │   │   │   └── user.schema.ts          # User model
│   │   │   ├── users.service.ts            # User CRUD
│   │   │   └── users.module.ts             # Users module config
│   │   │
│   │   ├── domains/                        # Domains Module
│   │   │   ├── schemas/
│   │   │   │   └── domain.schema.ts        # Domain model (enhanced)
│   │   │   ├── dto/
│   │   │   │   ├── create-domain.dto.ts    # Create validation
│   │   │   │   ├── update-domain.dto.ts    # Update validation
│   │   │   │   └── bulk-import.dto.ts      # Bulk import validation
│   │   │   ├── domains.controller.ts       # Domain endpoints
│   │   │   ├── domains.service.ts          # Domain logic + bulk import
│   │   │   └── domains.module.ts           # Domains module config
│   │   │
│   │   ├── accounts/                       # Email Accounts Module
│   │   │   ├── schemas/
│   │   │   │   └── account.schema.ts       # Account model
│   │   │   ├── dto/
│   │   │   │   ├── create-account.dto.ts   # Create validation
│   │   │   │   └── update-account.dto.ts   # Update validation
│   │   │   ├── accounts.controller.ts      # Account endpoints
│   │   │   ├── accounts.service.ts         # Rotation logic
│   │   │   └── accounts.module.ts          # Accounts module config
│   │   │
│   │   ├── reports/                        # Reports Orchestration
│   │   │   ├── reports.controller.ts       # Report endpoints
│   │   │   ├── reports.service.ts          # Queue coordination
│   │   │   └── reports.module.ts           # Reports module config
│   │   │
│   │   ├── report-services/                # Report Services Module
│   │   │   ├── schemas/
│   │   │   │   ├── report-service.schema.ts # Service model (enhanced)
│   │   │   │   └── report-log.schema.ts    # Log model (enhanced)
│   │   │   ├── report-services.controller.ts # Service endpoints
│   │   │   ├── report-services.service.ts  # Service logic + seeding
│   │   │   └── report-services.module.ts   # Module config
│   │   │
│   │   ├── report-logs/                    # Report Logs Module
│   │   │   ├── report-logs.controller.ts   # Log endpoints
│   │   │   ├── report-logs.service.ts      # Log tracking
│   │   │   └── report-logs.module.ts       # Logs module config
│   │   │
│   │   ├── templates/                      # Templates Module
│   │   │   ├── templates.controller.ts     # Template endpoints
│   │   │   ├── templates.service.ts        # 6 predefined templates
│   │   │   └── templates.module.ts         # Templates module config
│   │   │
│   │   ├── whois/                          # WHOIS Module
│   │   │   ├── whois.controller.ts         # WHOIS endpoints
│   │   │   ├── whois.service.ts            # WHOIS lookup & parsing
│   │   │   └── whois.module.ts             # WHOIS module config
│   │   │
│   │   ├── puppeteer/                      # Browser Automation
│   │   │   ├── puppeteer.service.ts        # Puppeteer logic
│   │   │   └── puppeteer.module.ts         # Puppeteer module config
│   │   │
│   │   ├── queues/                         # BullMQ Configuration
│   │   │   ├── report.queue.ts             # Queue definitions
│   │   │   ├── report.processor.ts         # Job processor
│   │   │   └── queues.module.ts            # BullMQ + Redis setup
│   │   │
│   │   ├── common/                         # Shared Utilities
│   │   │   ├── decorators/
│   │   │   │   └── current-user.decorator.ts # User decorator
│   │   │   └── filters/
│   │   │       └── http-exception.filter.ts # Error handler
│   │   │
│   │   ├── scripts/                        # Database Scripts
│   │   │   ├── seed.ts                     # Seed report services
│   │   │   └── seed-accounts.ts            # Seed email accounts
│   │   │
│   │   ├── app.module.ts                   # Root module (all imports)
│   │   └── main.ts                         # Application entry point
│   │
│   ├── .env.example                        # Environment template
│   ├── .gitignore                          # Git ignore rules
│   ├── .eslintrc.js                        # ESLint config
│   ├── .prettierrc                         # Prettier config
│   ├── .dockerignore                       # Docker ignore
│   ├── Dockerfile                          # Docker build
│   ├── nest-cli.json                       # NestJS CLI config
│   ├── tsconfig.json                       # TypeScript config
│   ├── package.json                        # Dependencies + scripts
│   └── README.md                           # Backend documentation
│
├── frontend/                               # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── PrivateRoute.jsx            # Auth route guard
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx                   # Login page
│   │   │   ├── Register.jsx                # Registration page
│   │   │   ├── Dashboard.jsx               # Basic dashboard (legacy)
│   │   │   └── DashboardAdvanced.jsx       # Advanced dashboard (main)
│   │   │
│   │   ├── services/
│   │   │   └── api.js                      # Axios config + interceptors
│   │   │
│   │   ├── App.jsx                         # Main app + routes
│   │   ├── main.jsx                        # React entry point
│   │   └── index.css                       # Global styles + animations
│   │
│   ├── public/                             # Static assets
│   ├── index.html                          # HTML template
│   ├── vite.config.js                      # Vite configuration
│   ├── .eslintrc.cjs                       # ESLint config
│   ├── .gitignore                          # Git ignore rules
│   ├── Dockerfile                          # Docker build
│   ├── nginx.conf                          # Nginx config for production
│   ├── package.json                        # Dependencies + scripts
│   └── README.md                           # Frontend documentation
│
├── chrome-extension/                       # Chrome Extension
│   ├── icons/                              # Extension icons
│   │   └── README.md                       # Icon guidelines
│   │
│   ├── manifest.json                       # Extension config (Manifest V3)
│   ├── background.js                       # Service worker
│   ├── content.js                          # Content script (autofill)
│   ├── popup.html                          # Extension popup UI
│   ├── popup.js                            # Popup logic
│   └── README.md                           # Extension documentation
│
├── docs/ (optional)                        # Additional Documentation
│
├── .gitignore                              # Root git ignore
├── docker-compose.yml                      # Docker orchestration
├── README.md                               # Main documentation
├── SETUP_GUIDE.md                          # Step-by-step setup
├── INSTALL.md                              # Installation scripts
├── ARCHITECTURE.md                         # System architecture
└── PROJECT_STRUCTURE.md                    # This file
```

## File Count

- **Backend**: ~55 files
- **Frontend**: ~15 files
- **Chrome Extension**: ~7 files
- **Documentation**: ~8 files
- **Total**: ~85 files

## Key Files Explained

### Backend Core

| File | Purpose |
|------|---------|
| `main.ts` | Application bootstrap, CORS, validation pipes |
| `app.module.ts` | Root module, imports all feature modules |
| `package.json` | Dependencies, scripts (seed, start, build) |
| `.env.example` | Environment variable template |

### Backend Modules

| Module | Files | Purpose |
|--------|-------|---------|
| auth | 7 files | JWT authentication, guards, strategies |
| users | 3 files | User CRUD operations |
| domains | 6 files | Domain management + bulk import |
| accounts | 5 files | Email rotation system |
| reports | 3 files | Report orchestration |
| report-services | 5 files | Service definitions + seeding |
| report-logs | 3 files | Report history tracking |
| templates | 3 files | Pre-defined abuse descriptions |
| whois | 3 files | Domain information lookup |
| puppeteer | 2 files | Browser automation |
| queues | 3 files | BullMQ job processing |

### Frontend Core

| File | Purpose |
|------|---------|
| `main.jsx` | React entry point |
| `App.jsx` | Route configuration |
| `index.css` | Global styles |
| `api.js` | Axios configuration |

### Frontend Pages

| Page | Purpose |
|------|---------|
| `Login.jsx` | User authentication |
| `Register.jsx` | User registration |
| `DashboardAdvanced.jsx` | Main application UI |

### Chrome Extension

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration |
| `background.js` | Service worker, tab management |
| `content.js` | Form autofill logic |
| `popup.html` | Extension UI |
| `popup.js` | Popup interaction logic |

## Module Relationships

### Import Dependencies

```
AuthModule
└── imports: UsersModule, JwtModule, PassportModule

DomainsModule
└── imports: MongooseModule (Domain schema)

AccountsModule
└── imports: MongooseModule (Account schema)

ReportsModule
└── imports: QueuesModule, DomainsModule, ReportServicesModule, AccountsModule

ReportLogsModule
└── imports: MongooseModule (ReportLog schema)

QueuesModule
└── imports: BullModule, ReportLogsModule, PuppeteerModule

PuppeteerModule
└── imports: ReportServicesModule

WhoisModule
└── imports: None (standalone)

TemplatesModule
└── imports: None (standalone)
```

## Data Models

### Model Relationships

```
User
  └── has many Domains
  └── has many ReportLogs

Domain
  └── belongs to User
  └── has many ReportLogs

Account
  └── has many ReportLogs

ReportService
  └── has many ReportLogs

ReportLog
  └── belongs to Domain
  └── belongs to User
  └── belongs to Account
  └── belongs to ReportService
```

## Configuration Files

### Backend Configuration

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript compiler options |
| `nest-cli.json` | NestJS CLI configuration |
| `.eslintrc.js` | Code linting rules |
| `.prettierrc` | Code formatting rules |
| `.env.example` | Environment variables template |
| `.gitignore` | Git ignore patterns |
| `.dockerignore` | Docker ignore patterns |

### Frontend Configuration

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite build configuration |
| `.eslintrc.cjs` | Code linting rules |
| `.gitignore` | Git ignore patterns |
| `nginx.conf` | Nginx config for production |

## Scripts & Commands

### Backend Scripts

```bash
npm run start:dev       # Development server
npm run start:prod      # Production server
npm run build           # Build project
npm run seed            # Seed report services
npm run seed:accounts   # Seed email accounts
npm run seed:all        # Seed everything
npm run lint            # Lint code
npm run format          # Format code
```

### Frontend Scripts

```bash
npm run dev             # Development server
npm run build           # Production build
npm run preview         # Preview build
npm run lint            # Lint code
```

## Environment Files

### Backend `.env`

```env
# 11 environment variables
PORT, NODE_ENV
MONGODB_URI
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
JWT_SECRET, JWT_EXPIRES_IN
CORS_ORIGIN
PUPPETEER_HEADLESS, PUPPETEER_TIMEOUT
EXTENSION_ID
```

### Frontend

No environment file needed (API URL in `api.js`)

## Build Output

### Backend Build

```
backend/dist/
├── auth/
├── users/
├── domains/
├── accounts/
├── reports/
├── report-services/
├── report-logs/
├── templates/
├── whois/
├── puppeteer/
├── queues/
├── scripts/
├── common/
├── app.module.js
└── main.js
```

### Frontend Build

```
frontend/dist/
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── index.html
└── vite.svg
```

## Development Files

**Not Committed to Git:**
- `node_modules/` (dependencies)
- `dist/` (build output)
- `.env` (secrets)
- `*.log` (log files)

**Committed to Git:**
- All source code
- Configuration files
- `.env.example` (template)
- Documentation

## Installation Size

**Backend:**
- Source: ~100 KB
- Dependencies: ~350 MB
- Build output: ~5 MB

**Frontend:**
- Source: ~50 KB
- Dependencies: ~250 MB
- Build output: ~500 KB (minified)

**Total Project:**
- ~600 MB with all dependencies
- ~6 MB source code + docs

## Port Usage

| Service | Port | Protocol |
|---------|------|----------|
| Frontend | 5173 | HTTP |
| Backend | 3000 | HTTP |
| MongoDB | 27017 | TCP |
| Redis | 6379 | TCP |

## Technology Versions

### Backend
- Node.js: v18+
- NestJS: v10.3
- MongoDB: v6+
- Redis: v7+
- Puppeteer: v21.9
- BullMQ: v5.1

### Frontend
- React: v18.2
- Vite: v5.0
- Ant Design: v5.12
- Axios: v1.6

### Extension
- Manifest: V3
- Target: Chrome 90+

## Lines of Code

**Backend**: ~2,500 lines
- Controllers: ~400 lines
- Services: ~800 lines
- Schemas: ~300 lines
- DTOs: ~200 lines
- Config: ~100 lines
- Other: ~700 lines

**Frontend**: ~600 lines
- Pages: ~400 lines
- Components: ~50 lines
- Config: ~150 lines

**Extension**: ~300 lines
- Content script: ~150 lines
- Background: ~80 lines
- Popup: ~70 lines

**Documentation**: ~5,000 lines
- READMEs: ~2,500 lines
- Guides: ~2,500 lines

## API Endpoints Summary

Total: **23 endpoints**

- Auth: 2 endpoints
- Domains: 5 endpoints
- Reports: 3 endpoints
- Report Services: 1 endpoint
- Report Logs: 3 endpoints
- Accounts: 5 endpoints
- Templates: 1 endpoint
- WHOIS: 2 endpoints
- Health (optional): 1 endpoint

## Database Collections

Total: **5 collections**

1. `users` - User accounts
2. `domains` - Domain targets
3. `accounts` - Email rotation
4. `reportservices` - Service definitions
5. `reportlogs` - Report history

## Queue Jobs

Total: **1 job type**

- `report-domain` - Report single domain to single service

## Browser Automation

### Puppeteer
- 1 service
- Non-headless mode
- Smart field detection
- Multiple selector patterns

### Chrome Extension
- 3 scripts (background, content, popup)
- Manifest V3
- Message passing architecture

## Feature Modules

```
┌─────────────────────────────────────────────────────┐
│                  AppModule (Root)                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ AuthModule  │  │UsersModule  │  │DomainsModule│ │
│  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │AccountsModule│ │ReportsModule│  │ServicesModule│ │
│  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ LogsModule  │  │TemplatesModule│ │WhoisModule │ │
│  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐                 │
│  │PuppeteerModule│ │QueuesModule │                 │
│  └─────────────┘  └─────────────┘                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Deployment Files

- `Dockerfile` (backend)
- `Dockerfile` (frontend)
- `docker-compose.yml` (orchestration)
- `.dockerignore` (both)
- `nginx.conf` (frontend production)

## Documentation Files

1. **README.md** (main) - Overview and features
2. **SETUP_GUIDE.md** - Detailed setup instructions
3. **INSTALL.md** - Quick installation scripts
4. **ARCHITECTURE.md** - System architecture
5. **PROJECT_STRUCTURE.md** - This file
6. **backend/README.md** - Backend documentation
7. **frontend/README.md** - Frontend documentation
8. **chrome-extension/README.md** - Extension guide

## Getting Started

1. Read **INSTALL.md** for quick setup
2. Read **SETUP_GUIDE.md** for detailed steps
3. Read **README.md** for features overview
4. Read **ARCHITECTURE.md** for technical details
5. Read module-specific READMEs for deep dives

## Contributing

When adding new features:
1. Create module in appropriate section
2. Follow NestJS module pattern
3. Update `app.module.ts`
4. Add tests
5. Update documentation

## Maintenance

### Adding Files
- Follow existing structure
- Use appropriate module folder
- Update imports in module files

### Removing Files
- Check for dependencies
- Update imports
- Run tests
- Update documentation

## Summary

This project contains:
- ✅ 85+ files
- ✅ 23 API endpoints
- ✅ 11 backend modules
- ✅ 5 database collections
- ✅ 3 frontend pages
- ✅ 1 Chrome extension
- ✅ 8 documentation files
- ✅ Docker support
- ✅ Production-ready architecture
