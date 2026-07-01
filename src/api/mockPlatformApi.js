import { accessoriesData, accessoryFitsVehicle } from '../data/accessories';
import { editorialArticles, editorialWriters } from '../data/articles';
import { buildSearchFacets, rankHybridListings, scoreVehicleSearchMatch } from '../services/searchRecommenderEngine';

const wait = (value) => new Promise((resolve) => {
  window.setTimeout(() => resolve(value), 120);
});

const ok = (data = {}) => wait({ ok: true, data });

const mockAccessoryReviews = [
  {
    id: 'local-review-501-1',
    accessoryId: 501,
    userName: 'Fortuner Owner',
    rating: 5,
    title: 'Fit was accurate',
    body: 'The mat shape matched my Fortuner cabin and the raised edges are useful in rain.',
    fitmentConfirmed: true,
    serviceContext: 'Installed myself',
    helpfulCount: 7,
    createdAt: '4 days ago',
  },
  {
    id: 'local-review-502-1',
    accessoryId: 502,
    userName: 'Lahore Buyer',
    rating: 4,
    title: 'Good camera, ask about installation',
    body: 'Video quality is good. Hardwire kit installation should be confirmed with seller before checkout.',
    fitmentConfirmed: true,
    serviceContext: 'Workshop installed',
    helpfulCount: 4,
    createdAt: '2 days ago',
  },
];

const mockAccessoryQuestions = [
  {
    id: 'local-question-501-1',
    accessoryId: 501,
    userName: 'Karachi Buyer',
    question: 'Does this set include the boot mat or only cabin mats?',
    answer: 'This listing is for cabin mats only. Boot mat can be added as a separate item.',
    answeredByName: 'Karachi Auto Decor',
    status: 'answered',
    createdAt: '18 hours ago',
    answeredAt: '12 hours ago',
  },
  {
    id: 'local-question-502-1',
    accessoryId: 502,
    userName: 'Civic Owner',
    question: 'Can the seller install this with parking mode in Lahore?',
    status: 'open',
    createdAt: '6 hours ago',
  },
];

const summarizeAccessoryReviews = (reviews) => ({
  average: reviews.length ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)) : 0,
  count: reviews.length,
  distribution: [5, 4, 3, 2, 1].reduce((result, rating) => {
    result[rating] = reviews.filter((review) => Number(review.rating) === rating).length;
    return result;
  }, {}),
});

const filterListings = (listings, query = {}) => {
  const term = (query.q || query.query || '').toLowerCase();
  return listings.filter((listing) => {
    const matchesTerm = !term || `${listing.name} ${listing.make} ${listing.model} ${listing.city}`.toLowerCase().includes(term);
    const matchesType = !query.listingType || listing.listingType === query.listingType;
    const matchesCity = !query.city || listing.city === query.city;
    const matchesBody = !query.bodyStyle || listing.bodyStyle === query.bodyStyle;
    const matchesBudget = !query.maxPrice || (listing.buyNowPrice || listing.highBid || 0) <= Number(query.maxPrice);
    return matchesTerm && matchesType && matchesCity && matchesBody && matchesBudget;
  });
};

const priceOf = (listing = {}) => Number(listing.buyNowPrice || listing.highBid || listing.marketEstimate || 0);

const localDeal = (listing = {}) => {
  const estimate = Number(listing.marketEstimate || priceOf(listing));
  const price = priceOf(listing);
  const score = Math.max(0, Math.min(100, Math.round(55 + ((estimate - price) / Math.max(estimate, 1)) * 120 + Number(listing.inspectionScore || 75) / 8)));
  return { score, badge: score >= 82 ? 'Great Deal' : score >= 68 ? 'Fair Price' : score >= 45 ? 'Watch Closely' : 'Overpriced', price, estimate };
};

