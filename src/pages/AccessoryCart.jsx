import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ShoppingCart, Trash2 } from 'lucide-react';
import { formatPkr } from '../data/cars';
import { accessoryFitsVehicle } from '../data/accessories';
import { getAccessoryFulfillment } from '../data/taxonomy';
import { useAuctions } from '../context/AuctionContext';

const AccessoryCart = () => {
  const {
    accessories,
    accessoryCart,
    myGarage,
    updateAccessoryCartQuantity,
    removeAccessoryFromCart,
    clearAccessoryCart,
    placeAccessoryOrder,
  } = useAuctions();
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState({
    deliveryMethod: 'Courier delivery',
    address: 'Karachi, Pakistan',
    paymentMethod: 'Cash on delivery / wallet placeholder',
    notes: '',
  });
  const [message, setMessage] = useState('');

  const cartItems = useMemo(() => accessoryCart.map((entry) => {
    const accessory = accessories.find((item) => item.id === entry.accessoryId);
    if (!accessory) return null;
    const fitsGarage = accessoryFitsVehicle(accessory, myGarage);
    const fulfillment = getAccessoryFulfillment(accessory);
    return {
      ...entry,
      accessory,
      fitsGarage,
      fulfillment,
      subtotal: accessory.price * entry.quantity,
    };
  }).filter(Boolean), [accessories, accessoryCart, myGarage]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const hasCourierBlocked = cartItems.some((item) => !item.fulfillment.courierAllowed);
  const hasInstallRequired = cartItems.some((item) => item.fulfillment.installRequired);
  const hasMeetupRecommended = cartItems.some((item) => item.fulfillment.meetupRecommended);
  const deliveryOptions = [
    ...(hasCourierBlocked ? [] : ['Courier delivery']),
    'Pickup from seller',
    ...(hasInstallRequired ? ['Seller/workshop installation appointment'] : []),
    'Arrange through Wheels and Deals',
  ];
  const safeDeliveryMethod = deliveryOptions.includes(checkout.deliveryMethod) ? checkout.deliveryMethod : deliveryOptions[0];
  const deliveryFee = cartItems.length ? (
    safeDeliveryMethod === 'Courier delivery' ? 650 :
    safeDeliveryMethod === 'Arrange through Wheels and Deals' ? 1200 :
    0
  ) : 0;
  const serviceFee = cartItems.length ? Math.round(subtotal * 0.015) : 0;
  const total = subtotal + deliveryFee + serviceFee;
  const fitmentWarnings = cartItems.filter((item) => !item.fitsGarage && item.accessory.fitmentType !== 'Universal');

  const submitOrder = () => {
    const result = placeAccessoryOrder({ ...checkout, deliveryMethod: safeDeliveryMethod });
    setMessage(result.message);
    if (result.ok) navigate('/orders');
  };

  if (!cartItems.length) {
    return (
      <main className="bg-slate-50 min-h-screen py-10">
        <section className="max-w-4xl mx-auto px-4">
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <ShoppingCart className="mx-auto text-slate-300" size={44} />
            <h1 className="text-3xl font-black text-slate-900 mt-4">Your accessory cart is empty</h1>
            <p className="text-slate-500 mt-2">Add parts, accessories, oils, tools, or bike gear and confirm fitment before checkout.</p>
            <Link to="/accessories" className="inline-block mt-6 bg-slate-900 text-white rounded-lg px-5 py-3 font-black">Browse Accessories</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 min-h-screen py-10">
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-emerald-600 font-black text-xs uppercase tracking-[0.3em]">Accessory checkout</p>
            <h1 className="text-4xl font-black text-slate-900 mt-2">Cart, fitment, delivery, and seller confirmation.</h1>
            <p className="text-slate-500 mt-2">Garage vehicle: {myGarage.year} {myGarage.make} {myGarage.model} - {myGarage.bodyStyle}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/accessories" className="bg-white border border-slate-200 rounded-lg px-4 py-3 font-black text-slate-700">Continue shopping</Link>
            <button onClick={clearAccessoryCart} className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3 font-black">Clear cart</button>
          </div>
        </div>

        {message && <p className="mb-5 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg p-4 font-bold">{message}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <section className="space-y-4">
            {fitmentWarnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                <AlertTriangle className="text-amber-700 mt-1" size={22} />
                <div>
                  <h2 className="font-black text-amber-900">Fitment needs review</h2>
                  <p className="text-sm text-amber-800 mt-1">Some vehicle-specific parts do not match your current garage vehicle. You can still continue, but the order will be marked for seller fitment confirmation.</p>
                </div>
              </div>
            )}

            {(hasCourierBlocked || hasInstallRequired || hasMeetupRecommended) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
                <AlertTriangle className="text-blue-700 mt-1" size={22} />
                <div>
                  <h2 className="font-black text-blue-950">Fulfillment rules applied</h2>
                  <div className="text-sm text-blue-900 mt-1 space-y-1">
                    {hasCourierBlocked && <p>Courier is disabled because this cart has heavy, fragile, used, or local-only items.</p>}
                    {hasInstallRequired && <p>At least one item needs fitting, so an installation appointment option is available.</p>}
                    {hasMeetupRecommended && <p>Seller pickup or a public meetup is recommended for inspection before payment.</p>}
                  </div>
                </div>
              </div>
            )}

            {cartItems.map((item) => (
              <article key={item.accessory.id} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-[140px_1fr_150px] gap-4">
                <img src={item.accessory.image} alt={item.accessory.name} className="h-32 w-full object-cover rounded-lg bg-slate-100" />
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">{item.accessory.category}</p>
                  <Link to={`/accessories/${item.accessory.id}`} className="text-xl font-black text-slate-900 hover:text-emerald-700">{item.accessory.name}</Link>
                  <p className="text-sm text-slate-500 mt-1">{item.accessory.seller} - {item.accessory.city} - {item.accessory.warranty}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${item.fitsGarage || item.accessory.fitmentType === 'Universal' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.fitsGarage || item.accessory.fitmentType === 'Universal' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {item.accessory.fitmentType === 'Universal' ? 'Universal item' : item.fitsGarage ? 'Fits your garage' : 'Seller must confirm fitment'}
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${item.fulfillment.courierAllowed ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {item.fulfillment.fulfillment}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {item.fulfillment.installRequired ? 'Installation/fitting needed. ' : ''}
                    {item.fulfillment.courierAllowed ? 'Courier possible after seller confirmation.' : 'Courier not recommended for this item.'}
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-lg font-black text-slate-900">{formatPkr(item.subtotal)}</p>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-slate-400">Qty</span>
                    <input
                      type="number"
                      min="1"
                      max={item.accessory.stock}
                      value={item.quantity}
                      onChange={(event) => updateAccessoryCartQuantity(item.accessory.id, event.target.value)}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-bold"
                    />
                  </label>
                  <button onClick={() => removeAccessoryFromCart(item.accessory.id)} className="inline-flex items-center gap-2 text-red-700 font-black text-sm">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </article>
            ))}
          </section>

          <aside className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-24">
              <h2 className="text-xl font-black text-slate-900">Checkout details</h2>
              <div className="space-y-3 mt-4">
                <Select label="Delivery method" value={safeDeliveryMethod} onChange={(value) => setCheckout((current) => ({ ...current, deliveryMethod: value }))} options={deliveryOptions} />
                <Select label="Payment" value={checkout.paymentMethod} onChange={(value) => setCheckout((current) => ({ ...current, paymentMethod: value }))} options={['Cash on delivery / wallet placeholder', 'Bank transfer placeholder', 'Card gateway placeholder']} />
                <label className="block">
                  <span className="text-xs font-black uppercase text-slate-400">Address / pickup city</span>
                  <textarea value={checkout.address} onChange={(event) => setCheckout((current) => ({ ...current, address: event.target.value }))} rows="3" className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-bold" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-slate-400">Notes for seller</span>
                  <textarea value={checkout.notes} onChange={(event) => setCheckout((current) => ({ ...current, notes: event.target.value }))} rows="3" className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-bold" placeholder="Ask seller to confirm socket size, trim, or pickup timing." />
                </label>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 space-y-2 text-sm">
                <MoneyRow label="Subtotal" value={subtotal} />
                <MoneyRow label="Delivery" value={deliveryFee} />
                <MoneyRow label="Service fee" value={serviceFee} />
                <div className="flex items-center justify-between text-lg font-black text-slate-900 pt-2">
                  <span>Total</span>
                  <span>{formatPkr(total)}</span>
                </div>
              </div>

              <button onClick={submitOrder} className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3 font-black">
                Place accessory order
              </button>
              <p className="text-xs text-slate-500 mt-3">This is still a frontend/mock payment flow. Real gateway, escrow, and stock reservation come later.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

const Select = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="text-xs font-black uppercase text-slate-400">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-bold bg-white">
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const MoneyRow = ({ label, value }) => (
  <div className="flex items-center justify-between text-slate-600 font-bold">
    <span>{label}</span>
    <span>{formatPkr(value)}</span>
  </div>
);

export default AccessoryCart;
