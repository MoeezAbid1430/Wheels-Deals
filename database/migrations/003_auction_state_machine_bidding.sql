-- Migration 003: auction lifecycle, spectator tracking, and idempotent bids.

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS watchers_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS bids_idempotency_idx
  ON bids (auction_id, bidder_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS auctions_status_ends_idx ON auctions (status, ends_at);

CREATE TABLE IF NOT EXISTS auction_watchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS auction_watchers_user_idx
  ON auction_watchers (auction_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS auction_watchers_anon_idx
  ON auction_watchers (auction_id, anonymous_id)
  WHERE anonymous_id IS NOT NULL;
