import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';

// Import Components
import Navbar from './components/Navbar';
import LogoLoader from './components/LogoLoader';
import ProtectedRoute from './components/ProtectedRoute';
import ChatbotWidget from './components/ChatbotWidget';
import Home from './pages/Home';
import Login from './components/Login'; 
import SellCarListing from './components/SellCarListing'; 
import PaymentDashboard from './components/PaymentDashboard';
import CarDetails from './components/CarDetails'; // <--- IMPORT THE NEW FILE
import Marketplace from './pages/Marketplace';
import AuctionHub from './pages/AuctionHub';
import SellAuction from './pages/SellAuction';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Recommendations from './pages/Recommendations';
import Community from './pages/Community';
import CommunityPost from './pages/CommunityPost';
import CommunityModeration from './pages/CommunityModeration';
import Faq from './pages/Faq';
import BuyerDashboard from './pages/BuyerDashboard';
import Notifications from './pages/Notifications';
import Compare from './pages/Compare';
import Messages from './pages/Messages';
import UserProfile from './pages/UserProfile';
import DealerProfile from './pages/DealerProfile';
import InspectionReport from './pages/InspectionReport';
import AuctionCheckout from './pages/AuctionCheckout';
import AdminAuctions from './pages/AdminAuctions';
import Accessories from './pages/Accessories';
import AccessoryDetails from './pages/AccessoryDetails';
import AccessoryCart from './pages/AccessoryCart';
import MyGarage from './pages/MyGarage';
import MediaCenter from './pages/MediaCenter';
import SellAccessory from './pages/SellAccessory';
import Orders from './pages/Orders';
import InspectionBooking from './pages/InspectionBooking';
import AccountSettings from './pages/AccountSettings';
import AdminBidAudit from './pages/AdminBidAudit';
import ModelCommunity from './pages/ModelCommunity';
import DealerMembership from './pages/DealerMembership';
import Rankings from './pages/Rankings';
import Installments from './pages/Installments';
import RepairShops from './pages/RepairShops';
import News from './pages/News';
import ArticleDetails from './pages/ArticleDetails';
import WriterDashboard from './pages/WriterDashboard';
import AdminEditorial from './pages/AdminEditorial';
import PrivacyCenter from './pages/PrivacyCenter';
import Wishlist from './pages/Wishlist';
import FeatureSuggestions from './pages/FeatureSuggestions';
import TrustCenter from './pages/TrustCenter';
import PolicyPage from './pages/PolicyPage';

