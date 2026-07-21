const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));

const words = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter(Boolean);

const textIncludes = (value, term) => String(value || '').toLowerCase().includes(String(term || '').toLowerCase());

export const listingPrice = (listing = {}) => Number(
  listing.askingPrice ||
  listing.buyNowPrice ||
  listing.marketEstimate ||
  listing.highBid ||
  listing.reservePrice ||
  0
);

export const auctionForListing = (store, listing = {}) => store.auctions.find((auction) => String(auction.listingId) === String(listing.id));

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const sameText = (a, b) => normalizeText(a) && normalizeText(a) === normalizeText(b);

const numericValue = (...values) => {
  const found = values.find((value) => Number(value) > 0);
  return found === undefined ? 0 : Number(found);
};

export const pakistanValuationModel = Object.freeze({
  name: 'pakistan_comparable_hedonic_v1',
  market: 'PK',
  currency: 'PKR',
  trainedStatus: 'baseline_ready_waiting_for_historical_sales',
  intendedDataSources: [
    'Pakistan used-car listing exports',
    'PakWheels-style historical listing data',
    'OLX-style marketplace listing data',
    'Wheels&Deals completed marketplace and auction sale prices',
  ],
  featureWeights: {
    exactMake: 0.18,
    exactModel: 0.24,
    exactVariant: 0.10,
    yearDistance: 0.12,
    mileageDistance: 0.10,
    engineCcDistance: 0.07,
    cityMatch: 0.06,
    bodyStyleMatch: 0.05,
    transmissionMatch: 0.04,
    fuelMatch: 0.04,
  },
  adjustmentWeights: {
    annualDepreciation: 0.065,
    mileagePerTwentyThousandKm: 0.035,
    engineCcPerFiveHundredCc: 0.018,
    inspectionPerPoint: 0.0022,
    trustPerPoint: 0.001,
  },
  cityPremiums: {
    karachi: 0.015,
    lahore: 0.02,
    islamabad: 0.025,
    rawalpindi: 0.008,
    faisalabad: -0.006,
    multan: -0.01,
    peshawar: -0.012,
    quetta: -0.018,
  },
  anchorRows: [
    { id: 'pk-anchor-civic-2021', make: 'Honda', model: 'Civic', bodyStyle: 'Sedan', year: 2021, mileageKm: 45000, engineCapacityCc: 1800, transmission: 'Automatic', powertrain: 'Petrol', city: 'Lahore', marketEstimate: 6100000 },
    { id: 'pk-anchor-city-2021', make: 'Honda', model: 'City', bodyStyle: 'Sedan', year: 2021, mileageKm: 50000, engineCapacityCc: 1500, transmission: 'Automatic', powertrain: 'Petrol', city: 'Lahore', marketEstimate: 4900000 },
    { id: 'pk-anchor-corolla-2021', make: 'Toyota', model: 'Corolla', bodyStyle: 'Sedan', year: 2021, mileageKm: 52000, engineCapacityCc: 1800, transmission: 'Automatic', powertrain: 'Petrol', city: 'Karachi', marketEstimate: 5700000 },
    { id: 'pk-anchor-yaris-2021', make: 'Toyota', model: 'Yaris', bodyStyle: 'Sedan', year: 2021, mileageKm: 45000, engineCapacityCc: 1500, transmission: 'Automatic', powertrain: 'Petrol', city: 'Islamabad', marketEstimate: 4600000 },
    { id: 'pk-anchor-alto-2022', make: 'Suzuki', model: 'Alto', bodyStyle: 'Hatchback', year: 2022, mileageKm: 30000, engineCapacityCc: 660, transmission: 'Automatic', powertrain: 'Petrol', city: 'Karachi', marketEstimate: 3150000 },
    { id: 'pk-anchor-cultus-2021', make: 'Suzuki', model: 'Cultus', bodyStyle: 'Hatchback', year: 2021, mileageKm: 45000, engineCapacityCc: 1000, transmission: 'Manual', powertrain: 'Petrol', city: 'Lahore', marketEstimate: 3850000 },
    { id: 'pk-anchor-fortuner-2021', make: 'Toyota', model: 'Fortuner', bodyStyle: 'SUV', year: 2021, mileageKm: 50000, engineCapacityCc: 2700, transmission: 'Automatic', powertrain: 'Petrol', city: 'Islamabad', marketEstimate: 15100000 },
    { id: 'pk-anchor-sportage-2021', make: 'Kia', model: 'Sportage', bodyStyle: 'SUV', year: 2021, mileageKm: 48000, engineCapacityCc: 2000, transmission: 'Automatic', powertrain: 'Petrol', city: 'Lahore', marketEstimate: 7800000 },
    { id: 'pk-anchor-wagonr-2020', make: 'Suzuki', model: 'Wagon R', bodyStyle: 'Hatchback', year: 2020, mileageKm: 65000, engineCapacityCc: 1000, transmission: 'Manual', powertrain: 'Petrol', city: 'Karachi', marketEstimate: 3150000 },
    { id: 'pk-anchor-mehran-2018', make: 'Suzuki', model: 'Mehran', bodyStyle: 'Hatchback', year: 2018, mileageKm: 85000, engineCapacityCc: 800, transmission: 'Manual', powertrain: 'Petrol', city: 'Faisalabad', marketEstimate: 1350000 },
  ],
});

