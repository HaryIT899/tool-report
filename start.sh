#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Domain Abuse Report Tool - Startup Script${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

echo "Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found! Please install Node.js v18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found:${NC} $(node --version)"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}⚠ MongoDB not found in PATH. Make sure it's running!${NC}"
else
    echo -e "${GREEN}✓ MongoDB found${NC}"
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠ Redis not found in PATH. Make sure it's running!${NC}"
else
    # Test Redis connection
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠ Redis CLI found but not responding${NC}"
    fi
fi

echo ""
echo "Starting services..."
echo ""

# Check if running in tmux or screen
if command -v tmux &> /dev/null; then
    echo "Starting with tmux..."
    
    # Create new tmux session
    tmux new-session -d -s domain-abuse
    
    # Backend window
    tmux rename-window -t domain-abuse:0 'backend'
    tmux send-keys -t domain-abuse:0 'cd backend && npm run start:dev' C-m
    
    # Frontend window
    tmux new-window -t domain-abuse:1 -n 'frontend'
    tmux send-keys -t domain-abuse:1 'cd frontend && npm run dev' C-m
    
    echo -e "${GREEN}Services started in tmux session 'domain-abuse'${NC}"
    echo ""
    echo "To attach: tmux attach -t domain-abuse"
    echo "To detach: Ctrl+B then D"
    echo "To stop: tmux kill-session -t domain-abuse"
    
else
    # Fallback to background processes
    echo "Starting Backend..."
    cd backend
    npm run start:dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    sleep 3
    
    echo "Starting Frontend..."
    cd frontend
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    echo ""
    echo -e "${GREEN}Services started in background${NC}"
    echo ""
    echo "Backend PID: $BACKEND_PID"
    echo "Frontend PID: $FRONTEND_PID"
    echo ""
    echo "View logs:"
    echo "  Backend:  tail -f logs/backend.log"
    echo "  Frontend: tail -f logs/frontend.log"
    echo ""
    echo "To stop:"
    echo "  kill $BACKEND_PID $FRONTEND_PID"
fi

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}Services started successfully!${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "Backend:  ${BLUE}http://localhost:3000${NC}"
echo -e "Frontend: ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "${CYAN}============================================${NC}"
echo "Installation Guide: QUICKSTART.md"
echo "Documentation: README.md"
echo -e "${CYAN}============================================${NC}"
echo ""
