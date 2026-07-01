import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const ModelCommunity = () => {
  const { make = 'Toyota', model = 'Fortuner' } = useParams();
  const { visibleCars, posts, compareIds, toggleCompare } = useAuctions();
  const [activeTab, setActiveTab] = useState('Discussions');
  const [pollVote, setPollVote] = useState('');
  const [draftQuestion, setDraftQuestion] = useState('');
  const modelCars = visibleCars.filter((car) => car.make.toLowerCase() === make.toLowerCase() || car.model.toLowerCase() === model.toLowerCase());
  const relatedPosts = posts.filter((post) => modelCars.some((car) => car.id === post.listingId));
  const pollResults = [
    { label: 'Suspension', percent: 34 },
    { label: 'Paint touchups', percent: 18 },
    { label: 'Service history', percent: 39 },
    { label: 'Token tax', percent: 9 },
  ];

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <p className="text-blue-400 font-black text-xs uppercase tracking-[0.3em]">Model community</p>
          <h1 className="text-4xl md:text-5xl font-black mt-2">{make} {model} Owners & Buyers</h1>
          <p className="text-slate-300 mt-4 max-w-3xl">Price checks, common issues, accessories, maintenance, and auction advice for this model.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['Discussions', 'Comparison', 'Listings'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg font-black ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Discussions' && (
            <>
              <h2 className="text-2xl font-black text-slate-900">Related discussions</h2>
              {(relatedPosts.length ? relatedPosts : posts.slice(0, 3)).map((post) => (
                <Link key={post.id} to={`/community/post/${post.id}`} className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-500">
                  <p className="text-xs text-blue-600 font-black uppercase">{post.flair}</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1">{post.title}</h3>
                  <p className="text-sm text-slate-500 mt-2">{post.votes} votes - {post.comments.length} comments</p>
                </Link>
              ))}
            </>
          )}

          {activeTab === 'Comparison' && (
            <section className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Model comparison</h2>
                  <p className="text-sm text-slate-500">Compare active {make} {model} listings by price, mileage, CC, inspection, trust, and auction heat.</p>
                </div>
                <Link to="/compare" className="bg-slate-900 text-white px-4 py-2 rounded-lg font-black">Open Compare</Link>
              </div>
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Price/Bid</th>
                    <th className="p-3">Mileage</th>
                    <th className="p-3">Engine</th>
                    <th className="p-3">Inspection</th>
                    <th className="p-3">Trust</th>
                    <th className="p-3">Compare</th>
                  </tr>
                </thead>
                <tbody>
                  {modelCars.map((car) => (
                    <tr key={car.id} className="border-b border-slate-100">
                      <td className="p-3 font-black text-slate-900">{car.name}</td>
                      <td className="p-3 font-bold text-red-600">PKR {(car.highBid || car.buyNowPrice || 0).toLocaleString()}</td>
                      <td className="p-3">{car.mileage}</td>
                      <td className="p-3">{car.engine}</td>
                      <td className="p-3">{car.inspectionScore}/100</td>
                      <td className="p-3">{car.trustScore}/100</td>
                      <td className="p-3">
                        <button onClick={() => toggleCompare(car.id)} className={`px-3 py-2 rounded-lg font-black text-xs ${compareIds.includes(car.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                          {compareIds.includes(car.id) ? 'Selected' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {activeTab === 'Listings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modelCars.map((car) => (
                <Link key={car.id} to={`/listing/${car.id}`} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-red-500">
                  <p className="text-xs font-black uppercase text-red-600">{car.listingType}</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1">{car.name}</h3>
                  <p className="text-sm text-slate-500 mt-2">{car.city} - {car.mileage} - {car.engine}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-black text-slate-900">Community poll</h2>
            <p className="text-sm text-slate-500 mt-1">What should buyers check first?</p>
            {pollResults.map((option) => (
              <button key={option.label} onClick={() => setPollVote(option)} className={`w-full text-left mt-3 border rounded-lg p-3 font-bold ${pollVote.label === option.label ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700'}`}>
                <span className="flex justify-between gap-3">
                  <span>{option.label}</span>
                  <span>{option.percent}%</span>
                </span>
                <span className="block h-2 rounded-full bg-slate-100 mt-2 overflow-hidden">
                  <span className="block h-full bg-blue-600" style={{ width: `${option.percent}%` }} />
                </span>
              </button>
            ))}
            {pollVote && <p className="text-sm text-blue-700 font-bold mt-3">Vote saved: {pollVote.label}</p>}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-black text-slate-900">Start a model poll</h2>
            <p className="text-sm text-slate-500 mt-1">Quick polls help buyers compare weak points before bidding.</p>
            <input value={draftQuestion} onChange={(event) => setDraftQuestion(event.target.value)} className="mt-3 w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-blue-600" placeholder="Ask about mileage, variants, repairs..." />
            <button onClick={() => setDraftQuestion('')} className="mt-3 w-full bg-slate-900 text-white rounded-lg p-3 font-black">Save Poll Draft</button>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-black text-slate-900">Active listings</h2>
            <div className="space-y-3 mt-3">
              {modelCars.slice(0, 4).map((car) => (
                <Link key={car.id} to={`/listing/${car.id}`} className="block border border-slate-100 rounded-lg p-3 hover:border-red-400">
                  <p className="font-black text-slate-900">{car.name}</p>
                  <p className="text-xs text-slate-500">{car.city} - {car.listingType}</p>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
};

export default ModelCommunity;
