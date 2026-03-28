# Complete Setup Guide

Step-by-step guide to get the Domain Abuse Report Tool running.

## Prerequisites Installation

### 1. Node.js (v18+)

**Windows:**
- Download from https://nodejs.org/
- Install LTS version
- Verify: `node --version`

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS:**
```bash
brew install node@18
```

### 2. MongoDB (v6+)

**Windows:**
1. Download from https://www.mongodb.com/try/download/community
2. Install as Windows Service
3. Default port: 27017

**Linux (Ubuntu):**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

**Docker (All Platforms):**
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:6
```

### 3. Redis (v7+)

**Windows:**
- Download from https://github.com/microsoftarchive/redis/releases
- Extract and run `redis-server.exe`
- Or use Docker (recommended)

**Linux:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Docker (All Platforms - Recommended):**
```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:alpine
```

Verify Redis:
```bash
redis-cli ping
# Should return: PONG
```

## Backend Setup

### Step 1: Navigate to Backend

```bash
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- NestJS framework
- MongoDB driver (Mongoose)
- BullMQ and Redis client
- Puppeteer
- JWT and bcrypt
- All other dependencies

**Installation time:** ~2-5 minutes depending on internet speed

### Step 3: Configure Environment

```bash
# Windows
copy .env.example .env

# Linux/macOS
cp .env.example .env
```

Edit `.env` file:

```env
# Application
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/domain-abuse-db

# Redis (use your settings)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (CHANGE THIS!)
JWT_SECRET=generate-a-secure-random-string-at-least-32-characters-long
JWT_EXPIRES_IN=7d

# CORS (frontend URL)
CORS_ORIGIN=http://localhost:5173

# Puppeteer
PUPPETEER_HEADLESS=false
PUPPETEER_TIMEOUT=60000

# Chrome Extension (add after installing extension)
EXTENSION_ID=
```

**Important:** Generate a secure JWT_SECRET:
```bash
# Linux/macOS
openssl rand -base64 32

# Or use any random string generator
```

### Step 4: Seed Database

```bash
npm run seed
```

This creates default report services:
- Google Spam
- Google Phishing
- Google DMCA
- Cloudflare Abuse
- Radix Abuse

### Step 5: Start Backend

```bash
npm run start:dev
```

Expected output:
```
[Nest] 12345  - Application is running on: http://localhost:3000
```

**Keep this terminal running!**

## Frontend Setup

### Step 1: Open New Terminal

Open a new terminal/command prompt window.

### Step 2: Navigate to Frontend

```bash
cd frontend
```

### Step 3: Install Dependencies

```bash
npm install
```

This installs:
- React 18
- Vite
- Ant Design
- Axios
- React Router

**Installation time:** ~1-3 minutes

### Step 4: Start Frontend

```bash
npm run dev
```

Expected output:
```
VITE v5.0.11  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Keep this terminal running!**

## Chrome Extension Setup

### Step 1: Open Chrome Extensions Page

Navigate to: `chrome://extensions/`

### Step 2: Enable Developer Mode

Toggle "Developer mode" switch in the top-right corner.

### Step 3: Load Extension

1. Click "Load unpacked"
2. Browse to `chrome-extension` folder in your project
3. Click "Select Folder"

### Step 4: Get Extension ID

1. Find "Domain Abuse Reporter Helper" in the list
2. Copy the ID (under the extension name)
3. Update backend `.env`:
   ```env
   EXTENSION_ID=your-copied-id-here
   ```

### Step 5: Pin Extension (Optional)

Click the puzzle icon in Chrome toolbar and pin the extension for easy access.

## Verification

### 1. Check All Services Running

Open 3 terminals and verify:

**Terminal 1 - Backend:**
```
[Nest] Application is running on: http://localhost:3000
```

**Terminal 2 - Frontend:**
```
➜  Local:   http://localhost:5173/
```

**Terminal 3 - Check Services:**
```bash
# Check MongoDB
mongosh --eval "db.version()"

# Check Redis
redis-cli ping
```

### 2. Test Application

1. Open browser: `http://localhost:5173`
2. Click "Register now"
3. Create account:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `test123`
4. You should be redirected to dashboard

### 3. Test Features

**Add Domain:**
1. Click "Add Domain"
2. Enter domain: `evil-site.com`
3. Enter reason: `Phishing attack`
4. Click "Add Domain"
5. Should appear in table

**Bulk Import:**
1. Click "Bulk Import"
2. Paste multiple domains:
   ```
   evil1.com
   evil2.com
   evil3.com
   ```
3. Select template: "Phishing"
4. Click "Import"
5. All domains should appear

