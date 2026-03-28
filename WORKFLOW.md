# Complete Workflow Diagrams

Visual representation of all major workflows in the system.

## 1. User Registration & Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     REGISTRATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User                Frontend              Backend               Database
  │                    │                     │                     │
  ├─ Fill form ───────▶│                     │                     │
  │                    │                     │                     │
  │                    ├─ POST /auth/       │                     │
  │                    │    register        │                     │
  │                    │                     │                     │
  │                    │                     ├─ Check username ───▶│
  │                    │                     │◀─ Not exists ───────┤
  │                    │                     │                     │
  │                    │                     ├─ Hash password      │
  │                    │                     │   (bcrypt)          │
  │                    │                     │                     │
  │                    │                     ├─ Create user ──────▶│
  │                    │                     │◀─ User saved ───────┤
  │                    │                     │                     │
  │                    │                     ├─ Generate JWT       │
  │                    │                     │                     │
  │                    │◀─ {token, user} ───┤                     │
  │                    │                     │                     │
  │                    ├─ Save to          │                     │
  │                    │   localStorage     │                     │
  │                    │                     │                     │
  │◀─ Redirect to ─────┤                     │                     │
  │   Dashboard        │                     │                     │
```

## 2. Single Domain Reporting Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  SINGLE DOMAIN REPORT FLOW                      │
└─────────────────────────────────────────────────────────────────┘

User clicks "Report All" on domain row
          │
          ▼
┌─────────────────────┐
│  Frontend           │
│  Sends POST request │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Backend            │
│  Reports Controller │
└──────────┬──────────┘
           │
           ├──────────────┐
           │              │
           ▼              ▼
┌──────────────────┐  ┌──────────────────┐
│ Get Domain       │  │ Get Services     │
│ from DB          │  │ from DB          │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Get Next Available   │
         │ Email Account        │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ For each service:    │
         │ Create BullMQ Job    │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Jobs stored in       │
         │ Redis Queue          │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Update domain status │
         │ to "processing"      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Return job IDs to    │
         │ frontend             │
         └──────────────────────┘
```

## 3. Job Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     JOB PROCESSING FLOW                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│ Redis Queue      │
│ [Job 1] ─────────┼────┐
│ [Job 2]          │    │
│ [Job 3]          │    │
└──────────────────┘    │
                        │ Worker picks next job
                        ▼
                 ┌──────────────────┐
                 │ ReportProcessor  │
                 │ process(job)     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Create ReportLog │
                 │ status: processing│
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Puppeteer Service│
                 │ openReportPage() │
                 └────────┬─────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Launch  │    │Navigate │    │ Execute │
    │Browser  │───▶│  to URL │───▶│   JS    │
    └─────────┘    └─────────┘    └────┬────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ Auto-fill   │
                                 │ Form Fields │
                                 └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ Wait for    │
                                 │ User Action │
                                 └──────┬──────┘
                                        │
                              User completes captcha
                              User submits form
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ Update Log  │
                                 │ status:     │
                                 │ success     │
                                 └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ Update      │
                                 │ Domain      │
                                 │ Progress    │
                                 └─────────────┘
```

## 4. Bulk Import Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      BULK IMPORT FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User pastes domains in textarea
         │
         │ evil1.com
         │ evil2.com
         │ evil3.com
         │
         ▼
┌────────────────────┐
│ Select Template    │
│ (optional)         │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Frontend parses    │
│ input              │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ POST /domains/     │
│ bulk-import        │
└─────────┬──────────┘
          │
          ▼
┌────────────────────────────────┐
│ Backend parses input:          │
│ - Detect format (newline/CSV)  │
│ - Split into array             │
│ - Clean whitespace             │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────┐
│ For each domain:   │
└─────────┬──────────┘
          │
          ├─────────────────┐
          │                 │
          ▼                 ▼
    ┌─────────┐      ┌──────────┐
    │ Validate│      │  Create  │
    │ domain  │─────▶│  in DB   │
    └─────────┘      └─────┬────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │ Success  │  │  Failed  │
              │ count++  │  │ count++  │
              └──────────┘  └──────────┘
                    │             │
                    └──────┬──────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │ Return summary: │
                 │ imported: 2     │
                 │ failed: 1       │
                 └─────────────────┘
```

