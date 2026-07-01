const providerName = process.env.SEARCH_PROVIDER || 'memory';
const searchUrl = process.env.SEARCH_URL || process.env.MEILISEARCH_URL || process.env.ELASTICSEARCH_URL || '';
const searchApiKey = process.env.SEARCH_API_KEY || process.env.MEILISEARCH_API_KEY || process.env.ELASTICSEARCH_API_KEY || '';
const listingsIndex = process.env.SEARCH_LISTINGS_INDEX || 'wheels_deals_listings';

const normalize = (value) => String(value || '').toLowerCase();
const synonymMap = {
  jeep: ['suv', '4x4', 'offroad'],
  suv: ['jeep', 'crossover'],
  loader: ['pickup', 'ravi', 'commercial'],
  bike: ['motorcycle', 'scooter'],
  installments: ['installment', 'monthly', 'finance'],
  automatic: ['auto', 'cvt', 'dct'],
  electric: ['ev'],
};

const termsFor = (term) => [term, ...(synonymMap[term] || [])];

const levenshteinDistance = (a = '', b = '') => {
  const left = String(a);
  const right = String(b);
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

const fuzzyTextMatch = (text, term) => {
  const normalizedText = normalize(text);
  if (!term) return true;
  if (normalizedText.includes(term)) return true;
  if (term.length < 4) return false;
  return normalizedText.split(/\s+/).some((word) => Math.abs(word.length - term.length) <= 2 && levenshteinDistance(word, term) <= (term.length > 6 ? 2 : 1));
};

const scoreListing = (listing, term) => {
  if (!term) return 1;
  const fields = [listing.make, listing.model, listing.variant, listing.city, listing.bodyStyle, listing.powertrain, listing.titleStatus, listing.transmission, listing.exteriorColor, listing.sellerType, listing.engineCapacityCc ? `${listing.engineCapacityCc}cc` : ''];
  const terms = termsFor(term);
  return fields.reduce((score, field) => score + (terms.some((candidate) => fuzzyTextMatch(field, candidate)) ? 1 : 0), 0);
};

const filterRange = (value, min, max) => {
  const numeric = Number(value);
  if (min && numeric < Number(min)) return false;
  if (max && numeric > Number(max)) return false;
  return true;
};

export const searchProviderInfo = () => ({
  provider: providerName,
  configured: providerName === 'memory' || providerName === 'postgres' || Boolean(searchUrl),
  live: providerName !== 'memory' && Boolean(searchUrl || providerName === 'postgres'),
  index: providerName === 'memory' ? undefined : listingsIndex,
});

const searchHeaders = () => ({
  'Content-Type': 'application/json',
  ...(searchApiKey ? { Authorization: `Bearer ${searchApiKey}`, 'X-Meili-API-Key': searchApiKey } : {}),
});

const providerFetch = async (path, options = {}) => {
  if (!searchUrl) throw new Error('SEARCH_URL is not configured.');
  const response = await fetch(`${searchUrl.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: { ...searchHeaders(), ...(options.headers || {}) },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Search provider ${response.status}: ${text || response.statusText}`);
  }
  return response.json().catch(() => ({}));
};

const toSearchDocument = (listing = {}) => ({
  id: String(listing.id),
  listingId: listing.id,
  listingType: listing.listingType,
  status: listing.status,
  name: listing.name || `${listing.year || ''} ${listing.make || ''} ${listing.model || ''}`.trim(),
  year: Number(listing.year) || null,
  make: listing.make,
  model: listing.model,
  variant: listing.variant,
  city: listing.city,
  bodyStyle: listing.bodyStyle,
  powertrain: listing.powertrain || listing.fuel,
  transmission: listing.transmission,
  exteriorColor: listing.exteriorColor,
  interiorColor: listing.interiorColor,
  sellerType: listing.sellerType,
  engineCapacityCc: Number(listing.engineCapacityCc || listing.engineCc || 0),
  titleStatus: listing.titleStatus,
  price: Number(listing.askingPrice || listing.buyNowPrice || listing.marketEstimate || listing.highBid || 0),
  mileageKm: Number(listing.mileageKm || listing.mileageValue || 0),
  inspectionScore: Number(listing.inspectionScore || 0),
  trustScore: Number(listing.trustScore || 0),
  dealScore: Number(listing.dealScore || 0),
  tags: listing.tags || [],
  text: [
    listing.name,
    listing.year,
    listing.make,
    listing.model,
    listing.variant,
    listing.city,
    listing.bodyStyle,
    listing.powertrain || listing.fuel,
    listing.transmission,
    listing.exteriorColor,
    listing.interiorColor,
    listing.sellerType,
    listing.engineCapacityCc ? `${listing.engineCapacityCc}cc` : '',
    listing.titleStatus,
    ...(listing.tags || []),
    ...(listing.highlights || []),
  ].filter(Boolean).join(' '),
});