const vehicleYear = (listing = {}) => numericValue(listing.year, listing.modelYear, listing.model_year);
const vehicleMileage = (listing = {}) => numericValue(listing.mileageKm, listing.mileage, listing.kmDriven);
const vehicleEngineCc = (listing = {}) => numericValue(listing.engineCapacityCc, listing.engineCc, listing.cc, listing.displacement);
const vehicleFuel = (listing = {}) => listing.powertrain || listing.fuel || listing.fuelType || listing.engineType;

const marketCityPremium = (city) => pakistanValuationModel.cityPremiums[normalizeText(city)] || 0;

const closeness = (left, right, range) => {
  if (!left || !right) return 0;
  return clamp(1 - (Math.abs(Number(left) - Number(right)) / range), 0, 1);
};

const valuationSimilarity = (target = {}, candidate = {}) => {
  const weights = pakistanValuationModel.featureWeights;
  const score =
    (sameText(target.make, candidate.make) ? weights.exactMake : 0) +
    (sameText(target.model, candidate.model) ? weights.exactModel : 0) +
    (sameText(target.variant, candidate.variant) ? weights.exactVariant : 0) +
    closeness(vehicleYear(target), vehicleYear(candidate), 8) * weights.yearDistance +
    closeness(vehicleMileage(target), vehicleMileage(candidate), 140000) * weights.mileageDistance +
    closeness(vehicleEngineCc(target), vehicleEngineCc(candidate), 1800) * weights.engineCcDistance +
    (sameText(target.city, candidate.city) ? weights.cityMatch : 0) +
    (sameText(target.bodyStyle, candidate.bodyStyle) ? weights.bodyStyleMatch : 0) +
    (sameText(target.transmission, candidate.transmission) ? weights.transmissionMatch : 0) +
    (sameText(vehicleFuel(target), vehicleFuel(candidate)) ? weights.fuelMatch : 0);
  return clamp(score / Object.values(weights).reduce((total, value) => total + value, 0), 0, 1);
};

const adjustedComparablePrice = (target = {}, candidate = {}) => {
  const weights = pakistanValuationModel.adjustmentWeights;
  const candidatePrice = listingPrice(candidate);
  const yearDelta = vehicleYear(target) && vehicleYear(candidate) ? vehicleYear(target) - vehicleYear(candidate) : 0;
  const mileageDelta = vehicleMileage(candidate) && vehicleMileage(target) ? vehicleMileage(candidate) - vehicleMileage(target) : 0;
  const engineDelta = vehicleEngineCc(target) && vehicleEngineCc(candidate) ? vehicleEngineCc(target) - vehicleEngineCc(candidate) : 0;
  const inspectionDelta = Number(target.inspectionScore || 78) - Number(candidate.inspectionScore || 78);
  const trustDelta = Number(target.trustScore || 70) - Number(candidate.trustScore || 70);
  const cityDelta = marketCityPremium(target.city) - marketCityPremium(candidate.city);
  const adjustmentPct = clamp(
    yearDelta * weights.annualDepreciation +
      (mileageDelta / 20000) * weights.mileagePerTwentyThousandKm +
      (engineDelta / 500) * weights.engineCcPerFiveHundredCc +
      inspectionDelta * weights.inspectionPerPoint +
      trustDelta * weights.trustPerPoint +
      cityDelta,
    -0.45,
    0.55
  );
  return {
    price: Math.max(0, Math.round(candidatePrice * (1 + adjustmentPct))),
    adjustmentPct,
  };
};

const comparableRowsFor = (store = {}) => [
  ...(store.listings || []),
  ...pakistanValuationModel.anchorRows,
].filter((item) => listingPrice(item) > 0);

