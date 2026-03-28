# API Testing Guide

Complete guide for testing all API endpoints using Postman, Insomnia, or curl.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints except `/auth/register` and `/auth/login` require JWT token.

Add to headers:
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

---

## 1. Authentication Endpoints

### Register User

**POST** `/api/auth/register`

**Body:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "test123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65abc123...",
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  }
}
```

**Status Codes:**
- 201: Created
- 409: Username/email already exists
- 400: Validation error

### Login

**POST** `/api/auth/login`

**Body:**
```json
{
  "username": "testuser",
  "password": "test123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65abc123...",
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  }
}
```

**Status Codes:**
- 200: Success
- 401: Invalid credentials

---

## 2. Domain Endpoints

**All require Authorization header!**

### Get All Domains

**GET** `/api/domains`

**Response:**
```json
[
  {
    "_id": "65abc...",
    "domain": "evil-site.com",
    "reason": "Phishing attack",
    "status": "pending",
    "createdBy": "65user...",
    "registrar": "Cloudflare",
    "nameserver": "Cloudflare",
    "template": "phishing",
    "reportedServices": [],
    "reportProgress": 0,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
]
```

### Create Domain

**POST** `/api/domains`

**Body:**
```json
{
  "domain": "malicious-site.com",
  "reason": "This domain is distributing malware",
  "template": "malware"
}
```

**Response:**
```json
{
  "_id": "65abc...",
  "domain": "malicious-site.com",
  "reason": "This domain is distributing malware",
  "status": "pending",
  "createdBy": "65user...",
  "reportedServices": [],
  "reportProgress": 0,
  "createdAt": "2024-01-20T10:35:00.000Z"
}
```

### Bulk Import

**POST** `/api/domains/bulk-import`

**Body (newline-separated):**
```json
{
  "domains": "evil1.com\nevil2.com\nevil3.com",
  "reason": "Phishing sites",
  "template": "phishing"
}
```

**Body (comma-separated):**
```json
{
  "domains": "evil1.com, evil2.com, evil3.com",
  "reason": "Spam domains",
  "template": "spam"
}
```

**Response:**
```json
{
  "message": "Imported 3 domains successfully. 0 failed.",
  "imported": 3,
  "failed": 0
}
```

### Update Domain

**PATCH** `/api/domains/:id`

**Body:**
```json
{
  "status": "reported"
}
```

**Response:**
```json
{
  "_id": "65abc...",
  "domain": "evil-site.com",
  "status": "reported",
  ...
}
```

### Delete Domain

**DELETE** `/api/domains/:id`

**Response:**
```json
{
  "message": "Domain deleted successfully"
}
```

---

## 3. Report Endpoints

### Report Single Domain

**POST** `/api/reports/domain/:id`

**Body:**
```json
{
  "serviceIds": [
    "65service1...",
    "65service2...",
    "65service3..."
  ]
}
```

**Response:**
```json
{
  "message": "Queued 3 report jobs",
  "jobs": [
    {
      "jobId": "1",
      "service": "Google Spam"
    },
    {
      "jobId": "2",
      "service": "Google Phishing"
    },
    {
      "jobId": "3",
      "service": "Cloudflare Abuse"
    }
  ]
}
```

### Report All Domains

**POST** `/api/reports/all`

**Response:**
```json
{
  "message": "Queued 15 report jobs for 3 domains",
  "domains": 3,
  "jobs": 15
}
```

### Get Queue Stats

**GET** `/api/reports/queue-stats`

**Response:**
```json
{
  "waiting": 5,
  "active": 1,
  "completed": 42,
  "failed": 3
}
```

---

## 4. Report Services Endpoints

### Get All Services

**GET** `/api/report-services`

**Response:**
```json
[
  {
    "_id": "65service...",
    "name": "Google Spam",
    "reportUrl": "https://search.google.com/search-console/report-spam",
    "type": "autofill_supported",
    "active": true
  },
  {
    "_id": "65service...",
    "name": "Google Phishing",
    "reportUrl": "https://safebrowsing.google.com/safebrowsing/report_phish/",
    "type": "autofill_supported",
    "active": true
  }
]
```

---

## 5. Report Logs Endpoints

### Get User Logs

**GET** `/api/report-logs`

**Query Params:** limit (optional, default 100)

**Response:**
```json
[
  {
    "_id": "65log...",
    "domainId": {
      "_id": "65domain...",
      "domain": "evil.com"
    },
    "serviceId": {
      "_id": "65service...",
      "name": "Google Spam"
    },
    "userId": "65user...",
    "accountId": {
      "_id": "65account...",
      "email": "reporter1@example.com"
    },
    "email": "reporter1@example.com",
    "status": "success",
    "jobId": "1",
    "createdAt": "2024-01-20T10:40:00.000Z",
    "updatedAt": "2024-01-20T10:41:00.000Z"
  }
]
```

### Get Statistics

**GET** `/api/report-logs/stats`

**Response:**
```json
{
  "total": 50,
  "success": 42,
  "failed": 3,
  "pending": 2,
  "processing": 3
}
```

### Get Domain Logs

**GET** `/api/report-logs/domain/:domainId`

**Response:**
```json
[
  {
    "_id": "65log...",
    "serviceId": {
      "name": "Google Spam",
      "reportUrl": "https://..."
    },
    "status": "success",
    "email": "reporter1@example.com",
    "createdAt": "2024-01-20T10:40:00.000Z"
  }
]
```

---

## 6. Account Endpoints

### Get All Accounts

**GET** `/api/accounts`

**Response:**
```json
[
  {
    "_id": "65account...",
    "email": "reporter1@example.com",
    "status": "active",
    "lastUsedAt": "2024-01-20T10:30:00.000Z",
    "reportCount": 15,
    "createdAt": "2024-01-15T08:00:00.000Z"
  }
]
```

### Create Account

**POST** `/api/accounts`

**Body:**
```json
{
  "email": "reporter5@example.com"
}
```

**Response:**
```json
{
  "_id": "65account...",
  "email": "reporter5@example.com",
  "status": "active",
  "reportCount": 0,
  "createdAt": "2024-01-20T11:00:00.000Z"
}
```

### Update Account

**PATCH** `/api/accounts/:id`

**Body:**
```json
{
  "status": "banned"
}
```

**Response:**
```json
{
  "_id": "65account...",
  "email": "reporter5@example.com",
  "status": "banned",
  ...
}
```

### Delete Account

**DELETE** `/api/accounts/:id`

**Response:**
```json
{
  "message": "Account deleted successfully"
}
```

### Reset Statistics

**POST** `/api/accounts/reset-stats`

**Response:**
```json
{
  "message": "Usage stats reset successfully"
}
```

---

## 7. Template Endpoints

### Get All Templates

**GET** `/api/templates`

**Response:**
```json
[
  {
    "id": "phishing",
    "name": "Phishing",
    "description": "This domain is being used for phishing attacks..."
  },
  {
    "id": "malware",
    "name": "Malware Distribution",
    "description": "This domain is distributing malware..."
  }
]
```

---

## 8. WHOIS Endpoints

### WHOIS Lookup

**GET** `/api/whois/lookup?domain=example.com`

**Response:**
```json
{
  "registrar": "Cloudflare, Inc.",
  "nameservers": ["Cloudflare"],
  "creationDate": "2023-05-15",
  "expirationDate": "2025-05-15"
}
```

### Get Suggestions

**GET** `/api/whois/suggestions?domain=example.com`

**Response:**
```json
{
  "suggestions": [
    "Google Spam",
    "Google Phishing",
    "Cloudflare Abuse"
  ]
}
```

---

## Testing with cURL

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'
```

### Get Domains (with auth)

```bash
curl -X GET http://localhost:3000/api/domains \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Domain

```bash
curl -X POST http://localhost:3000/api/domains \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"domain":"evil.com","reason":"Phishing attack"}'
```

### Bulk Import

```bash
curl -X POST http://localhost:3000/api/domains/bulk-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"domains":"evil1.com\nevil2.com\nevil3.com","reason":"Spam sites"}'
```

### Report Domain

```bash
curl -X POST http://localhost:3000/api/reports/domain/DOMAIN_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"serviceIds":["SERVICE_ID_1","SERVICE_ID_2"]}'
```

### Report All

```bash
curl -X POST http://localhost:3000/api/reports/all \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Postman Collection

Import this JSON to Postman:

```json
{
  "info": {
    "name": "Domain Abuse API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"testuser\",\n  \"email\": \"test@example.com\",\n  \"password\": \"test123\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/auth/register",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "register"]
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"testuser\",\n  \"password\": \"test123\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          }
        }
      ]
    },
    {
      "name": "Domains",
      "item": [
        {
          "name": "Get Domains",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/domains",
              "host": ["{{baseUrl}}"],
              "path": ["domains"]
            }
          }
        },
        {
          "name": "Create Domain",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"domain\": \"evil-site.com\",\n  \"reason\": \"Phishing attack\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/domains",
              "host": ["{{baseUrl}}"],
              "path": ["domains"]
            }
          }
        },
        {
          "name": "Bulk Import",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"domains\": \"evil1.com\\nevil2.com\\nevil3.com\",\n  \"reason\": \"Spam sites\",\n  \"template\": \"spam\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/domains/bulk-import",
              "host": ["{{baseUrl}}"],
              "path": ["domains", "bulk-import"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## Testing Workflow

### 1. Initial Setup

```bash
# Register
POST /auth/register

# Save the access_token from response
export TOKEN="your_token_here"
```

### 2. Add Email Accounts

```bash
POST /accounts
Body: {"email":"reporter1@example.com"}

POST /accounts
Body: {"email":"reporter2@example.com"}
```

### 3. Get Templates

```bash
GET /templates
# Note the template IDs for use in domain creation
```

### 4. Add Domains

**Single:**
```bash
POST /domains
Body: {"domain":"evil.com","reason":"Phishing","template":"phishing"}
```

**Bulk:**
```bash
POST /domains/bulk-import
Body: {"domains":"evil1.com\nevil2.com","template":"spam"}
```

### 5. Get Report Services

```bash
GET /report-services
# Note service IDs for reporting
```

### 6. Report Domain

```bash
POST /reports/domain/DOMAIN_ID
Body: {"serviceIds":["SERVICE_ID_1","SERVICE_ID_2"]}
```

### 7. Monitor Progress

```bash
# Check queue
GET /reports/queue-stats

# Check logs
GET /report-logs

# Check statistics
GET /report-logs/stats
```

### 8. WHOIS Lookup

```bash
GET /whois/lookup?domain=cloudflare.com
GET /whois/suggestions?domain=cloudflare.com
```

---

## Expected Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 500 | Internal Server Error |

---

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

Or:

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Testing Checklist

- [ ] Register new user
- [ ] Login with credentials
- [ ] Create single domain
- [ ] Bulk import domains
- [ ] Get all domains
- [ ] Update domain status
- [ ] Delete domain
- [ ] Add email accounts
- [ ] Get report services
- [ ] Report single domain
- [ ] Report all domains
- [ ] Check queue stats
- [ ] View report logs
- [ ] Get log statistics
- [ ] Get templates
- [ ] WHOIS lookup
- [ ] Get service suggestions

---

## Advanced Testing

### Load Testing

Use Apache Bench or Artillery:

```bash
# Install Artillery
npm install -g artillery

# Create artillery.yml
artillery quick --count 10 --num 100 http://localhost:3000/api/domains
```

### Stress Testing Queue

```bash
# Add 100 domains quickly
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/domains \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"domain\":\"evil$i.com\",\"reason\":\"Test\"}"
done

# Report all
curl -X POST http://localhost:3000/api/reports/all \
  -H "Authorization: Bearer $TOKEN"

# Monitor queue
watch -n 1 'curl -s http://localhost:3000/api/reports/queue-stats \
  -H "Authorization: Bearer $TOKEN"'
```

### Database Inspection

```bash
# Connect to MongoDB
mongosh

use domain-abuse-db

# Count documents
db.users.countDocuments()
db.domains.countDocuments()
db.reportlogs.countDocuments()

# View recent logs
db.reportlogs.find().sort({createdAt:-1}).limit(5).pretty()
```

### Redis Queue Inspection

```bash
# Connect to Redis
redis-cli

# List keys
KEYS *

# Check queue length
LLEN bull:report-queue:wait
LLEN bull:report-queue:active
LLEN bull:report-queue:completed
LLEN bull:report-queue:failed

# View job data
HGETALL bull:report-queue:1
```

---

## Automated Test Script

Save as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "Testing Domain Abuse API..."

# Register
echo "1. Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"apitest","email":"apitest@example.com","password":"test123"}')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.access_token')

echo "Token: ${TOKEN:0:20}..."

# Create domain
echo "2. Creating domain..."
curl -s -X POST $BASE_URL/domains \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"test-evil.com","reason":"Test phishing"}' | jq

# Get domains
echo "3. Getting domains..."
curl -s -X GET $BASE_URL/domains \
  -H "Authorization: Bearer $TOKEN" | jq

# Get templates
echo "4. Getting templates..."
curl -s -X GET $BASE_URL/templates | jq

echo "API testing complete!"
```

Run with: `bash test-api.sh`

---

## Summary

Total endpoints: **23**
- Auth: 2
- Domains: 5
- Reports: 3
- Services: 1
- Logs: 3
- Accounts: 5
- Templates: 1
- WHOIS: 2
- Health: 1 (optional)

All endpoints documented with:
- Request format
- Response format
- Status codes
- Example payloads
- cURL commands
