import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const AdminAuctions = () => {
  const { liveAuctionCars, endAuction, reopenAuction } = useAuctions();
  const [message, setMessage] = useState('');

  const runAction = (action, carId, minutes) => {
    const result = action(carId, minutes);
    setMessage(result.message);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-red-600">Admin auction control</p>
            <h1 className="text-4xl font-black text-slate-900 mt-1">Auction Lifecycle Board</h1>
            <p className="text-slate-500 mt-2">End auctions, reopen stale listings, review reserve status, and watch checkout readiness.</p>
          </div>
          <Link to="/admin" className="bg-white border border-slate-200 text-slate-800 px-5 py-3 rounded-lg font-bold text-center">
            Review submissions
          </Link>
        </div>

        {message && <div className="bg-white border border-slate-200 rounded-lg p-4 font-bold text-slate-700 mb-6">{message}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {liveAuctionCars.map((car) => (
            <article key={car.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr]">
                <img src={car.images[0]} alt={car.name} className="w-full h-48 sm:h-full object-cover bg-slate-100" />
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${car.status === 'Live' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {car.status}
                    </span>
                    <span className="rounded-full px-3 py-1 text-xs font-black bg-slate-100 text-slate-600">{car.outcomeLabel}</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">{car.name}</h2>
                  <p className="text-sm text-slate-500 mt-1">{car.city} - {car.seller}</p>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <Metric label="High bid" value={formatPkr(car.highBid)} />
                    <Metric label="Reserve" value={formatPkr(car.reservePrice)} />
                    <Metric label="Bids" value={car.bidsCount} />
                    <Metric label="Time left" value={car.timeLeft} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-5">
                    <button onClick={() => runAction(endAuction, car.id)} className="bg-red-600 text-white font-bold py-3 rounded hover:bg-red-700">
                      End Now
                    </button>
                    <button onClick={() => runAction(reopenAuction, car.id, 1440)} className="border border-slate-300 text-slate-800 font-bold py-3 rounded hover:bg-slate-50">
                      Reopen 24h
                    </button>
                    <Link to={`/listing/${car.id}`} className="text-center border border-blue-200 text-blue-700 font-bold py-3 rounded hover:bg-blue-50">
                      Inspect
                    </Link>
                    <Link to={`/admin/auctions/${car.id}/bids`} className="text-center border border-amber-200 text-amber-700 font-bold py-3 rounded hover:bg-amber-50">
                      Bid Audit
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
};

const Metric = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
    <p className="text-[11px] uppercase text-slate-400 font-black">{label}</p>
    <p className="font-black text-slate-900 mt-1">{value}</p>
  </div>
);

export default AdminAuctions;
