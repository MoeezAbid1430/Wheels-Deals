const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'buy', 'car', 'cars', 'for', 'from', 'i', 'in', 'is', 'me', 'near',
  'need', 'of', 'on', 'or', 'pakistan', 'show', 'the', 'to', 'under', 'upto', 'up', 'want', 'with',
  'lakh', 'lac', 'crore', 'cr', 'million', 'm',
]);

export const tokenizeSearch = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s.]/g, ' ')
  .split(/\s+/)
  .map((term) => term.trim())
  .filter(Boolean);

const importantTerms = (terms) => terms.filter((term) => !stopWords.has(term) && !/^\d+(\.\d+)?$/.test(term));

const searchAliases = {
  jeep: ['suv', '4x4', 'offroad', 'off-road'],
  suv: ['jeep', 'crossover', 'family'],
  loader: ['pickup', 'carry', 'ravi', 'commercial'],
  pickup: ['loader', 'single cabin', 'double cabin', 'hilux', 'revo'],
  van: ['hiace', 'carry', 'commercial', 'family van'],
  truck: ['commercial', 'loader', 'pickup'],
  bike: ['motorcycle', 'scooter', 'cd70', 'cg125'],
  motorcycle: ['bike', 'scooter'],
  automatic: ['auto', 'at', 'cvt', 'dct'],
  manual: ['mt'],
  hybrid: ['prius', 'aqua', 'fuel efficient'],
  electric: ['ev', 'battery'],
  petrol: ['gasoline'],
  diesel: ['commercial', 'torque'],
  white: ['pearl', 'super white'],
  black: ['jet black'],
  installments: ['installment', 'monthly', 'finance', 'financing', 'lease'],
  cheap: ['budget', 'low price', 'affordable'],
  verified: ['trusted', 'dealer', 'inspected'],
  '4x4': ['awd', 'offroad', 'off-road'],
};

const levenshteinDistance = (a = '', b = '') => {
  const left = String(a);
  const right = String(b);
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
};

const fuzzyIncludes = (text, term) => {
  if (!term) return false;
  if (text.includes(term)) return true;
  if (term.length < 4) return false;
  const words = text.split(/\s+/).filter(Boolean);
  return words.some((word) => {
    if (Math.abs(word.length - term.length) > 2) return false;
    return levenshteinDistance(word, term) <= (term.length > 6 ? 2 : 1);
  });
};

const expandTerm = (term) => [term, ...(searchAliases[term] || [])];

const parseMoney = (amount, unit = '') => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return null;
  if (unit.startsWith('crore') || unit === 'cr') return Math.round(numeric * 10000000);
  if (unit.startsWith('lakh') || unit === 'lac') return Math.round(numeric * 100000);
  if (unit.startsWith('m')) return Math.round(numeric * 1000000);
  return Math.round(numeric);
};

export const getListingPrice = (listing = {}) => Number(
  listing.buyNowPrice ||
  listing.askingPrice ||
  listing.highBid ||
  listing.reservePrice ||
  listing.marketEstimate ||
  0
);

export const getEngineCc = (listing = {}) => {
  if (listing.engineCapacityCc) return Number(listing.engineCapacityCc);
  const text = `${listing.engine || ''} ${listing.name || ''}`;
  const ccMatch = text.match(/(\d{2,5})\s*cc/i);
  if (ccMatch) return Number(ccMatch[1]);
  const litreMatch = text.match(/(\d+(?:\.\d+)?)\s*l/i);
  if (litreMatch) return Math.round(Number(litreMatch[1]) * 1000);
  return 0;
};

