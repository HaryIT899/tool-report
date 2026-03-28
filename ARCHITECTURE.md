# System Architecture

Detailed architecture overview of the Domain Abuse Report Tool.

## High-Level Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │────────▶│   Frontend   │────────▶│   Backend   │
│  (Chrome)   │         │   (React)    │  HTTP   │  (NestJS)   │
└─────────────┘         └──────────────┘         └─────────────┘
      │                                                  │
      │                                                  │
      ▼                                                  ▼
┌─────────────┐                              ┌──────────────────┐
│  Chrome     │                              │    MongoDB       │
│  Extension  │                              │    (Database)    │
└─────────────┘                              └──────────────────┘
                                                     │
                                                     ▼
                                             ┌──────────────────┐
                                             │     Redis        │
                                             │   (Job Queue)    │
                                             └──────────────────┘
                                                     │
                                                     ▼
                                             ┌──────────────────┐
                                             │   Puppeteer      │
                                             │  (Automation)    │
                                             └──────────────────┘
```

## Technology Stack

### Frontend Layer

**React Application (Port 5173)**
- **Framework**: React 18 with hooks
- **Build Tool**: Vite (fast HMR)
- **UI Library**: Ant Design 5
- **Routing**: React Router 6
- **HTTP Client**: Axios
- **State**: Local component state

**Responsibilities:**
- User interface rendering
- Form handling and validation
- API communication
- JWT token management
- Real-time UI updates

### Backend Layer

**NestJS API (Port 3000)**
- **Framework**: NestJS 10 (Node.js)
- **Architecture**: Modular (clean architecture)
- **Language**: TypeScript
- **Runtime**: Node.js v18+

**Modules:**
1. **Auth** - Authentication & authorization
2. **Users** - User management
3. **Domains** - Domain CRUD operations
4. **Accounts** - Email rotation
5. **Reports** - Report orchestration
6. **Report Services** - Service definitions
7. **Report Logs** - History tracking
8. **Templates** - Abuse templates
9. **WHOIS** - Domain information
10. **Puppeteer** - Browser automation
11. **Queues** - Job processing

### Data Layer

**MongoDB (Port 27017)**
- **Type**: NoSQL document database
- **ODM**: Mongoose
- **Collections**:
  - users
  - domains
  - accounts
  - reportservices
  - reportlogs

**Redis (Port 6379)**
- **Type**: In-memory data store
- **Usage**: BullMQ job queue
- **Data**: Queue jobs, job results

### Automation Layer

**Puppeteer**
- **Mode**: Non-headless (visible browser)
- **Purpose**: Form auto-fill
- **Limitation**: User completes captchas

**Chrome Extension**
- **Manifest**: V3
- **Components**: Background, Content, Popup
- **Purpose**: Multi-tab autofill

## Data Flow

### 1. User Registration/Login

```
User → Frontend → Backend (Auth Module) → MongoDB
                ↓
              JWT Token
                ↓
           localStorage
```

### 2. Domain Creation

```
User → Frontend → Backend (Domains Module) → MongoDB
                           ↓
                    (Optional) WHOIS Lookup
                           ↓
                   Detect Registrar/Nameserver
```

### 3. Bulk Import

```
User (CSV/Text) → Frontend → Backend
                              ↓
                        Parse Input
                              ↓
                    Create Multiple Domains
                              ↓
                          MongoDB
```

### 4. Report Submission (Single Domain)

```
User clicks "Report All"
          ↓
    Frontend sends request
          ↓
    Backend (Reports Module)
          ↓
    Get next available email (Accounts Module)
          ↓
    Create BullMQ jobs (one per service)
          ↓
    Jobs stored in Redis Queue
          ↓
    ReportProcessor picks up jobs
          ↓
    Puppeteer opens browser
          ↓
    Auto-fill form fields
          ↓
    Wait for user (captcha)
          ↓
    User submits manually
          ↓
    Log result to MongoDB (ReportLogs)
          ↓
    Update domain status
