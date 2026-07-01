import { platformApi } from '../api';

export const mediaPurposes = {
  listingPhoto: 'listing_photo',
  listingVideo: 'listing_video',
  inspectionPhoto: 'inspection_photo',
  userDocument: 'user_document',
  kycDocument: 'kyc_document',
  accessoryPhoto: 'accessory_photo',
};

export const mediaService = {
  createUploadIntent: (payload) => platformApi.media.createUploadIntent(payload),
  completeUpload: (payload) => platformApi.media.completeUpload(payload),
  deleteMedia: (id) => platformApi.media.deleteMedia(id),
  moderateMedia: (id, payload) => platformApi.media.moderateMedia(id, payload),
  reorderListingMedia: (listingId, payload) => platformApi.media.reorderListingMedia(listingId, payload),
  createDocumentUploadIntent: (payload) => platformApi.media.createDocumentUploadIntent(payload),
  getDocument: (id) => platformApi.media.getDocument(id),
  verifyDocument: (id, payload) => platformApi.media.verifyDocument(id, payload),
};
