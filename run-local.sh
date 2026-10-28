#!/bin/bash
# Histeeria local run script
set -e

echo "=== Histeeria Local Setup ==="

# Check dependencies
command -v go >/dev/null 2>&1 || { echo "Go not installed"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node not installed"; exit 1; }

# Setup env files if missing
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env from example"
fi
if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  echo "Created frontend/.env.local from example"
fi

# Load DATABASE_URL from backend/.env if available and not exported
if [ -z "$DATABASE_URL" ] && [ -f backend/.env ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' backend/.env | cut -d '=' -f2-)
fi
DATABASE_URL="${DATABASE_URL:-postgres://histeeria:histeeria@localhost:5432/histeeria?sslmode=disable}"

if [ "$1" == "migrate" ]; then
  echo "Running migrations against: $DATABASE_URL"
  psql "$DATABASE_URL" -f migrations/000001_init_schema.up.sql
  echo "Migrations complete!"
  exit 0
fi

echo ""
echo "1) Start PostgreSQL with pgvector (Docker):"
echo "   docker compose up -d db"
echo ""
echo "2) Run migrations:"
echo "   ./run-local.sh migrate"
echo "   # Or manually:"
echo "   psql \"$DATABASE_URL\" -f migrations/000001_init_schema.up.sql"
echo ""
echo "3) Start Go Backend (Terminal 1):"
echo "   cd backend && go run ./cmd/server"
echo ""
echo "4) Start Next.js Frontend (Terminal 2):"
echo "   cd frontend && npm run dev"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8080"
