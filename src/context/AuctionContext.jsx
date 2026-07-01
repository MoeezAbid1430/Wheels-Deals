import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auctionCars, carsData } from '../data/cars';
import { accessoriesData, accessoryFitsVehicle } from '../data/accessories';
import { getAccessoryFulfillment } from '../data/taxonomy';
import { createHttpClient, createMockPlatformApi, createPlatformApi } from '../api';
import { realtimeService } from '../services';
import { buildSearchFacets, rankHybridListings } from '../services/searchRecommenderEngine';

const STORAGE_KEY = 'wheels_deals_auction_state_v1';
const AUTH_TOKEN_KEY = 'wheels_deals_auth_token';
const AUTH_REFRESH_TOKEN_KEY = 'wheels_deals_refresh_token';
const USERNAME = 'You';
const defaultVerificationState = {
  loaded: false,
  verificationLevel: 'registered',
  kycProfile: null,
  privacy: null,
  eligibility: {},
};

const AuctionContext = createContext(null);

const defaultForums = [
  { id: 'auction-talk', name: 'Auction Talk', description: 'Live bidding strategy, reserve talk, and auction results.', color: 'red' },
  { id: 'buying-advice', name: 'Buying Advice', description: 'Ask before you bid, buy, inspect, or transfer.', color: 'blue' },
  { id: 'price-checks', name: 'Price Checks', description: 'Community opinions on fair value and deal quality.', color: 'green' },
  { id: 'maintenance', name: 'Maintenance', description: 'Repairs, parts, workshops, and ownership costs.', color: 'amber' },
  { id: 'seller-help', name: 'Seller Help', description: 'Listing quality, photos, reserves, and seller trust.', color: 'slate' },
  { id: 'city-groups', name: 'City Groups', description: 'Karachi, Lahore, Islamabad, Rawalpindi and local advice.', color: 'purple' },
];

const defaultFaqs = [
  {
    id: 1,
    category: 'Auction Rules',
    question: 'How does bidding work?',
    answer: 'Each auction has a current high bid and a minimum increment. Bids must meet the next required amount and the bidder must have enough wallet deposit to qualify.',
  },
  {
    id: 2,
    category: 'Buyer Protection',
    question: 'Why do buyers need a wallet deposit?',
    answer: 'The deposit discourages fake bidding and helps verify serious intent before a bid is accepted.',
  },
  {
    id: 3,
    category: 'Selling',
    question: 'What happens after I submit a car?',
    answer: 'The listing enters admin review. Admin checks title status, seller identity, pricing, photos, and auction readiness before approving it.',
  },
  {
    id: 4,
    category: 'Community',
    question: 'Can I ask the community about a car?',
    answer: 'Yes. Community posts can be linked to listings for price checks, inspection questions, and auction discussion.',
  },
];

const defaultPosts = [
  {
    id: 1001,
    forumId: 'auction-talk',
    title: 'What makes a good final-hour auction strategy?',
    body: 'Do you bid early to show interest, or wait until the last minutes? I am curious how people avoid overpaying when the heat meter is high.',
    author: 'AuctionPilot',
    flair: 'Strategy',
    listingId: 1,
    votes: 18,
    createdAt: '2h ago',
    reports: 0,
    comments: [
      { id: 1, author: 'Civic_Lover', body: 'I set a max number before the auction starts and refuse to chase past it.', votes: 7, createdAt: '1h ago' },
      { id: 2, author: 'AutoKing', body: 'Watch reserve status. Reserve met changes the psychology quickly.', votes: 5, createdAt: '45m ago' },
    ],
  },
  {
    id: 1002,
    forumId: 'price-checks',
    title: 'Is this Fortuner still fair under 90 lakh?',
    body: 'The mileage and service history look good, but the auction is heating up. What would you consider the walk-away price?',
    author: 'FamilyBuyer',
    flair: 'Price Check',
    listingId: 1,
    votes: 24,
    createdAt: '5h ago',
    reports: 0,
    comments: [
      { id: 1, author: 'MarketWatcher', body: 'If inspection is clean, 88-90 lakh still sounds defensible.', votes: 6, createdAt: '4h ago' },
    ],
  },
  {
    id: 1003,
    forumId: 'maintenance',
    title: 'Hilux Revo 2.8 diesel maintenance costs?',
    body: 'Looking for real owner numbers on service, tires, and common issues before bidding on a Revo.',
    author: 'OffroadNewbie',
    flair: 'Ownership',
    listingId: 3,
    votes: 11,
    createdAt: '1d ago',
    reports: 0,
    comments: [],
  },
];

const defaultGarageRankings = [
  { id: 1, rank: 1, name: 'AutoKing', city: 'Lahore', avatar: 'https://placehold.co/96x96?text=AK', vehicles: 18, collectionValue: 185000000, rareCars: 4, auctionWins: 12, verified: true, topCar: 'Mercedes S Class' },
  { id: 2, rank: 2, name: 'MarketWatcher', city: 'Karachi', avatar: 'https://placehold.co/96x96?text=MW', vehicles: 14, collectionValue: 142000000, rareCars: 3, auctionWins: 8, verified: true, topCar: 'Toyota Land Cruiser' },
  { id: 3, rank: 3, name: 'AuctionPilot', city: 'Islamabad', avatar: 'https://placehold.co/96x96?text=AP', vehicles: 11, collectionValue: 118000000, rareCars: 2, auctionWins: 9, verified: true, topCar: 'BMW 7 Series' },
  { id: 4, rank: 4, name: USERNAME, city: 'Karachi', avatar: 'https://placehold.co/96x96?text=YD', vehicles: 1, collectionValue: 9000000, rareCars: 0, auctionWins: 0, verified: false, topCar: 'Toyota Fortuner' },
];

const defaultDealerRankings = [
  { id: 1, rank: 1, dealer: 'Indus_PreOwned', city: 'Karachi', soldCars: 84, auctionCars: 21, avgDaysToSell: 6, trustScore: 96, revenue: 684000000, badge: 'Top Seller' },
  { id: 2, rank: 2, dealer: 'Honda_Drive', city: 'Lahore', soldCars: 69, auctionCars: 14, avgDaysToSell: 8, trustScore: 91, revenue: 432000000, badge: 'Fast Mover' },
  { id: 3, rank: 3, dealer: 'Capital_Motors', city: 'Islamabad', soldCars: 57, auctionCars: 29, avgDaysToSell: 5, trustScore: 93, revenue: 516000000, badge: 'Auction Leader' },
  { id: 4, rank: 4, dealer: 'Metro_Autos', city: 'Rawalpindi', soldCars: 43, auctionCars: 7, avgDaysToSell: 10, trustScore: 88, revenue: 248000000, badge: 'Trusted Dealer' },
];

const defaultCommunityRankings = [
  { id: 1, rank: 1, name: 'MarketWatcher', metric: 'Price checks helped', value: 148, reputation: 94 },
  { id: 2, rank: 2, name: 'AuctionPilot', metric: 'Auction guides posted', value: 67, reputation: 91 },
  { id: 3, rank: 3, name: 'AutoKing', metric: 'Answers accepted', value: 54, reputation: 89 },
];

const defaultRepairShopRankings = [
  {
    id: 1,
    rank: 1,
    name: 'Clifton Auto Care',
    city: 'Karachi',
    area: 'Clifton',
    address: 'Block 5, Clifton, Karachi',
    lat: 24.8138,
    lng: 67.0306,
    distanceKm: 2.4,
    rating: 4.8,
    reviews: 312,
    completedJobs: 1240,
    communityVotes: 486,
    responseTime: '12 min',
    verified: true,
    openNow: true,
    specialties: ['Inspection', 'Oil change', 'Suspension', 'AC repair'],
  },
  {
    id: 2,
    rank: 2,
    name: 'Defence Hybrid Workshop',
    city: 'Karachi',
    area: 'DHA Phase 6',
    address: 'Khayaban-e-Ittehad, DHA Phase 6, Karachi',
    lat: 24.7936,
    lng: 67.0642,
    distanceKm: 4.1,
    rating: 4.7,
    reviews: 226,
    completedJobs: 810,
    communityVotes: 354,
    responseTime: '18 min',
    verified: true,
    openNow: true,
    specialties: ['Hybrid', 'Diagnostics', 'EV check', 'Battery'],
  },
  {
    id: 3,
    rank: 3,
    name: 'Gulberg Motor Clinic',
    city: 'Lahore',
    area: 'Gulberg',
    address: 'Main Boulevard Gulberg, Lahore',
    lat: 31.5204,
    lng: 74.3587,
    distanceKm: 3.7,
    rating: 4.6,
    reviews: 198,
    completedJobs: 920,
    communityVotes: 291,
    responseTime: '20 min',
    verified: true,
    openNow: false,
    specialties: ['Engine', 'Transmission', 'Inspection', 'Body work'],
  },
  {
    id: 4,
    rank: 4,
    name: 'Blue Area Auto Diagnostics',
    city: 'Islamabad',
    area: 'Blue Area',
    address: 'Jinnah Avenue, Blue Area, Islamabad',
    lat: 33.7077,
    lng: 73.0498,
    distanceKm: 5.2,
    rating: 4.5,
    reviews: 174,
    completedJobs: 690,
    communityVotes: 248,
    responseTime: '25 min',
    verified: true,
    openNow: true,
    specialties: ['Diagnostics', 'German cars', 'Inspection', 'Electronics'],
  },
  {
    id: 5,
    rank: 5,
    name: 'Saddar Bike & Loader Mechanics',
    city: 'Rawalpindi',
    area: 'Saddar',
    address: 'Adamjee Road, Saddar, Rawalpindi',
    lat: 33.5997,
    lng: 73.0479,
    distanceKm: 6.8,
    rating: 4.4,
    reviews: 147,
    completedJobs: 760,
    communityVotes: 205,
    responseTime: '16 min',
    verified: false,
    openNow: true,
    specialties: ['Bikes', 'Loaders', 'Small commercial', 'Electrical'],
  },
  {
    id: 6,
    rank: 6,
    name: 'Johar Premium Car Wash',
    city: 'Karachi',
    area: 'Gulistan-e-Johar',
    address: 'Block 15, Gulistan-e-Johar, Karachi',
    lat: 24.9263,
    lng: 67.1321,
    distanceKm: 7.5,
    rating: 4.5,
    reviews: 188,
    completedJobs: 1420,
    communityVotes: 228,
    responseTime: '10 min',
    verified: true,
    openNow: true,
    specialties: ['Car wash', 'Detailing', 'Ceramic coating', 'Interior cleaning'],
  },
  {
    id: 7,
    rank: 7,
    name: 'Lahore Certified Dealership Hub',
    city: 'Lahore',
    area: 'Johar Town',
    address: 'Main Boulevard Johar Town, Lahore',
    lat: 31.4697,
    lng: 74.2728,
    distanceKm: 8.4,
    rating: 4.3,
    reviews: 132,
    completedJobs: 520,
    communityVotes: 184,
    responseTime: '30 min',
    verified: true,
    openNow: true,
    specialties: ['Dealership', 'Certified used cars', 'Trade-in', 'Financing'],
  },
];

