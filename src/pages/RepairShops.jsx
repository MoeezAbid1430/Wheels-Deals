import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink, MessageSquare, Send, Star, Video } from 'lucide-react';
import { pakistanCities } from '../data/taxonomy';
import { useAuctions } from '../context/AuctionContext';
import { hasGoogleMapsApiKey, mapsService, repairShopCategories } from '../services';

const categoryKeywords = {
  workshops: ['inspection', 'diagnostics', 'suspension', 'engine', 'electrical', 'mechanic'],
  'oil-change': ['oil change'],
  'car-wash': ['car wash', 'detailing', 'cleaning', 'ceramic'],
  dealerships: ['dealership', 'certified used cars', 'trade-in', 'financing'],
  'rent-a-car': ['rent a car', 'rental', 'chauffeur', 'self drive'],
  'sell-a-car': ['sell car', 'dealer', 'trade-in', 'consignment', 'used cars'],
  tyres: ['tyre', 'wheel', 'alignment'],
  inspection: ['inspection', 'diagnostics'],
  towing: ['towing', 'roadside'],
};

const RepairShops = () => {
  const { repairShopRankings } = useAuctions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cityFilter, setCityFilter] = useState('All');
  const [categoryId, setCategoryId] = useState(() => searchParams.get('category') || 'workshops');
  const [sortBy, setSortBy] = useState('distanceKm');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [apiResults, setApiResults] = useState([]);
  const [serverResults, setServerResults] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(repairShopRankings[0]?.id);
  const [locationStatus, setLocationStatus] = useState(hasGoogleMapsApiKey ? 'Google Maps API ready when a key is configured.' : 'Add REACT_APP_GOOGLE_MAPS_API_KEY to use live Google Places results.');
  const [isLoading, setIsLoading] = useState(false);
  const [trustData, setTrustData] = useState({ reviews: [], questions: [], videos: [] });
  const [reviewForm, setReviewForm] = useState({ rating: '5', title: '', body: '', serviceType: '', vehicle: '' });
  const [questionForm, setQuestionForm] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [socialDraft, setSocialDraft] = useState({ facebook: '', instagram: '', whatsapp: '', tiktok: '', youtube: '', website: '' });
  const [videoForm, setVideoForm] = useState({ title: '', serviceType: '', videoUrl: '', thumbnailUrl: '', description: '' });
  const [trustMessage, setTrustMessage] = useState('');

  useEffect(() => {
    const nextCategory = searchParams.get('category') || 'workshops';
    if (nextCategory !== categoryId) {
      setCategoryId(nextCategory);
      setApiResults([]);
    }
  }, [categoryId, searchParams]);

  const changeCategory = (nextCategory) => {
    setCategoryId(nextCategory);
    setApiResults([]);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('category', nextCategory);
      return next;
    });
  };

  const directoryResults = useMemo(() => {
    const keywords = categoryKeywords[categoryId] || [];
    const result = repairShopRankings
      .filter((shop) => cityFilter === 'All' || shop.city === cityFilter)
      .filter((shop) => !verifiedOnly || shop.verified)
      .filter((shop) => categoryId === 'workshops' || shop.specialties.some((specialty) => keywords.some((keyword) => specialty.toLowerCase().includes(keyword))))
      .sort((a, b) => compareShop(a, b, sortBy));
    return result.length ? result : repairShopRankings.filter((shop) => cityFilter === 'All' || shop.city === cityFilter).sort((a, b) => compareShop(a, b, sortBy));
  }, [repairShopRankings, cityFilter, categoryId, verifiedOnly, sortBy]);

  useEffect(() => {
    let cancelled = false;
    mapsService.listRepairShops({
      city: cityFilter,
      category: categoryId,
      verifiedOnly,
      sortBy,
    }).then((payload) => {
      if (cancelled) return;
      setServerResults(payload.shops || []);
      setLocationStatus(`Showing ${payload.source === 'verified_directory' ? 'backend verified directory' : payload.source} results.`);
    }).catch(() => {
      if (!cancelled) setServerResults([]);
    });
    return () => {
      cancelled = true;
    };
  }, [cityFilter, categoryId, verifiedOnly, sortBy]);

  const shops = apiResults.length ? apiResults : (serverResults.length ? serverResults : directoryResults);
  const selectedShop = shops.find((shop) => String(shop.id) === String(selectedShopId)) || shops[0];

  useEffect(() => {
    if (!selectedShop?.id) return;
    let cancelled = false;
    setSocialDraft({
      facebook: selectedShop.socialLinks?.facebook || '',
      instagram: selectedShop.socialLinks?.instagram || '',
      whatsapp: selectedShop.socialLinks?.whatsapp || '',
      tiktok: selectedShop.socialLinks?.tiktok || '',
      youtube: selectedShop.socialLinks?.youtube || '',
      website: selectedShop.socialLinks?.website || '',
    });
    Promise.all([
      mapsService.getRepairShopReviews(selectedShop.id).catch(() => ({ reviews: selectedShop.recentReviews || [] })),
      mapsService.getRepairShopQuestions(selectedShop.id).catch(() => ({ questions: selectedShop.recentQuestions || [] })),
      mapsService.getRepairShopVideos(selectedShop.id).catch(() => ({ videos: selectedShop.videos || [] })),
    ]).then(([reviews, questions, videos]) => {
      if (!cancelled) {
        setTrustData({
          reviews: reviews.reviews || [],
          questions: questions.questions || [],
          videos: videos.videos || [],
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedShop]);

  const updateSelectedShop = (nextShop) => {
    setServerResults((current) => current.map((shop) => String(shop.id) === String(nextShop.id) ? nextShop : shop));
    setApiResults((current) => current.map((shop) => String(shop.id) === String(nextShop.id) ? nextShop : shop));
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!selectedShop) return;
    const payload = { ...reviewForm, rating: Number(reviewForm.rating), serviceType: reviewForm.serviceType || selectedShop.category };
    try {
      const result = await mapsService.createRepairShopReview(selectedShop.id, payload);
      setTrustData((current) => ({ ...current, reviews: [result.review, ...current.reviews] }));
      setTrustMessage('Review saved.');
    } catch {
      setTrustData((current) => ({ ...current, reviews: [{ id: Date.now(), userName: 'Preview user', createdAt: 'Just now', helpfulCount: 0, ...payload }, ...current.reviews] }));
      setTrustMessage('Preview review added. Sign in to persist it.');
    }
    setReviewForm({ rating: '5', title: '', body: '', serviceType: '', vehicle: '' });
  };

  const submitQuestion = async (event) => {
    event.preventDefault();
    if (!selectedShop || questionForm.trim().length < 8) return;
    try {
      const result = await mapsService.askRepairShopQuestion(selectedShop.id, { question: questionForm });
      setTrustData((current) => ({ ...current, questions: [result.question, ...current.questions] }));
      setTrustMessage('Question sent.');
    } catch {
      setTrustData((current) => ({ ...current, questions: [{ id: Date.now(), userName: 'Preview user', question: questionForm, status: 'open', createdAt: 'Just now' }, ...current.questions] }));
      setTrustMessage('Preview question added. Sign in to persist it.');
    }
    setQuestionForm('');
  };

  const submitAnswer = async (questionId) => {
    if (!selectedShop || !answerDrafts[questionId]?.trim()) return;
    const answer = answerDrafts[questionId].trim();
    try {
      const result = await mapsService.answerRepairShopQuestion(selectedShop.id, questionId, { answer });
      setTrustData((current) => ({ ...current, questions: current.questions.map((question) => String(question.id) === String(questionId) ? result.question : question) }));
    } catch {
      setTrustData((current) => ({ ...current, questions: current.questions.map((question) => String(question.id) === String(questionId) ? { ...question, answer, answeredByName: selectedShop.name, answeredAt: 'Just now', status: 'answered' } : question) }));
    }
    setAnswerDrafts((current) => ({ ...current, [questionId]: '' }));
  };

  const submitSocials = async (event) => {
    event.preventDefault();
    if (!selectedShop) return;
    try {
      const result = await mapsService.updateRepairShopSocials(selectedShop.id, socialDraft);
      updateSelectedShop(result.shop);
      setTrustMessage('Social links saved.');
    } catch {
      updateSelectedShop({ ...selectedShop, socialLinks: cleanLinks(socialDraft) });
      setTrustMessage('Preview social links updated. Sign in to persist them.');
    }
  };

  const submitVideo = async (event) => {
    event.preventDefault();
    if (!selectedShop || (!videoForm.videoUrl && !videoForm.thumbnailUrl)) return;
    const payload = { ...videoForm, serviceType: videoForm.serviceType || selectedShop.category };
    try {
      const result = await mapsService.addRepairShopVideo(selectedShop.id, payload);
      setTrustData((current) => ({ ...current, videos: [result.video, ...current.videos] }));
      setTrustMessage('Service video added.');
    } catch {
      setTrustData((current) => ({ ...current, videos: [{ id: Date.now(), providerId: selectedShop.id, createdAt: 'Just now', ...payload }, ...current.videos] }));
      setTrustMessage('Preview service video added. Sign in to persist it.');
    }
    setVideoForm({ title: '', serviceType: '', videoUrl: '', thumbnailUrl: '', description: '' });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Location services are not available in this browser.');
      return;
    }

    setIsLoading(true);
    setLocationStatus('Finding your location and searching nearby automotive services...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const results = await mapsService.findNearbyAutomotivePlaces({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            categoryId,
          });
          setApiResults(results);
          setSelectedShopId(results[0]?.id);
          setCityFilter('All');
          setLocationStatus(`Showing live Google Places results for ${mapsService.getCategory(categoryId).label}.`);
        } catch (error) {
          setLocationStatus(`${error.message}. Showing our verified local directory instead.`);
        } finally {
          setIsLoading(false);
        }
      },
      () => {
        setIsLoading(false);
        setLocationStatus('Location permission was not granted. Showing city-filtered local directory.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const clearApiResults = () => {
    setApiResults([]);
    setSelectedShopId(directoryResults[0]?.id);
    setLocationStatus(hasGoogleMapsApiKey ? 'Showing verified local directory. Use location for live Google Places results.' : 'Showing verified local directory. Add a Google Maps API key for live nearby results.');
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-end">
          <div>
            <p className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em]">Local community support</p>
            <h1 className="text-4xl md:text-5xl font-black mt-2">Repair shops near me, powered by Maps and community trust.</h1>
            <p className="text-slate-300 mt-4 max-w-3xl">Filter mechanics, oil change shops, car washes, dealerships, tyre shops, inspections, and towing. Production can pull live Google Places results while our verified local directory keeps the page useful in development.</p>
          </div>
          <div className="bg-white/10 border border-white/10 rounded-xl p-4">
            <p className="text-xs font-black uppercase text-emerald-300">API status</p>
            <p className="text-sm text-slate-200 mt-2">{locationStatus}</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <aside className="bg-white border border-slate-200 rounded-xl p-5 h-fit">
          <h2 className="text-xl font-black text-slate-900">Find local help</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {repairShopCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => changeCategory(category.id)}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-black ${categoryId === category.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300'}`}
              >
                {category.label}
              </button>
            ))}
          </div>
          <div className="space-y-4 mt-4">
            <Field label="Service type">
              <select value={categoryId} onChange={(event) => changeCategory(event.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-3 font-bold bg-white">
                {repairShopCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
            </Field>
            <Field label="City">
              <select value={cityFilter} onChange={(event) => { setCityFilter(event.target.value); setApiResults([]); }} className="w-full border border-slate-200 rounded-lg px-3 py-3 font-bold bg-white">
                {['All', ...pakistanCities.slice(0, 18)].map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </Field>
            <Field label="Sort">
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-3 font-bold bg-white">
                <option value="distanceKm">Nearest</option>
                <option value="rating">Highest rating</option>
                <option value="communityVotes">Community votes</option>
                <option value="completedJobs">Most jobs</option>
                <option value="reviews">Most reviews</option>
              </select>
            </Field>
            <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} className="h-4 w-4" />
              <span className="font-black text-sm text-slate-700">Verified shops only</span>
            </label>
            <button onClick={useCurrentLocation} disabled={isLoading} className="w-full bg-emerald-600 text-white rounded-lg px-4 py-3 font-black hover:bg-emerald-700 disabled:opacity-60">
              {isLoading ? 'Searching Maps...' : 'Use My Location'}
            </button>
            <a href={mapsService.getSearchUrl({ city: cityFilter === 'All' ? '' : cityFilter, categoryId })} target="_blank" rel="noreferrer" className="block w-full text-center border border-slate-200 rounded-lg px-4 py-3 font-black text-slate-800 hover:bg-slate-50">
              Open Google Maps
            </a>
            {apiResults.length > 0 && (
              <button onClick={clearApiResults} className="w-full text-sm font-black text-blue-600 hover:underline">Back to verified directory</button>
            )}
          </div>
        </aside>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">
          <section className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-600">{mapsService.getCategory(categoryId).label}</p>
                <h2 className="text-2xl font-black text-slate-900">{shops.length} local results</h2>
                <p className="text-slate-500">{apiResults.length ? 'Live Google Places results' : 'Verified community directory'}</p>
              </div>
              <Link to="/rankings" className="bg-slate-900 text-white rounded-lg px-4 py-3 font-black text-center">View rankings</Link>
            </div>

            {shops.map((shop) => (
              <button key={shop.id} onClick={() => setSelectedShopId(shop.id)} className={`w-full text-left bg-white border rounded-xl p-5 hover:border-emerald-400 ${String(selectedShop?.id) === String(shop.id) ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900">{shop.name}</h3>
                      {shop.verified && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full">VERIFIED</span>}
                      {shop.openNow && <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-full">OPEN NOW</span>}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{shop.area}, {shop.city} - {shop.address}</p>
                  </div>
                  <p className="text-sm font-black text-slate-700">{shop.distanceKm ? `${shop.distanceKm} km` : 'Nearby'}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                  <Metric label="Rating" value={shop.rating ? `${shop.rating}/5` : 'Maps'} />
                  <Metric label="Reviews" value={shop.reviews || 'Live'} />
                  <Metric label="Jobs" value={shop.completedJobs || 'API'} />
                  <Metric label="Votes" value={shop.communityVotes || 'New'} />
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {(shop.specialties || []).map((specialty) => <span key={specialty} className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">{specialty}</span>)}
                </div>
              </button>
            ))}
          </section>

          <aside className="bg-white border border-slate-200 rounded-xl overflow-hidden h-fit sticky top-24">
            <div className="aspect-[4/3] bg-slate-100">
              {selectedShop ? (
                <iframe title={`${selectedShop.name} map`} src={`https://www.google.com/maps?q=${encodeURIComponent(selectedShop.lat && selectedShop.lng ? `${selectedShop.lat},${selectedShop.lng}` : `${selectedShop.name} ${selectedShop.city}`)}&output=embed`} className="w-full h-full border-0" loading="lazy" />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 font-bold">Select a shop</div>
              )}
            </div>
            {selectedShop && (
              <div className="p-5">
                <h3 className="text-xl font-black text-slate-900">{selectedShop.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedShop.address}</p>
                <SocialLinks links={selectedShop.socialLinks} />
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <a href={mapsService.getDirectionsUrl(selectedShop)} target="_blank" rel="noreferrer" className="bg-slate-900 text-white rounded-lg px-3 py-3 text-center font-black">Directions</a>
                  <a href={mapsService.getSearchUrl({ city: selectedShop.city, categoryId })} target="_blank" rel="noreferrer" className="border border-slate-200 rounded-lg px-3 py-3 text-center font-black text-slate-800">Search Area</a>
                </div>
                <TrustPanel
                  selectedShop={selectedShop}
                  trustData={trustData}
                  reviewForm={reviewForm}
                  setReviewForm={setReviewForm}
                  questionForm={questionForm}
                  setQuestionForm={setQuestionForm}
                  answerDrafts={answerDrafts}
                  setAnswerDrafts={setAnswerDrafts}
                  socialDraft={socialDraft}
                  setSocialDraft={setSocialDraft}
                  videoForm={videoForm}
                  setVideoForm={setVideoForm}
                  trustMessage={trustMessage}
                  onReview={submitReview}
                  onQuestion={submitQuestion}
                  onAnswer={submitAnswer}
                  onSocials={submitSocials}
                  onVideo={submitVideo}
                />
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
};

const compareShop = (a, b, sortBy) => {
  if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
  if (sortBy === 'communityVotes') return (b.communityVotes || 0) - (a.communityVotes || 0);
  if (sortBy === 'completedJobs') return (b.completedJobs || 0) - (a.completedJobs || 0);
  if (sortBy === 'reviews') return (b.reviews || 0) - (a.reviews || 0);
  return (a.distanceKm || 999) - (b.distanceKm || 999);
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-[10px] uppercase font-black text-slate-400">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

const Metric = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
    <p className="text-[10px] uppercase font-black text-slate-400">{label}</p>
    <p className="font-black text-slate-900 mt-1">{value}</p>
  </div>
);

const SocialLinks = ({ links = {} }) => {
  const entries = Object.entries(links || {}).filter(([, value]) => value);
  if (!entries.length) {
    return <p className="mt-3 text-xs font-bold text-slate-400">No socials added yet.</p>;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <a key={key} href={normalizeSocialUrl(key, value)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">
          {key} <ExternalLink size={12} />
        </a>
      ))}
    </div>
  );
};

const TrustPanel = ({
  selectedShop,
  trustData,
  reviewForm,
  setReviewForm,
  questionForm,
  setQuestionForm,
  answerDrafts,
  setAnswerDrafts,
  socialDraft,
  setSocialDraft,
  videoForm,
  setVideoForm,
  trustMessage,
  onReview,
  onQuestion,
  onAnswer,
  onSocials,
  onVideo,
}) => (
  <div className="mt-6 space-y-5">
    {trustMessage && <p className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm font-black text-emerald-700">{trustMessage}</p>}

    <section className="border border-slate-100 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Video size={18} className="text-blue-700" />
        <h4 className="font-black text-slate-900">Service videos</h4>
      </div>
      <p className="text-xs text-slate-500 mt-1">Providers can show offered services, fleet walkarounds, inspection clips, washing process, or dealership inventory.</p>
      <div className="mt-3 space-y-3">
        {trustData.videos.length ? trustData.videos.map((video) => (
          <article key={video.id} className="rounded-lg border border-slate-100 overflow-hidden">
            {video.videoUrl ? (
              <video src={video.videoUrl} poster={video.thumbnailUrl} controls className="w-full aspect-video bg-slate-100 object-cover" />
            ) : (
              <img src={video.thumbnailUrl || 'https://placehold.co/700x420?text=Service+Video'} alt={video.title} className="w-full aspect-video bg-slate-100 object-cover" />
            )}
            <div className="p-3">
              <p className="font-black text-slate-900">{video.title || 'Service video'}</p>
              <p className="text-xs text-slate-500">{video.serviceType || selectedShop.category}</p>
              {video.description && <p className="text-sm text-slate-600 mt-1">{video.description}</p>}
            </div>
          </article>
        )) : <p className="text-sm text-slate-500">No service videos yet.</p>}
      </div>
      <form onSubmit={onVideo} className="mt-4 space-y-2">
        <input value={videoForm.title} onChange={(event) => setVideoForm((current) => ({ ...current, title: event.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Video title" />
        <input value={videoForm.videoUrl} onChange={(event) => setVideoForm((current) => ({ ...current, videoUrl: event.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Video URL or uploaded media URL" />
        <input value={videoForm.serviceType} onChange={(event) => setVideoForm((current) => ({ ...current, serviceType: event.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Service type: rent a car, inspection, car wash..." />
        <textarea value={videoForm.description} onChange={(event) => setVideoForm((current) => ({ ...current, description: event.target.value }))} rows="2" className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="What does this service video show?" />
        <button className="w-full bg-blue-700 text-white rounded-lg py-2 font-black">Add service video</button>
      </form>
    </section>

    <section className="border border-slate-100 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Star size={18} className="text-amber-500 fill-amber-500" />
        <h4 className="font-black text-slate-900">Reviews</h4>
      </div>
      <div className="mt-3 space-y-3">
        {trustData.reviews.length ? trustData.reviews.map((review) => (
          <article key={review.id} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-black text-slate-900">{review.title || review.serviceType || 'Service review'}</p>
              <span className="text-xs font-black text-amber-700">{review.rating}/5</span>
            </div>
            <p className="text-xs text-slate-500">{review.userName || 'Customer'} - {review.vehicle || review.serviceType || selectedShop.category}</p>
            {review.body && <p className="text-sm text-slate-600 mt-1">{review.body}</p>}
          </article>
        )) : <p className="text-sm text-slate-500">No detailed reviews yet.</p>}
      </div>
      <form onSubmit={onReview} className="mt-4 space-y-2">
        <select value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold">
          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
        </select>
        <input value={reviewForm.title} onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Review title" />
        <input value={reviewForm.vehicle} onChange={(event) => setReviewForm((current) => ({ ...current, vehicle: event.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Vehicle / rental / service context" />
        <textarea value={reviewForm.body} onChange={(event) => setReviewForm((current) => ({ ...current, body: event.target.value }))} rows="2" className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Share service quality, price clarity, timing, and honesty." />
        <button className="w-full bg-slate-900 text-white rounded-lg py-2 font-black">Add review</button>
      </form>
    </section>

    <section className="border border-slate-100 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-emerald-700" />
        <h4 className="font-black text-slate-900">Ask provider</h4>
      </div>
      <form onSubmit={onQuestion} className="mt-3 space-y-2">
        <textarea value={questionForm} onChange={(event) => setQuestionForm(event.target.value)} rows="2" className="w-full border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Ask about price, timing, tools, rental terms, inspection process..." />
        <button className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 text-white rounded-lg py-2 font-black"><Send size={15} /> Ask question</button>
      </form>
      <div className="mt-4 space-y-3">
        {trustData.questions.map((question) => (
          <article key={question.id} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="font-black text-slate-900">{question.question}</p>
            {question.answer ? (
              <p className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 p-2 text-sm text-slate-700"><span className="font-black text-emerald-700">{question.answeredByName || selectedShop.name}:</span> {question.answer}</p>
            ) : (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <input value={answerDrafts[question.id] || ''} onChange={(event) => setAnswerDrafts((current) => ({ ...current, [question.id]: event.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Provider answer..." />
                <button type="button" onClick={() => onAnswer(question.id)} className="bg-slate-900 text-white rounded-lg px-3 py-2 font-black">Answer</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>

    <section className="border border-slate-100 rounded-xl p-4">
      <h4 className="font-black text-slate-900">Provider socials</h4>
      <form onSubmit={onSocials} className="mt-3 grid grid-cols-1 gap-2">
        {['facebook', 'instagram', 'whatsapp', 'tiktok', 'youtube', 'website'].map((key) => (
          <input key={key} value={socialDraft[key] || ''} onChange={(event) => setSocialDraft((current) => ({ ...current, [key]: event.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder={`${key} link`} />
        ))}
        <button className="bg-slate-900 text-white rounded-lg py-2 font-black">Save socials</button>
      </form>
    </section>
  </div>
);

const cleanLinks = (links = {}) => Object.entries(links).reduce((result, [key, value]) => {
  if (value) result[key] = value;
  return result;
}, {});

const normalizeSocialUrl = (key, value) => {
  if (!value) return '#';
  if (/^https?:\/\//i.test(value)) return value;
  if (key === 'whatsapp') return `https://wa.me/${value.replace(/[^\d]/g, '')}`;
  return `https://${value}`;
};

export default RepairShops;
