import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPkr, getDisplayPrice } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';
import brandLogo from '../assets/wheels-and-deals-logo-cropped.jpeg';

const Home = () => {
  const navigate = useNavigate();
  const { liveAuctionCars, recommendedCars, visibleCars, backendStatus, realtimeStatus } = useAuctions();
  const [auctionOffset, setAuctionOffset] = useState(0);
  const [marketplaceLimit, setMarketplaceLimit] = useState(4);
  const [search, setSearch] = useState({ q: '', city: '', priceRange: '', listingMode: '' });
  const heroAuction = [...liveAuctionCars].sort((a, b) => b.auctionHeat - a.auctionHeat)[0];
  const recommendations = recommendedCars.length ? recommendedCars.slice(0, 4) : visibleCars.slice(0, 4);
  const marketplaceListings = visibleCars.filter((car) => car.listingType !== 'Auction');
  const marketplacePreview = marketplaceListings.slice(0, marketplaceLimit);
  const endingSoon = [...liveAuctionCars].sort((a, b) => a.endsInMinutes - b.endsInMinutes).slice(0, 3);
  const auctionRail = useMemo(() => {
    const auctions = liveAuctionCars.filter((car) => car.id !== heroAuction?.id);
    if (!auctions.length) return [];
    return [...auctions, ...auctions].slice(auctionOffset, auctionOffset + Math.min(4, auctions.length));
  }, [auctionOffset, heroAuction?.id, liveAuctionCars]);
  const moveAuctionRail = (direction) => {
    const count = Math.max(1, liveAuctionCars.length - 1);
    setAuctionOffset((current) => (current + direction + count) % count);
  };
  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    navigate(`/buy-car?${params.toString()}`);
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
          <div>
            <p className="text-red-400 font-black text-xs tracking-[0.35em] uppercase">Auction-first vehicle platform</p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mt-4 max-w-4xl">
              Bid smarter, buy safer, and compare every vehicle before you commit.
            </h1>
            <p className="text-slate-300 text-lg mt-5 max-w-3xl">
              Separate auction floor, full marketplace search, trusted dealer memberships, owned-vehicle Garage, model communities, and recommendation intelligence in one place.
            </p>
            <form onSubmit={submitSearch} className="mt-7 rounded-xl border border-white/10 bg-white p-3 text-slate-950 shadow-2xl">
              <div className="grid gap-2 md:grid-cols-[1fr_150px_150px_140px_auto]">
                <input value={search.q} onChange={(event) => setSearch((current) => ({ ...current, q: event.target.value }))} className="rounded-lg border border-slate-200 p-3 font-bold" placeholder="Search make, model, variant, year" />
                <input value={search.city} onChange={(event) => setSearch((current) => ({ ...current, city: event.target.value }))} className="rounded-lg border border-slate-200 p-3 font-bold" placeholder="City" />
                <select value={search.priceRange} onChange={(event) => setSearch((current) => ({ ...current, priceRange: event.target.value }))} className="rounded-lg border border-slate-200 p-3 font-bold">
                  <option value="">Any price</option>
                  <option value="0-2000000">Under 20 lac</option>
                  <option value="2000000-5000000">20-50 lac</option>
                  <option value="5000000-10000000">50 lac-1 crore</option>
                  <option value="10000000-999999999">1 crore+</option>
                </select>
                <select value={search.listingMode} onChange={(event) => setSearch((current) => ({ ...current, listingMode: event.target.value }))} className="rounded-lg border border-slate-200 p-3 font-bold">
                  <option value="">All</option>
                  <option value="marketplace">Fixed price</option>
                  <option value="auction">Auction</option>
                  <option value="verified">Verified only</option>
                </select>
                <button className="rounded-lg bg-red-600 px-5 py-3 font-black text-white">Search</button>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-500">Filters support make, model, variant, city, year, price, mileage, transmission, fuel, auction/fixed price, verified seller, bank verified, and inspection readiness.</p>
            </form>
          <div className="flex flex-wrap gap-3 mt-5">
              <Link to="/auctions" className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-3 rounded-lg">Enter Auctions</Link>
              <Link to="/buy-car" className="bg-white hover:bg-slate-100 text-slate-950 font-black px-5 py-3 rounded-lg">Buy a Car</Link>
              <Link to="/sell-car" className="bg-emerald-400 hover:bg-emerald-500 text-slate-950 font-black px-5 py-3 rounded-lg">Sell a Car</Link>
              <Link to="/installments" className="bg-amber-300 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 rounded-lg">Cars on Installments</Link>
              <Link to="/dealer/membership" className="border border-white/20 hover:border-emerald-400 text-white font-black px-5 py-3 rounded-lg">Dealer Membership</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              <HeroStat label="Auctions" value={liveAuctionCars.length} />
              <HeroStat label="Marketplace" value={visibleCars.filter((car) => car.listingType !== 'Auction').length} />
              <HeroStat label="Realtime" value={realtimeStatus} />
              <HeroStat label="Mode" value={backendStatus.available ? 'API' : 'Demo'} />
            </div>
          </div>

          {heroAuction && (
            <Link to={`/listing/${heroAuction.id}`} className="bg-white text-slate-950 rounded-xl overflow-hidden shadow-2xl hover:-translate-y-1 transition-all">
              <div className="relative aspect-[16/10] bg-slate-200">
                <img src={heroAuction.images[0]} alt={heroAuction.name} className="w-full h-full object-cover" />
                <span className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black">HOT AUCTION</span>
                <span className="absolute top-4 right-4 bg-slate-950 text-white px-3 py-1 rounded-full text-xs font-black">{heroAuction.timeLeft} left</span>
              </div>
              <div className="p-5">
                <h2 className="text-2xl font-black">{heroAuction.name}</h2>
                <p className="text-slate-500 mt-1">{heroAuction.city} - {heroAuction.reserveStatus} - {heroAuction.watchers} watchers</p>
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <Metric label="High bid" value={formatPkr(heroAuction.highBid)} />
                  <Metric label="Viewing" value={formatSpectators(heroAuction.spectators)} />
                  <Metric label="Deal" value={heroAuction.dealScore} />
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-7">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-black uppercase text-red-600 tracking-[0.25em]">On auction now</p>
              <h2 className="text-2xl font-black text-slate-900">Live auction rail</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => moveAuctionRail(-1)} className="w-10 h-10 rounded-full border border-slate-200 bg-white font-black hover:border-red-500" aria-label="Previous auction cars">‹</button>
              <button onClick={() => moveAuctionRail(1)} className="w-10 h-10 rounded-full border border-slate-200 bg-white font-black hover:border-red-500" aria-label="Next auction cars">›</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {auctionRail.map((car, index) => (
              <HomeAuctionMini key={`${car.id}-${index}`} car={car} />
            ))}
          </div>

          <div className="mt-5 text-center">
            <Link to="/auctions" className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded-lg">
              See all auctions
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-8">
          <HomePanel title="Recommended for you" actionLabel="View all" actionTo="/recommendations">
            {recommendations.map((car) => <HomeCarCard key={car.id} car={car} />)}
          </HomePanel>

          <VerticalMarketplace title="Marketplace listings" actionLabel="Buy a Car" actionTo="/buy-car">
            {marketplacePreview.map((car) => <HomeMarketRow key={car.id} car={car} />)}
          </VerticalMarketplace>
          {marketplaceLimit < marketplaceListings.length && (
            <div className="text-center">
              <button onClick={() => setMarketplaceLimit((current) => current + 4)} className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-3 rounded-lg">
                See more marketplace listings
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-black text-slate-900 text-xl">Ending soon</h2>
            <div className="space-y-3 mt-4">
              {endingSoon.map((car) => (
                <Link key={car.id} to={`/listing/${car.id}`} className="block border border-slate-100 rounded-lg p-3 hover:border-red-400">
                  <p className="font-black text-slate-900">{car.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{car.timeLeft} - {formatPkr(car.highBid)}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 text-white rounded-xl p-5">
            <h2 className="font-black text-xl">Verified dealer program</h2>
            <p className="text-sm text-slate-300 mt-2">Monthly membership for dealers after business, identity, inventory, and bank verification.</p>
            <Link to="/dealer/membership" className="inline-block mt-4 bg-emerald-400 text-slate-950 font-black px-4 py-3 rounded-lg">See plans</Link>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-black text-slate-900 text-xl">Quick paths</h2>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <QuickPath label="Compare" to="/compare" />
              <QuickPath label="My Garage" to="/garage" />
              <QuickPath label="Communities" to="/communities" />
              <QuickPath label="Accessories" to="/accessories" />
              <QuickPath label="Trust Center" to="/trust" />
              <QuickPath label="Auction Rules" to="/auction-rules" />
            </div>
          </section>
        </aside>
      </section>

      <footer className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <span className="h-16 w-48 overflow-hidden flex items-center bg-white rounded-sm" aria-hidden="true">
              <img src={brandLogo} alt="" className="w-full h-full object-contain object-left" />
            </span>
            <span className="sr-only">Wheels&Deals</span>
            <p className="text-slate-300 mt-3 max-w-xl">
              Auction-first vehicle marketplace for Pakistan with verified dealers, safer bidding, marketplace search, comparisons, Garage ownership tools, and community knowledge.
            </p>
          </div>
          <FooterColumn title="Company" links={[['About', '/trust'], ['Dealer program', '/dealer/membership'], ['Contact', '/faq'], ['News', '/news']]} />
          <FooterColumn title="Trust" links={[['Trust Center', '/trust'], ['Buyer protection', '/buyer-protection'], ['KYC & Data', '/kyc-policy'], ['Privacy', '/privacy-policy'], ['Terms', '/terms']]} />
        </div>
      </footer>
    </main>
  );
};

const HeroStat = ({ label, value }) => (
  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
    <p className="text-[10px] uppercase text-slate-400 font-black">{label}</p>
    <p className="font-black mt-1 truncate">{value}</p>
  </div>
);

const Metric = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
    <p className="text-[10px] uppercase text-slate-400 font-black">{label}</p>
    <p className="font-black text-slate-900 mt-1">{value}</p>
  </div>
);

const HomePanel = ({ title, actionLabel, actionTo, children }) => (
  <section>
    <div className="flex items-end justify-between gap-3 mb-4">
      <h2 className="text-2xl font-black text-slate-900">{title}</h2>
      <Link to={actionTo} className="text-sm font-black text-blue-600 hover:underline">{actionLabel}</Link>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{children}</div>
  </section>
);

const VerticalMarketplace = ({ title, actionLabel, actionTo, children }) => (
  <section>
    <div className="flex items-end justify-between gap-3 mb-4">
      <h2 className="text-2xl font-black text-slate-900">{title}</h2>
      <Link to={actionTo} className="text-sm font-black text-blue-600 hover:underline">{actionLabel}</Link>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const HomeCarCard = ({ car }) => (
  <Link to={`/listing/${car.id}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl transition-all">
    <div className="relative h-40 bg-slate-100">
      <img src={car.images[0]} alt={car.name} className="w-full h-full object-cover" />
      <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black text-white ${car.listingType === 'Auction' ? 'bg-red-600' : 'bg-blue-600'}`}>{car.listingType}</span>
    </div>
    <div className="p-4">
      <h3 className="font-black text-slate-900 truncate">{car.name}</h3>
      <p className="text-sm text-slate-500 mt-1">{car.city} - {car.mileage}</p>
      <p className="text-lg font-black text-red-600 mt-3">{getDisplayPrice(car)}</p>
    </div>
  </Link>
);

const HomeMarketRow = ({ car }) => (
  <Link to={`/listing/${car.id}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-400 transition-all grid grid-cols-1 sm:grid-cols-[220px_1fr]">
    <div className="relative h-44 sm:h-full min-h-44 bg-slate-100">
      <img src={car.images[0]} alt={car.name} className="w-full h-full object-cover" />
      <span className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{car.listingType}</span>
      {String(car.sellerType || '').toLowerCase().includes('dealer') && (
        <span className="absolute bottom-3 left-3 bg-emerald-400 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black">VERIFIED DEALER</span>
      )}
    </div>
    <div className="p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-900">{car.name}</h3>
          <p className="text-sm text-slate-500 mt-1">{car.city} - {car.mileage} - {car.transmission}</p>
          <p className="text-xs font-bold text-slate-400 mt-1">{car.engine} - {car.bodyStyle} - {car.titleStatus}</p>
        </div>
        <p className="text-2xl font-black text-red-600">{getDisplayPrice(car)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 max-w-md">
        <Metric label="Deal" value={car.dealScore} />
        <Metric label="Trust" value={car.trustScore} />
        <Metric label="Inspect" value={car.inspectionScore} />
      </div>
    </div>
  </Link>
);

const HomeAuctionMini = ({ car }) => (
  <Link to={`/listing/${car.id}`} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:border-red-500 hover:shadow-lg transition-all">
    <div className="relative h-36 bg-slate-100">
      <img src={car.images[0]} alt={car.name} className="w-full h-full object-cover" />
      <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full">{car.timeLeft}</span>
    </div>
    <div className="p-4">
      <h3 className="font-black text-slate-900 truncate">{car.name}</h3>
      <p className="text-xs text-slate-500 mt-1">{car.bidsCount} bids - {formatSpectators(car.spectators)} viewing</p>
      <p className="text-lg font-black text-red-600 mt-2">{formatPkr(car.highBid)}</p>
    </div>
  </Link>
);

const QuickPath = ({ label, to }) => (
  <Link to={to} className="bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg p-3 text-center font-black text-slate-700">{label}</Link>
);

const FooterColumn = ({ title, links }) => (
  <div>
    <h3 className="font-black">{title}</h3>
    <div className="space-y-2 mt-3">
      {links.map(([label, to]) => (
        <Link key={label} to={to} className="block text-sm text-slate-400 font-bold hover:text-white">
          {label}
        </Link>
      ))}
    </div>
  </div>
);

const formatSpectators = (count = 0) => `${Number(count || 0).toLocaleString()}`;

export default Home;
