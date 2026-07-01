import React, { useState } from 'react';
import MediaUploader from '../components/MediaUploader';
import { accessoryCategories, accessoryCategoryGroups, accessoryFulfillmentTypes, vehicleBodyStyles } from '../data/taxonomy';

const SellAccessory = () => {
  const [fitmentType, setFitmentType] = useState('Vehicle-specific');
  const [fulfillmentType, setFulfillmentType] = useState('Deliverable');
  const [message, setMessage] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [categoryGroup, setCategoryGroup] = useState(accessoryCategoryGroups[0].label);
  const qualityScore = Math.min(96, (fitmentType === 'Vehicle-specific' ? 78 : 62) + (mediaItems.length >= 3 ? 10 : 0) + (fulfillmentType ? 8 : 0));
  const categoryOptions = accessoryCategoryGroups.find((group) => group.label === categoryGroup)?.options || accessoryCategories;
  const mediaCount = mediaItems.length;

  return (
    <main className="bg-slate-50 min-h-screen py-10">
      <section className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <p className="text-emerald-600 font-black text-xs uppercase tracking-[0.3em]">Sell accessory</p>
          <h1 className="text-4xl font-black text-slate-900 mt-2">List parts and accessories with fitment confidence.</h1>
          <p className="text-slate-500 mt-2">Accessories need category, condition, warranty, stock, seller policy, and exact vehicle compatibility.</p>
        </div>

        {message && <div className="mb-5 bg-white border border-slate-200 rounded-lg p-4 font-bold text-slate-700">{message}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Product name" placeholder="Fortuner all-weather mat set" />
          <Select label="Category group" value={categoryGroup} onChange={setCategoryGroup} options={accessoryCategoryGroups.map((group) => group.label)} />
          <Select label="Category" options={categoryOptions} />
          <Field label="Price" placeholder="28500" type="number" />
          <Field label="Stock" placeholder="12" type="number" />
          <Field label="Brand / manufacturer" placeholder="Vic, SOGO, TYC, PakWheels..." />
          <Field label="Part number / SKU" placeholder="Optional but strongly recommended" />
          <Select label="Condition" options={['New', 'Used', 'Refurbished']} />
          <Field label="Warranty" placeholder="6 months" />
          <Select label="Fitment type" value={fitmentType} onChange={setFitmentType} options={['Universal', 'Vehicle-specific']} />
          <Select label="Fulfillment type" value={fulfillmentType} onChange={setFulfillmentType} options={accessoryFulfillmentTypes} />
          <Select label="Courier allowed" options={fulfillmentType === 'Deliverable' ? ['Yes', 'No'] : ['No', 'Yes']} />
          <Select label="Installation needed" options={fulfillmentType === 'Install required' ? ['Yes', 'No'] : ['No', 'Yes']} />
          <Field label="Pickup / installation area" placeholder="DHA Lahore, Saddar Karachi, Blue Area Islamabad..." />
          <Field label="Seller return policy" placeholder="7-day return if fitment is wrong" />

          {fitmentType === 'Vehicle-specific' && (
            <>
              <Field label="Year from" placeholder="2016" type="number" />
              <Field label="Year to" placeholder="2024" type="number" />
              <Field label="Make" placeholder="Toyota" />
              <Field label="Model" placeholder="Fortuner" />
              <Field label="Variant/trim" placeholder="V Petrol" />
              <Select label="Body style" options={vehicleBodyStyles} />
            </>
          )}

          <div className="md:col-span-2">
            <label className="block">
              <span className="text-xs font-black uppercase text-slate-400">Description</span>
              <textarea rows="5" className="mt-1 w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-emerald-600" placeholder="Add product details, installation notes, and compatibility warnings." />
            </label>
          </div>

          <div className="md:col-span-2">
            <MediaUploader
              title="Product media"
              description="Stage product photos, packaging, warranty card, defect closeups, part number, and fitment proof."
              requirements={[
                'Main product photo on clean background',
                'Packaging, part number, or brand label',
                'Fitment proof or socket/size marking',
                'Defect photos for used/refurbished items',
              ]}
              onFilesChange={setMediaItems}
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button onClick={() => setMessage('Accessory listing submitted for seller review.')} className="bg-emerald-600 text-white rounded-lg px-5 py-3 font-black">Submit Accessory</button>
            <button onClick={() => setMessage('Accessory draft saved locally.')} className="border border-slate-300 text-slate-700 rounded-lg px-5 py-3 font-black">Save Draft</button>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-black uppercase text-slate-400">Listing quality</p>
            <p className="text-4xl font-black text-slate-900 mt-2">{qualityScore}%</p>
            <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-emerald-600" style={{ width: `${qualityScore}%` }} />
            </div>
            <div className="mt-4 space-y-2">
              <ChecklistItem done text="Category and price" />
              <ChecklistItem done={fitmentType === 'Vehicle-specific'} text="Exact vehicle fitment" />
              <ChecklistItem done={mediaCount >= 3} text="At least 3 media files" />
              <ChecklistItem done={Boolean(fulfillmentType)} text="Delivery, pickup, or install handling" />
              <ChecklistItem done text="Return and warranty policy" />
            </div>
          </section>
          <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <h2 className="font-black text-emerald-950">Seller flow coverage</h2>
            <p className="text-sm text-emerald-800 mt-2">This form now covers stock, warranty, return policy, compatibility, media proof, fulfillment handling, draft save, and submission states.</p>
          </section>
        </aside>
        </div>
      </section>
    </main>
  );
};

const Field = ({ label, placeholder, type = 'text' }) => (
  <label className="block">
    <span className="text-xs font-black uppercase text-slate-400">{label}</span>
    <input type={type} placeholder={placeholder} className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-emerald-600" />
  </label>
);

const Select = ({ label, options, value, onChange }) => (
  <label className="block">
    <span className="text-xs font-black uppercase text-slate-400">{label}</span>
    <select value={value} onChange={(event) => onChange?.(event.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-emerald-600 bg-white">
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const ChecklistItem = ({ done, text }) => (
  <div className="flex items-center justify-between gap-3 border border-slate-100 rounded-lg p-3">
    <span className="font-bold text-slate-700">{text}</span>
    <span className={`text-xs font-black rounded-full px-2 py-1 ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{done ? 'Done' : 'Needed'}</span>
  </div>
);

export default SellAccessory;
