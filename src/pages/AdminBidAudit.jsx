import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const AdminBidAudit = () => {
  const { id } = useParams();
  const { getCar } = useAuctions();
  const car = getCar(id);
  const [riskFilter, setRiskFilter] = useState('All');
  const [actionMessage, setActionMessage] = useState('');

  if (!car) return <main className="min-h-screen bg-slate-50 p-10 font-black text-center">Auction not found.</main>;

  const events = car.bidHistory.map((bid, index) => ({
    id: index,
    user: bid.user,
    amount: bid.amount,
    time: bid.time,
    risk: bid.user === 'You' ? 'Verified deposit' : index % 2 === 0 ? 'Low' : 'Review device overlap',
    ip: index % 2 === 0 ? '103.xxx.xxx.12' : '39.xxx.xxx.45',
    device: index % 2 === 0 ? 'Chrome / Karachi' : 'Android / Lahore',
    deposit: bid.user === 'You' ? 'Matched' : 'Verified',
  }));
  const riskOptions = ['All', ...Array.from(new Set(events.map((event) => event.risk)))];
  const visibleEvents = riskFilter === 'All' ? events : events.filter((event) => event.risk === riskFilter);
  const reviewCount = events.filter((event) => event.risk.includes('Review')).length;

  return (
    <main className="bg-slate-950 min-h-screen text-white py-10">
      <section className="max-w-7xl mx-auto px-4">
        <Link to="/admin/auctions" className="text-red-300 font-bold hover:underline">Back to auction control</Link>
        <div className="mt-5 mb-8">
          <p className="text-red-400 font-black text-xs uppercase tracking-[0.3em]">Bid audit</p>
          <h1 className="text-4xl font-black mt-2">{car.name}</h1>
          <p className="text-slate-400 mt-2">Review bid sequence, deposit checks, device/IP signals, and suspicious behavior.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="High bid" value={formatPkr(car.highBid)} />
          <Stat label="Bids" value={car.bidsCount} />
          <Stat label="Reserve" value={car.reserveStatus} />
          <Stat label="Review signals" value={reviewCount} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {riskOptions.map((option) => (
              <button key={option} onClick={() => setRiskFilter(option)} className={`px-3 py-2 rounded-lg text-sm font-black border ${riskFilter === option ? 'bg-white text-zinc-950 border-white' : 'bg-zinc-950 text-zinc-300 border-zinc-700'}`}>
                {option}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActionMessage('Bidder freeze request staged for risk team.')} className="border border-red-500 text-red-200 rounded-lg px-3 py-2 font-black hover:bg-red-950">Freeze Bidder</button>
            <button onClick={() => setActionMessage('Deposit evidence exported for audit packet.')} className="border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 font-black hover:bg-zinc-800">Export Evidence</button>
          </div>
        </div>

        {actionMessage && <div className="bg-red-950 border border-red-800 text-red-100 rounded-lg p-4 font-bold mb-5">{actionMessage}</div>}

        <div className="space-y-3">
          {visibleEvents.map((event) => (
            <article key={event.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 grid grid-cols-1 md:grid-cols-[1fr_180px_180px_180px] gap-4">
              <div>
                <p className="font-black">{event.user}</p>
                <p className="text-sm text-zinc-400">{event.time} - {event.ip}</p>
                <p className="text-xs text-zinc-500 mt-1">{event.device} - Deposit {event.deposit}</p>
              </div>
              <Metric label="Amount" value={formatPkr(event.amount)} />
              <Metric label="Risk" value={event.risk} />
              <button onClick={() => setActionMessage(`${event.user} flagged for manual audit.`)} className="border border-zinc-700 rounded-lg font-black hover:bg-zinc-800">Flag</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
    <p className="text-xs text-zinc-500 uppercase font-black">{label}</p>
    <p className="text-xl font-black mt-1">{value}</p>
  </div>
);

const Metric = ({ label, value }) => (
  <div>
    <p className="text-[10px] text-zinc-500 uppercase font-black">{label}</p>
    <p className="font-black">{value}</p>
  </div>
);

export default AdminBidAudit;
