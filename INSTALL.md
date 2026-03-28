# Installation Script

Quick installation guide for Domain Abuse Report Tool.

## Automated Installation (Recommended)

### Windows (PowerShell)

```powershell
# Clone or download the project
cd tool-report

# Backend setup
cd backend
npm install
Copy-Item .env.example .env
Write-Host "Please edit backend/.env with your configuration" -ForegroundColor Yellow
pause
npm run seed:all
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PWD; npm run start:dev"

# Frontend setup
cd ../frontend
npm install
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PWD; npm run dev"

Write-Host "Setup complete! Check the opened terminals." -ForegroundColor Green
Write-Host "Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
```

### Linux/macOS (Bash)

```bash
#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}Domain Abuse Report Tool - Installation${NC}"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v mongod >/dev/null 2>&1 || echo -e "${YELLOW}Warning: MongoDB not found. Please install MongoDB.${NC}"
command -v redis-cli >/dev/null 2>&1 || echo -e "${YELLOW}Warning: Redis not found. Please install Redis.${NC}"

echo -e "${GREEN}✓ Node.js found${NC}"

# Backend setup
echo ""
echo "Setting up backend..."
cd backend
npm install

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}Please edit backend/.env with your configuration${NC}"
    echo "Press Enter after editing .env..."
    read
fi

npm run seed:all

echo -e "${GREEN}✓ Backend configured${NC}"

# Frontend setup
echo ""
echo "Setting up frontend..."
cd ../frontend
npm install
echo -e "${GREEN}✓ Frontend configured${NC}"

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "To start the application:"
echo -e "${CYAN}Terminal 1:${NC} cd backend && npm run start:dev"
echo -e "${CYAN}Terminal 2:${NC} cd frontend && npm run dev"
echo ""
echo "Then install Chrome extension from chrome-extension/ folder"
```

## Manual Installation

### Step 1: Prerequisites

Ensure installed:
- Node.js v18+
- MongoDB v6+
- Redis v7+

### Step 2: Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env
npm run seed:all
npm run start:dev
```

### Step 3: Frontend

```bash
cd frontend
npm install
npm run dev
```

### Step 4: Chrome Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `chrome-extension` folder

## Docker Compose (Alternative)

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: domain-abuse-db

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
      - redis
    environment:
      MONGODB_URI: mongodb://mongodb:27017/domain-abuse-db
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: your-secret-key
      CORS_ORIGIN: http://localhost:5173
    volumes:
      - ./backend:/app
      - /app/node_modules

volumes:
  mongodb_data:
  redis_data:
```

Run with:
```bash
docker-compose up -d
```

## Verification

### Check Services

```bash
# MongoDB
mongosh --eval "db.version()"

# Redis
redis-cli ping

# Backend
curl http://localhost:3000/api/templates

# Frontend
curl http://localhost:5173
```

### Check Logs

```bash
# Backend logs
cd backend
# Check terminal output

# Frontend logs
cd frontend
# Check terminal output

# MongoDB logs
# Windows: Check MongoDB log file
# Linux: sudo journalctl -u mongod

# Redis logs
redis-cli INFO server
```

## Troubleshooting

### Port Conflicts

**Backend (3000):**
- Edit `backend/.env`: `PORT=3001`

**Frontend (5173):**
- Edit `frontend/vite.config.js`: `server: { port: 5174 }`

**MongoDB (27017):**
- Edit `backend/.env`: `MONGODB_URI=mongodb://localhost:27018/...`

**Redis (6379):**
- Edit `backend/.env`: `REDIS_PORT=6380`

### Permission Issues

**Linux/macOS:**
```bash
# MongoDB data directory
sudo chown -R $USER:$USER /data/db

# Project files
sudo chown -R $USER:$USER .
```

**Windows:**
- Run terminals as Administrator if needed

### Missing Dependencies

```bash
# Backend
cd backend
npm install

# Frontend  
cd frontend
npm install

# Global tools
npm install -g @nestjs/cli
```

## Quick Start Script

Save as `start.sh` (Linux/macOS) or `start.bat` (Windows):

**start.sh:**
```bash
#!/bin/bash
cd backend && npm run start:dev &
cd frontend && npm run dev &
echo "Services starting..."
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
```

**start.bat:**
```batch
@echo off
start cmd /k "cd backend && npm run start:dev"
start cmd /k "cd frontend && npm run dev"
echo Services starting...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
```

## Post-Installation

After successful installation:

1. **Register account** at http://localhost:5173/register
2. **Add email accounts** for rotation (optional)
3. **Import domains** using bulk import
4. **Test reporting** with one domain
5. **Review logs** in dashboard

## Updating

To update the application:

```bash
# Pull latest changes (if using git)
git pull

# Update backend
cd backend
npm install
npm run build

# Update frontend
cd ../frontend
npm install
npm run build

# Restart services
```

## Uninstalling

To remove completely:

```bash
# Stop services
# Ctrl+C in both terminals

# Remove Node modules
cd backend && rm -rf node_modules
cd ../frontend && rm -rf node_modules

# Remove databases (optional)
mongo
> use domain-abuse-db
> db.dropDatabase()

redis-cli FLUSHALL

# Remove project folder
cd ../..
rm -rf tool-report
```

## Support

If you encounter issues:
1. Check all services are running
2. Review logs in terminals
3. Verify .env configuration
4. Check firewall settings
5. Review SETUP_GUIDE.md for detailed troubleshooting

## Next Steps

See **SETUP_GUIDE.md** for detailed usage instructions and **README.md** for feature documentation.