```

### 5. Report All Domains

```
User clicks "Report All Pending"
          ↓
    Backend finds all pending domains
          ↓
    For each domain × each service:
          ↓
    Create BullMQ job
          ↓
    Process queue sequentially
          ↓
    Open multiple browser tabs
          ↓
    User completes captchas
          ↓
    System logs all results
```

## Module Dependencies

```
AppModule
├── ConfigModule (global)
├── MongooseModule (database)
├── QueuesModule (BullMQ + Redis)
│   └── ReportProcessor
│       ├── ReportLogsModule
│       └── PuppeteerModule
│           └── ReportServicesModule
│
├── AuthModule
│   └── UsersModule
│
├── DomainsModule
│
├── ReportsModule
│   ├── DomainsModule
│   ├── ReportServicesModule
│   └── AccountsModule
│
├── ReportLogsModule
├── TemplatesModule
└── WhoisModule
```

## Authentication Flow

```
1. User registers
   ↓
2. Password hashed (bcrypt, 10 rounds)
   ↓
3. User stored in MongoDB
   ↓
4. JWT token generated
   ↓
5. Token sent to frontend
   ↓
6. Token stored in localStorage
   ↓
7. Token sent in Authorization header
   ↓
8. JwtStrategy validates token
   ↓
9. User object attached to request
   ↓
10. Controller accesses req.user
```

## Job Queue Architecture

### BullMQ Flow

```
Job Creation
     ↓
[Producer]
  Reports Service
     ↓
  BullMQ.add()
     ↓
[Redis Queue]
  FIFO order
  Persistence
  Retry logic
     ↓
[Consumer]
  ReportProcessor
     ↓
  process(job)
     ↓
[Puppeteer]
  Browser automation
     ↓
[Result]
  Success/Failure
     ↓
[Update]
  ReportLog + Domain status
```

### Job Structure

```typescript
{
  id: 'job-uuid',
  name: 'report-domain',
  data: {
    domainId: 'mongo-id',
    serviceId: 'mongo-id',
    userId: 'mongo-id',
    domain: 'evil.com',
    reason: 'Phishing attack',
    accountId: 'mongo-id',
    email: 'reporter1@example.com',
  },
  opts: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
}
```

## Email Rotation Algorithm

```
┌─────────────────────────────────────┐
│  Get Next Available Account         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Query: status = 'active'           │
│  Sort by: lastUsedAt, reportCount   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Select first result                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Update:                            │
│  - lastUsedAt = now()               │
│  - reportCount += 1                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Return account for use             │
└─────────────────────────────────────┘
```

## Browser Automation Flow

### Puppeteer Service

```
Job received
     ↓
Get or create browser instance
     ↓
Create new page
     ↓
Navigate to report URL
     ↓
Wait for page load (networkidle2)
     ↓
Inject JavaScript
     ↓
Find form fields (multiple selectors)
     ↓
Fill domain, reason, email
     ↓
Trigger input/change events
     ↓
Wait for user interaction
     ↓
User completes captcha
     ↓
User submits form
     ↓
Page can close (user or script)
```

### Chrome Extension Flow

```
Web app calls extension API
     ↓
Background service worker
     ↓
Create multiple tabs
     ↓
Store data in chrome.storage
     ↓
Tab loads (onUpdated event)
     ↓
Content script injected
     ↓
Retrieve data from storage
     ↓
Auto-fill form fields
     ↓
Show notification
     ↓
User completes captcha
     ↓
User submits
```

## Security Architecture

### Authentication

```
Password → bcrypt.hash(10 rounds) → MongoDB
Login → Compare hash → Generate JWT → Client
Request → JWT in header → Validate → Allow/Deny
```

### Authorization

```
@UseGuards(JwtAuthGuard)
     ↓
JwtStrategy.validate()
     ↓
Check token signature
     ↓
Find user in database
     ↓
Attach user to request
     ↓