## 5. Chrome Extension Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                  CHROME EXTENSION WORKFLOW                      │
└─────────────────────────────────────────────────────────────────┘

METHOD 1: Automatic (via Web App)
─────────────────────────────────

Web App                    Extension                  Browser
   │                          │                          │
   ├─ User clicks ───────────▶│                          │
   │  "Report All"            │                          │
   │                          │                          │
   │                          ├─ background.js           │
   │                          │   receives message       │
   │                          │                          │
   │                          ├─ Create tabs ───────────▶│
   │                          │                          │
   │                          ├─ Store data in           │
   │                          │   chrome.storage         │
   │                          │                          │
   │                          │                    Tab loads
   │                          │                          │
   │                          ├─ content.js injected     │
   │                          │                          │
   │                          ├─ Retrieve data           │
   │                          │                          │
   │                          ├─ Fill form fields ──────▶│
   │                          │                          │
   │                          ├─ Show notification ─────▶│
   │                          │                          │
   │◀─ Tabs opened ───────────┤                          │
   │                          │                          │
   │                          │            User completes captcha
   │                          │            User submits form
   │                          │                          │

METHOD 2: Manual (via Popup)
────────────────────────────

User                    Extension                  Page
   │                       │                          │
   ├─ Opens popup ────────▶│                          │
   │                       │                          │
   ├─ Enters data ────────▶│                          │
   │  (domain, reason,     │                          │
   │   email)              │                          │
   │                       │                          │
   ├─ Clicks "Fill" ──────▶│                          │
   │                       │                          │
   │                       ├─ Send message to ────────▶│
   │                       │   content script          │
   │                       │                          │
   │                       │                   Fill form
   │                       │                          │
   │                       │◀─ Success ────────────────┤
   │                       │                          │
   │◀─ "Form filled!" ─────┤                          │
```

## 6. Email Rotation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL ROTATION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Report Job Starts
        │
        ▼
┌───────────────────────────────────────────────┐
│ AccountsService.getNextAvailableAccount()     │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│ Query Database:                               │
│ - status = 'active'                           │
│ - Sort by lastUsedAt ASC, reportCount ASC     │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Accounts in Database │
         ├──────────────────────┤
         │ reporter1@x.com      │ lastUsed: 2 days ago, count: 5
         │ reporter2@x.com      │ lastUsed: 1 day ago,  count: 10
         │ reporter3@x.com      │ lastUsed: 3 days ago, count: 3  ← Selected
         │ reporter4@x.com      │ status: banned (skipped)
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Update Selected:     │
         │ - lastUsedAt = now() │
         │ - reportCount += 1   │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Return Account       │
         │ reporter3@x.com      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Use in Report Job    │
         └──────────────────────┘
```

## 7. Report All Domains Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 REPORT ALL DOMAINS FLOW                         │
└─────────────────────────────────────────────────────────────────┘

User presses Ctrl+Enter or clicks "Report All Pending"
                          │
                          ▼
                 ┌─────────────────┐
                 │ Frontend sends  │
                 │ POST /reports/  │
                 │      all        │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Backend finds   │
                 │ all pending     │
                 │ domains         │
                 └────────┬────────┘
                          │
                          ▼
            Found: [Domain1, Domain2, Domain3]
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ For each Domain × each Service: Create Job                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Domain1 × Service1 → Job1   ─┐                                │
│  Domain1 × Service2 → Job2    │                                │
│  Domain1 × Service3 → Job3    │                                │
│  Domain2 × Service1 → Job4    ├──▶ Redis Queue                 │
│  Domain2 × Service2 → Job5    │                                │
│  Domain2 × Service3 → Job6    │                                │
│  Domain3 × Service1 → Job7    │                                │
│  Domain3 × Service2 → Job8    │                                │
│  Domain3 × Service3 → Job9   ─┘                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Update all      │
                 │ domains status  │
                 │ to "processing" │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ ReportProcessor │
                 │ picks up jobs   │
                 │ sequentially    │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Process Job1    │
                 │ Open browser    │
                 │ Fill form       │
                 │ Wait for user   │
                 └────────┬────────┘
                          │
                   User submits
                          │
                          ▼
                 ┌─────────────────┐
                 │ Log result      │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Process Job2    │
                 │ (repeat)        │
                 └────────┬────────┘
                          │
                        ...
                          │
                          ▼
                 ┌─────────────────┐
                 │ All jobs done   │
                 │ Update domain   │
                 │ status          │
                 └─────────────────┘