const buildMeiliFilter = (query) => {
  const filters = [];
  const add = (field, value) => {
    if (value && value !== 'All') filters.push(`${field} = "${String(value).replace(/"/g, '\\"')}"`);
  };
  add('city', query.get?.('city') || query.city);
  add('make', query.get?.('make') || query.make);
  add('model', query.get?.('model') || query.model);
  add('bodyStyle', query.get?.('bodyStyle') || query.bodyStyle);
  add('transmission', query.get?.('transmission') || query.transmission);
  add('exteriorColor', query.get?.('exteriorColor') || query.exteriorColor);
  add('sellerType', query.get?.('sellerType') || query.sellerType);
  add('listingType', query.get?.('listingType') || query.get?.('type') || query.listingType || query.type);
  const minPrice = query.get?.('minPrice') || query.get?.('priceFrom') || query.minPrice || query.priceFrom;
  const maxPrice = query.get?.('maxPrice') || query.get?.('priceTo') || query.maxPrice || query.priceTo;
  if (minPrice) filters.push(`price >= ${Number(minPrice)}`);
  if (maxPrice) filters.push(`price <= ${Number(maxPrice)}`);
  const minCc = query.get?.('minCc') || query.minCc;
  const maxCc = query.get?.('maxCc') || query.maxCc;
  if (minCc) filters.push(`engineCapacityCc >= ${Number(minCc)}`);
  if (maxCc) filters.push(`engineCapacityCc <= ${Number(maxCc)}`);
  return filters.length ? filters : undefined;
};

const searchMeiliListings = async (query) => {
  const payload = {
    q: query.get?.('q') || query.get?.('query') || query.q || query.query || '',
    limit: Math.min(100, Number(query.get?.('limit') || query.limit || 50)),
    filter: buildMeiliFilter(query),
    facets: ['make', 'model', 'city', 'bodyStyle', 'listingType', 'powertrain'],
    attributesToHighlight: ['name', 'make', 'model', 'variant', 'city'],
  };
  const result = await providerFetch(`/indexes/${listingsIndex}/search`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    listings: (result.hits || []).map((hit) => ({ ...hit, id: hit.listingId || hit.id })),
    provider: 'meilisearch',
    raw: { estimatedTotalHits: result.estimatedTotalHits, facetDistribution: result.facetDistribution },
  };
};

const buildElasticFilters = (query) => {
  const filter = [];
  const add = (field, value) => {
    if (value && value !== 'All') filter.push({ term: { [`${field}.keyword`]: value } });
  };
  add('city', query.get?.('city') || query.city);
  add('make', query.get?.('make') || query.make);
  add('model', query.get?.('model') || query.model);
  add('bodyStyle', query.get?.('bodyStyle') || query.bodyStyle);
  add('transmission', query.get?.('transmission') || query.transmission);
  add('exteriorColor', query.get?.('exteriorColor') || query.exteriorColor);
  add('sellerType', query.get?.('sellerType') || query.sellerType);
  add('listingType', query.get?.('listingType') || query.get?.('type') || query.listingType || query.type);
  const minPrice = query.get?.('minPrice') || query.get?.('priceFrom') || query.minPrice || query.priceFrom;
  const maxPrice = query.get?.('maxPrice') || query.get?.('priceTo') || query.maxPrice || query.priceTo;
  if (minPrice || maxPrice) filter.push({ range: { price: { ...(minPrice ? { gte: Number(minPrice) } : {}), ...(maxPrice ? { lte: Number(maxPrice) } : {}) } } });
  const minCc = query.get?.('minCc') || query.minCc;
  const maxCc = query.get?.('maxCc') || query.maxCc;
  if (minCc || maxCc) filter.push({ range: { engineCapacityCc: { ...(minCc ? { gte: Number(minCc) } : {}), ...(maxCc ? { lte: Number(maxCc) } : {}) } } });
  return filter;
};

