import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const SellCarListing = () => {
  const { submitListing, verification, authUser } = useAuctions();
  // --- Global State ---
  const [step, setStep] = useState(1);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submittedListing, setSubmittedListing] = useState(null);

  // --- Step 1 State ---
  const [sellerType, setSellerType] = useState('Private party');
  const [modified, setModified] = useState('Completely stock'); 
  const [hasFlaws, setHasFlaws] = useState(null); 
  const [locationCountry, setLocationCountry] = useState('Pakistan');
  const [isSaleElsewhere, setIsSaleElsewhere] = useState(null);
  
  // --- Step 2 State ---
  const [titleLocation, setTitleLocation] = useState('');
  const [titledInName, setTitledInName] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    vin: '',
    year: '',
    make: '',
    model: '',
    transmission: '',
    mileage: '',
    specialOptions: '',
    titleStatus: '',
    referral: '',
    listingType: 'Auction',
    reservePrice: '',
    askingPrice: '',
    bidIncrement: '25000',
  });

  // --- Dynamic Year Generation ---
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 2 }, (_, i) => currentYear + 1 - i);

  // Helper class strings for buttons
  const activeBtn = "bg-green-50 border-[#34D399] text-slate-900 z-10 ring-1 ring-[#34D399]";
  const inactiveBtn = "bg-white border-slate-200 text-slate-600 hover:border-slate-300";

  const handleNextStep = () => {
    setStep(2);
    window.scrollTo(0, 0);
  };

  const updateForm = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    const result = await submitListing({
      ...formData,
      sellerType,
      modified,
      hasFlaws,
      locationCountry,
      isSaleElsewhere,
      titleLocation,
      titledInName,
    });

    setSubmissionMessage(result.message);
    if (result.ok) {
      setSubmittedListing(result.listing);
      window.scrollTo(0, 0);
    }
  };

  if (submittedListing) {
    return (
      <div className="bg-slate-50 min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <p className="text-green-600 font-black text-sm uppercase tracking-wider">Submitted</p>
          <h1 className="text-3xl font-black text-slate-900 mt-2">Your listing is in admin review.</h1>
          <p className="text-slate-500 mt-3">
            Quality score: <span className="font-black text-slate-900">{submittedListing.qualityScore}/100</span>. Admin will check title, seller identity, pricing, and auction readiness before launch.
          </p>
          <div className="bg-slate-50 rounded-xl p-5 mt-6">
            <h2 className="font-black text-slate-900">{submittedListing.year} {submittedListing.make} {submittedListing.model}</h2>
            <p className="text-sm text-slate-500 mt-1">{submittedListing.listingType} - {submittedListing.status}</p>
            <ul className="list-disc pl-5 mt-4 text-sm text-slate-600 space-y-1">
              {submittedListing.aiNotes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link to="/seller/dashboard" className="bg-slate-900 text-white text-center px-5 py-3 rounded-lg font-bold">
              Open Seller Dashboard
            </Link>
            <Link to="/admin" className="border border-slate-300 text-slate-900 text-center px-5 py-3 rounded-lg font-bold">
              Review as Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-20 pt-10">
      <div className="max-w-3xl mx-auto px-6">
        
        {/* --- HEADER --- */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Tell us about your car</h1>
          <p className="text-slate-600 text-lg mb-6 leading-relaxed">
            Please give us some basics about yourself and the car you'd like to sell. We'll also need details about the car's title status as well as 6 photos that highlight the car's exterior and interior condition.
          </p>
          <p className="text-slate-600 mb-8 font-medium">
            We'll respond to your application within a business day.
          </p>

          <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">Seller trust status</p>
            <p className="mt-2 text-sm font-bold text-slate-800">
              {authUser
                ? `Signed in as ${authUser.email}. Verification level: ${verification?.verificationLevel || 'registered'}.`
                : 'You need a signed-in seller account before this listing can be submitted.'}
            </p>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Vehicle submissions are blocked until the account is eligible for {formData.listingType === 'Auction' ? 'auction creation' : 'marketplace selling'}.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to={authUser ? '/settings' : '/login'} className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-black text-white">
                {authUser ? 'Open trust settings' : 'Sign in'}
              </Link>
              <Link to="/dealer/membership" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
                Dealer plans
              </Link>
            </div>
          </div>
            
          <p className="text-slate-400 text-sm font-bold uppercase tracking-wide">
            Application Step {step} of 2
          </p>
        </div>

        {/* ==================================================================
            STEP 1 CONTENT
           ================================================================== */}
        {step === 1 && (
          <>
            {/* --- SECTION 1: YOUR INFO --- */}
            <div className="bg-slate-50 rounded-2xl p-8 mb-8">
              <div className="flex items-center mb-8">
                <div className="w-1.5 h-6 bg-[#34D399] rounded-full mr-3"></div>
                <h2 className="text-2xl font-black text-slate-900">Your Info</h2>
              </div>

              {/* Dealer/Private Toggle */}
              <div className="mb-6">
                <label className="block text-slate-800 font-bold mb-3 text-lg">Dealer or private party?</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setSellerType('Dealer')}
                    className={`px-6 py-2.5 rounded-lg border-2 font-bold transition-all ${sellerType === 'Dealer' ? activeBtn : inactiveBtn}`}
                  >
                    Dealer
                  </button>
                  <button 
                    onClick={() => setSellerType('Private party')}
                    className={`px-6 py-2.5 rounded-lg border-2 font-bold transition-all ${sellerType === 'Private party' ? activeBtn : inactiveBtn}`}
                  >
                    Private party
                  </button>
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-slate-700 font-medium mb-2">Full name</label>
                  <input value={formData.fullName} onChange={(event) => updateForm('fullName', event.target.value)} type="text" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399]" />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-2">Contact phone number</label>
                  <input value={formData.phone} onChange={(event) => updateForm('phone', event.target.value)} type="tel" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399]" />
                </div>
              </div>

              <div className="flex items-center">
                <input type="checkbox" id="textMe" className="w-5 h-5 text-[#34D399] rounded focus:ring-[#34D399] border-gray-300 accent-[#34D399]" defaultChecked />
                <label htmlFor="textMe" className="ml-3 text-slate-800 font-medium">Text me about my submission</label>
              </div>
            </div>

            {/* --- SECTION 2: CAR DETAILS --- */}
            <div className="bg-slate-50 rounded-2xl p-8 mb-8">
              <div className="flex items-center mb-8">
                <div className="w-1.5 h-6 bg-[#34D399] rounded-full mr-3"></div>
                <h2 className="text-2xl font-black text-slate-900">Car Details</h2>
              </div>

              {/* VIN */}
              <div className="mb-6">
                <label className="block text-slate-800 font-medium mb-2">VIN</label>
                <div className="flex gap-3">
                  <input value={formData.vin} onChange={(event) => updateForm('vin', event.target.value)} type="text" className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]" />
                  <button className="bg-[#86efac] text-green-900 font-bold px-6 py-3 rounded-lg hover:bg-[#4ade80] transition-colors">
                    Lookup
                  </button>
                </div>
              </div>

              {/* Year/Make/Model */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-slate-800 font-medium mb-2">Year</label>
                  <select value={formData.year} onChange={(event) => updateForm('year', event.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#34D399] max-h-60">
                    <option value="">Choose</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-800 font-medium mb-2">Make</label>
                  <input value={formData.make} onChange={(event) => updateForm('make', event.target.value)} type="text" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]" />
                </div>
                <div>
                  <label className="block text-slate-800 font-medium mb-2">Model</label>
                  <input value={formData.model} onChange={(event) => updateForm('model', event.target.value)} type="text" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]" />
                </div>
              </div>

              {/* Transmission & Mileage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-slate-800 font-medium mb-2">Transmission</label>
                  <select value={formData.transmission} onChange={(event) => updateForm('transmission', event.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#34D399]">
                    <option value="">Select transmission type</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-800 font-medium mb-2">Mileage (in miles)</label>
                  <input value={formData.mileage} onChange={(event) => updateForm('mileage', event.target.value)} type="text" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]" />
                </div>
              </div>

              {/* Special Options */}
              <div className="mb-8">
                <label className="block text-slate-800 font-medium mb-2">Special options/equipment</label>
                <textarea 
                  rows="3"
                  value={formData.specialOptions}
                  onChange={(event) => updateForm('specialOptions', event.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]"
                  placeholder="For example: sport package, long-range battery, FSD or other important factory-installed features"
                ></textarea>
              </div>

              {/* Questions Group */}
              <div className="space-y-8">
                
                {/* Modified Section */}
                <div>
                  <label className="block text-slate-800 font-medium mb-3 text-lg">Has the car been modified?</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setModified('Completely stock')}
                      className={`px-6 py-2.5 rounded-lg border-2 font-bold transition-all ${modified === 'Completely stock' ? activeBtn : inactiveBtn}`}
                    >
                      Completely stock
                    </button>
                    <button 
                      onClick={() => setModified('Modified')}
                      className={`px-6 py-2.5 rounded-lg border-2 font-bold transition-all ${modified === 'Modified' ? activeBtn : inactiveBtn}`}
                    >
                      Modified
                    </button>
                  </div>

                  {modified === 'Modified' && (
                    <div className="mt-6">
                      <label className="block text-slate-800 font-medium mb-2">
                        List any modifications, including modification or removal of the catalytic converters.
                      </label>
                      <textarea 
                        rows="3"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]"
                      ></textarea>
                    </div>
                  )}
                </div>

                {/* Flaws */}
                <div>
                  <label className="block text-slate-800 font-medium mb-3 text-lg leading-snug">Are there any significant mechanical or cosmetic flaws that we should know about?</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setHasFlaws(true)}
                      className={`px-8 py-2.5 rounded-lg border-2 font-bold transition-all ${hasFlaws === true ? activeBtn : inactiveBtn}`}
                    >
                      Yes
                    </button>
                    <button 
                      onClick={() => setHasFlaws(false)}
                      className={`px-8 py-2.5 rounded-lg border-2 font-bold transition-all ${hasFlaws === false ? activeBtn : inactiveBtn}`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {/* Location - Step 1 */}
              <div>
                <label className="block text-slate-800 font-medium mb-3 text-lg">How do you want to list it?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => updateForm('listingType', 'Auction')}
                    className={`px-6 py-3 rounded-lg border-2 font-bold transition-all ${formData.listingType === 'Auction' ? activeBtn : inactiveBtn}`}
                  >
                    Live Auction
                  </button>
                  <button
                    onClick={() => updateForm('listingType', 'Marketplace')}
                    className={`px-6 py-3 rounded-lg border-2 font-bold transition-all ${formData.listingType === 'Marketplace' ? activeBtn : inactiveBtn}`}
                  >
                    Fixed Price Listing
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {formData.listingType === 'Auction' ? (
                    <>
                      <div>
                        <label className="block text-slate-800 font-medium mb-2">Reserve price (PKR)</label>
                        <input value={formData.reservePrice} onChange={(event) => updateForm('reservePrice', event.target.value)} type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]" />
                      </div>
                      <div>
                        <label className="block text-slate-800 font-medium mb-2">Bid increment (PKR)</label>
                        <input value={formData.bidIncrement} onChange={(event) => updateForm('bidIncrement', event.target.value)} type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]" />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-slate-800 font-medium mb-2">Asking price (PKR)</label>
                      <input value={formData.askingPrice} onChange={(event) => updateForm('askingPrice', event.target.value)} type="number" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]" />
                    </div>
                  )}
                </div>

                <label className="block text-slate-800 font-medium mb-3 text-lg">Where is the car located?</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setLocationCountry('Pakistan')}
                      className={`px-8 py-2.5 rounded-lg border-2 font-bold transition-all ${locationCountry === 'Pakistan' ? activeBtn : inactiveBtn}`}
                    >
                      Pakistan
                    </button>
                  </div>
                </div>

                {/* Sale Elsewhere */}
                <div>
                  <label className="block text-slate-800 font-medium mb-3 text-lg">Is this car for sale elsewhere?</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsSaleElsewhere(true)}
                      className={`px-8 py-2.5 rounded-lg border-2 font-bold transition-all ${isSaleElsewhere === true ? activeBtn : inactiveBtn}`}
                    >
                      Yes
                    </button>
                    <button 
                      onClick={() => setIsSaleElsewhere(false)}
                      className={`px-8 py-2.5 rounded-lg border-2 font-bold transition-all ${isSaleElsewhere === false ? activeBtn : inactiveBtn}`}
                    >
                      No
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* --- FOOTER BUTTON (STEP 1) --- */}
            <div>
              <button 
                onClick={handleNextStep}
                className="bg-[#34D399] text-slate-900 font-bold text-lg px-12 py-3 rounded-lg hover:bg-[#10B981] transition-all shadow-md active:scale-95"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* ==================================================================
            STEP 2 CONTENT
           ================================================================== */}
        {step === 2 && (
          <>
            {/* --- TITLE INFO --- */}
            <div className="bg-slate-50 rounded-2xl p-8 mb-8">
              <div className="flex items-center mb-8">
                <div className="w-1.5 h-6 bg-[#34D399] rounded-full mr-3"></div>
                <h2 className="text-2xl font-black text-slate-900">Title Info</h2>
              </div>

              {/* Title Location */}
              <div className="mb-6">
                <label className="block text-slate-800 font-medium mb-2 text-lg">Where is the car registered/titled?</label>
                <select 
                  value={titleLocation}
                  className="w-full md:w-1/2 p-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#34D399]"
                  onChange={(e) => setTitleLocation(e.target.value)}
                >
                  <option value="">Select Province / Territory</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Sindh">Sindh</option>
                  <option value="KPK">Khyber Pakhtunkhwa (KPK)</option>
                  <option value="Balochistan">Balochistan</option>
                  <option value="Islamabad">Islamabad Capital Territory</option>
                  <option value="Gilgit">Gilgit-Baltistan</option>
                  <option value="AJK">Azad Jammu & Kashmir</option>
                </select>
              </div>

              {/* Titled in Name */}
              <div className="mb-6">
                <label className="block text-slate-800 font-medium mb-3 text-lg">Is the vehicle titled in your name?</label>
                <div className="flex gap-4 mb-6">
                  <button 
                    onClick={() => setTitledInName(true)}
                    className={`px-8 py-2.5 rounded-lg border-2 font-bold transition-all ${titledInName === true ? activeBtn : inactiveBtn}`}
                  >
                    Yes
                  </button>
                  <button 
                    onClick={() => setTitledInName(false)}
                    className={`px-8 py-2.5 rounded-lg border-2 font-bold transition-all ${titledInName === false ? activeBtn : inactiveBtn}`}
                  >
                    No
                  </button>
                </div>

                {/* Conditional Warning & Textarea if Titled Name is NO */}
                {titledInName === false && (
                  <div className="animate-fade-in-down">
                    <div className="bg-slate-100 p-4 rounded-lg text-slate-700 text-sm mb-4 leading-relaxed">
                      If the vehicle is titled or registered in the name of another individual, a photo of the owner's ID will be requested for further verification.
                    </div>
                    
                    <label className="block text-slate-800 font-medium mb-2">Whose name is on the title? What's your relationship with them?</label>
                    <textarea 
                      rows="3"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]"
                    ></textarea>
                  </div>
                )}
              </div>

              {/* Title Status */}
              <div>
                <label className="block text-slate-800 font-medium mb-2 text-lg">What is the title's status?</label>
                <select value={formData.titleStatus} onChange={(event) => updateForm('titleStatus', event.target.value)} className="w-full md:w-1/2 p-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#34D399]">
                  <option value="">Choose</option>
                  <option value="Clean">Clean</option>
                  <option value="Salvage">Salvage</option>
                  <option value="Rebuilt">Rebuilt</option>
                  <option value="Lienholder">Lienholder</option>
                  <option value="Duplicate">Duplicate</option>
                </select>
              </div>
            </div>

            {/* --- PHOTOS --- */}
            <div className="bg-slate-50 rounded-2xl p-8 mb-8">
              <div className="flex items-center mb-8">
                <div className="w-1.5 h-6 bg-[#34D399] rounded-full mr-3"></div>
                <h2 className="text-2xl font-black text-slate-900">Photos</h2>
              </div>

              <p className="text-slate-700 text-lg mb-6">
                We only need 6 photos to evaluate the value of your car and the suitability for the site.
              </p>

              {/* Upload Box */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:bg-slate-100 transition-colors cursor-pointer group">
                <div className="flex justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#34D399] group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-slate-800 font-medium text-lg">Click to select photos, or drag and drop here</p>
              </div>
            </div>

            {/* --- REFERRAL --- */}
            <div className="bg-slate-50 rounded-2xl p-8 mb-8">
              <div className="flex items-center mb-6">
                <div className="w-1.5 h-6 bg-[#34D399] rounded-full mr-3"></div>
                <h2 className="text-2xl font-black text-slate-900">Referral</h2>
              </div>

              <div className="mb-4">
                <label className="block text-slate-800 font-medium mb-2 text-lg">
                  How did you hear about us? If a user referred you please leave their username.
                </label>
                <input value={formData.referral} onChange={(event) => updateForm('referral', event.target.value)} type="text" className="w-full md:w-1/2 p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#34D399]" />
              </div>
            </div>

            {/* --- FOOTER BUTTON (STEP 2) --- */}
            <div>
              <button onClick={handleSubmit} className="bg-[#34D399] text-slate-900 font-bold text-lg px-12 py-3 rounded-lg hover:bg-[#10B981] transition-all shadow-md active:scale-95">
                Submit
              </button>
              {submissionMessage && <p className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 font-semibold">{submissionMessage}</p>}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default SellCarListing;
