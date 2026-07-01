import React from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const BuyerDashboard = () => {
  const { wallet, watchedCars, recentlyViewedCars, recommendedCars, notifications, conversations, compareCars, myGarage, compatibleAccessories, accessoryWishlist, liveAuctionCars } = useAuctions();
  const unread = notifications.filter((item) => !item.read).length;
  const winningBids = liveAuctionCars.filter((car) => car.lastBidder === 'You' || car.userIsWinner);

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-blue-600 font-black text-xs uppercase tracking-[0.3em]">Buyer cockpit</p>
            <h1 className="text-4xl font-black text-slate-900 mt-2">Your auction command center</h1>
            <p className="text-slate-500 mt-2">Watch bids, messages, recommendations, alerts, and comparison choices.</p>
          </div>
          <Link to="/listings" className="bg-slate-900 text-white px-5 py-3 rounded-lg font-bold text-center">
            Browse Cars
          </Link>
          <Link to="/garage" className="bg-emerald-600 text-white px-5 py-3 rounded-lg font-bold text-center">
            My Garage
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Stat label="Wallet" value={formatPkr(wallet.balance)} />
          <Stat label="Watching" value={watchedCars.length} />
          <Stat label="Viewed" value={recentlyViewedCars.length} />
          <Stat label="Unread Alerts" value={unread} />
          <Stat label="Compare" value={compareCars.length} />
          <Stat label="Accessory Saves" value={accessoryWishlist.length} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <QuickLink title="My Bids" text={`${winningBids.length} winning or won auctions`} to="/auctions" />
          <QuickLink title="My Garage" text={`${myGarage.year} ${myGarage.make} ${myGarage.model}`} to="/garage" />
          <QuickLink title="Accessory Fits" text={`${compatibleAccessories.length} compatible products`} to="/accessories" />
          <QuickLink title="My Orders" text="Purchases, inspections, and checkout" to="/orders" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Panel title="Recommended next" link="/recommendations">
            {recommendedCars.slice(0, 4).map((car) => <CarRow key={car.id} car={car} />)}
          </Panel>
          <Panel title="Watchlist" link="/recommendations">
            {watchedCars.length ? watchedCars.map((car) => <CarRow key={car.id} car={car} />) : <Empty text="No watched cars yet." />}
          </Panel>
          <Panel title="Messages" link="/messages">
            {conversations.length ? conversations.map((item) => (
              <Link key={item.id} to="/messages" className="block border border-slate-100 rounded-lg p-3 hover:border-blue-400">
                <p className="font-black text-slate-900">{item.seller}</p>
                <p className="text-xs text-slate-500 mt-1">{item.messages[item.messages.length - 1]?.body}</p>
              </Link>
            )) : <Empty text="No conversations yet." />}
          </Panel>
          <Panel title={`Fits ${myGarage.make} ${myGarage.model}`} link="/accessories">
            {compatibleAccessories.slice(0, 4).map((item) => (
              <Link key={item.id} to={`/accessories/${item.id}`} className="block border border-slate-100 rounded-lg p-3 hover:border-emerald-400">
                <p className="font-black text-slate-900 truncate">{item.name}</p>
                <p className="text-xs text-slate-500 mt-1">{formatPkr(item.price)} - {item.category}</p>
              </Link>
            ))}
          </Panel>
        </div>
      </section>
    </main>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5">
    <p className="text-xs text-slate-400 uppercase tracking-wider font-black">{label}</p>
    <p className="text-2xl font-black text-slate-900 mt-1 truncate">{value}</p>
  </div>
);

const QuickLink = ({ title, text, to }) => (
  <Link to={to} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-500">
    <p className="font-black text-slate-900">{title}</p>
    <p className="text-sm text-slate-500 mt-1">{text}</p>
  </Link>
);

const Panel = ({ title, link, children }) => (
  <section className="bg-white border border-slate-200 rounded-xl p-5">
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-black text-slate-900">{title}</h2>
      <Link to={link} className="text-sm text-blue-600 font-bold hover:underline">Open</Link>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

const CarRow = ({ car }) => (
  <Link to={`/listing/${car.id}`} className="block border border-slate-100 rounded-lg p-3 hover:border-blue-400">
    <p className="font-black text-slate-900 truncate">{car.name}</p>
    <p className="text-xs text-slate-500 mt-1">{car.city} - {car.listingType}</p>
  </Link>
);

const Empty = ({ text }) => <p className="text-sm text-slate-500">{text}</p>;

export default BuyerDashboard;