export const predictVehiclePrice = (listing = {}, store = {}) => {
  const target = { ...listing };
  const rows = comparableRowsFor(store)
    .filter((item) => String(item.id) !== String(target.id || target.listingId || ''))
    .map((item) => {
      const similarity = valuationSimilarity(target, item);
      const adjusted = adjustedComparablePrice(target, item);
      return {
        item,
        similarity,
        weight: Math.max(0.05, similarity ** 2),
        adjustedPrice: adjusted.price,
        adjustmentPct: adjusted.adjustmentPct,
      };
    })
    .filter((row) => row.similarity >= 0.18)
    .sort((a, b) => b.similarity - a.similarity);

  const topRows = rows.slice(0, 12);
  const weightedTotal = topRows.reduce((total, row) => total + row.adjustedPrice * row.weight, 0);
  const weightSum = topRows.reduce((total, row) => total + row.weight, 0);
  const comparableMid = weightSum ? Math.round(weightedTotal / weightSum) : 0;
  const fallback = estimatePrice({ ...target, marketEstimate: target.marketEstimate || target.askingPrice || topRows[0]?.adjustedPrice || 0 });
  const mid = comparableMid || fallback.mid;
  const exactMakeModelCount = topRows.filter((row) => sameText(target.make, row.item.make) && sameText(target.model, row.item.model)).length;
  const confidence = exactMakeModelCount >= 4 ? 'high' : topRows.length >= 5 ? 'medium' : 'low';
  const spread = confidence === 'high' ? 0.075 : confidence === 'medium' ? 0.11 : 0.16;
  const asking = listingPrice(target);
  const differenceFromAsking = asking && mid ? Math.round(asking - mid) : null;

  return {
    low: Math.round(mid * (1 - spread)),
    mid,
    high: Math.round(mid * (1 + spread)),
    currency: pakistanValuationModel.currency,
    confidence,
    model: pakistanValuationModel.name,
    trainedStatus: pakistanValuationModel.trainedStatus,
    comparableCount: topRows.length,
    exactMakeModelCount,
    trainingRows: rows.length,
    askingPrice: asking || null,
    differenceFromAsking,
    verdict: differenceFromAsking === null
      ? 'fair_market_value_estimate'
      : differenceFromAsking > mid * 0.08
        ? 'asking_above_predicted_market'
        : differenceFromAsking < -mid * 0.08
          ? 'asking_below_predicted_market'
          : 'asking_near_predicted_market',
    featureWeights: pakistanValuationModel.featureWeights,
    adjustmentWeights: pakistanValuationModel.adjustmentWeights,
    topComparables: topRows.slice(0, 5).map((row) => ({
      id: row.item.id,
      name: row.item.title || row.item.name || `${row.item.year || ''} ${row.item.make || ''} ${row.item.model || ''}`.trim(),
      year: vehicleYear(row.item) || null,
      make: row.item.make || null,
      model: row.item.model || null,
      variant: row.item.variant || null,
      city: row.item.city || null,
      price: listingPrice(row.item),
      adjustedPrice: row.adjustedPrice,
      similarity: Number(row.similarity.toFixed(2)),
    })),
    adjustments: [
      { factor: 'model_year', label: 'Model year depreciation/appreciation', weight: pakistanValuationModel.adjustmentWeights.annualDepreciation },
      { factor: 'mileage', label: 'Mileage penalty or premium versus comparable cars', weight: pakistanValuationModel.adjustmentWeights.mileagePerTwentyThousandKm },
      { factor: 'city', label: 'Pakistan city demand premium', weight: marketCityPremium(target.city) },
      { factor: 'inspection', label: 'Inspection score condition signal', weight: pakistanValuationModel.adjustmentWeights.inspectionPerPoint },
    ],
    warnings: [
      ...(topRows.length < 5 ? ['Low comparable count. Treat this as guidance until more Pakistan sales data is indexed.'] : []),
      ...(!vehicleYear(target) ? ['Model year missing reduces accuracy.'] : []),
      ...(!vehicleMileage(target) ? ['Mileage missing reduces accuracy.'] : []),
      ...(!target.make || !target.model ? ['Make/model missing reduces accuracy.'] : []),
    ],
    explanation: 'Pakistan baseline model uses comparable app listings plus reusable Pakistan market anchors, then adjusts for year, mileage, engine cc, city demand, inspection score, and seller trust. No paid API is required.',
  };
};