function App() {
  const forceIntro = new URLSearchParams(window.location.search).has('intro-preview');
  const [showIntro, setShowIntro] = useState(() => forceIntro || !window.sessionStorage.getItem('wd_intro_seen'));

  useEffect(() => {
    if (!showIntro) return undefined;
    if (forceIntro) return undefined;
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem('wd_intro_seen', 'true');
      setShowIntro(false);
    }, 1900);
    return () => window.clearTimeout(timer);
  }, [forceIntro, showIntro]);

  return (
    <div className="App">
      {showIntro && <LogoLoader fullScreen preview={forceIntro} label="Starting Wheels and Deals" />}
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar />

      <div id="main-content" tabIndex="-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/listings" element={<Marketplace />} />
          <Route path="/buy-car" element={<Marketplace />} />
          <Route path="/accessories" element={<Accessories />} />
          <Route path="/accessories/:id" element={<AccessoryDetails />} />
          <Route path="/accessory-cart" element={<AccessoryCart />} />
          <Route
            path="/garage"
            element={(
              <ProtectedRoute title="Sign in to open My Garage" description="Garage history, owned vehicles, and saved service records are tied to your account.">
                <MyGarage />
              </ProtectedRoute>
            )}
          />
          <Route path="/auctions" element={<AuctionHub />} />
          <Route path="/installments" element={<Installments />} />
          <Route path="/repair-shops" element={<RepairShops />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route
            path="/buyer/dashboard"
            element={(
              <ProtectedRoute title="Sign in to view your dashboard" description="Your dashboard includes bids, garage activity, saved cars, and account-side recommendations.">
                <BuyerDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/orders"
            element={(
              <ProtectedRoute title="Sign in to view orders" description="Order history, auction wins, and accessory purchases stay private to your account.">
                <Orders />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/notifications"
            element={(
              <ProtectedRoute title="Sign in to view notifications" description="Bid alerts, KYC updates, and payment notices are only available for signed-in accounts.">
                <Notifications />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/compare"
            element={(
              <ProtectedRoute title="Sign in to compare your saved vehicles" description="Comparison boards are stored per account so you can return to them later.">
                <Compare />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/messages"
            element={(
              <ProtectedRoute title="Sign in to view messages" description="Buyer, seller, and support messages are only visible inside your account.">
                <Messages />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/profile"
            element={(
              <ProtectedRoute title="Sign in to manage your profile" description="Your profile, trust status, and public activity settings live behind your account session.">
                <UserProfile />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/settings"
            element={(
              <ProtectedRoute title="Sign in to access account settings" description="Security, privacy, KYC, and payment setup are only available after account sign-in.">
                <AccountSettings />
              </ProtectedRoute>
            )}
          />
          <Route path="/dealer/:name" element={<DealerProfile />} />
          <Route
            path="/dealer/membership"
            element={(
              <ProtectedRoute allowedRoles={['seller', 'dealer', 'admin', 'super_admin']} title="Seller or dealer access required" description="Dealer membership and inventory tools are reserved for seller-side accounts.">
                <DealerMembership />
              </ProtectedRoute>
            )}
          />
          <Route path="/inspection/:id" element={<InspectionReport />} />
          <Route
            path="/inspection/book/:id"
            element={(
              <ProtectedRoute title="Sign in to book an inspection" description="Inspection bookings need a signed-in account so the seller, buyer, and admin team can track the request.">
                <InspectionBooking />
              </ProtectedRoute>
            )}
          />
          <Route path="/community" element={<Community />} />
          <Route path="/communities" element={<Community />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:slug" element={<ArticleDetails />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/community/post/:id" element={<CommunityPost />} />
          <Route path="/community/model/:make/:model" element={<ModelCommunity />} />
          <Route
            path="/community/moderation"
            element={(
              <ProtectedRoute allowedRoles={['moderator', 'admin', 'super_admin']} title="Moderator access required" description="Community moderation tools are limited to moderation and admin accounts.">
                <CommunityModeration />
              </ProtectedRoute>
            )}
          />
          <Route path="/faq" element={<Faq />} />
          <Route path="/trust" element={<TrustCenter />} />
          <Route path="/terms" element={<PolicyPage />} />
          <Route path="/privacy-policy" element={<PolicyPage />} />
          <Route path="/auction-rules" element={<PolicyPage />} />
          <Route path="/buyer-protection" element={<PolicyPage />} />
          <Route path="/kyc-policy" element={<PolicyPage />} />
          <Route path="/policies/:slug" element={<PolicyPage />} />
          <Route
            path="/wishlist"
            element={(
              <ProtectedRoute title="Sign in to use your wishlist" description="Saved cars, saved auctions, and saved accessories are personal account data.">
                <Wishlist />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/privacy"
            element={(
              <ProtectedRoute title="Sign in to control privacy settings" description="Privacy and visibility rules belong to your signed-in account.">
                <PrivacyCenter />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/feature-suggestions"
            element={(
              <ProtectedRoute title="Sign in to submit platform feedback" description="We tie feature requests to verified users so product and ops teams can follow up safely.">
                <FeatureSuggestions />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/sell/listing"
            element={(
              <ProtectedRoute allowedRoles={['seller', 'dealer', 'admin', 'super_admin']} title="Seller access required" description="Fixed-price vehicle listings require a seller or dealer account.">
                <SellCarListing />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/sell-car"
            element={(
              <ProtectedRoute allowedRoles={['seller', 'dealer', 'admin', 'super_admin']} title="Seller access required" description="Selling tools are limited to seller and dealer accounts.">
                <SellCarListing />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/sell/auction"
            element={(
              <ProtectedRoute allowedRoles={['seller', 'dealer', 'admin', 'super_admin']} title="Seller access required" description="Auction submission tools are only available to seller-side accounts.">
                <SellAuction />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/sell/accessory"
            element={(
              <ProtectedRoute allowedRoles={['seller', 'dealer', 'admin', 'super_admin']} title="Seller access required" description="Accessory selling tools are reserved for seller and dealer accounts.">
                <SellAccessory />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/seller/dashboard"
            element={(
              <ProtectedRoute allowedRoles={['seller', 'dealer', 'admin', 'super_admin']} title="Seller dashboard access required" description="Inventory, payouts, listing drafts, and order flows live behind seller-side access.">
                <SellerDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/seller/media"
            element={(
              <ProtectedRoute allowedRoles={['seller', 'dealer', 'admin', 'super_admin', 'moderator']} title="Seller or moderation access required" description="The media center handles listing and review assets for seller and moderation workflows.">
                <MediaCenter />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/writer/dashboard"
            element={(
              <ProtectedRoute allowedRoles={['writer', 'verified_writer', 'editor', 'admin', 'super_admin']} title="Writer access required" description="Editorial drafting is limited to verified writer, editor, and admin accounts.">
                <WriterDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin"
            element={(
              <ProtectedRoute allowedRoles={['admin', 'super_admin']} title="Admin access required" description="Operations queues, trust reviews, and fraud controls are limited to admin sessions.">
                <AdminDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/editorial"
            element={(
              <ProtectedRoute allowedRoles={['editor', 'admin', 'super_admin']} title="Editorial desk access required" description="Publishing and editorial review controls are limited to editors and admins.">
                <AdminEditorial />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/auctions"
            element={(
              <ProtectedRoute allowedRoles={['admin', 'super_admin']} title="Admin access required" description="Auction operations, interventions, and review tools are reserved for admin sessions.">
                <AdminAuctions />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/auctions/:id/bids"
            element={(
              <ProtectedRoute allowedRoles={['admin', 'super_admin']} title="Admin access required" description="Bid audit trails and suspicious-activity reviews are only visible to admin sessions.">
                <AdminBidAudit />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/wallet"
            element={(
              <ProtectedRoute title="Sign in to access wallet and deposits" description="Deposits, holds, and payout-related balances are private account data.">
                <PaymentDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/checkout/:id"
            element={(
              <ProtectedRoute title="Sign in to continue auction checkout" description="Auction settlement, payment proof, and disputes are only available inside your signed-in account.">
                <AuctionCheckout />
              </ProtectedRoute>
            )}
          />
          <Route path="/listing/:id" element={<CarDetails />} />
        </Routes>
      </div>
      <ChatbotWidget />
    </div>
  );
}

export default App;
