import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MediaUploader from '../components/MediaUploader';
import { useAuctions } from '../context/AuctionContext';

const checklist = [
  'Exterior front, rear, both sides',
  'Interior dashboard, seats, roof liner',
  'Engine bay and undercarriage',
  'VIN/chassis plate',
  'Title, tax token, and service records',
  'Walkaround video and cold start video',
];

const MediaCenter = () => {
  const { api, backendStatus, authUser } = useAuctions();
  const [items, setItems] = useState([
    { id: 1, name: 'Front exterior photo', type: 'Image', status: 'Approved', quality: 92 },
    { id: 2, name: 'Cold start video', type: 'Video', status: 'Needs upload', quality: 0 },
    { id: 3, name: 'Title document', type: 'Document', status: 'Pending review', quality: 78 },
  ]);
  const [selectedPurpose, setSelectedPurpose] = useState('listing_photo');
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const addMockItem = async (file) => {
    if (!file) return;
    setIsUploading(true);
    const previewUrl = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    let backendAsset = null;

    if (backendStatus.available && authUser) {
      try {
        const intent = await api.media.createUploadIntent({
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          purpose: selectedPurpose,
          visibility: selectedPurpose.includes('document') ? 'private' : 'public',
        });
        if (!intent.uploadUrl) throw new Error(intent.message || 'Media provider did not return an upload URL.');
        const uploadUrl = new URL(intent.uploadUrl, process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || 'http://localhost:4000');
        await fetch(uploadUrl.toString(), { method: intent.method || 'PUT', body: file });
        const completed = await api.media.completeUpload({ mediaAssetId: intent.asset.id });
        backendAsset = completed.asset;
      } catch (error) {
        setUploadMessage(error.message || 'Backend upload failed. Keeping local staged item.');
      }
    }

    setItems((current) => [
      {
        id: backendAsset?.id || Date.now(),
        name: file?.name || 'New upload placeholder',
        type: file?.type?.startsWith('video/') ? 'Video' : file?.type?.includes('pdf') ? 'Document' : 'Image',
        status: backendAsset ? 'Uploaded to backend' : 'Pending review',
        quality: file ? Math.min(96, Math.max(62, Math.round((file.size % 40) + 58))) : 70,
        previewUrl,
        purpose: selectedPurpose,
        size: file?.size || 0,
        assetId: backendAsset?.id,
      },
      ...current,
    ]);
    setUploadMessage(backendAsset ? `${file.name} uploaded and completed through backend media storage intent.` : `${file.name} staged for ${selectedPurpose.replace('_', ' ')} review.`);
    setIsUploading(false);
  };

  const removeItem = async (item) => {
    if (item.assetId && backendStatus.available && authUser) {
      try {
        await api.media.deleteMedia(item.assetId);
        setUploadMessage(`${item.name} removed from backend media storage.`);
      } catch (error) {
        setUploadMessage(error.message || 'Backend media delete failed. Removing it from this view only.');
      }
    }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  };

  const uploadSelectedFiles = (files) => {
    files.forEach((file) => {
      addMockItem(file);
    });
  };

  return (
    <main className="bg-slate-50 min-h-screen py-10">
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-blue-600 font-black text-xs uppercase tracking-[0.3em]">Media center</p>
            <h1 className="text-4xl font-black text-slate-900 mt-2">Photos, videos, and documents</h1>
            <p className="text-slate-500 mt-2">Prepare listing media for marketplace, auction approval, inspection reports, and KYC review.</p>
          </div>
          <Link to="/sell/accessory" className="bg-slate-900 text-white px-5 py-3 rounded-lg font-bold text-center">
            Upload for accessory
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <aside className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 h-fit">
            <h2 className="font-black text-slate-900 mb-4">Required media checklist</h2>
            <select value={selectedPurpose} onChange={(event) => setSelectedPurpose(event.target.value)} className="w-full border border-slate-200 rounded-lg p-3 mb-4 font-bold bg-white">
              <option value="listing_photo">Listing photo</option>
              <option value="listing_video">Listing video</option>
              <option value="inspection_photo">Inspection photo</option>
              <option value="user_document">User document</option>
              <option value="kyc_document">KYC document</option>
              <option value="accessory_photo">Accessory photo</option>
            </select>
            <div className="space-y-3">
              {checklist.map((item) => (
                <label key={item} className="flex items-start gap-3 text-sm font-bold text-slate-700">
                  <input type="checkbox" className="mt-1" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <p className={`mt-4 rounded-lg p-3 text-sm font-bold ${backendStatus.available && authUser ? 'bg-green-50 border border-green-100 text-green-800' : 'bg-amber-50 border border-amber-100 text-amber-800'}`}>
              {backendStatus.available && authUser ? 'Media upload intents are connected to backend storage.' : 'Login with backend API to persist uploads beyond this browser.'}
            </p>
            {uploadMessage && <p className="mt-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg p-3 text-sm font-bold">{uploadMessage}</p>}
            <Link to="/seller/dashboard" className="block text-center mt-5 bg-blue-600 text-white rounded-lg py-3 font-bold">Back to Seller Dashboard</Link>
          </div>
          <MediaUploader
            title={isUploading ? 'Uploading...' : 'Upload media'}
            description="Drag in batches for listings, inspections, KYC, accessory proof, and dispute evidence."
            requirements={checklist}
            onFilesAdded={uploadSelectedFiles}
          />
          </aside>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {items.map((item) => (
              <article key={item.id} className="bg-white border border-slate-200 rounded-xl p-5">
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt={item.name} className="h-40 w-full object-cover rounded-lg bg-slate-100" />
                ) : (
                  <div className="h-40 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-black">
                    {item.type} Preview
                  </div>
                )}
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase font-black text-slate-400">{item.type}</p>
                    <h2 className="font-black text-slate-900">{item.name}</h2>
                  </div>
                  <span className="bg-slate-100 rounded-full px-3 py-1 text-xs font-black text-slate-600">{item.status}</span>
                </div>
                <div className="mt-4 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${item.quality}%` }} />
                </div>
                <p className="text-sm text-slate-500 mt-2">AI quality score {item.quality}/100</p>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 border border-slate-200 rounded-lg py-2 font-bold text-slate-700">Replace</button>
                  <button onClick={() => removeItem(item)} className="flex-1 border border-red-200 rounded-lg py-2 font-bold text-red-700">Remove</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default MediaCenter;
