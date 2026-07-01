import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const plans = [
  { name: 'Starter Dealer', price: 'PKR 9,999/mo', inventory: '15 active cars', auctions: '3 auctions/mo', badge: 'Verified Dealer' },
  { name: 'Pro Dealer', price: 'PKR 24,999/mo', inventory: '60 active cars', auctions: '15 auctions/mo', badge: 'Priority Verified' },
  { name: 'Auction House', price: 'PKR 59,999/mo', inventory: 'Unlimited inventory', auctions: 'Unlimited auctions', badge: 'Auction Partner' },
];

const DealerMembership = () => {
  const [selectedPlan, setSelectedPlan] = useState(plans[1].name);
  const { authUser, verification } = useAuctions();

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <p className="text-emerald-400 font-black text-xs tracking-[0.35em] uppercase">Verified dealer membership</p>
          <h1 className="text-4xl md:text-6xl font-black mt-3 max-w-4xl">Monthly plans for registered dealers who want to sell and auction with trust.</h1>
          <p className="text-slate-300 text-lg mt-4 max-w-3xl">
            Dealers pay a monthly membership after business verification, identity/KYC, bank checks, inventory review, and platform rules approval.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <button
              key={plan.name}
              onClick={() => setSelectedPlan(plan.name)}
              className={`text-left bg-white border rounded-xl p-5 hover:border-emerald-500 ${selectedPlan === plan.name ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}
            >
              <p className="text-xs font-black uppercase text-emerald-600">{plan.badge}</p>
              <h2 className="text-2xl font-black text-slate-900 mt-2">{plan.name}</h2>
              <p className="text-3xl font-black text-slate-950 mt-4">{plan.price}</p>
              <div className="space-y-2 mt-5 text-sm font-bold text-slate-600">
                <p>{plan.inventory}</p>
                <p>{plan.auctions}</p>
                <p>Dealer profile and showroom page</p>
                <p>Lead inbox and bid handoff tools</p>
              </div>
            </button>
          ))}
        </div>

        <aside className="space-y-5">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-xl font-black text-slate-900">Verification checklist</h2>
            <Checklist text="Business registration or dealership proof" />
            <Checklist text="Owner CNIC and phone OTP" />
            <Checklist text="Bank account for monthly billing" />
            <Checklist text="Physical showroom or inventory proof" />
            <Checklist text="Auction rules and dispute policy accepted" />
          </section>

          <section className="bg-slate-900 text-white rounded-xl p-5">
            <h2 className="text-xl font-black">Selected plan</h2>
            <p className="text-emerald-300 font-black mt-2">{selectedPlan}</p>
            <p className="text-sm text-slate-300 mt-2">
              {authUser
                ? `Signed in as ${authUser.email}. Current trust level: ${verification?.verificationLevel || 'registered'}.`
                : 'Sign in first, then complete KYC and dealer verification before monthly billing can start.'}
            </p>
            <Link to={authUser ? '/settings' : '/signup'} className="inline-block mt-4 bg-emerald-400 text-slate-950 font-black px-4 py-3 rounded-lg">
              {authUser ? 'Open dealer trust settings' : 'Apply as dealer'}
            </Link>
          </section>
        </aside>
      </section>
    </main>
  );
};

const Checklist = ({ text }) => (
  <div className="flex gap-3 border border-slate-100 rounded-lg p-3 mt-3">
    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">OK</span>
    <span className="font-bold text-slate-700">{text}</span>
  </div>
);

export default DealerMembership;
