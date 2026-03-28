@echo off
echo ============================================
echo Domain Abuse Report Tool - Startup Script
echo ============================================
echo.

echo Checking prerequisites...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install Node.js v18+
    pause
    exit /b 1
)

where mongod >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] MongoDB not found in PATH. Make sure it's running!
    echo.
)

where redis-server >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Redis not found in PATH. Make sure it's running!
    echo.
)

echo [OK] Prerequisites check completed
echo.

echo Starting services...
echo.

echo [1/2] Starting Backend...
start "Backend Server" cmd /k "cd backend && npm run start:dev"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend...
start "Frontend Server" cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo Services started successfully!
echo ============================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Check the opened terminal windows for logs.
echo.
echo To stop services: Close the terminal windows or press Ctrl+C
echo.
echo ============================================
echo Installation Guide: QUICKSTART.md
echo Documentation: README.md
echo ============================================
echo.
pause