const formatRemaining = (endsAt) => {
  const remainingMs = Math.max(0, endsAt - Date.now());
  const totalMinutes = Math.ceil(remainingMs / 60000);

  if (totalMinutes <= 0) return 'Ended';
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

const createAuctionRecord = (car, now = Date.now()) => {
  const reservePrice = Number(car.reservePrice) || Math.round((Number(car.marketEstimate) || Number(car.highBid) || 0) * 0.9);
  return {
    highBid: Number(car.highBid) || 0,
    bidsCount: Number(car.bidsCount) || 0,
    bidHistory: car.bidHistory || [],
    endsAt: now + (Number(car.endsInMinutes) || 10080) * 60000,
    lastBidder: car.bidHistory?.[0]?.user || null,
    extensions: 0,
    spectators: Number(car.spectators) || Math.max(12, Math.round((Number(car.watchers) || 0) * 0.35)),
    reservePrice,
    checkedOut: false,
    checkoutStartedAt: null,
  };
};

const createDefaultOwnedVehicles = () => ([
  {
    id: 1,
    nickname: 'Family Fortuner',
    year: 2019,
    make: 'Toyota',
    model: 'Fortuner',
    variant: 'V Petrol',
    engine: '2.7L Inline-4',
    bodyStyle: 'SUV',
    powertrain: 'Petrol',
    registration: 'ABC-123',
    vin: 'MR0EXAMPLEFORTUNER',
    ownershipStatus: 'Owned',
    odometerKm: 45000,
    marketValue: 9000000,
    nextServiceKm: 50000,
    documents: [
      { id: 1, type: 'Registration book', status: 'Verified', expiresAt: '2027-03-01' },
      { id: 2, type: 'Insurance', status: 'Expiring soon', expiresAt: '2026-06-15' },
      { id: 3, type: 'Token tax', status: 'Due soon', expiresAt: '2026-06-30' },
    ],
    serviceHistory: [
      { id: 1, date: '2026-02-12', title: 'Oil and filters', mileageKm: 42000, cost: 28000, workshop: 'Toyota Clifton' },
      { id: 2, date: '2025-09-21', title: 'Brake inspection', mileageKm: 38000, cost: 18000, workshop: 'Verified workshop' },
    ],
    reminders: [
      { id: 1, type: 'Service', due: '5,000 km left', priority: 'medium' },
      { id: 2, type: 'Insurance', due: 'Due Jun 15, 2026', priority: 'high' },
    ],
    expenses: [
      { id: 1, label: 'Fuel and service', amount: 46000, month: 'May 2026' },
      { id: 2, label: 'Parking and tolls', amount: 12000, month: 'May 2026' },
    ],
  },
]);

const createInitialState = () => {
  const now = Date.now();
  const auctions = auctionCars.reduce((acc, car) => {
    acc[car.id] = createAuctionRecord(car, now);
    return acc;
  }, {});

  return {
    auctions,
    wallet: {
      balance: 0,
      lockedDeposits: [],
      transactions: [],
    },
    currentRole: 'seller',
    submissions: [],
    watchlist: [],
    savedSearches: [],
    recentlyViewed: [],
    savedPosts: [],
    compareIds: [],
    accessoryWishlist: [],
    accessoryCart: [],
    accessoryOrders: [],
    myGarage: {
      id: 1,
      year: 2019,
      make: 'Toyota',
      model: 'Fortuner',
      variant: 'V Petrol',
      engine: '2.7L Inline-4',
      bodyStyle: 'SUV',
      powertrain: 'Petrol',
    },
    ownedVehicles: createDefaultOwnedVehicles(),
    notifications: [
      { id: 1, type: 'auction', title: 'Auction ending soon', body: 'The Toyota Fortuner auction is heating up.', read: false, createdAt: 'Just now', link: '/listing/1' },
      { id: 2, type: 'community', title: 'New price check reply', body: 'A community member replied to a linked listing discussion.', read: false, createdAt: '20m ago', link: '/community/post/1002' },
    ],
    conversations: [
      {
        id: 1,
        listingId: 1,
        seller: 'Indus_PreOwned',
        buyer: USERNAME,
        updatedAt: 'Just now',
        messages: [
          { id: 1, from: 'Indus_PreOwned', body: 'Vehicle is available for inspection in Clifton.', time: '1h ago' },
          { id: 2, from: USERNAME, body: 'Can I bring a mechanic tomorrow?', time: 'Just now' },
        ],
      },
    ],
    userProfile: {
      name: USERNAME,
      username: 'you',
      role: 'Buyer',
      city: 'Karachi',
      avatar: 'https://placehold.co/160x160?text=YD',
      cover: 'https://placehold.co/1200x320/0f172a/ffffff?text=Wheels%26Deals+Garage',
      bio: 'Auction watcher, family SUV buyer, and community price-check regular.',
      reputation: 82,
      badges: ['Verified bidder', 'Community member'],
      followers: 128,
      following: 36,
      joinedForums: ['auction-talk', 'price-checks', 'maintenance'],
      socialLinks: ['Instagram', 'WhatsApp'],
    },
    forums: defaultForums,
    posts: defaultPosts,
    faqs: defaultFaqs,
    garageRankings: defaultGarageRankings,
    dealerRankings: defaultDealerRankings,
    communityRankings: defaultCommunityRankings,
    repairShopRankings: defaultRepairShopRankings,
  };
};

const readState = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    const parsed = JSON.parse(saved);
    const baseline = createInitialState();
    const ownedVehicles = parsed.ownedVehicles?.length
      ? parsed.ownedVehicles
      : [{
          ...baseline.ownedVehicles[0],
          ...(parsed.myGarage || baseline.myGarage),
          id: parsed.myGarage?.id || baseline.ownedVehicles[0].id,
        }];
    const mergedAuctions = Object.entries({ ...baseline.auctions, ...(parsed.auctions || {}) }).reduce((acc, [id, auction]) => {
      const baselineAuction = baseline.auctions[id] || {};
      acc[id] = {
        ...baselineAuction,
        ...auction,
        reservePrice: auction.reservePrice ?? baselineAuction.reservePrice ?? Math.round((Number(auction.highBid) || 0) * 1.1),
        checkedOut: auction.checkedOut || false,
        checkoutStartedAt: auction.checkoutStartedAt || null,
        bidHistory: auction.bidHistory || baselineAuction.bidHistory || [],
      };
      return acc;
    }, {});

    return {
      ...baseline,
      ...parsed,
      auctions: mergedAuctions,
      wallet: {
        ...baseline.wallet,
        ...parsed.wallet,
        lockedDeposits: parsed.wallet?.lockedDeposits || [],
        transactions: parsed.wallet?.transactions || [],
      },
      submissions: parsed.submissions || [],
      currentRole: parsed.currentRole || 'seller',
      watchlist: parsed.watchlist || [],
      savedSearches: parsed.savedSearches || [],
      recentlyViewed: parsed.recentlyViewed || [],
      savedPosts: parsed.savedPosts || [],
      compareIds: parsed.compareIds || [],
      accessoryWishlist: parsed.accessoryWishlist || [],
      accessoryCart: parsed.accessoryCart || [],
      accessoryOrders: parsed.accessoryOrders || [],
      myGarage: parsed.myGarage || baseline.myGarage,
      ownedVehicles,
      notifications: parsed.notifications || baseline.notifications,
      conversations: parsed.conversations || baseline.conversations,
      userProfile: parsed.userProfile || baseline.userProfile,
      forums: parsed.forums || defaultForums,
      garageRankings: parsed.garageRankings || defaultGarageRankings,
      dealerRankings: parsed.dealerRankings || defaultDealerRankings,
      communityRankings: parsed.communityRankings || defaultCommunityRankings,
      repairShopRankings: parsed.repairShopRankings || defaultRepairShopRankings,
      posts: (parsed.posts || defaultPosts).map((post) => ({
        isPinned: false,
        isLocked: false,
        isDeleted: false,
        ...post,
        comments: (post.comments || []).map((comment) => ({
          reports: 0,
          replies: [],
          isBestAnswer: false,
          ...comment,
        })),
      })),
      faqs: parsed.faqs || defaultFaqs,
    };
  } catch {
    return createInitialState();
  }
};

const getRequiredDeposit = (amount) => Math.max(100000, Math.ceil(amount * 0.05));

