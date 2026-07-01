-- Migration 008: service provider trust, social links, Q&A, and videos.
-- psql "$DATABASE_URL" -f database/migrations/008_service_provider_trust_videos.sql

ALTER TABLE repair_shops
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}';

ALTER TABLE repair_shops
  DROP CONSTRAINT IF EXISTS repair_shops_category_check;

ALTER TABLE repair_shops
  ADD CONSTRAINT repair_shops_category_check
  CHECK (category IN ('workshops', 'oil-change', 'car-wash', 'dealerships', 'rent-a-car', 'sell-a-car', 'tyres', 'inspection', 'towing'));

CREATE TABLE IF NOT EXISTS repair_shop_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_shop_id UUID NOT NULL REFERENCES repair_shops(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  reviewer_name TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  service_type TEXT,
  title TEXT,
  body TEXT,
  vehicle TEXT,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS repair_shop_reviews_shop_time_idx ON repair_shop_reviews(repair_shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS repair_shop_reviews_rating_idx ON repair_shop_reviews(repair_shop_id, rating);

CREATE TABLE IF NOT EXISTS repair_shop_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_shop_id UUID NOT NULL REFERENCES repair_shops(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS repair_shop_questions_shop_status_idx ON repair_shop_questions(repair_shop_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS service_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_type TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  media_asset_id UUID REFERENCES media_assets(id),
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS service_videos_provider_time_idx ON service_videos(provider_type, provider_id, created_at DESC);
