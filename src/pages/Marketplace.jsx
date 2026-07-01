import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { formatPkr, getDisplayPrice } from '../data/cars';
import {
  engineCapacityRanges,
  pakistanCities,
  powertrains,
  vehicleBodyStyles,
  vehicleMakesModels,
  vehicleMarketplaceCategories,
  vehicleSearchFacets,
} from '../data/taxonomy';
import { parseNaturalVehicleQuery, rankHybridListings, scoreVehicleSearchMatch } from '../services/searchRecommenderEngine';
import { useAuctions } from '../context/AuctionContext';

const defaultFilters = {
  query: '',
  category: 'All',
  city: 'All',
  make: 'All',
  model: 'All',
  type: 'All',
  bodyStyle: 'All',
  powertrain: 'All',
  transmission: 'All',
  sellerType: 'All',
  drivetrain: 'All',
  exteriorColor: 'All',
  interiorColor: 'All',
  titleStatus: 'All',
  minPrice: '',
  maxPrice: '',
  installmentsOnly: 'All',
  maxMonthlyInstallment: '',
  maxDownPayment: '',
  minMileage: '',
  maxMileage: 'All',
  engineCc: 'All',
  minCc: '',
  maxCc: '',
  minYear: 'All',
  maxYear: 'All',
  minInspection: 'All',
  minTrust: 'All',
  minDeal: 'All',
  reserveStatus: 'All',
  maxBudget: 'All',
  locationMode: 'All Pakistan',
  radiusKm: 'Any distance',
  facet: 'All',
  sort: 'Recommended',
};

const budgetOptions = [
  { label: 'All', value: Infinity },
  { label: 'Under 30 Lakh', value: 3000000 },
  { label: 'Under 60 Lakh', value: 6000000 },
  { label: 'Under 90 Lakh', value: 9000000 },
  { label: 'Above 90 Lakh', value: Number.MAX_SAFE_INTEGER },
];

