import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const InspectionBooking = () => {
  const { id } = useParams();
  const { getCar } = useAuctions();
  const car = getCar(id);
  const [slot, setSlot] = useState('Tomorrow 11:00 AM');
  const [packageType, setPackageType] = useState('Full inspection');
  const [message, setMessage] = useState('');

  if (!car) {
    return <main className="min-h-screen bg-slate-50 p-10 text-center font-black">Listing not found.</main>;
  }

  return (
    <main className="bg-slate-50 min-h-screen py-10">
      <section className="max-w-5xl mx-auto px-4">
        <Link to={`/listing/${car.id}`} className="text-blue-600 font-bold hover:underline">Back to listing</Link>
        <div className="bg-white border border-slate-200 rounded-xl p-6 mt-5">
          <p className="text-green-600 font-black text-xs uppercase tracking-[0.3em]">Inspection booking</p>
          <h1 className="text-4xl font-black text-slate-900 mt-2">{car.name}</h1>
          <p className="text-slate-500 mt-2">Book mechanic inspection, upload report media, and attach results to checkout/admin review.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {['Tomorrow 11:00 AM', 'Tomorrow 4:00 PM', 'Saturday 10:00 AM'].map((item) => (
              <button key={item} aria-pressed={slot === item} onClick={() => setSlot(item)} className={`border rounded-xl p-4 text-left font-black min-h-20 ${slot === item ? 'border-green-500 bg-green-50 text-green-800' : 'border-slate-200 text-slate-700'}`}>
                {item}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              ['Basic check', 'PKR 6,000', 'Exterior, interior, documents'],
              ['Full inspection', 'PKR 12,000', 'Mechanical, paint, scan, road test'],
              ['Auction protection', 'PKR 18,000', 'Full report plus bid ceiling advice'],
            ].map(([title, price, text]) => (
              <button key={title} aria-pressed={packageType === title} onClick={() => setPackageType(title)} className={`border rounded-xl p-4 text-left ${packageType === title ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <p className="font-black text-slate-900">{title}</p>
                <p className="font-black text-green-700 mt-1">{price}</p>
                <p className="text-sm text-slate-500 mt-2">{text}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Field label="Inspection location" placeholder={car.location} />
            <Field label="Contact phone" placeholder="03xx-xxxxxxx" />
            <Field label="Preferred mechanic" placeholder="Any verified inspector" />
            <Field label="Special notes" placeholder="Check suspension noise, repaint, undercarriage." />
          </div>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-black uppercase text-slate-400">Booking summary</p>
            <p className="font-black text-slate-900 mt-1">{packageType} - {slot}</p>
            <p className="text-sm text-slate-500 mt-2">Includes inspector identity, checklist, photos, severity labels, and report attachment to checkout/admin review.</p>
          </div>

          <button onClick={() => setMessage(`${packageType} requested for ${slot}.`)} className="mt-6 bg-green-600 text-white rounded-lg px-5 py-3 font-black">Book Inspection</button>
          {message && <p role="status" aria-live="polite" className="mt-4 bg-green-50 border border-green-100 text-green-800 rounded-lg p-3 font-bold">{message}</p>}
        </div>
      </section>
    </main>
  );
};

const Field = ({ label, placeholder }) => (
  <label className="block">
    <span className="text-xs font-black uppercase text-slate-400">{label}</span>
    <input placeholder={placeholder} className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-green-600" />
  </label>
);

export default InspectionBooking;
