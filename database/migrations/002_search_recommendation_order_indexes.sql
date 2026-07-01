-- Migration 002: production search, recommendation event, and order workflow indexes.
-- Apply from the project root with:
-- psql "$DATABASE_URL" -f database/migrations/002_search_recommendation_order_indexes.sql

CREATE INDEX IF NOT EXISTS listings_full_text_idx ON listings USING GIN (
  to_tsvector(
    'simple',
    COALESCE(make, '') || ' ' ||
    COALESCE(model, '') || ' ' ||
    COALESCE(variant, '') || ' ' ||
    COALESCE(city, '') || ' ' ||
    COALESCE(body_style, '') || ' ' ||
    COALESCE(powertrain, '') || ' ' ||
    COALESCE(transmission, '') || ' ' ||
    COALESCE(title_status, '')
  )
);

CREATE INDEX IF NOT EXISTS listings_price_idx ON listings (asking_price, market_estimate);
CREATE INDEX IF NOT EXISTS listings_year_mileage_idx ON listings (year, mileage_km);

CREATE INDEX IF NOT EXISTS orders_seller_status_idx ON orders (seller_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS orders_buyer_status_idx ON orders (buyer_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS orders_type_status_idx ON orders (order_type, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS recommendation_events_user_time_idx ON recommendation_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_events_listing_time_idx ON recommendation_events (listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_events_type_time_idx ON recommendation_events (event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS recommendation_model_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_version TEXT NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  hybrid_score NUMERIC(8, 4) NOT NULL DEFAULT 0,
  content_score NUMERIC(8, 4) NOT NULL DEFAULT 0,
  collaborative_score NUMERIC(8, 4) NOT NULL DEFAULT 0,
  feature_vector JSONB NOT NULL DEFAULT '{}',
  reasons JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (model_version, listing_id)
);

CREATE INDEX IF NOT EXISTS recommendation_model_score_idx ON recommendation_model_items (model_version, hybrid_score DESC);
CREATE INDEX IF NOT EXISTS recommendation_model_listing_idx ON recommendation_model_items (listing_id);