const scoreGarageAccessory = (accessory, vehicle = {}, state = {}) => {
  if (!accessory || !vehicle) return { accessory, vehicle, score: 0, reasons: [] };
  const reasons = [];
  let score = 0;
  const exactFit = accessoryFitsVehicle(accessory, vehicle);
  const fulfillment = getAccessoryFulfillment(accessory);
  const category = String(accessory.category || '').toLowerCase();
  const name = String(accessory.name || '').toLowerCase();
  const bodyStyle = String(vehicle.bodyStyle || '').toLowerCase();
  const powertrain = String(vehicle.powertrain || '').toLowerCase();
  const reminders = (vehicle.reminders || []).map((reminder) => `${reminder.type || ''} ${reminder.due || ''}`.toLowerCase()).join(' ');
  const serviceHistory = (vehicle.serviceHistory || []).map((record) => `${record.title || ''} ${record.workshop || ''}`.toLowerCase()).join(' ');

  if (exactFit) {
    score += 60;
    reasons.push(`fits ${vehicle.make} ${vehicle.model}`);
  } else if (accessory.fitmentType === 'Universal') {
    score += 28;
    reasons.push('universal fit');
  }

  if (category.includes('oil') || category.includes('filter') || category.includes('wiper') || category.includes('brake')) {
    score += 14;
    reasons.push('maintenance item');
  }
  if (reminders && ['oil', 'filter', 'brake', 'inspection', 'service', 'tyre', 'tire', 'wiper'].some((term) => reminders.includes(term) && (category.includes(term) || name.includes(term)))) {
    score += 24;
    reasons.push('matches Garage reminder');
  }
  if (serviceHistory && ['oil', 'filter', 'brake', 'detail', 'wash'].some((term) => serviceHistory.includes(term) && (category.includes(term) || name.includes(term)))) {
    score += 10;
    reasons.push('matches service history');
  }
  if ((bodyStyle.includes('suv') || bodyStyle.includes('truck') || bodyStyle.includes('pickup')) && ['bed', 'bumper', 'wheel', 'mat', 'compressor'].some((term) => category.includes(term) || name.includes(term))) {
    score += 10;
    reasons.push('useful for body type');
  }
  if (powertrain.includes('electric') && ['charger', 'tracker', 'camera', 'mobile'].some((term) => category.includes(term) || name.includes(term))) {
    score += 8;
    reasons.push('EV-friendly utility');
  }
  if (Number(accessory.rating || 0) >= 4.6) {
    score += 8;
    reasons.push('high rated');
  }
  if (Number(accessory.stock || 0) > 5) {
    score += 5;
    reasons.push('available stock');
  }
  if (fulfillment.installRequired) {
    score += 4;
    reasons.push('installation-aware');
  }
  if ((state.accessoryWishlist || []).includes(accessory.id)) {
    score += 12;
    reasons.push('already saved');
  }

  return {
    accessory,
    vehicle,
    score,
    reasons: [...new Set(reasons)].slice(0, 4),
  };
};

const calculateQualityScore = (submission) => {
  let score = 45;
  if (submission.vin) score += 10;
  if (submission.titleLocation) score += 10;
  if (submission.titledInName === true) score += 10;
  if (submission.specialOptions) score += 10;
  if (submission.listingType === 'Auction' && submission.reservePrice) score += 10;
  if (submission.hasFlaws === false) score += 5;
  return Math.min(score, 100);
};

const buildSubmissionNotes = (submission) => {
  const notes = [];
  if (!submission.vin) notes.push('VIN missing.');
  if (submission.titledInName === false) notes.push('Title is not in seller name.');
  if (submission.hasFlaws === true) notes.push('Seller reported flaws.');
  if (submission.modified === 'Modified') notes.push('Modification review required.');
  if (submission.listingType === 'Auction' && !submission.reservePrice) notes.push('Reserve guidance needed.');
  return notes.length ? notes : ['Submission looks ready for basic review.'];
};

const buildNotification = (type, title, body, link) => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  type,
  title,
  body,
  read: false,
  createdAt: 'Just now',
  link,
});