```

## 8. Template Selection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEMPLATE SELECTION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

User opens "Add Domain" modal
         │
         ▼
┌─────────────────────┐
│ Load templates      │
│ from backend        │
└──────────┬──────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ Display Template Dropdown:             │
├────────────────────────────────────────┤
│ [ ] Phishing                           │
│ [ ] Malware Distribution               │
│ [ ] Spam                               │
│ [ ] Copyright Infringement             │
│ [ ] Trademark Infringement             │
│ [ ] Scam/Fraud                         │
└────────────────────┬───────────────────┘
                     │
         User selects "Phishing"
                     │
                     ▼
┌────────────────────────────────────────┐
│ Auto-fill reason field with:           │
│ "This domain is being used for         │
│  phishing attacks, attempting to       │
│  steal user credentials..."            │
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│ User can edit description further      │
└────────────────────┬───────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│ Submit domain with template-based      │
│ description                            │
└────────────────────────────────────────┘
```

## 9. WHOIS Detection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     WHOIS DETECTION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Domain Added: "cloudflare-hosted-site.com"
              │
              ▼
     ┌─────────────────┐
     │ WhoisService    │
     │ lookup()        │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ WHOIS query     │
     │ to registry     │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────────────────────────┐
     │ Parse WHOIS Data:                   │
     ├─────────────────────────────────────┤
     │ Registrar: Cloudflare, Inc.         │
     │ Nameservers:                        │
     │   - ns1.cloudflare.com              │
     │   - ns2.cloudflare.com              │
     │ Created: 2023-05-15                 │
     │ Expires: 2025-05-15                 │
     └────────┬────────────────────────────┘
              │
              ▼
     ┌─────────────────────────────────────┐
     │ Simplify Nameservers:               │
     │ ns1.cloudflare.com → "Cloudflare"   │
     └────────┬────────────────────────────┘
              │
              ▼
     ┌─────────────────────────────────────┐
     │ Save to Domain:                     │
     │ - registrar: "Cloudflare, Inc."     │
     │ - nameserver: "Cloudflare"          │
     └────────┬────────────────────────────┘
              │
              ▼
     ┌─────────────────────────────────────┐
     │ Generate Suggestions:               │
     ├─────────────────────────────────────┤
     │ • Google Spam (always)              │
     │ • Google Phishing (always)          │
     │ • Cloudflare Abuse (NS detected)    │
     └────────┬────────────────────────────┘
              │
              ▼
     ┌─────────────────┐
     │ Return to UI    │
     │ Highlight       │
     │ suggested       │
     │ services        │
     └─────────────────┘
```

## 10. Real-Time Dashboard Updates

```
┌─────────────────────────────────────────────────────────────────┐
│                 REAL-TIME DASHBOARD UPDATES                     │
└─────────────────────────────────────────────────────────────────┘

Dashboard Component Mounted
          │
          ▼
┌─────────────────────┐
│ Initial Data Load:  │
│ - Domains           │
│ - Services          │
│ - Templates         │
│ - Accounts          │
│ - Stats             │
│ - Queue stats       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Start Interval      │
│ (every 5 seconds)   │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │   Interval   │
    │    Tick      │
    └──────┬───────┘
           │
           ├────────────────────┐
           │                    │
           ▼                    ▼
  ┌─────────────────┐  ┌─────────────────┐
  │ Fetch Stats     │  │ Fetch Queue     │
  │ GET /report-    │  │ Stats GET       │
  │     logs/stats  │  │ /reports/       │
  │                 │  │ queue-stats     │
  └────────┬────────┘  └────────┬────────┘
           │                    │
           └─────────┬──────────┘
                     │
                     ▼
           ┌─────────────────┐
           │ Update UI:      │
           │ - Statistics    │
           │ - Queue counts  │
           │ - Progress bars │
           └────────┬────────┘
                    │
                    ▼
           ┌─────────────────┐
           │ Next tick in    │
           │ 5 seconds       │
           └─────────────────┘

