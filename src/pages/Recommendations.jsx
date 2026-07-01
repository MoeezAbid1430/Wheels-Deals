import React from 'react';
import { Link } from 'react-router-dom';
import { formatPkr, getDisplayPrice } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const Recommendations = () => {
  const {
    recommendedCars,
    watchedCars,
    recentlyViewedCars,
    savedSearches,
    removeSavedSearch,
    toggleWatchlist,
    watchlist,
    api,
    recommenderDiagnostics,
    garageAccessorySuggestions,
  } = useAuctions();
  const [aiSuite, setAiSuite] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    api.ai?.features?.()
      .then((result) => {
        if (mounted) setAiSuite(result.data || result);
      })
      .catch(() => {
        if (mounted) setAiSuite(null);
      });
    return () => {
      mounted = false;
    };
  }, [api]);

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <p className="text-green-400 font-black text-xs uppercase tracking-[0.3em]">Hybrid AI recommender</p>
          <h1 className="text-4xl md:text-5xl font-black mt-2">Your car discovery feed</h1>
          <p className="text-slate-300 mt-4 max-w-3xl">
            This ranks cars with content-based vehicle similarity and collaborative behavior signals from views, watchlists, bids, saved searches, auction urgency, deal score, and listing quality.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <HeroStat label="Recommendations" value={recommendedCars.length} />
            <HeroStat label="Watching" value={watchedCars.length} />
            <HeroStat label="Viewed" value={recentlyViewedCars.length} />
            <HeroStat label="Saved Searches" value={savedSearches.length} />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-8">
          <FeedSection title="Recommended for you" empty="Start watching or viewing cars to personalize this feed.">
            {recommendedCars.map((car) => (
              <RecommendationCard
                key={car.id}
                car={car}
                watched={watchlist.includes(car.id)}
                onWatch={() => toggleWatchlist(car.id)}
              />
            ))}
          </FeedSection>

          <FeedSection title="Suggested accessories for your Garage" empty="Add a vehicle in My Garage to personalize accessory suggestions.">
            {garageAccessorySuggestions.slice(0, 6).map((suggestion) => (
              <AccessorySuggestion key={suggestion.accessory.id} suggestion={suggestion} />
            ))}
          </FeedSection>

          <section>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-600 tracking-widest">Zero-cost hybrid AI suite</p>
                <h2 className="text-2xl font-black text-slate-900">Content plus collaborative filtering</h2>
              </div>
              <span className="self-start md:self-auto rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-black">
                {aiSuite?.paidApiRequired === false ? 'No API bill' : 'Local mode'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(aiSuite?.features || fallbackAiFeatures).slice(0, 12).map((feature) => (
                <div key={feature.id || feature.name} className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-black uppercase text-slate-400">{feature.status || 'implemented'}</p>
                  <h3 className="font-black text-slate-900 mt-1">{feature.name}</h3>
                  {feature.detail && <p className="text-sm text-slate-500 mt-2">{feature.detail}</p>}
                </div>
              ))}
            </div>
          </section>

          <FeedSection title="Recently viewed" empty="Open a few listings and they will appear here.">
            {recentlyViewedCars.map((car) => (
              <CompactCar key={car.id} car={car} />
            ))}
          </FeedSection>
        </div>

        <aside className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-black text-slate-900 mb-4">Watchlist</h2>
            {watchedCars.length > 0 ? (
              <div className="space-y-3">
                {watchedCars.map((car) => (
                  <CompactCar key={car.id} car={car} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No watched cars yet. Use Watch on marketplace cards or detail pages.</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-black text-slate-900 mb-4">Saved searches</h2>
            {savedSearches.length > 0 ? (
              <div className="space-y-3">
                {savedSearches.map((search) => (
                  <div key={search.id} className="border border-slate-100 rounded-lg p-3">
                    <p className="font-black text-sm text-slate-900">
                      {search.query || 'Any keyword'} - {search.city} - {search.make}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search.type} - {search.bodyStyle} - {search.maxBudget}
                    </p>
                    <button
                      onClick={() => removeSavedSearch(search.id)}
                      className="text-xs text-red-600 font-bold mt-2 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No saved searches yet. Save one from the marketplace filters.</p>
            )}
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-5">
            <h2 className="font-black mb-2">Local recommender index</h2>
            <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5">
              <li>{recommenderDiagnostics.indexedVehicles} vehicles indexed</li>
              <li>{recommenderDiagnostics.indexedAccessories} accessories indexed</li>
              <li>{Math.round(recommenderDiagnostics.weights.content * 100)}% content-based score</li>
              <li>{Math.round(recommenderDiagnostics.weights.collaborative * 100)}% collaborative score</li>
              <li>{recommenderDiagnostics.signals?.watchlist || 0} watchlist signals</li>
              <li>{recommenderDiagnostics.signals?.savedSearches || 0} saved-search signals</li>
              <li>No paid AI API required</li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-black text-slate-900 mb-3">Search intelligence</h2>
            <div className="flex flex-wrap gap-2">
              {(recommenderDiagnostics.capabilities || []).map((capability) => (
                <span key={capability} className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-black">
                  {capability.replaceAll('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
};

const HeroStat = ({ label, value }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
    <p className="text-slate-500 text-xs uppercase tracking-wider font-black">{label}</p>
    <p className="text-2xl font-black mt-1">{value}</p>
  </div>
);

const fallbackAiFeatures = [
  'Smart Vehicle Recommender',
  'Content-Based Matching',
  'Collaborative Filtering',
  'Auction Win Probability',
  'Best Time To Bid Assistant',
  'Fair Price Estimator',
  'Good Deal / Overpriced Badges',
  'Listing Quality AI',
  'Fraud / Scam Risk Score',
  'Natural Language Search',
  'Similar Cars',
  'Auction Strategy Assistant',
].map((name, index) => ({ id: `fallback-ai-${index}`, name, status: 'implemented' }));

const FeedSection = ({ title, empty, children }) => {
  const items = React.Children.toArray(children);
  return (
    <section>
      <h2 className="text-2xl font-black text-slate-900 mb-4">{title}</h2>
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{items}</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">{empty}</div>
      )}
    </section>
  );
};

const RecommendationCard = ({ car, watched, onWatch }) => (
  <article className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
    <Link to={`/listing/${car.id}`} className="block">
      <div className="relative h-44 bg-slate-100">
        <img src={car.images[0]} alt={car.name} className="w-full h-full object-cover" />
        <span className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">
          MATCH {car.matchScore}
        </span>
        {car.listingType === 'Auction' && (
          <span className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black">
            {car.timeLeft}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-black text-slate-900 truncate">{car.name}</h3>
        <p className="text-sm text-slate-500 mt-1">{car.city} - {car.bodyStyle} - {car.mileage}</p>
        <p className="text-xl font-black text-red-600 mt-3">{getDisplayPrice(car)}</p>
        {car.aiReasons?.length > 0 && (
          <p className="text-xs font-bold text-blue-700 mt-2">{car.aiReasons.join(' - ')}</p>
        )}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Mini label="Deal" value={car.dealScore} />
          <Mini label="Content" value={car.contentScore || '-'} />
          <Mini label="Collab" value={car.collaborativeScore || '-'} />
        </div>
      </div>
    </Link>
    <div className="px-4 pb-4">
      <button
        onClick={onWatch}
        className={`w-full py-2 rounded-lg font-bold text-sm border transition-colors ${
          watched ? 'bg-red-600 text-white border-red-600' : 'border-slate-200 text-slate-700 hover:border-red-500'
        }`}
      >
        {watched ? 'Watching' : 'Watch'}
      </button>
    </div>
  </article>
);

const CompactCar = ({ car }) => (
  <Link to={`/listing/${car.id}`} className="block bg-white border border-slate-100 rounded-lg p-3 hover:border-blue-400">
    <p className="font-black text-sm text-slate-900 truncate">{car.name}</p>
    <p className="text-xs text-slate-500 mt-1">{car.city} - {car.listingType}</p>
    <p className="text-sm font-black text-red-600 mt-1">
      {car.listingType === 'Auction' ? formatPkr(car.highBid) : formatPkr(car.buyNowPrice)}
    </p>
  </Link>
);

const AccessorySuggestion = ({ suggestion }) => (
  <Link to={`/accessories/${suggestion.accessory.id}`} className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-500">
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-black uppercase text-emerald-600">{suggestion.accessory.category}</p>
      <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 rounded-full px-2 py-1">{Math.round(suggestion.score)} match</span>
    </div>
    <h3 className="font-black text-slate-900 mt-1">{suggestion.accessory.name}</h3>
    <p className="text-sm text-slate-500 mt-1">For {suggestion.vehicle.year} {suggestion.vehicle.make} {suggestion.vehicle.model}</p>
    <div className="flex flex-wrap gap-1 mt-3">
      {suggestion.reasons.map((reason) => (
        <span key={reason} className="text-[10px] font-black rounded-full bg-slate-100 text-slate-600 px-2 py-1">{reason}</span>
      ))}
    </div>
    <p className="text-lg font-black text-emerald-700 mt-3">{formatPkr(suggestion.accessory.price)}</p>
  </Link>
);

const Mini = ({ label, value }) => (
  <div className="bg-slate-50 rounded-lg p-2">
    <p className="text-[10px] uppercase text-slate-400 font-black">{label}</p>
    <p className="text-xs font-black text-slate-900 truncate">{value}</p>
  </div>
);

export default Recommendations;