const localQuality = (listing = {}) => {
  const checks = ['name', 'city', 'bodyStyle', 'mileage', 'inspectionScore', 'seller', 'titleStatus'];
  const missing = checks.filter((key) => !listing[key]);
  return { score: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
};

const localAiFeatures = (listings) => ({
  provider: 'local_rules',
  paidApiRequired: false,
  features: [
    'Hybrid Vehicle Recommender',
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
  ].map((name, index) => ({ id: `local_ai_${index + 1}`, name, status: 'implemented' })),
  model: 'hybrid_content_collaborative',
  defaultWeights: { content: 0.68, collaborative: 0.32 },
  coldStartWeights: { content: 0.82, collaborative: 0.18 },
  sampleRecommendations: listings.slice(0, 4),
});

export const createMockPlatformApi = ({
  getState,
  getListings,
  actions = {},
} = {}) => ({
  listings: {
    list: (query) => ok({ listings: filterListings(getListings?.() || [], query), query }),
    get: (id) => ok({ listing: (getListings?.() || []).find((listing) => listing.id === Number(id)) || null }),
    create: (payload) => ok({ listing: payload }),
    update: (id, payload) => ok({ id, ...payload }),
    report: (id, payload) => ok({ id, report: payload }),
  },
  accessories: {
    list: (query = {}) => ok({
      accessories: accessoriesData.filter((item) => {
        const term = (query.q || query.query || '').toLowerCase();
        const matchesTerm = !term || `${item.name} ${item.category} ${item.seller}`.toLowerCase().includes(term);
        const matchesCategory = !query.category || query.category === 'All' || item.category === query.category;
        const matchesGarage = !query.fitsGarage || accessoryFitsVehicle(item, getState?.().myGarage);
        return matchesTerm && matchesCategory && matchesGarage;
      }),
    }),
    get: (id) => ok({ accessory: accessoriesData.find((item) => item.id === Number(id)) || null }),
    reviews: (id) => {
      const reviews = mockAccessoryReviews.filter((review) => String(review.accessoryId) === String(id));
      return ok({ reviews, summary: summarizeAccessoryReviews(reviews) });
    },
    createReview: (id, payload = {}) => {
      const review = {
        id: `local-review-${Date.now()}`,
        accessoryId: Number(id),
        userName: 'Preview user',
        helpfulCount: 0,
        createdAt: 'Just now',
        ...payload,
        rating: Number(payload.rating || 5),
      };
      mockAccessoryReviews.unshift(review);
      const reviews = mockAccessoryReviews.filter((item) => String(item.accessoryId) === String(id));
      return ok({ review, summary: summarizeAccessoryReviews(reviews) });
    },
    markReviewHelpful: (id, reviewId) => {
      const review = mockAccessoryReviews.find((item) => String(item.accessoryId) === String(id) && String(item.id) === String(reviewId));
      if (review) review.helpfulCount = Number(review.helpfulCount || 0) + 1;
      return ok({ review });
    },
    questions: (id) => ok({ questions: mockAccessoryQuestions.filter((question) => String(question.accessoryId) === String(id)) }),
    askQuestion: (id, payload = {}) => {
      const question = {
        id: `local-question-${Date.now()}`,
        accessoryId: Number(id),
        userName: 'Preview user',
        question: payload.question || payload.body || '',
        status: 'open',
        createdAt: 'Just now',
      };
      mockAccessoryQuestions.unshift(question);
      return ok({ question });
    },
    answerQuestion: (id, questionId, payload = {}) => {
      const question = mockAccessoryQuestions.find((item) => String(item.accessoryId) === String(id) && String(item.id) === String(questionId));
      if (question) {
        question.answer = payload.answer || '';
        question.answeredByName = 'Seller preview';
        question.status = 'answered';
        question.answeredAt = 'Just now';
      }
      return ok({ question });
    },
    compatibleWithListing: (listingId) => {
      const listing = (getListings?.() || []).find((item) => item.id === Number(listingId));
      return ok({ accessories: accessoriesData.filter((item) => accessoryFitsVehicle(item, listing)) });
    },
    wishlist: () => ok({ ids: getState?.().accessoryWishlist || [] }),
    garage: () => ok({ vehicle: getState?.().myGarage }),
  },
  auctions: {
    list: (query) => ok({ auctions: filterListings(getListings?.() || [], { ...query, listingType: 'Auction' }) }),
    get: (id) => ok({ auction: (getListings?.() || []).find((listing) => listing.id === Number(id) && listing.listingType === 'Auction') || null }),
    placeBid: (id, payload) => ok(actions.placeBid?.(id, payload.amount) || {}),
    end: (id) => ok(actions.endAuction?.(id) || {}),
    reopen: (id, payload) => ok(actions.reopenAuction?.(id, payload?.minutes) || {}),
    bidHistory: (id) => ok({ bids: (getListings?.() || []).find((listing) => listing.id === Number(id))?.bidHistory || [] }),
  },
  wallet: {
    summary: () => ok({ wallet: getState?.().wallet }),
    createTopUpIntent: (payload) => ok({ provider: 'mock', status: 'ready', amount: payload.amount }),
    holds: () => ok({ holds: getState?.().wallet?.lockedDeposits || [] }),
    releaseHold: (id) => ok(actions.releaseDepositLock?.(id) || {}),
  },
  checkout: {
    get: (auctionId) => ok({ auction: (getListings?.() || []).find((listing) => listing.id === Number(auctionId)) || null }),
    start: (auctionId) => ok(actions.checkoutAuction?.(auctionId) || {}),
  },
  search: {
    listings: (query = {}) => {
      const listings = getListings?.() || [];
      const ranked = rankHybridListings(listings, getState?.() || {}, { query: query.q || query.query || '' });
      return ok({
        provider: 'local_index',
        listings: ranked.filter((listing) => {
          const base = filterListings([listing], query).length > 0;
          const semantic = scoreVehicleSearchMatch(listing, query.q || query.query || '');
          return base || semantic.score > 0;
        }),
        facets: buildSearchFacets(listings),
        query,
      });
    },
    auctions: (query = {}) => ok({ auctions: rankHybridListings(filterListings(getListings?.() || [], { ...query, listingType: 'Auction' }), getState?.() || {}, { query: query.q || query.query || '' }), query }),
    suggestions: (query) => ok({
      suggestions: filterListings(getListings?.() || [], query)
        .slice(0, 6)
        .map((listing) => ({ id: listing.id, label: listing.name, city: listing.city })),
    }),
    facets: () => ok({ provider: 'local_index', facets: buildSearchFacets(getListings?.() || []) }),
    reindex: () => ok({ provider: 'local_index', indexed: getListings?.().length || 0, skipped: false }),
  },
  recommendations: {
    home: () => ok({ provider: 'local_hybrid', recommendations: rankHybridListings(getListings?.() || [], getState?.() || {}).slice(0, 8) }),
    auctions: () => ok({ provider: 'local_hybrid', recommendations: rankHybridListings((getListings?.() || []).filter((listing) => listing.listingType === 'Auction'), getState?.() || {}).slice(0, 8) }),
    similar: (listingId) => ok({ recommendations: (getListings?.() || []).filter((listing) => listing.id !== Number(listingId)).slice(0, 6) }),
    feedback: (payload) => ok({ stored: true, payload }),
    events: () => ok({ events: getState?.().recommendationEvents || [] }),
    trackEvent: (payload) => ok({ event: { id: Date.now(), ...payload, createdAt: 'Just now' } }),
    model: () => ok({ modelVersion: 'local', items: rankHybridListings(getListings?.() || [], getState?.() || {}).slice(0, 20) }),
    rebuildModel: () => ok({ modelVersion: 'local', indexed: getListings?.().length || 0 }),
  },
  orders: {
    list: () => ok({ orders: getState?.().accessoryOrders || [] }),
    create: (payload) => ok({ order: { id: Date.now(), ...payload, createdAt: 'Just now' } }),
    action: (id, action, payload) => ok({ order: { id, action, ...payload, updatedAt: 'Just now' } }),
  },
  ai: {
    features: () => ok(localAiFeatures(getListings?.() || [])),
    personalizedRecommendations: (query) => ok({ model: 'hybrid_content_collaborative', weights: { content: 0.68, collaborative: 0.32 }, recommendations: filterListings(getListings?.() || [], query).slice(0, 12), profile: query }),
    priceEstimate: (listingId, payload = {}) => {
      const listing = { ...(getListings?.() || []).find((item) => item.id === Number(listingId)), ...payload };
      const mid = Number(listing.marketEstimate || priceOf(listing));
      return ok({ estimate: { low: Math.round(mid * 0.94), mid, high: Math.round(mid * 1.07), confidence: listing.inspectionScore ? 'high' : 'medium' } });
    },
    dealScore: (listingId) => ok({ deal: localDeal((getListings?.() || []).find((item) => item.id === Number(listingId))) }),
    similarListings: (listingId) => ok({ recommendations: (getListings?.() || []).filter((listing) => listing.id !== Number(listingId)).slice(0, 8) }),
    auctionWinProbability: (auctionId) => ok({ winProbability: 62, heat: 54, auctionId }),
    auctionBidTiming: () => ok({ timing: 'prepare_final_bid', advice: 'Set a ceiling and avoid emotional overbidding.', heat: 54 }),
    auctionStrategy: (auctionId) => ok({ strategy: { auctionId, winProbability: 62, timing: 'prepare_final_bid', advice: 'Keep bids under fair value.' } }),
    listingQuality: (payload) => ok({ quality: localQuality(payload) }),
    fraudCheck: (payload) => ok({ risk: payload?.titleStatus === 'Clean' ? 'low' : 'review', score: payload?.titleStatus === 'Clean' ? 12 : 42, signals: [] }),
    naturalLanguageSearch: (payload) => ok({ listings: filterListings(getListings?.() || [], { query: payload?.query || payload?.q }).slice(0, 12), interpretedQuery: payload }),
    summarizeThread: (payload) => ok({ summary: { summary: `Discussion has ${(payload?.comments || []).length} replies.`, keywords: [], sentiment: 'neutral' } }),
    moderateCommunity: (payload) => ok({ moderation: { action: /advance payment|click here/i.test(payload?.text || payload?.body || '') ? 'review' : 'allow', score: 0, signals: [] } }),
    inspectionInsight: (payload) => ok({ insight: { verdict: Number(payload?.score || 0) >= 80 ? 'strong_buy' : 'inspect_before_bid', confidence: 'medium' } }),
    sellerPricingCoach: (payload) => {
      const mid = Number(payload?.marketEstimate || payload?.askingPrice || 0);
      return ok({ coach: { suggestions: { fastSale: Math.round(mid * 0.96), balanced: mid, auctionReserve: Math.round(mid * 0.9) }, notes: [] } });
    },
  },
  community: {
    forums: () => ok({ forums: getState?.().forums || [] }),
    faq: () => ok({ faqs: getState?.().faqs || [] }),
  },
  articles: {
    list: (query = {}) => ok({
      articles: editorialArticles
        .filter((article) => !query.category || query.category === 'All' || article.category === query.category)
        .filter((article) => !query.q || `${article.title} ${article.deck} ${article.category}`.toLowerCase().includes(String(query.q).toLowerCase())),
      writers: editorialWriters,
    }),
    get: (slug) => ok({ article: editorialArticles.find((article) => article.slug === slug || article.id === slug) || null, comments: [] }),
    create: (payload) => ok({ article: { id: Date.now(), slug: String(payload.title || 'draft').toLowerCase().replace(/[^a-z0-9]+/g, '-'), status: 'draft', ...payload, createdAt: 'Just now' } }),
    drafts: () => ok({ articles: editorialArticles }),
    updateStatus: (id, payload) => ok({ article: { id, ...payload, updatedAt: 'Just now' } }),
    like: (slug) => ok({ slug, liked: true }),
    bookmark: (slug) => ok({ slug, bookmarked: true }),
    comments: () => ok({ comments: [] }),
    addComment: (slug, payload) => ok({ comment: { id: Date.now(), slug, ...payload, createdAt: 'Just now' } }),
  },
  notifications: {
    list: () => ok({ notifications: getState?.().notifications || [] }),
  },
  messages: {
    conversations: () => ok({ conversations: getState?.().conversations || [] }),
  },
});
