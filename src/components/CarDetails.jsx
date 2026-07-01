import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const CarDetails = () => {
  const { id } = useParams();
  const {
    getCar,
    placeBid,
    deposit,
    wallet,
    availableWallet,
    getRequiredDeposit,
    trackView,
    toggleWatchlist,
    watchlist,
    recommendedCars,
    posts,
    toggleCompare,
    compareIds,
    sendMessage,
    checkoutAuction,
    releaseDepositLock,
    getAccessoriesForCar,
    subscribeToAuctionRoom,
    realtimeStatus,
    authUser,
    verification,
  } = useAuctions();
  const car = getCar(id);
  const [mainImage, setMainImage] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [activeTab, setActiveTab] = useState('bids');
  const [bidMessage, setBidMessage] = useState('');
  const [confirmBid, setConfirmBid] = useState(null);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [auctionRoomStatus, setAuctionRoomStatus] = useState('offline');

  useEffect(() => {
    if (car) setMainImage(car.images[0]);
  }, [car]);

  useEffect(() => {
    if (car) trackView(car.id);
  }, [car?.id]);

  useEffect(() => {
    if (!car || car.listingType !== 'Auction') return undefined;
    const stream = subscribeToAuctionRoom(car.id, { onStatus: setAuctionRoomStatus });
    return () => stream?.close?.();
  }, [car?.id, car?.listingType]);

  if (!car) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md">
          <h1 className="text-2xl font-black text-slate-900">Car not found</h1>
          <p className="text-slate-500 mt-2">The listing may have expired, sold, or never existed.</p>
          <Link to="/listings" className="inline-block mt-5 bg-slate-900 text-white px-5 py-3 rounded-lg font-bold">
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  const isAuction = car.listingType === 'Auction';
  const minimumBid = isAuction ? car.highBid + (car.bidIncrement || 0) : 0;
  const selectedBidAmount = Number(bidAmount) || minimumBid;
  const requiredDeposit = isAuction ? getRequiredDeposit(selectedBidAmount) : 0;
  const hasEnoughDeposit = availableWallet >= requiredDeposit;
  const isUserHighBidder = isAuction && car.lastBidder === 'You';
  const bidStep = car.bidIncrement || 50000;
  const isWatched = watchlist.includes(car.id);
  const similarCars = recommendedCars.filter((item) => item.id !== car.id).slice(0, 3);
  const linkedPosts = posts.filter((post) => post.listingId === car.id).slice(0, 3);
  const isCompared = compareIds.includes(car.id);
  const fittingAccessories = getAccessoriesForCar(car.id);
  const displayedPrice = isAuction ? selectedBidAmount : car.buyNowPrice;
  const platformFee = Math.round((displayedPrice || 0) * (isAuction ? 0.01 : 0.005));
  const documentationFee = isAuction ? 25000 : 12000;
  const inspectionReserve = isAuction ? 0 : 12000;
  const allInEstimate = (displayedPrice || 0) + platformFee + documentationFee + inspectionReserve;
  const isDealerListing = String(car.sellerType || '').toLowerCase().includes('dealer');

  const handleBid = () => {
    if (car.status === 'Ended') {
      setBidMessage('This auction has ended.');
      return;
    }
    if (!selectedBidAmount || selectedBidAmount < minimumBid) {
      setBidMessage(`Minimum next bid is ${formatPkr(minimumBid)}.`);
      return;
    }
    if (isUserHighBidder) {
      setBidMessage('You are already the highest bidder.');
      return;
    }
    if (!hasEnoughDeposit) {
      setBidMessage(`Add ${formatPkr(requiredDeposit - availableWallet)} more to your wallet deposit before bidding.`);
      return;
    }
    setConfirmBid(selectedBidAmount);
  };

  const submitConfirmedBid = async () => {
    setIsSubmittingBid(true);
    const result = await placeBid(car.id, confirmBid);
    setIsSubmittingBid(false);
    setBidMessage(result.message);
    if (result.ok) {
      setBidAmount('');
      setConfirmBid(null);
    }
  };

  const setQuickBid = (multiplier) => {
    setBidAmount(String(minimumBid + bidStep * multiplier));
    setBidMessage('');
  };

  const handleQuickDeposit = async () => {
    const neededAmount = Math.max(0, requiredDeposit - availableWallet);
    const result = await deposit(neededAmount || requiredDeposit);
    setBidMessage(result.message);
  };

  const handleCheckout = () => {
    const result = checkoutAuction(car.id);
    setBidMessage(result.message);
  };

  const handleReleaseLock = () => {
    const result = releaseDepositLock(car.id);
    setBidMessage(result.message);
  };

  return (
    <main className="bg-gray-100 min-h-screen pb-28 lg:pb-12 font-sans">
      <div className="bg-zinc-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 md:gap-8 items-center text-xs md:text-base">
          <StatusMetric label={isAuction ? 'Time Left' : 'Status'} value={isAuction ? car.timeLeft : car.status} highlight />
          <StatusMetric label={isAuction ? 'High Bid' : 'Price'} value={isAuction ? formatPkr(car.highBid) : formatPkr(car.buyNowPrice)} />
          {isAuction && <StatusMetric label="Viewing" value={`${Number(car.spectators || 0).toLocaleString()} live`} />}
          {isAuction && <StatusMetric label="Room" value={auctionRoomStatus === 'connected' ? 'Live socket' : realtimeStatus} />}
          <StatusMetric label="Deal Score" value={car.dealScore} />
          <StatusMetric label="Trust" value={car.trustScore} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {isDealerListing && (
                <Link to={`/dealer/${encodeURIComponent(car.seller)}`} className="bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-full px-3 py-1 text-xs font-black">
                  VERIFIED DEALER
                </Link>
              )}
              {car.tags.map((tag) => (
                <span key={tag} className="bg-white border border-slate-200 text-slate-700 rounded-full px-3 py-1 text-xs font-black">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{car.year} {car.make} {car.model}</h1>
            <p className="text-gray-500 mt-1 text-lg">{car.variant} - {car.transmission} - {car.mileage}</p>
          </div>

          <div className="bg-white p-2 rounded-lg border border-gray-300 shadow-sm">
            <div className="aspect-video bg-black rounded overflow-hidden mb-2">
              <img src={mainImage || car.images[0]} alt={car.name} className="w-full h-full object-contain" />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {car.images.map((img, index) => (
                <button key={img} onClick={() => setMainImage(img)} aria-label={`Show image ${index + 1} for ${car.name}`} aria-pressed={mainImage === img} className="flex-shrink-0">
                  <img
                    src={img}
                    alt={`${car.name} thumbnail ${index + 1}`}
                    className={`w-20 h-14 object-cover rounded border-2 ${mainImage === img ? 'border-red-600' : 'border-transparent'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded border border-gray-300 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
              <SpecRow label="Make" value={car.make} />
              <SpecRow label="Model" value={car.model} />
              <SpecRow label="Variant" value={car.variant} />
              <SpecRow label="Mileage" value={car.mileage} />
              <SpecRow label="VIN" value={car.vin} />
              <SpecRow label="Title Status" value={car.titleStatus} />
              <SpecRow label="Location" value={car.location} />
              <SpecRow label="Seller" value={car.seller} isLink />
              <SpecRow label="Dealer Status" value={isDealerListing ? 'Verified monthly member' : 'Private seller'} />
              <SpecRow label="Market Estimate" value={formatPkr(car.marketEstimate)} />
              <SpecRow label="Inspection Score" value={car.inspectionScore} />
            </div>
          </div>

          <SectionList title="Highlights" items={car.highlights} />
          <SectionList title="Equipment" items={car.equipment} />
          <SectionList title="Modifications" items={car.modifications} />
          <SectionList title="Known Flaws" items={car.knownFlaws} />
          <SectionList title="Recent Service History" items={car.serviceHistory} />
          <SectionList title="Other Items Included in Sale" items={car.includedItems} />

          <div className="bg-white rounded border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Trust and Buyer Protection</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TrustCard title="Seller identity" value={car.sellerType || 'Verified seller'} text="Shown before bidding so users are not trusting anonymous posts." />
              <TrustCard title="Inspection proof" value={`${car.inspectionScore || 0}/100`} text="Attach photos, checklist, and mechanic notes before final checkout." />
              <TrustCard title="Price transparency" value="All-in estimate" text="Mandatory fees are shown before bid/contact to avoid surprise pricing." />
            </div>
          </div>

          <TextSection title="Ownership History" text={car.ownershipHistory || 'Information not provided.'} />
          <TextSection title="Seller Notes" text={car.sellerNotes || 'No notes provided.'} />

          {car.videos?.length > 0 && (
            <div className="bg-white p-6 rounded border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Videos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {car.videos.map((videoUrl) => (
                  <div key={videoUrl} className="aspect-video bg-black rounded overflow-hidden shadow-sm border border-gray-200">
                    <video src={videoUrl} controls className="w-full h-full object-cover" preload="metadata">
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ))}
              </div>
            </div>
          )}

          {car.qa?.length > 0 && (
            <div className="border-t border-gray-200 pt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Seller Q&A ({car.qa.length})</h3>
                <button className="text-green-600 font-bold hover:underline">Ask a question</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {car.qa.map((qa) => (
                  <div key={qa.question} className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full" />
                      <span className="font-bold text-sm text-gray-900">{qa.user}</span>
                    </div>
                    <p className="font-bold text-gray-900 mb-3">Q: {qa.question}</p>
                    <div className="flex items-start gap-2 border-t pt-3">
                      <span className="font-bold text-green-600 text-sm">Seller</span>
                      <p className="text-gray-600 text-sm">A: {qa.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 bg-white rounded border border-gray-200 overflow-hidden shadow-sm" id="bids-section">
            <div className="flex border-b border-gray-200 bg-gray-50">
              <TabButton active={activeTab === 'bids'} onClick={() => setActiveTab('bids')}>
                Bid History ({car.bidHistory.length})
              </TabButton>
              <TabButton active={activeTab === 'comments'} onClick={() => setActiveTab('comments')}>
                Comments ({car.comments.length})
              </TabButton>
            </div>

            <div className="p-0 max-h-96 overflow-y-auto">
              {activeTab === 'bids' ? <BidTable bids={car.bidHistory} /> : <Comments comments={car.comments} />}
            </div>
          </div>

          <div className="bg-white rounded border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Community Discussion</h3>
                <p className="text-sm text-gray-500">Ask for price checks, inspection opinions, or auction strategy.</p>
              </div>
              <Link to="/community" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm text-center">
                Ask Community
              </Link>
            </div>
            {linkedPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {linkedPosts.map((post) => (
                  <Link key={post.id} to={`/community/post/${post.id}`} className="border border-slate-100 rounded-lg p-3 hover:border-blue-400">
                    <p className="font-black text-slate-900 text-sm line-clamp-2">{post.title}</p>
                    <p className="text-xs text-slate-500 mt-2">{post.votes} votes - {post.comments.length} comments</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-4">
                No community posts are linked to this listing yet.
              </p>
            )}
          </div>

          {fittingAccessories.length > 0 && (
            <div className="bg-white rounded border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Accessories That Fit</h3>
                  <p className="text-sm text-gray-500">Compatible upgrades and essentials for this vehicle.</p>
                </div>
                <Link to="/accessories" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm text-center">
                  Shop Accessories
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {fittingAccessories.map((item) => (
                  <Link key={item.id} to={`/accessories/${item.id}`} className="border border-slate-100 rounded-lg p-3 hover:border-emerald-400">
                    <img src={item.image} alt={item.name} className="w-full h-24 object-cover rounded bg-slate-100 mb-3" />
                    <p className="font-black text-slate-900 text-sm line-clamp-2">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-2">{formatPkr(item.price)} - {item.category}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div id="auction-bid-panel" className="bg-white p-5 rounded-lg shadow-lg border border-gray-200 lg:sticky lg:top-24 scroll-mt-24">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 font-bold uppercase">{isAuction ? 'Current Bid' : 'Asking Price'}</p>
              <p className="text-3xl font-black text-gray-900 my-2">
                {isAuction ? formatPkr(car.highBid) : formatPkr(car.buyNowPrice)}
              </p>
              <p className="text-xs text-gray-400">
                {isAuction ? `${car.bidsCount} bids placed - ${car.watchers} watchers` : `${car.watchers} people watching`}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-black text-emerald-900">All-in estimate</span>
                <span className="font-black text-emerald-900">{formatPkr(allInEstimate)}</span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-emerald-800">
                <div className="flex justify-between gap-2"><span>{isAuction ? 'Selected bid' : 'Vehicle price'}</span><span>{formatPkr(displayedPrice || 0)}</span></div>
                <div className="flex justify-between gap-2"><span>Platform/service fee</span><span>{formatPkr(platformFee)}</span></div>
                <div className="flex justify-between gap-2"><span>Documentation support</span><span>{formatPkr(documentationFee)}</span></div>
                {!isAuction && <div className="flex justify-between gap-2"><span>Inspection reserve</span><span>{formatPkr(inspectionReserve)}</span></div>}
              </div>
              <p className="mt-2 text-xs font-bold text-emerald-900">Estimate only. Final taxes, transfer, delivery, and bank fees must be confirmed before payment.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <MiniScore label="Deal" value={car.dealScore} />
              <MiniScore label="Trust" value={car.trustScore} />
              <MiniScore label={isAuction ? 'Heat' : 'Inspect'} value={isAuction ? car.auctionHeat : car.inspectionScore} />
            </div>

            <button
              onClick={() => toggleWatchlist(car.id)}
              className={`w-full mb-3 font-bold py-3 rounded border ${
                isWatched ? 'bg-red-600 text-white border-red-600' : 'border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              {isWatched ? 'Watching This Car' : 'Add to Watchlist'}
            </button>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => toggleCompare(car.id)}
                className={`font-bold py-3 rounded border ${isCompared ? 'bg-blue-600 text-white border-blue-600' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}
              >
                {isCompared ? 'Compared' : 'Compare'}
              </button>
              <Link to={`/inspection/${car.id}`} className="text-center font-bold py-3 rounded border border-green-200 text-green-700 hover:bg-green-50">
                Inspection
              </Link>
            </div>

            <Link to={`/inspection/book/${car.id}`} className="block text-center w-full mb-3 font-bold py-3 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              Book Inspection
            </Link>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => sendMessage(car.id, `Hi, I am interested in ${car.name}.`)}
                className="font-bold py-3 rounded border border-slate-300 text-slate-800 hover:bg-slate-50"
              >
                Message Seller
              </button>
              <Link to={`/dealer/${encodeURIComponent(car.seller)}`} className="text-center font-bold py-3 rounded border border-slate-300 text-slate-800 hover:bg-slate-50">
                Seller Profile
              </Link>
            </div>

            {isAuction ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm">
                  <p className="font-black text-blue-900">Bid access status</p>
                  <p className="mt-2 font-bold text-slate-700">
                    {authUser
                      ? `Signed in as ${authUser.email}. Verification level: ${verification?.verificationLevel || 'registered'}.`
                      : 'Sign in before placing bids or locking auction deposits.'}
                  </p>
                  <p className="mt-1 font-bold text-slate-600">
                    Live bidding now checks account eligibility before the bid reaches the auction room.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link to={authUser ? '/settings' : '/login'} className="rounded-lg bg-slate-900 px-4 py-2 text-white font-black">
                      {authUser ? 'Open trust settings' : 'Sign in'}
                    </Link>
                    <Link to="/wallet" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 font-black">
                      Deposit wallet
                    </Link>
                  </div>
                </div>
                <BidSignalPanel
                  car={car}
                  minimumBid={minimumBid}
                  selectedBidAmount={selectedBidAmount}
                  requiredDeposit={requiredDeposit}
                  hasEnoughDeposit={hasEnoughDeposit}
                  isUserHighBidder={isUserHighBidder}
                />
                <div className={`rounded-lg border p-3 text-sm ${car.status === 'Ended' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-600 font-bold">Auction state</span>
                    <span className="font-black text-slate-900">{car.outcomeLabel}</span>
                  </div>
                  <div className="flex justify-between gap-3 mt-1">
                    <span className="text-slate-600 font-bold">Reserve</span>
                    <span className="font-black text-slate-900">{formatPkr(car.reservePrice)}</span>
                  </div>
                  {car.status === 'Ended' && car.userIsWinner && (
                    <p className="mt-2 text-green-700 font-bold">You are the winning bidder. Start checkout to move to payment and title transfer.</p>
                  )}
                  {car.status === 'Ended' && !car.winner && (
                    <p className="mt-2 text-amber-700 font-bold">Auction ended without meeting reserve. The seller can reopen or negotiate.</p>
                  )}
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Wallet balance</span>
                    <span className="font-black text-slate-900">{formatPkr(wallet.balance)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500 font-bold">Available to lock</span>
                    <span className="font-black text-slate-900">{formatPkr(availableWallet)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500 font-bold">Required for this bid</span>
                    <span className="font-black text-slate-900">{formatPkr(requiredDeposit)}</span>
                  </div>
                </div>
                {car.status === 'Ended' ? (
                  <div className="space-y-2">
                    {car.userIsWinner && (
                      <>
                        <button onClick={handleCheckout} className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 shadow-sm text-lg">
                          {car.checkedOut ? 'Checkout Started' : 'Start Checkout'}
                        </button>
                        <Link to={`/checkout/${car.id}`} className="block text-center border border-green-500 text-green-700 font-bold py-3 rounded hover:bg-green-50">
                          Open Checkout Room
                        </Link>
                      </>
                    )}
                    <button onClick={handleReleaseLock} className="w-full border border-slate-300 text-slate-800 font-bold py-3 rounded hover:bg-slate-50">
                      Release Deposit Hold
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 1, 2].map((multiplier) => (
                        <button
                          key={multiplier}
                          onClick={() => setQuickBid(multiplier)}
                          className="border border-slate-200 rounded-lg py-2 text-xs font-black text-slate-700 hover:border-green-500 hover:text-green-700"
                        >
                          {multiplier === 0 ? 'Minimum' : `+${formatPkr(bidStep * multiplier).replace('PKR ', '')}`}
                        </button>
                      ))}
                    </div>
                    <input
                      aria-label="Bid amount"
                      type="number"
                      value={bidAmount}
                      onChange={(event) => setBidAmount(event.target.value)}
                      min={minimumBid}
                      step={bidStep}
                      className="w-full p-3 border border-gray-300 rounded font-bold text-center"
                      placeholder={`Minimum ${formatPkr(minimumBid)}`}
                    />
                    <button onClick={handleBid} disabled={isUserHighBidder || !hasEnoughDeposit} className="w-full bg-green-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-3 rounded hover:bg-green-600 shadow-sm text-lg">
                      {isUserHighBidder ? 'You Are Highest Bidder' : 'Review Bid'}
                    </button>
                  </>
                )}
                {availableWallet < requiredDeposit && car.status !== 'Ended' && (
                  <button onClick={handleQuickDeposit} className="w-full border border-green-500 text-green-700 font-bold py-3 rounded hover:bg-green-50">
                    Add Required Deposit
                  </button>
                )}
                {bidMessage && <p role="status" aria-live="polite" className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">{bidMessage}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <button className="w-full bg-slate-900 text-white font-bold py-3 rounded hover:bg-slate-800 shadow-sm text-lg">
                  Contact Seller
                </button>
                <button className="w-full border border-slate-300 text-slate-800 font-bold py-3 rounded hover:bg-slate-50">
                  Make Offer
                </button>
              </div>
            )}
          </div>

          {similarCars.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="font-black text-slate-900 mb-3">Recommended next</h3>
              <div className="space-y-3">
                {similarCars.map((item) => (
                  <Link key={item.id} to={`/listing/${item.id}`} className="block border border-slate-100 rounded-lg p-3 hover:border-blue-400">
                    <p className="font-black text-sm text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-1">Match {item.matchScore}/100 - {item.city}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
      {isAuction && (
        <div className="lg:hidden fixed inset-x-0 bottom-16 z-40 bg-white border-t border-slate-200 shadow-2xl p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400">High bid</p>
              <p className="font-black text-slate-900">{formatPkr(car.highBid)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-black text-slate-400">Ends</p>
              <p className="font-black text-red-600">{car.timeLeft}</p>
            </div>
          </div>
          {car.status === 'Ended' && car.userIsWinner ? (
            <Link to={`/checkout/${car.id}`} className="block text-center bg-green-600 text-white rounded-lg py-3 font-black">
              Open Checkout
            </Link>
          ) : (
            <button onClick={() => document.getElementById('auction-bid-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="w-full bg-slate-900 text-white rounded-lg py-3 font-black">
              Bid or Add Deposit
            </button>
          )}
        </div>
      )}
      {confirmBid && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-bid-title">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <p className="text-xs font-black uppercase tracking-wide text-red-600">Confirm bid</p>
            <h2 id="confirm-bid-title" className="text-2xl font-black text-slate-900 mt-1">{formatPkr(confirmBid)}</h2>
            <p className="text-sm text-slate-500 mt-2">
              This will lock a demo deposit of {formatPkr(getRequiredDeposit(confirmBid))}. If another bidder beats you, the hold can be released.
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm mt-4 space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Current high bid</span>
                <span className="font-black text-slate-900">{formatPkr(car.highBid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Reserve state</span>
                <span className="font-black text-slate-900">{confirmBid >= car.reservePrice ? 'Will meet reserve' : 'Below reserve'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">All-in estimate</span>
                <span className="font-black text-slate-900">{formatPkr(confirmBid + Math.round(confirmBid * 0.01) + documentationFee)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => setConfirmBid(null)} className="border border-slate-300 text-slate-800 font-bold py-3 rounded hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={submitConfirmedBid} disabled={isSubmittingBid} className="bg-green-600 disabled:bg-slate-300 text-white font-bold py-3 rounded hover:bg-green-700">
                {isSubmittingBid ? 'Submitting...' : 'Confirm Bid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

const StatusMetric = ({ label, value, highlight }) => (
  <div className="flex items-center gap-2">
    <span className="text-gray-400">{label}:</span>
    <span className={`font-black ${highlight ? 'text-yellow-500' : 'text-white'}`}>{value}</span>
  </div>
);

const SpecRow = ({ label, value, isLink }) => (
  <div className="flex flex-col sm:flex-row border-b border-gray-100 last:border-0">
    <div className="sm:w-1/3 bg-gray-50 p-3 font-semibold text-gray-600">{label}</div>
    <div className={`sm:w-2/3 p-3 text-gray-900 font-medium break-words ${isLink ? 'text-blue-600 cursor-pointer hover:underline' : ''}`}>
      {value || '-'}
    </div>
  </div>
);

const SectionList = ({ title, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="bg-white p-6 rounded border border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <ul className="list-disc pl-5 space-y-1 text-gray-700">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
};

const TextSection = ({ title, text }) => (
  <div className="bg-white p-6 rounded border border-gray-200">
    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-700 leading-relaxed">{text}</p>
  </div>
);

const TrustCard = ({ title, value, text }) => (
  <div className="border border-slate-100 rounded-lg p-4 bg-slate-50">
    <p className="text-[10px] uppercase text-slate-400 font-black">{title}</p>
    <p className="text-lg font-black text-slate-900 mt-1">{value}</p>
    <p className="text-sm text-slate-500 mt-2">{text}</p>
  </div>
);

const TabButton = ({ active, onClick, children }) => (
  <button
    className={`flex-1 py-4 font-bold text-center ${active ? 'text-red-600 border-b-2 border-red-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
    onClick={onClick}
    role="tab"
    aria-selected={active}
  >
    {children}
  </button>
);

const BidTable = ({ bids }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[480px] text-left border-collapse">
      <thead className="bg-gray-100 text-xs text-gray-500 uppercase sticky top-0 z-10">
        <tr>
          <th className="p-3 font-bold border-b">User</th>
          <th className="p-3 font-bold border-b">Bid Amount</th>
          <th className="p-3 font-bold border-b text-right">Time</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {bids.length > 0 ? bids.map((bid) => (
          <tr key={`${bid.user}-${bid.amount}`} className="hover:bg-gray-50 transition-colors">
            <td className="p-3 font-bold text-gray-700">{bid.user}</td>
            <td className="p-3 font-mono font-bold text-green-600">{formatPkr(bid.amount)}</td>
            <td className="p-3 text-xs text-gray-500 text-right">{bid.time}</td>
          </tr>
        )) : (
          <tr><td colSpan="3" className="p-6 text-center text-gray-400">No bids yet.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const Comments = ({ comments }) => (
  <div className="p-4 space-y-4">
    {comments.length > 0 ? comments.map((comment) => (
      <div key={`${comment.user}-${comment.time}`} className="flex gap-3 border-b border-gray-100 pb-3 last:border-0">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-blue-600 text-xs">
          {comment.user.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{comment.user}</span>
            <span className="text-xs text-gray-400">{comment.time}</span>
          </div>
          <p className="text-gray-700 text-sm mt-1">{comment.text}</p>
        </div>
      </div>
    )) : (
      <div className="text-center text-gray-400 py-4">No comments yet.</div>
    )}
  </div>
);

const MiniScore = ({ label, value }) => (
  <div className="bg-slate-50 rounded-lg p-3 text-center">
    <p className="text-[10px] uppercase text-slate-400 font-black">{label}</p>
    <p className="font-black text-slate-900">{value}</p>
  </div>
);

const BidSignalPanel = ({ car, minimumBid, selectedBidAmount, requiredDeposit, hasEnoughDeposit, isUserHighBidder }) => {
  if (car.status === 'Ended') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <p className="text-xs font-black uppercase text-slate-400">Auction result</p>
        <p className="font-black text-slate-900 mt-1">{car.outcomeLabel}</p>
      </div>
    );
  }

  const bidState = isUserHighBidder ? 'Winning' : hasEnoughDeposit ? 'Ready' : 'Deposit needed';
  const bidColor = isUserHighBidder
    ? 'bg-green-50 border-green-200 text-green-800'
    : hasEnoughDeposit
      ? 'bg-blue-50 border-blue-200 text-blue-800'
      : 'bg-amber-50 border-amber-200 text-amber-800';

  return (
    <div className={`border rounded-lg p-3 ${bidColor}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase opacity-70">Bid status</p>
          <p className="font-black">{bidState}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black uppercase opacity-70">Next bid</p>
          <p className="font-black">{formatPkr(minimumBid)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-bold">
        <div className="bg-white/70 rounded p-2">
          <p className="opacity-70">Selected</p>
          <p className="font-black">{formatPkr(selectedBidAmount)}</p>
        </div>
        <div className="bg-white/70 rounded p-2">
          <p className="opacity-70">Deposit lock</p>
          <p className="font-black">{formatPkr(requiredDeposit)}</p>
        </div>
      </div>
    </div>
  );
};

export default CarDetails;
