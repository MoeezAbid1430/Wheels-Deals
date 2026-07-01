import React from 'react';
import { Link } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const SellAuction = () => {
  const { authUser, verification } = useAuctions();
  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-center">
          <div>
            <p className="text-red-400 font-black text-xs tracking-[0.35em] uppercase mb-3">Sell by auction</p>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              Launch a competitive auction with trust signals buyers can believe.
            </h1>
            <p className="text-slate-300 text-lg mt-4 max-w-2xl">
              The auction submission flow should collect stronger data than a normal ad: reserve preference, inspection readiness, flaws, documents, walkaround media, and seller verification.
            </p>
          </div>
          <div className="bg-white text-slate-950 rounded-xl p-6 shadow-xl">
            <h2 className="font-black text-xl mb-4">Auction submission stages</h2>
            <Stage number="1" title="Vehicle and title" text="VIN, registration city, ownership, title status." />
            <Stage number="2" title="Auction setup" text="Reserve, preferred duration, minimum increment." />
            <Stage number="3" title="Trust package" text="Photos, videos, inspection, flaws, service history." />
            <Stage number="4" title="Review and launch" text="Admin approval before the auction goes live." />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        <Feature title="Reserve guidance" text="AI estimates a fair reserve and warns if it may hurt bidding momentum." />
        <Feature title="Listing quality score" text="Photos, flaws, service history, and seller proof become a launch score." />
        <Feature title="Auction protection" text="Deposits, bid limits, anti-shill checks, and auto-extend rules protect the final sale." />
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Auction eligibility</p>
          <p className="mt-2 text-sm font-bold text-slate-800">
            {authUser
              ? `Signed in as ${authUser.email}. Current trust level: ${verification?.verificationLevel || 'registered'}.`
              : 'Auction submissions need a signed-in seller or dealer account.'}
          </p>
          <p className="mt-2 text-sm font-bold text-slate-600">
            The backend now checks seller eligibility before accepting auction submissions, so KYC and trust setup should be completed first.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to={authUser ? '/settings' : '/login'} className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-black text-white">
              {authUser ? 'Open KYC and security' : 'Sign in'}
            </Link>
            <Link to="/dealer/membership" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
              Dealer membership
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 pb-12 flex flex-col sm:flex-row gap-3">
        <Link to="/sell/listing" className="bg-red-600 text-white px-6 py-3 rounded-lg font-black text-center hover:bg-red-700">
          Start Auction Application
        </Link>
        <Link to="/auctions" className="bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-lg font-black text-center hover:border-slate-400">
          View Live Auctions
        </Link>
      </div>
    </main>
  );
};

const Stage = ({ number, title, text }) => (
  <div className="flex gap-3 border border-slate-100 rounded-lg p-3 mb-3">
    <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-black flex-shrink-0">{number}</div>
    <div>
      <p className="font-black">{title}</p>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  </div>
);

const Feature = ({ title, text }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-6">
    <h2 className="text-xl font-black text-slate-900">{title}</h2>
    <p className="text-slate-500 mt-2">{text}</p>
  </div>
);

export default SellAuction;
