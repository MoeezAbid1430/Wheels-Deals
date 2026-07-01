-- Migration 004: verified dealer membership and review foundation.

CREATE TABLE IF NOT EXISTS dealers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  membership_plan TEXT NOT NULL DEFAULT 'monthly_dealer',
  membership_status TEXT NOT NULL DEFAULT 'trial',
  monthly_fee_pkr NUMERIC(14, 2) NOT NULL DEFAULT 25000,
  trust_score INTEGER NOT NULL DEFAULT 50,
  metadata JSONB NOT NULL DEFAULT '{}',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dealer_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dealers_city_status_idx ON dealers (city, status, verified);
