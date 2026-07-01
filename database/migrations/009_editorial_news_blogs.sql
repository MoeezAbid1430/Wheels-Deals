-- Migration 009: editorial news and blogs separated from community forums.

CREATE TABLE IF NOT EXISTS editorial_writers (
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

CREATE INDEX IF NOT EXISTS editorial_writers_status_idx ON editorial_writers(status, verified);

CREATE TABLE IF NOT EXISTS editorial_articles (
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

CREATE INDEX IF NOT EXISTS editorial_articles_status_time_idx ON editorial_articles(status, published_at DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS editorial_articles_category_idx ON editorial_articles(category, status, featured);
CREATE INDEX IF NOT EXISTS editorial_articles_full_text_idx ON editorial_articles USING GIN (
  to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(deck, '') || ' ' || COALESCE(category, '') || ' ' || array_to_string(tags, ' '))
);

CREATE TABLE IF NOT EXISTS editorial_comments (
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

CREATE INDEX IF NOT EXISTS editorial_comments_article_status_idx ON editorial_comments(article_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS editorial_bookmarks (
  article_id UUID NOT NULL REFERENCES editorial_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, user_id)
);
