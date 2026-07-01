-- Wheels&Deals production schema draft
-- Target database: PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS app_state_snapshots (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  city TEXT,
  avatar_url TEXT,
  reputation_score INTEGER NOT NULL DEFAULT 50,
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dealers (
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

CREATE TABLE dealer_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX dealers_city_status_idx ON dealers (city, status, verified);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_refresh_token_hash_idx ON sessions (refresh_token_hash);
CREATE INDEX sessions_user_status_expires_idx ON sessions (user_id, status, expires_at);

CREATE TABLE kyc_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  provider TEXT,
  provider_reference TEXT,
  consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  consent_text_version TEXT,
  consent_accepted_at TIMESTAMPTZ,
  review_status TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kyc_profile_id UUID NOT NULL REFERENCES kyc_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  media_asset_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicle_makes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE vehicle_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  make_id UUID NOT NULL REFERENCES vehicle_makes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (make_id, name)
);

CREATE TABLE vehicle_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body_style TEXT,
  powertrain TEXT,
  engine TEXT,
  UNIQUE (model_id, name)
);

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('marketplace', 'auction')),
  status TEXT NOT NULL DEFAULT 'draft',
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  body_style TEXT,
  powertrain TEXT,
  transmission TEXT,
  mileage_km INTEGER,
  city TEXT,
  title_status TEXT,
  asking_price NUMERIC(14, 2),
  market_estimate NUMERIC(14, 2),
  inspection_score INTEGER,
  trust_score INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX listings_search_idx ON listings (make, model, city, body_style, listing_type, status);
CREATE INDEX listings_full_text_idx ON listings USING GIN (
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
CREATE INDEX listings_price_idx ON listings (asking_price, market_estimate);
CREATE INDEX listings_year_mileage_idx ON listings (year, mileage_km);

CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID UNIQUE NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'pending_review', 'scheduled', 'live', 'ending', 'won', 'payment_pending', 'paid', 'handover', 'completed', 'cancelled', 'expired', 'disputed', 'forfeited')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  reserve_price NUMERIC(14, 2),
  high_bid NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bid_increment NUMERIC(14, 2) NOT NULL DEFAULT 25000,
  last_bidder_id UUID REFERENCES users(id),
  bids_count INTEGER NOT NULL DEFAULT 0,
  watchers_count INTEGER NOT NULL DEFAULT 0,
  extensions_count INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES users(id),
  auction_type TEXT NOT NULL DEFAULT 'private',
  bank_partner_id UUID,
  legal_terms_url TEXT,
  payment_deadline_hours INTEGER NOT NULL DEFAULT 72,
  transfer_process TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX auctions_status_ends_idx ON auctions (status, ends_at);

CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted',
  idempotency_key TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX bids_auction_amount_idx ON bids (auction_id, amount DESC);
CREATE UNIQUE INDEX bids_idempotency_idx ON bids (auction_id, bidder_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE auction_watchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

CREATE UNIQUE INDEX auction_watchers_user_idx ON auction_watchers (auction_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX auction_watchers_anon_idx ON auction_watchers (auction_id, anonymous_id) WHERE anonymous_id IS NOT NULL;

CREATE TABLE wallet_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'PKR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_account_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deposit_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_account_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES auctions(id),
  amount NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked',
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_account_id UUID NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  amount NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checkout_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID UNIQUE NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'started',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  handover_status TEXT NOT NULL DEFAULT 'pending',
  title_transfer_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checkout_payment_proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkout_case_id UUID NOT NULL REFERENCES checkout_cases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  media_asset_id UUID,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkout_case_id UUID REFERENCES checkout_cases(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES auctions(id),
  opened_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  severity TEXT NOT NULL DEFAULT 'medium',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  accessory_id UUID,
  checkout_case_id UUID REFERENCES checkout_cases(id),
  order_type TEXT NOT NULL CHECK (order_type IN ('vehicle', 'auction_checkout', 'accessory', 'inspection')),
  status TEXT NOT NULL DEFAULT 'created',
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PKR',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX orders_seller_status_idx ON orders (seller_id, status, updated_at DESC);
CREATE INDEX orders_buyer_status_idx ON orders (buyer_id, status, updated_at DESC);
CREATE INDEX orders_type_status_idx ON orders (order_type, status, updated_at DESC);

CREATE TABLE inspection_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  package_type TEXT NOT NULL,
  city TEXT,
  address TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'requested',
  price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  inspector_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accessory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES accessory_categories(id)
);

CREATE TABLE accessories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id),
  category_id UUID REFERENCES accessory_categories(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  condition TEXT NOT NULL DEFAULT 'new',
  price NUMERIC(14, 2) NOT NULL,
  city TEXT,
  fitment_type TEXT NOT NULL DEFAULT 'universal',
  warranty TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  rating_average NUMERIC(3, 2) NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  questions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accessory_fitments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accessory_id UUID NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  year_from INTEGER,
  year_to INTEGER,
  make TEXT,
  model TEXT,
  variant TEXT,
  engine TEXT,
  body_style TEXT
);

CREATE TABLE accessory_reviews (
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

CREATE INDEX accessory_reviews_accessory_time_idx ON accessory_reviews(accessory_id, created_at DESC);
CREATE INDEX accessory_reviews_rating_idx ON accessory_reviews(accessory_id, rating);

CREATE TABLE accessory_questions (
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

CREATE INDEX accessory_questions_accessory_status_idx ON accessory_questions(accessory_id, status, created_at DESC);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id),
  purpose TEXT NOT NULL,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  visibility TEXT NOT NULL DEFAULT 'private',
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  upload_status TEXT NOT NULL DEFAULT 'intent_created',
  processing_status TEXT NOT NULL DEFAULT 'waiting_for_upload',
  scan_status TEXT NOT NULL DEFAULT 'not_scanned',
  exif_status TEXT NOT NULL DEFAULT 'not_applicable',
  sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  thumbnails JSONB NOT NULL DEFAULT '[]',
  renditions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE listing_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, media_asset_id)
);