export const getListingQuality = (listing = {}) => {
  const checks = [
    ['title', listing.title || listing.name || listing.make],
    ['price', listingPrice(listing) || listing.marketEstimate || listing.reservePrice],
    ['mileage', listing.mileageKm || listing.mileage],
    ['city', listing.city],
    ['body style', listing.bodyStyle],
    ['powertrain', listing.powertrain || listing.fuel],
    ['transmission', listing.transmission],
    ['inspection score', listing.inspectionScore],
    ['title status', listing.titleStatus],
    ['seller identity', listing.sellerId],
  ];
  const missing = checks.filter(([, value]) => value === undefined || value === null || value === '').map(([label]) => label);
  const score = Math.round(((checks.length - missing.length) / checks.length) * 100);
  const suggestions = missing.map((field) => `Add ${field} to improve buyer confidence.`);
  return { score, missing, suggestions };
};

export const estimatePrice = (listing = {}) => {
  const base = listingPrice(listing);
  const mileageKm = Number(listing.mileageKm || 0);
  const inspection = Number(listing.inspectionScore || 75);
  const trust = Number(listing.trustScore || 70);
  const year = Number(listing.year || new Date().getFullYear() - 5);
  const age = Math.max(0, new Date().getFullYear() - year);
  const mileageAdjustment = mileageKm > 0 ? clamp((60000 - mileageKm) / 60000 * 0.06, -0.10, 0.06) : 0;
  const conditionAdjustment = ((inspection - 75) / 100) * 0.12;
  const trustAdjustment = ((trust - 70) / 100) * 0.05;
  const ageAdjustment = -Math.min(0.12, age * 0.01);
  const mid = Math.max(0, Math.round(base * (1 + mileageAdjustment + conditionAdjustment + trustAdjustment + ageAdjustment)));
  const spread = inspection >= 88 ? 0.055 : inspection >= 75 ? 0.08 : 0.12;
  return {
    low: Math.round(mid * (1 - spread)),
    mid,
    high: Math.round(mid * (1 + spread)),
    confidence: inspection >= 85 && mileageKm ? 'high' : inspection ? 'medium' : 'low',
    explanation: 'Local estimator blends market estimate, mileage, model year, inspection score, and seller trust. No paid API is used.',
  };
};

export const dealScore = (listing = {}) => {
  const price = listingPrice(listing);
  const estimate = estimatePrice(listing).mid || price;
  const spread = estimate ? (estimate - price) / estimate : 0;
  const inspectionBoost = (Number(listing.inspectionScore || 70) - 70) / 3;
  const trustBoost = (Number(listing.trustScore || 70) - 70) / 5;
  const score = clamp(55 + spread * 120 + inspectionBoost + trustBoost);
  const badge = score >= 82 ? 'Great Deal' : score >= 68 ? 'Fair Price' : score >= 45 ? 'Watch Closely' : 'Overpriced';
  return { score: Math.round(score), badge, price, estimate, savings: Math.max(0, estimate - price) };
};

export const fraudRisk = (listing = {}) => {
  const signals = [];
  const price = listingPrice(listing);
  const estimate = Number(listing.marketEstimate || estimatePrice(listing).mid || price);
  if (!listing.sellerId) signals.push({ code: 'seller_identity_missing', severity: 24, label: 'Seller identity is missing.' });
  if (!listing.titleStatus || listing.titleStatus !== 'Clean') signals.push({ code: 'title_status_review', severity: 22, label: 'Title status needs review.' });
  if (price && estimate && price < estimate * 0.72) signals.push({ code: 'too_cheap', severity: 28, label: 'Price is far below estimated market value.' });
  if (!listing.inspectionScore) signals.push({ code: 'inspection_missing', severity: 12, label: 'No inspection score is attached.' });
  if (Number(listing.mileageKm || 0) > 180000) signals.push({ code: 'very_high_mileage', severity: 10, label: 'Mileage is unusually high.' });
  const score = clamp(signals.reduce((total, signal) => total + signal.severity, 0));
  const risk = score >= 65 ? 'high' : score >= 35 ? 'review' : 'low';
  return { risk, score: Math.round(score), signals };
};

