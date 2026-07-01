import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const Installments = () => {
  const { visibleCars } = useAuctions();
  const [downPayment, setDownPayment] = useState(2000000);
  const [tenure, setTenure] = useState(48);
  const [markup, setMarkup] = useState(17.5);
  const installmentCars = visibleCars.filter((car) => car.listingType !== 'Auction' && car.installmentAvailable);
  const estimatedMonthly = useMemo(() => {
    const samplePrice = installmentCars[0]?.buyNowPrice || 5000000;
    const financed = Math.max(0, samplePrice - Number(downPayment || 0));
    const monthlyRate = Number(markup || 0) / 100 / 12;
    if (!monthlyRate) return Math.round(financed / Number(tenure || 1));
    return Math.round((financed * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -Number(tenure || 1))));
  }, [downPayment, tenure, markup, installmentCars]);

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <p className="text-amber-300 font-black text-xs uppercase tracking-[0.3em]">Cars on installments</p>
          <h1 className="text-4xl md:text-5xl font-black mt-2">Installment buying is a first-class path, not a filter hidden at the bottom.</h1>
          <p className="text-slate-300 mt-4 max-w-3xl">Search by monthly budget, down payment, tenure, dealer financing, bank financing, and eligibility before you contact the seller.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <aside className="bg-white border border-slate-200 rounded-xl p-5 h-fit">
          <h2 className="text-xl font-black text-slate-900">EMI calculator</h2>
          <div className="space-y-3 mt-4">
            <CalcInput label="Down payment" value={downPayment} onChange={setDownPayment} />
            <CalcInput label="Tenure months" value={tenure} onChange={setTenure} />
            <CalcInput label="Markup %" value={markup} onChange={setMarkup} step="0.1" />
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mt-5">
            <p className="text-xs font-black uppercase text-emerald-700">Estimated monthly</p>
            <p className="text-3xl font-black text-emerald-800 mt-1">{formatPkr(estimatedMonthly)}</p>
            <p className="text-xs text-emerald-700 mt-2">Demo estimate. Real eligibility needs bank/dealer APIs.</p>
          </div>
        </aside>

        <div>
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{installmentCars.length} installment listings</h2>
              <p className="text-slate-500">Dealer and marketplace cars with monthly payment offers.</p>
            </div>
            <Link to="/listings?category=Cars%20on%20Installments" className="text-blue-600 font-black hover:underline">Open in Marketplace</Link>
          </div>

          <div className="space-y-4">
            {installmentCars.map((car) => (
              <Link key={car.id} to={`/listing/${car.id}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-[260px_1fr] hover:border-amber-400">
                <div className="relative h-48 md:h-full bg-slate-100">
                  <img src={car.images[0]} alt={car.name} className="w-full h-full object-cover" />
                  <span className="absolute top-3 left-3 bg-amber-300 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full">INSTALLMENTS</span>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-black text-slate-900">{car.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{car.city} - {car.mileage} - {car.sellerType}</p>
                  <p className="text-2xl font-black text-red-600 mt-3">{formatPkr(car.buyNowPrice)}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <Metric label="Monthly" value={formatPkr(car.monthlyInstallment)} />
                    <Metric label="Down payment" value={formatPkr(car.downPayment)} />
                    <Metric label="Tenure" value={`${car.installmentTenureMonths} months`} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

const CalcInput = ({ label, value, onChange, step = '1' }) => (
  <label className="block">
    <span className="text-[10px] uppercase text-slate-400 font-black">{label}</span>
    <input type="number" step={step} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-amber-500" />
  </label>
);

const Metric = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
    <p className="text-[10px] uppercase text-slate-400 font-black">{label}</p>
    <p className="font-black text-slate-900 mt-1">{value}</p>
  </div>
);

export default Installments;
