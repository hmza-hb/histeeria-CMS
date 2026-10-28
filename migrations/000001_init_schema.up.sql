-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    timezone VARCHAR(100) DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Memories table
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    original_content TEXT NOT NULL,
    summary TEXT,
    memory_type VARCHAR(50) NOT NULL DEFAULT 'general',
    source_type VARCHAR(50) NOT NULL DEFAULT 'text',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

-- Index for user-scoped chronological memory retrieval
CREATE INDEX IF NOT EXISTS idx_memories_user_created ON memories (user_id, created_at DESC);

-- Index for memory type filtering
CREATE INDEX IF NOT EXISTS idx_memories_user_type ON memories (user_id, memory_type);

-- Full-text search index on title, summary, and original_content
CREATE INDEX IF NOT EXISTS idx_memories_fts ON memories USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(original_content, ''))
);

-- 3. Memory Facts table
CREATE TABLE IF NOT EXISTS memory_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    source_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memory_facts_memory_id ON memory_facts (memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_facts_user_id ON memory_facts (user_id);

-- 4. Memory Embeddings table (768 dimensions for Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS memory_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    embedding vector(768) NOT NULL,
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-004',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_memory_embedding UNIQUE (memory_id, embedding_model)
);

CREATE INDEX IF NOT EXISTS idx_memory_embeddings_user ON memory_embeddings (user_id);
-- HNSW index for fast approximate nearest neighbor cosine similarity
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_vector ON memory_embeddings USING hnsw (embedding vector_cosine_ops);

-- 5. Reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, snoozed, cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

-- Index for upcoming / overdue reminder lookup
CREATE INDEX IF NOT EXISTS idx_reminders_user_status_scheduled ON reminders (user_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reminders_worker ON reminders (status, scheduled_at) WHERE status = 'pending';

-- 6. Reminder Deliveries table
CREATE TABLE IF NOT EXISTS reminder_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_count INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_reminder_deliveries_reminder ON reminder_deliveries (reminder_id, status);

-- Auth extensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS auth_otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_otp_email_code ON auth_otp (email, code);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token UUID NOT NULL DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens (token);
