#!/bin/bash

# Clarify - Restart Script
# Terminates and restarts both backend and frontend servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Ensure we use Homebrew's Node (not any virtualenv-modified PATH)
export PATH="/opt/homebrew/bin:$PATH"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}       Clarify - Server Restart Script          ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Show versions
echo -e "${YELLOW}Node version: $(node --version)${NC}"
echo -e "${YELLOW}npm version: $(npm --version)${NC}"
echo ""

# Function to kill processes on a port
kill_port() {
    local port=$1
    local name=$2
    echo -e "${YELLOW}Stopping $name on port $port...${NC}"

    # Find and kill process on the port
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✓ $name stopped${NC}"
    else
        echo -e "${YELLOW}  No process found on port $port${NC}"
    fi
}

# Stop existing processes
echo -e "${RED}Terminating existing processes...${NC}"
echo ""

# Kill uvicorn/python processes for backend
pkill -f "uvicorn app.main:app" 2>/dev/null || true
kill_port 8000 "Backend (FastAPI)"

# Kill next.js processes for frontend
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
kill_port 3000 "Frontend (Next.js)"

# Wait for ports to be free
echo ""
echo -e "${YELLOW}Waiting for ports to be released...${NC}"
sleep 2

echo ""
echo -e "${GREEN}Starting servers...${NC}"
echo ""

# Start Backend
echo -e "${BLUE}Starting Backend (FastAPI)...${NC}"
cd "$BACKEND_DIR"

# Check for venv or .venv
if [ -d "venv" ]; then
    VENV_DIR="venv"
elif [ -d ".venv" ]; then
    VENV_DIR=".venv"
else
    echo -e "${RED}Error: Virtual environment not found (checked venv and .venv).${NC}"
    echo -e "${YELLOW}Create one with: python3 -m venv venv${NC}"
    exit 1
fi

echo -e "${YELLOW}Using virtual environment: $VENV_DIR${NC}"

# Start backend with full path to uvicorn
nohup bash -c "cd $BACKEND_DIR && source $VENV_DIR/bin/activate && python -m uvicorn app.main:app --reload --port 8000" > "$PROJECT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "  Logs: $PROJECT_DIR/backend.log"

# Start Frontend (use explicit PATH to ensure correct Node version)
echo -e "${BLUE}Starting Frontend (Next.js)...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Start with explicit PATH to use Homebrew Node
nohup bash -c "export PATH=/opt/homebrew/bin:\$PATH && cd $FRONTEND_DIR && npm run dev" > "$PROJECT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "  Logs: $PROJECT_DIR/frontend.log"

# Wait a moment for servers to start
echo ""
echo -e "${YELLOW}Waiting for servers to initialize...${NC}"
sleep 4

# Check if servers are running
echo ""
echo -e "${BLUE}Checking server status...${NC}"

if lsof -ti :8000 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on http://localhost:8000${NC}"
else
    echo -e "${RED}✗ Backend failed to start. Check backend.log:${NC}"
    tail -10 "$PROJECT_DIR/backend.log" 2>/dev/null || echo "  No log file found"
fi

if lsof -ti :3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running on http://localhost:3000${NC}"
else
    echo -e "${RED}✗ Frontend failed to start. Check frontend.log:${NC}"
    tail -10 "$PROJECT_DIR/frontend.log" 2>/dev/null || echo "  No log file found"
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}Restart complete!${NC}"
echo ""
echo -e "View logs:"
echo -e "  Backend:  ${YELLOW}tail -f $PROJECT_DIR/backend.log${NC}"
echo -e "  Frontend: ${YELLOW}tail -f $PROJECT_DIR/frontend.log${NC}"
echo ""
echo -e "Stop all:"
echo -e "  ${YELLOW}pkill -f 'uvicorn|next'${NC}"
echo -e "${BLUE}================================================${NC}"