Controller access: req.user
```

### API Protection

- All endpoints require JWT (except auth)
- User can only access own data
- Validation pipes on all inputs
- CORS restricted to frontend origin

## Database Schema

### Relationships

```
User (1) ──┐
           ├──(many)── Domain (many) ──┐
           │                           │
           └──(many)── ReportLog ──────┤
                           │           │
                           ├───(1)─────┘
                           │
                           ├───(1)── ReportService
                           │
                           └───(1)── Account
```

### Collections

**users**
- Authentication credentials
- User profile data

**domains**
- Target domains for reporting
- Status tracking
- WHOIS data

**accounts**
- Email addresses for reporting
- Usage statistics
- Status (active/banned)

**reportservices**
- Report service definitions
- URLs and types

**reportlogs**
- Complete audit trail
- Success/failure tracking
- Links all entities

## API Architecture

### RESTful Endpoints

```
/api
├── /auth
│   ├── POST /register
│   └── POST /login
│
├── /domains
│   ├── GET    /
│   ├── POST   /
│   ├── POST   /bulk-import
│   ├── PATCH  /:id
│   └── DELETE /:id
│
├── /reports
│   ├── POST /domain/:id
│   ├── POST /all
│   └── GET  /queue-stats
│
├── /report-services
│   └── GET /
│
├── /report-logs
│   ├── GET /
│   ├── GET /stats
│   └── GET /domain/:id
│
├── /accounts
│   ├── GET    /
│   ├── POST   /
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── POST   /reset-stats
│
├── /templates
│   └── GET /
│
└── /whois
    ├── GET /lookup?domain=x
    └── GET /suggestions?domain=x
```

## Performance Considerations

### Caching Strategy

**Frontend:**
- JWT token in localStorage
- User data in localStorage
- Component-level caching

**Backend:**
- Redis for job queue
- MongoDB connection pooling
- Template data in memory

### Optimization

**Database:**
- Indexes on frequently queried fields
- Limit result sets
- Pagination support

**Queue:**
- Configurable concurrency
- Exponential backoff
- Job result caching

**Browser:**
- Reuse browser instance
- Connection pooling
- Smart page management

## Scalability

### Horizontal Scaling

**Backend:**
- Stateless API (scales easily)
- Multiple instances behind load balancer
- Shared Redis and MongoDB

**Queue Workers:**
- Multiple worker processes
- Distributed job processing
- Redis handles coordination

### Vertical Scaling

- Increase RAM for Puppeteer
- More CPU cores for workers
- Faster MongoDB storage (SSD)

## Monitoring & Observability

### Metrics to Track

- API response times
- Queue job duration
- Success/failure rates
- Active browser instances
- Memory usage
- Database query performance

### Logging Levels

```typescript
Logger.log()    // Info
Logger.warn()   // Warnings
Logger.error()  // Errors
Logger.debug()  // Debug info
```

### Health Checks

Add endpoints:
- `/health` - Service status
- `/health/mongodb` - DB connection
- `/health/redis` - Queue connection
- `/metrics` - Performance metrics

## Error Handling

### Frontend

```javascript
try {
  await api.post('/endpoint', data);
  message.success('Success');
} catch (error) {
  message.error(error.response?.data?.message || 'Failed');
}
```

### Backend

```typescript
@Catch()
export class AllExceptionsFilter {
  catch(exception, host) {
    // Log error
    // Format response
    // Return to client
  }
}
```

### Queue

```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
}
```

## Testing Strategy

### Unit Tests
- Service methods
- DTO validation
- Utility functions

### Integration Tests
- API endpoints
- Database operations
- Queue processing

### E2E Tests
- User workflows
- Authentication flow
- Domain reporting

## Deployment Architecture

### Production Setup

```
                    ┌──────────────┐
                    │  CDN/Static  │
                    │  (Frontend)  │
                    └──────────────┘
                           │
                           │ HTTPS
                           ↓