export const parseNaturalSearch = (query = '') => {
  const raw = String(query || '');
  const lower = raw.toLowerCase();
  const parsed = {};
  const budgetMatch = lower.match(/(?:under|below|less than|upto|up to)\s*([\d.]+)\s*(crore|cr|lakh|lac|million|m)?/);
  if (budgetMatch) {
    const amount = Number(budgetMatch[1]);
    const unit = budgetMatch[2] || '';
    parsed.maxBudget = unit.startsWith('crore') || unit === 'cr'
      ? Math.round(amount * 10000000)
      : unit.startsWith('lakh') || unit === 'lac'
        ? Math.round(amount * 100000)
        : unit.startsWith('m')
          ? Math.round(amount * 1000000)
          : Math.round(amount);
  }
  ['karachi', 'lahore', 'islamabad', 'rawalpindi', 'faisalabad', 'multan', 'peshawar', 'quetta'].forEach((city) => {
    if (lower.includes(city)) parsed.city = city.replace(/\b\w/g, (char) => char.toUpperCase());
  });
  ['suv', 'crossover', 'sedan', 'hatchback', 'coupe', 'pickup', 'truck', 'van'].forEach((body) => {
    if (lower.includes(body)) parsed.bodyStyle = body === 'suv' ? 'SUV' : body.replace(/\b\w/g, (char) => char.toUpperCase());
  });
  ['toyota', 'honda', 'suzuki', 'hyundai', 'kia', 'bmw', 'mercedes', 'audi'].forEach((make) => {
    if (lower.includes(make)) parsed.make = make.replace(/\b\w/g, (char) => char.toUpperCase());
  });
  if (lower.includes('auction')) parsed.listingType = 'auction';
  if (lower.includes('hybrid')) parsed.powertrain = 'Hybrid';
  if (lower.includes('electric') || lower.includes('ev')) parsed.powertrain = 'Electric';
  if (lower.includes('diesel')) parsed.powertrain = 'Diesel';
  if (lower.includes('petrol')) parsed.powertrain = 'Petrol';
  return { original: raw, filters: parsed, terms: words(raw) };
};

const idsFrom = (items = []) => items
  .map((item) => item?.listingId || item?.carId || item?.id || item)
  .filter((id) => id !== undefined && id !== null)
  .map(String);

const listingSimilarity = (a = {}, b = {}) => {
  if (!a.id || !b.id) return 0;
  let score = 0;
  if (a.make && a.make === b.make) score += 24;
  if (a.model && a.model === b.model) score += 26;
  if (a.bodyStyle && a.bodyStyle === b.bodyStyle) score += 18;
  if (a.city && a.city === b.city) score += 8;
  if ((a.powertrain || a.fuel) && (a.powertrain || a.fuel) === (b.powertrain || b.fuel)) score += 8;
  const priceA = listingPrice(a);
  const priceB = listingPrice(b);
  if (priceA && priceB) score += Math.max(0, 16 - Math.abs(priceA - priceB) / Math.max(priceA, priceB) * 16);
  return clamp(score);
};

const contentBasedScore = (listing = {}, profile = {}, store = {}) => {
  const parsed = profile.terms ? profile : parseNaturalSearch(profile.query || '');
  const price = listingPrice(listing);
  const deal = dealScore(listing);
  const quality = getListingQuality(listing);
  let score = 20;
  const reasons = [];
  if (parsed.filters?.maxBudget) score += price <= parsed.filters.maxBudget ? 18 : -12;
  if (parsed.filters?.maxBudget && price <= parsed.filters.maxBudget) reasons.push('Fits budget intent');
  if (parsed.filters?.city && textIncludes(listing.city, parsed.filters.city)) {
    score += 14;
    reasons.push('Matches preferred city');
  }
  if (parsed.filters?.bodyStyle && textIncludes(listing.bodyStyle, parsed.filters.bodyStyle)) {
    score += 14;
    reasons.push('Matches body style');
  }
  if (parsed.filters?.make && textIncludes(listing.make, parsed.filters.make)) {
    score += 12;
    reasons.push('Matches preferred make');
  }
  if (parsed.filters?.powertrain && textIncludes(listing.powertrain || listing.fuel, parsed.filters.powertrain)) {
    score += 10;
    reasons.push('Matches powertrain');
  }
  if (parsed.terms?.some((term) => JSON.stringify(listing).toLowerCase().includes(term))) {
    score += 12;
    reasons.push('Matches search language');
  }

  const seedIds = [...idsFrom(profile.watchlist), ...idsFrom(profile.recentlyViewed), ...idsFrom(profile.savedListings)];
  const seedListings = seedIds
    .map((id) => store.listings?.find((item) => String(item.id) === id))
    .filter(Boolean);
  const similarityBoost = seedListings.length
    ? Math.max(...seedListings.map((seed) => listingSimilarity(seed, listing))) * 0.28
    : 0;
  if (similarityBoost > 8) reasons.push('Similar to cars you showed interest in');
  score += similarityBoost;

  if (seedIds.some((id) => String(id) === String(listing.id))) {
    score += 10;
    reasons.push('Already in your interest graph');
  }
  if (auctionForListing(store, listing)?.status === 'live') score += 8;
  score += deal.score / 8;
  score += quality.score / 12;
  score -= fraudRisk(listing).score / 7;
  return {
    score: clamp(score),
    reasons,
  };
};

