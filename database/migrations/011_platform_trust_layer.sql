-- Migration 011: platform trust layer, privacy, provider adapters, bank partners, wishlist/cart, and feature suggestions.

CREATE TABLE IF NOT EXISTS auth_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_subject)
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'sms',
  code_hash TEXT,
  status TEXT NOT NULL DEFAULT 'issued',
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  provider TEXT,
  provider_reference TEXT,
  consent_text_version TEXT,
  consent_accepted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_verification_id UUID REFERENCES user_verifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  media_asset_id UUID REFERENCES media_assets(id),
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  masked_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PKR',
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_type TEXT NOT NULL,
  refund_status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  institution_type TEXT NOT NULL DEFAULT 'bank',
  status TEXT NOT NULL DEFAULT 'pending_review',
  public_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  contact_person TEXT,
  contact_email TEXT,
  legal_agreement_ref TEXT,
  terms_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auction_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_type TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  effective_from TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auction_winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  winning_bid_id UUID REFERENCES bids(id),
  status TEXT NOT NULL DEFAULT 'payment_pending',
  payment_deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(auction_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  notes TEXT,
  notify_price_change BOOLEAN NOT NULL DEFAULT TRUE,
  notify_ending_soon BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  price_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  problem_solved TEXT,
  user_priority TEXT NOT NULL DEFAULT 'medium',
  media_asset_id UUID REFERENCES media_assets(id),
  contact_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'under_review',
  internal_notes TEXT,
  duplicate_of UUID REFERENCES feature_suggestions(id),
  public_roadmap BOOLEAN NOT NULL DEFAULT FALSE,
  backlog_ref TEXT,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kyc_profiles
  ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_text_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_status TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS sensitive BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS auction_type TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS bank_partner_id UUID REFERENCES bank_partners(id),
  ADD COLUMN IF NOT EXISTS legal_terms_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_deadline_hours INTEGER NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS transfer_process TEXT;

CREATE INDEX IF NOT EXISTS auth_providers_user_idx ON auth_providers(user_id, provider);
CREATE INDEX IF NOT EXISTS user_verifications_user_status_idx ON user_verifications(user_id, status);
CREATE INDEX IF NOT EXISTS payment_transactions_user_status_idx ON payment_transactions(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS bank_partners_status_idx ON bank_partners(status, public_enabled);
CREATE INDEX IF NOT EXISTS wishlist_items_user_type_idx ON wishlist_items(user_id, item_type, created_at DESC);
CREATE INDEX IF NOT EXISTS cart_history_user_time_idx ON cart_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feature_suggestions_status_module_idx ON feature_suggestions(status, module, created_at DESC);
