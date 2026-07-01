import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { vehicleBodyStyles, powertrains } from '../data/taxonomy';
import { useAuctions } from '../context/AuctionContext';

const emptyVehicleDraft = {
  nickname: '',
  year: new Date().getFullYear(),
  make: '',
  model: '',
  variant: '',
  engine: '',
  registration: '',
  vin: '',
  photoUrl: '',
  odometerKm: '',
  marketValue: '',
  bodyStyle: 'Sedan',
  powertrain: 'Petrol',
};

const MyGarage = () => {
  const {
    myGarage,
    setGarageVehicle,
    ownedVehicles,
    addOwnedVehicle,
    updateOwnedVehicle,
    setPrimaryGarageVehicle,
    addVehicleServiceRecord,
    addVehicleReminder,
    compatibleAccessories,
    garageAccessorySuggestions,
    visibleCars,
  } = useAuctions();

  const collection = ownedVehicles.length ? ownedVehicles : [myGarage];
  const [activeVehicleId, setActiveVehicleId] = useState(myGarage.id || collection[0]?.id);
  const [draft, setDraft] = useState(emptyVehicleDraft);
  const [notice, setNotice] = useState('');
  const [suggestionsHidden, setSuggestionsHidden] = useState(() => window.localStorage.getItem('wd_garage_suggestions_hidden') === 'true');

  const activeVehicle = collection.find((vehicle) => String(vehicle.id) === String(activeVehicleId)) || collection[0] || myGarage;
  const isPrimaryActive = String(activeVehicle?.id) === String(myGarage.id);
  const activeCollection = collection.filter((vehicle) => !vehicle.archived);

  const matchingCars = useMemo(() => {
    const make = String(activeVehicle?.make || '').toLowerCase();
    const model = String(activeVehicle?.model || '').toLowerCase();
    const bodyStyle = String(activeVehicle?.bodyStyle || '').toLowerCase();

    return visibleCars
      .filter((car) =>
        String(car.make || '').toLowerCase() === make ||
        String(car.model || '').toLowerCase() === model ||
        String(car.bodyStyle || '').toLowerCase() === bodyStyle
      )
      .slice(0, 4);
  }, [activeVehicle, visibleCars]);

  const totalValue = activeCollection.reduce((sum, vehicle) => sum + Number(vehicle.marketValue || 0), 0);
  const reminders = activeCollection.flatMap((vehicle) =>
    (vehicle.reminders || []).map((reminder) => ({ ...reminder, vehicleTitle: vehicleTitle(vehicle) }))
  );
  const documentIssues = activeCollection.flatMap((vehicle) =>
    (vehicle.documents || [])
      .filter((document) => document.status !== 'Verified')
      .map((document) => ({ ...document, vehicleTitle: vehicleTitle(vehicle) }))
  );
  const ownershipCost = (activeVehicle?.expenses || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const updateGarage = (field, value) => {
    if (isPrimaryActive) {
      setGarageVehicle({ [field]: value });
      return;
    }

    updateOwnedVehicle(activeVehicle.id, { [field]: value });
  };

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleAddVehicle = (event) => {
    event.preventDefault();
    if (!draft.make.trim() || !draft.model.trim()) {
      setNotice('Add at least make and model before saving a vehicle.');
      return;
    }

    const vehicle = addOwnedVehicle(draft);
    setActiveVehicleId(vehicle.id);
    setDraft(emptyVehicleDraft);
    setNotice(`${vehicleTitle(vehicle)} added and set as your primary Garage vehicle.`);
  };

  const handleSetPrimary = (vehicleId) => {
    setPrimaryGarageVehicle(vehicleId);
    setActiveVehicleId(vehicleId);
    const vehicle = collection.find((item) => String(item.id) === String(vehicleId));
    setNotice(`${vehicle ? vehicleTitle(vehicle) : 'Vehicle'} is now powering recommendations and fitment.`);
  };

  const handleQuickService = () => {
    const record = addVehicleServiceRecord(activeVehicle.id, {
      title: 'Owner-added service note',
      mileageKm: activeVehicle.odometerKm,
      cost: 0,
      workshop: 'Add workshop',
    });
    setNotice(`${record.title} added to ${vehicleTitle(activeVehicle)}.`);
  };

  const handleQuickReminder = () => {
    const reminder = addVehicleReminder(activeVehicle.id, {
      type: 'Inspection',
      due: 'Before next sale or auction',
      priority: 'high',
    });
    setNotice(`${reminder.type} reminder added.`);
  };

  const handleArchiveVehicle = (vehicle) => {
    const archived = !vehicle.archived;
    updateOwnedVehicle(vehicle.id, {
      archived,
      archivedReason: archived ? 'No longer active in public collection' : '',
      countsTowardRankings: !archived,
    });
    setNotice(`${vehicleTitle(vehicle)} ${archived ? 'archived and removed from rankings' : 'restored to active Garage rankings'}.`);
  };

  const dismissSuggestions = () => {
    window.localStorage.setItem('wd_garage_suggestions_hidden', 'true');
    setSuggestionsHidden(true);
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-8">
          <div>
            <p className="text-emerald-400 font-black text-xs tracking-[0.3em] uppercase">My Garage</p>
            <h1 className="text-4xl md:text-5xl font-black mt-3 max-w-3xl">Your owned vehicle collection controls buying, selling, auctions, and fitment.</h1>
            <p className="text-slate-300 mt-4 text-lg max-w-2xl">
              Keep every car you own in one place with documents, service notes, reminders, value tracking, compatible accessories, and one-tap sell or auction paths.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link to="/sell/auction" className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-3 rounded-lg">Auction a vehicle</Link>
              <Link to="/sell/listing" className="bg-white text-slate-950 hover:bg-slate-100 font-black px-5 py-3 rounded-lg">Create fixed-price listing</Link>
              <Link to="/accessories" className="border border-white/20 hover:border-emerald-400 text-white font-black px-5 py-3 rounded-lg">Find matching parts</Link>
            </div>
          </div>

          <div className="bg-white text-slate-950 rounded-xl p-5">
            <p className="text-xs font-black uppercase text-slate-400">Primary vehicle</p>
            <h2 className="text-2xl font-black mt-1">{vehicleTitle(myGarage)}</h2>
            <p className="text-slate-500 mt-1">{myGarage.variant || 'Variant pending'} - {myGarage.bodyStyle || 'Body pending'} - {myGarage.engine || 'Engine pending'}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <GarageStat label="Owned" value={collection.length} />
              <GarageStat label="Value" value={formatCompactPkr(totalValue)} />
              <GarageStat label="Alerts" value={reminders.length + documentIssues.length} />
              <GarageStat label="Fits" value={compatibleAccessories.length} />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        <aside className="space-y-5">
          <form onSubmit={handleAddVehicle} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-emerald-600">Collection</p>
                <h2 className="text-xl font-black text-slate-900">Add owned vehicle</h2>
              </div>
              <span className="text-xs font-black text-slate-500 bg-slate-100 rounded-full px-3 py-1">Garage</span>
            </div>
            <div className="space-y-3 mt-4">
              <GarageInput label="Nickname" value={draft.nickname} onChange={(value) => updateDraft('nickname', value)} placeholder="Family car" />
              <div className="grid grid-cols-2 gap-3">
                <GarageInput label="Year" type="number" value={draft.year} onChange={(value) => updateDraft('year', value)} />
                <GarageSelect label="Body style" value={draft.bodyStyle} onChange={(value) => updateDraft('bodyStyle', value)} options={vehicleBodyStyles} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <GarageInput label="Make" value={draft.make} onChange={(value) => updateDraft('make', value)} placeholder="Toyota" required />
                <GarageInput label="Model" value={draft.model} onChange={(value) => updateDraft('model', value)} placeholder="Corolla" required />
              </div>
              <GarageInput label="Variant" value={draft.variant} onChange={(value) => updateDraft('variant', value)} placeholder="Grande" />
              <GarageInput label="Engine" value={draft.engine} onChange={(value) => updateDraft('engine', value)} placeholder="1.8L" />
              <GarageInput label="Vehicle photo URL" value={draft.photoUrl} onChange={(value) => updateDraft('photoUrl', value)} placeholder="Image URL for owned vehicle" />
              <GarageSelect label="Powertrain" value={draft.powertrain} onChange={(value) => updateDraft('powertrain', value)} options={powertrains} />
              <div className="grid grid-cols-2 gap-3">
                <GarageInput label="Registration" value={draft.registration} onChange={(value) => updateDraft('registration', value)} placeholder="ABC-123" />
                <GarageInput label="VIN / chassis" value={draft.vin} onChange={(value) => updateDraft('vin', value)} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <GarageInput label="Odometer km" type="number" value={draft.odometerKm} onChange={(value) => updateDraft('odometerKm', value)} />
                <GarageInput label="Market value" type="number" value={draft.marketValue} onChange={(value) => updateDraft('marketValue', value)} />
              </div>
            </div>
            <button type="submit" className="mt-4 w-full bg-slate-950 hover:bg-slate-800 text-white font-black py-3 rounded-lg">Add to Garage</button>
            {notice && <p role="status" className="mt-3 text-sm font-bold text-emerald-700">{notice}</p>}
          </form>

          <section className="bg-slate-900 text-white rounded-xl p-5">
            <h2 className="text-lg font-black">Ownership signals</h2>
            <div className="grid grid-cols-1 gap-3 mt-4">
              <SignalRow label="Total Garage value" value={formatPkr(totalValue)} />
              <SignalRow label="Open reminders" value={reminders.length} />
              <SignalRow label="Document tasks" value={documentIssues.length} />
              <SignalRow label="Primary fitment matches" value={compatibleAccessories.length} />
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          <section>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-black uppercase text-slate-400">Owned vehicles</p>
                <h2 className="text-2xl font-black text-slate-900">Your collection</h2>
              </div>
              <p className="text-sm text-slate-500">Set one primary vehicle to drive recommendations and accessory fitment.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {collection.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id || vehicleTitle(vehicle)}
                  vehicle={vehicle}
                  isActive={String(activeVehicle?.id) === String(vehicle.id)}
                  isPrimary={String(myGarage.id) === String(vehicle.id)}
                  onView={() => setActiveVehicleId(vehicle.id)}
                  onSetPrimary={() => handleSetPrimary(vehicle.id)}
                  onArchive={() => handleArchiveVehicle(vehicle)}
                />
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-emerald-600">Active vehicle</p>
                <h2 className="text-2xl font-black text-slate-900">{vehicleTitle(activeVehicle)}</h2>
                <p className="text-slate-500 mt-1">{activeVehicle.variant || 'Variant pending'} - {activeVehicle.registration || 'Registration pending'} - {Number(activeVehicle.odometerKm || 0).toLocaleString()} km</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleQuickService} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-3 rounded-lg">Add service note</button>
                <button type="button" onClick={handleQuickReminder} className="bg-slate-950 hover:bg-slate-800 text-white font-black px-4 py-3 rounded-lg">Add reminder</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
              <GarageStat label="Market value" value={formatCompactPkr(activeVehicle.marketValue || 0)} />
              <GarageStat label="Monthly cost" value={formatCompactPkr(ownershipCost)} />
              <GarageStat label="Next service" value={activeVehicle.nextServiceKm ? `${Number(activeVehicle.nextServiceKm).toLocaleString()} km` : 'Set'} />
              <GarageStat label="Status" value={activeVehicle.ownershipStatus || 'Owned'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              <div className="space-y-3">
                <h3 className="font-black text-slate-900">Editable basics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <GarageInput label="Year" type="number" value={activeVehicle.year} onChange={(value) => updateGarage('year', value)} />
                  <GarageInput label="Make" value={activeVehicle.make} onChange={(value) => updateGarage('make', value)} />
                  <GarageInput label="Model" value={activeVehicle.model} onChange={(value) => updateGarage('model', value)} />
                  <GarageInput label="Variant" value={activeVehicle.variant} onChange={(value) => updateGarage('variant', value)} />
                  <GarageInput label="Engine" value={activeVehicle.engine} onChange={(value) => updateGarage('engine', value)} />
                  <GarageSelect label="Powertrain" value={activeVehicle.powertrain || 'Petrol'} onChange={(value) => updateGarage('powertrain', value)} options={powertrains} />
                  <GarageInput label="Registration" value={activeVehicle.registration} onChange={(value) => updateGarage('registration', value)} />
                  <GarageInput label="Odometer km" type="number" value={activeVehicle.odometerKm} onChange={(value) => updateGarage('odometerKm', value)} />
                  <GarageSelect label="Body style" value={activeVehicle.bodyStyle || 'Sedan'} onChange={(value) => updateGarage('bodyStyle', value)} options={vehicleBodyStyles} />
                  <GarageInput label="Market value" type="number" value={activeVehicle.marketValue} onChange={(value) => updateGarage('marketValue', value)} />
                </div>
              </div>

              <div className="space-y-4">
                <GarageList title="Documents" items={(activeVehicle.documents || []).map((document) => ({
                  id: document.id,
                  title: document.type,
                  meta: document.expiresAt,
                  badge: document.status,
                  tone: documentTone(document.status),
                }))} empty="Add registration, insurance, token tax, and transfer documents." />
                <GarageList title="Service history" items={(activeVehicle.serviceHistory || []).map((record) => ({
                  id: record.id,
                  title: record.title,
                  meta: `${record.date} - ${Number(record.mileageKm || 0).toLocaleString()} km - ${record.workshop}`,
                  badge: formatPkr(record.cost || 0),
                  tone: 'slate',
                }))} empty="No service records yet." />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <GarageList title="Upcoming reminders" items={(activeVehicle.reminders || []).map((reminder) => ({
              id: reminder.id,
              title: reminder.type,
              meta: reminder.due,
              badge: reminder.priority,
              tone: reminderTone(reminder.priority),
            }))} empty="No active reminders." />
            <GarageList title="Monthly ownership cost" items={(activeVehicle.expenses || []).map((expense) => ({
              id: expense.id,
              title: expense.label,
              meta: expense.month,
              badge: formatPkr(expense.amount || 0),
              tone: 'emerald',
            }))} empty="No expense snapshots yet." />
          </div>

          {!suggestionsHidden && (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-emerald-950">Suggested accessories are matched to your active Garage vehicles</h2>
                  <p className="mt-1 text-sm font-bold text-emerald-800">Archive vehicles you no longer own so they stop affecting rankings, fitment, and recommendations.</p>
                </div>
                <button type="button" onClick={dismissSuggestions} className="rounded-lg bg-white px-3 py-2 text-sm font-black text-emerald-900">Close</button>
              </div>
            </section>
          )}

          <Panel title="Suggested Accessories For Your Garage" link="/accessories">
            {garageAccessorySuggestions.filter((suggestion) => !suggestion.vehicle?.archived).slice(0, 6).map((suggestion) => (
              <Link key={suggestion.accessory.id} to={`/accessories/${suggestion.accessory.id}`} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-500 focus-visible:border-emerald-500">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-black uppercase text-emerald-600">{suggestion.accessory.category}</p>
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 rounded-full px-2 py-1">{Math.round(suggestion.score)} match</span>
                </div>
                <h3 className="font-black text-slate-900 mt-1">{suggestion.accessory.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{suggestion.accessory.city} - {suggestion.accessory.condition} - {suggestion.accessory.warranty}</p>
                <p className="text-xs font-bold text-slate-500 mt-2">For {vehicleTitle(suggestion.vehicle)}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {suggestion.reasons.map((reason) => <span key={reason} className="text-[10px] font-black rounded-full bg-slate-100 text-slate-600 px-2 py-1">{reason}</span>)}
                </div>
                <p className="text-lg font-black text-emerald-700 mt-3">{formatPkr(suggestion.accessory.price)}</p>
              </Link>
            ))}
            {!garageAccessorySuggestions.filter((suggestion) => !suggestion.vehicle?.archived).length && <EmptyPanel text="Add active vehicles to My Garage to unlock accessory recommendations." />}
          </Panel>

          <Panel title="Related Car Listings" link="/listings">
            {matchingCars.map((car) => (
              <Link key={car.id} to={`/listing/${car.id}`} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-500 focus-visible:border-blue-500">
                <p className="text-xs font-black uppercase text-blue-600">{car.listingType}</p>
                <h3 className="font-black text-slate-900 mt-1">{car.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{car.city} - {car.bodyStyle} - {car.mileage}</p>
                <p className="text-lg font-black text-red-600 mt-3">{formatPkr(car.highBid || car.buyNowPrice)}</p>
              </Link>
            ))}
            {!matchingCars.length && <EmptyPanel text="No related listings yet. Save this vehicle and we will surface matching auctions." />}
          </Panel>
        </div>
      </section>
    </main>
  );
};

const VehicleCard = ({ vehicle, isActive, isPrimary, onView, onSetPrimary, onArchive }) => {
  const alertCount = (vehicle.reminders || []).length + (vehicle.documents || []).filter((document) => document.status !== 'Verified').length;

  return (
    <article className={`bg-white border rounded-xl p-5 ${isActive ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
      {vehicle.photos?.[0] && (
        <div className="mb-4 aspect-[16/9] overflow-hidden rounded-lg bg-slate-100">
          <img src={vehicle.photos[0]} alt={vehicleTitle(vehicle)} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-400">{vehicle.nickname || vehicle.ownershipStatus || 'Owned vehicle'}</p>
          <h3 className="text-xl font-black text-slate-900 mt-1">{vehicleTitle(vehicle)}</h3>
          <p className="text-sm text-slate-500 mt-1">{vehicle.registration || 'No registration'} - {Number(vehicle.odometerKm || 0).toLocaleString()} km</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isPrimary && <span className="text-xs font-black bg-emerald-100 text-emerald-700 rounded-full px-3 py-1">Primary</span>}
          {vehicle.archived && <span className="text-xs font-black bg-slate-100 text-slate-600 rounded-full px-3 py-1">Archived</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <GarageStat label="Value" value={formatCompactPkr(vehicle.marketValue || 0)} />
        <GarageStat label="Docs" value={(vehicle.documents || []).length} />
        <GarageStat label="Alerts" value={alertCount} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button type="button" onClick={onView} aria-pressed={isActive} className="border border-slate-200 hover:border-emerald-500 font-black text-slate-700 px-3 py-3 rounded-lg">
          View details
        </button>
        <button type="button" onClick={onSetPrimary} disabled={isPrimary} aria-pressed={isPrimary} className="bg-slate-950 disabled:bg-slate-200 disabled:text-slate-500 hover:bg-slate-800 text-white font-black px-3 py-3 rounded-lg">
          Set primary
        </button>
        <button type="button" onClick={onArchive} className="border border-slate-200 hover:border-slate-500 font-black text-slate-700 px-3 py-3 rounded-lg">
          {vehicle.archived ? 'Restore' : 'Archive'}
        </button>
        <Link to="/sell/listing" className="text-center bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-3 rounded-lg">Sell</Link>
        <Link to="/sell/auction" className="text-center bg-red-600 hover:bg-red-700 text-white font-black px-3 py-3 rounded-lg">Auction</Link>
      </div>
    </article>
  );
};

const GarageInput = ({ label, value, onChange, type = 'text', placeholder = '', required = false }) => (
  <label className="block">
    <span className="text-[10px] uppercase text-slate-400 font-black">{label}</span>
    <input
      type={type}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      required={required}
      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 font-bold outline-none focus:border-emerald-600 bg-white"
    />
  </label>
);

const GarageSelect = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="text-[10px] uppercase text-slate-400 font-black">{label}</span>
    <select value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 font-bold outline-none focus:border-emerald-600 bg-white">
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const GarageStat = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 min-w-0">
    <p className="text-[10px] uppercase text-slate-400 font-black">{label}</p>
    <p className="font-black text-slate-900 mt-1 text-xs sm:text-sm leading-tight whitespace-nowrap">{value}</p>
  </div>
);

const GarageList = ({ title, items, empty }) => (
  <section className="bg-white border border-slate-200 rounded-xl p-5">
    <h2 className="text-lg font-black text-slate-900">{title}</h2>
    <div className="space-y-3 mt-4">
      {items.map((item) => (
        <div key={item.id || `${item.title}-${item.meta}`} className="flex items-start justify-between gap-3 border border-slate-100 rounded-lg p-3">
          <div>
            <p className="font-black text-slate-900">{item.title}</p>
            <p className="text-sm text-slate-500 mt-1">{item.meta}</p>
          </div>
          <span className={`text-xs font-black rounded-full px-3 py-1 ${badgeClass(item.tone)}`}>{item.badge}</span>
        </div>
      ))}
      {!items.length && <p className="text-sm font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4">{empty}</p>}
    </div>
  </section>
);

const Panel = ({ title, link, children }) => (
  <section>
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-2xl font-black text-slate-900">{title}</h2>
      <Link to={link} className="text-sm font-bold text-blue-600 hover:underline">Open</Link>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{children}</div>
  </section>
);

const SignalRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 border border-white/10 rounded-lg p-3">
    <span className="text-sm text-slate-300">{label}</span>
    <span className="font-black">{value}</span>
  </div>
);

const EmptyPanel = ({ text }) => (
  <div className="bg-white border border-dashed border-slate-300 rounded-xl p-5 text-sm font-bold text-slate-500">
    {text}
  </div>
);

const vehicleTitle = (vehicle = {}) => `${vehicle.year || ''} ${vehicle.make || 'Unknown'} ${vehicle.model || 'Vehicle'}`.trim();

const formatCompactPkr = (amount) => {
  const numericAmount = Number(amount) || 0;
  if (numericAmount >= 10000000) return `PKR ${(numericAmount / 10000000).toFixed(1)}Cr`;
  if (numericAmount >= 100000) return `PKR ${(numericAmount / 100000).toFixed(1)}L`;
  return formatPkr(numericAmount);
};

const documentTone = (status = '') => {
  if (status === 'Verified') return 'emerald';
  if (status.toLowerCase().includes('soon') || status.toLowerCase().includes('expiring')) return 'amber';
  return 'red';
};

const reminderTone = (priority = '') => {
  if (priority === 'high') return 'red';
  if (priority === 'medium') return 'amber';
  return 'slate';
};

const badgeClass = (tone) => {
  if (tone === 'emerald') return 'bg-emerald-100 text-emerald-700';
  if (tone === 'amber') return 'bg-amber-100 text-amber-700';
  if (tone === 'red') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
};

export default MyGarage;
