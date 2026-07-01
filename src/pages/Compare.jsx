import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const Compare = () => {
  const { compareCars, clearCompare, toggleCompare } = useAuctions();
  const [hideCommon, setHideCommon] = useState(false);
  const bestValue = compareCars.length ? [...compareCars].sort((a, b) => b.dealScore - a.dealScore)[0] : null;
  const safest = compareCars.length ? [...compareCars].sort((a, b) => b.trustScore - a.trustScore)[0] : null;
  const cleanest = compareCars.length ? [...compareCars].sort((a, b) => b.inspectionScore - a.inspectionScore)[0] : null;

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-green-600 font-black text-xs uppercase tracking-[0.3em]">Comparison</p>
            <h1 className="text-4xl font-black text-slate-900 mt-2">Compare vehicles side by side</h1>
            <p className="text-slate-500 mt-2 max-w-3xl">
              Compare price, auction pressure, CC, mileage, colors, title status, inspection, trust, flaws, equipment, and ownership signals before you bid or buy.
            </p>
          </div>
          <button onClick={clearCompare} disabled={!compareCars.length} className="border border-slate-300 disabled:opacity-50 px-5 py-3 rounded-lg font-bold bg-white">Clear</button>
        </div>

        {compareCars.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <h2 className="text-2xl font-black text-slate-900">No vehicles selected.</h2>
            <p className="text-slate-500 mt-2">Use Compare on marketplace cards or listing detail pages.</p>
            <Link to="/listings" className="inline-block mt-5 bg-slate-900 text-white px-5 py-3 rounded-lg font-bold">Browse Listings</Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DecisionCard label="Best deal" car={bestValue} value={bestValue?.dealScore} />
              <DecisionCard label="Safest seller" car={safest} value={safest?.trustScore} />
              <DecisionCard label="Cleanest inspection" car={cleanest} value={cleanest?.inspectionScore} />
            </div>

            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
              <VehicleHeader cars={compareCars} onRemove={toggleCompare} />
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Compare Specifications</h2>
                  <p className="text-sm text-slate-500">Open each heading to compare only the details you care about.</p>
                </div>
                <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-700">
                  <input type="checkbox" checked={hideCommon} onChange={(event) => setHideCommon(event.target.checked)} />
                  Hide common specs
                </label>
              </div>
              <div className="divide-y divide-slate-200">
                {specSections.map((section) => (
                  <ComparisonSection key={section.title} section={section} cars={compareCars} hideCommon={hideCommon} />
                ))}
              </div>

              <div className="p-4 border-y border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Compare Features</h2>
                  <p className="text-sm text-slate-500">Feature availability is inferred from listing equipment until OEM spec data is connected.</p>
                </div>
              </div>
              <div className="divide-y divide-slate-200">
                {featureSections.map((section) => (
                  <ComparisonSection key={section.title} section={section} cars={compareCars} hideCommon={hideCommon} />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

const DecisionCard = ({ label, car, value }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5">
    <p className="text-xs font-black uppercase text-slate-400">{label}</p>
    <h2 className="font-black text-slate-900 mt-2">{car?.name || 'Add vehicles'}</h2>
    <p className="text-2xl font-black text-green-600 mt-2">{value || '-'}</p>
  </div>
);

const VehicleHeader = ({ cars, onRemove }) => (
  <div className="grid min-w-[1100px]" style={{ gridTemplateColumns: `220px repeat(${cars.length}, minmax(220px, 1fr))` }}>
    <div className="p-4 bg-slate-50 font-black text-slate-500">Vehicle</div>
    {cars.map((car) => (
      <div key={car.id} className="p-4 border-l border-slate-100">
        <img src={car.images[0]} alt={car.name} className="w-full h-36 object-cover rounded-lg mb-3" />
        <Link to={`/listing/${car.id}`} className="font-black text-slate-900 hover:text-blue-600">{car.name}</Link>
        <p className="text-xs font-bold text-slate-500 mt-1">{car.city} - {car.listingType}</p>
        <button onClick={() => onRemove(car.id)} className="block text-xs text-red-600 font-bold mt-2">Remove</button>
      </div>
    ))}
  </div>
);

const ComparisonSection = ({ section, cars, hideCommon }) => {
  const rows = section.rows.filter((row) => !hideCommon || !isCommon(cars.map((car) => normalizeValue(row.render(car)))));

  return (
    <details open className="group">
      <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
        <span>
          <span className="block text-lg font-black text-slate-900">{section.title}</span>
          <span className="block text-xs font-bold text-slate-500">{rows.length} visible fields</span>
        </span>
        <span className="text-2xl font-black text-slate-400 group-open:rotate-45 transition-transform">+</span>
      </summary>
      <div className="min-w-[1100px]">
        {rows.length ? rows.map((row) => (
          <CompareGridRow key={row.label} label={row.label} cars={cars} render={row.render} />
        )) : (
          <div className="p-4 bg-slate-50 text-sm font-bold text-slate-500">All fields in this section are common across selected vehicles.</div>
        )}
      </div>
    </details>
  );
};

const CompareGridRow = ({ label, cars, render }) => (
  <div className="grid border-t border-slate-100" style={{ gridTemplateColumns: `220px repeat(${cars.length}, minmax(220px, 1fr))` }}>
    <div className="p-4 font-black text-slate-700 bg-slate-50">{label}</div>
    {cars.map((car) => <div key={car.id} className="p-4 font-semibold text-slate-700 border-l border-slate-100">{render(car)}</div>)}
  </div>
);

const compactList = (items = []) => {
  if (!items.length) return 'N/A';
  return items.slice(0, 3).join(' | ');
};

const scoreLabel = (score) => score === undefined || score === null ? 'N/A' : `${score}/100`;

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
  return cc ? `${cc.toLocaleString()}cc` : 'CC pending';
};

const normalizeValue = (value) => String(value ?? '-').trim().toLowerCase();

const isCommon = (values) => values.length > 1 && values.every((value) => value === values[0]);

const hasFeature = (car, patterns) => {
  const text = [...(car.equipment || []), ...(car.tags || []), ...(car.highlights || [])].join(' ').toLowerCase();
  return patterns.some((pattern) => text.includes(pattern.toLowerCase())) ? 'Yes' : '-';
};

const specSections = [
  {
    title: 'Money and Auction',
    rows: [
      { label: 'Price / Current Bid', render: (car) => car.listingType === 'Auction' ? formatPkr(car.highBid) : formatPkr(car.buyNowPrice) },
      { label: 'Market Estimate', render: (car) => formatPkr(car.marketEstimate) },
      { label: 'Reserve Status', render: (car) => car.reserveStatus || 'Fixed price' },
      { label: 'Bid Increment', render: (car) => car.bidIncrement ? formatPkr(car.bidIncrement) : '-' },
      { label: 'Auction Heat', render: (car) => car.auctionHeat ? `${car.auctionHeat}%` : '-' },
      { label: 'Time Left', render: (car) => car.timeLeft || '-' },
    ],
  },
  {
    title: 'Dimensions',
    rows: [
      { label: 'Overall Length', render: (car) => car.dimensions?.length || '-' },
      { label: 'Overall Width', render: (car) => car.dimensions?.width || '-' },
      { label: 'Overall Height', render: (car) => car.dimensions?.height || '-' },
      { label: 'Wheel Base', render: (car) => car.dimensions?.wheelbase || '-' },
      { label: 'Ground Clearance', render: (car) => car.dimensions?.groundClearance || '-' },
      { label: 'Kerb Weight', render: (car) => car.dimensions?.kerbWeight || '-' },
      { label: 'Boot Space', render: (car) => car.dimensions?.bootSpace || '-' },
      { label: 'Seating Capacity', render: (car) => car.seatingCapacity || '-' },
      { label: 'No. of Doors', render: (car) => car.doors || '-' },
    ],
  },
  {
    title: 'Engine / Motor',
    rows: [
      { label: 'Engine Type', render: (car) => car.powertrain || car.fuel || '-' },
      { label: 'Displacement', render: (car) => getEngineLabel(car) },
      { label: 'Horse Power', render: (car) => car.horsePower || '-' },
      { label: 'Torque', render: (car) => car.torque || '-' },
      { label: 'No. of Cylinders', render: (car) => car.cylinders || '-' },
      { label: 'Fuel System', render: (car) => car.fuelSystem || '-' },
      { label: 'Battery Type', render: (car) => car.batteryType || '-' },
      { label: 'Battery Capacity', render: (car) => car.batteryCapacity || '-' },
      { label: 'Range', render: (car) => car.evRange || '-' },
      { label: 'Max Speed', render: (car) => car.maxSpeed || '-' },
      { label: '0-100 km/h', render: (car) => car.acceleration || '-' },
    ],
  },
  {
    title: 'Transmission and Drive',
    rows: [
      { label: 'Transmission Type', render: (car) => car.transmission || '-' },
      { label: 'Gearbox', render: (car) => car.gearbox || '-' },
      { label: 'Drivetrain', render: (car) => car.drivetrain || '-' },
      { label: 'Steering Type', render: (car) => car.steeringType || '-' },
      { label: 'Power Assisted', render: (car) => car.powerSteering || 'Electric' },
      { label: 'Turning Radius', render: (car) => car.turningRadius || '-' },
    ],
  },
  {
    title: 'Suspension, Brakes, Wheels and Tyres',
    rows: [
      { label: 'Suspension', render: (car) => car.suspension || '-' },
      { label: 'Brakes', render: (car) => car.brakes || '-' },
      { label: 'Wheel Type', render: (car) => hasFeature(car, ['alloy']) === 'Yes' ? 'Alloy Wheels' : '-' },
      { label: 'Wheel Size', render: (car) => car.wheelSize || '-' },
      { label: 'Tyre Size', render: (car) => car.tyreSize || '-' },
      { label: 'Spare Tyre Size', render: (car) => car.spareTyreSize || '-' },
    ],
  },
  {
    title: 'Condition and Ownership',
    rows: [
      { label: 'Location', render: (car) => car.location || car.city },
      { label: 'Mileage', render: (car) => car.mileage },
      { label: 'Title / Registration', render: (car) => car.titleStatus },
      { label: 'Seller Type', render: (car) => car.sellerType },
      { label: 'Inspection Score', render: (car) => scoreLabel(car.inspectionScore) },
      { label: 'Deal Score', render: (car) => scoreLabel(car.dealScore) },
      { label: 'Seller Trust', render: (car) => scoreLabel(car.trustScore) },
      { label: 'Known Flaws', render: (car) => compactList(car.knownFlaws) },
      { label: 'Service History', render: (car) => compactList(car.serviceHistory) },
    ],
  },
];

const featureSections = [
  {
    title: 'Safety',
    rows: [
      { label: 'Airbags', render: (car) => car.airbags || '-' },
      { label: 'ABS', render: (car) => hasFeature(car, ['abs', 'anti-lock']) },
      { label: 'Traction Control', render: (car) => hasFeature(car, ['traction']) },
      { label: 'Vehicle Stability Control', render: (car) => hasFeature(car, ['stability']) },
      { label: 'ISOFIX Child Seat Anchors', render: (car) => hasFeature(car, ['isofix']) },
    ],
  },
  {
    title: 'Exterior',
    rows: [
      { label: 'Exterior Color', render: (car) => car.exteriorColor || '-' },
      { label: 'Alloy Wheels', render: (car) => hasFeature(car, ['alloy']) },
      { label: 'Fog Lights', render: (car) => hasFeature(car, ['fog']) },
      { label: 'Sun Roof', render: (car) => hasFeature(car, ['sunroof', 'sun roof']) },
      { label: 'DRLs', render: (car) => hasFeature(car, ['drl']) },
      { label: 'Rear Spoiler', render: (car) => hasFeature(car, ['spoiler']) },
    ],
  },
  {
    title: 'Infotainment',
    rows: [
      { label: 'Display Size', render: (car) => car.displaySize || hasFeature(car, ['infotainment']) },
      { label: 'USB / AUX', render: (car) => hasFeature(car, ['usb', 'aux']) },
      { label: 'Navigation', render: (car) => hasFeature(car, ['navigation']) },
      { label: 'Front Speakers', render: (car) => car.frontSpeakers || '-' },
      { label: 'Rear Speakers', render: (car) => car.rearSpeakers || '-' },
    ],
  },
  {
    title: 'Comfort and Convenience',
    rows: [
      { label: 'Air Conditioner', render: (car) => hasFeature(car, ['climate', 'air condition']) },
      { label: 'Climate Control', render: (car) => hasFeature(car, ['climate control', 'dual-zone']) },
      { label: 'Key Type', render: (car) => hasFeature(car, ['smart key']) === 'Yes' ? 'Smart Key' : '-' },
      { label: 'Push Start', render: (car) => hasFeature(car, ['push start']) },
      { label: 'Power Windows', render: (car) => hasFeature(car, ['power window']) },
      { label: 'Power Mirrors', render: (car) => hasFeature(car, ['power mirror']) },
      { label: 'Cruise Control', render: (car) => hasFeature(car, ['cruise']) },
      { label: 'Rear Camera', render: (car) => hasFeature(car, ['camera']) },
      { label: 'Rear AC Vents', render: (car) => hasFeature(car, ['rear ac']) },
      { label: 'Seat Material', render: (car) => car.interiorColor ? `${car.interiorColor} interior` : '-' },
      { label: 'Heated Seats', render: (car) => hasFeature(car, ['heated seat']) },
      { label: 'CoolBox', render: (car) => hasFeature(car, ['coolbox', 'chilled glovebox']) },
    ],
  },
];

export default Compare;
