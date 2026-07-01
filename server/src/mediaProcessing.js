const scannerProvider = process.env.MEDIA_SCAN_PROVIDER || 'none';
const imageProcessor = process.env.IMAGE_PROCESSOR || 'none';
const videoProcessor = process.env.VIDEO_PROCESSOR || 'none';

export const getMediaProcessingInfo = () => ({
  scanner: {
    provider: scannerProvider,
    configured: scannerProvider !== 'none',
  },
  imageProcessor: {
    provider: imageProcessor,
    configured: imageProcessor !== 'none',
    features: ['exif_stripping', 'compression', 'thumbnails'],
  },
  videoProcessor: {
    provider: videoProcessor,
    configured: videoProcessor !== 'none',
    features: ['transcoding', 'poster_frame', 'streaming_renditions'],
  },
});

export const buildMediaProcessingPlan = (asset = {}) => {
  const isImage = String(asset.mimeType || '').startsWith('image/');
  const isVideo = String(asset.mimeType || '').startsWith('video/');
  const isDocument = String(asset.mimeType || '') === 'application/pdf';

  return {
    scanStatus: scannerProvider === 'none' ? 'skipped_dev' : 'queued',
    exifStatus: isImage ? (imageProcessor === 'none' ? 'needs_processor' : 'queued') : 'not_applicable',
    processingStatus: isImage || isVideo ? 'queued' : isDocument ? 'document_review' : 'completed',
    thumbnails: isImage
      ? [
          { label: 'small', width: 320, status: imageProcessor === 'none' ? 'needs_processor' : 'queued' },
          { label: 'medium', width: 768, status: imageProcessor === 'none' ? 'needs_processor' : 'queued' },
          { label: 'large', width: 1440, status: imageProcessor === 'none' ? 'needs_processor' : 'queued' },
        ]
      : [],
    renditions: isVideo
      ? [
          { label: '360p', status: videoProcessor === 'none' ? 'needs_processor' : 'queued' },
          { label: '720p', status: videoProcessor === 'none' ? 'needs_processor' : 'queued' },
          { label: '1080p', status: videoProcessor === 'none' ? 'needs_processor' : 'queued' },
        ]
      : [],
    warnings: [
      ...(scannerProvider === 'none' ? ['Virus scanning provider is not configured.'] : []),
      ...(isImage && imageProcessor === 'none' ? ['Image processor is not configured for EXIF stripping/compression/thumbnails.'] : []),
      ...(isVideo && videoProcessor === 'none' ? ['Video processor is not configured for transcoding.'] : []),
    ],
  };
};