const vehicleCategory = (listing = {}) => {
  if (listing.vehicleCategory) return listing.vehicleCategory;
  const body = String(listing.bodyStyle || '').toLowerCase();
  const name = `${listing.make || ''} ${listing.model || ''} ${listing.name || ''}`.toLowerCase();
  if (/truck|van|bus|coaster/.test(body)) return 'Buses, Vans & Trucks';
  if (/loader|pickup|single cabin|double cabin/.test(body)) return 'Loaders & Pickups';
  if (/rickshaw|chingchi/.test(body)) return 'Rickshaw & Chingchi';
  if (/tractor|trailer/.test(body)) return 'Tractors & Trailers';
  if (/motorcycle|scooter|bike/.test(body) || name.includes('bike')) return 'Bikes';
  return 'Cars';
};

export const parseNaturalVehicleQuery = (query = '') => {
  const raw = String(query || '');
  const lower = raw.toLowerCase();
  const filters = {};
  const terms = tokenizeSearch(raw);

  const budgetMatch = lower.match(/(?:under|below|less than|upto|up to|max|budget)\s*([\d.]+)\s*(crore|cr|lakh|lac|million|m)?/);
  if (budgetMatch) {
    filters.maxPrice = parseMoney(budgetMatch[1], budgetMatch[2] || '');
  }

  const minimumBudgetMatch = lower.match(/(?:above|over|more than|min|minimum)\s*([\d.]+)\s*(crore|cr|lakh|lac|million|m)?/);
  if (minimumBudgetMatch) {
    filters.minPrice = parseMoney(minimumBudgetMatch[1], minimumBudgetMatch[2] || '');
  }

  const betweenBudgetMatch = lower.match(/between\s*([\d.]+)\s*(crore|cr|lakh|lac|million|m)?\s*(?:and|to)\s*([\d.]+)\s*(crore|cr|lakh|lac|million|m)?/);
  if (betweenBudgetMatch) {
    const inferredUnit = betweenBudgetMatch[4] || betweenBudgetMatch[2] || '';
    filters.minPrice = parseMoney(betweenBudgetMatch[1], betweenBudgetMatch[2] || inferredUnit);
    filters.maxPrice = parseMoney(betweenBudgetMatch[3], betweenBudgetMatch[4] || inferredUnit);
  }

  const priceRangeMatch = lower.match(/([\d.]+)\s*(crore|cr|lakh|lac|million|m)?\s*(?:-|to|and)\s*([\d.]+)\s*(crore|cr|lakh|lac|million|m)?/);
  if (priceRangeMatch) {
    const inferredUnit = priceRangeMatch[4] || priceRangeMatch[2] || '';
    filters.minPrice = parseMoney(priceRangeMatch[1], priceRangeMatch[2] || inferredUnit);
    filters.maxPrice = parseMoney(priceRangeMatch[3], priceRangeMatch[4] || inferredUnit);
  }

  const ccMatch = lower.match(/(\d{2,5})\s*cc/);
  if (ccMatch) {
    const cc = Number(ccMatch[1]);
    filters.minCc = Math.max(0, cc - 25);
    filters.maxCc = cc + 25;
  }

  const ccRangeMatch = lower.match(/(\d{2,5})\s*cc?\s*(?:-|to)\s*(\d{2,5})\s*cc?/);
  if (ccRangeMatch) {
    filters.minCc = Number(ccRangeMatch[1]);
    filters.maxCc = Number(ccRangeMatch[2]);
  }

  const mileageMatch = lower.match(/(?:under|below|less than|upto|up to|max)\s*([\d,]+)\s*(?:km|kms|kilometer|kilometers)/);
  if (mileageMatch) {
    filters.maxMileage = Number(String(mileageMatch[1]).replace(/,/g, ''));
  }

  const yearRangeMatch = lower.match(/(?:year|model)?\s*(19\d{2}|20\d{2})\s*(?:-|to)\s*(19\d{2}|20\d{2})/);
  if (yearRangeMatch) {
    filters.minYear = Number(yearRangeMatch[1]);
    filters.maxYear = Number(yearRangeMatch[2]);
  } else {
    const singleYearMatch = lower.match(/\b(19\d{2}|20\d{2})\b/);
    if (singleYearMatch) {
      filters.minYear = Number(singleYearMatch[1]);
      filters.maxYear = Number(singleYearMatch[1]);
    }
  }

  ['karachi', 'lahore', 'islamabad', 'rawalpindi', 'faisalabad', 'multan', 'peshawar', 'quetta', 'sialkot', 'gujranwala'].forEach((city) => {
    if (lower.includes(city)) filters.city = city.replace(/\b\w/g, (char) => char.toUpperCase());
  });
  ['toyota', 'honda', 'suzuki', 'hyundai', 'kia', 'bmw', 'mercedes', 'audi', 'changan', 'mg', 'haval'].forEach((make) => {
    if (lower.includes(make)) filters.make = make.replace(/\b\w/g, (char) => char.toUpperCase());
  });
  ['suv', 'sedan', 'hatchback', 'crossover', 'pickup', 'truck', 'van', 'loader', 'bike', 'motorcycle'].forEach((body) => {
    if (lower.includes(body)) filters.bodyStyle = body === 'suv' ? 'SUV' : body.replace(/\b\w/g, (char) => char.toUpperCase());
  });
  ['hybrid', 'electric', 'diesel', 'petrol'].forEach((fuel) => {
    if (lower.includes(fuel)) filters.powertrain = fuel.replace(/\b\w/g, (char) => char.toUpperCase());
  });
  ['automatic', 'manual', 'cvt', 'dct'].forEach((transmission) => {
    if (lower.includes(transmission)) filters.transmission = transmission.toUpperCase() === transmission ? transmission : transmission.replace(/\b\w/g, (char) => char.toUpperCase());
  });
  ['white', 'black', 'silver', 'grey', 'gray', 'blue', 'red', 'green', 'brown', 'gold', 'beige', 'maroon', 'pearl'].forEach((color) => {
    if (lower.includes(color)) filters.exteriorColor = color === 'gray' ? 'Grey' : color.replace(/\b\w/g, (char) => char.toUpperCase());
  });
  if (lower.includes('auction')) filters.listingType = 'Auction';
  if (lower.includes('verified') || lower.includes('trusted dealer')) filters.verifiedSeller = true;
  if (lower.includes('inspected') || lower.includes('inspection')) filters.inspected = true;
  if (lower.includes('4x4') || lower.includes('awd')) filters.drivetrain = '4x4';
  if (lower.includes('installment') || lower.includes('monthly')) filters.installmentsOnly = true;

  return { original: raw, filters, terms: importantTerms(terms).flatMap(expandTerm) };
};

