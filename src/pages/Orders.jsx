import React from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';
import { EmptyBlock } from '../components/StateBlocks';

const Orders = () => {
  const { compatibleAccessories, liveAuctionCars, accessoryOrders } = useAuctions();
  const [activeTab, setActiveTab] = React.useState('All');
  const fallbackOrders = [
    { id: 'demo-accessory', type: 'Accessory', title: compatibleAccessories[0]?.name || 'Accessory order', amount: compatibleAccessories[0]?.price || 28500, status: 'Awaiting seller confirmation', next: 'Confirm fitment and pickup/delivery.', items: [] },
    { id: 'demo-auction', type: 'Auction checkout', title: liveAuctionCars[0]?.name || 'Auction vehicle', amount: liveAuctionCars[0]?.highBid || 0, status: 'Payment pending', next: 'Start checkout after winning bidder confirmation.', items: [] },
    { id: 'demo-inspection', type: 'Inspection', title: 'Pre-purchase inspection booking', amount: 12000, status: 'Scheduling', next: 'Choose inspection slot.', items: [] },
  ];
  const orders = accessoryOrders?.length ? [...accessoryOrders, ...fallbackOrders.slice(1)] : fallbackOrders;
  const visibleOrders = activeTab === 'All' ? orders : orders.filter((order) => order.type === activeTab);

  return (
    <main className="bg-slate-50 min-h-screen py-10">
      <section className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-blue-600 font-black text-xs uppercase tracking-[0.3em]">My orders</p>
            <h1 className="text-4xl font-black text-slate-900 mt-2">Purchases, inspections, and checkout status.</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/accessory-cart" className="bg-white border border-slate-200 text-slate-800 rounded-lg px-5 py-3 font-bold">Accessory Cart</Link>
            <Link to="/accessories" className="bg-slate-900 text-white rounded-lg px-5 py-3 font-bold">Shop Accessories</Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {['All', 'Accessory', 'Auction checkout', 'Inspection'].map((tab) => (
            <button key={tab} aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 rounded-lg font-black text-sm min-h-11 ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {visibleOrders.length ? visibleOrders.map((order) => (
            <article key={order.id} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-4 items-center">
              <div>
                <p className="text-xs text-slate-400 font-black uppercase">{order.type}</p>
                <h2 className="text-xl font-black text-slate-900 mt-1">{order.title}</h2>
                <p className="text-sm text-slate-500 mt-2">{order.next}</p>
                {order.items?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {order.items.map((item) => (
                      <div key={`${order.id}-${item.accessoryId}`} className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm">
                        <p className="font-black text-slate-800">{item.quantity} x {item.name}</p>
                        <p className="text-slate-500">{item.seller} - {item.city} - {item.fitsGarage || item.fitmentType === 'Universal' ? 'Fitment OK' : 'Fitment review'}</p>
                        {item.fulfillment && (
                          <p className="text-xs font-black text-blue-700 mt-1">
                            {item.fulfillment}{item.installRequired ? ' - installation required' : ''}{item.courierAllowed === false ? ' - pickup/local handling' : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-black uppercase">Amount</p>
                <p className="font-black text-slate-900">{formatPkr(order.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-black uppercase">Status</p>
                <p className="font-black text-blue-700">{order.status}</p>
              </div>
              <div className="md:col-span-3 bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-black uppercase text-slate-400 mb-2">Order timeline</p>
                <div className="grid grid-cols-4 gap-2 text-xs font-black text-center">
                  {(order.timeline || [
                    { label: 'Created', status: 'done' },
                    { label: 'Confirmed', status: 'active' },
                    { label: 'Payment', status: 'pending' },
                    { label: 'Closed', status: 'pending' },
                  ]).map((step) => (
                    <div key={step.label} className={step.status === 'done' ? 'text-green-700' : step.status === 'active' ? 'text-blue-700' : 'text-slate-400'}>{step.label}</div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">Need Help opens a support/dispute path so users are not stranded when payment, pickup, delivery, fitment, or inspection fails.</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button className="border border-blue-200 text-blue-700 rounded-lg py-3 font-bold">View Details</button>
                  <button className="border border-red-200 text-red-700 rounded-lg py-3 font-bold">Need Help</button>
                </div>
              </div>
            </article>
          )) : (
            <EmptyBlock
              title="No orders in this view"
              text="Try another order type or start from accessories, auctions, or inspections."
              action={<Link to="/marketplace" className="inline-block bg-slate-900 text-white rounded-lg px-4 py-2 font-black">Browse Marketplace</Link>}
            />
          )}
        </div>
      </section>
    </main>
  );
};

export default Orders;
