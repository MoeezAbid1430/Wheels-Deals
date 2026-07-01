import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const SellerDashboard = () => {
  const { submissions, accessories, liveAuctionCars, accessoryOrders, updateAccessoryOrderStatus, scheduleAccessoryOrder } = useAuctions();
  const [activeTab, setActiveTab] = useState('Submissions');
  const [message, setMessage] = useState('');
  const sellerAuctions = liveAuctionCars.slice(0, 4);
  const accessoryInventory = accessories.slice(0, 5);
  const draftItems = [
    { id: 1, type: 'Auction draft', title: '2020 Toyota Corolla Altis', completeness: 68, next: 'Add title document and reserve guidance' },
    { id: 2, type: 'Accessory draft', title: 'Universal Android Head Unit', completeness: 52, next: 'Add fitment and warranty details' },
  ];

  const counts = {
    total: submissions.length,
    pending: submissions.filter((item) => item.status === 'Pending Review').length,
    approved: submissions.filter((item) => item.status === 'Approved').length,
    rejected: submissions.filter((item) => item.status === 'Rejected').length,
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-green-600 font-black text-xs uppercase tracking-[0.3em]">Seller cockpit</p>
            <h1 className="text-4xl font-black text-slate-900 mt-2">My listings</h1>
            <p className="text-slate-500 mt-2">Track drafts, submissions, auction performance, accessory inventory, and payouts.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/sell/listing" className="bg-slate-900 text-white px-5 py-3 rounded-lg font-bold text-center">Submit Car</Link>
            <Link to="/sell/auction" className="bg-red-600 text-white px-5 py-3 rounded-lg font-bold text-center">Launch Auction</Link>
            <Link to="/sell/accessory" className="bg-emerald-600 text-white px-5 py-3 rounded-lg font-bold text-center">Sell Accessory</Link>
            <Link to="/seller/media" className="bg-blue-600 text-white px-5 py-3 rounded-lg font-bold text-center">Media Center</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Stat label="Total" value={counts.total} />
          <Stat label="Pending Review" value={counts.pending} />
          <Stat label="Approved" value={counts.approved} />
          <Stat label="Rejected" value={counts.rejected} />
          <Stat label="Drafts" value={draftItems.length} />
          <Stat label="Orders" value={accessoryOrders.length} />
        </div>

        {message && <div className="bg-white border border-slate-200 rounded-lg p-4 font-bold text-slate-700 mb-5">{message}</div>}

        <div className="flex flex-wrap gap-2 mb-6">
          {['Submissions', 'Orders', 'Drafts', 'Analytics', 'Auctions', 'Accessories', 'Payouts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-black text-sm ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Submissions' && (
          submissions.length === 0 ? <EmptyState /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {submissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} />)}
            </div>
          )
        )}

        {activeTab === 'Orders' && (
          <SellerOrdersPanel
            orders={accessoryOrders}
            onStatus={(orderId, status, note) => {
              const result = updateAccessoryOrderStatus(orderId, status, note);
              setMessage(result.message);
            }}
            onSchedule={(orderId, slot, note) => {
              const result = scheduleAccessoryOrder(orderId, slot, note);
              setMessage(result.message);
            }}
          />
        )}
        {activeTab === 'Drafts' && <DraftsPanel drafts={draftItems} />}
        {activeTab === 'Analytics' && <AnalyticsPanel />}
        {activeTab === 'Auctions' && <AuctionPerformance auctions={sellerAuctions} />}
        {activeTab === 'Accessories' && <AccessoryInventory items={accessoryInventory} />}
        {activeTab === 'Payouts' && <PayoutPanel />}
      </section>
    </main>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5">
    <p className="text-xs text-slate-400 uppercase tracking-wider font-black">{label}</p>
    <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
  </div>
);

const EmptyState = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
    <h2 className="text-2xl font-black text-slate-900">No submissions yet.</h2>
    <p className="text-slate-500 mt-2">Submit a car and it will appear here with quality score and review status.</p>
    <Link to="/sell/listing" className="inline-block mt-5 bg-green-500 text-slate-900 px-5 py-3 rounded-lg font-bold">
      Start Submission
    </Link>
  </div>
);

const DraftsPanel = ({ drafts }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {drafts.map((draft) => (
      <article key={draft.id} className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-xs text-slate-400 font-black uppercase">{draft.type}</p>
        <h2 className="text-xl font-black text-slate-900 mt-1">{draft.title}</h2>
        <div className="mt-4 bg-slate-100 rounded-full h-2 overflow-hidden">
          <div className="bg-green-500 h-full" style={{ width: `${draft.completeness}%` }} />
        </div>
        <p className="text-sm text-slate-500 mt-2">{draft.completeness}% complete - {draft.next}</p>
      </article>
    ))}
  </div>
);

