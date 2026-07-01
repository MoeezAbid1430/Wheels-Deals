import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { pakistanCities } from '../data/taxonomy';
import { useAuctions } from '../context/AuctionContext';
import { mapsService, repairShopCategories } from '../services';

const boards = ['Dealer Sales', 'Dealer Auctions', 'Garage Collections', 'Community Experts', 'Repair Shops Near Me'];
const shopCategoryKeywords = {
  workshops: ['inspection', 'diagnostics', 'suspension', 'engine', 'electrical', 'mechanic'],
  'oil-change': ['oil change'],
  'car-wash': ['car wash', 'detailing', 'cleaning', 'ceramic'],
  dealerships: ['dealership', 'certified used cars', 'trade-in', 'financing'],
  tyres: ['tyre', 'wheel', 'alignment'],
  inspection: ['inspection', 'diagnostics'],
  towing: ['towing', 'roadside'],
};

const Rankings = () => {
  const { garageRankings, dealerRankings, communityRankings, repairShopRankings } = useAuctions();
  const [activeBoard, setActiveBoard] = useState('Dealer Sales');
  const [cityFilter, setCityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [shopCategory, setShopCategory] = useState('workshops');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const sortOptions = getSortOptions(activeBoard);

  const rankedRows = useMemo(() => {
    const cityMatches = (item) => cityFilter === 'All' || item.city === cityFilter;
    const rerank = (items) => items.map((item, index) => ({ ...item, rank: index + 1 }));

    if (activeBoard === 'Dealer Sales') {
      const sorted = [...dealerRankings]
        .filter(cityMatches)
        .sort((a, b) => compareDealer(a, b, sortBy || 'soldCars'));
      return rerank(sorted);
    }

    if (activeBoard === 'Dealer Auctions') {
      const sorted = [...dealerRankings]
        .filter(cityMatches)
        .sort((a, b) => compareDealer(a, b, sortBy === 'default' ? 'auctionCars' : sortBy));
      return rerank(sorted);
    }

    if (activeBoard === 'Garage Collections') {
      const sorted = [...garageRankings]
        .filter(cityMatches)
        .sort((a, b) => compareGarage(a, b, sortBy));
      return rerank(sorted);
    }

    if (activeBoard === 'Community Experts') {
      const sorted = [...communityRankings].sort((a, b) => compareCommunity(a, b, sortBy));
      return rerank(sorted);
    }

    const categoryLabel = mapsService.getCategory(shopCategory).label;
    const keywords = shopCategoryKeywords[shopCategory] || [categoryLabel.toLowerCase()];
    const sorted = [...repairShopRankings]
      .filter(cityMatches)
      .filter((shop) => !verifiedOnly || shop.verified)
      .filter((shop) => shopCategory === 'workshops' || shop.specialties.some((item) => keywords.some((keyword) => item.toLowerCase().includes(keyword))))
      .sort((a, b) => compareShop(a, b, sortBy));
    return rerank(sorted.length ? sorted : repairShopRankings.filter(cityMatches).filter((shop) => !verifiedOnly || shop.verified));
  }, [activeBoard, cityFilter, sortBy, dealerRankings, garageRankings, communityRankings, repairShopRankings, shopCategory, verifiedOnly]);

  const resetBoard = (board) => {
    setActiveBoard(board);
    setSortBy('default');
    setVerifiedOnly(false);
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <p className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em]">Rankings</p>
          <h1 className="text-4xl md:text-5xl font-black mt-2">Leaderboards for dealers, collectors, auctions, community experts, and local mechanics.</h1>
          <p className="text-slate-300 mt-4 max-w-3xl">Filter each board differently: sales volume for dealers, collection strength for garages, reputation for experts, and Maps-ready proximity for repair shops.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {boards.map((board) => (
            <button key={board} onClick={() => resetBoard(board)} className={`px-4 py-2 rounded-lg font-black ${activeBoard === board ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
              {board}
            </button>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 grid grid-cols-1 md:grid-cols-4 gap-3">
          {activeBoard !== 'Community Experts' && (
            <Select label="City" value={cityFilter} onChange={setCityFilter} options={['All', ...pakistanCities.slice(0, 14)]} />
          )}
          <Select label="Sort by" value={sortBy} onChange={setSortBy} options={sortOptions} />
          {activeBoard === 'Repair Shops Near Me' && (
            <>
              <Select label="Shop type" value={shopCategory} onChange={setShopCategory} options={repairShopCategories.map((category) => ({ value: category.id, label: category.label }))} />
              <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} className="h-4 w-4" />
                <span className="font-black text-sm text-slate-700">Verified only</span>
              </label>
            </>
          )}
          {activeBoard === 'Repair Shops Near Me' && (
            <Link to="/repair-shops" className="bg-emerald-600 text-white rounded-lg px-4 py-3 font-black text-center hover:bg-emerald-700">
              Open Maps Search
            </Link>
          )}
        </div>

        {activeBoard === 'Dealer Sales' && (
          <Leaderboard title="Top selling dealers" subtitle="Ranked by total cars sold, revenue, speed, and trust.">
            {rankedRows.map((dealer) => <DealerRow key={dealer.id} dealer={dealer} metric={`${dealer.soldCars} cars sold`} />)}
          </Leaderboard>
        )}

        {activeBoard === 'Dealer Auctions' && (
          <Leaderboard title="Top auction dealers" subtitle="Ranked by auction volume, trust, sell-through speed, and revenue.">
            {rankedRows.map((dealer) => <DealerRow key={dealer.id} dealer={dealer} metric={`${dealer.auctionCars} auction cars`} />)}
          </Leaderboard>
        )}

        {activeBoard === 'Garage Collections' && (
          <Leaderboard title="Largest car collections" subtitle="Ranked by owned vehicles, value, auction wins, rare cars, and verification.">
            {rankedRows.map((collector) => <GarageRow key={collector.id} collector={collector} />)}
          </Leaderboard>
        )}

        {activeBoard === 'Community Experts' && (
          <Leaderboard title="Community experts" subtitle="Ranked by helpful posts, accepted answers, and reputation.">
            {rankedRows.map((person) => <CommunityRow key={person.id} person={person} />)}
          </Leaderboard>
        )}

        {activeBoard === 'Repair Shops Near Me' && (
          <Leaderboard title="Local repair shop rankings" subtitle="Workshops, oil change, car washes, dealerships, tyre shops, inspection centers, and towing partners.">
            {rankedRows.map((shop) => <RepairShopRow key={shop.id} shop={shop} categoryId={shopCategory} />)}
          </Leaderboard>
        )}
      </section>
    </main>
  );
};

const getSortOptions = (board) => {
  if (board === 'Dealer Sales') {
    return [
      { value: 'default', label: 'Cars sold' },
      { value: 'revenue', label: 'Revenue' },
      { value: 'trustScore', label: 'Trust score' },
      { value: 'avgDaysToSell', label: 'Fastest sellers' },
    ];
  }
  if (board === 'Dealer Auctions') {
    return [
      { value: 'default', label: 'Auction cars' },
      { value: 'trustScore', label: 'Trust score' },
      { value: 'avgDaysToSell', label: 'Fastest auction sellers' },
      { value: 'soldCars', label: 'Total sales' },
    ];
  }
  if (board === 'Garage Collections') {
    return [
      { value: 'default', label: 'Vehicles owned' },
      { value: 'collectionValue', label: 'Collection value' },
      { value: 'auctionWins', label: 'Auction wins' },
      { value: 'rareCars', label: 'Rare cars' },
    ];
  }
  if (board === 'Community Experts') {
    return [
      { value: 'default', label: 'Helpful actions' },
      { value: 'reputation', label: 'Reputation' },
    ];
  }
  return [
    { value: 'default', label: 'Community rank' },
    { value: 'rating', label: 'Highest rating' },
    { value: 'distanceKm', label: 'Nearest' },
    { value: 'completedJobs', label: 'Most jobs' },
    { value: 'communityVotes', label: 'Community votes' },
    { value: 'reviews', label: 'Most reviewed' },
  ];
};

const compareDealer = (a, b, sortBy) => {
  if (sortBy === 'avgDaysToSell') return a.avgDaysToSell - b.avgDaysToSell;
  if (sortBy === 'revenue') return b.revenue - a.revenue;
  if (sortBy === 'trustScore') return b.trustScore - a.trustScore;
  if (sortBy === 'auctionCars') return b.auctionCars - a.auctionCars;
  return b.soldCars - a.soldCars;
};

const compareGarage = (a, b, sortBy) => {
  if (sortBy === 'collectionValue') return b.collectionValue - a.collectionValue;
  if (sortBy === 'auctionWins') return b.auctionWins - a.auctionWins;
  if (sortBy === 'rareCars') return b.rareCars - a.rareCars;
  return b.vehicles - a.vehicles;
};

const compareCommunity = (a, b, sortBy) => {
  if (sortBy === 'reputation') return b.reputation - a.reputation;
  return b.value - a.value;
};

const compareShop = (a, b, sortBy) => {
  if (sortBy === 'rating') return b.rating - a.rating;
  if (sortBy === 'distanceKm') return a.distanceKm - b.distanceKm;
  if (sortBy === 'completedJobs') return b.completedJobs - a.completedJobs;
  if (sortBy === 'communityVotes') return b.communityVotes - a.communityVotes;
  if (sortBy === 'reviews') return b.reviews - a.reviews;
  return a.rank - b.rank;
};

const Select = ({ label, value, onChange, options }) => (
  <label>
    <span className="text-[10px] uppercase font-black text-slate-400">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-3 font-bold text-slate-800 bg-white">
      {options.map((option) => {
        const value = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        return <option key={value} value={value}>{label}</option>;
      })}
    </select>
  </label>
);

const Leaderboard = ({ title, subtitle, children }) => (
  <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div className="p-5 border-b border-slate-100">
      <h2 className="text-2xl font-black text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
    </div>
    <div className="divide-y divide-slate-100">{children}</div>
  </section>
);

const DealerRow = ({ dealer, metric }) => (
  <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_180px_160px_160px] gap-4 items-center p-5">
    <p className="text-3xl font-black text-slate-300">#{dealer.rank}</p>
    <div>
      <p className="font-black text-xl text-slate-900">{dealer.dealer}</p>
      <p className="text-sm text-slate-500">{dealer.city} - {dealer.badge}</p>
    </div>
    <RankMetric label="Main metric" value={metric} />
    <RankMetric label="Trust" value={`${dealer.trustScore}/100`} />
    <RankMetric label="Revenue" value={formatPkr(dealer.revenue)} />
  </div>
);

const GarageRow = ({ collector }) => (
  <div className="grid grid-cols-1 md:grid-cols-[80px_72px_1fr_160px_160px_160px] gap-4 items-center p-5">
    <p className="text-3xl font-black text-slate-300">#{collector.rank}</p>
    <img src={collector.avatar} alt={`${collector.name} avatar`} className="w-14 h-14 rounded-full object-cover" />
    <div>
      <p className="font-black text-xl text-slate-900">{collector.name}</p>
      <p className="text-sm text-slate-500">{collector.city} - Top car: {collector.topCar}</p>
    </div>
    <RankMetric label="Vehicles" value={collector.vehicles} />
    <RankMetric label="Value" value={formatPkr(collector.collectionValue)} />
    <RankMetric label="Auction wins" value={collector.auctionWins} />
  </div>
);

const CommunityRow = ({ person }) => (
  <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_180px_160px] gap-4 items-center p-5">
    <p className="text-3xl font-black text-slate-300">#{person.rank}</p>
    <div>
      <p className="font-black text-xl text-slate-900">{person.name}</p>
      <p className="text-sm text-slate-500">{person.metric}</p>
    </div>
    <RankMetric label="Helpful actions" value={person.value} />
    <RankMetric label="Reputation" value={`${person.reputation}/100`} />
  </div>
);

const RepairShopRow = ({ shop, categoryId }) => (
  <div className="grid grid-cols-1 lg:grid-cols-[80px_1fr_130px_130px_180px] gap-4 items-center p-5">
    <p className="text-3xl font-black text-slate-300">#{shop.rank}</p>
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-black text-xl text-slate-900">{shop.name}</p>
        {shop.verified && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full">VERIFIED</span>}
        {shop.openNow && <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-full">OPEN NOW</span>}
      </div>
      <p className="text-sm text-slate-500 mt-1">{shop.area}, {shop.city} - {shop.address}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {shop.specialties.map((specialty) => <span key={specialty} className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">{specialty}</span>)}
      </div>
    </div>
    <RankMetric label="Rating" value={`${shop.rating}/5`} />
    <RankMetric label="Near me" value={`${shop.distanceKm} km`} />
    <div className="flex flex-wrap gap-2">
      <a href={mapsService.getDirectionsUrl(shop)} target="_blank" rel="noreferrer" className="bg-slate-900 text-white rounded-lg px-3 py-2 font-black text-sm">Directions</a>
      <a href={mapsService.getSearchUrl({ city: shop.city, categoryId })} target="_blank" rel="noreferrer" className="border border-slate-200 rounded-lg px-3 py-2 font-black text-sm text-slate-700">Open Maps</a>
    </div>
  </div>
);

const RankMetric = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
    <p className="text-[10px] uppercase font-black text-slate-400">{label}</p>
    <p className="font-black text-slate-900 mt-1">{value}</p>
  </div>
);

export default Rankings;