┌──────────────┐    ┌──────────────┐
│ Load Balancer│───▶│   Nginx      │
└──────────────┘    │  (Reverse    │
                    │   Proxy)     │
                    └──────────────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ NestJS  │  │ NestJS  │  │ NestJS  │
        │Instance1│  │Instance2│  │Instance3│
        └─────────┘  └─────────┘  └─────────┘
              │            │            │
              └────────────┼────────────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │MongoDB  │  │  Redis  │  │Puppeteer│
        │ Primary │  │ Primary │  │  Node   │
        └─────────┘  └─────────┘  └─────────┘
              │            │
              ↓            ↓
        ┌─────────┐  ┌─────────┐
        │MongoDB  │  │  Redis  │
        │Secondary│  │ Replica │
        └─────────┘  └─────────┘
```

## Security Architecture

### Defense Layers

1. **Network**: CORS, rate limiting
2. **Authentication**: JWT tokens
3. **Authorization**: Guards on routes
4. **Validation**: DTO validation
5. **Database**: Parameterized queries (Mongoose)
6. **Secrets**: Environment variables

### Attack Prevention

- SQL Injection: ❌ N/A (NoSQL)
- NoSQL Injection: ✅ Mongoose escaping
- XSS: ✅ React auto-escaping
- CSRF: ✅ JWT tokens (not cookies)
- Rate Limiting: ⚠️ Add middleware
- Brute Force: ⚠️ Add login throttling

## Browser Extension Architecture

### Components

**Manifest (V3):**
- Defines permissions
- Content script injection
- Background service worker

**Background Service Worker:**
- Tab management
- Message passing
- Data storage

**Content Script:**
- Runs on report pages
- DOM manipulation
- Form field detection

**Popup:**
- User interface
- Manual control
- Settings

### Communication

```
Web App ←→ Background Worker ←→ Content Script
              ↕
        chrome.storage
```

## Monitoring Dashboard

### Real-Time Metrics

**Queue Stats:**
- Active jobs
- Waiting jobs
- Completed jobs
- Failed jobs

**Report Stats:**
- Total reports
- Success rate
- Failure rate
- Processing count

**Account Stats:**
- Active accounts
- Banned accounts
- Usage distribution

## Extension Points

### Adding New Report Service

1. Add to seed script
2. Update extension manifest
3. Add content script selectors
4. Test autofill

### Custom Templates

1. Add to `templates.service.ts`
2. Define description
3. Available in UI immediately

### Custom Job Types

1. Define new queue
2. Create processor
3. Register in module
4. Add API endpoint

## Technology Choices

### Why NestJS?
- TypeScript-first
- Modular architecture
- Dependency injection
- Enterprise-ready

### Why MongoDB?
- Flexible schema
- JSON-like documents
- Fast queries
- Easy scaling

### Why BullMQ?
- Reliable job queue
- Redis-backed
- Retry logic
- Good monitoring

### Why Puppeteer?
- Full browser control
- Headless/headed modes
- Chrome DevTools Protocol
- Active development

### Why Ant Design?
- Professional components
- Comprehensive library
- Good documentation
- Enterprise-grade

## Future Architecture Enhancements

1. **Microservices**: Split into smaller services
2. **GraphQL**: Alternative to REST
3. **WebSockets**: Real-time updates
4. **Caching**: Redis caching layer
5. **Message Queue**: RabbitMQ for events
6. **Service Mesh**: Istio for orchestration
7. **Monitoring**: Prometheus + Grafana
8. **Logging**: ELK stack
9. **CI/CD**: GitHub Actions pipeline
10. **Kubernetes**: Container orchestration

## Conclusion

This architecture provides:
- ✅ Scalability (horizontal and vertical)
- ✅ Reliability (retry logic, error handling)
- ✅ Maintainability (clean architecture, modules)
- ✅ Security (JWT, validation, guards)
- ✅ Performance (queue, caching, optimization)
- ✅ Observability (logs, stats, monitoring)