**Report Domain:**
1. Click "Report All" on a domain
2. Browser tabs should open with auto-filled forms
3. Complete captcha on each tab
4. Submit forms manually

## Adding Email Accounts

For email rotation feature:

```bash
# Using curl
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email":"reporter1@example.com"}'
```

Or use Postman/Insomnia to POST to `/api/accounts`

Add multiple accounts for better rotation:
- reporter1@example.com
- reporter2@example.com
- reporter3@example.com

## Troubleshooting

### Backend won't start

**Error: "Cannot connect to MongoDB"**
```bash
# Check MongoDB is running
mongosh
# Or
mongo

# Start MongoDB if not running
# Windows: net start MongoDB
# Linux: sudo systemctl start mongodb
# macOS: brew services start mongodb-community
```

**Error: "Cannot connect to Redis"**
```bash
# Check Redis is running
redis-cli ping

# Start Redis if not running
# Windows: Run redis-server.exe
# Linux: sudo systemctl start redis
# macOS: brew services start redis
```

**Error: "Port 3000 already in use"**
- Change PORT in `.env` to different port (e.g., 3001)
- Or kill process using port 3000

### Frontend won't start

**Error: "Port 5173 already in use"**
- Vite will suggest alternative port
- Or update `vite.config.js`:
  ```javascript
  server: { port: 5174 }
  ```

### Extension not working

**Not auto-filling:**
1. Refresh the page after loading extension
2. Check extension is enabled
3. Verify you're on supported website
4. Open extension popup and try manual fill

**Can't load extension:**
- Ensure manifest.json is valid
- Check Developer mode is enabled
- Try reloading extension

### Puppeteer issues

**Browser won't open:**
- Check `PUPPETEER_HEADLESS=false` in `.env`
- Install Chrome/Chromium
- Linux: `sudo apt-get install chromium-browser`

**Form fields not filling:**
- Website structure may have changed
- Use Chrome extension as fallback
- Update selectors in `puppeteer.service.ts`

### Jobs stuck in queue

**Check queue status:**
```bash
redis-cli
> LLEN bull:report-queue:wait
> LLEN bull:report-queue:active
```

**Clear queue (if needed):**
```bash
redis-cli FLUSHALL
# Then restart backend
```

## Next Steps

After setup is complete:

1. **Add email accounts** for rotation
2. **Import domains** (bulk or individual)
3. **Select templates** for common abuse types
4. **Test reporting** with one domain first
5. **Use "Report All"** for batch processing
6. **Monitor logs** and statistics
7. **Manage accounts** (mark banned ones)

## Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to secure random string
- [ ] Use production MongoDB with authentication
- [ ] Use production Redis with password
- [ ] Update CORS_ORIGIN to production domain
- [ ] Set NODE_ENV=production
- [ ] Enable MongoDB indexes
- [ ] Setup process manager (PM2)
- [ ] Configure reverse proxy (Nginx)
- [ ] Enable HTTPS/SSL
- [ ] Setup monitoring and logging
- [ ] Configure backups (MongoDB + Redis)
- [ ] Test all features thoroughly
- [ ] Document custom configurations

## Getting Help

- Check console logs in browser (F12)
- Check backend terminal for errors
- Check Redis connection: `redis-cli ping`
- Check MongoDB connection: `mongosh`
- Review README files in each folder
- Check queue status via API: `GET /api/reports/queue-stats`

## Development Tips

### Hot Reload

Both backend and frontend support hot reload:
- Backend: Changes trigger automatic restart
- Frontend: Changes update instantly in browser

### Database GUI (Optional)

**MongoDB Compass:**
- Download from https://www.mongodb.com/products/compass
- Connect to: `mongodb://localhost:27017`
- Browse collections visually

**Redis GUI:**
- Redis Commander: `npm install -g redis-commander`
- Run: `redis-commander`
- Open: `http://localhost:8081`

### API Testing

Use **Postman** or **Insomnia**:
1. Import endpoints
2. Set Authorization header: `Bearer <token>`
3. Test all endpoints

### Browser DevTools

- **F12** - Open DevTools
- **Network tab** - Monitor API calls
- **Console tab** - View logs
- **Application tab** - Check localStorage (JWT token)

## Summary

You should now have:
- ✅ Backend running on port 3000
- ✅ Frontend running on port 5173
- ✅ MongoDB storing data
- ✅ Redis managing job queue
- ✅ Chrome extension installed
- ✅ Report services seeded
- ✅ Ready to manage domain abuse reports!

Access the application at: **http://localhost:5173**

Happy reporting! 🛡️