User Action (Report, Delete, etc.)
          │
          ▼
┌─────────────────────┐
│ Immediate refresh   │
│ of relevant data    │
└─────────────────────┘
```

## 11. Error Handling & Retry Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   ERROR HANDLING & RETRY                        │
└─────────────────────────────────────────────────────────────────┘

Job Processing
      │
      ▼
┌──────────────┐
│ Try execute  │
└──────┬───────┘
       │
   ┌───┴────┐
   │Success?│
   └───┬────┘
       │
   ┌───┴────────────────┐
   │ Yes         No     │
   ▼                    ▼
┌────────┐      ┌──────────────┐
│ Log    │      │ Catch error  │
│ success│      └──────┬───────┘
└────────┘             │
                       ▼
              ┌────────────────┐
              │ Log error      │
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │ Attempts < 3?  │
              └────────┬───────┘
                       │
                   ┌───┴──────┐
                   │Yes    No │
                   ▼          ▼
          ┌──────────┐  ┌────────┐
          │ Wait     │  │ Mark   │
          │ backoff  │  │ failed │
          └────┬─────┘  └────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Attempt    Delay     │
    │ 1          0ms       │
    │ 2          5,000ms   │
    │ 3          25,000ms  │
    └──────────┬───────────┘
               │
               ▼
          ┌─────────┐
          │ Retry   │
          │ job     │
          └─────────┘
```

## 12. Multi-Tab Reporting Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                   MULTI-TAB REPORTING                           │
└─────────────────────────────────────────────────────────────────┘

Domain: evil-phishing-site.com
         │
         ├─── Job Queue ────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│ Job 1           │  │ Job 2           │
│ Google Spam     │  │ Google Phishing │
│ reporter1@x.com │  │ reporter2@x.com │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│ 🌐 Tab 1        │  │ 🌐 Tab 2        │
│ [Auto-filled]   │  │ [Auto-filled]   │
│ Domain: evil... │  │ Domain: evil... │
│ Email: rep1...  │  │ Email: rep2...  │
│ ✓ ✓ ✓           │  │ ✓ ✓ ✓           │
│ [CAPTCHA]       │  │ [CAPTCHA]       │
│ User solves     │  │ User solves     │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
    [SUBMIT]             [SUBMIT]
         │                    │
         ▼                    ▼
   Status: ✅             Status: ✅
         │                    │
         └──────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Both jobs        │
         │ completed        │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Domain status:   │
         │ "reported"       │
         │ Progress: 40%    │
         └──────────────────┘

Continue with Job 3, 4, 5...
```

## 13. System State Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      SYSTEM STATES                              │
└─────────────────────────────────────────────────────────────────┘

Domain States:
─────────────

     ┌─────────┐
     │ Created │
     └────┬────┘
          │
          ▼
     ┌─────────┐
     │ PENDING │◀──────────┐
     └────┬────┘           │
          │                │
    User reports           │
          │                │
          ▼                │
   ┌──────────────┐        │
   │ PROCESSING   │        │
   └──────┬───────┘        │
          │                │
     ┌────┴────┐           │
     │         │           │
     ▼         ▼           │
┌─────────┐ ┌─────────┐   │
│REPORTED │ │ FAILED  │───┘
└─────────┘ └─────────┘  Retry

Report Job States:
─────────────────

  ┌─────────┐
  │ Created │
  └────┬────┘
       │
       ▼
  ┌─────────┐
  │ PENDING │
  └────┬────┘
       │
       ▼
┌────────────┐
│ PROCESSING │
└──────┬─────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌────────┐ ┌────────┐
│SUCCESS │ │ FAILED │
└────────┘ └───┬────┘
               │
            Retry?
               │
        ┌──────┴──────┐
        │Yes      No  │
        ▼             ▼
   ┌─────────┐  ┌──────────┐
   │ PENDING │  │ FAILED   │
   │ (retry) │  │ (final)  │
   └─────────┘  └──────────┘
```

