import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Tags } from 'lucide-react';
import { formatPkr } from '../data/cars';
import { accessoryFitsVehicle } from '../data/accessories';
import {
  accessoryCategories,
  accessoryCategoryGroups,
  accessorySearchAliases,
  accessorySortOptions,
  getAccessoryFulfillment,
} from '../data/taxonomy';
import { useAuctions } from '../context/AuctionContext';

const defaultFilters = {
  query: '',
  group: 'All',
  category: 'All',
  city: 'All',
  fitment: 'Fits My Garage',
  condition: 'All',
  brand: 'All',
  minPrice: '',
  maxPrice: '',
  availability: 'All',
  fulfillment: 'All',
  sort: 'Most relevant',
};

const Accessories = () => {
  const {
    accessories,
    accessoryWishlist,
    toggleAccessoryWishlist,
    addAccessoryToCart,
    myGarage,
    setGarageVehicle,
    garageAccessorySuggestions,
  } = useAuctions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => readAccessoryFilters(searchParams));
  const cities = ['All', ...new Set(accessories.map((item) => item.city).filter(Boolean))];
  const brands = ['All', ...new Set(accessories.map((item) => item.brand).filter(Boolean))];
  const activeGroup = accessoryCategoryGroups.find((group) => group.label === filters.group);
  const categoryOptions = ['All', ...(activeGroup ? activeGroup.options : accessoryCategories)];

  const filteredAccessories = useMemo(() => {
    const queryTerms = expandAccessoryQuery(filters.query);
    const minPrice = Number(filters.minPrice) || 0;
    const maxPrice = Number(filters.maxPrice) || Infinity;

    const results = accessories.filter((item) => {
      const group = accessoryCategoryGroups.find((entry) => entry.options.includes(item.category));
      const fulfillment = getAccessoryFulfillment(item);
      const searchable = [
        item.name,
        item.category,
        item.seller,
        item.city,
        item.condition,
        item.brand,
        item.fitmentType,
        item.warranty,
        fulfillment.fulfillment,
        fulfillment.installRequired ? 'install required installation workshop fitting' : '',
        fulfillment.meetupRecommended ? 'meet seller pickup local meetup' : '',
        ...(item.highlights || []),
        ...(item.compatibility?.makes || []),
        ...(item.compatibility?.models || []),
        ...(item.compatibility?.bodyStyles || []),
      ].join(' ').toLowerCase();
      const fitsGarage = accessoryFitsVehicle(item, myGarage);
      const matchesQuery = !queryTerms.length || queryTerms.every((term) => searchable.includes(term));
      const matchesGroup = filters.group === 'All' || group?.label === filters.group;
      const matchesCategory = filters.category === 'All' || item.category === filters.category;
      const matchesCity = filters.city === 'All' || item.city === filters.city;
      const matchesCondition = filters.condition === 'All' || item.condition === filters.condition;
      const matchesBrand = filters.brand === 'All' || item.brand === filters.brand;
      const matchesPrice = item.price >= minPrice && item.price <= maxPrice;
      const matchesAvailability =
        filters.availability === 'All' ||
        (filters.availability === 'In stock' && item.stock > 0) ||
        (filters.availability === 'Low stock' && item.stock > 0 && item.stock <= 5);
      const matchesFulfillment =
        filters.fulfillment === 'All' ||
        fulfillment.fulfillment === filters.fulfillment ||
        (filters.fulfillment === 'Delivery eligible' && fulfillment.courierAllowed) ||
        (filters.fulfillment === 'Meetup only' && fulfillment.meetupRecommended) ||
        (filters.fulfillment === 'Install required' && fulfillment.installRequired);
      const matchesFitment =
        filters.fitment === 'All' ||
        (filters.fitment === 'Fits My Garage' && fitsGarage) ||
        (filters.fitment === 'Universal' && item.fitmentType === 'Universal') ||
        (filters.fitment === 'Vehicle-specific' && item.fitmentType === 'Vehicle-specific');

      return matchesQuery && matchesGroup && matchesCategory && matchesCity && matchesCondition && matchesBrand && matchesPrice && matchesAvailability && matchesFulfillment && matchesFitment;
    });

    return sortAccessories(results, filters.sort, myGarage);
  }, [accessories, filters, myGarage]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'group' ? { category: 'All' } : {}),
    }));
  };

  React.useEffect(() => {
    const nextParams = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== defaultFilters[key]) nextParams[key] = value;
    });
    setSearchParams(nextParams, { replace: true });
  }, [filters, setSearchParams]);

  const activeFilterEntries = Object.entries(filters).filter(([key, value]) => (
    Object.prototype.hasOwnProperty.call(defaultFilters, key) && key !== 'sort' && value && value !== defaultFilters[key]
  ));

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
          <div>
            <p className="text-emerald-400 font-black text-xs tracking-[0.3em] uppercase mb-3">Parts and accessories</p>
            <h1 className="text-4xl md:text-5xl font-black leading-tight max-w-3xl">
              Search thousands of parts, upgrades, and accessories by exact fit.
            </h1>
            <p className="text-slate-300 text-lg mt-4 max-w-2xl">
              Browse like OLX, filter like a proper parts store, and use My Garage to avoid buying the wrong item.
            </p>
          </div>
          <GaragePanel vehicle={myGarage} onChange={setGarageVehicle} />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 sticky top-20 z-30">
          <label className="xl:col-span-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={filters.query}
              onChange={(event) => updateFilter('query', event.target.value)}
              placeholder="Search tyre, brake pads, android screen, Corolla..."
              className="w-full border border-slate-200 rounded-lg pl-11 pr-4 py-3 font-semibold outline-none focus:border-emerald-600"
              aria-label="Search accessories by part, make, model, brand, seller, or city"
            />
          </label>
          <FilterSelect value={filters.group} onChange={(value) => updateFilter('group', value)} options={['All', ...accessoryCategoryGroups.map((group) => group.label)]} label="Group" className="xl:col-span-2" />
          <FilterSelect value={filters.category} onChange={(value) => updateFilter('category', value)} options={categoryOptions} label="Category" className="xl:col-span-2" />
          <FilterSelect value={filters.city} onChange={(value) => updateFilter('city', value)} options={cities} label="City" className="xl:col-span-1" />
          <FilterSelect value={filters.fitment} onChange={(value) => updateFilter('fitment', value)} options={['All', 'Fits My Garage', 'Universal', 'Vehicle-specific']} label="Fitment" className="xl:col-span-2" />
          <FilterSelect value={filters.sort} onChange={(value) => updateFilter('sort', value)} options={accessorySortOptions} label="Sort" className="xl:col-span-1" />
        </div>

        <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Accessory buying model</p>
              <p className="text-sm font-bold text-slate-600 mt-1">Small products can be delivered. Large, used, or install-heavy products should be meetup/local workshop first.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['All', 'Delivery eligible', 'Meetup only', 'Install required'].map((option) => (
                <button
                  key={option}
                  onClick={() => updateFilter('fulfillment', option)}
                  className={`rounded-full px-3 py-2 text-xs font-black ${filters.fulfillment === option ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          {!!activeFilterEntries.length && (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeFilterEntries.map(([key, value]) => (
                <button key={key} onClick={() => updateFilter(key, defaultFilters[key])} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                  {key}: {value}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 mt-6">
          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tags size={18} className="text-emerald-600" />
                <h2 className="font-black text-slate-900">Shop by category</h2>
              </div>
              <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
                {accessoryCategoryGroups.map((group) => (
                  <div key={group.label}>
                    <button
                      onClick={() => updateFilter('group', group.label)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-black ${filters.group === group.label ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'}`}
                    >
                      {group.label}
                    </button>
                    <div className="mt-2 space-y-1">
                      {group.options.slice(0, 8).map((category) => (
                        <button
                          key={category}
                          onClick={() => setFilters((current) => ({ ...current, group: group.label, category }))}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold ${filters.category === category ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal size={18} className="text-slate-700" />
                <h2 className="font-black text-slate-900">Deep filters</h2>
              </div>
              <div className="space-y-3">
                <FilterSelect value={filters.brand} onChange={(value) => updateFilter('brand', value)} options={brands} label="Brand" />
                <FilterSelect value={filters.condition} onChange={(value) => updateFilter('condition', value)} options={['All', 'New', 'Used', 'Refurbished']} label="Condition" />
                <FilterSelect value={filters.availability} onChange={(value) => updateFilter('availability', value)} options={['All', 'In stock', 'Low stock']} label="Stock" />
                <FilterSelect value={filters.fulfillment} onChange={(value) => updateFilter('fulfillment', value)} options={['All', 'Delivery eligible', 'Meetup only', 'Install required', 'Deliverable', 'Pickup / meet seller', 'Local only']} label="Fulfillment" />
                <div className="grid grid-cols-2 gap-2">
                  <PriceInput label="Min" value={filters.minPrice} onChange={(value) => updateFilter('minPrice', value)} />
                  <PriceInput label="Max" value={filters.maxPrice} onChange={(value) => updateFilter('maxPrice', value)} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-black text-slate-900 mb-3">Quick searches</h2>
              <div className="flex flex-wrap gap-2">
                {['Corolla filters', 'LED bulbs', 'dashcam', 'bike helmet', 'engine oil', 'Hilux bumper', 'wipers', 'brake pads'].map((term) => (
                  <button key={term} onClick={() => updateFilter('query', term)} className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-black">
                    {term}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-5">
              <h2 className="font-black mb-2">Guaranteed fit direction</h2>
              <p className="text-sm text-slate-300">
                Production should verify year, make, model, trim, engine, socket size, and return policy before checkout.
              </p>
            </div>
          </aside>

          <div>
            {garageAccessorySuggestions.length > 0 && (
              <section className="bg-white border border-emerald-100 rounded-xl p-4 mb-5">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-black uppercase text-emerald-600">Garage suggestions</p>
                    <h2 className="text-xl font-black text-slate-900">Recommended for your owned vehicles</h2>
                  </div>
                  <Link to="/garage" className="text-sm font-black text-blue-700 hover:underline">Manage Garage</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {garageAccessorySuggestions.slice(0, 3).map((suggestion) => (
                    <Link key={suggestion.accessory.id} to={`/accessories/${suggestion.accessory.id}`} className="border border-slate-100 rounded-lg p-3 hover:border-emerald-500">
                      <p className="text-xs font-black text-emerald-700">{Math.round(suggestion.score)} match - {suggestion.vehicle.make} {suggestion.vehicle.model}</p>
                      <h3 className="font-black text-slate-900 mt-1">{suggestion.accessory.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{suggestion.reasons.join(' - ')}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{filteredAccessories.length} accessories</h2>
                <p className="text-sm text-slate-500">Garage vehicle: {myGarage.year} {myGarage.make} {myGarage.model} - categories available: {accessoryCategories.length}</p>
              </div>
              <button onClick={() => setFilters(defaultFilters)} className="border border-slate-300 bg-white rounded-lg py-2 px-4 font-bold text-slate-600 hover:bg-slate-50">
                Reset filters
              </button>
            </div>

            {filteredAccessories.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                <h3 className="text-xl font-black text-slate-900">No accessories match this search.</h3>
                <p className="text-slate-500 mt-2">Try universal items, change fulfillment, broaden your price range, or adjust your saved vehicle.</p>
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  <button onClick={() => setFilters(defaultFilters)} className="bg-slate-900 text-white px-5 py-2 rounded-lg font-black">Reset filters</button>
                  <button onClick={() => updateFilter('fitment', 'All')} className="border border-slate-200 bg-white text-slate-700 px-5 py-2 rounded-lg font-black">Show all fitment</button>
                  <button onClick={() => updateFilter('fulfillment', 'All')} className="border border-slate-200 bg-white text-slate-700 px-5 py-2 rounded-lg font-black">Any fulfillment</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredAccessories.map((item) => (
                  <AccessoryCard
                    key={item.id}
                    item={item}
                    fits={accessoryFitsVehicle(item, myGarage)}
                    saved={accessoryWishlist.includes(item.id)}
                    onSave={() => toggleAccessoryWishlist(item.id)}
                    onCart={() => addAccessoryToCart(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

const GaragePanel = ({ vehicle, onChange }) => (
  <div className="bg-white text-slate-950 rounded-xl border border-white/10 p-5">
    <p className="text-xs font-black uppercase tracking-wide text-emerald-600">My Garage</p>
    <h2 className="font-black text-xl mt-1">Find parts for this vehicle</h2>
    <div className="grid grid-cols-2 gap-3 mt-4">
      <GarageInput label="Year" value={vehicle.year} onChange={(value) => onChange({ year: value })} />
      <GarageInput label="Make" value={vehicle.make} onChange={(value) => onChange({ make: value })} />
      <GarageInput label="Model" value={vehicle.model} onChange={(value) => onChange({ model: value })} />
      <GarageInput label="Body" value={vehicle.bodyStyle} onChange={(value) => onChange({ bodyStyle: value })} />
    </div>
  </div>
);

const GarageInput = ({ label, value, onChange }) => (
  <label className="block">
    <span className="text-[10px] uppercase text-slate-400 font-black">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-bold outline-none focus:border-emerald-600"
    />
  </label>
);

const FilterSelect = ({ value, onChange, options, label, className = '' }) => (
  <label className={`block ${className}`}>
    {label && <span className="sr-only">{label}</span>}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border border-slate-200 rounded-lg px-3 py-3 bg-white font-bold text-slate-700 outline-none focus:border-emerald-600"
      aria-label={label}
    >
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </label>
);

const PriceInput = ({ label, value, onChange }) => (
  <label className="block">
    <span className="text-[10px] uppercase font-black text-slate-400">{label} price</span>
    <input
      value={value}
      type="number"
      min="0"
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-bold outline-none focus:border-emerald-600"
      placeholder="PKR"
    />
  </label>
);

const AccessoryCard = ({ item, fits, saved, onSave, onCart }) => (
  <article className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
    <Link to={`/accessories/${item.id}`} className="block">
      <div className="relative h-44 bg-slate-100">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black text-white ${fits ? 'bg-emerald-600' : 'bg-slate-700'}`}>
          {fits ? 'FITS GARAGE' : item.fitmentType}
        </span>
      </div>
      <div className="p-4">
        <p className="text-xs text-slate-400 font-black uppercase">{item.category}</p>
        <h3 className="font-black text-slate-900 mt-1 line-clamp-2">{item.name}</h3>
        <p className="text-sm text-slate-500 mt-1">{item.city} - {item.condition} - {item.warranty}</p>
        <p className="text-xs text-slate-400 mt-1">{item.brand || 'Verified supplier'} - {item.stock} in stock</p>
        <p className="text-xs font-black text-blue-700 mt-2">{getAccessoryFulfillment(item).fulfillment}{getAccessoryFulfillment(item).installRequired ? ' - install needed' : ''}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {buildAccessoryReasons(item, fits).map((reason) => (
            <span key={reason} className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[10px] font-black">
              {reason}
            </span>
          ))}
        </div>
        <p className="text-xl font-black text-emerald-700 mt-3">{formatPkr(item.price)}</p>
      </div>
    </Link>
    <div className="px-4 pb-4 flex gap-2">
      <button
        onClick={onSave}
        className={`flex-1 py-2 rounded-lg font-bold text-sm border ${saved ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-700 hover:border-emerald-500'}`}
      >
        {saved ? 'Saved' : 'Save'}
      </button>
      <button onClick={onCart} className="flex-1 text-center py-2 rounded-lg bg-slate-900 text-white font-bold text-sm">
        Add cart
      </button>
    </div>
  </article>
);

const expandAccessoryQuery = (rawQuery) => {
  const terms = rawQuery
    .toLowerCase()
    .split(/[\s,]+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const aliasTerms = Object.entries(accessorySearchAliases).flatMap(([category, aliases]) => {
    const haystack = [category, ...aliases].join(' ').toLowerCase();
    return terms.some((term) => haystack.includes(term)) ? [category.toLowerCase(), ...aliases.map((alias) => alias.toLowerCase())] : [];
  });

  return [...new Set([...terms, ...aliasTerms])];
};

const sortAccessories = (items, sort, myGarage) => {
  const copy = [...items];
  if (sort === 'Price low to high') return copy.sort((a, b) => a.price - b.price);
  if (sort === 'Price high to low') return copy.sort((a, b) => b.price - a.price);
  if (sort === 'Top rated') return copy.sort((a, b) => b.rating - a.rating);
  if (sort === 'In stock first') return copy.sort((a, b) => b.stock - a.stock);
  if (sort === 'Newest') return copy.sort((a, b) => b.id - a.id);
  return copy.sort((a, b) => {
    const aFit = accessoryFitsVehicle(a, myGarage) ? 1 : 0;
    const bFit = accessoryFitsVehicle(b, myGarage) ? 1 : 0;
    return bFit - aFit || b.rating - a.rating || b.stock - a.stock;
  });
};

const readAccessoryFilters = (searchParams) => {
  const next = { ...defaultFilters };
  Object.keys(defaultFilters).forEach((key) => {
    const value = searchParams.get(key);
    if (value) next[key] = value;
  });
  if (searchParams.get('delivery') === 'true') next.fulfillment = 'Delivery eligible';
  if (searchParams.get('delivery') === 'false') next.fulfillment = 'Meetup only';
  return next;
};

const buildAccessoryReasons = (item, fits) => {
  const fulfillment = getAccessoryFulfillment(item);
  return [
    fits ? 'fits garage' : '',
    fulfillment.courierAllowed ? 'delivery eligible' : 'meetup preferred',
    fulfillment.installRequired ? 'install required' : '',
    Number(item.rating || 0) >= 4.5 ? 'top rated' : '',
    Number(item.stock || 0) > 0 ? 'in stock' : '',
  ].filter(Boolean).slice(0, 4);
};

export default Accessories;