const interactionWeight = (interaction = {}) => {
  if (interaction.amount) return 5;
  if (interaction.rating) return Number(interaction.rating);
  if (/bid|won|checkout|purchase/i.test(interaction.action || interaction.type || '')) return 5;
  if (/watch|save|like|positive/i.test(interaction.action || interaction.type || '')) return 4;
  if (/view|click|open/i.test(interaction.action || interaction.type || '')) return 2;
  if (/hide|negative|not_interested/i.test(interaction.action || interaction.type || '')) return -4;
  return 1;
};

const buildCollaborativeInteractions = (store = {}) => {
  const feedback = (store.recommendationFeedback || []).map((item) => ({
    userId: item.userId,
    listingId: item.listingId || item.carId || item.targetId,
    weight: interactionWeight(item),
  }));
  const bids = (store.bids || []).map((bid) => {
    const auction = (store.auctions || []).find((item) => String(item.id) === String(bid.auctionId));
    return {
      userId: bid.bidderId,
      listingId: auction?.listingId,
      weight: 5,
    };
  });
  const savedSearchSignals = (store.savedSearches || []).flatMap((search) => (store.listings || [])
    .filter((listing) => {
      const query = search.query || {};
      return (!query.city || query.city === listing.city) &&
        (!query.make || query.make === listing.make) &&
        (!query.bodyStyle || query.bodyStyle === listing.bodyStyle);
    })
    .slice(0, 12)
    .map((listing) => ({ userId: search.userId, listingId: listing.id, weight: 2 })));
  return [...feedback, ...bids, ...savedSearchSignals]
    .filter((item) => item.userId && item.listingId);
};

const collaborativeScore = (listing = {}, profile = {}, store = {}) => {
  const interactions = buildCollaborativeInteractions(store);
  const userId = profile.userId;
  const seedIds = new Set([...idsFrom(profile.watchlist), ...idsFrom(profile.recentlyViewed), ...idsFrom(profile.savedListings)]);
  const activeUserInteractions = interactions.filter((item) => String(item.userId) === String(userId));
  activeUserInteractions.forEach((item) => seedIds.add(String(item.listingId)));

  const similarUsers = new Map();
  if (seedIds.size) {
    interactions.forEach((item) => {
      if (String(item.userId) === String(userId)) return;
      if (seedIds.has(String(item.listingId))) similarUsers.set(String(item.userId), (similarUsers.get(String(item.userId)) || 0) + Math.max(1, item.weight));
    });
  }

  let peerScore = 0;
  interactions.forEach((item) => {
    if (String(item.listingId) !== String(listing.id)) return;
    const similarity = similarUsers.get(String(item.userId)) || 0;
    if (similarity) peerScore += item.weight * similarity;
  });

  const popularity = interactions
    .filter((item) => String(item.listingId) === String(listing.id))
    .reduce((total, item) => total + Math.max(0, item.weight), 0);
  const bidPopularity = (store.bids || []).filter((bid) => {
    const auction = (store.auctions || []).find((item) => String(item.id) === String(bid.auctionId));
    return String(auction?.listingId) === String(listing.id);
  }).length * 6;

  const coldStartSimilarity = seedIds.size
    ? Math.max(0, ...[...seedIds].map((id) => listingSimilarity(store.listings?.find((item) => String(item.id) === id), listing))) * 0.18
    : 0;
  const score = clamp(peerScore * 3 + popularity * 4 + bidPopularity + coldStartSimilarity);
  const reasons = [];
  if (peerScore > 0) reasons.push('Similar users interacted with this');
  if (popularity + bidPopularity > 0) reasons.push('Popular with marketplace users');
  if (coldStartSimilarity > 8) reasons.push('Collaborative cold-start bridge');
  return { score, reasons };
};

export const scoreListingMatch = (listing = {}, profile = {}, store = {}) => {
  const content = contentBasedScore(listing, profile, store);
  const collaborative = collaborativeScore(listing, profile, store);
  const hasBehavior = idsFrom(profile.watchlist).length || idsFrom(profile.recentlyViewed).length || idsFrom(profile.savedListings).length || profile.userId;
  const contentWeight = hasBehavior ? 0.68 : 0.82;
  const collaborativeWeight = 1 - contentWeight;
  const hybridScore = clamp(content.score * contentWeight + collaborative.score * collaborativeWeight);
  return {
    hybridScore,
    contentScore: content.score,
    collaborativeScore: collaborative.score,
    weights: { content: contentWeight, collaborative: collaborativeWeight },
    reasons: [...content.reasons, ...collaborative.reasons],
  };
};