const SellerOrdersPanel = ({ orders, onStatus, onSchedule }) => {
  const liveOrders = orders.length ? orders : demoSellerOrders;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="New" value={liveOrders.filter((order) => /Awaiting|Fitment/.test(order.status)).length} />
        <Stat label="Scheduled" value={liveOrders.filter((order) => /scheduled/i.test(order.status)).length} />
        <Stat label="Ready" value={liveOrders.filter((order) => /Ready/.test(order.status)).length} />
        <Stat label="Disputed" value={liveOrders.filter((order) => /Disputed/.test(order.status)).length} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {liveOrders.map((order) => (
          <article key={order.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400 font-black uppercase">{order.deliveryMethod || 'Accessory order'}</p>
                <h2 className="text-xl font-black text-slate-900 mt-1">{order.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{order.address || 'Pickup address pending'}</p>
              </div>
              <span className="bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-xs font-black">{order.status}</span>
            </div>
            <div className="mt-4 space-y-2">
              {(order.items || []).map((item) => (
                <div key={`${order.id}-${item.accessoryId}`} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <p className="font-black text-sm text-slate-900">{item.quantity} x {item.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.fulfillment || 'Fulfillment pending'}{item.installRequired ? ' - install needed' : ''}{item.courierAllowed === false ? ' - pickup/local handling' : ''}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
              <button onClick={() => onStatus(order.id, 'Seller confirmed', 'Stock confirmed. Waiting for payment or schedule.')} className="bg-emerald-600 text-white rounded-lg py-3 font-black text-sm">Confirm</button>
              <button onClick={() => onSchedule(order.id, 'Tomorrow 5:00 PM', 'Seller proposed pickup/install slot.')} className="bg-blue-600 text-white rounded-lg py-3 font-black text-sm">Schedule</button>
              <button onClick={() => onStatus(order.id, 'Ready for pickup/install', 'Item is ready for handoff.')} className="border border-slate-300 rounded-lg py-3 font-black text-sm">Ready</button>
              <button onClick={() => onStatus(order.id, 'Disputed', 'Seller escalated this order for admin review.')} className="border border-red-200 text-red-700 rounded-lg py-3 font-black text-sm">Dispute</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

const demoSellerOrders = [
  {
    id: 'demo-seller-order',
    title: 'Demo accessory order',
    status: 'Awaiting seller confirmation',
    deliveryMethod: 'Pickup / installation',
    address: 'Lahore pickup area pending',
    items: [
      { accessoryId: 1, quantity: 1, name: 'Android screen installation package', fulfillment: 'Install required', installRequired: true, courierAllowed: false },
    ],
  },
];

const AnalyticsPanel = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <AnalyticsCard title="Lead Funnel" rows={[['Views', '3,420'], ['Saves', '284'], ['Messages', '38'], ['Inspections', '7']]} />
    <AnalyticsCard title="Auction Momentum" rows={[['Bid velocity', '+18%'], ['Watcher growth', '+31%'], ['Reserve confidence', 'High'], ['Close risk', 'Low']]} />
    <AnalyticsCard title="AI Improvements" rows={[['Photo quality', 'Add interior closeups'], ['Price signal', 'Within market'], ['Trust gap', 'Upload tax token'], ['Description', 'Strong']]} />
  </div>
);

const AnalyticsCard = ({ title, rows }) => (
  <section className="bg-white border border-slate-200 rounded-xl p-5">
    <h2 className="font-black text-slate-900 mb-4">{title}</h2>
    <div className="space-y-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-sm font-bold text-slate-500">{label}</span>
          <span className="text-sm font-black text-slate-900">{value}</span>
        </div>
      ))}
    </div>
  </section>
);

const AuctionPerformance = ({ auctions }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {auctions.map((car) => (
      <Link key={car.id} to={`/listing/${car.id}`} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-red-500">
        <p className="text-xs text-red-600 font-black uppercase">{car.status}</p>
        <h2 className="text-xl font-black text-slate-900 mt-1">{car.name}</h2>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Mini label="High Bid" value={formatPkr(car.highBid)} />
          <Mini label="Bids" value={car.bidsCount} />
          <Mini label="Heat" value={`${car.auctionHeat}%`} />
        </div>
      </Link>
    ))}
  </div>
);

const AccessoryInventory = ({ items }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {items.map((item) => (
      <Link key={item.id} to={`/accessories/${item.id}`} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-500">
        <p className="text-xs text-emerald-600 font-black uppercase">{item.category}</p>
        <h2 className="text-xl font-black text-slate-900 mt-1">{item.name}</h2>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Mini label="Price" value={formatPkr(item.price)} />
          <Mini label="Stock" value={item.stock} />
          <Mini label="Fitment" value={item.fitmentType} />
        </div>
      </Link>
    ))}
  </div>
);

const PayoutPanel = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-6">
    <h2 className="text-xl font-black text-slate-900">Settlement tracker</h2>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
      <Stat label="Pending" value="PKR 0" />
      <Stat label="Ready" value="PKR 0" />
      <Stat label="Disputed" value="0" />
      <Stat label="Last payout" value="None" />
    </div>
    <p className="text-sm text-slate-500 mt-4">Real payouts will connect after escrow/payment provider integration.</p>
  </div>
);

const SubmissionCard = ({ submission }) => (
  <article className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs text-slate-400 font-black uppercase tracking-wider">{submission.listingType}</p>
        <h2 className="text-xl font-black text-slate-900 mt-1">
          {submission.year} {submission.make} {submission.model}
        </h2>
        <p className="text-sm text-slate-500 mt-1">Submitted {submission.submittedAt}</p>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-black ${statusClass(submission.status)}`}>
        {submission.status}
      </span>
    </div>

    <div className="grid grid-cols-3 gap-3 my-5">
      <Mini label="Quality" value={`${submission.qualityScore}/100`} />
      <Mini label="Seller" value={submission.sellerType} />
      <Mini label="Title" value={submission.titleStatus || 'Pending'} />
    </div>

    <div className="bg-slate-50 rounded-lg p-4">
      <p className="text-xs text-slate-400 font-black uppercase tracking-wider mb-2">AI review notes</p>
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
        {submission.aiNotes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </div>
  </article>
);

const Mini = ({ label, value }) => (
  <div className="bg-slate-50 rounded-lg p-3">
    <p className="text-[10px] text-slate-400 font-black uppercase">{label}</p>
    <p className="text-sm font-black text-slate-900 truncate">{value}</p>
  </div>
);

const statusClass = (status) => {
  if (status === 'Approved') return 'bg-green-100 text-green-700';
  if (status === 'Rejected') return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700';
};

export default SellerDashboard;
