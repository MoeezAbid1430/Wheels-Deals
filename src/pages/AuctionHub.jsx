import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const AuctionHub = () => {
  const { liveAuctionCars, backendStatus, realtimeStatus } = useAuctions();
  const [activeTab, setActiveTab] = useState('Live');
  const auctionGroups = useMemo(() => {
    const live = liveAuctionCars.filter((car) => car.status === 'Live');
    const ended = liveAuctionCars.filter((car) => car.status === 'Ended');
    const upcoming = liveAuctionCars.filter((car) => car.status === 'Scheduled' || car.timeLeft === 'Pending launch');
    return {
      Live: live,
      'Ending Soon': [...live].sort((a, b) => a.endsInMinutes - b.endsInMinutes).slice(0, 8),
      Upcoming: upcoming,
      Results: ended,
      All: liveAuctionCars,
    };
  }, [liveAuctionCars]);
  const visibleAuctions = auctionGroups[activeTab] || liveAuctionCars;
  const endingSoon = [...liveAuctionCars].sort((a, b) => a.endsInMinutes - b.endsInMinutes);
  const hottest = [...liveAuctionCars].sort((a, b) => b.auctionHeat - a.auctionHeat);
  const hotAuction = hottest[0];

  return (
    <main className="bg-zinc-950 min-h-screen text-white">
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div>
            <p className="text-red-400 font-black text-xs tracking-[0.35em] uppercase mb-3">Live auction command center</p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight max-w-4xl">
              Auctions are the product, not a side feature.
            </h1>
            <p className="text-zinc-300 text-lg mt-5 max-w-3xl">
              Track ending cars, bid momentum, reserve status, trust signals, and deal quality in one auction-first view.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <span className={`rounded-full px-3 py-1 text-xs font-black ${backendStatus.available ? 'bg-green-400/15 text-green-200' : 'bg-amber-400/15 text-amber-200'}`}>
                API {backendStatus.available ? 'connected' : 'demo mode'}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${realtimeStatus === 'connected' ? 'bg-green-400/15 text-green-200' : 'bg-zinc-800 text-zinc-300'}`}>
                Realtime {realtimeStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
              <HeroStat label="Live auctions" value={liveAuctionCars.filter((car) => car.status === 'Live').length} />
              <HeroStat label="Active bids" value={liveAuctionCars.reduce((sum, car) => sum + car.bidsCount, 0)} />
              <HeroStat label="Spectators" value={liveAuctionCars.reduce((sum, car) => sum + Number(car.spectators || 0), 0)} />
              <HeroStat label="Watchers" value={liveAuctionCars.reduce((sum, car) => sum + car.watchers, 0)} />
            </div>
          </div>

          <div className="bg-white text-slate-950 rounded-xl p-5 shadow-2xl">
            <h2 className="font-black text-xl mb-4">Bid readiness checklist</h2>
            <ChecklistItem text="Wallet deposit verified before bid" />
            <ChecklistItem text="Bid must meet next increment" />
            <ChecklistItem text="Auction auto-extends near close" />
            <ChecklistItem text="Fraud score checked before confirmation" />
            <ChecklistItem text="Winning bidder checkout is locked" />
          </div>
        </div>
      </section>

      <section className="bg-white text-slate-950">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {hotAuction && (
            <Link to={`/listing/${hotAuction.id}`} className="block bg-slate-950 text-white rounded-xl overflow-hidden mb-8 grid grid-cols-1 lg:grid-cols-[1fr_420px] hover:-translate-y-1 transition-all">
              <div className="p-6 lg:p-8">
                <p className="text-red-400 font-black text-xs tracking-[0.3em] uppercase">Hot auction</p>
                <h2 className="text-3xl lg:text-5xl font-black mt-3">{hotAuction.name}</h2>
                <p className="text-slate-300 mt-3">{hotAuction.city} - {hotAuction.reserveStatus} - {Number(hotAuction.spectators || 0).toLocaleString()} viewing live</p>
                <div className="grid grid-cols-3 gap-3 mt-6 max-w-2xl">
                  <HeroStat label="High bid" value={formatPkr(hotAuction.highBid)} />
                  <HeroStat label="Heat" value={`${hotAuction.auctionHeat}%`} />
                  <HeroStat label="Spectators" value={Number(hotAuction.spectators || 0).toLocaleString()} />
                </div>
              </div>
              <div className="relative min-h-72 bg-slate-800">
                <img src={hotAuction.images[0]} alt={hotAuction.name} className="w-full h-full object-cover" />
                <span className="absolute top-4 right-4 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full">{hotAuction.timeLeft}</span>
              </div>
            </Link>
          )}

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-3xl font-black">Auction floor</h2>
              <p className="text-slate-500">Browse live auctions, ending cars, upcoming launches, and result history.</p>
            </div>
            <Link to="/listings" className="font-bold text-red-600 hover:underline">Open Marketplace</Link>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {['Live', 'Ending Soon', 'Upcoming', 'Results', 'All'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-black text-sm ${activeTab === tab ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {tab} ({auctionGroups[tab]?.length || 0})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {visibleAuctions.length > 0 ? (
              visibleAuctions.map((car) => <AuctionCard key={car.id} car={car} />)
            ) : (
              <div className="xl:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                <h3 className="font-black text-xl text-slate-900">No auctions in this tab yet.</h3>
                <p className="text-slate-500 mt-2">Scheduled and completed auctions will appear here once sellers launch more inventory.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-black mb-5">Auction heat board</h2>
        <div className="space-y-3">
          {hottest.map((car, index) => (
            <Link
              key={car.id}
              to={`/listing/${car.id}`}
              className="grid grid-cols-1 md:grid-cols-[60px_1fr_160px_160px_120px] gap-4 items-center bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-red-500 transition-colors"
            >
              <span className="text-2xl font-black text-zinc-500">#{index + 1}</span>
              <div>
                <h3 className="font-black text-lg">{car.name}</h3>
                <p className="text-sm text-zinc-400">{car.city} - {car.reserveStatus} - {Number(car.spectators || 0).toLocaleString()} viewing live</p>
              </div>
              <BoardMetric label="High bid" value={formatPkr(car.highBid)} />
              <BoardMetric label="Ends in" value={car.timeLeft} />
              <BoardMetric label="Heat" value={`${car.auctionHeat}%`} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

const HeroStat = ({ label, value }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <p className="text-zinc-500 text-xs uppercase tracking-wider font-black">{label}</p>
    <p className="text-2xl font-black mt-1">{value}</p>
  </div>
);

const ChecklistItem = ({ text }) => (
  <div className="flex items-center gap-3 border border-slate-100 rounded-lg p-3 mb-2">
    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-black text-xs">OK</span>
    <span className="font-bold text-sm">{text}</span>
  </div>
);

const AuctionCard = ({ car }) => (
  <Link to={`/listing/${car.id}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
    <div className="relative h-44 bg-slate-100">
      <img src={car.images[0]} alt={car.name} className="w-full h-full object-cover" />
      <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full">{car.status.toUpperCase()}</span>
      <span className="absolute top-3 right-3 bg-slate-950 text-white text-[10px] font-black px-3 py-1 rounded-full">{car.timeLeft}</span>
      {String(car.sellerType || '').toLowerCase().includes('dealer') && (
        <span className="absolute bottom-3 left-3 bg-emerald-400 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full">VERIFIED DEALER</span>
      )}
    </div>
    <div className="p-4">
      <h3 className="font-black truncate">{car.name}</h3>
      <p className="text-slate-500 text-sm mt-1">{car.city} - {car.mileage}</p>
      <p className="text-red-600 font-black text-xl mt-3">{formatPkr(car.highBid)}</p>
      <p className="text-xs text-slate-500 font-bold mt-1">{car.outcomeLabel || car.reserveStatus}</p>
      <div className="mt-4 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className="bg-red-600 h-full" style={{ width: `${car.auctionHeat}%` }} />
      </div>
      <p className="text-xs font-bold text-slate-500 mt-2">Auction heat {car.auctionHeat}%</p>
      <p className="text-xs font-black text-red-600 mt-1">{Number(car.spectators || 0).toLocaleString()} spectators viewing</p>
    </div>
  </Link>
);

const BoardMetric = ({ label, value }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-black">{label}</p>
    <p className="font-black">{value}</p>
  </div>
);

export default AuctionHub;