CREATE INDEX listing_media_listing_order_idx ON listing_media (listing_id, sort_order);

CREATE TABLE document_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE community_forums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id UUID NOT NULL REFERENCES community_forums(id),
  author_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,
  reports_count INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,
  reports_count INTEGER NOT NULL DEFAULT 0,
  is_best_answer BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE saved_community_posts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE community_polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id UUID REFERENCES community_forums(id),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  make TEXT,
  model TEXT,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  closes_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE community_poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE community_poll_votes (
  poll_id UUID NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES community_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (poll_id, user_id)
);

CREATE TABLE editorial_writers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role_title TEXT NOT NULL DEFAULT 'Verified Writer',
  city TEXT,
  avatar_url TEXT,
  bio TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending_review',
  social_links JSONB NOT NULL DEFAULT '{}',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX editorial_writers_status_idx ON editorial_writers(status, verified);

CREATE TABLE editorial_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  writer_id UUID REFERENCES editorial_writers(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  deck TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  hero_media_asset_id UUID REFERENCES media_assets(id),
  hero_image_url TEXT,
  body JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  bookmarks_count INTEGER NOT NULL DEFAULT 0,
  editor_notes TEXT,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX editorial_articles_status_time_idx ON editorial_articles(status, published_at DESC, updated_at DESC);
CREATE INDEX editorial_articles_category_idx ON editorial_articles(category, status, featured);
CREATE INDEX editorial_articles_full_text_idx ON editorial_articles USING GIN (
  to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(deck, '') || ' ' || COALESCE(category, '') || ' ' || array_to_string(tags, ' '))
);

CREATE TABLE editorial_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES editorial_articles(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX editorial_comments_article_status_idx ON editorial_comments(article_id, status, created_at DESC);

CREATE TABLE editorial_bookmarks (
  article_id UUID NOT NULL REFERENCES editorial_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, user_id)
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  media_asset_id UUID REFERENCES media_assets(id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query JSONB NOT NULL DEFAULT '{}',
  alert_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_listing_lists (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  list_type TEXT NOT NULL CHECK (list_type IN ('watchlist', 'compare', 'recently_viewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id, list_type)
);

CREATE TABLE recommendation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  score NUMERIC(8, 4),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recommendation_events_user_time_idx ON recommendation_events (user_id, created_at DESC);
CREATE INDEX recommendation_events_listing_time_idx ON recommendation_events (listing_id, created_at DESC);
CREATE INDEX recommendation_events_type_time_idx ON recommendation_events (event_type, created_at DESC);

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

CREATE INDEX recommendation_model_score_idx ON recommendation_model_items (model_version, hybrid_score DESC);
CREATE INDEX recommendation_model_listing_idx ON recommendation_model_items (listing_id);

CREATE TABLE repair_shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('workshops', 'oil-change', 'car-wash', 'dealerships', 'rent-a-car', 'sell-a-car', 'tyres', 'inspection', 'towing')),
  city TEXT NOT NULL,
  area TEXT,
  address TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  community_votes INTEGER NOT NULL DEFAULT 0,
  response_time TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  open_now BOOLEAN NOT NULL DEFAULT FALSE,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  social_links JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'verified_directory',
  external_place_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_repair_shops_city_category ON repair_shops(city, category);
CREATE INDEX idx_repair_shops_location ON repair_shops(latitude, longitude);

CREATE TABLE repair_shop_reviews (
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

CREATE INDEX repair_shop_reviews_shop_time_idx ON repair_shop_reviews(repair_shop_id, created_at DESC);
CREATE INDEX repair_shop_reviews_rating_idx ON repair_shop_reviews(repair_shop_id, rating);

CREATE TABLE repair_shop_questions (
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

CREATE INDEX repair_shop_questions_shop_status_idx ON repair_shop_questions(repair_shop_id, status, created_at DESC);

CREATE TABLE service_videos (
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

CREATE INDEX service_videos_provider_time_idx ON service_videos(provider_type, provider_id, created_at DESC);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seller_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_type TEXT NOT NULL DEFAULT 'listing',
  status TEXT NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL DEFAULT '{}',
  quality_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_providers (
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

CREATE TABLE otp_challenges (
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

CREATE TABLE user_verifications (
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

CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_verification_id UUID REFERENCES user_verifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  media_asset_id UUID REFERENCES media_assets(id),
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_methods (
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

CREATE TABLE payment_transactions (
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

CREATE TABLE bank_partners (
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

CREATE TABLE auction_rules (
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

CREATE TABLE auction_winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  winning_bid_id UUID REFERENCES bids(id),
  status TEXT NOT NULL DEFAULT 'payment_pending',
  payment_deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(auction_id)
);

CREATE TABLE wishlist_items (
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

CREATE TABLE cart_items (
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

CREATE TABLE cart_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE feature_suggestions (
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