const searchElasticListings = async (query) => {
  const q = query.get?.('q') || query.get?.('query') || query.q || query.query || '';
  const payload = {
    size: Math.min(100, Number(query.get?.('limit') || query.limit || 50)),
    query: {
      bool: {
        must: q ? [{ multi_match: { query: q, fields: ['name^3', 'make^3', 'model^3', 'variant^2', 'city', 'bodyStyle', 'sellerType', 'text'], fuzziness: 'AUTO' } }] : [{ match_all: {} }],
        filter: buildElasticFilters(query),
      },
    },
    aggs: {
      makes: { terms: { field: 'make.keyword', size: 50 } },
      cities: { terms: { field: 'city.keyword', size: 50 } },
      bodyStyles: { terms: { field: 'bodyStyle.keyword', size: 50 } },
    },
  };
  const result = await providerFetch(`/${listingsIndex}/_search`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    listings: (result.hits?.hits || []).map((hit) => ({ ...hit._source, id: hit._source.listingId || hit._source.id, searchScore: hit._score })),
    provider: 'elasticsearch',
    raw: { total: result.hits?.total, aggregations: result.aggregations },
  };
};

export const searchExternalListings = async (query) => {
  if (providerName === 'meilisearch' || providerName === 'meili') return searchMeiliListings(query);
  if (providerName === 'elasticsearch' || providerName === 'elastic') return searchElasticListings(query);
  return null;
};

export const indexExternalListings = async (listings = []) => {
  const documents = listings.map(toSearchDocument);
  if (providerName === 'meilisearch' || providerName === 'meili') {
    const task = await providerFetch(`/indexes/${listingsIndex}/documents`, {
      method: 'POST',
      body: JSON.stringify(documents),
    });
    return { provider: 'meilisearch', indexed: documents.length, task };
  }
  if (providerName === 'elasticsearch' || providerName === 'elastic') {
    const body = documents.flatMap((doc) => [
      { index: { _index: listingsIndex, _id: String(doc.id) } },
      doc,
    ]).map((line) => JSON.stringify(line)).join('\n') + '\n';
    const result = await providerFetch('/_bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson' },
      body,
    });
    return { provider: 'elasticsearch', indexed: documents.length, errors: Boolean(result.errors) };
  }
  return { provider: providerName, indexed: 0, skipped: true };
};

export const searchListings = (listings, query) => {
  const term = normalize(query.get('q') || query.get('query'));
  const category = query.get('category');
  const city = query.get('city');
  const make = query.get('make');
  const model = query.get('model');
  const minYear = query.get('minYear') || query.get('yearFrom');
  const maxYear = query.get('maxYear') || query.get('yearTo');
  const minPrice = query.get('minPrice') || query.get('priceFrom');
  const maxPrice = query.get('maxPrice') || query.get('priceTo');
  const minCc = query.get('minCc');
  const maxCc = query.get('maxCc');
  const transmission = query.get('transmission');
  const exteriorColor = query.get('exteriorColor');
  const sellerType = query.get('sellerType');

  return listings
    .map((listing) => ({ listing, score: scoreListing(listing, term) }))
    .filter(({ listing, score }) => !term || score > 0 || JSON.stringify(listing).toLowerCase().includes(term))
    .filter(({ listing }) => !category || category === 'All' || normalize(listing.listingType) === normalize(category) || normalize(listing.bodyStyle) === normalize(category))
    .filter(({ listing }) => !city || city === 'All' || listing.city === city)
    .filter(({ listing }) => !make || make === 'All' || listing.make === make)
    .filter(({ listing }) => !model || model === 'All' || listing.model === model)
    .filter(({ listing }) => !transmission || transmission === 'All' || normalize(listing.transmission).includes(normalize(transmission)))
    .filter(({ listing }) => !exteriorColor || exteriorColor === 'All' || normalize(listing.exteriorColor).includes(normalize(exteriorColor)))
    .filter(({ listing }) => !sellerType || sellerType === 'All' || normalize(listing.sellerType).includes(normalize(sellerType)))
    .filter(({ listing }) => filterRange(listing.year, minYear, maxYear))
    .filter(({ listing }) => filterRange(listing.engineCapacityCc || listing.engineCc, minCc, maxCc))
    .filter(({ listing }) => filterRange(listing.askingPrice || listing.marketEstimate || listing.buyNowPrice, minPrice, maxPrice))
    .sort((a, b) => b.score - a.score)
    .map(({ listing }) => listing);
};
