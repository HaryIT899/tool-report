# Quick Start Guide

Get up and running in 10 minutes!

## Prerequisites

- Node.js v18+
- MongoDB running
- Redis running

Don't have them? See [INSTALL.md](INSTALL.md) for installation.

---

## 🚀 Quick Setup (5 Steps)

### 1. Backend Setup (2 minutes)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` - only change this:
```env
JWT_SECRET=change-this-to-any-random-string
```

```bash
npm run seed:all
npm run start:dev
```

✅ Backend running on http://localhost:3000

### 2. Frontend Setup (2 minutes)

Open new terminal:

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend running on http://localhost:5173

### 3. Install Extension (1 minute)

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `chrome-extension` folder

✅ Extension installed

### 4. Create Account (1 minute)

1. Open http://localhost:5173
2. Click "Register now"
3. Fill form:
   - Username: `admin`
   - Email: `admin@example.com`
   - Password: `admin123`
4. Click "Register"

✅ You're now logged in!

### 5. Test It (2 minutes)

**Add a domain:**
1. Click "Add Domain"
2. Domain: `test-phishing-site.com`
3. Reason: `Testing the system`
4. Click "Add Domain"

**Try reporting:**
1. Click "Report All" on the domain
2. Browser tabs open with auto-filled forms
3. You'd complete captchas (skip for now)
4. Check "Logs" button to see report history

✅ **System is working!**

---

## What's Next?

### Learn More

- **[README.md](README.md)** - Full feature overview
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup
- **[FEATURES.md](FEATURES.md)** - Complete feature list
- **[API_TESTING.md](API_TESTING.md)** - API documentation

### Common Tasks

**Add email accounts:**
```bash
# Using the UI (future feature) or API
curl -X POST http://localhost:3000/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"reporter1@example.com"}'
```

**Bulk import domains:**
1. Click "Bulk Import"
2. Paste domains (one per line)
3. Select template
4. Click "Import"

**Report all domains:**
1. Click "Report All Pending" button
2. Or press **Ctrl+Enter**

---

## Troubleshooting

### Backend won't start

**Check services:**
```bash
# MongoDB
mongosh
# Should connect successfully

# Redis  
redis-cli ping
# Should return: PONG
```

**Not running?** Start them:
```bash
# MongoDB
sudo systemctl start mongod    # Linux
brew services start mongodb    # macOS
net start MongoDB              # Windows

# Redis
sudo systemctl start redis     # Linux
brew services start redis      # macOS
redis-server                   # Windows
```

### Extension not working

1. Refresh extension: `chrome://extensions/` → click refresh
2. Reload page after enabling extension
3. Check browser console for errors
4. Try manual fill via extension popup

### Can't login

1. Check backend is running (http://localhost:3000/api/templates should return data)
2. Check browser console for errors
3. Clear localStorage and try again
4. Register new account

---

## Quick Commands Reference

### Backend

```bash
npm run start:dev     # Start development
npm run build         # Build for production
npm run seed          # Seed report services
npm run seed:accounts # Seed email accounts
npm run seed:all      # Seed everything
```

### Frontend

```bash
npm run dev           # Start development
npm run build         # Build for production
npm run preview       # Preview build
```

### Check Services

```bash
# MongoDB
mongosh --eval "db.version()"

# Redis
redis-cli ping

# Backend health
curl http://localhost:3000/api/templates

# Frontend
curl http://localhost:5173
```

---

## Architecture Overview

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Frontend  │────▶│  Backend   │────▶│  MongoDB   │
│  (React)   │ API │  (NestJS)  │     │            │
└────────────┘     └──────┬─────┘     └────────────┘
                          │
                          ▼
                   ┌────────────┐
                   │   Redis    │
                   │  (Queue)   │
                   └──────┬─────┘
                          │
                          ▼
                   ┌────────────┐
                   │ Puppeteer  │
                   │ (Browser)  │
                   └────────────┘
```

---

## Default Features Available

After setup, you immediately have:

✅ User authentication
✅ Domain management
✅ 5 pre-configured report services
✅ 6 abuse templates
✅ Browser automation
✅ Chrome extension
✅ Job queue system
✅ Report logging
✅ Real-time statistics
✅ Progress tracking

---

## Pro Tips

1. **Use templates** - Save time with pre-written descriptions
2. **Bulk import** - Add many domains at once
3. **Add email accounts** - Better rotation and rate limiting
4. **Monitor queue** - Watch sidebar for queue status
5. **Check logs** - Click "Logs" button on any domain
6. **Keyboard shortcut** - Ctrl+Enter for "Report All"
7. **Extension popup** - Manual control when needed

---

## Sample Workflow

**Day 1:**
```
1. Register account              (1 min)
2. Add 3 email accounts          (2 min)
3. Import 20 domains             (2 min)
4. Select phishing template      (1 min)
5. Click "Report All Pending"    (1 min)
6. Complete captchas as tabs open (~20 min)
7. Done! Check logs and stats    (2 min)
```

**Total time:** ~30 minutes for 100 reports (20 domains × 5 services)

---

## Need Help?

### Quick answers:
- **Can't connect to DB?** Check MongoDB is running
- **Can't connect to Redis?** Check Redis is running
- **Extension not filling?** Refresh page after enabling
- **API errors?** Check backend terminal for logs
- **Port in use?** Change port in config

### Detailed help:
- [FAQ.md](FAQ.md) - Common questions
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Troubleshooting section
- [GitHub Issues](https://github.com/your-repo/issues) - Community support

---

## Ready to Go!

You now have a fully functional domain abuse reporting system.

**Next steps:**
1. Add your email accounts
2. Import your domains
3. Start reporting abuse
4. Make the internet safer!

**Enjoy! 🛡️**
