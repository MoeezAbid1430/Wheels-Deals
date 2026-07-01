import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import brandLogo from '../assets/wheels-and-deals-logo-cropped.jpeg';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';
import { repairShopCategories } from '../services';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { wallet, notifications, accessoryCart } = useAuctions();
  const unreadNotifications = notifications.filter((item) => !item.read).length;
  const cartCount = accessoryCart?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  const [showSellModal, setShowSellModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMarketMenu, setShowMarketMenu] = useState(false);
  const [showServicesMenu, setShowServicesMenu] = useState(false);
  const [showAccessoriesMenu, setShowAccessoriesMenu] = useState(false);
  const [showCommunityMenu, setShowCommunityMenu] = useState(false);
  const [showSellMenu, setShowSellMenu] = useState(false);
  const closeSellRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowSellModal(false);
        setShowProfileMenu(false);
        setShowMobileMenu(false);
        setShowMarketMenu(false);
        setShowServicesMenu(false);
        setShowAccessoriesMenu(false);
        setShowCommunityMenu(false);
        setShowSellMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (showSellModal) closeSellRef.current?.focus();
  }, [showSellModal]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowProfileMenu(false);
    setShowMarketMenu(false);
    setShowServicesMenu(false);
    setShowAccessoriesMenu(false);
    setShowCommunityMenu(false);
    setShowSellMenu(false);
  };

  const closeMegaMenus = () => {
    setShowMarketMenu(false);
    setShowServicesMenu(false);
    setShowAccessoriesMenu(false);
    setShowCommunityMenu(false);
    setShowSellMenu(false);
  };

  const handleAuctionClick = () => {
    navigate('/auctions');
  };

  const navClass = (to) => `whitespace-nowrap hover:text-blue-600 cursor-pointer transition-all active:scale-95 duration-150 ${location.pathname === to ? 'text-blue-700 font-black' : ''}`;

  return (
    <>
      <div className="flex items-center justify-between gap-4 p-3 sm:p-4 sm:px-8 shadow-sm bg-white sticky top-0 z-50">
        
        {/* Logo Section */}
        <Link 
          to="/" 
          onClick={scrollToTop}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer active:scale-95 transition-transform duration-150 min-w-0"
        >
          <span className="h-11 sm:h-16 w-36 sm:w-44 overflow-hidden shrink-0 flex items-center bg-white" aria-hidden="true">
            <img src={brandLogo} alt="" className="w-full h-full object-contain object-left" />
          </span>
          <span className="sr-only">Wheels&Deals</span>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden xl:flex flex-1 items-center justify-center gap-3 font-medium text-sm text-slate-600 min-w-0" aria-label="Primary navigation">
          <Link to="/" onClick={scrollToTop} aria-current={location.pathname === '/' ? 'page' : undefined} className={navClass('/')}>Home</Link>
          <div className="relative" onMouseLeave={() => setShowMarketMenu(false)}>
            <Link
              to="/listings"
              onClick={closeMegaMenus}
              onMouseEnter={() => { closeMegaMenus(); setShowMarketMenu(true); }}
              className={navClass('/listings')}
              aria-haspopup="menu"
              aria-expanded={showMarketMenu}
            >
              Marketplace
            </Link>
            {showMarketMenu && (
              <MegaMenu width="w-[760px]" align="start" columns={4}>
                <MegaColumn
                  title="Shop vehicles"
                  items={[
                    ['Marketplace Home', '/listings', 'OLX/PakWheels-style fixed price listings'],
                    ['Used Cars', '/listings?category=Cars', 'Private and dealer fixed-price cars'],
                    ['Used Bikes', '/listings?category=Bikes', 'CD 70, CG 125, YBR, scooters'],
                    ['Commercial Vehicles', '/listings?category=Loaders%20%26%20Pickups', 'Loaders, vans, trucks and pickups'],
                  ]}
                  onClick={closeMegaMenus}
                />
                <MegaColumn
                  title="Browse smarter"
                  items={[
                    ['Browse by City', '/listings?sort=city', 'Lahore, Karachi, Islamabad and more'],
                    ['Installments', '/installments', 'Monthly payment focused discovery'],
                    ['Verified Dealers', '/listings?sellerType=dealer', 'Trusted dealer inventory'],
                    ['Inspected Vehicles', '/listings?inspection=true', 'Higher trust listings first'],
                  ]}
                  onClick={closeMegaMenus}
                />
                <MegaColumn
                  title="Popular types"
                  items={[
                    ['SUVs', '/listings?bodyStyle=SUV', 'Family and off-road vehicles'],
                    ['Sedans', '/listings?bodyStyle=Sedan', 'Civic, Corolla, City and more'],
                    ['Hatchbacks', '/listings?bodyStyle=Hatchback', 'Budget city cars'],
                    ['Commercial / Loaders', '/listings?category=commercial', 'Loaders, vans, pickups'],
                  ]}
                  onClick={closeMegaMenus}
                />
                <MegaColumn
                  title="Research tools"
                  items={[
                    ['Compare Vehicles', '/compare', 'Specs, dimensions and features'],
                    ['Recommendations', '/recommendations', 'Hybrid AI suggestions'],
                    ['My Garage Fitment', '/garage', 'Owned vehicles and bike fitment'],
                    ['Post Vehicle Ad', '/sell/listing', 'Sell cars, bikes, loaders and more'],
                  ]}
                  onClick={closeMegaMenus}
                />
              </MegaMenu>
            )}
          </div>
          <div className="relative" onMouseLeave={() => setShowServicesMenu(false)}>
            <Link
              to="/repair-shops"
              onClick={closeMegaMenus}
              onMouseEnter={() => { closeMegaMenus(); setShowServicesMenu(true); }}
              className={`${navClass('/repair-shops')} ${location.pathname === '/repair-shops' ? 'text-blue-700 font-black' : ''}`}
              aria-haspopup="menu"
              aria-expanded={showServicesMenu}
            >
              Services Near Me
            </Link>
            {showServicesMenu && (
              <MegaMenu width="w-[760px]" align="start" columns={4}>
                <MegaColumn
                  title="Repair & care"
                  items={[
                    ['All Services', '/repair-shops', 'Verified local automotive directory'],
                    ['Workshops', '/repair-shops?category=workshops', serviceHelpText.workshops],
                    ['Oil Change', '/repair-shops?category=oil-change', serviceHelpText['oil-change']],
                    ['Car Washes', '/repair-shops?category=car-wash', serviceHelpText['car-wash']],
                  ]}
                  onClick={closeMegaMenus}
                />
                <MegaColumn
                  title="Inspection & road"
                  items={[
                    ['Inspections', '/repair-shops?category=inspection', serviceHelpText.inspection],
                    ['Tyres', '/repair-shops?category=tyres', serviceHelpText.tyres],
                    ['Towing', '/repair-shops?category=towing', serviceHelpText.towing],
                    ['Use My Location', '/repair-shops?category=workshops', 'Nearby mechanics and stations'],
                  ]}
                  onClick={closeMegaMenus}
                />
                <MegaColumn
                  title="Dealers & mobility"
                  items={[
                    ['Dealerships', '/repair-shops?category=dealerships', serviceHelpText.dealerships],
                    ['Rent a Car', '/repair-shops?category=rent-a-car', serviceHelpText['rent-a-car']],
                    ['Sell a Car Help', '/repair-shops?category=sell-a-car', serviceHelpText['sell-a-car']],
                    ['Service Rankings', '/rankings', 'Top workshops and dealers'],
                  ]}
                  onClick={closeMegaMenus}
                />
                <div className="min-w-0 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fast searches</p>
                  <div className="mt-3 grid gap-1.5">
                    {['Oil change near me', 'Pre-bid inspection', 'Best car wash', 'Verified mechanic', 'Tyre alignment'].map((item) => (
                      <Link key={item} to={`/repair-shops?category=${popularServiceLinks[item]}`} onClick={closeMegaMenus} className="rounded-md px-2 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 hover:text-blue-700" role="menuitem">
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>
              </MegaMenu>
            )}
          </div>
          <div className="relative" onMouseLeave={() => setShowAccessoriesMenu(false)}>
            <Link
              to="/accessories"
              onClick={closeMegaMenus}
              onMouseEnter={() => { closeMegaMenus(); setShowAccessoriesMenu(true); }}
              className={navClass('/accessories')}
              aria-haspopup="menu"
              aria-expanded={showAccessoriesMenu}
            >
              Accessories
            </Link>
            {showAccessoriesMenu && (
              <MegaMenu width="w-[700px]" columns={3}>
                <MegaColumn
                  title="Shop by intent"
                  items={[
                    ['All Accessories', '/accessories', 'Hybrid OLX/Daraz accessory marketplace'],
                    ['Fits My Garage', '/accessories?fitsGarage=true', 'Recommended by owned vehicles'],
                    ['Delivery Eligible', '/accessories?delivery=true', 'Items that can ship'],
                    ['Meetup Only', '/accessories?delivery=false', 'Large or local handover items'],
                  ]}
                  onClick={closeMegaMenus}
                />
                <MegaColumn
                  title="Vehicle parts"
                  items={[
                    ['Tyres & Wheels', '/accessories?group=Tyres%2C%20Wheels%20%26%20Oils', 'Tyres, rims, alignment products'],
                    ['Electronics', '/accessories?group=Electronics%20%26%20Gadgets', 'Dash cams, screens, sensors'],
                    ['Car Care', '/accessories?group=Car%20Care%20%26%20Detailing', 'Detailing, cleaning, ceramic'],
                    ['Body Parts', '/accessories?group=Exterior%20%26%20Body', 'Bumpers, mirrors, covers and kits'],
                  ]}
                  onClick={closeMegaMenus}
                />
                <MegaColumn
                  title="Bike gear"
                  items={[
                    ['Bike Accessories', '/accessories?group=Performance%2C%20Off-road%20%26%20Bikes', 'Helmets, gloves, lights, exhausts'],
                    ['Bike Spare Parts', '/accessories?group=Performance%2C%20Off-road%20%26%20Bikes&category=Bike%20Spare%20Parts', 'Common motorcycle parts and service items'],
                    ['Bike Lights', '/accessories?group=Performance%2C%20Off-road%20%26%20Bikes&category=Bike%20Lights', 'Headlights, indicators and bulbs'],
                    ['Sell Accessory', '/sell/accessory', 'List parts, upgrades and products'],
                  ]}
                  onClick={closeMegaMenus}
                />
              </MegaMenu>
            )}
          </div>
          <Link to="/garage" aria-current={location.pathname === '/garage' ? 'page' : undefined} className={navClass('/garage')}>My Garage</Link>
          <div className="relative" onMouseLeave={() => setShowCommunityMenu(false)}>
            <Link
              to="/communities"
              onClick={closeMegaMenus}
              onMouseEnter={() => { closeMegaMenus(); setShowCommunityMenu(true); }}
              className={navClass('/communities')}
              aria-haspopup="menu"
              aria-expanded={showCommunityMenu}
            >
              Communities
            </Link>
            {showCommunityMenu && (
              <MegaMenu width="w-[660px]" align="end" columns={3}>
                <MegaColumn
                  title="Communities"
                  items={[
                    ['All Communities', '/communities', 'Reddit-style car discussions'],
                    ['Model Groups', '/community/model/Toyota/Fortuner', 'Owner groups by make and model'],
                    ['Bike Communities', '/communities?tag=bikes', 'Motorcycle owners and riders'],
                    ['Price Checks', '/communities?tag=price-check', 'Ask owners before buying'],
                  ]}
                  onClick={closeMegaMenus}
                />
                <MegaColumn
                  title="People"
                  items={[
                    ['Profile', '/profile', 'Posts, comments, joined communities'],
                    ['Collection Rankings', '/rankings', 'Garage and dealer leaderboards'],
                    ['Messages', '/messages', 'Private buyer/seller conversations'],
                    ['Notifications', '/notifications', 'Replies, bids and alerts'],
                  ]}
                  onClick={closeMegaMenus}
                />
                <MegaColumn
                  title="Moderation & help"
                  items={[
                    ['Forum Moderation', '/community/moderation', 'Reports, locked posts and rules'],
                    ['Feature Suggestions', '/feature-suggestions', 'Tell the team what to improve'],
                    ['Notifications', '/notifications', 'Replies, bids and saved alerts'],
                    ['FAQ', '/faq', 'Help and platform rules'],
                  ]}
                  onClick={closeMegaMenus}
                />
              </MegaMenu>
            )}
          </div>
          <Link to="/news" aria-current={location.pathname === '/news' ? 'page' : undefined} className={navClass('/news')}>News</Link>
          <Link to="/rankings" aria-current={location.pathname === '/rankings' ? 'page' : undefined} className={navClass('/rankings')}>Rankings</Link>
          <Link to="/trust" aria-current={location.pathname === '/trust' ? 'page' : undefined} className={navClass('/trust')}>Trust</Link>
          <Link to="/faq" aria-current={location.pathname === '/faq' ? 'page' : undefined} className={navClass('/faq')}>FAQ</Link>
        </nav>

        {/* Right Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            to="/buy-car"
            onClick={scrollToTop}
            aria-current={location.pathname === '/buy-car' ? 'page' : undefined}
            className="hidden sm:inline-flex items-center justify-center whitespace-nowrap bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 hover:shadow-lg transition-all active:scale-95 duration-150 font-black shadow-sm"
          >
            Buy a Car
          </Link>

          <div className="relative" onMouseLeave={() => setShowSellMenu(false)}>
            <Link
              to="/sell-car"
              onClick={closeMegaMenus}
              onMouseEnter={() => { closeMegaMenus(); setShowSellMenu(true); }}
              className="hidden sm:inline-flex items-center justify-center whitespace-nowrap bg-[#34D399] text-slate-900 font-black px-5 py-2.5 rounded-full hover:bg-[#10B981] transition-all shadow-sm active:scale-95"
              aria-haspopup="menu"
              aria-expanded={showSellMenu}
            >
              Sell a Car
            </Link>
            {showSellMenu && (
              <MegaMenu width="w-[560px]" align="end" columns={2}>
                <MegaColumn
                  title="Sell vehicles"
                  items={[
                    ['Post Marketplace Ad', '/sell/listing', 'Fixed-price cars, bikes and loaders'],
                    ['Auction Your Vehicle', '/sell/auction', 'Fast sale with competitive bidding'],
                    ['Dealer Membership', '/dealer/membership', 'Verified dealer monthly plan'],
                    ['Seller Dashboard', '/seller/dashboard', 'Inventory, leads and payouts'],
                  ]}
                  onClick={closeMegaMenus}
                />
                <MegaColumn
                  title="Seller tools"
                  items={[
                    ['Sell Accessories', '/sell/accessory', 'Parts, upgrades and products'],
                    ['List Service Provider', '/repair-shops?category=workshops', 'Workshops, car wash, rent-a-car'],
                    ['Media Center', '/seller/media', 'Upload photos, videos and documents'],
                    ['Orders', '/orders', 'Purchases, delivery and disputes'],
                  ]}
                  onClick={closeMegaMenus}
                />
              </MegaMenu>
            )}
          </div>

          <button 
            onClick={handleAuctionClick} 
            aria-current={location.pathname === '/auctions' ? 'page' : undefined}
            className="hidden sm:block bg-red-600 text-white px-7 py-2.5 rounded-full hover:bg-red-700 hover:shadow-lg transition-all active:scale-95 duration-150 font-bold shadow-md"
          >
            Auctions
          </button>

          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="xl:hidden flex items-center justify-center w-11 h-11 bg-slate-100 rounded-full hover:bg-slate-200 font-black text-slate-700"
            aria-label={showMobileMenu ? 'Close mobile menu' : 'Open mobile menu'}
            aria-expanded={showMobileMenu}
          >
            <span className="sr-only">{showMobileMenu ? 'Close' : 'Menu'}</span>
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5.5A.75.75 0 013.75 4.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.5zm0 4.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 10zm0 4.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 14.5z" clipRule="evenodd" />
            </svg>
          </button>

          {/* --- PROFILE DROPDOWN --- */}
          <div className="relative">
            <button 
              onClick={() => { closeMegaMenus(); setShowProfileMenu(!showProfileMenu); }}
              className="flex items-center justify-center w-11 h-11 bg-slate-100 rounded-full hover:bg-slate-200 hover:ring-2 hover:ring-slate-300 transition-all active:scale-95"
              aria-label="Open account menu"
              aria-expanded={showProfileMenu}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </button>

            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setShowProfileMenu(false)}
                ></div>

                <div className="absolute right-0 mt-3 w-80 max-h-[calc(100vh-110px)] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-fade-in-up">
                  <div className="py-2">
                    
                    {/* Wallet */}
                    <Link 
                      to="/wallet" 
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-[#34D399]/20 p-2 rounded-lg text-[#059669]">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <span className="font-bold text-slate-700 group-hover:text-slate-900">Wallet</span>
                      </div>
                      <span className="font-black text-slate-900">{formatPkr(wallet.balance)}</span>
                    </Link>

                    <MenuSection label="Buying" />

                    <Link
                      to="/buyer/dashboard"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Buyer Dashboard</span>
                    </Link>

                    <Link
                      to="/orders"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">My Orders</span>
                    </Link>

                    <Link
                      to="/notifications"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Notifications</span>
                      {unreadNotifications > 0 && <span className="bg-red-600 text-white rounded-full px-2 py-0.5 text-xs font-black">{unreadNotifications}</span>}
                    </Link>

                    <Link
                      to="/installments"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Installments</span>
                    </Link>

                    <Link
                      to="/repair-shops"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Services Near Me</span>
                    </Link>

                    <MenuSection label="Tools" />

                    <Link
                      to="/compare"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Compare Cars</span>
                    </Link>

                    <Link
                      to="/accessory-cart"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Accessory Cart</span>
                      {cartCount > 0 && <span className="bg-emerald-600 text-white rounded-full px-2 py-0.5 text-xs font-black">{cartCount}</span>}
                    </Link>

                    <Link
                      to="/accessories"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Accessories</span>
                    </Link>

                    <Link
                      to="/garage"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">My Garage</span>
                    </Link>

                    <Link
                      to="/messages"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Messages</span>
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Profile</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Account Settings</span>
                    </Link>

                    <Link
                      to="/privacy"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Privacy Center</span>
                    </Link>

                    <Link
                      to="/feature-suggestions"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Feature Suggestions</span>
                    </Link>

                    <MenuSection label="Seller and dealer" />

                    <Link
                      to="/seller/dashboard"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Seller Dashboard</span>
                    </Link>

                    <Link
                      to="/dealer/membership"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Dealer Membership</span>
                    </Link>

                    <Link
                      to="/news"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">News & Blogs</span>
                    </Link>

                    <Link
                      to="/writer/dashboard"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Writer Dashboard</span>
                    </Link>

                    <MenuSection label="Admin" />

                    <Link
                      to="/admin"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Admin Review</span>
                    </Link>

                    <Link
                      to="/admin/editorial"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Editorial Review</span>
                    </Link>

                    <Link
                      to="/admin/auctions"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Auction Control</span>
                    </Link>

                    <Link
                      to="/community/moderation"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <span className="font-medium">Forum Moderation</span>
                    </Link>

                    {/* Log In */}
                    <Link 
                      to="/login" 
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      <span className="font-medium">Log In</span>
                    </Link>

                    {/* Sign Up (Corrected Link) */}
                    <Link 
                      to="/signup" 
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-slate-600 hover:text-blue-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span className="font-medium">Sign Up</span>
                    </Link>
                    
                  </div>
                </div>
              </>
            )}
          </div>
          
        </div>
      </div>

      {showMobileMenu && (
        <div className="xl:hidden fixed inset-x-0 top-[68px] sm:top-[96px] z-40 bg-white border-y border-slate-200 shadow-xl max-h-[calc(100vh-68px)] sm:max-h-[calc(100vh-96px)] overflow-y-auto mobile-scroll-lock">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 font-bold text-slate-700">
            {[
              ['Home', '/'],
              ['Marketplace', '/listings'],
              ['Buy Car', '/buy-car'],
              ['Sell Car', '/sell-car'],
              ['Auctions', '/auctions'],
              ['Services Near Me', '/repair-shops'],
              ...repairShopCategories.map((category) => [`- ${category.label}`, `/repair-shops?category=${category.id}`]),
              ['Accessories', '/accessories'],
              [`Cart${cartCount ? ` (${cartCount})` : ''}`, '/accessory-cart'],
              ['My Garage', '/garage'],
              ['Orders', '/orders'],
              ['Communities', '/communities'],
              ['News', '/news'],
              ['Trust Center', '/trust'],
              ['Wishlist', '/wishlist'],
              ['Rankings', '/rankings'],
              ['FAQ', '/faq'],
              ['Auction Rules', '/auction-rules'],
              ['Privacy Policy', '/privacy-policy'],
              ['Wallet', '/wallet'],
              ['Seller', '/seller/dashboard'],
              ['Admin', '/admin'],
              ['Settings', '/settings'],
              ['Privacy', '/privacy'],
              ['Suggest Feature', '/feature-suggestions'],
            ].map(([label, to]) => (
              <Link key={to} to={to} onClick={() => setShowMobileMenu(false)} className="bg-slate-50 rounded-lg px-3 py-3 min-h-12 flex items-center">
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 text-[11px] font-black text-slate-600">
          {[
            ['Home', '/'],
            ['Buy', '/buy-car'],
            ['Auctions', '/auctions'],
            ['Garage', '/garage'],
            ['Me', '/buyer/dashboard'],
          ].map(([label, to]) => (
            <Link key={to} to={to} aria-current={location.pathname === to ? 'page' : undefined} className={`py-2 text-center min-h-12 ${location.pathname === to ? 'text-blue-600' : ''}`}>
              <span className="block text-xs leading-none">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Sell Modal Logic (unchanged) */}
      {showSellModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black bg-opacity-60 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowSellModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sell-modal-title"
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up relative"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 id="sell-modal-title" className="text-xl font-black text-slate-900">How do you want to sell?</h3>
              <button ref={closeSellRef} aria-label="Close sell options" onClick={() => setShowSellModal(false)} className="text-slate-500 hover:text-red-500 font-black leading-none">Close</button>
            </div>
            <div className="p-8 grid gap-4">
              <button onClick={() => { setShowSellModal(false); navigate('/sell/listing'); }} className="group flex items-center p-4 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-full mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div><h4 className="font-bold text-slate-900 group-hover:text-blue-700 text-lg">Post an Ad</h4><p className="text-sm text-slate-500">Create a listing and sell at your own price.</p></div>
              </button>
              <button onClick={() => { setShowSellModal(false); navigate('/sell/auction'); }} className="group flex items-center p-4 border-2 border-slate-100 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all text-left">
                <div className="bg-red-100 text-red-600 p-3 rounded-full mr-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.5 2.5l5 5m-9 9l-4 4m0-12l12 12" /></svg>
                </div>
                <div><h4 className="font-bold text-slate-900 group-hover:text-red-700 text-lg">Sell via Auction</h4><p className="text-sm text-slate-500">Get the best bid quickly through live auctions.</p></div>
              </button>
              <button onClick={() => { setShowSellModal(false); navigate('/sell/accessory'); }} className="group flex items-center p-4 border-2 border-slate-100 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left">
                <div className="bg-emerald-100 text-emerald-700 p-3 rounded-full mr-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <div><h4 className="font-bold text-slate-900 group-hover:text-emerald-700 text-lg">Sell Accessory</h4><p className="text-sm text-slate-500">List parts, upgrades, and fitment-aware accessories.</p></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const serviceHelpText = {
  workshops: 'Mechanics, diagnostics, engine, suspension',
  'oil-change': 'Oil, filters, fluids, quick service',
  'car-wash': 'Washing, detailing, ceramic, interior',
  dealerships: 'Dealers, trade-ins, verified showrooms',
  'rent-a-car': 'Daily rentals, chauffeur, self-drive',
  'sell-a-car': 'Consignment, trade-in, selling help',
  tyres: 'Tyres, wheels, alignment, balancing',
  inspection: 'Pre-bid checks and diagnostics',
  towing: 'Roadside help and recovery',
};

const popularServiceLinks = {
  'Oil change near me': 'oil-change',
  'Pre-bid inspection': 'inspection',
  'Best car wash': 'car-wash',
  'Verified mechanic': 'workshops',
  'Tyre alignment': 'tyres',
};

const menuAlignClass = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-0',
  end: 'right-0',
};

const menuGridClass = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

const MegaMenu = ({ children, width, align = 'center', columns = 3, onLeave }) => (
  <div
    onMouseLeave={onLeave}
    className={`absolute top-full z-50 mt-4 ${width} max-w-[calc(100vw-32px)] ${menuAlignClass[align]} max-h-[calc(100vh-120px)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-950/5`}
    role="menu"
  >
    <div className={`grid ${menuGridClass[columns] || menuGridClass[3]} divide-x divide-slate-200`}>
      {children}
    </div>
  </div>
);

const MenuSection = ({ label }) => (
  <p className="border-t border-slate-100 px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
    {label}
  </p>
);

const MegaColumn = ({ title, items, onClick }) => (
  <div className="min-w-0 p-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
    <div className="mt-3 space-y-1.5">
      {items.map(([label, to, helper]) => (
        <Link key={label} to={to} onClick={onClick} className="block rounded-md px-2 py-2 group hover:bg-slate-50" role="menuitem">
          <span className="block truncate text-sm font-black text-slate-900 group-hover:text-blue-700">{label}</span>
          <span className="mt-0.5 block text-[11px] leading-4 font-bold text-slate-500">{helper}</span>
        </Link>
      ))}
    </div>
  </div>
);

export default Navbar;

