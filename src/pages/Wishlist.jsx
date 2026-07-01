import React, { useEffect, useMemo, useState } from 'react';
import { createHttpClient } from '../api/httpClient';
import { createPlatformApi } from '../api/platformApi';
import { useAuctions } from '../context/AuctionContext';

const AUTH_TOKEN_KEY = 'wheels_deals_auth_token';

const Wishlist = () => {
  const { watchedCars, accessoryWishlist, savedSearches, visibleCars, accessories } = useAuctions();
  const api = useMemo(() => createPlatformApi(createHttpClient({ getToken: () => window.localStorage.getItem(AUTH_TOKEN_KEY) })), []);
  const [backendItems, setBackendItems] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.wishlist.list()
      .then((result) => setBackendItems(result.items || []))
      .catch(() => setBackendItems([]));
  }, [api]);

  const localItems = [
    ...watchedCars.map((car) => ({ id: `car-${car.id}`, itemType: car.listingType === 'Auction' ? 'auction' : 'car', title: car.name, meta: `${car.city} • PKR ${car.price?.toLocaleString?.() || car.price}` })),
    ...accessories.filter((item) => accessoryWishlist.includes(item.id)).map((item) => ({ id: `accessory-${item.id}`, itemType: 'accessory', title: item.name, meta: `${item.category} • PKR ${item.price?.toLocaleString?.() || item.price}` })),
    ...savedSearches.map((item) => ({ id: `search-${item.id}`, itemType: 'saved_search', title: item.label || item.query || 'Saved search', meta: item.createdAt || 'Saved search alert' })),
  ];

  const grouped = [...backendItems, ...localItems].reduce((result, item) => {
    const type = item.itemType || item.type || 'saved';
    result[type] = [...(result[type] || []), item];
    return result;
  }, {});

  const saveDemoSeller = async () => {
    const seller = visibleCars.find((car) => car.seller)?.seller || 'verified-seller';
    const result = await api.wishlist.save({ itemType: 'seller', itemId: seller, notes: 'Saved seller/dealer for trust follow-up' }).catch((error) => ({ error }));
    if (result.error) setMessage(result.error.message);
    else {
      setBackendItems((items) => [result.item, ...items]);
      setMessage('Seller saved with notifications enabled.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">Retention layer</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Wishlist</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold text-slate-600">Saved cars, live auctions, accessories, sellers, dealers, and searches live here with hooks for price-drop and ending-soon alerts.</p>
          </div>
          <button onClick={saveDemoSeller} className="rounded-lg bg-slate-950 px-5 py-3 font-black text-white">Save demo seller</button>
        </div>

        {message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-black text-emerald-700">{message}</p>}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(grouped).map(([type, items]) => (
            <section key={type} className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black capitalize text-slate-900">{type.replaceAll('_', ' ')}</h2>
              <div className="mt-4 space-y-3">
                {items.map((item) => (
                  <article key={item.id || `${item.itemType}-${item.itemId}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="font-black text-slate-900">{item.title || item.itemId}</p>
                    <p className="mt-1 text-sm font-bold text-slate-500">{item.meta || item.notes || 'Notifications enabled'}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
          {!Object.keys(grouped).length && (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center md:col-span-2 xl:col-span-3">
              <h2 className="text-xl font-black text-slate-900">No saved items yet</h2>
              <p className="mt-2 font-bold text-slate-500">Save cars, auctions, accessories, sellers, dealers, and searches as you browse.</p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
};

export default Wishlist;
