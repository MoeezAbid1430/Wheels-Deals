import { createHmac, createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const providerName = process.env.MEDIA_PROVIDER || 'local';
const localMediaRoot = resolve(process.env.LOCAL_MEDIA_DIR || './data/media');
const cdnBaseUrl = (process.env.MEDIA_CDN_BASE_URL || '').replace(/\/$/, '');

export const allowedMediaPurposes = new Set([
  'listing_photo',
  'listing_video',
  'inspection_photo',
  'inspection_video',
  'user_document',
  'kyc_document',
  'accessory_photo',
  'dispute_evidence',
]);

const allowedMimePrefixes = ['image/', 'video/'];
const allowedDocumentMimes = new Set(['application/pdf']);
const maxUploadBytes = Number(process.env.MAX_MEDIA_UPLOAD_BYTES || 100 * 1024 * 1024);
const signedUrlExpirySeconds = Number(process.env.S3_SIGNED_URL_EXPIRES_SECONDS || 900);

const safeFileName = (fileName = 'upload.bin') => String(fileName)
  .replace(/[/\\?%*:|"<>]/g, '-')
  .replace(/\s+/g, '-')
  .slice(0, 140);

export const validateMediaRequest = ({ fileName, mimeType, purpose, sizeBytes }) => {
  const errors = [];
  if (!fileName) errors.push('File name is required.');
  if (!mimeType) errors.push('MIME type is required.');
  if (!purpose || !allowedMediaPurposes.has(purpose)) errors.push('Unsupported media purpose.');
  if (sizeBytes && Number(sizeBytes) > maxUploadBytes) errors.push(`File exceeds ${Math.round(maxUploadBytes / (1024 * 1024))}MB limit.`);
  const mimeAllowed = allowedMimePrefixes.some((prefix) => String(mimeType || '').startsWith(prefix)) || allowedDocumentMimes.has(mimeType);
  if (mimeType && !mimeAllowed) errors.push('Only images, videos, and PDF documents are supported.');
  return { ok: errors.length === 0, errors };
};

export const getLocalMediaPath = (objectKey) => resolve(localMediaRoot, objectKey);

export const writeLocalMediaObject = async (asset, bytes) => {
  const filePath = getLocalMediaPath(asset.objectKey);
  if (!filePath.startsWith(localMediaRoot)) throw new Error('Invalid local media object key.');
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  return filePath;
};

export const readLocalMediaObject = async (asset) => {
  if (asset.bucket !== 'local-dev') throw new Error('Only local-dev media can be read by this server.');
  return readFile(getLocalMediaPath(asset.objectKey));
};

export const deleteLocalMediaObject = async (asset) => {
  if (asset.bucket !== 'local-dev') return;
  await unlink(getLocalMediaPath(asset.objectKey)).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
};

const hmac = (key, value, encoding) => createHmac('sha256', key).update(value).digest(encoding);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const encodePath = (value) => String(value).split('/').map(encodeURIComponent).join('/');

const getS3Endpoint = ({ bucket, region }) => {
  const customEndpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT;
  if (customEndpoint) return customEndpoint.replace(/\/$/, '');
  return `https://${bucket}.s3.${region}.amazonaws.com`;
};

const getPublicUrl = (bucket, objectKey) => {
  if (cdnBaseUrl) return `${cdnBaseUrl}/${encodePath(objectKey)}`;
  const endpoint = getS3Endpoint({ bucket, region: process.env.S3_REGION });
  return `${endpoint}/${encodePath(objectKey)}`;
};

const createS3PresignedPutUrl = ({ bucket, region, objectKey }) => {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = getS3Endpoint({ bucket, region });
  const endpointUrl = new URL(endpoint);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;
  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(signedUrlExpirySeconds),
    'X-Amz-SignedHeaders': 'host',
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
  });
  const sortedQuery = Array.from(query.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const canonicalUri = `/${encodePath(objectKey)}`;
  const canonicalHeaders = `host:${endpointUrl.host}\n`;
  const canonicalRequest = ['PUT', canonicalUri, sortedQuery, canonicalHeaders, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service), 'aws4_request');
  const signature = hmac(signingKey, stringToSign, 'hex');
  query.set('X-Amz-Signature', signature);
  return `${endpoint}${canonicalUri}?${query.toString()}`;
};

const localProvider = {
  name: 'local',
  configured: true,
  live: false,
  createUploadIntent({ fileName, mimeType, ownerId, purpose, visibility = 'private' }) {
    const asset = {
      id: randomUUID(),
      ownerId,
      purpose,
      bucket: 'local-dev',
      objectKey: `${ownerId || 'anonymous'}/${purpose}/${Date.now()}-${safeFileName(fileName)}`,
      fileName,
      mimeType,
      visibility,
      moderationStatus: 'pending',
      uploadStatus: 'intent_created',
      processingStatus: 'waiting_for_upload',
      scanStatus: 'not_scanned',
      exifStatus: mimeType?.startsWith('image/') ? 'pending' : 'not_applicable',
      thumbnails: [],
      renditions: [],
      metadata: {},
      url: null,
      createdAt: new Date().toISOString(),
    };
    asset.url = `/api/media/${asset.id}/content`;
    return { asset, uploadUrl: `/api/media/local-upload/${asset.id}`, method: 'PUT', maxUploadBytes };
  },
};

const s3Provider = {
  name: 's3',
  configured: Boolean(process.env.S3_BUCKET && process.env.S3_REGION && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
  live: true,
  createUploadIntent({ fileName, mimeType, ownerId, purpose, visibility = 'private' }) {
    if (!this.configured) throw new Error('S3 media provider is not configured.');
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION;
    const asset = {
      id: randomUUID(),
      ownerId,
      purpose,
      bucket,
      objectKey: `${ownerId}/${purpose}/${Date.now()}-${safeFileName(fileName)}`,
      fileName,
      mimeType,
      visibility,
      moderationStatus: 'pending',
      uploadStatus: 'intent_created',
      processingStatus: 'waiting_for_upload',
      scanStatus: 'not_scanned',
      exifStatus: mimeType?.startsWith('image/') ? 'pending' : 'not_applicable',
      thumbnails: [],
      renditions: [],
      metadata: {
        storageProvider: providerName,
        cdnEnabled: Boolean(cdnBaseUrl),
      },
      url: null,
      createdAt: new Date().toISOString(),
    };
    asset.url = visibility === 'public' ? getPublicUrl(bucket, asset.objectKey) : null;
    return {
      asset,
      uploadUrl: createS3PresignedPutUrl({ bucket, region, objectKey: asset.objectKey }),
      method: 'PUT',
      headers: {},
      expiresInSeconds: signedUrlExpirySeconds,
      publicUrl: asset.url,
      maxUploadBytes,
    };
  },
};

export const getMediaProvider = () => {
  if (providerName === 'local') return localProvider;
  if (providerName === 's3') return s3Provider;
  throw new Error(`Unknown MEDIA_PROVIDER "${providerName}".`);
};

export const getMediaProviderInfo = () => {
  const provider = getMediaProvider();
  return {
    provider: provider.name,
    configured: provider.configured,
    live: provider.live && provider.configured,
    cdnConfigured: Boolean(cdnBaseUrl),
    maxUploadBytes,
    signedUrlExpirySeconds: provider.name === 's3' ? signedUrlExpirySeconds : undefined,
  };
};