export const vehicleSearchText = (listing = {}) => [
  listing.name,
  listing.year,
  listing.make,
  listing.model,
  listing.variant,
  listing.city,
  listing.location,
  listing.bodyStyle,
  vehicleCategory(listing),
  listing.seller,
  listing.sellerType,
  listing.titleStatus,
  listing.fuel,
  listing.powertrain,
  listing.engine,
  getEngineCc(listing) ? `${getEngineCc(listing)}cc` : '',
  ...(listing.tags || []),
  ...(listing.highlights || []),
].join(' ').toLowerCase();

export const scoreVehicleSearchMatch = (listing = {}, query = '') => {
  const parsed = typeof query === 'string' ? parseNaturalVehicleQuery(query) : query;
  const text = vehicleSearchText(listing);
  const price = getListingPrice(listing);
  const cc = getEngineCc(listing);
  let score = 0;
  const reasons = [];

  parsed.terms.forEach((term) => {
    if (fuzzyIncludes(text, term)) {
      score += text.includes(term) ? 9 : 5;
      reasons.push(text.includes(term) ? `matches "${term}"` : `close match "${term}"`);
    }
  });

  const { filters = {} } = parsed;
  if (filters.city && listing.city === filters.city) { score += 15; reasons.push('city match'); }
  if (filters.make && listing.make === filters.make) { score += 14; reasons.push('make match'); }
  if (filters.bodyStyle && String(listing.bodyStyle || '').toLowerCase().includes(String(filters.bodyStyle).toLowerCase())) { score += 12; reasons.push('body match'); }
  if (filters.powertrain && String(listing.fuel || listing.powertrain || '').toLowerCase().includes(String(filters.powertrain).toLowerCase())) { score += 12; reasons.push('fuel match'); }
  if (filters.transmission && String(listing.transmission || '').toLowerCase().includes(String(filters.transmission).toLowerCase())) { score += 10; reasons.push('transmission match'); }
  if (filters.exteriorColor && String(listing.exteriorColor || '').toLowerCase().includes(String(filters.exteriorColor).toLowerCase())) { score += 8; reasons.push('color match'); }
  if (filters.drivetrain && String(listing.drivetrain || '').toLowerCase().includes(String(filters.drivetrain).toLowerCase())) { score += 10; reasons.push('drivetrain match'); }
  if (filters.listingType && listing.listingType === filters.listingType) { score += 10; reasons.push('sale type match'); }
  if (filters.minPrice && price && price >= filters.minPrice) { score += 8; reasons.push('above minimum budget'); }
  if (filters.maxPrice && price && price <= filters.maxPrice) { score += 15; reasons.push('inside budget'); }
  if (filters.minCc && cc >= filters.minCc && cc <= filters.maxCc) { score += 12; reasons.push('cc match'); }
  if (filters.minYear && listing.year >= filters.minYear && listing.year <= (filters.maxYear || filters.minYear)) { score += 10; reasons.push('year match'); }
  if (filters.maxMileage && Number(listing.mileageValue || 0) <= filters.maxMileage) { score += 8; reasons.push('mileage match'); }
  if (filters.verifiedSeller && String(listing.sellerType || '').toLowerCase().includes('dealer')) { score += 8; reasons.push('verified seller'); }
  if (filters.inspected && Number(listing.inspectionScore || 0) >= 70) { score += 8; reasons.push('inspection confidence'); }
  if (filters.installmentsOnly && listing.installmentAvailable) { score += 12; reasons.push('installments available'); }

  const passesNaturalFilters =
    (!filters.city || listing.city === filters.city) &&
    (!filters.make || listing.make === filters.make) &&
    (!filters.minPrice || !price || price >= filters.minPrice) &&
    (!filters.maxPrice || !price || price <= filters.maxPrice) &&
    (!filters.minCc || (cc >= filters.minCc && cc <= filters.maxCc)) &&
    (!filters.minYear || (Number(listing.year) >= filters.minYear && Number(listing.year) <= (filters.maxYear || filters.minYear))) &&
    (!filters.transmission || String(listing.transmission || '').toLowerCase().includes(String(filters.transmission).toLowerCase())) &&
    (!filters.exteriorColor || String(listing.exteriorColor || '').toLowerCase().includes(String(filters.exteriorColor).toLowerCase())) &&
    (!filters.drivetrain || String(listing.drivetrain || '').toLowerCase().includes(String(filters.drivetrain).toLowerCase())) &&
    (!filters.maxMileage || Number(listing.mileageValue || 0) <= filters.maxMileage) &&
    (!filters.verifiedSeller || String(listing.sellerType || '').toLowerCase().includes('dealer')) &&
    (!filters.inspected || Number(listing.inspectionScore || 0) >= 70) &&
    (!filters.installmentsOnly || listing.installmentAvailable);

  return { score, reasons: [...new Set(reasons)].slice(0, 4), passesNaturalFilters };
};

