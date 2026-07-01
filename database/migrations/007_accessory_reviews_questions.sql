-- Migration 007: accessory product reviews and seller Q&A.
-- psql "$DATABASE_URL" -f database/migrations/007_accessory_reviews_questions.sql

ALTER TABLE accessories
  ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS questions_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS accessory_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accessory_id UUID NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  reviewer_name TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  service_context TEXT,
  fitment_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accessory_reviews_accessory_time_idx ON accessory_reviews(accessory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS accessory_reviews_rating_idx ON accessory_reviews(accessory_id, rating);

CREATE TABLE IF NOT EXISTS accessory_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accessory_id UUID NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  asker_id UUID REFERENCES users(id),
  asker_name TEXT,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES users(id),
  answered_by_name TEXT,
  answered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accessory_questions_accessory_status_idx ON accessory_questions(accessory_id, status, created_at DESC);