export const rankListingsAi = (store, profile = {}) => [...store.listings]
  .map((listing) => {
    const match = scoreListingMatch(listing, profile, store);
    const score = Math.round(match.hybridScore);
    const deal = dealScore(listing);
    const quality = getListingQuality(listing);
    return {
      ...listing,
      aiMatchScore: score,
      hybridScore: score,
      contentScore: Math.round(match.contentScore),
      collaborativeScore: Math.round(match.collaborativeScore),
      recommenderWeights: match.weights,
      recommendationScore: score,
      dealBadge: deal.badge,
      dealScore: deal.score,
      qualityScore: quality.score,
      aiReasons: [
        'Hybrid recommender',
        ...match.reasons.slice(0, 3),
        deal.badge,
        quality.score >= 80 ? 'Strong listing quality' : 'Needs listing detail polish',
        auctionForListing(store, listing)?.status === 'live' ? 'Live auction momentum' : 'Marketplace fit',
      ].filter(Boolean).slice(0, 6),
    };
  })
  .sort((a, b) => b.aiMatchScore - a.aiMatchScore);

export const similarListings = (store, listingId) => {
  const base = store.listings.find((listing) => String(listing.id) === String(listingId));
  if (!base) return null;
  const basePrice = listingPrice(base);
  return [...store.listings]
    .filter((listing) => String(listing.id) !== String(base.id))
    .map((listing) => {
      let score = 0;
      if (listing.make === base.make) score += 24;
      if (listing.model === base.model) score += 26;
      if (listing.bodyStyle === base.bodyStyle) score += 18;
      if (listing.city === base.city) score += 10;
      if (basePrice && listingPrice(listing)) score += Math.max(0, 22 - Math.abs(listingPrice(listing) - basePrice) / basePrice * 22);
      return { ...listing, similarityScore: Math.round(clamp(score)) };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);
};

export const auctionSignals = (store, auctionId) => {
  const auction = store.auctions.find((item) => String(item.id) === String(auctionId));
  if (!auction) return null;
  const listing = store.listings.find((item) => String(item.id) === String(auction.listingId)) || {};
  const bids = store.bids.filter((bid) => String(bid.auctionId) === String(auction.id));
  const minutesLeft = Math.max(0, Math.round((new Date(auction.endsAt).getTime() - Date.now()) / 60000));
  const estimate = estimatePrice({ ...listing, highBid: auction.highBid }).mid || Number(auction.highBid || 0);
  const highBid = Number(auction.highBid || 0);
  const heat = clamp((bids.length * 12) + (minutesLeft < 30 ? 24 : minutesLeft < 120 ? 12 : 4) + (highBid > estimate * 0.95 ? 18 : 0));
  const winProbability = clamp(70 - heat / 2 + (highBid < estimate * 0.9 ? 18 : 0) - (highBid > estimate ? 20 : 0));
  const timing = minutesLeft <= 5 ? 'bid_now' : minutesLeft <= 30 ? 'prepare_final_bid' : heat >= 70 ? 'wait_for_cooldown' : 'watch';
  const maxRecommendedBid = Math.round(estimate * (heat >= 70 ? 0.98 : 1.02));
  return {
    auction,
    listing,
    heat: Math.round(heat),
    winProbability: Math.round(winProbability),
    timing,
    maxRecommendedBid,
    advice: timing === 'bid_now'
      ? 'Bid only if your target price is still below the recommended cap.'
      : timing === 'prepare_final_bid'
        ? 'Set your final ceiling now and avoid emotional overbidding.'
        : timing === 'wait_for_cooldown'
          ? 'Auction heat is high. Wait unless price stays below fair value.'
          : 'Watch the auction and prepare a deposit-backed bid.',
  };
};

export const sellerPricingCoach = (listing = {}) => {
  const estimate = estimatePrice(listing);
  const fastSale = Math.round(estimate.mid * 0.96);
  const balanced = estimate.mid;
  const auctionReserve = Math.round(estimate.mid * 0.9);
  return {
    estimate,
    suggestions: {
      fastSale,
      balanced,
      auctionReserve,
      buyNow: Math.round(estimate.mid * 1.03),
    },
    notes: [
      'Use the auction reserve to protect downside without killing bidding momentum.',
      'Use balanced pricing if inspection score and documents are strong.',
      'Use fast-sale pricing when photos, title proof, or service history are incomplete.',
    ],
  };
};

export const summarizeThread = ({ post = {}, comments = [] }) => {
  const allText = [post.title, post.body, ...comments.map((comment) => comment.body)].filter(Boolean);
  const tokenCounts = allText.flatMap(words).reduce((acc, token) => {
    if (token.length > 3) acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});
  const keywords = Object.entries(tokenCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([token]) => token);
  const topComment = [...comments].sort((a, b) => Number(b.votes || 0) - Number(a.votes || 0))[0];
  return {
    summary: allText.length
      ? `Discussion centers on ${keywords.slice(0, 3).join(', ') || 'the listing'} with ${comments.length} community replies.`
      : 'No thread content available yet.',
    keywords,
    topTakeaway: topComment?.body || post.body || '',
    sentiment: comments.some((comment) => /scam|avoid|overpriced|problem|fake/i.test(comment.body || '')) ? 'cautious' : 'neutral',
  };
};

export const moderateText = (text = '') => {
  const lower = String(text || '').toLowerCase();
  const spamSignals = ['whatsapp only', 'advance payment', 'urgent transfer', 'click here', '100% guaranteed'];
  const abuseSignals = ['idiot', 'stupid', 'fraudster'];
  const signals = [
    ...spamSignals.filter((signal) => lower.includes(signal)).map((signal) => ({ type: 'spam', signal })),
    ...abuseSignals.filter((signal) => lower.includes(signal)).map((signal) => ({ type: 'abuse', signal })),
  ];
  return {
    action: signals.length ? 'review' : 'allow',
    score: clamp(signals.length * 35),
    signals,
  };
};

export const inspectionInsight = (inspection = {}) => {
  const score = Number(inspection.score || inspection.inspectionScore || 0);
  const issues = inspection.issues || inspection.knownFlaws || [];
  const verdict = score >= 88 && issues.length === 0 ? 'strong_buy' : score >= 75 ? 'inspect_before_bid' : 'high_caution';
  return {
    verdict,
    confidence: score ? 'medium' : 'low',
    summary: verdict === 'strong_buy'
      ? 'Inspection signals are strong for a confident bid.'
      : verdict === 'inspect_before_bid'
        ? 'Condition is acceptable, but review the noted issues before bidding.'
        : 'Condition risk is high. Keep bids conservative until verified.',
    issueCount: issues.length,
    recommendedBidAdjustment: verdict === 'strong_buy' ? 0.02 : verdict === 'inspect_before_bid' ? -0.04 : -0.1,
  };
};

export const aiFeatureSet = (store) => ({
  features: [
    { id: 'hybrid_recommender', name: 'Hybrid Vehicle Recommender', status: 'implemented', detail: 'Blends content-based similarity with collaborative behavior signals.' },
    { id: 'content_based_recommender', name: 'Content-Based Matching', status: 'implemented', detail: 'Uses make, model, body, city, budget, powertrain, quality, and deal signals.' },
    { id: 'collaborative_recommender', name: 'Collaborative Filtering', status: 'implemented', detail: 'Uses bids, saved searches, recommendation feedback, and similar-user behavior.' },
    { id: 'auction_win_probability', name: 'Auction Win Probability', status: 'implemented' },
    { id: 'bid_timing', name: 'Best Time To Bid Assistant', status: 'implemented' },
    { id: 'fair_price_estimator', name: 'Fair Price Estimator', status: 'implemented' },
    { id: 'deal_badges', name: 'Good Deal / Overpriced Badges', status: 'implemented' },
    { id: 'listing_quality', name: 'Listing Quality AI', status: 'implemented' },
    { id: 'fraud_risk', name: 'Fraud / Scam Risk Score', status: 'implemented' },
    { id: 'natural_search', name: 'Natural Language Search', status: 'implemented' },
    { id: 'similar_cars', name: 'Similar Cars', status: 'implemented' },
    { id: 'auction_strategy', name: 'Auction Strategy Assistant', status: 'implemented' },
    { id: 'community_summary', name: 'Community Thread Summarizer', status: 'implemented' },
    { id: 'moderation', name: 'Spam / Toxicity Filter', status: 'implemented' },
    { id: 'inspection_insight', name: 'Inspection Insight Score', status: 'implemented' },
    { id: 'seller_pricing', name: 'Seller Pricing Coach', status: 'implemented' },
  ],
  provider: 'local_rules',
  model: 'hybrid_content_collaborative',
  defaultWeights: { content: 0.68, collaborative: 0.32 },
  coldStartWeights: { content: 0.82, collaborative: 0.18 },
  paidApiRequired: false,
  sampleRecommendations: rankListingsAi(store).slice(0, 4),
});