## 14. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATA FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

User Input
    │
    ├──────────────────────────────────────────────┐
    │                                              │
    ▼                                              ▼
┌─────────────┐                            ┌─────────────┐
│  Frontend   │◀──── WebSocket ────────────│  Backend    │
│   (React)   │      (optional)            │  (NestJS)   │
└──────┬──────┘                            └──────┬──────┘
       │                                          │
       │ HTTP/REST                                │
       │                                          │
       └──────────────────┬───────────────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │ MongoDB  │ │  Redis   │ │Puppeteer │
       │  (Data)  │ │ (Queue)  │ │(Browser) │
       └──────────┘ └──────────┘ └──────────┘
              │           │           │
              └───────────┼───────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │ Report Sites │
                  │ (External)   │
                  └──────────────┘
```

## 15. Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE USER JOURNEY                        │
└─────────────────────────────────────────────────────────────────┘

Day 1: Setup
────────────
1. Register account
2. Login to dashboard
3. Add 3 email accounts
4. Browse templates

Day 2: Import Domains
─────────────────────
1. Open bulk import
2. Paste 50 domains
3. Select "Phishing" template
4. Import success: 50 domains

Day 3: Start Reporting
──────────────────────
1. Click "Report All Pending"
2. System queues 250 jobs (50 domains × 5 services)
3. Browser opens first report page
4. Form auto-filled
5. Complete captcha
6. Submit form
7. Next tab opens automatically
8. Repeat for all services

Monitor Progress:
────────────────
- Sidebar shows: 248 waiting, 1 active
- Domain table shows progress bars
- Statistics update in real-time
- Click "Logs" to see history

Day 4: Review Results
─────────────────────
1. Check statistics: 245 success, 5 failed
2. Review failed reports
3. Retry failed ones manually
4. Mark successful domains as complete

Day 5: Maintenance
──────────────────
1. Add new domains
2. Check account status
3. Reset usage stats
4. Export reports (future feature)
```

## 16. Extension Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              EXTENSION COMMUNICATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

Web App                Background              Content Script
   │                      │                         │
   ├─ postMessage ───────▶│                         │
   │  (report data)       │                         │
   │                      │                         │
   │                      ├─ chrome.tabs.create ───▶│
   │                      │   (new tab)             │
   │                      │                         │
   │                      ├─ chrome.storage.set     │
   │                      │   (store data)          │
   │                      │                         │
   │                      │            Tab loaded   │
   │                      │                         │
   │                      │◀─ onUpdated ────────────┤
   │                      │   (tab complete)        │
   │                      │                         │
   │                      ├─ chrome.tabs.          │
   │                      │   sendMessage ──────────▶│
   │                      │                         │
   │                      │              content.js runs
   │                      │                         │
   │                      │◀─ Retrieve data ────────┤
   │                      │   from storage          │
   │                      │                         │
   │                      │                Fill form
   │                      │                         │
   │                      │◀─ Success ──────────────┤
   │                      │                         │
   │◀─ Callback ──────────┤                         │
   │  (tabs opened)       │                         │
```

## Summary

This document provides visual workflows for:

1. ✅ User authentication
2. ✅ Single domain reporting
3. ✅ Job processing
4. ✅ Bulk import
5. ✅ Chrome extension operation
6. ✅ Email rotation
7. ✅ Report all domains
8. ✅ Template selection
9. ✅ WHOIS detection
10. ✅ Real-time updates
11. ✅ Error handling
12. ✅ Multi-tab reporting
13. ✅ System states
14. ✅ Data flow
15. ✅ Complete user journey
16. ✅ Extension communication

Use these diagrams to understand system behavior and troubleshoot issues.
