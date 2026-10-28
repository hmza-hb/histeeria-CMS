# Quick Start

## Prerequisites
- Go 1.22+
- Node.js 18+
- PostgreSQL with pgvector extension

## Setup

### 1) Environment
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit backend/.env with your DATABASE_URL, GEMINI_API_KEY, JWT_SECRET
```

### 2) Database
```bash
# Using docker
docker compose up -d db

# Run migrations
psql "$DATABASE_URL" -f migrations/000001_init_schema.up.sql
```

### 3) Run
```bash
# Terminal 1 - Backend
cd backend
go mod download
go run ./cmd/server

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Railway Deployment
- Deploy backend as a Go service (Dockerfile in backend/)
- Deploy frontend as Next.js
- Set environment variables as per .env.template
- Run migrations against production DB
- Ensure pgvector extension is enabled
