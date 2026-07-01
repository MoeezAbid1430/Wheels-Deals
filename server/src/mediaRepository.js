import { getPostgresPool } from './postgresStore.js';
import { getStorageDriver } from './store.js';

export const usesNormalizedMedia = () => getStorageDriver() === 'postgres';

const mapAsset = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.ownerId,
    purpose: row.purpose,
    bucket: row.bucket,
    objectKey: row.objectKey,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
    visibility: row.visibility,
    moderationStatus: row.moderationStatus,
    uploadStatus: row.uploadStatus,
    processingStatus: row.processingStatus,
    scanStatus: row.scanStatus,
    exifStatus: row.exifStatus,
    uploadedAt: row.uploadedAt,
    completedAt: row.completedAt,
    url: row.url,
    metadata: row.metadata || {},
    thumbnails: row.thumbnails || [],
    renditions: row.renditions || [],
    createdAt: row.createdAt,
  };
};

const assetColumns = `
  id,
  owner_id AS "ownerId",
  purpose,
  bucket,
  object_key AS "objectKey",
  file_name AS "fileName",
  mime_type AS "mimeType",
  size_bytes AS "sizeBytes",
  visibility,
  moderation_status AS "moderationStatus",
  upload_status AS "uploadStatus",
  processing_status AS "processingStatus",
  scan_status AS "scanStatus",
  exif_status AS "exifStatus",
  uploaded_at AS "uploadedAt",
  completed_at AS "completedAt",
  url,
  metadata,
  thumbnails,
  renditions,
  created_at AS "createdAt"
`;

export const createMediaAsset = async (asset) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO media_assets (
        id, owner_id, purpose, bucket, object_key, file_name, mime_type, size_bytes,
        visibility, moderation_status, upload_status, processing_status, scan_status,
        exif_status, url, metadata, thumbnails, renditions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17::jsonb, $18::jsonb)
      RETURNING ${assetColumns}
    `,
    [
      asset.id,
      asset.ownerId || null,
      asset.purpose,
      asset.bucket,
      asset.objectKey,
      asset.fileName || null,
      asset.mimeType,
      asset.sizeBytes || null,
      asset.visibility || 'private',
      asset.moderationStatus || 'pending',
      asset.uploadStatus || 'intent_created',
      asset.processingStatus || 'waiting_for_upload',
      asset.scanStatus || 'not_scanned',
      asset.exifStatus || 'not_applicable',
      asset.url || null,
      JSON.stringify(asset.metadata || {}),
      JSON.stringify(asset.thumbnails || []),
      JSON.stringify(asset.renditions || []),
    ]
  );
  return mapAsset(result.rows[0]);
};

export const getMediaAsset = async (id) => {
  const pool = await getPostgresPool();
  const result = await pool.query(`SELECT ${assetColumns} FROM media_assets WHERE id::text = $1`, [String(id)]);
  return mapAsset(result.rows[0]);
};

export const updateMediaAsset = async (id, patch = {}) => {
  const current = await getMediaAsset(id);
  if (!current) return null;
  const next = { ...current, ...patch, metadata: { ...(current.metadata || {}), ...(patch.metadata || {}) } };
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      UPDATE media_assets
      SET
        size_bytes = $2,
        visibility = $3,
        moderation_status = $4,
        upload_status = $5,
        processing_status = $6,
        scan_status = $7,
        exif_status = $8,
        uploaded_at = $9,
        completed_at = $10,
        url = $11,
        metadata = $12::jsonb,
        thumbnails = $13::jsonb,
        renditions = $14::jsonb
      WHERE id::text = $1
      RETURNING ${assetColumns}
    `,
    [
      String(id),
      next.sizeBytes || null,
      next.visibility,
      next.moderationStatus,
      next.uploadStatus,
      next.processingStatus,
      next.scanStatus,
      next.exifStatus,
      next.uploadedAt || null,
      next.completedAt || null,
      next.url || null,
      JSON.stringify(next.metadata || {}),
      JSON.stringify(next.thumbnails || []),
      JSON.stringify(next.renditions || []),
    ]
  );
  return mapAsset(result.rows[0]);
};

export const deleteMediaAsset = async (id) => {
  const pool = await getPostgresPool();
  const result = await pool.query(`DELETE FROM media_assets WHERE id::text = $1 RETURNING ${assetColumns}`, [String(id)]);
  return mapAsset(result.rows[0]);
};

export const attachListingMedia = async ({ listingId, mediaAssetId, sortOrder = 0, isCover = false }) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO listing_media (listing_id, media_asset_id, sort_order, is_cover)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (listing_id, media_asset_id)
      DO UPDATE SET sort_order = EXCLUDED.sort_order, is_cover = EXCLUDED.is_cover
      RETURNING id, listing_id AS "listingId", media_asset_id AS "mediaAssetId", sort_order AS "sortOrder", is_cover AS "isCover", created_at AS "createdAt"
    `,
    [listingId, mediaAssetId, Number(sortOrder), Boolean(isCover)]
  );
  return result.rows[0];
};

export const reorderListingMedia = async (listingId, media = []) => {
  const links = [];
  for (let index = 0; index < media.length; index += 1) {
    const entry = media[index];
    links.push(await attachListingMedia({
      listingId,
      mediaAssetId: entry.mediaAssetId,
      sortOrder: entry.sortOrder ?? index,
      isCover: entry.isCover,
    }));
  }
  return links.sort((a, b) => a.sortOrder - b.sortOrder);
};

export const createDocumentVerification = async ({ mediaAssetId, status, notes, verifiedBy }) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO document_verifications (media_asset_id, status, notes, verified_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, media_asset_id AS "mediaAssetId", status, notes, verified_by AS "verifiedBy", created_at AS "createdAt"
    `,
    [mediaAssetId, status || 'verified', notes || null, verifiedBy || null]
  );
  return result.rows[0];
};

export const listDocumentVerifications = async (mediaAssetId) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT id, media_asset_id AS "mediaAssetId", status, notes, verified_by AS "verifiedBy", created_at AS "createdAt"
      FROM document_verifications
      WHERE media_asset_id::text = $1
      ORDER BY created_at DESC
    `,
    [String(mediaAssetId)]
  );
  return result.rows;
};