const Marketplace = () => {
  const { visibleCars, watchlist, toggleWatchlist, saveSearch, savedSearches, compareIds, toggleCompare, recommenderDiagnostics } = useAuctions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => {
    const fromUrl = { ...defaultFilters };
    Object.keys(defaultFilters).forEach((key) => {
      const value = searchParams.get(key);
      if (value) fromUrl[key] = value;
    });
    return fromUrl;
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [viewMode, setViewMode] = useState('Grid');
  const liveCars = visibleCars.filter((car) => car.listingType !== 'Auction');
  const searchIntent = useMemo(() => parseNaturalVehicleQuery(filters.query), [filters.query]);

  useEffect(() => {
    const nextParams = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== defaultFilters[key]) nextParams[key] = value;
    });
    setSearchParams(nextParams, { replace: true });
  }, [filters, setSearchParams]);

  const unique = (field) => ['All', ...new Set(liveCars.map((car) => car[field]).filter(Boolean))];
  const cities = ['All', ...new Set([...pakistanCities, ...liveCars.map((car) => car.city).filter(Boolean)])];
  const makes = ['All', ...new Set([...Object.keys(vehicleMakesModels), ...liveCars.map((car) => car.make).filter(Boolean)])];
  const models = filters.make === 'All'
    ? ['All', ...new Set([...Object.values(vehicleMakesModels).flat(), ...liveCars.map((car) => car.model).filter(Boolean)])]
    : ['All', ...new Set([...(vehicleMakesModels[filters.make] || []), ...liveCars.filter((car) => car.make === filters.make).map((car) => car.model).filter(Boolean)])];
  const categories = ['All', ...vehicleMarketplaceCategories];
  const bodyStyles = ['All', ...new Set([...vehicleBodyStyles, ...liveCars.map((car) => car.bodyStyle).filter(Boolean)])];
  const transmissions = unique('transmission');
  const sellerTypes = unique('sellerType');
  const drivetrains = unique('drivetrain');
  const exteriorColors = unique('exteriorColor');
  const interiorColors = unique('interiorColor');
  const titleStatuses = unique('titleStatus');

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'make' ? { model: 'All' } : {}),
    }));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Location services are not available in this browser.');
      return;
    }

    setLocationMessage('Checking your location...');
    navigator.geolocation.getCurrentPosition(
      () => {
        setFilters((current) => ({ ...current, locationMode: 'Near Me' }));
        setLocationMessage('Near Me enabled. Backend distance sorting will use precise coordinates later.');
      },
      () => setLocationMessage('Location permission was not granted. You can still choose a city manually.'),
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const filteredCars = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const parsedQuery = parseNaturalVehicleQuery(filters.query);

    const results = liveCars.filter((car) => {
      const price = car.listingType === 'Auction' ? car.highBid : car.buyNowPrice;
      const minPrice = filters.minPrice === '' ? 0 : Number(filters.minPrice);
      const maxPrice = filters.maxPrice === '' ? Infinity : Number(filters.maxPrice);
      const maxMonthlyInstallment = filters.maxMonthlyInstallment === '' ? Infinity : Number(filters.maxMonthlyInstallment);
      const maxDownPayment = filters.maxDownPayment === '' ? Infinity : Number(filters.maxDownPayment);
      const selectedBudget = budgetOptions.find((option) => option.label === filters.maxBudget);
      const budgetLimit = selectedBudget?.value ?? Infinity;
      const matchesHighBudget = filters.maxBudget === 'Above 90 Lakh' ? price > 9000000 : price <= budgetLimit;
      const fuel = car.powertrain || car.fuel;
      const minMileageLimit = filters.minMileage === '' ? 0 : Number(filters.minMileage);
      const mileageLimit = filters.maxMileage === 'All' ? Infinity : Number(filters.maxMileage);
      const yearLimit = filters.minYear === 'All' ? 0 : Number(filters.minYear);
      const maxYearLimit = filters.maxYear === 'All' ? Infinity : Number(filters.maxYear);
      const inspectionLimit = filters.minInspection === 'All' ? 0 : Number(filters.minInspection);
      const trustLimit = filters.minTrust === 'All' ? 0 : Number(filters.minTrust);
      const dealLimit = filters.minDeal === 'All' ? 0 : Number(filters.minDeal);
      const engineCc = getEngineCc(car);
      const selectedCcRange = engineCapacityRanges.find((range) => range.label === filters.engineCc) || engineCapacityRanges[0];
      const minCc = filters.minCc === '' ? 0 : Number(filters.minCc);
      const maxCc = filters.maxCc === '' ? Infinity : Number(filters.maxCc);
      const category = getVehicleCategory(car);
      const haystack = [
        car.year,
        car.make,
        car.model,
        car.variant,
        car.city,
        car.location,
        car.bodyStyle,
        car.seller,
        car.sellerType,
        car.titleStatus,
        car.fuel,
        car.engine,
        engineCc ? `${engineCc}cc` : '',
        category,
        ...(car.tags || []),
      ].join(' ').toLowerCase();
      const semanticMatch = scoreVehicleSearchMatch(car, parsedQuery);
      const queryTermsMatch = !parsedQuery.terms.length || parsedQuery.terms.every((term) => haystack.includes(term));
      const matchesSearchIntent = !query || queryTermsMatch || (semanticMatch.score > 0 && semanticMatch.passesNaturalFilters);
      const naturalMaxPrice = parsedQuery.filters.maxPrice || Infinity;
      const naturalMinPrice = parsedQuery.filters.minPrice || 0;
      const naturalMinCc = parsedQuery.filters.minCc || 0;
      const naturalMaxCc = parsedQuery.filters.maxCc || Infinity;
      const naturalMinYear = parsedQuery.filters.minYear || 0;
      const naturalMaxYear = parsedQuery.filters.maxYear || Infinity;
      const naturalMaxMileage = parsedQuery.filters.maxMileage || Infinity;

      return (
        matchesSearchIntent &&
        (filters.category === 'All' || category === filters.category || car.bodyStyle === filters.category) &&
        (filters.city === 'All' || car.city === filters.city) &&
        (filters.make === 'All' || car.make === filters.make) &&
        (filters.model === 'All' || car.model === filters.model) &&
        (filters.type === 'All' || car.listingType === filters.type) &&
        (filters.bodyStyle === 'All' || car.bodyStyle === filters.bodyStyle) &&
        (filters.powertrain === 'All' || fuel === filters.powertrain) &&
        (filters.transmission === 'All' || car.transmission === filters.transmission) &&
        (filters.sellerType === 'All' || car.sellerType === filters.sellerType) &&
        (filters.drivetrain === 'All' || car.drivetrain === filters.drivetrain) &&
        (filters.exteriorColor === 'All' || car.exteriorColor === filters.exteriorColor) &&
        (filters.interiorColor === 'All' || car.interiorColor === filters.interiorColor) &&
        (filters.titleStatus === 'All' || car.titleStatus === filters.titleStatus) &&
        price >= minPrice &&
        price <= maxPrice &&
        (filters.installmentsOnly === 'All' || Boolean(car.installmentAvailable)) &&
        (filters.maxMonthlyInstallment === '' || Number(car.monthlyInstallment || Infinity) <= maxMonthlyInstallment) &&
        (filters.maxDownPayment === '' || Number(car.downPayment || Infinity) <= maxDownPayment) &&
        (filters.minMileage === '' || car.mileageValue >= minMileageLimit) &&
        (filters.maxMileage === 'All' || car.mileageValue <= mileageLimit) &&
        (filters.engineCc === 'All' || (engineCc >= selectedCcRange.min && engineCc <= selectedCcRange.max)) &&
        (filters.minCc === '' || engineCc >= minCc) &&
        (filters.maxCc === '' || engineCc <= maxCc) &&
        (filters.minYear === 'All' || car.year >= yearLimit) &&
        (filters.maxYear === 'All' || car.year <= maxYearLimit) &&
        (filters.minInspection === 'All' || Number(car.inspectionScore || 0) >= inspectionLimit) &&
        (filters.minTrust === 'All' || Number(car.trustScore || 0) >= trustLimit) &&
        (filters.minDeal === 'All' || Number(car.dealScore || 0) >= dealLimit) &&
        (filters.reserveStatus === 'All' || car.reserveStatus === filters.reserveStatus) &&
        (filters.facet === 'All' || matchesFacet(car, filters.facet)) &&
        (filters.maxBudget === 'All' || matchesHighBudget)
        && (!parsedQuery.filters.city || car.city === parsedQuery.filters.city)
        && (!parsedQuery.filters.make || car.make === parsedQuery.filters.make)
        && (!parsedQuery.filters.minPrice || price >= naturalMinPrice)
        && (!parsedQuery.filters.maxPrice || price <= naturalMaxPrice)
        && (!parsedQuery.filters.minCc || (engineCc >= naturalMinCc && engineCc <= naturalMaxCc))
        && (!parsedQuery.filters.minYear || (car.year >= naturalMinYear && car.year <= naturalMaxYear))
        && (!parsedQuery.filters.maxMileage || Number(car.mileageValue || 0) <= naturalMaxMileage)
        && (!parsedQuery.filters.transmission || String(car.transmission || '').toLowerCase().includes(String(parsedQuery.filters.transmission).toLowerCase()))
        && (!parsedQuery.filters.exteriorColor || String(car.exteriorColor || '').toLowerCase().includes(String(parsedQuery.filters.exteriorColor).toLowerCase()))
        && (!parsedQuery.filters.drivetrain || String(car.drivetrain || '').toLowerCase().includes(String(parsedQuery.filters.drivetrain).toLowerCase()))
        && (!parsedQuery.filters.verifiedSeller || String(car.sellerType || '').toLowerCase().includes('dealer'))
        && (!parsedQuery.filters.inspected || Number(car.inspectionScore || 0) >= 70)
        && (!parsedQuery.filters.installmentsOnly || car.installmentAvailable)
      );
    });

    const ranked = rankHybridListings(results, { watchlist, recentlyViewed: [], savedSearches }, { query: filters.query });
    const rankedWithReasons = ranked.map((car) => ({
      ...car,
      aiReasons: (car.aiReasons?.length ? car.aiReasons : buildMarketplaceReasons(car, filters)).slice(0, 4),
    }));

    return [...rankedWithReasons].sort((a, b) => {
      if (filters.sort === 'Ending Soon') return (a.endsInMinutes ?? Infinity) - (b.endsInMinutes ?? Infinity);
      if (filters.sort === 'Best Deal') return b.dealScore - a.dealScore;
      if (filters.sort === 'Highest Trust') return b.trustScore - a.trustScore;
      if (filters.sort === 'Lowest Mileage') return a.mileageValue - b.mileageValue;
      if (filters.sort === 'Price Low to High') {
        return (a.highBid || a.buyNowPrice) - (b.highBid || b.buyNowPrice);
      }
      return (b.hybridScore || b.recommendationScore) - (a.hybridScore || a.recommendationScore);
    });
  }, [filters, liveCars, savedSearches, watchlist]);

  const clearFilters = () => setFilters(defaultFilters);
  const handleSaveSearch = () => {
    saveSearch(filters);
    setSaveMessage('Search saved. You can find it in recommendations.');
    window.setTimeout(() => setSaveMessage(''), 2500);
  };
  const activeFilterEntries = Object.entries(filters).filter(([key, value]) =>
    Object.prototype.hasOwnProperty.call(defaultFilters, key) && key !== 'sort' && value && value !== defaultFilters[key]
  );
  const activeFilterCount = activeFilterEntries.length;
  const applySavedSearch = (search) => {
    const nextFilters = Object.keys(defaultFilters).reduce((acc, key) => {
      acc[key] = search[key] ?? defaultFilters[key];
      return acc;
    }, {});
    setFilters(nextFilters);
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-8 items-center">
          <div>
            <p className="text-blue-400 font-black text-xs tracking-[0.3em] uppercase mb-3">Fixed-price marketplace</p>
            <h1 className="text-3xl md:text-5xl font-black leading-tight max-w-3xl">
              Find cars, bikes, loaders, trucks, and parts from sellers who are not rushing an auction.
            </h1>
            <p className="text-slate-300 text-base md:text-lg mt-4 max-w-2xl">
              Browse fixed-price and negotiable listings separately from auctions, ranked by deal score, seller trust, inspection quality, city, and category.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {vehicleSearchFacets.slice(0, 8).map((facet) => (
                <button key={facet} onClick={() => updateFilter('facet', facet)} className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-full px-3 py-1 text-xs font-black">
                  {facet}
                </button>
              ))}
            </div>
          </div>

          {liveCars[0] && (
            <Link
              to={`/listing/${liveCars[0].id}`}
              className="bg-white text-slate-950 rounded-xl overflow-hidden shadow-2xl border border-white/10 hover:-translate-y-1 transition-all"
            >
              <div className="relative h-48 bg-slate-200">
                <img src={liveCars[0].images[0]} alt={liveCars[0].name} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black">MARKETPLACE PICK</span>
                {String(liveCars[0].sellerType || '').toLowerCase().includes('dealer') && (
                  <span className="absolute top-3 right-3 bg-emerald-400 text-slate-950 px-3 py-1 rounded-full text-xs font-black">VERIFIED DEALER</span>
                )}
              </div>
              <div className="p-5">
                <h2 className="font-black text-xl">{liveCars[0].name}</h2>
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <Metric label="Price" value={formatPkr(liveCars[0].buyNowPrice)} />
                  <Metric label="Trust" value={liveCars[0].trustScore} />
                  <Metric label="Deal" value={liveCars[0].dealScore} />
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="lg:hidden bg-white border border-slate-200 rounded-xl shadow-sm p-3 sticky top-20 z-30">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search vehicles"
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
                placeholder="Search cars, bikes, loaders, 660cc..."
                className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-3 font-semibold outline-none focus:border-blue-600"
              />
            </div>
            <button onClick={() => setShowMobileFilters(true)} className="border border-slate-200 rounded-lg px-3 py-3 bg-slate-900 text-white font-bold flex items-center gap-2">
              <SlidersHorizontal size={18} />
              {activeFilterCount || ''}
            </button>
          </div>
        </div>

        <div className="hidden lg:grid bg-white border border-slate-200 rounded-xl shadow-sm p-4 grid-cols-8 gap-3 sticky top-20 z-30">
          <div className="lg:col-span-2 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search make, model, category, city, or cc"
              value={filters.query}
              onChange={(event) => updateFilter('query', event.target.value)}
              placeholder="Search make, model, city, 660cc..."
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 font-semibold outline-none focus:border-blue-600"
            />
          </div>
          <FilterSelect value={filters.category} onChange={(value) => updateFilter('category', value)} options={categories} label="Category" />
          <FilterSelect value={filters.city} onChange={(value) => updateFilter('city', value)} options={cities} label="City" />
          <FilterSelect value={filters.make} onChange={(value) => updateFilter('make', value)} options={makes} label="Make" />
          <FilterSelect value={filters.model} onChange={(value) => updateFilter('model', value)} options={models} label="Model" />
          <FilterSelect value={filters.type} onChange={(value) => updateFilter('type', value)} options={['All', 'Marketplace']} label="Sale" />
          <FilterSelect value={filters.maxBudget} onChange={(value) => updateFilter('maxBudget', value)} options={budgetOptions.map((option) => option.label)} label="Budget" />
          <button onClick={() => setShowAdvanced((current) => !current)} className="border border-slate-200 rounded-lg px-3 py-3 bg-slate-900 text-white font-bold flex items-center justify-center gap-2">
            <Filter size={17} />
            {showAdvanced ? 'Hide' : 'More'}
          </button>
        </div>

        {showAdvanced && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <FilterSelect value={filters.bodyStyle} onChange={(value) => updateFilter('bodyStyle', value)} options={bodyStyles} label="Body / vehicle type" />
            <FilterSelect value={filters.powertrain} onChange={(value) => updateFilter('powertrain', value)} options={['All', ...powertrains]} label="Powertrain" />
            <FilterSelect value={filters.transmission} onChange={(value) => updateFilter('transmission', value)} options={transmissions} label="Transmission" />
            <FilterSelect value={filters.sellerType} onChange={(value) => updateFilter('sellerType', value)} options={sellerTypes} label="Seller" />
            <FilterSelect value={filters.drivetrain} onChange={(value) => updateFilter('drivetrain', value)} options={drivetrains} label="Drivetrain" />
            <FilterSelect value={filters.exteriorColor} onChange={(value) => updateFilter('exteriorColor', value)} options={exteriorColors} label="Exterior color" />
            <FilterSelect value={filters.interiorColor} onChange={(value) => updateFilter('interiorColor', value)} options={interiorColors} label="Interior color" />
            <FilterSelect value={filters.titleStatus} onChange={(value) => updateFilter('titleStatus', value)} options={titleStatuses} label="Title / registration" />
            <NumberFilter label="Price from" value={filters.minPrice} onChange={(value) => updateFilter('minPrice', value)} placeholder="PKR min" />
            <NumberFilter label="Price to" value={filters.maxPrice} onChange={(value) => updateFilter('maxPrice', value)} placeholder="PKR max" />
            <NumberFilter label="Year from" value={filters.minYear === 'All' ? '' : filters.minYear} onChange={(value) => updateFilter('minYear', value || 'All')} placeholder="2018" />
            <NumberFilter label="Year to" value={filters.maxYear === 'All' ? '' : filters.maxYear} onChange={(value) => updateFilter('maxYear', value || 'All')} placeholder="2026" />
            <NumberFilter label="Mileage from" value={filters.minMileage} onChange={(value) => updateFilter('minMileage', value)} placeholder="0 km" />
            <NumberFilter label="Mileage to" value={filters.maxMileage === 'All' ? '' : filters.maxMileage} onChange={(value) => updateFilter('maxMileage', value || 'All')} placeholder="100000 km" />
            <NumberFilter label="CC from" value={filters.minCc} onChange={(value) => updateFilter('minCc', value)} placeholder="660" />
            <NumberFilter label="CC to" value={filters.maxCc} onChange={(value) => updateFilter('maxCc', value)} placeholder="1800" />
            <FilterSelect value={filters.engineCc} onChange={(value) => updateFilter('engineCc', value)} options={engineCapacityRanges.map((range) => range.label)} label="Quick CC range" />
            <FilterSelect value={filters.radiusKm} onChange={(value) => updateFilter('radiusKm', value)} options={['Any distance', '5 km', '10 km', '25 km', '50 km', '100 km', 'City only']} label="Location range" />
            <FilterSelect value={filters.minInspection} onChange={(value) => updateFilter('minInspection', value)} options={['All', '90', '80', '70', '60']} label="Inspection" />
            <FilterSelect value={filters.minTrust} onChange={(value) => updateFilter('minTrust', value)} options={['All', '90', '80', '70', '60']} label="Seller trust" />
            <FilterSelect value={filters.minDeal} onChange={(value) => updateFilter('minDeal', value)} options={['All', '90', '80', '70', '60']} label="Deal score" />
            <FilterSelect value={filters.reserveStatus} onChange={(value) => updateFilter('reserveStatus', value)} options={['All', 'Reserve met', 'Reserve nearly met', 'Reserve not met', 'No reserve']} label="Reserve" />
            <FilterSelect value={filters.facet} onChange={(value) => updateFilter('facet', value)} options={['All', ...vehicleSearchFacets]} label="Smart facet" />
            <button type="button" onClick={useCurrentLocation} className="text-center border border-blue-200 text-blue-700 rounded-lg px-3 py-3 bg-blue-50 font-bold">
              Use current location
            </button>
            <Link to="/garage" className="text-center border border-emerald-200 text-emerald-700 rounded-lg px-3 py-3 bg-emerald-50 font-bold">
              My Garage
            </Link>
          </div>
        )}

        {locationMessage && <p role="status" className="mt-3 bg-white border border-blue-100 text-blue-700 rounded-lg px-4 py-2 text-sm font-bold">{locationMessage}</p>}

        <SearchIntentPanel
          query={filters.query}
          intent={searchIntent}
          resultCount={filteredCars.length}
          onApply={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        />

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Popular vehicle categories">
          {vehicleMarketplaceCategories.slice(0, 12).map((category) => (
            <button
              key={category}
              onClick={() => updateFilter('category', category)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${filters.category === category ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
            >
              {category}
            </button>
          ))}
        </div>

        {(activeFilterEntries.length > 0 || saveMessage) && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {activeFilterEntries.map(([key, value]) => (
              <button key={key} onClick={() => updateFilter(key, defaultFilters[key])} className="bg-white border border-slate-200 rounded-full px-3 py-1 text-xs font-black text-slate-700 flex items-center gap-1">
                {key}: {value}
                <X size={12} />
              </button>
            ))}
            {saveMessage && <span role="status" aria-live="polite" className="bg-blue-50 border border-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-black">{saveMessage}</span>}
          </div>
        )}

        <div className="lg:hidden grid grid-cols-2 gap-2 mt-3">
          <button onClick={handleSaveSearch} className="bg-blue-600 text-white rounded-lg py-2 font-black text-sm">Save Search</button>
          <button onClick={clearFilters} className="bg-white border border-slate-200 text-slate-700 rounded-lg py-2 font-black text-sm">Reset</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 mt-6">
          <aside className="hidden lg:block space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-black text-slate-900 mb-4">Filters</h2>
              <div className="space-y-3">
                <FilterSelect value={filters.category} onChange={(value) => updateFilter('category', value)} options={categories} label="Category" />
                <FilterSelect value={filters.city} onChange={(value) => updateFilter('city', value)} options={cities} label="Location" />
                <FilterSelect value={filters.installmentsOnly} onChange={(value) => updateFilter('installmentsOnly', value)} options={['All', 'Installments only']} label="Installments" />
                <div className="grid grid-cols-2 gap-2">
                  <NumberFilter label="Price from" value={filters.minPrice} onChange={(value) => updateFilter('minPrice', value)} placeholder="Min" />
                  <NumberFilter label="Price to" value={filters.maxPrice} onChange={(value) => updateFilter('maxPrice', value)} placeholder="Max" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberFilter label="Monthly max" value={filters.maxMonthlyInstallment} onChange={(value) => updateFilter('maxMonthlyInstallment', value)} placeholder="EMI" />
                  <NumberFilter label="Down pay max" value={filters.maxDownPayment} onChange={(value) => updateFilter('maxDownPayment', value)} placeholder="Down" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberFilter label="Year from" value={filters.minYear === 'All' ? '' : filters.minYear} onChange={(value) => updateFilter('minYear', value || 'All')} placeholder="2018" />
                  <NumberFilter label="Year to" value={filters.maxYear === 'All' ? '' : filters.maxYear} onChange={(value) => updateFilter('maxYear', value || 'All')} placeholder="2026" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberFilter label="KM from" value={filters.minMileage} onChange={(value) => updateFilter('minMileage', value)} placeholder="0" />
                  <NumberFilter label="KM to" value={filters.maxMileage === 'All' ? '' : filters.maxMileage} onChange={(value) => updateFilter('maxMileage', value || 'All')} placeholder="100000" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberFilter label="CC from" value={filters.minCc} onChange={(value) => updateFilter('minCc', value)} placeholder="660" />
                  <NumberFilter label="CC to" value={filters.maxCc} onChange={(value) => updateFilter('maxCc', value)} placeholder="1800" />
                </div>
                <FilterSelect value={filters.make} onChange={(value) => updateFilter('make', value)} options={makes} label="Make" />
                <FilterSelect value={filters.model} onChange={(value) => updateFilter('model', value)} options={models} label="Model" />
                <FilterSelect value={filters.transmission} onChange={(value) => updateFilter('transmission', value)} options={transmissions} label="Transmission" />
                <FilterSelect value={filters.powertrain} onChange={(value) => updateFilter('powertrain', value)} options={['All', ...powertrains]} label="Fuel" />
                <FilterSelect value={filters.exteriorColor} onChange={(value) => updateFilter('exteriorColor', value)} options={exteriorColors} label="Color" />
                <FilterSelect value={filters.sellerType} onChange={(value) => updateFilter('sellerType', value)} options={sellerTypes} label="Seller type" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-black text-slate-900 mb-4">Sort and save</h2>
              <FilterSelect
                value={filters.sort}
                onChange={(value) => updateFilter('sort', value)}
                options={['Recommended', 'Ending Soon', 'Best Deal', 'Highest Trust', 'Lowest Mileage', 'Price Low to High']}
                label="Sort"
              />
              <button onClick={clearFilters} className="w-full mt-3 border border-slate-300 rounded-lg py-2 font-bold text-slate-600 hover:bg-slate-50">
                Reset filters
              </button>
              <button onClick={handleSaveSearch} className="w-full mt-3 bg-blue-600 text-white rounded-lg py-2 font-bold hover:bg-blue-700">
                Save Search
              </button>
              {savedSearches.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-400 font-bold">{savedSearches.length} saved searches</p>
                  {savedSearches.slice(0, 2).map((search) => (
                    <button key={search.id} onClick={() => applySavedSearch(search)} className="w-full text-left border border-slate-100 rounded-lg p-2 hover:border-blue-300">
                      <p className="text-xs font-black text-slate-900 truncate">{search.query || search.make || search.city || 'Saved search'}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{search.savedAt}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-black text-slate-900 mb-4">Buyer intelligence</h2>
              <div className="space-y-3">
                <Insight label="Search engine" value={`${recommenderDiagnostics.indexedVehicles} vehicles indexed locally`} />
                <Insight label="Hybrid weights" value={`${Math.round(recommenderDiagnostics.weights.content * 100)}% content / ${Math.round(recommenderDiagnostics.weights.collaborative * 100)}% collaborative`} />
                <Insight label="No paid API" value="Natural search and ranking run in local app code." />
              </div>
            </div>
          </aside>

          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
              <h2 className="text-2xl font-black text-slate-900" aria-live="polite">{filteredCars.length} matches</h2>
                <p className="text-sm text-slate-500">Marketplace shows fixed-price and negotiable listings only. Auctions stay in the dedicated Auctions page.</p>
              </div>
              {compareIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-lg px-4 py-2 font-bold text-sm">
                  Compare queue: {compareIds.length}/4 cars
                </div>
              )}
              <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                {['Grid', 'List', 'Compact'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-2 rounded-md text-sm font-black ${viewMode === mode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {filteredCars.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                <h3 className="text-xl font-black text-slate-900">No marketplace listings match those filters.</h3>
                <p className="text-slate-500 mt-2">Try widening budget, city, year, CC range, or seller trust. You can also save this search and get alerted later.</p>
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  <button onClick={clearFilters} className="bg-slate-900 text-white px-5 py-2 rounded-lg font-bold">Clear all filters</button>
                  <button onClick={handleSaveSearch} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold">Save empty search</button>
                  <button onClick={() => setShowAdvanced(true)} className="border border-slate-200 bg-white text-slate-700 px-5 py-2 rounded-lg font-bold">Open deep filters</button>
                </div>
              </div>
            ) : (
              <div className={viewMode === 'Grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'space-y-4'}>
                {filteredCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    viewMode={viewMode}
                    selected={compareIds.includes(car.id)}
                    watched={watchlist.includes(car.id)}
                    onCompare={() => toggleCompare(car.id)}
                    onWatch={() => toggleWatchlist(car.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close filters" onClick={() => setShowMobileFilters(false)} className="absolute inset-0 bg-slate-950/60" />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-600">Marketplace filters</p>
                <h2 className="text-xl font-black text-slate-900">{filteredCars.length} matches</h2>
              </div>
              <button onClick={() => setShowMobileFilters(false)} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <FilterSelect value={filters.category} onChange={(value) => updateFilter('category', value)} options={categories} label="Category" />
              <FilterSelect value={filters.city} onChange={(value) => updateFilter('city', value)} options={cities} label="City" />
              <FilterSelect value={filters.make} onChange={(value) => updateFilter('make', value)} options={makes} label="Make" />
              <FilterSelect value={filters.model} onChange={(value) => updateFilter('model', value)} options={models} label="Model" />
              <FilterSelect value={filters.type} onChange={(value) => updateFilter('type', value)} options={['All', 'Marketplace']} label="Listing type" />
              <FilterSelect value={filters.bodyStyle} onChange={(value) => updateFilter('bodyStyle', value)} options={bodyStyles} label="Body style" />
              <FilterSelect value={filters.maxBudget} onChange={(value) => updateFilter('maxBudget', value)} options={budgetOptions.map((option) => option.label)} label="Budget" />
              <div className="grid grid-cols-2 gap-3">
                <NumberFilter label="Price from" value={filters.minPrice} onChange={(value) => updateFilter('minPrice', value)} placeholder="PKR min" />
                <NumberFilter label="Price to" value={filters.maxPrice} onChange={(value) => updateFilter('maxPrice', value)} placeholder="PKR max" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberFilter label="Year from" value={filters.minYear === 'All' ? '' : filters.minYear} onChange={(value) => updateFilter('minYear', value || 'All')} placeholder="2018" />
                <NumberFilter label="Year to" value={filters.maxYear === 'All' ? '' : filters.maxYear} onChange={(value) => updateFilter('maxYear', value || 'All')} placeholder="2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberFilter label="CC from" value={filters.minCc} onChange={(value) => updateFilter('minCc', value)} placeholder="660" />
                <NumberFilter label="CC to" value={filters.maxCc} onChange={(value) => updateFilter('maxCc', value)} placeholder="1800" />
              </div>
              <FilterSelect value={filters.powertrain} onChange={(value) => updateFilter('powertrain', value)} options={['All', ...powertrains]} label="Powertrain" />
              <FilterSelect value={filters.engineCc} onChange={(value) => updateFilter('engineCc', value)} options={engineCapacityRanges.map((range) => range.label)} label="Engine CC" />
              <FilterSelect value={filters.transmission} onChange={(value) => updateFilter('transmission', value)} options={transmissions} label="Transmission" />
              <FilterSelect value={filters.exteriorColor} onChange={(value) => updateFilter('exteriorColor', value)} options={exteriorColors} label="Exterior color" />
              <FilterSelect value={filters.titleStatus} onChange={(value) => updateFilter('titleStatus', value)} options={titleStatuses} label="Title / registration" />
              <FilterSelect value={filters.minInspection} onChange={(value) => updateFilter('minInspection', value)} options={['All', '90', '80', '70', '60']} label="Inspection score" />
              <FilterSelect value={filters.facet} onChange={(value) => updateFilter('facet', value)} options={['All', ...vehicleSearchFacets]} label="Smart facet" />
              <FilterSelect value={filters.sort} onChange={(value) => updateFilter('sort', value)} options={['Recommended', 'Ending Soon', 'Best Deal', 'Highest Trust', 'Lowest Mileage', 'Price Low to High']} label="Sort" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 sticky bottom-0 bg-white pt-3">
              <button onClick={clearFilters} className="border border-slate-300 rounded-lg py-3 font-black text-slate-700">Reset</button>
              <button onClick={() => setShowMobileFilters(false)} className="bg-slate-900 text-white rounded-lg py-3 font-black">Show Results</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

const FilterSelect = ({ value, onChange, options, label }) => (
  <label className="block">
    {label && <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-black mb-1">{label}</span>}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border border-slate-200 rounded-lg px-3 py-3 bg-white font-bold text-slate-700 outline-none focus:border-blue-600"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const NumberFilter = ({ label, value, onChange, placeholder }) => (
  <label className="block">
    <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-black mb-1">{label}</span>
    <input
      type="number"
      min="0"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full border border-slate-200 rounded-lg px-3 py-3 bg-white font-bold text-slate-700 outline-none focus:border-blue-600"
    />
  </label>
);

const Metric = ({ label, value }) => (
  <div className="bg-slate-50 rounded-lg p-3">
    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">{label}</p>
    <p className="text-sm font-black text-slate-900 truncate">{value}</p>
  </div>
);

const Insight = ({ label, value }) => (
  <div className="border border-slate-100 rounded-lg p-3">
    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">{label}</p>
    <p className="text-sm font-bold text-slate-800 mt-1">{value}</p>
  </div>
);

const SearchIntentPanel = ({ query, intent, resultCount, onApply }) => {
  const chips = Object.entries(intent.filters || {}).filter(([, value]) => value !== undefined && value !== null && value !== false);
  if (!query.trim() && chips.length === 0) {
    return (
      <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Smart search examples</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            ['660cc automatic Lahore under 30 lakh', { query: '660cc automatic Lahore under 30 lakh' }],
            ['hybrid sedan Karachi installments', { query: 'hybrid sedan Karachi installments' }],
            ['pickup loader diesel', { query: 'pickup loader diesel' }],
            ['white Toyota 2018 to 2022', { query: 'white Toyota 2018 to 2022' }],
          ].map(([label, patch]) => (
            <button key={label} onClick={() => onApply(patch)} className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-black">
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">Search understood</p>
          <p className="text-sm font-bold text-blue-900 mt-1">{resultCount} results ranked by semantic match, deal score, seller trust, inspection, and your behavior signals.</p>
        </div>
        <Link to="/recommendations" className="text-sm font-black text-blue-700 hover:underline">Open recommender lab</Link>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {chips.map(([key, value]) => (
          <span key={key} className="rounded-full bg-white border border-blue-100 px-3 py-1 text-xs font-black text-blue-900">
            {formatIntentKey(key)}: {String(value)}
          </span>
        ))}
        {intent.terms.slice(0, 8).map((term) => (
          <span key={term} className="rounded-full bg-white border border-blue-100 px-3 py-1 text-xs font-black text-slate-700">
            term: {term}
          </span>
        ))}
      </div>
    </div>
  );
};

const CarCard = ({ car, viewMode, selected, watched, onCompare, onWatch }) => (
  <article className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all ${viewMode === 'List' ? 'md:grid md:grid-cols-[260px_1fr]' : ''} ${viewMode === 'Compact' ? 'p-3' : ''}`}>
    <Link to={`/listing/${car.id}`} className={viewMode === 'Compact' ? 'grid grid-cols-[96px_1fr] gap-3 items-center' : 'block'}>
      <div className={`relative bg-slate-100 ${viewMode === 'List' ? 'h-full min-h-56' : viewMode === 'Compact' ? 'h-20 rounded-lg overflow-hidden' : 'h-48'}`}>
        <img src={car.images[0]} alt={car.name} className="w-full h-full object-cover" />
        <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black text-white ${car.listingType === 'Auction' ? 'bg-red-600' : 'bg-blue-600'}`}>
          {car.listingType}
        </span>
        {isDealerListing(car) && (
          <span className="absolute bottom-3 left-3 bg-emerald-500 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black">
            VERIFIED DEALER
          </span>
        )}
        {car.installmentAvailable && (
          <span className="absolute top-3 right-3 bg-amber-300 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black">
            INSTALLMENTS
          </span>
        )}
        {car.timeLeft && viewMode !== 'Compact' && (
          <span className="absolute top-3 right-3 bg-slate-950 text-white px-3 py-1 rounded-full text-[10px] font-black">
            {car.timeLeft}
          </span>
        )}
      </div>
      <div className={viewMode === 'Compact' ? 'min-w-0' : 'p-4'}>
        <h3 className="font-black text-slate-900 truncate">{car.name}</h3>
        <p className="text-sm text-slate-500 mt-1">{car.year} - {car.mileage} - {car.city}</p>
        <p className="text-xs font-bold text-slate-400 mt-1">{getVehicleCategory(car)} - {getEngineLabel(car)} - {car.transmission}</p>
        <p className="text-xl font-black text-red-600 mt-3">{getDisplayPrice(car)}</p>
        {car.installmentAvailable && (
          <p className="text-sm font-black text-emerald-700 mt-1">
            From {formatPkr(car.monthlyInstallment)}/mo - down {formatPkr(car.downPayment)}
          </p>
        )}
        {viewMode !== 'Compact' && <p className="text-xs font-bold text-slate-500 mt-1">
          {car.listingType === 'Auction' ? `${car.bidsCount} bids - ${car.reserveStatus}` : `${car.sellerType} seller - ${car.titleStatus}`}
        </p>}
        {viewMode !== 'Compact' && <div className="grid grid-cols-3 gap-2 mt-4">
          <Metric label="Deal" value={car.dealScore} />
          <Metric label="Trust" value={car.trustScore} />
          <Metric label={car.listingType === 'Auction' ? 'Heat' : 'Inspect'} value={car.listingType === 'Auction' ? `${car.auctionHeat}%` : car.inspectionScore} />
        </div>}
        {viewMode !== 'Compact' && car.aiReasons?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {car.aiReasons.map((reason) => (
              <span key={reason} className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-[10px] font-black">
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
    <div className={`${viewMode === 'List' ? 'md:col-start-2' : ''} ${viewMode === 'Compact' ? 'pt-3' : 'px-4 pb-4'} grid grid-cols-2 sm:flex gap-2`}>
      <button
        aria-label={`Compare ${car.name}`}
        onClick={onCompare}
        className={`min-h-11 flex-1 py-2 rounded-lg font-bold text-sm border transition-colors ${
          selected ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700 hover:border-blue-500'
        }`}
      >
        {selected ? 'Selected' : 'Compare'}
      </button>
      <button
        aria-label={`Watch ${car.name}`}
        onClick={onWatch}
        className={`min-h-11 flex-1 py-2 rounded-lg font-bold text-sm border transition-colors ${
          watched ? 'bg-red-600 text-white border-red-600' : 'border-slate-200 text-slate-700 hover:border-red-500'
        }`}
      >
        {watched ? 'Watching' : 'Watch'}
      </button>
      <a href={`tel:+923000000000`} className="min-h-11 flex-1 text-center py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm">
        Call
      </a>
      <Link to="/messages" className="min-h-11 flex-1 text-center py-2 rounded-lg border border-slate-200 text-slate-700 font-bold text-sm">
        Chat
      </Link>
      <Link to={`/listing/${car.id}`} className="min-h-11 flex-1 text-center py-2 rounded-lg bg-slate-900 text-white font-bold text-sm col-span-2 sm:col-span-1">
        View
      </Link>
    </div>
  </article>
);

const getEngineCc = (car) => {
  if (car.engineCapacityCc) return Number(car.engineCapacityCc);
  const engine = String(car.engine || '');
  const litreMatch = engine.match(/(\d+(?:\.\d+)?)\s*l/i);
  if (litreMatch) return Math.round(Number(litreMatch[1]) * 1000);
  const ccMatch = engine.match(/(\d{2,5})\s*cc/i);
  if (ccMatch) return Number(ccMatch[1]);
  return 0;
};

const getEngineLabel = (car) => {
  const cc = getEngineCc(car);
  return cc ? `${cc.toLocaleString()}cc` : car.engine || 'CC pending';
};

const getVehicleCategory = (car) => {
  if (car.vehicleCategory) return car.vehicleCategory;
  const bodyStyle = String(car.bodyStyle || '').toLowerCase();
  const name = `${car.make || ''} ${car.model || ''} ${car.name || ''}`.toLowerCase();

  if (bodyStyle.includes('truck') || bodyStyle.includes('van') || bodyStyle.includes('bus') || bodyStyle.includes('coaster')) return 'Buses, Vans & Trucks';
  if (bodyStyle.includes('loader') || bodyStyle.includes('pickup') || bodyStyle.includes('single cabin') || bodyStyle.includes('double cabin')) return 'Loaders & Pickups';
  if (bodyStyle.includes('rickshaw') || bodyStyle.includes('chingchi')) return 'Rickshaw & Chingchi';
  if (bodyStyle.includes('tractor') || bodyStyle.includes('trailer')) return 'Tractors & Trailers';
  if (bodyStyle.includes('motorcycle') || bodyStyle.includes('scooter') || name.includes('bike')) return 'Bikes';
  if (bodyStyle.includes('boat')) return 'Boats';
  return 'Cars';
};

const buildMarketplaceReasons = (car, filters) => {
  const reasons = [];
  if (filters.city !== 'All' && car.city === filters.city) reasons.push('city match');
  if (filters.make !== 'All' && car.make === filters.make) reasons.push('make match');
  if (filters.model !== 'All' && car.model === filters.model) reasons.push('model match');
  if (filters.category !== 'All' && (getVehicleCategory(car) === filters.category || car.bodyStyle === filters.category)) reasons.push('category match');
  if (Number(car.dealScore || 0) >= 80) reasons.push('strong deal score');
  if (Number(car.trustScore || 0) >= 85) reasons.push('trusted seller');
  if (Number(car.inspectionScore || 0) >= 80) reasons.push('inspection confidence');
  if (car.installmentAvailable) reasons.push('installments available');
  return reasons.length ? reasons : ['ranked for relevance'];
};

const formatIntentKey = (key) => key
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, (char) => char.toUpperCase());

const matchesFacet = (car, facet) => {
  const cc = getEngineCc(car);
  const text = `${car.name || ''} ${car.bodyStyle || ''} ${car.fuel || ''} ${car.reserveStatus || ''} ${(car.tags || []).join(' ')}`.toLowerCase();
  if (facet === 'Auction') return false;
  if (facet === 'Buy Now') return car.listingType === 'Marketplace';
  if (facet === 'Verified Seller') return String(car.sellerType || '').toLowerCase().includes('verified') || text.includes('verified');
  if (facet === 'Inspected') return Number(car.inspectionScore || 0) >= 70 || text.includes('inspected');
  if (facet === 'Near Me') return true;
  if (facet === 'No Reserve') return car.reserveStatus === 'No reserve';
  if (facet === 'Low Mileage') return Number(car.mileageValue || 0) <= 50000;
  if (facet === 'Family') return text.includes('family') || ['SUV', 'Sedan', 'MPV', 'Mini Van'].includes(car.bodyStyle);
  if (facet === 'Commercial') return ['Buses, Vans & Trucks', 'Loaders & Pickups', 'Rickshaw & Chingchi', 'Tractors & Trailers'].includes(getVehicleCategory(car));
  if (facet === 'Fuel Efficient') return cc > 0 && cc <= 1300;
  if (facet === 'Electric') return String(car.fuel || car.powertrain || '').toLowerCase().includes('electric');
  if (facet === 'Hybrid') return String(car.fuel || car.powertrain || '').toLowerCase().includes('hybrid');
  if (facet === 'Urgent') return text.includes('urgent');
  if (facet === 'Installments') return text.includes('installment');
  if (facet === 'Imported') return text.includes('imported');
  if (facet === '660cc') return cc >= 650 && cc <= 670;
  if (facet === '1000cc') return cc >= 800 && cc <= 1000;
  if (facet === '1300cc') return cc >= 1001 && cc <= 1300;
  return true;
};

const isDealerListing = (car) => String(car.sellerType || '').toLowerCase().includes('dealer');

export default Marketplace;