export const AuctionProvider = ({ children }) => {
  const [state, setState] = useState(readState);
  const [tick, setTick] = useState(Date.now());
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [verificationState, setVerificationState] = useState(defaultVerificationState);
  const [backendStatus, setBackendStatus] = useState({ checked: false, available: false, message: 'Checking API...' });
  const [backendCatalog, setBackendCatalog] = useState({ listings: [], accessories: [] });
  const [realtimeStatus, setRealtimeStatus] = useState('offline');

  const realApi = useMemo(() => {
    const client = createHttpClient({
      getToken: () => window.localStorage.getItem(AUTH_TOKEN_KEY),
      timeoutMs: 5000,
    });
    return createPlatformApi(client);
  }, []);

  const saveAuthResult = (result) => {
    if (result?.accessToken) window.localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
    if (result?.refreshToken) window.localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, result.refreshToken);
    if (result?.user) setAuthUser(result.user);
  };

  const refreshVerification = async (client = realApi) => {
    if (!window.localStorage.getItem(AUTH_TOKEN_KEY) && !window.localStorage.getItem(AUTH_REFRESH_TOKEN_KEY)) {
      setVerificationState(defaultVerificationState);
      return null;
    }

    const result = await client.verification.me().catch(() => null);
    if (result) {
      setVerificationState({
        loaded: true,
        verificationLevel: result.verificationLevel || 'registered',
        kycProfile: result.kycProfile || null,
        privacy: result.privacy || null,
        eligibility: result.eligibility || {},
      });
      return result;
    }

    setVerificationState((current) => ({ ...current, loaded: true }));
    return null;
  };

  const checkEligibility = async (action, context = {}) => {
    if (!authUser) {
      return { ok: false, message: 'Sign in first to continue with this action.' };
    }

    if (!backendStatus.available) {
      const cached = verificationState.eligibility?.[action];
      if (cached) return cached;
      return { ok: true, message: 'Demo mode is allowing this action locally.' };
    }

    const result = await realApi.verification.check({ action, context }).catch(() => null);
    const eligibility = result?.eligibility || { ok: false, message: 'Eligibility check failed.' };
    if (!Object.keys(context || {}).length) {
      setVerificationState((current) => ({
        ...current,
        loaded: true,
        eligibility: {
          ...(current.eligibility || {}),
          [action]: eligibility,
        },
      }));
    }
    return eligibility;
  };

  const applyBackendWallet = (backendWallet) => {
    if (!backendWallet) return;

    setState((current) => ({
      ...current,
      wallet: {
        ...current.wallet,
        balance: Number(backendWallet.balance) || 0,
        lockedDeposits: (backendWallet.holds || []).map((hold) => ({
          id: hold.id,
          carId: Number(hold.auctionId) || hold.auctionId,
          user: USERNAME,
          amount: Number(hold.amount) || 0,
          status: hold.status === 'locked' ? 'Locked' : 'Released',
          reason: 'Backend auction deposit hold',
          createdAt: hold.createdAt || 'Just now',
        })),
        transactions: (backendWallet.transactions || []).map((entry) => ({
          id: entry.id,
          type: entry.entryType || 'Ledger entry',
          amount: Number(entry.amount) || 0,
          note: entry.note || entry.referenceType || 'Backend wallet transaction',
          time: entry.createdAt || 'Just now',
        })),
      },
    }));
  };

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const connectBackend = async () => {
      try {
        await realApi.auth.getMe().catch(() => null);
        const client = createHttpClient({ timeoutMs: 3000 });
        await client.get('/health');
        if (cancelled) return;
        setBackendStatus({ checked: true, available: true, message: 'Connected to backend API.' });

        const [listingsResult, accessoriesResult] = await Promise.all([
          realApi.listings.list().catch(() => ({ listings: [] })),
          realApi.accessories.list().catch(() => ({ accessories: [] })),
        ]);
        if (!cancelled) {
          setBackendCatalog({
            listings: listingsResult.listings || [],
            accessories: accessoriesResult.accessories || [],
          });
        }

        const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
        const refreshToken = window.localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
        if (token || refreshToken) {
          let me = token ? await realApi.auth.getMe().catch(() => null) : null;
          if (!me?.user) {
            const refreshed = refreshToken ? await realApi.auth.refresh({ refreshToken }).catch(() => null) : null;
            if (refreshed?.accessToken) {
              saveAuthResult(refreshed);
              me = { user: refreshed.user };
            }
          }
          if (me?.user && !cancelled) {
            setAuthUser(me.user);
            const walletResult = await realApi.wallet.summary().catch(() => null);
            applyBackendWallet(walletResult?.wallet);
            await refreshVerification(realApi);
          } else if (!cancelled) {
            setVerificationState(defaultVerificationState);
          }
        }
        if (!cancelled) setAuthReady(true);
      } catch (error) {
        if (!cancelled) {
          setBackendStatus({ checked: true, available: false, message: 'Backend API offline. Using local demo mode.' });
          setAuthReady(true);
        }
      }
    };

    connectBackend();
    return () => {
      cancelled = true;
    };
  }, [realApi]);

  const applyRealtimeAuctionEvent = (event) => {
    if (event.type !== 'auction.bid_placed') return;
    const { auction, bid } = event.payload || {};
    if (!auction || !bid) return;

    setState((current) => {
      const auctionId = Number(auction.id) || auction.id;
      const listingId = Number(auction.listingId) || auction.listingId || auctionId;
      const currentAuction =
        current.auctions[auctionId] ||
        current.auctions[String(auctionId)] ||
        current.auctions[listingId] ||
        current.auctions[String(listingId)] ||
        createAuctionRecord(visibleCars.find((item) => String(item.id) === String(listingId)) || {});
      if (!currentAuction) return current;
      if (Number(currentAuction.highBid) >= Number(auction.highBid) && Number(currentAuction.bidsCount) >= Number(auction.bidsCount || 0)) return current;

      const stateKey = current.auctions[auctionId] || current.auctions[String(auctionId)] ? auctionId : listingId;
      return {
        ...current,
        auctions: {
          ...current.auctions,
          [stateKey]: {
            ...currentAuction,
            highBid: Number(auction.highBid) || currentAuction.highBid,
            bidsCount: Number(auction.bidsCount) || currentAuction.bidsCount,
            lastBidder: bid.bidderId === authUser?.id ? USERNAME : bid.bidderId || 'Live bidder',
            endsAt: new Date(auction.endsAt).getTime() || currentAuction.endsAt,
            extensions: Number(auction.extensionsCount) || currentAuction.extensions,
            spectators: Math.max(currentAuction.spectators || 0, Math.round((Number(auction.bidsCount) || currentAuction.bidsCount || 1) * 6)),
            bidHistory: [
              {
                user: bid.bidderId === authUser?.id ? USERNAME : bid.bidderId || 'Live bidder',
                amount: Number(bid.amount) || Number(auction.highBid),
                time: 'Live update',
              },
              ...(currentAuction.bidHistory || []),
            ].slice(0, 25),
          },
        },
      };
    });
  };

  useEffect(() => {
    if (!backendStatus.available) {
      setRealtimeStatus('offline');
      return undefined;
    }

    const stream = realtimeService.connect({
      token: window.localStorage.getItem(AUTH_TOKEN_KEY),
      channel: 'global',
      onOpen: () => setRealtimeStatus('connected'),
      onError: () => setRealtimeStatus('reconnecting'),
      onClose: () => setRealtimeStatus('offline'),
      onMessage: applyRealtimeAuctionEvent,
    });

    return () => stream.close();
  }, [backendStatus.available, authUser?.id]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getAuctionState = (car) => {
    if (!car || car.listingType !== 'Auction') return car;

    const live = state.auctions[car.id] || {};
    const fallback = createAuctionRecord(car, Date.now());
    const endsAt = live.endsAt || fallback.endsAt;
    const remainingMs = endsAt - tick;
    const isEnded = remainingMs <= 0;
    const highBid = live.highBid ?? car.highBid ?? 0;
    const reservePrice = live.reservePrice ?? fallback.reservePrice;
    const isReserveMet = car.reserveStatus === 'No reserve' || car.reserveStatus === 'Reserve met' || highBid >= reservePrice;
    const winner = isEnded && isReserveMet ? live.lastBidder : null;
    const userIsWinner = winner === USERNAME;

    return {
      ...car,
      highBid,
      reservePrice,
      reserveStatus: isReserveMet ? 'Reserve met' : car.reserveStatus || 'Reserve not met',
      isReserveMet,
      winner,
      userIsWinner,
      checkedOut: live.checkedOut || false,
      checkoutStartedAt: live.checkoutStartedAt || null,
      bidsCount: live.bidsCount ?? car.bidsCount ?? 0,
      bidHistory: live.bidHistory ?? car.bidHistory ?? [],
      lastBidder: live.lastBidder || null,
      extensions: live.extensions || 0,
      spectators: live.spectators ?? Math.max(12, Math.round((Number(car.watchers) || 0) * 0.35)),
      endsAt,
      endsInMinutes: Math.max(0, Math.ceil(remainingMs / 60000)),
      timeLeft: formatRemaining(endsAt),
      status: isEnded ? 'Ended' : 'Live',
      outcomeLabel: isEnded
        ? (winner ? (userIsWinner ? 'Won by you' : `Won by ${winner}`) : 'Ended below reserve')
        : (isReserveMet ? 'Reserve met' : 'Reserve not met'),
    };
  };

  const visibleCars = useMemo(() => {
    const approvedCars = state.submissions
      .filter((submission) => submission.status === 'Approved')
      .map((submission) => ({
        id: submission.id,
        year: Number(submission.year) || new Date().getFullYear(),
        make: submission.make || 'Unknown Make',
        model: submission.model || 'Unknown Model',
        variant: submission.variant || 'Submitted',
        name: `${submission.year || ''} ${submission.make || 'Submitted'} ${submission.model || 'Car'}`.trim(),
        vin: submission.vin || 'Pending VIN',
        titleStatus: submission.titleStatus || 'Pending review',
        location: submission.titleLocation || 'Pakistan',
        city: submission.titleLocation || 'Pakistan',
        seller: submission.fullName || 'Seller',
        sellerType: submission.sellerType,
        engine: 'Pending inspection',
        drivetrain: 'Pending inspection',
        transmission: submission.transmission || 'Pending',
        bodyStyle: submission.bodyStyle || 'Sedan',
        fuel: 'Pending',
        exteriorColor: 'Pending',
        interiorColor: 'Pending',
        mileage: `${submission.mileage || 0} km`,
        mileageValue: Number(submission.mileage) || 0,
        listingType: submission.listingType,
        status: submission.listingType === 'Auction' ? 'Scheduled' : 'Available',
        highBid: 0,
        buyNowPrice: Number(submission.askingPrice) || Number(submission.reservePrice) || 0,
        marketEstimate: Number(submission.askingPrice) || Number(submission.reservePrice) || 0,
        reservePrice: Number(submission.reservePrice) || Number(submission.askingPrice) || 0,
        reserveStatus: submission.listingType === 'Auction' ? 'Pending launch' : null,
        bidIncrement: Number(submission.bidIncrement) || 25000,
        bidsCount: 0,
        commentsCount: 0,
        watchers: 0,
        timeLeft: submission.listingType === 'Auction' ? 'Pending launch' : null,
        endsInMinutes: submission.listingType === 'Auction' ? 0 : null,
        auctionHeat: 0,
        dealScore: 75,
        trustScore: 70,
        inspectionScore: 0,
        recommendationScore: 70,
        tags: ['Seller submitted', submission.status],
        images: ['https://placehold.co/800x500?text=Seller+Submission'],
        highlights: [submission.specialOptions || 'Seller submitted listing awaiting inspection package.'],
        equipment: [],
        modifications: submission.modified === 'Modified' ? ['Seller reported modifications'] : [],
        knownFlaws: submission.hasFlaws ? ['Seller reported flaws; details pending review'] : [],
        serviceHistory: [],
        includedItems: [],
        ownershipHistory: submission.titledInName ? 'Seller reports title is in their name.' : 'Title ownership requires admin review.',
        sellerNotes: submission.referral || 'No seller notes yet.',
        videos: [],
        qa: [],
        bidHistory: [],
        comments: [],
      }));

    return [...carsData, ...approvedCars].map(getAuctionState);
  }, [state.submissions, state.auctions, tick]);
  const getCar = (id) => visibleCars.find((car) => car.id === Number(id));
  const liveAuctionCars = visibleCars.filter((car) => car.listingType === 'Auction');
  const watchedCars = state.watchlist
    .map((id) => visibleCars.find((car) => car.id === id))
    .filter(Boolean);
  const recentlyViewedCars = state.recentlyViewed
    .map((item) => visibleCars.find((car) => car.id === item.carId))
    .filter(Boolean);
  const rankedCars = rankHybridListings(visibleCars, state);
  const recommendedCars = rankedCars.slice(0, 8);
  const searchFacets = buildSearchFacets(visibleCars);
  const recommenderDiagnostics = {
    model: 'local_hybrid_content_collaborative',
    paidApiRequired: false,
    indexedVehicles: visibleCars.length,
    indexedAccessories: accessoriesData.length,
    weights: rankedCars[0]?.recommenderWeights || { content: 0.82, collaborative: 0.18 },
    topReasons: rankedCars[0]?.aiReasons || [],
    signals: {
      watchlist: state.watchlist.length,
      recentlyViewed: state.recentlyViewed.length,
      savedSearches: state.savedSearches.length,
      activeAuctions: liveAuctionCars.filter((car) => car.status === 'Live').length,
    },
    capabilities: ['typo_tolerance', 'synonyms', 'natural_language_filters', 'content_similarity', 'collaborative_behavior', 'auction_urgency', 'garage_accessory_fitment'],
  };
  const compareCars = state.compareIds
    .map((id) => visibleCars.find((car) => car.id === id))
    .filter(Boolean);
  const compatibleAccessories = accessoriesData.filter((accessory) => accessoryFitsVehicle(accessory, state.myGarage));
  const garageVehicles = (state.ownedVehicles || []).length ? state.ownedVehicles : [state.myGarage];
  const garageAccessorySuggestions = accessoriesData
    .flatMap((accessory) => garageVehicles.map((vehicle) => scoreGarageAccessory(accessory, vehicle, state)))
    .filter((suggestion) => suggestion.score > 20)
    .sort((a, b) => b.score - a.score)
    .reduce((unique, suggestion) => {
      if (!unique.some((item) => item.accessory.id === suggestion.accessory.id)) unique.push(suggestion);
      return unique;
    }, [])
    .slice(0, 12);
  const getAccessory = (id) => accessoriesData.find((accessory) => accessory.id === Number(id));
  const getAccessoriesForCar = (carId) => {
    const car = getCar(carId);
    return accessoriesData.filter((accessory) => accessoryFitsVehicle(accessory, car)).slice(0, 4);
  };
  const activeDepositLocks = state.wallet.lockedDeposits.filter((lock) => lock.status === 'Locked');
  const lockedDepositTotal = activeDepositLocks.reduce((total, lock) => total + lock.amount, 0);
  const availableWallet = Math.max(0, state.wallet.balance - lockedDepositTotal);

  const submitListing = async (submission) => {
    const requiredFields = ['fullName', 'phone', 'year', 'make', 'model'];
    const missingField = requiredFields.find((field) => !submission[field]);

    if (missingField) {
      return { ok: false, message: 'Please complete name, phone, year, make, and model before submitting.' };
    }

    if (!authUser) {
      return { ok: false, message: 'Sign in with your seller account before submitting a vehicle.' };
    }

    const action = submission.listingType === 'Auction' ? 'auction.create' : 'listing.create';
    const eligibility = await checkEligibility(action, { listingType: submission.listingType });
    if (!eligibility.ok) {
      return {
        ok: false,
        message: eligibility.message || 'Complete KYC and seller verification before submitting this vehicle.',
        eligibility,
      };
    }

    const listing = {
      ...submission,
      id: Date.now(),
      status: 'Pending Review',
      submittedAt: new Date().toLocaleString(),
      qualityScore: calculateQualityScore(submission),
      aiNotes: buildSubmissionNotes(submission),
    };

    setState((current) => ({
      ...current,
      submissions: [listing, ...current.submissions],
    }));

    return { ok: true, message: 'Listing submitted for admin review.', listing };
  };

  const updateSubmissionStatus = (id, status) => {
    setState((current) => {
      const submission = current.submissions.find((item) => item.id === id);
      const nextState = {
        ...current,
        submissions: current.submissions.map((item) =>
          item.id === id ? { ...item, status } : item
        ),
      };

      if (submission?.listingType === 'Auction' && status === 'Approved') {
        const auctionCar = {
          ...submission,
          id: submission.id,
          highBid: 0,
          bidsCount: 0,
          bidHistory: [],
          endsInMinutes: 10080,
          reservePrice: Number(submission.reservePrice) || Number(submission.askingPrice) || 0,
          marketEstimate: Number(submission.askingPrice) || Number(submission.reservePrice) || 0,
        };
        nextState.auctions = {
          ...current.auctions,
          [submission.id]: current.auctions[submission.id] || createAuctionRecord(auctionCar),
        };
      }

      return nextState;
    });
  };

  const setCurrentRole = (role) => {
    setState((current) => ({ ...current, currentRole: role }));
  };

  const trackView = (carId) => {
    const numericId = Number(carId);
    if (!numericId) return;

    setState((current) => ({
      ...current,
      recentlyViewed: [
        { carId: numericId, viewedAt: Date.now() },
        ...current.recentlyViewed.filter((item) => item.carId !== numericId),
      ].slice(0, 12),
    }));
  };

  const toggleWatchlist = (carId) => {
    const numericId = Number(carId);
    setState((current) => ({
      ...current,
      watchlist: current.watchlist.includes(numericId)
        ? current.watchlist.filter((id) => id !== numericId)
        : [numericId, ...current.watchlist],
    }));
  };

  const toggleCompare = (carId) => {
    const numericId = Number(carId);
    setState((current) => {
      if (current.compareIds.includes(numericId)) {
        return { ...current, compareIds: current.compareIds.filter((id) => id !== numericId) };
      }

      return { ...current, compareIds: [numericId, ...current.compareIds].slice(0, 4) };
    });
  };

  const setGarageVehicle = (vehicle) => {
    setState((current) => ({
      ...current,
      myGarage: {
        ...current.myGarage,
        ...vehicle,
        year: Number(vehicle.year) || current.myGarage.year,
      },
      ownedVehicles: (current.ownedVehicles || []).map((ownedVehicle) =>
        String(ownedVehicle.id) === String(current.myGarage.id)
          ? {
              ...ownedVehicle,
              ...vehicle,
              year: Number(vehicle.year) || ownedVehicle.year,
              odometerKm: vehicle.odometerKm === undefined ? ownedVehicle.odometerKm : Number(vehicle.odometerKm) || 0,
              marketValue: vehicle.marketValue === undefined ? ownedVehicle.marketValue : Number(vehicle.marketValue) || 0,
            }
          : ownedVehicle
      ),
    }));
  };

  const addOwnedVehicle = (vehicle) => {
    const newVehicle = {
      id: Date.now(),
      nickname: vehicle.nickname || `${vehicle.year || new Date().getFullYear()} ${vehicle.make || 'New'} ${vehicle.model || 'Vehicle'}`.trim(),
      year: Number(vehicle.year) || new Date().getFullYear(),
      make: vehicle.make || 'Unknown Make',
      model: vehicle.model || 'Unknown Model',
      variant: vehicle.variant || 'Base',
      engine: vehicle.engine || 'Pending',
      bodyStyle: vehicle.bodyStyle || 'Sedan',
      powertrain: vehicle.powertrain || 'Petrol',
      registration: vehicle.registration || 'Unregistered',
      vin: vehicle.vin || 'VIN pending',
      ownershipStatus: vehicle.ownershipStatus || 'Owned',
      odometerKm: Number(vehicle.odometerKm) || 0,
      marketValue: Number(vehicle.marketValue) || 0,
      photos: vehicle.photoUrl ? [vehicle.photoUrl] : [],
      visibility: vehicle.visibility || 'private',
      archived: false,
      countsTowardRankings: true,
      nextServiceKm: Number(vehicle.nextServiceKm) || ((Number(vehicle.odometerKm) || 0) + 5000),
      documents: [
        { id: Date.now() + 1, type: 'Registration book', status: vehicle.registration ? 'Needs verification' : 'Missing', expiresAt: 'Add date' },
        { id: Date.now() + 2, type: 'Insurance', status: 'Add details', expiresAt: 'Add date' },
      ],
      serviceHistory: [],
      reminders: [
        { id: Date.now() + 3, type: 'Service', due: 'Set schedule', priority: 'medium' },
      ],
      expenses: [],
    };

    setState((current) => ({
      ...current,
      ownedVehicles: [newVehicle, ...(current.ownedVehicles || [])],
      myGarage: newVehicle,
    }));

    return newVehicle;
  };

  const updateOwnedVehicle = (vehicleId, patch) => {
    setState((current) => {
      const ownedVehicles = (current.ownedVehicles || []).map((vehicle) =>
        String(vehicle.id) === String(vehicleId)
          ? {
              ...vehicle,
              ...patch,
              year: patch.year === undefined ? vehicle.year : Number(patch.year) || vehicle.year,
              odometerKm: patch.odometerKm === undefined ? vehicle.odometerKm : Number(patch.odometerKm) || 0,
              marketValue: patch.marketValue === undefined ? vehicle.marketValue : Number(patch.marketValue) || 0,
            }
          : vehicle
      );
      const updatedPrimary = ownedVehicles.find((vehicle) => String(vehicle.id) === String(current.myGarage.id));

      return {
        ...current,
        ownedVehicles,
        myGarage: updatedPrimary || current.myGarage,
      };
    });
  };

  const setPrimaryGarageVehicle = (vehicleId) => {
    setState((current) => {
      const selectedVehicle = (current.ownedVehicles || []).find((vehicle) => String(vehicle.id) === String(vehicleId));
      if (!selectedVehicle) return current;

      return {
        ...current,
        myGarage: selectedVehicle,
      };
    });
  };

  const addVehicleServiceRecord = (vehicleId, record) => {
    const serviceRecord = {
      id: Date.now(),
      date: record.date || new Date().toISOString().slice(0, 10),
      title: record.title || 'Service record',
      mileageKm: Number(record.mileageKm) || 0,
      cost: Number(record.cost) || 0,
      workshop: record.workshop || 'Workshop',
    };

    setState((current) => ({
      ...current,
      ownedVehicles: (current.ownedVehicles || []).map((vehicle) =>
        String(vehicle.id) === String(vehicleId)
          ? { ...vehicle, serviceHistory: [serviceRecord, ...(vehicle.serviceHistory || [])] }
          : vehicle
      ),
    }));

    return serviceRecord;
  };

  const addVehicleReminder = (vehicleId, reminder) => {
    const newReminder = {
      id: Date.now(),
      type: reminder.type || 'Reminder',
      due: reminder.due || 'Set due date',
      priority: reminder.priority || 'medium',
    };

    setState((current) => ({
      ...current,
      ownedVehicles: (current.ownedVehicles || []).map((vehicle) =>
        String(vehicle.id) === String(vehicleId)
          ? { ...vehicle, reminders: [newReminder, ...(vehicle.reminders || [])] }
          : vehicle
      ),
    }));

    return newReminder;
  };

  const toggleAccessoryWishlist = (accessoryId) => {
    const numericId = Number(accessoryId);
    setState((current) => ({
      ...current,
      accessoryWishlist: current.accessoryWishlist.includes(numericId)
        ? current.accessoryWishlist.filter((id) => id !== numericId)
        : [numericId, ...current.accessoryWishlist],
    }));
  };

  const addAccessoryToCart = (accessoryId, quantity = 1) => {
    const numericId = Number(accessoryId);
    const item = accessoriesData.find((accessory) => accessory.id === numericId);
    if (!item) return { ok: false, message: 'Accessory not found.' };
    const nextQuantity = Math.max(1, Number(quantity) || 1);

    setState((current) => {
      const existing = current.accessoryCart.find((entry) => entry.accessoryId === numericId);
      const cart = existing
        ? current.accessoryCart.map((entry) => (
            entry.accessoryId === numericId
              ? { ...entry, quantity: Math.min(item.stock || 1, entry.quantity + nextQuantity) }
              : entry
          ))
        : [{ accessoryId: numericId, quantity: Math.min(item.stock || 1, nextQuantity), addedAt: 'Just now' }, ...current.accessoryCart];

      return {
        ...current,
        accessoryCart: cart,
        notifications: [
          buildNotification('order', 'Accessory added to cart', `${item.name} is ready for fitment checkout.`, '/accessory-cart'),
          ...current.notifications,
        ],
      };
    });

    return { ok: true, message: `${item.name} added to cart.` };
  };

  const updateAccessoryCartQuantity = (accessoryId, quantity) => {
    const numericId = Number(accessoryId);
    const item = accessoriesData.find((accessory) => accessory.id === numericId);
    const nextQuantity = Math.max(1, Math.min(item?.stock || 1, Number(quantity) || 1));
    setState((current) => ({
      ...current,
      accessoryCart: current.accessoryCart.map((entry) => (
        entry.accessoryId === numericId ? { ...entry, quantity: nextQuantity } : entry
      )),
    }));
  };

  const removeAccessoryFromCart = (accessoryId) => {
    const numericId = Number(accessoryId);
    setState((current) => ({
      ...current,
      accessoryCart: current.accessoryCart.filter((entry) => entry.accessoryId !== numericId),
    }));
  };

  const clearAccessoryCart = () => {
    setState((current) => ({ ...current, accessoryCart: [] }));
  };

  const placeAccessoryOrder = ({ deliveryMethod = 'Courier delivery', address = '', paymentMethod = 'Wallet / COD placeholder', notes = '' } = {}) => {
    const cartItems = state.accessoryCart
      .map((entry) => {
        const accessory = accessoriesData.find((item) => item.id === entry.accessoryId);
        if (!accessory) return null;
        return {
          ...entry,
          accessory,
          subtotal: accessory.price * entry.quantity,
          fitsGarage: accessoryFitsVehicle(accessory, state.myGarage),
          fulfillment: getAccessoryFulfillment(accessory),
        };
      })
      .filter(Boolean);

    if (!cartItems.length) return { ok: false, message: 'Your accessory cart is empty.' };

    const hasFitmentWarning = cartItems.some((entry) => !entry.fitsGarage && entry.accessory.fitmentType !== 'Universal');
    const subtotal = cartItems.reduce((sum, entry) => sum + entry.subtotal, 0);
    const hasCourierBlocked = cartItems.some((entry) => !entry.fulfillment.courierAllowed);
    const hasInstallRequired = cartItems.some((entry) => entry.fulfillment.installRequired);
    const deliveryOptions = [
      ...(hasCourierBlocked ? [] : ['Courier delivery']),
      'Pickup from seller',
      ...(hasInstallRequired ? ['Seller/workshop installation appointment'] : []),
      'Arrange through Wheels and Deals',
    ];
    const normalizedDeliveryMethod = deliveryOptions.includes(deliveryMethod) ? deliveryMethod : deliveryOptions[0];
    const deliveryFee =
      normalizedDeliveryMethod === 'Courier delivery' ? 650 :
      normalizedDeliveryMethod === 'Arrange through Wheels and Deals' ? 1200 :
      0;
    const serviceFee = Math.round(subtotal * 0.015);
    const total = subtotal + deliveryFee + serviceFee;
    const order = {
      id: Date.now(),
      type: 'Accessory',
      title: `${cartItems.length} accessory item${cartItems.length > 1 ? 's' : ''}`,
      amount: total,
      status: hasFitmentWarning ? 'Fitment review needed' : 'Awaiting seller confirmation',
      next: hasFitmentWarning ? 'Confirm fitment or choose a different garage vehicle before payment.' : 'Seller confirms stock, delivery, and payment handoff.',
      deliveryMethod: normalizedDeliveryMethod,
      subtotal,
      deliveryFee,
      serviceFee,
      address,
      paymentMethod,
      notes,
      createdAt: 'Just now',
      items: cartItems.map((entry) => ({
        accessoryId: entry.accessory.id,
        name: entry.accessory.name,
        seller: entry.accessory.seller,
        city: entry.accessory.city,
        quantity: entry.quantity,
        price: entry.accessory.price,
        subtotal: entry.subtotal,
        fitmentType: entry.accessory.fitmentType,
        fitsGarage: entry.fitsGarage,
        fulfillment: entry.fulfillment.fulfillment,
        installRequired: entry.fulfillment.installRequired,
        courierAllowed: entry.fulfillment.courierAllowed,
        meetupRecommended: entry.fulfillment.meetupRecommended,
      })),
      timeline: [
        { label: 'Created', status: 'done' },
        { label: hasFitmentWarning ? 'Fitment review' : 'Seller confirmation', status: 'active' },
        { label: 'Payment / pickup', status: 'pending' },
        { label: 'Closed', status: 'pending' },
      ],
    };

    setState((current) => ({
      ...current,
      accessoryOrders: [order, ...current.accessoryOrders],
      accessoryCart: [],
      notifications: [
        buildNotification('order', 'Accessory order created', `${order.title} is now in My Orders.`, '/orders'),
        ...current.notifications,
      ],
    }));

    return { ok: true, message: 'Accessory order created. Track seller confirmation in My Orders.', orderId: order.id };
  };

  const subscribeToAuctionRoom = (auctionId, handlers = {}) => {
    if (!backendStatus.available || !auctionId) {
      handlers.onStatus?.('offline');
      return { close: () => {}, readyState: 'offline' };
    }

    return realtimeService.connectToAuction(auctionId, {
      token: window.localStorage.getItem(AUTH_TOKEN_KEY),
      onOpen: (event) => {
        realApi.auctions.watch(auctionId, {
          anonymousId: window.localStorage.getItem('wheels_deals_visitor_id') || (() => {
            const id = `visitor_${Math.random().toString(36).slice(2)}_${Date.now()}`;
            window.localStorage.setItem('wheels_deals_visitor_id', id);
            return id;
          })(),
        }).catch(() => null);
        handlers.onStatus?.('connected');
        handlers.onOpen?.(event);
      },
      onClose: () => {
        handlers.onStatus?.('offline');
        handlers.onClose?.();
      },
      onError: (error) => {
        handlers.onStatus?.('reconnecting');
        handlers.onError?.(error);
      },
      onMessage: (event) => {
        applyRealtimeAuctionEvent(event);
        handlers.onMessage?.(event);
      },
    });
  };

  const updateAccessoryOrderStatus = (orderId, status, note = '') => {
    let nextOrder = null;
    setState((current) => ({
      ...current,
      accessoryOrders: (current.accessoryOrders || []).map((order) => {
        if (String(order.id) !== String(orderId)) return order;
        nextOrder = {
          ...order,
          status,
          next: note || order.next,
          timeline: (order.timeline || []).map((step) => {
            if (status === 'Seller confirmed' && step.label === 'Seller confirmation') return { ...step, status: 'done' };
            if (status === 'Ready for pickup/install' && step.label === 'Payment / pickup') return { ...step, status: 'active' };
            if (status === 'Completed' && step.label === 'Closed') return { ...step, status: 'done' };
            if (status === 'Disputed' && step.label === 'Closed') return { ...step, status: 'active', label: 'Dispute' };
            return step;
          }),
          sellerNote: note || order.sellerNote,
          updatedAt: 'Just now',
        };
        return nextOrder;
      }),
      notifications: [
        buildNotification('order', 'Accessory order updated', `Order ${orderId} is now ${status}.`, '/orders'),
        ...current.notifications,
      ],
    }));
    return { ok: true, message: nextOrder ? `Order marked ${status}.` : 'Order update queued.' };
  };

  const scheduleAccessoryOrder = (orderId, slot, note = '') => {
    setState((current) => ({
      ...current,
      accessoryOrders: (current.accessoryOrders || []).map((order) =>
        String(order.id) === String(orderId)
          ? {
              ...order,
              status: 'Pickup/install scheduled',
              next: note || `Scheduled for ${slot}.`,
              pickupSlot: slot,
              sellerNote: note,
              updatedAt: 'Just now',
            }
          : order
      ),
      notifications: [
        buildNotification('order', 'Pickup/install scheduled', `Accessory order ${orderId} has a seller schedule.`, '/orders'),
        ...current.notifications,
      ],
    }));
    return { ok: true, message: `Order scheduled for ${slot}.` };
  };

  const clearCompare = () => {
    setState((current) => ({ ...current, compareIds: [] }));
  };

  const saveSearch = (filters) => {
    const normalized = {
      ...filters,
      id: Date.now(),
      savedAt: new Date().toLocaleString(),
    };

    setState((current) => ({
      ...current,
      savedSearches: [normalized, ...current.savedSearches].slice(0, 8),
    }));
  };

  const removeSavedSearch = (searchId) => {
    setState((current) => ({
      ...current,
      savedSearches: current.savedSearches.filter((search) => search.id !== searchId),
    }));
  };

  const createPost = (post) => {
    const requiredFields = ['forumId', 'title', 'body'];
    const missingField = requiredFields.find((field) => !post[field]);

    if (missingField) {
      return { ok: false, message: 'Choose a forum and add a title and body.' };
    }

    const newPost = {
      id: Date.now(),
      forumId: post.forumId,
      title: post.title,
      body: post.body,
      author: USERNAME,
      flair: post.flair || 'Discussion',
      listingId: post.listingId ? Number(post.listingId) : null,
      votes: 1,
      createdAt: 'Just now',
      reports: 0,
      comments: [],
      isPinned: false,
      isLocked: false,
      isDeleted: false,
    };

    setState((current) => ({
      ...current,
      posts: [newPost, ...current.posts],
    }));

    return { ok: true, message: 'Post published.', post: newPost };
  };

  const votePost = (postId, direction) => {
    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId) ? { ...post, votes: post.votes + direction } : post
      ),
    }));
  };

  const toggleSavedPost = (postId) => {
    const numericId = Number(postId);
    setState((current) => ({
      ...current,
      savedPosts: current.savedPosts.includes(numericId)
        ? current.savedPosts.filter((id) => id !== numericId)
        : [numericId, ...current.savedPosts],
    }));
  };

  const editPost = (postId, updates) => {
    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId) ? { ...post, ...updates, editedAt: 'Just now' } : post
      ),
    }));
  };

  const deletePost = (postId) => {
    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId) ? { ...post, isDeleted: true, title: '[deleted]', body: 'This post was deleted.' } : post
      ),
    }));
  };

  const pinPost = (postId) => {
    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId) ? { ...post, isPinned: !post.isPinned } : post
      ),
    }));
  };

  const lockPost = (postId) => {
    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId) ? { ...post, isLocked: !post.isLocked } : post
      ),
    }));
  };

  const addComment = (postId, body) => {
    if (!body.trim()) return { ok: false, message: 'Write a comment first.' };

    const targetPost = state.posts.find((post) => post.id === Number(postId));
    if (targetPost?.isLocked) return { ok: false, message: 'This post is locked.' };

    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId)
          ? {
              ...post,
              comments: [
                ...post.comments,
                {
                  id: Date.now(),
                  author: USERNAME,
                  body,
                  votes: 1,
                  createdAt: 'Just now',
                  reports: 0,
                  replies: [],
                  isBestAnswer: false,
                },
              ],
            }
          : post
      ),
    }));

    return { ok: true, message: 'Comment added.' };
  };

  const reportPost = (postId) => {
    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId) ? { ...post, reports: post.reports + 1 } : post
      ),
    }));
  };

  const resolvePostReports = (postId) => {
    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId) ? { ...post, reports: 0 } : post
      ),
    }));
  };

  const voteComment = (postId, commentId, direction) => {
    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId)
          ? {
              ...post,
              comments: post.comments.map((comment) =>
                comment.id === Number(commentId) ? { ...comment, votes: comment.votes + direction } : comment
              ),
            }
          : post
      ),
    }));
  };

  const reportComment = (postId, commentId) => {
    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId)
          ? {
              ...post,
              comments: post.comments.map((comment) =>
                comment.id === Number(commentId) ? { ...comment, reports: (comment.reports || 0) + 1 } : comment
              ),
            }
          : post
      ),
    }));
  };

  const addReply = (postId, commentId, body) => {
    if (!body.trim()) return { ok: false, message: 'Write a reply first.' };

    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId)
          ? {
              ...post,
              comments: post.comments.map((comment) =>
                comment.id === Number(commentId)
                  ? {
                      ...comment,
                      replies: [
                        ...(comment.replies || []),
                        {
                          id: Date.now(),
                          author: USERNAME,
                          body,
                          votes: 1,
                          createdAt: 'Just now',
                        },
                      ],
                    }
                  : comment
              ),
            }
          : post
      ),
    }));

    return { ok: true, message: 'Reply added.' };
  };

  const markBestAnswer = (postId, commentId) => {
    setState((current) => ({
      ...current,
      posts: current.posts.map((post) =>
        post.id === Number(postId)
          ? {
              ...post,
              comments: post.comments.map((comment) => ({
                ...comment,
                isBestAnswer: comment.id === Number(commentId) ? !comment.isBestAnswer : false,
              })),
            }
          : post
      ),
    }));
  };

  const markNotificationRead = (notificationId) => {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.id === Number(notificationId) ? { ...notification, read: true } : notification
      ),
    }));
  };

  const markAllNotificationsRead = () => {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) => ({ ...notification, read: true })),
    }));
  };

  const sendMessage = (listingId, body) => {
    if (!body.trim()) return { ok: false, message: 'Write a message first.' };

    const car = visibleCars.find((item) => item.id === Number(listingId));
    if (!car) return { ok: false, message: 'Listing not found.' };

    setState((current) => {
      const existing = current.conversations.find((conversation) => conversation.listingId === Number(listingId));
      const newMessage = { id: Date.now(), from: USERNAME, body, time: 'Just now' };

      if (existing) {
        return {
          ...current,
          conversations: current.conversations.map((conversation) =>
            conversation.id === existing.id
              ? { ...conversation, updatedAt: 'Just now', messages: [...conversation.messages, newMessage] }
              : conversation
          ),
        };
      }

      return {
        ...current,
        conversations: [
          {
            id: Date.now(),
            listingId: Number(listingId),
            seller: car.seller,
            buyer: USERNAME,
            updatedAt: 'Just now',
            messages: [newMessage],
          },
          ...current.conversations,
        ],
      };
    });

    return { ok: true, message: 'Message sent.' };
  };

  const login = async ({ email, password }) => {
    try {
      const result = await realApi.auth.login({ email, password });
      saveAuthResult(result);
      setBackendStatus({ checked: true, available: true, message: 'Connected to backend API.' });
      const walletResult = await realApi.wallet.summary().catch(() => null);
      applyBackendWallet(walletResult?.wallet);
      await refreshVerification(realApi);
      return { ok: true, message: 'Logged in with backend account.', user: result.user };
    } catch (error) {
      return { ok: false, message: error.message || 'Login failed.' };
    }
  };

  const register = async ({ fullName, email, password, phone, city, accountType, businessName }) => {
    try {
      const result = await realApi.auth.register({ fullName, email, password, phone, city, accountType, businessName });
      saveAuthResult(result);
      setBackendStatus({ checked: true, available: true, message: 'Connected to backend API.' });
      const walletResult = await realApi.wallet.summary().catch(() => null);
      applyBackendWallet(walletResult?.wallet);
      await refreshVerification(realApi);
      return { ok: true, message: 'Account created and connected to backend.', user: result.user };
    } catch (error) {
      return { ok: false, message: error.message || 'Signup failed.' };
    }
  };

  const logout = async () => {
    await realApi.auth.logout().catch(() => null);
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    setAuthUser(null);
    setVerificationState(defaultVerificationState);
    return { ok: true, message: 'Logged out.' };
  };

  const deposit = async (amount) => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return { ok: false, message: 'Enter a valid deposit amount.' };
    }

    if (backendStatus.available && authUser) {
      try {
        const result = await realApi.wallet.createTopUpIntent({ amount: numericAmount });
        applyBackendWallet(result.wallet);
        return { ok: true, message: `Deposited PKR ${numericAmount.toLocaleString()} through backend ledger.` };
      } catch (error) {
        return { ok: false, message: error.message || 'Backend deposit failed.' };
      }
    }

    setState((current) => ({
      ...current,
      wallet: {
        ...current.wallet,
        balance: current.wallet.balance + numericAmount,
        transactions: [
          {
            id: Date.now(),
            type: 'Deposit',
            amount: numericAmount,
            note: 'Demo wallet top-up',
            time: 'Just now',
          },
          ...current.wallet.transactions,
        ],
      },
    }));

    return { ok: true, message: `Deposited PKR ${numericAmount.toLocaleString()}.` };
  };

  const withdraw = (amount) => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return { ok: false, message: 'Enter a valid withdrawal amount.' };
    }

    if (numericAmount > availableWallet) {
      return { ok: false, message: 'Withdrawal exceeds available demo balance after locked auction deposits.' };
    }

    setState((current) => ({
      ...current,
      wallet: {
        ...current.wallet,
        balance: current.wallet.balance - numericAmount,
        transactions: [
          {
            id: Date.now(),
            type: 'Withdrawal',
            amount: -numericAmount,
            note: 'Demo wallet withdrawal',
            time: 'Just now',
          },
          ...current.wallet.transactions,
        ],
      },
    }));

    return { ok: true, message: `Withdrew PKR ${numericAmount.toLocaleString()}.` };
  };

  const placeBid = async (carId, amount) => {
    const numericAmount = Number(amount);
    const baseCar = visibleCars.find((car) => car.id === Number(carId));

    if (!baseCar || baseCar.listingType !== 'Auction') {
      return { ok: false, message: 'Bidding is only available on auction listings.' };
    }

    const live = getAuctionState(baseCar);
    const nextBid = live.highBid + live.bidIncrement;
    const requiredDeposit = getRequiredDeposit(numericAmount);

    if (live.status === 'Ended') {
      return { ok: false, message: 'This auction has ended.' };
    }

    if (!authUser) {
      return { ok: false, message: 'Sign in and verify your account before placing a bid.' };
    }

    if (!numericAmount || numericAmount < nextBid) {
      return { ok: false, message: `Minimum next bid is PKR ${nextBid.toLocaleString()}.` };
    }

    if (live.lastBidder === USERNAME) {
      return { ok: false, message: 'You are already the highest bidder.' };
    }

    const existingLock = activeDepositLocks.find((lock) => lock.carId === baseCar.id && lock.user === USERNAME);
    const availableWithExistingLock = availableWallet + (existingLock?.amount || 0);

    if (availableWithExistingLock < requiredDeposit) {
      return {
        ok: false,
        message: `Add at least PKR ${(requiredDeposit - availableWithExistingLock).toLocaleString()} more to your wallet deposit before bidding.`,
        requiredDeposit,
      };
    }

    const bidEligibility = await checkEligibility('bid', { auctionId: baseCar.id, amount: numericAmount });
    if (!bidEligibility.ok) {
      return {
        ok: false,
        message: bidEligibility.message || 'Complete KYC and deposit verification before bidding.',
        requiredDeposit,
        eligibility: bidEligibility,
      };
    }

    const existsInBackend = backendCatalog.listings.some((listing) => String(listing.id) === String(baseCar.id));
    if (backendStatus.available && authUser && existsInBackend) {
      try {
        await realApi.auctions.placeBid(baseCar.id, {
          amount: numericAmount,
          idempotencyKey: `bid_${baseCar.id}_${authUser.id || 'user'}_${numericAmount}_${Date.now()}`,
        });
        const walletResult = await realApi.wallet.summary().catch(() => null);
        applyBackendWallet(walletResult?.wallet);
      } catch (error) {
        return { ok: false, message: error.message || 'Backend bid failed.', requiredDeposit };
      }
    }

    setState((current) => {
      const auction = current.auctions[baseCar.id] || createAuctionRecord(baseCar);
      const remainingMs = auction.endsAt - Date.now();
      const shouldExtend = remainingMs > 0 && remainingMs <= 120000;
      const endsAt = shouldExtend ? Date.now() + 120000 : auction.endsAt;
      const locksWithoutCurrentCar = current.wallet.lockedDeposits.filter((lock) => !(lock.carId === baseCar.id && lock.user === USERNAME && lock.status === 'Locked'));

      return {
        ...current,
        auctions: {
          ...current.auctions,
          [baseCar.id]: {
            ...auction,
            highBid: numericAmount,
            bidsCount: auction.bidsCount + 1,
            lastBidder: USERNAME,
            extensions: auction.extensions + (shouldExtend ? 1 : 0),
            spectators: Math.max(auction.spectators || 0, Math.round((auction.bidsCount + 1) * 7)),
            endsAt,
            bidHistory: [
              {
                user: USERNAME,
                amount: numericAmount,
                time: 'Just now',
              },
              ...auction.bidHistory,
            ],
          },
        },
        wallet: {
          ...current.wallet,
          lockedDeposits: [
            {
              id: Date.now(),
              carId: baseCar.id,
              user: USERNAME,
              amount: requiredDeposit,
              status: 'Locked',
              reason: `${baseCar.name} bid eligibility`,
              createdAt: 'Just now',
            },
            ...locksWithoutCurrentCar,
          ],
          transactions: [
            {
              id: Date.now(),
              type: 'Bid verified',
              amount: 0,
              note: `${baseCar.name} - ${numericAmount.toLocaleString()}`,
              time: 'Just now',
            },
            ...current.wallet.transactions,
          ],
        },
        notifications: [
          buildNotification('auction', 'Bid placed', `You are the high bidder on ${baseCar.name}.`, `/listing/${baseCar.id}`),
          ...current.notifications,
        ],
      };
    });

    return {
      ok: true,
      message: 'Bid placed. You are currently the highest bidder.',
      requiredDeposit,
    };
  };

  const endAuction = (carId) => {
    const car = getCar(carId);
    if (!car || car.listingType !== 'Auction') return { ok: false, message: 'Auction listing not found.' };

    setState((current) => {
      const auction = current.auctions[car.id] || createAuctionRecord(car);
      const reservePrice = auction.reservePrice ?? car.reservePrice ?? 0;
      const reserveMet = auction.highBid >= reservePrice;
      const winner = reserveMet ? auction.lastBidder : null;
      const title = winner === USERNAME ? 'You won an auction' : 'Auction ended';
      const body = winner
        ? `${car.name} ended at PKR ${auction.highBid.toLocaleString()}.`
        : `${car.name} ended below reserve.`;

      return {
        ...current,
        auctions: {
          ...current.auctions,
          [car.id]: {
            ...auction,
            endsAt: Date.now() - 1000,
          },
        },
        notifications: [
          buildNotification('auction', title, body, `/listing/${car.id}`),
          ...current.notifications,
        ],
      };
    });

    return { ok: true, message: 'Auction ended and bidders were notified.' };
  };

  const reopenAuction = (carId, minutes = 1440) => {
    const car = getCar(carId);
    if (!car || car.listingType !== 'Auction') return { ok: false, message: 'Auction listing not found.' };

    setState((current) => {
      const auction = current.auctions[car.id] || createAuctionRecord(car);
      return {
        ...current,
        auctions: {
          ...current.auctions,
          [car.id]: {
            ...auction,
            endsAt: Date.now() + Number(minutes) * 60000,
            checkedOut: false,
            checkoutStartedAt: null,
          },
        },
        notifications: [
          buildNotification('auction', 'Auction reopened', `${car.name} is live again.`, `/listing/${car.id}`),
          ...current.notifications,
        ],
      };
    });

    return { ok: true, message: 'Auction reopened.' };
  };

  const checkoutAuction = (carId) => {
    const car = getCar(carId);
    if (!car || car.listingType !== 'Auction') return { ok: false, message: 'Auction listing not found.' };
    if (car.status !== 'Ended') return { ok: false, message: 'Checkout opens after the auction ends.' };
    if (!car.userIsWinner) return { ok: false, message: 'Only the winning bidder can start checkout.' };

    setState((current) => {
      const auction = current.auctions[car.id] || createAuctionRecord(car);
      return {
        ...current,
        auctions: {
          ...current.auctions,
          [car.id]: {
            ...auction,
            checkedOut: true,
            checkoutStartedAt: 'Just now',
          },
        },
        wallet: {
          ...current.wallet,
          transactions: [
            {
              id: Date.now(),
              type: 'Checkout started',
              amount: 0,
              note: `${car.name} winning bid handoff`,
              time: 'Just now',
            },
            ...current.wallet.transactions,
          ],
        },
        notifications: [
          buildNotification('auction', 'Checkout started', `Next steps opened for ${car.name}.`, `/checkout/${car.id}`),
          ...current.notifications,
        ],
      };
    });

    return { ok: true, message: 'Checkout started. Seller handoff, payment, and transfer steps are ready.' };
  };

  const releaseDepositLock = (carId) => {
    const car = getCar(carId);
    if (!car) return { ok: false, message: 'Listing not found.' };

    setState((current) => ({
      ...current,
      wallet: {
        ...current.wallet,
        lockedDeposits: current.wallet.lockedDeposits.map((lock) =>
          lock.carId === Number(carId) && lock.user === USERNAME && lock.status === 'Locked'
            ? { ...lock, status: 'Released', releasedAt: 'Just now' }
            : lock
        ),
        transactions: [
          {
            id: Date.now(),
            type: 'Deposit released',
            amount: 0,
            note: `${car.name} deposit hold released`,
            time: 'Just now',
          },
          ...current.wallet.transactions,
        ],
      },
    }));

    return { ok: true, message: 'Deposit hold released.' };
  };

  const resetDemoState = () => {
    const freshState = createInitialState();
    setState(freshState);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
  };

  const api = useMemo(() => createMockPlatformApi({
    getState: () => state,
    getListings: () => visibleCars,
    actions: {
      placeBid,
      endAuction,
      reopenAuction,
      checkoutAuction,
      releaseDepositLock,
    },
  }), [state, visibleCars]);

  const activeApi = backendStatus.available ? realApi : api;
  const hasRole = (...roles) => Boolean(authUser?.roles?.some((role) => roles.includes(role)));

  const value = useMemo(() => ({
    api: activeApi,
    authReady,
    backendStatus,
    realtimeStatus,
    backendCatalog,
    authUser,
    isAuthenticated: Boolean(authUser),
    hasRole,
    verification: verificationState,
    refreshVerification,
    checkEligibility,
    wallet: state.wallet,
    availableWallet,
    lockedDepositTotal,
    activeDepositLocks,
    currentRole: state.currentRole,
    submissions: state.submissions,
    watchlist: state.watchlist,
    savedSearches: state.savedSearches,
    recentlyViewed: state.recentlyViewed,
    savedPosts: state.savedPosts,
    compareIds: state.compareIds,
    accessoryWishlist: state.accessoryWishlist,
    accessoryCart: state.accessoryCart,
    accessoryOrders: state.accessoryOrders,
    myGarage: state.myGarage,
    ownedVehicles: state.ownedVehicles || [],
    compareCars,
    accessories: accessoriesData,
    compatibleAccessories,
    garageAccessorySuggestions,
    notifications: state.notifications,
    conversations: state.conversations,
    userProfile: state.userProfile,
    forums: state.forums,
    garageRankings: state.garageRankings,
    dealerRankings: state.dealerRankings,
    communityRankings: state.communityRankings,
    repairShopRankings: state.repairShopRankings,
    posts: state.posts,
    faqs: state.faqs,
    watchedCars,
    recentlyViewedCars,
    recommendedCars,
    rankedCars,
    searchFacets,
    recommenderDiagnostics,
    visibleCars,
    liveAuctionCars,
    getCar,
    getAccessory,
    getAccessoriesForCar,
    getAuctionState,
    placeBid,
    login,
    register,
    logout,
    endAuction,
    reopenAuction,
    checkoutAuction,
    releaseDepositLock,
    deposit,
    withdraw,
    submitListing,
    updateSubmissionStatus,
    setCurrentRole,
    trackView,
    toggleWatchlist,
    toggleCompare,
    setGarageVehicle,
    addOwnedVehicle,
    updateOwnedVehicle,
    setPrimaryGarageVehicle,
    addVehicleServiceRecord,
    addVehicleReminder,
    toggleAccessoryWishlist,
    addAccessoryToCart,
    updateAccessoryCartQuantity,
    removeAccessoryFromCart,
    clearAccessoryCart,
    placeAccessoryOrder,
    subscribeToAuctionRoom,
    updateAccessoryOrderStatus,
    scheduleAccessoryOrder,
    clearCompare,
    saveSearch,
    removeSavedSearch,
    createPost,
    votePost,
    toggleSavedPost,
    editPost,
    deletePost,
    pinPost,
    lockPost,
    addComment,
    reportPost,
    resolvePostReports,
    voteComment,
    reportComment,
    addReply,
    markBestAnswer,
    markNotificationRead,
    markAllNotificationsRead,
    sendMessage,
    resetDemoState,
    getRequiredDeposit,
  }), [state, tick, activeApi, authReady, backendStatus, backendCatalog, authUser, realtimeStatus, verificationState]);

  return (
    <AuctionContext.Provider value={value}>
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuctions = () => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuctions must be used inside AuctionProvider');
  }
  return context;
};
