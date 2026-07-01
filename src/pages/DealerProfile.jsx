import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const DealerProfile = () => {
  const { name } = useParams();
  const { visibleCars } = useAuctions();
  const dealerName = decodeURIComponent(name || 'Dealer');
  const cars = visibleCars.filter((car) => car.seller === dealerName);

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <p className="text-green-400 font-black text-xs uppercase tracking-[0.3em]">Dealer profile</p>
          <h1 className="text-4xl font-black mt-2">{dealerName}</h1>
          <p className="text-slate-300 mt-3">Verified dealer profile with inventory, trust score, and response signals.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <Stat label="Inventory" value={cars.length} />
            <Stat label="Trust" value={cars[0]?.trustScore || 90} />
            <Stat label="Response" value="Fast" />
            <Stat label="Badge" value="Verified" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-black text-slate-900 mb-4">Dealer inventory</h2>
        {cars.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {cars.map((car) => (
              <Link key={car.id} to={`/listing/${car.id}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg">
                <img src={car.images[0]} alt={car.name} className="h-44 w-full object-cover" />
                <div className="p-4">
                  <p className="font-black text-slate-900">{car.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{car.city} - {car.listingType}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-slate-500">No active inventory for this dealer yet.</div>
        )}
      </section>
    </main>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
    <p className="text-slate-500 text-xs uppercase font-black">{label}</p>
    <p className="text-2xl font-black mt-1">{value}</p>
  </div>
);

export default DealerProfile;