const similarity = (a = {}, b = {}) => {
  let score = 0;
  if (a.make && a.make === b.make) score += 24;
  if (a.model && a.model === b.model) score += 24;
  if (a.bodyStyle && a.bodyStyle === b.bodyStyle) score += 16;
  if (a.city && a.city === b.city) score += 8;
  const priceA = getListingPrice(a);
  const priceB = getListingPrice(b);
  if (priceA && priceB) score += Math.max(0, 18 - Math.abs(priceA - priceB) / Math.max(priceA, priceB) * 18);
  return clamp(score);
};

export const rankHybridListings = (listings = [], state = {}, options = {}) => {
  const watchlist = state.watchlist || [];
  const recentlyViewed = state.recentlyViewed || [];
  const savedSearches = state.savedSearches || [];
  const behaviorIds = new Set([
    ...watchlist,
    ...recentlyViewed.map((item) => item.carId),
  ].map(Number));
  const seedListings = listings.filter((listing) => behaviorIds.has(Number(listing.id)));
  const queryProfile = parseNaturalVehicleQuery(options.query || savedSearches[0]?.query || '');
  const hasBehavior = behaviorIds.size > 0 || savedSearches.length > 0;
  const contentWeight = options.contentWeight || (hasBehavior ? 0.68 : 0.82);
  const collaborativeWeight = 1 - contentWeight;
  const cohortProfile = seedListings.reduce((acc, listing) => {
    ['make', 'model', 'bodyStyle', 'city', 'powertrain'].forEach((field) => {
      const value = listing[field];
      if (!value) return;
      acc[field] = acc[field] || {};
      acc[field][value] = (acc[field][value] || 0) + 1;
    });
    return acc;
  }, {});

  return listings
    .map((listing) => {
      const search = scoreVehicleSearchMatch(listing, queryProfile);
      const deal = Number(listing.dealScore || 70);
      const trust = Number(listing.trustScore || 70);
      const quality = Number(listing.inspectionScore || listing.qualityScore || 65);
      const baseContent = clamp(Number(listing.recommendationScore || 55) * 0.45 + deal * 0.22 + trust * 0.18 + quality * 0.15 + search.score);
      const behaviorScore = seedListings.length ? Math.max(...seedListings.map((seed) => similarity(seed, listing))) : 0;
      const cohortBoost = Object.entries(cohortProfile).reduce((total, [field, values]) => total + (values[listing[field]] || 0) * 3, 0);
      const watchBoost = watchlist.includes(listing.id) ? 18 : 0;
      const viewBoost = recentlyViewed.some((item) => item.carId === listing.id) ? 10 : 0;
      const auctionBoost = listing.listingType === 'Auction' ? 8 : 0;
      const urgencyBoost = listing.listingType === 'Auction' && Number(listing.endsInMinutes || Infinity) <= 240 ? 8 : 0;
      const collaborative = clamp(behaviorScore + cohortBoost + watchBoost + viewBoost + auctionBoost + urgencyBoost + Number(listing.watchers || 0) / 20);
      const hybridScore = clamp(baseContent * contentWeight + collaborative * collaborativeWeight);
      return {
        ...listing,
        matchScore: Math.round(hybridScore),
        hybridScore: Math.round(hybridScore),
        contentScore: Math.round(baseContent),
        collaborativeScore: Math.round(collaborative),
        recommenderWeights: { content: contentWeight, collaborative: collaborativeWeight },
        aiReasons: [
          ...search.reasons,
          behaviorScore > 8 ? 'similar to your activity' : '',
          cohortBoost > 0 ? 'matches your browsing pattern' : '',
          deal >= 80 ? 'strong deal score' : '',
          trust >= 85 ? 'trusted seller' : '',
          urgencyBoost ? 'auction ending soon' : '',
        ].filter(Boolean).slice(0, 4),
      };
    })
    .sort((a, b) => b.hybridScore - a.hybridScore);
};

export const buildSearchFacets = (listings = []) => ({
  cities: [...new Set(listings.map((item) => item.city).filter(Boolean))],
  makes: [...new Set(listings.map((item) => item.make).filter(Boolean))],
  bodyStyles: [...new Set(listings.map((item) => item.bodyStyle).filter(Boolean))],
  sellerTypes: [...new Set(listings.map((item) => item.sellerType).filter(Boolean))],
  price: {
    min: Math.min(...listings.map(getListingPrice).filter(Boolean)),
    max: Math.max(...listings.map(getListingPrice).filter(Boolean)),
  },
});
