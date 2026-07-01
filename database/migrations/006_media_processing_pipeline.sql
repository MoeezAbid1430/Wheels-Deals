-- Migration 006: production media processing state.

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'waiting_for_upload',
  ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'not_scanned',
  ADD COLUMN IF NOT EXISTS exif_status TEXT NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS thumbnails JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS renditions JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS media_assets_owner_status_idx ON media_assets (owner_id, upload_status, moderation_status);
CREATE INDEX IF NOT EXISTS media_assets_processing_idx ON media_assets (processing_status, scan_status);
