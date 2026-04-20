# Ngrok Setup Guide - Single Ngrok for Frontend Only

## Architecture
```
External Device (via ngrok)
    ↓
https://xyz.ngrok.io → Frontend (localhost:5173)
    ↓ (Vite proxy /api → localhost:3000)
Backend (localhost:3000) listening on 0.0.0.0
```

## Configuration Summary

### ✅ Frontend (Vite)
- **Port**: 5173
- **Host**: 0.0.0.0 (accepts external connections)
- **Proxy**: `/api` → `http://localhost:3000`
- **No environment variables needed** - uses relative paths only

### ✅ Backend (NestJS)
- **Port**: 3000
- **Host**: 0.0.0.0 (critical for ngrok proxy to work)
- **Global Prefix**: `/api`
- **CORS**: Allow all origins (`*`)

### ✅ API Calls
- Frontend always calls: `/api/...` (relative paths)
- Vite proxy routes to: `http://localhost:3000/api/...`
- No hardcoded URLs or env variables needed

## Setup Steps

### 1. Start Backend (Terminal 1)
```bash
cd backend
npm run start:dev
```
**Verify**: Should see `🚀 Backend running: http://localhost:3000`
**Test**: `curl http://localhost:3000/api/health` (should work)

### 2. Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
**Verify**: Should see `Local: http://localhost:5173`

### 3. Test Local (before ngrok)
Open browser: `http://localhost:5173`
- Check browser DevTools Network tab
- API calls should go to `/api/...` (relative)
- Status should be 200 OK

### 4. Start Ngrok (Terminal 3)
```bash
ngrok http 5173
```

**Copy the ngrok URL**, example:
```
https://abc123.ngrok.io
```

### 5. Test from External Device
From phone/other computer:
1. Open `https://abc123.ngrok.io`
2. Frontend loads ✅
3. Login/API calls work ✅
4. Check Network tab: requests go to `https://abc123.ngrok.io/api/...`
5. Vite proxy forwards to `localhost:3000/api/...`

## How It Works

1. **External device** → `https://abc123.ngrok.io/` 
   - Ngrok tunnels to `localhost:5173` (Vite)

2. **Frontend makes API call** → `/api/users` (relative path)
   - Browser resolves to: `https://abc123.ngrok.io/api/users`
   - Request goes through ngrok tunnel

3. **Vite dev server receives** → `/api/users`
   - Matches proxy rule: `/api`
   - Proxies to: `http://localhost:3000/api/users`

4. **Backend receives** → `http://localhost:3000/api/users`
   - NestJS handles with global prefix `/api`
   - Returns response through same tunnel

## Troubleshooting

### ❌ API calls fail with 502/504
- **Fix**: Make sure backend is running on `0.0.0.0:3000`
- Check `main.ts`: `await app.listen(port, '0.0.0.0')`

### ❌ CORS errors
- **Fix**: Backend must have `origin: '*'` in CORS config
- Check `.env`: `CORS_ORIGIN=*`
- Or check `main.ts`: `app.enableCors({ origin: '*' })`

### ❌ Ngrok shows "Invalid Host Header"
- **Fix**: Already configured in `vite.config.js`
- Verify: `host: '0.0.0.0'` is set

### ❌ Screenshots/static files don't load
- Backend serves static files from `/screenshots`
- URL format: `https://abc123.ngrok.io/screenshots/xxx.png`
- Vite proxy ONLY handles `/api`, other paths go through ngrok directly

## Important Notes

1. **Backend MUST run on 0.0.0.0**, not 127.0.0.1 or localhost
2. **No environment variables needed** in frontend `.env`
3. **Only ONE ngrok** instance needed (for frontend port 5173)
4. **Backend stays local** - no direct external access
5. **All API traffic** goes through ngrok → Vite proxy → backend

## Testing Checklist

- [ ] Backend starts on `0.0.0.0:3000`
- [ ] Frontend starts on `0.0.0.0:5173`
- [ ] Local test works (`http://localhost:5173`)
- [ ] Ngrok running on port 5173
- [ ] External device can access ngrok URL
- [ ] Login works from external device
- [ ] API calls show in backend console
- [ ] No CORS errors in browser console
- [ ] Screenshots/static assets load correctly

## Configuration Files Changed

- ✅ `frontend/.env` - Removed `VITE_API_BASE_URL`
- ✅ `frontend/vite.config.js` - Simplified proxy config
- ✅ `frontend/src/api/api.js` - Always use `/api`
- ✅ `frontend/src/pages/DashboardEnhanced.jsx` - Use relative paths
- ✅ `backend/.env` - Set `CORS_ORIGIN=*`
- ✅ `backend/src/main.ts` - Already configured correctly

## Ready to Deploy! 🚀
All configurations are set. Just follow the setup steps above.
