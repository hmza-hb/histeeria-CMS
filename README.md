# Histeeria

Personal memory application. You live your life; Histeeria remembers it.

## Structure
- `frontend/` - Next.js (App Router) UI
- `backend/` - Go (Gin) API
- `migrations/` - PostgreSQL migrations (with pgvector)

## Quick start (local)
1. Copy envs: `cp backend/.env.example backend/.env` and `cp frontend/.env.example frontend/.env.local`
2. Start DB: `docker compose up -d db`
3. Run migrations against your Postgres
4. Backend: `cd backend && go run ./cmd/server`
5. Frontend: `cd frontend && npm install && npm run dev`

## Features
- Auth: email/password, Google sign-in, email OTP (6-digit), forgot/reset password
- Memories: create, view, edit, delete, keyword search; AI extraction + embeddings (Gemini), facts stored separately
- Ask Histeeria: semantic search (pgvector) + keyword search, grounded answers with sources
- Reminders: create, upcoming/overdue/completed, background worker with duplicate prevention
- User-scoped data, protected routes
