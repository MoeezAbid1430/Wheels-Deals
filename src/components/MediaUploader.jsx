import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Star, Trash2, UploadCloud } from 'lucide-react';

const defaultRequirements = [
  'Clear front/product photo',
  'Close-up of labels, part number, or fitment marking',
  'Any defect, scratch, or used condition proof',
];

const MediaUploader = ({
  title = 'Media upload',
  description = 'Upload photos, videos, and proof documents.',
  accept = 'image/*,video/*,.pdf',
  multiple = true,
  requirements = defaultRequirements,
  onFilesAdded,
  onFilesChange,
}) => {
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => () => {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }, [items]);

  const summary = useMemo(() => {
    const photos = items.filter((item) => item.kind === 'Image').length;
    const videos = items.filter((item) => item.kind === 'Video').length;
    const docs = items.filter((item) => item.kind === 'Document').length;
    return { photos, videos, docs };
  }, [items]);

  const commitItems = (nextItems) => {
    setItems(nextItems);
    onFilesChange?.(nextItems);
  };

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const mapped = files.map((file, index) => {
      const kind = file.type.startsWith('image/') ? 'Image' : file.type.startsWith('video/') ? 'Video' : 'Document';
      const quality = estimateQuality(file, kind);
      return {
        id: `${Date.now()}-${file.name}-${index}`,
        file,
        name: file.name,
        size: file.size,
        kind,
        quality,
        status: quality >= 82 ? 'Ready' : quality >= 68 ? 'Needs review' : 'Needs better media',
        previewUrl: kind === 'Image' ? URL.createObjectURL(file) : '',
        primary: items.length === 0 && index === 0,
      };
    });

    const nextItems = multiple ? [...mapped, ...items] : mapped.slice(0, 1);
    commitItems(nextItems);
    onFilesAdded?.(files);
  };

  const removeItem = (id) => {
    const nextItems = items.filter((item) => item.id !== id);
    const removed = items.find((item) => item.id === id);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    commitItems(nextItems);
  };

  const setPrimary = (id) => {
    commitItems(items.map((item) => ({ ...item, primary: item.id === id })));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">{title}</p>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        <div className="hidden sm:flex gap-2 text-xs font-black text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">{summary.photos} photos</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{summary.videos} videos</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{summary.docs} docs</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`mt-4 w-full border-2 border-dashed rounded-xl p-6 text-left transition ${dragging ? 'border-blue-600 bg-blue-50' : 'border-slate-300 hover:border-blue-500 bg-slate-50'}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-blue-600 border border-slate-200">
            <UploadCloud size={24} />
          </span>
          <span>
            <span className="block font-black text-slate-900">Drop files here or browse</span>
            <span className="block text-sm text-slate-500 mt-1">Images, videos, PDFs. Add packaging, warranty card, serial number, defects, and fitment proof.</span>
          </span>
        </div>
        <input ref={inputRef} type="file" multiple={multiple} accept={accept} onChange={(event) => addFiles(event.target.files)} className="hidden" />
      </button>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-4">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-black uppercase text-slate-400">Required proof</p>
          <div className="mt-3 space-y-2">
            {requirements.map((item) => (
              <label key={item} className="flex items-start gap-2 text-sm font-bold text-slate-700">
                <input type="checkbox" className="mt-1" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.length === 0 ? (
            <div className="sm:col-span-2 rounded-xl border border-slate-200 p-5 text-center text-slate-500">
              <ImagePlus className="mx-auto text-slate-300" size={32} />
              <p className="font-bold mt-2">No media staged yet.</p>
            </div>
          ) : items.map((item) => (
            <article key={item.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              {item.previewUrl ? (
                <img src={item.previewUrl} alt={item.name} className="h-32 w-full object-cover bg-slate-100" />
              ) : (
                <div className="h-32 bg-slate-100 grid place-items-center text-slate-500 font-black">{item.kind}</div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">{item.kind} - {formatBytes(item.size)}</p>
                    <h3 className="text-sm font-black text-slate-900 line-clamp-2">{item.name}</h3>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} className="text-red-600 rounded-lg p-1 hover:bg-red-50" aria-label={`Remove ${item.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPrimary(item.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${item.primary ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}
                  >
                    <Star size={12} /> {item.primary ? 'Cover' : 'Set cover'}
                  </button>
                  <span className={`text-[10px] font-black rounded-full px-2 py-1 ${item.quality >= 82 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {item.quality}/100
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

const estimateQuality = (file, kind) => {
  const sizeMb = file.size / (1024 * 1024);
  if (kind === 'Document') return Math.min(96, Math.max(72, Math.round(78 + sizeMb)));
  if (kind === 'Video') return Math.min(94, Math.max(62, Math.round(66 + sizeMb * 3)));
  return Math.min(96, Math.max(58, Math.round(70 + sizeMb * 8)));
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export default MediaUploader;
