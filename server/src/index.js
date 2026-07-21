import http from 'node:http';
import { URL } from 'node:url';
import { createId, createOpaqueToken, hashOpaqueToken, hashPassword, signToken, validatePasswordPolicy, verifyPassword, verifyToken } from './security.js';
import { getStorageInfo, loadStore, withStore } from './store.js';
import { seedData } from './seed.js';
import { addRealtimeClient, handleRealtimeUpgrade, publishEvent } from './realtimeHub.js';
import {
  createAuthUser,
  createAuthSession,
  findAuthUserByEmail,
  findAuthUserById,
  findAuthSessionById,
  findAuthSessionByRefreshHash,
  listAuthSessions,
  markAuthVerification,
  revokeAuthSession,
  touchAuthSession,
  updateAuthPassword,
  updateAuthUser,
  usesNormalizedAuth,
} from './authRepository.js';
import {
  createTopUpIntent,
  getWalletSummary,
  placeAuctionBid,
  requestWithdrawal,
  updateHoldStatus,
  usesNormalizedWallet,
} from './walletRepository.js';
import { getPaymentMethodConfig, getPaymentMethodOptions, getPaymentProvider, getPaymentProviderInfo } from './paymentProvider.js';
import {
  deleteLocalMediaObject,
  getMediaProvider,
  getMediaProviderInfo,
  readLocalMediaObject,
  validateMediaRequest,
  writeLocalMediaObject,
} from './mediaProvider.js';
import { buildMediaProcessingPlan, getMediaProcessingInfo } from './mediaProcessing.js';
import {
  attachListingMedia as attachNormalizedListingMedia,
  createDocumentVerification,
  createMediaAsset,
  deleteMediaAsset as deleteNormalizedMediaAsset,
  getMediaAsset,
  listDocumentVerifications,
  reorderListingMedia as reorderNormalizedListingMedia,
  updateMediaAsset,
  usesNormalizedMedia,
} from './mediaRepository.js';
import { indexExternalListings, searchExternalListings, searchListings, searchProviderInfo } from './searchProvider.js';
import {
  createNormalizedAuction,
  createNormalizedListing,
  getNormalizedAuction,
  getNormalizedListing,
  listNormalizedAuctionBids,
  listNormalizedAuctions,
  listNormalizedListings,
  registerAuctionWatcher,
  setNormalizedAuctionStatus,
  setNormalizedListingStatus,
  updateNormalizedListing,
  usesNormalizedCatalog,
} from './catalogRepository.js';
import { getAuctionBidPolicy, getAuctionTransition, publicAuctionRules } from './auctionRules.js';
import {
  aiFeatureSet,
  auctionSignals,
  dealScore as aiDealScore,
  estimatePrice,
  fraudRisk,
  getListingQuality,
  inspectionInsight,
  moderateText,
  parseNaturalSearch,
  pakistanValuationModel,
  predictVehiclePrice,
  rankListingsAi,
  sellerPricingCoach,
  similarListings,
  summarizeThread,
} from './aiEngine.js';
import {
  addComment as addNormalizedComment,
  createConversation as createNormalizedConversation,
  createForum as createNormalizedForum,
  createInspectionBooking,
  createOrder,
  createPost as createNormalizedPost,
  getConversation,
  getPost as getNormalizedPost,
  listReplies as listNormalizedReplies,
  listAdminOrders,
  listConversations,
  listForums,
  listInspectionBookings,
  listNotifications,
  listOrders,
  listPosts,
  listSellerOrders,
  markBestAnswer as markNormalizedBestAnswer,
  markAllNotificationsRead as markAllNormalizedNotificationsRead,
  markConversationRead as markNormalizedConversationRead,
  markNotificationRead as markNormalizedNotificationRead,
  reportPost as reportNormalizedPost,
  savePost as saveNormalizedPost,
  sendMessage as sendNormalizedMessage,
  updateOrderWorkflow,
  updateConversationStatus,
  usesNormalizedEngagement,
  voteComment as voteNormalizedComment,
  votePost as voteNormalizedPost,
} from './engagementRepository.js';
import {
  buildRecommendationStoreFromEvents,
  listRecommendationEvents,
  listRecommendationModelItems,
  recordRecommendationEvent,
  saveRecommendationModelItems,
  usesNormalizedRecommendations,
} from './recommendationRepository.js';
import {
  canPerform,
  defaultPrivacySettings,
  getKycProfile,
  getPrivacySettings,
  getVerificationLevel,
  hasVerifiedBankPartner,
  publicProfileFor,
  setPrivacySettings,
  verificationLevels,
} from './trustPolicy.js';

const port = Number(process.env.PORT || 4000);

const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',').map((origin) => origin.trim()).filter(Boolean);

const getCorsOrigin = (request) => {
  if (allowedOrigins.includes('*')) return '*';
  const origin = request?.headers?.origin;
  return origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || 'null';
};

const json = (response, status, payload, request) => {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  response.end(JSON.stringify(payload));
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const getAuthPayload = (request) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  return verifyToken(token);
};

const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const getRequestIp = (request) => {
  const forwarded = request.headers['x-forwarded-for'];
  return Array.isArray(forwarded) ? forwarded[0] : String(forwarded || request.socket.remoteAddress || '').split(',')[0].trim() || null;
};

const isActiveSessionRecord = (session) => Boolean(
  session &&
  session.status === 'active' &&
  new Date(session.expiresAt) > new Date() &&
  !session.revokedAt
);

const isSessionActive = (store, payload) => {
  if (!payload?.sid) return true;
  const session = store.sessions.find((item) => item.id === payload.sid);
  return isActiveSessionRecord(session);
};

const isAccountSessionActive = async (store, payload) => {
  if (!payload?.sid) return true;
  if (usesNormalizedAuth()) {
    const session = await findAuthSessionById(payload.sid);
    if (!isActiveSessionRecord(session)) return false;
    await touchAuthSession(session.id);
    return true;
  }
  return isSessionActive(store, payload);
};

const getAuth = (request, store) => {
  const payload = getAuthPayload(request);
  if (!payload) return null;
  if (!isSessionActive(store, payload)) return null;
  return store.users.find((user) => user.id === payload.sub) || null;
};

const getAccountAuth = async (request, store) => {
  const payload = getAuthPayload(request);
  if (!payload) return null;
  if (!(await isAccountSessionActive(store, payload))) return null;
  if (usesNormalizedAuth()) return findAuthUserById(payload.sub);
  return store.users.find((user) => user.id === payload.sub) || null;
};

const mirrorSessionToStore = (store, session) => {
  const existing = store.sessions.find((item) => item.id === session.id);
  const mirrored = { ...existing, ...session };
  if (existing) Object.assign(existing, mirrored);
  else store.sessions.push(mirrored);
};

const createSession = async (store, user, request) => {
  const refreshToken = createOpaqueToken('refresh');
  const refreshTokenHash = hashOpaqueToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
  const baseSession = {
    id: createId('session'),
    userId: user.id,
    status: 'active',
    refreshTokenHash,
    ipAddress: getRequestIp(request),
    userAgent: request.headers['user-agent'] || null,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    expiresAt,
  };

  const session = usesNormalizedAuth()
    ? await createAuthSession(baseSession)
    : baseSession;

  mirrorSessionToStore(store, session);
  return { session, refreshToken };
};

const createAuthResponse = async (store, user, request) => {
  const { session, refreshToken } = await createSession(store, user, request);
  return {
    user: publicUser(user),
    accessToken: signToken({ sub: user.id, roles: user.roles, sid: session.id }),
    refreshToken,
    session: { id: session.id, expiresAt: session.expiresAt },
  };
};

const roleSets = {
  Buyer: ['buyer'],
  Seller: ['buyer', 'seller'],
  Dealer: ['buyer', 'seller', 'dealer'],
};

const signupRolesFromBody = (body = {}) => {
  const requested = String(body.accountType || body.role || 'Buyer').trim();
  return roleSets[requested] || roleSets.Buyer;
};

const roleCapabilities = {
  buyer: ['browse', 'save', 'bid_after_kyc', 'review'],
  seller: ['create_marketplace_listing', 'create_auction_draft', 'answer_questions'],
  dealer: ['dealer_dashboard', 'inventory_tools', 'membership_required'],
  writer: ['create_news_drafts'],
  verified_writer: ['create_news_drafts'],
  editor: ['publish_news', 'moderate_articles'],
  moderator: ['moderate_community', 'review_reports'],
  admin: ['admin_queues', 'kyc_review', 'dealer_review', 'disputes'],
  super_admin: ['all_admin_actions'],
};

const hasRole = (user, roles) => Boolean(user?.roles?.some((role) => roles.includes(role)));

const requireRole = (user, response, roles) => {
  if (hasRole(user, roles)) return true;
  json(response, 403, { message: `${roles.join(' or ')} access required.` });
  return false;
};

const requireCapability = (store, user, response, action, context = {}) => {
  const decision = canPerform(store, user, action, context);
  if (decision.ok) return true;
  json(response, 403, { message: decision.message, eligibility: decision });
  return false;
};

const canLogin = (user) => !['suspended', 'blocked', 'banned', 'disabled'].includes(String(user?.status || '').toLowerCase());

const requireAuth = (request, store, response) => {
  const user = getAuth(request, store);
  if (!user) {
    json(response, 401, { message: 'Authentication required.' });
    return null;
  }
  return user;
};

const requireAccountAuth = async (request, store, response) => {
  const user = await getAccountAuth(request, store);
  if (!user) {
    json(response, 401, { message: 'Authentication required.' });
    return null;
  }
  return user;
};

const walletSummary = (store, userId) => {
  const account = store.walletAccounts.find((wallet) => wallet.userId === userId);
  if (!account) return { balance: 0, locked: 0, available: 0, transactions: [], holds: [] };

  const transactions = store.walletLedger.filter((entry) => entry.walletAccountId === account.id);
  const balance = transactions.reduce((total, entry) => total + Number(entry.amount), 0);
  const holds = store.depositHolds.filter((hold) => hold.walletAccountId === account.id);
  const locked = holds.filter((hold) => hold.status === 'locked').reduce((total, hold) => total + Number(hold.amount), 0);
  return { account, balance, locked, available: balance - locked, transactions, holds };
};

const ensureWallet = (store, userId) => {
  let wallet = store.walletAccounts.find((account) => account.userId === userId);
  if (!wallet) {
    wallet = { id: createId('wallet'), userId, currency: 'PKR', createdAt: new Date().toISOString() };
    store.walletAccounts.push(wallet);
  }
  return wallet;
};

const matchesSearch = (item, query) => {
  const term = (query.get('q') || query.get('query') || '').toLowerCase();
  if (!term) return true;
  return JSON.stringify(item).toLowerCase().includes(term);
};

const accessoryFits = (accessory, fitments, vehicle) => {
  if (!vehicle) return accessory.fitmentType === 'universal';
  if (accessory.fitmentType === 'universal') return true;
  return fitments.some((fitment) => {
    const inYearRange = !vehicle.year || (!fitment.yearFrom || vehicle.year >= fitment.yearFrom) && (!fitment.yearTo || vehicle.year <= fitment.yearTo);
    return (
      fitment.accessoryId === accessory.id &&
      inYearRange &&
      (!fitment.make || fitment.make === vehicle.make) &&
      (!fitment.model || fitment.model === vehicle.model) &&
      (!fitment.bodyStyle || fitment.bodyStyle === vehicle.bodyStyle)
    );
  });
};

const ensureCollections = (store) => {
  [
    'users',
    'sessions',
    'passwordResets',
    'authProviders',
    'otpChallenges',
    'userVerifications',
    'verificationDocuments',
    'userPrivacySettings',
    'dealers',
    'dealerReviews',
    'kycProfiles',
    'walletAccounts',
    'walletLedger',
    'depositHolds',
    'paymentIntents',
    'paymentMethods',
    'paymentTransactions',
    'bankPartners',
    'mediaAssets',
    'listingMedia',
    'documentVerifications',
    'auditLogs',
    'auctionRules',
    'auctionWinners',
    'ownedVehicles',
    'listings',
    'auctions',
    'bids',
    'accessories',
    'accessoryFitments',
    'accessoryReviews',
    'accessoryQuestions',
    'repairShops',
    'repairShopReviews',
    'repairShopQuestions',
    'serviceVideos',
    'editorialWriters',
    'editorialArticles',
    'editorialComments',
    'sellerDrafts',
    'checkouts',
    'orders',
    'inspectionBookings',
    'notifications',
    'conversations',
    'forums',
    'posts',
    'faqs',
    'savedSearches',
    'wishlistItems',
    'cartItems',
    'cartHistory',
    'featureSuggestions',
    'recommendationFeedback',
    'recommendationEvents',
    'disputes',
    'reports',
  ].forEach((key) => {
    if (!Array.isArray(store[key])) store[key] = [];
  });

  if (!store.repairShops.length && seedData.repairShops?.length) {
    store.repairShops = JSON.parse(JSON.stringify(seedData.repairShops));
  }

  if (!store.accessoryReviews.length && seedData.accessoryReviews?.length) {
    store.accessoryReviews = JSON.parse(JSON.stringify(seedData.accessoryReviews));
  }

  if (!store.accessoryQuestions.length && seedData.accessoryQuestions?.length) {
    store.accessoryQuestions = JSON.parse(JSON.stringify(seedData.accessoryQuestions));
  }

  if (!store.repairShopReviews.length && seedData.repairShopReviews?.length) {
    store.repairShopReviews = JSON.parse(JSON.stringify(seedData.repairShopReviews));
  }

  if (!store.repairShopQuestions.length && seedData.repairShopQuestions?.length) {
    store.repairShopQuestions = JSON.parse(JSON.stringify(seedData.repairShopQuestions));
  }

  if (!store.serviceVideos.length && seedData.serviceVideos?.length) {
    store.serviceVideos = JSON.parse(JSON.stringify(seedData.serviceVideos));
  }

  if (!store.editorialWriters.length && seedData.editorialWriters?.length) {
    store.editorialWriters = JSON.parse(JSON.stringify(seedData.editorialWriters));
  }

  if (!store.editorialArticles.length && seedData.editorialArticles?.length) {
    store.editorialArticles = JSON.parse(JSON.stringify(seedData.editorialArticles));
  }
};

const publicUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const serializePaymentMethod = (method) => {
  if (!method) return null;
  const config = getPaymentMethodConfig(method.provider);
  return {
    ...method,
    providerLabel: config?.label || method.provider,
    providerMode: config?.mode || method.providerMode || 'manual_review',
    sandboxReady: config?.sandboxReady ?? method.status === 'sandbox_ready',
    requiresAdminReview: config?.requiresAdminReview ?? true,
  };
};

const serializePaymentTransaction = (store, transaction) => {
  if (!transaction) return null;
  return {
    ...transaction,
    paymentMethod: transaction.paymentMethodId
      ? serializePaymentMethod(store.paymentMethods.find((method) => String(method.id) === String(transaction.paymentMethodId)))
      : null,
  };
};

const checkoutPaymentTransaction = (store, checkoutId, transactionType) => (
  store.paymentTransactions.find((item) => String(item.checkoutId) === String(checkoutId) && item.transactionType === transactionType) || null
);

const checkoutPaymentDeadlineHours = 72;

const auctionDepositHoldForUser = (store, auctionId, userId) => {
  if (!auctionId || !userId) return null;
  const wallet = ensureWallet(store, userId);
  return store.depositHolds
    .filter((hold) => String(hold.auctionId) === String(auctionId) && String(hold.walletAccountId) === String(wallet.id))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0] || null;
};

const serializeCheckout = (store, checkout) => {
  if (!checkout) return null;
  const depositHold = auctionDepositHoldForUser(store, checkout.auctionId, checkout.buyerId);
  return {
    ...checkout,
    depositHold,
    paymentDeadlineHours: checkoutPaymentDeadlineHours,
  };
};

const applyPaymentSettlementUpdate = (store, {
  transaction,
  checkout,
  auction,
  depositHold,
  update,
  actorId,
  timelineAction = 'admin-payment-update',
}) => {
  Object.assign(transaction, {
    status: update.status || transaction.status,
    refundStatus: update.refundStatus !== undefined ? update.refundStatus : transaction.refundStatus,
    adminNote: update.adminNote !== undefined ? update.adminNote : transaction.adminNote,
    reconciliationStatus: update.reconciliationStatus !== undefined ? update.reconciliationStatus : transaction.reconciliationStatus,
    providerCallbackStatus: update.providerCallbackStatus !== undefined ? update.providerCallbackStatus : transaction.providerCallbackStatus,
    providerCallbackEvent: update.providerCallbackEvent !== undefined ? update.providerCallbackEvent : transaction.providerCallbackEvent,
    providerResponseMeta: update.providerResponseMeta !== undefined ? update.providerResponseMeta : transaction.providerResponseMeta,
    reviewedBy: actorId || transaction.reviewedBy,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (checkout) {
    checkout.timeline = [
      ...(checkout.timeline || []),
      {
        action: timelineAction,
        actorId,
        body: {
          status: transaction.status,
          refundStatus: transaction.refundStatus || null,
          reconciliationStatus: transaction.reconciliationStatus || null,
          providerCallbackStatus: transaction.providerCallbackStatus || null,
          providerCallbackEvent: transaction.providerCallbackEvent || null,
          note: transaction.adminNote || '',
        },
        createdAt: new Date().toISOString(),
      },
    ];
    checkout.updatedAt = new Date().toISOString();
  }

  if (transaction.transactionType === 'auction_winning_payment' && checkout && auction) {
    if (transaction.status === 'confirmed' || transaction.status === 'paid' || transaction.status === 'succeeded') {
      checkout.paymentStatus = 'confirmed';
      checkout.status = checkout.handoverStatus === 'confirmed' ? 'handover_ready' : 'payment_cleared';
      auction.status = 'paid';
      if (depositHold?.status === 'locked') {
        depositHold.status = 'released';
        depositHold.updatedAt = new Date().toISOString();
      }
      let payout = checkoutPaymentTransaction(store, checkout.id, 'seller_payout');
      if (!payout) {
        payout = {
          id: createId('payment_tx'),
          userId: checkout.sellerId,
          checkoutId: checkout.id,
          auctionId: auction.id,
          provider: 'seller_payout',
          providerReference: `payout-${auction.id}`,
          amount: transaction.amount,
          currency: transaction.currency || 'PKR',
          status: 'pending_release',
          reconciliationStatus: 'awaiting_payout_review',
          providerCallbackStatus: 'not_applicable',
          transactionType: 'seller_payout',
          metadata: {
            sourceTransactionId: transaction.id,
            buyerId: checkout.buyerId,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        store.paymentTransactions.push(payout);
      }
    }

    if (transaction.status === 'refunded' || transaction.refundStatus === 'approved') {
      checkout.paymentStatus = 'refunded';
      checkout.status = 'refund_completed';
      auction.status = 'forfeited';
      if (depositHold?.status === 'locked') {
        const holdResolution = update.depositHoldAction === 'forfeit' ? 'forfeited' : 'released';
        depositHold.status = holdResolution;
        depositHold.updatedAt = new Date().toISOString();
      }
      const payout = checkoutPaymentTransaction(store, checkout.id, 'seller_payout');
      if (payout) {
        payout.status = 'cancelled';
        payout.reconciliationStatus = 'cancelled_after_refund';
        payout.updatedAt = new Date().toISOString();
      }
    }

    if (transaction.status === 'dispute_hold' || transaction.refundStatus === 'hold') {
      checkout.paymentStatus = 'dispute_hold';
      checkout.status = 'disputed';
      auction.status = 'disputed';
      if (depositHold?.status === 'locked') {
        depositHold.updatedAt = new Date().toISOString();
      }
      const payout = checkoutPaymentTransaction(store, checkout.id, 'seller_payout');
      if (payout) {
        payout.status = 'dispute_hold';
        payout.reconciliationStatus = 'blocked_by_dispute';
        payout.updatedAt = new Date().toISOString();
      }
    }

    if (transaction.status === 'forfeited' || transaction.refundStatus === 'forfeit') {
      checkout.paymentStatus = 'forfeited';
      checkout.status = 'forfeited';
      auction.status = 'forfeited';
      if (depositHold) {
        depositHold.status = 'forfeited';
        depositHold.updatedAt = new Date().toISOString();
      }
      const payout = checkoutPaymentTransaction(store, checkout.id, 'seller_payout');
      if (payout) {
        payout.status = 'cancelled';
        payout.reconciliationStatus = 'cancelled_after_forfeit';
        payout.updatedAt = new Date().toISOString();
      }
    }

    if (transaction.status === 'failed') {
      checkout.paymentStatus = 'failed';
      checkout.status = 'payment_pending';
      auction.status = 'payment_pending';
    }
  }

  if (transaction.transactionType === 'seller_payout' && checkout && auction) {
    if (transaction.status === 'released' || transaction.status === 'paid_out') {
      checkout.payoutStatus = 'released';
      checkout.status = checkout.titleTransferStatus === 'confirmed' ? 'completed' : 'handover_complete';
      auction.status = checkout.titleTransferStatus === 'confirmed' ? 'completed' : 'handover';
    }

    if (transaction.status === 'dispute_hold') {
      checkout.payoutStatus = 'dispute_hold';
      checkout.status = 'disputed';
      auction.status = 'disputed';
    }
  }
};

const buildDealerProfile = (store, dealer) => {
  const dealerId = dealer.id || dealer.userId;
  const listings = store.listings.filter((listing) => String(listing.sellerId) === String(dealerId));
  const auctions = store.auctions.filter((auction) => listings.some((listing) => String(listing.id) === String(auction.listingId)));
  const soldOrders = store.orders.filter((order) => String(order.sellerId) === String(dealerId) && ['completed', 'closed'].includes(order.status));
  return {
    id: dealerId,
    userId: dealer.userId || dealer.id,
    name: dealer.businessName || dealer.fullName || dealer.name || dealer.email || 'Dealer',
    city: dealer.city || dealer.businessCity || 'Pakistan',
    status: dealer.status || 'pending_verification',
    verified: Boolean(dealer.verified || dealer.status === 'verified'),
    membership: dealer.membership || { plan: 'monthly_dealer', status: dealer.membershipStatus || 'trial', feePkr: 25000 },
    badges: dealer.badges || (dealer.verified ? ['Verified dealer'] : ['Dealer applicant']),
    metrics: {
      activeListings: listings.filter((listing) => ['published', 'live'].includes(listing.status)).length,
      activeAuctions: auctions.filter((auction) => auction.status === 'live').length,
      soldCars: soldOrders.length,
      trustScore: dealer.trustScore || Math.max(60, ...listings.map((listing) => Number(listing.trustScore || 0))),
    },
    createdAt: dealer.createdAt,
    updatedAt: dealer.updatedAt,
  };
};

const mirrorAuthUserToStore = (store, user) => {
  if (!user) return;
  const existing = store.users.find((item) => item.id === user.id);
  const mirrored = {
    ...existing,
    ...user,
    passwordHash: user.passwordHash || existing?.passwordHash,
  };

  if (existing) {
    Object.assign(existing, mirrored);
  } else {
    store.users.push(mirrored);
  }

  if (!store.kycProfiles.some((profile) => profile.userId === user.id)) {
    store.kycProfiles.push({ id: createId('kyc'), userId: user.id, status: 'not_started', documents: [] });
  }
  ensureWallet(store, user.id);
};

const ensureDealerProfile = (store, user, body = {}) => {
  if (!hasRole(user, ['dealer'])) return null;
  let dealer = store.dealers.find((item) => String(item.userId || item.id) === String(user.id));
  if (!dealer) {
    dealer = {
      id: createId('dealer'),
      userId: user.id,
      businessName: body.businessName || user.fullName || body.fullName || 'Dealer applicant',
      city: body.city || user.city || 'Pakistan',
      status: 'pending_verification',
      verified: false,
      membership: { plan: 'monthly_dealer', status: 'pending_verification', feePkr: 25000 },
      badges: ['Dealer applicant'],
      createdAt: new Date().toISOString(),
    };
    store.dealers.push(dealer);
  }
  return dealer;
};

const audit = (store, actorId, action, entityType, entityId, details = {}) => {
  store.auditLogs.push({
    id: createId('audit'),
    actorId,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  });
};

const serializeAuction = (store, auction) => ({
  ...auction,
  listing: store.listings.find((listing) => String(listing.id) === String(auction.listingId)) || null,
  bidHistory: store.bids
    .filter((bid) => String(bid.auctionId) === String(auction.id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((bid) => ({
      ...bid,
      bidder: publicUser(store.users.find((user) => user.id === bid.bidderId)),
    })),
});

const listingQuality = (listing = {}) => {
  return getListingQuality(listing);
};

const rankListings = (listings, query = {}) => {
  return rankListingsAi({ listings, auctions: [], bids: [] }, query);
};

const buildFacets = (items) => {
  const count = (key) => items.reduce((acc, item) => {
    const value = item[key] || 'Unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  return {
    makes: count('make'),
    models: count('model'),
    bodyStyles: count('bodyStyle'),
    cities: count('city'),
    powertrains: count('powertrain'),
  };
};

const recordJsonRecommendationEvent = (store, userId, payload = {}) => {
  const event = {
    id: createId('recevent'),
    userId: userId || null,
    listingId: payload.listingId || payload.carId || null,
    eventType: payload.eventType || payload.action || 'view',
    score: payload.score === undefined ? null : Number(payload.score),
    metadata: payload.metadata || payload,
    createdAt: new Date().toISOString(),
  };
  store.recommendationEvents.push(event);
  if (event.eventType === 'feedback' || payload.feedback || payload.action) {
    store.recommendationFeedback.push({
      id: createId('recfb'),
      userId: event.userId,
      listingId: event.listingId,
      action: payload.action || payload.feedback || event.eventType,
      score: event.score,
      metadata: event.metadata,
      createdAt: event.createdAt,
    });
  }
  return event;
};

const buildSearchIndexResponse = (store, listings, query, userId = null) => {
  const profile = {
    ...Object.fromEntries(query.entries()),
    userId,
    watchlist: store.recommendationEvents
      .filter((event) => event.userId === userId && ['watch', 'save', 'watchlist'].includes(event.eventType))
      .map((event) => event.listingId),
    recentlyViewed: store.recommendationEvents
      .filter((event) => event.userId === userId && ['view', 'click'].includes(event.eventType))
      .slice(0, 20)
      .map((event) => event.listingId),
  };
  const ranked = rankListingsAi({ ...store, listings }, profile);
  return {
    provider: searchProviderInfo(),
    model: 'hybrid_content_collaborative',
    query: Object.fromEntries(query.entries()),
    listings: ranked,
    index: {
      indexedDocuments: store.listings.length,
      returnedDocuments: ranked.length,
      facets: buildFacets(store.listings),
      eventSignals: store.recommendationEvents.length,
    },
  };
};

const repairShopCategories = {
  workshops: { label: 'Workshops', type: 'car_repair', keyword: 'mechanic workshop' },
  'oil-change': { label: 'Oil Change', type: 'car_repair', keyword: 'oil change' },
  'car-wash': { label: 'Car Washes', type: 'car_wash', keyword: 'car wash detailing' },
  dealerships: { label: 'Dealerships', type: 'car_dealer', keyword: 'car dealership' },
  'rent-a-car': { label: 'Rent a Car', type: 'car_rental', keyword: 'rent a car car rental' },
  'sell-a-car': { label: 'Sell a Car Help', type: 'car_dealer', keyword: 'sell car dealer used cars consignment' },
  tyres: { label: 'Tyres', type: 'car_repair', keyword: 'tyre shop wheel alignment' },
  inspection: { label: 'Inspection', type: 'car_repair', keyword: 'vehicle inspection diagnostics' },
  towing: { label: 'Towing', type: 'car_repair', keyword: 'towing roadside assistance' },
};

const acceptedVerificationDocuments = ['cnic', 'government_id', 'passport', 'driving_license', 'selfie_liveness', 'dealer_ntn', 'business_registration', 'seller_bank_proof', 'vehicle_ownership'];
const supportedAuthProviders = ['google', 'facebook', 'microsoft', 'phone_otp', 'apple'];

const authProviderConfigFor = (provider, store = null, user = null) => {
  const envKey = `${provider.toUpperCase()}_CLIENT_ID`;
  const configured = provider === 'phone_otp'
    ? Boolean(process.env.OTP_PROVIDER || 'dev_adapter')
    : Boolean(process.env[envKey]);
  const mode = provider === 'phone_otp'
    ? (process.env.OTP_PROVIDER || 'dev_adapter')
    : (configured ? 'adapter_first' : 'credentials_required');
  const requirements = provider === 'phone_otp'
    ? ['sms provider account', 'sender approval', 'otp rate limits']
    : ['oauth client id', 'oauth client secret', 'redirect url', 'provider approval'];
  const link = user
    ? (store?.authProviders.find((item) => item.provider === provider && String(item.userId) === String(user.id)) || null)
    : null;
  return {
    provider,
    configured,
    mode,
    sandboxReady: configured || provider === 'phone_otp',
    requirements,
    linked: Boolean(link),
    link,
  };
};

const authProviderCatalog = (store = null, user = null) => supportedAuthProviders.map((provider) => authProviderConfigFor(provider, store, user));

const kycProviderInfo = () => ({
  provider: process.env.KYC_PROVIDER || 'manual_review',
  configured: Boolean(process.env.KYC_PROVIDER || process.env.CNIC_PROVIDER || process.env.LIVENESS_PROVIDER),
  mode: process.env.KYC_PROVIDER ? 'adapter_first' : 'manual_review',
  livenessProvider: process.env.LIVENESS_PROVIDER || 'placeholder_adapter',
  cnicVerificationProvider: process.env.CNIC_PROVIDER || 'not_configured',
  acceptedDocuments: acceptedVerificationDocuments,
  consentTextVersion: process.env.KYC_CONSENT_VERSION || 'kyc-consent-v1',
  manualAdminReview: true,
});

const policyInfo = () => ({
  policyPages: ['/terms', '/privacy-policy', '/auction-rules', '/buyer-protection', '/kyc-policy'],
  consentTextVersion: process.env.KYC_CONSENT_VERSION || 'kyc-consent-v1',
  publicBankAuctionsEnabled: Boolean(process.env.ENABLE_BANK_AUCTIONS === 'true'),
  legalReviewRequired: true,
  auctionJurisdiction: 'Pakistan-first',
});

const platformContracts = () => ({
  apiGroups: [
    '/auth',
    '/auth/providers',
    '/auth/otp',
    '/users',
    '/profiles',
    '/dealers',
    '/verification',
    '/privacy',
    '/eligibility',
    '/vehicles',
    '/marketplace',
    '/auctions',
    '/bids',
    '/orders',
    '/payments',
    '/kyc',
    '/bank-partners',
    '/auction-rules',
    '/wishlist',
    '/cart',
    '/feature-suggestions',
    '/garage',
    '/media',
    '/search',
    '/recommendations',
    '/communities',
    '/articles',
    '/services',
    '/admin',
  ],
  realtimeEvents: [
    'auction.joined',
    'auction.bid_placed',
    'auction.outbid',
    'auction.reserve_met',
    'auction.extended',
    'auction.ended',
    'auction.winner_selected',
    'notification.created',
  ],
  auctionRules: publicAuctionRules(),
  storage: getStorageInfo(),
  providers: {
    auth: authProviderCatalog(),
    kyc: kycProviderInfo(),
    payments: getPaymentProviderInfo(),
    media: getMediaProviderInfo(),
    mediaProcessing: getMediaProcessingInfo(),
    search: searchProviderInfo(),
  },
  compliance: policyInfo(),
});

const platformReadiness = () => {
  const storage = getStorageInfo();
  const paymentInfo = getPaymentProviderInfo();
  const mediaInfo = getMediaProviderInfo();
  const processingInfo = getMediaProcessingInfo();
  const searchInfo = searchProviderInfo();
  const authInfo = authProviderCatalog();
  const kycInfo = kycProviderInfo();
  const checks = [
    { id: 'database', label: 'Postgres persistence', ok: storage.driver === 'postgres' && storage.databaseUrlConfigured, current: storage },
    { id: 'auth', label: 'Auth provider adapters', ok: authInfo.some((provider) => provider.provider !== 'phone_otp' && provider.configured), current: authInfo },
    { id: 'kyc', label: 'KYC, CNIC, and liveness adapter', ok: kycInfo.configured, current: kycInfo },
    { id: 'payments', label: 'Payment/KYC adapter', ok: paymentInfo.provider !== 'mock' || process.env.PAYMENT_PROVIDER === 'mock', current: paymentInfo },
    { id: 'media', label: 'S3/R2 media storage adapter', ok: mediaInfo.provider === 's3' && mediaInfo.configured, current: mediaInfo },
    { id: 'cdn', label: 'CDN delivery', ok: Boolean(mediaInfo.cdnConfigured), current: { cdnConfigured: mediaInfo.cdnConfigured } },
    { id: 'media_security', label: 'Virus scanning and processors', ok: processingInfo.scanner.configured && processingInfo.imageProcessor.configured && processingInfo.videoProcessor.configured, current: processingInfo },
    { id: 'search', label: 'Search provider/index', ok: searchInfo.provider !== 'local' || process.env.SEARCH_PROVIDER === 'local', current: searchInfo },
    { id: 'realtime', label: 'Realtime auction events', ok: true, current: { transport: 'server-sent-events', websocketUpgrade: true } },
  ];
  const passed = checks.filter((check) => check.ok).length;
  return {
    score: Math.round((passed / checks.length) * 100),
    launchClass: storage.driver === 'postgres' && passed >= 4 ? 'production-beta-foundation' : 'development-foundation',
    checks,
  };
};

const accessoryReviewsFor = (store, accessoryId) => store.accessoryReviews
  .filter((review) => String(review.accessoryId) === String(accessoryId))
  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

const accessoryQuestionsFor = (store, accessoryId) => store.accessoryQuestions
  .filter((question) => String(question.accessoryId) === String(accessoryId))
  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

const accessoryReviewSummary = (reviews) => {
  const count = reviews.length;
  const average = count
    ? Number((reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / count).toFixed(1))
    : 0;
  const distribution = [5, 4, 3, 2, 1].reduce((result, rating) => {
    result[rating] = reviews.filter((review) => Number(review.rating) === rating).length;
    return result;
  }, {});
  return { average, count, distribution };
};

const buildAccessoryProduct = (store, accessory) => {
  const reviews = accessoryReviewsFor(store, accessory.id);
  const questions = accessoryQuestionsFor(store, accessory.id);
  const summary = accessoryReviewSummary(reviews);
  return {
    ...accessory,
    rating: summary.count ? summary.average : Number(accessory.rating || 0),
    reviewsCount: summary.count,
    questionsCount: questions.length,
    answeredQuestionsCount: questions.filter((question) => question.answer).length,
    reviewSummary: summary,
    recentReviews: reviews.slice(0, 3),
    recentQuestions: questions.slice(0, 3),
  };
};

const validateRating = (rating) => {
  const numeric = Number(rating);
  return Number.isFinite(numeric) && numeric >= 1 && numeric <= 5 ? Math.round(numeric) : null;
};

const repairShopReviewsFor = (store, shopId) => store.repairShopReviews
  .filter((review) => String(review.shopId) === String(shopId))
  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

const repairShopQuestionsFor = (store, shopId) => store.repairShopQuestions
  .filter((question) => String(question.shopId) === String(shopId))
  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

const serviceVideosFor = (store, providerType, providerId) => store.serviceVideos
  .filter((video) => String(video.providerType) === String(providerType) && String(video.providerId) === String(providerId))
  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

const sanitizeSocialLinks = (raw = {}) => {
  const allowed = ['facebook', 'instagram', 'whatsapp', 'tiktok', 'youtube', 'website'];
  return allowed.reduce((links, key) => {
    const value = String(raw[key] || '').trim();
    if (value) links[key] = value.slice(0, 300);
    return links;
  }, {});
};

const buildRepairShopProfile = (store, shop) => {
  const reviews = repairShopReviewsFor(store, shop.id);
  const questions = repairShopQuestionsFor(store, shop.id);
  const videos = serviceVideosFor(store, 'repair_shop', shop.id);
  const summary = accessoryReviewSummary(reviews);
  return {
    ...shop,
    rating: summary.count ? summary.average : Number(shop.rating || 0),
    reviews: summary.count || Number(shop.reviews || 0),
    reviewsCount: summary.count || Number(shop.reviews || 0),
    questionsCount: questions.length,
    videosCount: videos.length,
    reviewSummary: summary,
    recentReviews: reviews.slice(0, 3),
    recentQuestions: questions.slice(0, 3),
    videos: videos.slice(0, 4),
    socialLinks: sanitizeSocialLinks(shop.socialLinks || {}),
  };
};

const slugifyArticle = (title = '') => String(title)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90) || createId('article');

const publicArticle = (store, article) => {
  const comments = store.editorialComments.filter((comment) => String(comment.articleId) === String(article.id));
  const writer = store.editorialWriters.find((item) => String(item.id) === String(article.authorId) || String(item.userId) === String(article.authorId));
  return {
    ...article,
    writer,
    commentsCount: comments.length,
  };
};

const canWriteEditorial = (user) => Boolean(user?.roles?.some((role) => ['writer', 'verified_writer', 'editor', 'admin', 'super_admin'].includes(role)));

const canEditEditorial = (user) => Boolean(user?.roles?.some((role) => ['editor', 'admin', 'super_admin'].includes(role)));

const shopCategoryKeywords = {
  workshops: ['inspection', 'diagnostics', 'suspension', 'engine', 'electrical', 'mechanic', 'oil change', 'hybrid'],
  'oil-change': ['oil change'],
  'car-wash': ['car wash', 'detailing', 'cleaning', 'ceramic'],
  dealerships: ['dealership', 'certified used cars', 'trade-in', 'financing'],
  'rent-a-car': ['rent a car', 'rental', 'chauffeur', 'self drive'],
  'sell-a-car': ['sell car', 'dealer', 'trade-in', 'consignment', 'used cars'],
  tyres: ['tyre', 'wheel', 'alignment'],
  inspection: ['inspection', 'diagnostics', 'hybrid', 'ev check'],
  towing: ['towing', 'roadside'],
};

const compareRepairShops = (sortBy) => (a, b) => {
  if (sortBy === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
  if (sortBy === 'communityVotes') return Number(b.communityVotes || 0) - Number(a.communityVotes || 0);
  if (sortBy === 'completedJobs') return Number(b.completedJobs || 0) - Number(a.completedJobs || 0);
  if (sortBy === 'reviews') return Number(b.reviews || 0) - Number(a.reviews || 0);
  return Number(a.distanceKm || 999) - Number(b.distanceKm || 999);
};

const filterRepairShops = (store, query) => {
  const shops = store.repairShops.map((shop) => buildRepairShopProfile(store, shop));
  const city = query.get('city') || 'All';
  const category = query.get('category') || 'workshops';
  const verifiedOnly = query.get('verifiedOnly') === 'true';
  const sortBy = query.get('sortBy') || 'distanceKm';
  const keywords = shopCategoryKeywords[category] || [];
  const filtered = shops
    .filter((shop) => city === 'All' || !city || shop.city === city)
    .filter((shop) => !verifiedOnly || shop.verified)
    .filter((shop) => category === 'workshops' || shop.category === category || (shop.specialties || []).some((specialty) => keywords.some((keyword) => specialty.toLowerCase().includes(keyword))))
    .sort(compareRepairShops(sortBy));

  return (filtered.length ? filtered : shops.filter((shop) => city === 'All' || !city || shop.city === city).sort(compareRepairShops(sortBy)))
    .map((shop, index) => ({ ...shop, rank: index + 1, source: shop.source || 'verified_directory' }));
};

const googlePlaceToShop = (place, index, category) => ({
  id: place.place_id || `google-place-${index + 1}`,
  rank: index + 1,
  name: place.name,
  category,
  city: 'Near you',
  area: place.vicinity || place.formatted_address || 'Local area',
  address: place.vicinity || place.formatted_address || 'Address available in Google Maps',
  lat: place.geometry?.location?.lat,
  lng: place.geometry?.location?.lng,
  distanceKm: null,
  rating: place.rating || 0,
  reviews: place.user_ratings_total || 0,
  completedJobs: 0,
  communityVotes: 0,
  responseTime: 'Google Places',
  verified: place.business_status === 'OPERATIONAL',
  openNow: Boolean(place.opening_hours?.open_now),
  specialties: [repairShopCategories[category]?.label || 'Automotive service'],
  source: 'google_places',
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
});

const searchGooglePlaces = async ({ lat, lng, category = 'workshops', radius = 8000 }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { configured: false, places: [] };

  const categoryConfig = repairShopCategories[category] || repairShopCategories.workshops;
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radius),
    type: categoryConfig.type,
    keyword: categoryConfig.keyword,
    key: apiKey,
  });
  const googleResponse = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`);
  const payload = await googleResponse.json();
  if (payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') {
    throw new Error(payload.error_message || `Google Places returned ${payload.status}`);
  }
  return {
    configured: true,
    places: (payload.results || []).slice(0, 12).map((place, index) => googlePlaceToShop(place, index, category)),
    status: payload.status,
  };
};

const bidAuditEvents = (store, auctionId) => store.bids
  .filter((bid) => String(bid.auctionId) === String(auctionId))
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .map((bid, index) => {
    const bidder = store.users.find((user) => user.id === bid.bidderId);
    return {
      id: bid.id,
      bidder: publicUser(bidder),
      amount: bid.amount,
      status: bid.status,
      risk: index % 3 === 0 ? 'Review device overlap' : 'Low',
      depositStatus: store.depositHolds.some((hold) => hold.auctionId === auctionId && hold.walletAccountId === ensureWallet(store, bid.bidderId).id && hold.status === 'locked') ? 'locked' : 'not_found',
      ip: index % 2 === 0 ? '103.xxx.xxx.12' : '39.xxx.xxx.45',
      device: index % 2 === 0 ? 'Chrome / Karachi' : 'Android / Lahore',
      createdAt: bid.createdAt,
    };
  });

const route = async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {}, request);

  const url = new URL(request.url, `http://${request.headers.host}`);
  const path = url.pathname.replace(/^\/api/, '');

  if (path === '/health') return json(response, 200, { ok: true, service: 'wheels-deals-api', storage: getStorageInfo(), payments: getPaymentProviderInfo(), media: getMediaProviderInfo(), mediaProcessing: getMediaProcessingInfo(), search: searchProviderInfo() });
  if (request.method === 'GET' && path === '/platform/contracts') return json(response, 200, platformContracts(), request);
  if (request.method === 'GET' && path === '/platform/readiness') return json(response, 200, platformReadiness(), request);
  if (path === '/realtime') return addRealtimeClient(url.searchParams.get('channel') || 'global', response);

  try {
    const store = await loadStore();
    ensureCollections(store);

    if (request.method === 'POST' && path === '/auth/register') {
      const body = await readBody(request);
      if (!body.email || !body.password || !body.fullName) return json(response, 400, { message: 'Email, password, and full name are required.' });
      const passwordPolicy = validatePasswordPolicy(body.password);
      if (!passwordPolicy.ok) return json(response, 400, { message: passwordPolicy.message, failures: passwordPolicy.failures });
      const roles = signupRolesFromBody(body);

      if (usesNormalizedAuth()) {
        const result = await createAuthUser({
          email: body.email,
          phone: body.phone,
          fullName: body.fullName,
          city: body.city,
          passwordHash: hashPassword(body.password),
          roles,
        });
        if (result.conflict) return json(response, 409, { message: 'Email already registered.' });
        mirrorAuthUserToStore(store, result.user);
        ensureDealerProfile(store, result.user, body);
        const authResponse = await createAuthResponse(store, result.user, request);
        await withStore((current) => Object.assign(current, store));
        return json(response, 201, authResponse);
      }

      if (store.users.some((user) => user.email === body.email)) return json(response, 409, { message: 'Email already registered.' });

      const user = {
        id: createId('user'),
        email: body.email,
        fullName: body.fullName,
        phone: body.phone || null,
        city: body.city || null,
        passwordHash: hashPassword(body.password),
        roles,
        status: 'active',
        emailVerified: false,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
      };
      store.users.push(user);
      ensureDealerProfile(store, user, body);
      store.kycProfiles.push({ id: createId('kyc'), userId: user.id, status: 'not_started', documents: [] });
      ensureWallet(store, user.id);
      store.auditLogs.push({ id: createId('audit'), actorId: user.id, action: 'auth.register', entityType: 'user', entityId: user.id, createdAt: new Date().toISOString() });
      const authResponse = await createAuthResponse(store, user, request);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, authResponse);
    }

    if (request.method === 'POST' && path === '/auth/login') {
      const body = await readBody(request);
      if (usesNormalizedAuth()) {
        const user = await findAuthUserByEmail(body.email);
        if (!user || !verifyPassword(body.password || '', user.passwordHash)) return json(response, 401, { message: 'Invalid credentials.' });
        if (!canLogin(user)) return json(response, 403, { message: 'This account is not allowed to sign in.' });
        mirrorAuthUserToStore(store, user);
        const authResponse = await createAuthResponse(store, user, request);
        await withStore((current) => Object.assign(current, store));
        return json(response, 200, authResponse);
      }

      const user = store.users.find((item) => item.email === body.email);
      if (!user || !verifyPassword(body.password || '', user.passwordHash)) return json(response, 401, { message: 'Invalid credentials.' });
      if (!canLogin(user)) return json(response, 403, { message: 'This account is not allowed to sign in.' });
      const authResponse = await createAuthResponse(store, user, request);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, authResponse);
    }

    if (request.method === 'POST' && path === '/auth/logout') {
      const payload = getAuthPayload(request);
      if (payload?.sid) {
        if (usesNormalizedAuth()) await revokeAuthSession(payload.sid);
        const session = store.sessions.find((item) => item.id === payload.sid);
        if (session) {
          session.status = 'revoked';
          session.revokedAt = new Date().toISOString();
          await withStore((current) => Object.assign(current, store));
        }
      }
      return json(response, 200, { ok: true });
    }

    if (request.method === 'POST' && path === '/auth/refresh') {
      const body = await readBody(request);
      if (body.refreshToken) {
        const refreshTokenHash = hashOpaqueToken(body.refreshToken);
        const session = usesNormalizedAuth()
          ? await findAuthSessionByRefreshHash(refreshTokenHash)
          : store.sessions.find((item) => (item.refreshTokenHash === refreshTokenHash || item.refreshToken === body.refreshToken) && item.status === 'active');
        if (!isActiveSessionRecord(session)) return json(response, 401, { message: 'Refresh token expired or revoked.' });
        const user = usesNormalizedAuth() ? await findAuthUserById(session.userId) : store.users.find((item) => item.id === session.userId);
        if (!user) return json(response, 401, { message: 'Session user not found.' });
        if (!canLogin(user)) return json(response, 403, { message: 'This account is not allowed to refresh.' });
        if (usesNormalizedAuth()) await touchAuthSession(session.id);
        return json(response, 200, {
          user: publicUser(user),
          accessToken: signToken({ sub: user.id, roles: user.roles, sid: session.id }),
          refreshToken: body.refreshToken,
          session: { id: session.id, expiresAt: session.expiresAt },
        });
      }
      const user = await getAccountAuth(request, store);
      if (!user) return json(response, 401, { message: 'Authentication required.' });
      const payload = getAuthPayload(request);
      return json(response, 200, { user: publicUser(user), accessToken: signToken({ sub: user.id, roles: user.roles, sid: payload?.sid }) });
    }

    if (request.method === 'GET' && path === '/auth/sessions') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const sessions = usesNormalizedAuth()
        ? await listAuthSessions(user.id)
        : store.sessions.filter((session) => session.userId === user.id);
      return json(response, 200, {
        sessions: sessions.map(({ refreshToken, refreshTokenHash, ...session }) => ({
          ...session,
          current: session.id === getAuthPayload(request)?.sid,
        })),
      });
    }

    const authSessionMatch = path.match(/^\/auth\/sessions\/([^/]+)$/);
    if (request.method === 'DELETE' && authSessionMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const sessionId = authSessionMatch[1];
      const session = usesNormalizedAuth()
        ? await findAuthSessionById(sessionId)
        : store.sessions.find((item) => item.id === sessionId);
      if (!session || String(session.userId) !== String(user.id)) return json(response, 404, { message: 'Session not found.' });
      if (usesNormalizedAuth()) await revokeAuthSession(sessionId);
      const runtimeSession = store.sessions.find((item) => item.id === sessionId);
      if (runtimeSession) {
        runtimeSession.status = 'revoked';
        runtimeSession.revokedAt = new Date().toISOString();
      }
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { ok: true });
    }

    if (request.method === 'GET' && path === '/auth/roles') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      return json(response, 200, {
        roles: user.roles || ['buyer'],
        capabilities: (user.roles || ['buyer']).flatMap((role) => roleCapabilities[role] || []),
        verificationLevel: getVerificationLevel(store, user),
      });
    }

    if (request.method === 'GET' && path === '/auth/providers') {
      const user = await getAccountAuth(request, store);
      return json(response, 200, {
        providers: authProviderCatalog(store, user),
      });
    }

    const authProviderLinkMatch = path.match(/^\/auth\/providers\/([^/]+)\/link$/);
    if (request.method === 'POST' && authProviderLinkMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const provider = authProviderLinkMatch[1];
      const allowedProviders = ['google', 'facebook', 'microsoft', 'phone_otp', 'apple'];
      if (!allowedProviders.includes(provider)) return json(response, 400, { message: 'Unsupported auth provider.' });
      const subject = String(body.providerSubject || body.sub || `${provider}:${user.id}`).slice(0, 200);
      const existing = store.authProviders.find((item) => item.provider === provider && item.providerSubject === subject);
      if (existing && String(existing.userId) !== String(user.id)) return json(response, 409, { message: 'Provider identity is already linked to another account.' });
      const record = existing || { id: createId('auth_provider'), userId: user.id, provider, providerSubject: subject, createdAt: new Date().toISOString() };
      Object.assign(record, { email: body.email || null, displayName: body.displayName || null, updatedAt: new Date().toISOString() });
      if (!existing) store.authProviders.push(record);
      audit(store, user.id, 'auth.provider_link', 'auth_provider', record.id, { provider });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { provider: record });
    }

    if (request.method === 'POST' && path === '/auth/otp/start') {
      const body = await readBody(request);
      const phone = String(body.phone || '').trim();
      if (!phone) return json(response, 400, { message: 'Phone number is required.' });
      const challenge = {
        id: createId('otp'),
        userId: getAuthPayload(request)?.sub || null,
        phone,
        channel: body.channel || 'sms',
        code: process.env.NODE_ENV === 'production' ? String(Math.floor(100000 + Math.random() * 900000)) : '123456',
        status: 'issued',
        attempts: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
        createdAt: new Date().toISOString(),
      };
      store.otpChallenges.push(challenge);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, {
        challengeId: challenge.id,
        expiresAt: challenge.expiresAt,
        devCode: process.env.NODE_ENV === 'production' ? undefined : challenge.code,
      });
    }

    if (request.method === 'POST' && path === '/auth/otp/verify') {
      const body = await readBody(request);
      const challenge = store.otpChallenges.find((item) => item.id === body.challengeId && item.status === 'issued');
      if (!challenge || new Date(challenge.expiresAt) <= new Date()) return json(response, 400, { message: 'OTP challenge expired or invalid.' });
      challenge.attempts += 1;
      if (String(body.code || '') !== String(challenge.code)) {
        if (challenge.attempts >= 5) challenge.status = 'locked';
        await withStore((current) => Object.assign(current, store));
        return json(response, 400, { message: 'Invalid OTP code.' });
      }
      const user = await getAccountAuth(request, store);
      if (user) {
        if (usesNormalizedAuth()) {
          const verified = await markAuthVerification(user.id, 'phone');
          mirrorAuthUserToStore(store, verified);
        } else {
          const runtimeUser = store.users.find((item) => String(item.id) === String(user.id));
          if (runtimeUser) {
            runtimeUser.phone = challenge.phone;
            runtimeUser.phoneVerified = true;
            runtimeUser.updatedAt = new Date().toISOString();
          }
        }
        audit(store, user.id, 'auth.otp_verify', 'user', user.id, { phone: challenge.phone });
      }
      challenge.status = 'verified';
      challenge.verifiedAt = new Date().toISOString();
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { ok: true, phoneVerified: Boolean(user), message: user ? 'Phone verified.' : 'OTP verified.' });
    }

    if (request.method === 'POST' && path === '/auth/forgot-password') {
      const body = await readBody(request);
      const email = String(body.email || '').trim().toLowerCase();
      const user = usesNormalizedAuth()
        ? await findAuthUserByEmail(email)
        : store.users.find((item) => String(item.email || '').toLowerCase() === email);
      if (user) {
        const reset = {
          id: createId('reset'),
          userId: user.id,
          status: 'issued',
          token: createId('reset_token'),
          expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
          createdAt: new Date().toISOString(),
        };
        if (!Array.isArray(store.passwordResets)) store.passwordResets = [];
        store.passwordResets.push(reset);
        audit(store, user.id, 'auth.password_reset_requested', 'user', user.id);
        await withStore((current) => Object.assign(current, store));
      }
      return json(response, 200, { ok: true, message: 'If the email exists, a reset link has been issued in dev mode.' });
    }

    if (request.method === 'POST' && path === '/auth/reset-password') {
      const body = await readBody(request);
      if (!body.token || !body.password) return json(response, 400, { message: 'Reset token and new password are required.' });
      const passwordPolicy = validatePasswordPolicy(body.password);
      if (!passwordPolicy.ok) return json(response, 400, { message: passwordPolicy.message, failures: passwordPolicy.failures });
      const reset = (store.passwordResets || []).find((item) => item.token === body.token && item.status === 'issued');
      if (!reset || new Date(reset.expiresAt) <= new Date()) return json(response, 400, { message: 'Reset token expired or invalid.' });
      const user = usesNormalizedAuth() ? await findAuthUserById(reset.userId) : store.users.find((item) => item.id === reset.userId);
      if (!user) return json(response, 404, { message: 'User not found.' });
      const nextPasswordHash = hashPassword(body.password);
      if (usesNormalizedAuth()) {
        await updateAuthPassword(user.id, nextPasswordHash);
      } else {
        user.passwordHash = nextPasswordHash;
        user.updatedAt = new Date().toISOString();
      }
      reset.status = 'used';
      reset.usedAt = new Date().toISOString();
      audit(store, user.id, 'auth.password_reset_completed', 'user', user.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { ok: true, message: 'Password reset completed.' });
    }

    if (request.method === 'GET' && path === '/me') {
      const user = await getAccountAuth(request, store);
      if (!user) return json(response, 401, { message: 'Authentication required.' });
      return json(response, 200, { user: publicUser(user) });
    }

    if (request.method === 'PATCH' && path === '/me') {
      const body = await readBody(request);
      if (usesNormalizedAuth()) {
        const currentUser = await getAccountAuth(request, store);
        if (!currentUser) return json(response, 401, { message: 'Authentication required.' });
        const user = await updateAuthUser(currentUser.id, body);
        mirrorAuthUserToStore(store, user);
        await withStore((current) => Object.assign(current, store));
        return json(response, 200, { user: publicUser(user) });
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      Object.assign(user, {
        fullName: body.fullName ?? user.fullName,
        phone: body.phone ?? user.phone,
        city: body.city ?? user.city,
        notificationPreferences: body.notificationPreferences ?? user.notificationPreferences,
        updatedAt: new Date().toISOString(),
      });
      audit(store, user.id, 'auth.update_me', 'user', user.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { user: publicUser(user) });
    }

    if (request.method === 'GET' && path === '/verification/levels') {
      const user = await getAccountAuth(request, store);
      return json(response, 200, {
        levels: verificationLevels,
        currentLevel: getVerificationLevel(store, user),
        rules: {
          bid: 'kyc_verified',
          sell: 'kyc_verified',
          dealerTools: 'dealer_verified',
          bankAuction: 'bank_partner_verified',
          comment: 'email_phone_verified',
        },
      });
    }

    if (request.method === 'GET' && path === '/verification/me') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      return json(response, 200, {
        verificationLevel: getVerificationLevel(store, user),
        kycProfile: getKycProfile(store, user.id),
        privacy: getPrivacySettings(store, user.id),
        eligibility: ['bid', 'listing.create', 'auction.create', 'accessory.sell', 'dealer.tools', 'bank_auction.bid'].reduce((result, action) => {
          result[action] = canPerform(store, user, action);
          return result;
        }, {}),
      });
    }

    if (request.method === 'GET' && path === '/privacy/me') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      return json(response, 200, { privacy: getPrivacySettings(store, user.id), defaults: defaultPrivacySettings });
    }

    if (request.method === 'PATCH' && path === '/privacy/me') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const privacy = setPrivacySettings(store, user.id, body);
      audit(store, user.id, 'privacy.update', 'user', user.id, { changed: Object.keys(body || {}) });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { privacy });
    }

    if (request.method === 'POST' && path === '/eligibility/check') {
      const user = await getAccountAuth(request, store);
      const body = await readBody(request);
      return json(response, 200, { eligibility: canPerform(store, user, body.action, body.context || {}) });
    }

    const userProfileMatch = path.match(/^\/users\/([^/]+)$/);
    if (request.method === 'GET' && userProfileMatch) {
      const user = store.users.find((item) => String(item.id) === userProfileMatch[1] || String(item.username) === userProfileMatch[1]);
      if (!user) return json(response, 404, { message: 'User not found.' });
      const safeUser = publicProfileFor(store, user);
      const privacy = getPrivacySettings(store, user.id);
      return json(response, 200, {
        user: {
          ...safeUser,
          joinedCommunities: privacy.showCommunityHistory ? store.posts
            .filter((post) => post.authorId === user.id || post.author === user.fullName || post.author === user.username)
            .map((post) => post.forumId)
            .filter(Boolean) : [],
          postsCount: privacy.showCommunityHistory ? store.posts.filter((post) => post.authorId === user.id || post.author === user.fullName || post.author === user.username).length : undefined,
          commentsCount: privacy.showCommunityHistory ? store.posts.flatMap((post) => post.comments || []).filter((comment) => comment.authorId === user.id || comment.author === user.fullName || comment.author === user.username).length : undefined,
          listingsCount: store.listings.filter((listing) => String(listing.sellerId) === String(user.id)).length,
          garage: privacy.showGarage ? (store.ownedVehicles || []).filter((vehicle) => String(vehicle.userId) === String(user.id) && (!vehicle.archived || privacy.showArchivedVehicles)) : undefined,
        },
      });
    }

    if (request.method === 'GET' && path === '/dealers') {
      const city = url.searchParams.get('city');
      const verifiedOnly = url.searchParams.get('verifiedOnly') === 'true';
      const dealerUsers = store.users.filter((user) => (user.roles || []).includes('dealer'));
      const rawDealers = [...store.dealers, ...dealerUsers.filter((user) => !store.dealers.some((dealer) => String(dealer.userId || dealer.id) === String(user.id)))];
      const dealers = rawDealers
        .map((dealer) => buildDealerProfile(store, dealer))
        .filter((dealer) => !city || city === 'All' || dealer.city === city)
        .filter((dealer) => !verifiedOnly || dealer.verified)
        .sort((a, b) => Number(b.metrics.soldCars || 0) - Number(a.metrics.soldCars || 0));
      return json(response, 200, { dealers });
    }

    const dealerMatch = path.match(/^\/dealers\/([^/]+)$/);
    if (request.method === 'GET' && dealerMatch) {
      const dealer = store.dealers.find((item) => String(item.id) === dealerMatch[1] || String(item.userId) === dealerMatch[1])
        || store.users.find((user) => String(user.id) === dealerMatch[1] && (user.roles || []).includes('dealer'));
      if (!dealer) return json(response, 404, { message: 'Dealer not found.' });
      return json(response, 200, { dealer: buildDealerProfile(store, dealer) });
    }

    if (request.method === 'PATCH' && dealerMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const ownsDealerProfile = String(dealerMatch[1]) === String(user.id)
        || store.dealers.some((item) => String(item.id) === dealerMatch[1] && String(item.userId) === String(user.id));
      if (!ownsDealerProfile && !requireRole(user, response, ['admin', 'super_admin'])) return;
      const body = await readBody(request);
      let dealer = store.dealers.find((item) => String(item.id) === dealerMatch[1] || String(item.userId) === dealerMatch[1]);
      if (!dealer) {
        dealer = { id: createId('dealer'), userId: dealerMatch[1], createdAt: new Date().toISOString() };
        store.dealers.push(dealer);
      }
      Object.assign(dealer, body, { updatedAt: new Date().toISOString() });
      audit(store, user.id, 'dealer.update', 'dealer', dealer.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { dealer: buildDealerProfile(store, dealer) });
    }

    const dealerVerifyMatch = path.match(/^\/dealers\/([^/]+)\/verify$/);
    if (request.method === 'POST' && dealerVerifyMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      const body = await readBody(request);
      let dealer = store.dealers.find((item) => String(item.id) === dealerVerifyMatch[1] || String(item.userId) === dealerVerifyMatch[1]);
      if (!dealer) {
        dealer = { id: createId('dealer'), userId: dealerVerifyMatch[1], createdAt: new Date().toISOString() };
        store.dealers.push(dealer);
      }
      dealer.status = body.status || 'verified';
      dealer.verified = dealer.status === 'verified';
      dealer.reviewedBy = user.id;
      dealer.reviewedAt = new Date().toISOString();
      dealer.membership = dealer.membership || { plan: 'monthly_dealer', status: 'active', feePkr: 25000 };
      audit(store, user.id, 'dealer.verify', 'dealer', dealer.id, { status: dealer.status });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { dealer: buildDealerProfile(store, dealer) });
    }

    const dealerListingsMatch = path.match(/^\/dealers\/([^/]+)\/listings$/);
    if (request.method === 'GET' && dealerListingsMatch) {
      const listings = store.listings.filter((listing) => String(listing.sellerId) === dealerListingsMatch[1]);
      return json(response, 200, { listings });
    }

    const dealerReviewsMatch = path.match(/^\/dealers\/([^/]+)\/reviews$/);
    if (request.method === 'GET' && dealerReviewsMatch) {
      return json(response, 200, { reviews: store.dealerReviews.filter((review) => String(review.dealerId) === dealerReviewsMatch[1]) });
    }

    if (request.method === 'POST' && dealerReviewsMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const review = { id: createId('dealer_review'), dealerId: dealerReviewsMatch[1], userId: user.id, rating: Number(body.rating || 0), body: body.body || '', createdAt: new Date().toISOString() };
      store.dealerReviews.push(review);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { review });
    }

    if (request.method === 'POST' && path === '/auth/verify-phone') {
      if (usesNormalizedAuth()) {
        const currentUser = await getAccountAuth(request, store);
        if (!currentUser) return json(response, 401, { message: 'Authentication required.' });
        const user = await markAuthVerification(currentUser.id, 'phone');
        mirrorAuthUserToStore(store, user);
        await withStore((current) => Object.assign(current, store));
        return json(response, 200, { user: publicUser(user), message: 'Phone marked verified in dev mode.' });
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      user.phoneVerified = true;
      audit(store, user.id, 'auth.verify_phone', 'user', user.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { user: publicUser(user), message: 'Phone marked verified in dev mode.' });
    }

    if (request.method === 'POST' && path === '/auth/verify-email') {
      if (usesNormalizedAuth()) {
        const currentUser = await getAccountAuth(request, store);
        if (!currentUser) return json(response, 401, { message: 'Authentication required.' });
        const user = await markAuthVerification(currentUser.id, 'email');
        mirrorAuthUserToStore(store, user);
        await withStore((current) => Object.assign(current, store));
        return json(response, 200, { user: publicUser(user), message: 'Email marked verified in dev mode.' });
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      user.emailVerified = true;
      audit(store, user.id, 'auth.verify_email', 'user', user.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { user: publicUser(user), message: 'Email marked verified in dev mode.' });
    }

    if (request.method === 'GET' && path === '/wallet') {
      if (usesNormalizedWallet()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        return json(response, 200, { wallet: await getWalletSummary(user.id) });
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      return json(response, 200, { wallet: walletSummary(store, user.id) });
    }

    if (request.method === 'POST' && path === '/wallet/top-up-intent') {
      const body = await readBody(request);
      if (!Number(body.amount) || Number(body.amount) <= 0) return json(response, 400, { message: 'Valid top-up amount is required.' });

      if (usesNormalizedWallet()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        const result = await createTopUpIntent(user.id, Number(body.amount));
        return json(response, 201, result);
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      const wallet = ensureWallet(store, user.id);
      const intent = { id: createId('pay'), walletAccountId: wallet.id, provider: process.env.PAYMENT_PROVIDER || 'mock', amount: Number(body.amount), status: 'succeeded', createdAt: new Date().toISOString() };
      store.paymentIntents.push(intent);
      store.walletLedger.push({ id: createId('ledger'), walletAccountId: wallet.id, entryType: 'deposit', amount: intent.amount, referenceType: 'payment_intent', referenceId: intent.id, note: 'Wallet top-up', createdAt: new Date().toISOString() });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { intent, wallet: walletSummary(store, user.id) });
    }

    const walletWebhookMatch = path.match(/^\/wallet\/webhooks\/(payment|refund)$/);
    if (request.method === 'POST' && walletWebhookMatch) {
      const body = await readBody(request);
      try {
        const verification = await getPaymentProvider().verifyWebhook({ headers: request.headers, body });
        return json(response, 200, { received: true, webhookType: walletWebhookMatch[1], verification, provider: getPaymentProviderInfo() });
      } catch (error) {
        return json(response, 501, { message: error.message, provider: getPaymentProviderInfo() });
      }
    }

    if (request.method === 'POST' && path === '/wallet/withdrawal-request') {
      const body = await readBody(request);
      const amount = Number(body.amount);
      if (!amount || amount <= 0) return json(response, 400, { message: 'Valid withdrawal amount is required.' });

      if (usesNormalizedWallet()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        const result = await requestWithdrawal(user.id, amount, body.bankAccount);
        if (result.insufficient) return json(response, 400, { message: 'Withdrawal exceeds available wallet balance.', wallet: result.wallet });
        return json(response, 201, result);
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      const wallet = ensureWallet(store, user.id);
      const summary = walletSummary(store, user.id);
      if (summary.available < amount) return json(response, 400, { message: 'Withdrawal exceeds available wallet balance.' });
      const withdrawal = { id: createId('withdrawal'), walletAccountId: wallet.id, amount, status: 'processing', bankAccount: body.bankAccount || null, createdAt: new Date().toISOString() };
      store.walletLedger.push({ id: createId('ledger'), walletAccountId: wallet.id, entryType: 'withdrawal', amount: -amount, referenceType: 'withdrawal_request', referenceId: withdrawal.id, note: 'Withdrawal request', createdAt: withdrawal.createdAt });
      audit(store, user.id, 'wallet.withdrawal_request', 'wallet', wallet.id, { amount });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { withdrawal, wallet: walletSummary(store, user.id) });
    }

    if (request.method === 'GET' && path === '/wallet/transactions') {
      if (usesNormalizedWallet()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        return json(response, 200, { transactions: (await getWalletSummary(user.id)).transactions });
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      return json(response, 200, { transactions: walletSummary(store, user.id).transactions });
    }

    if (request.method === 'GET' && path === '/wallet/holds') {
      if (usesNormalizedWallet()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        return json(response, 200, { holds: (await getWalletSummary(user.id)).holds });
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      return json(response, 200, { holds: walletSummary(store, user.id).holds });
    }

    const walletHoldActionMatch = path.match(/^\/wallet\/holds\/([^/]+)\/(release|forfeit)$/);
    if (request.method === 'POST' && walletHoldActionMatch) {
      if (usesNormalizedWallet()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        const status = walletHoldActionMatch[2] === 'release' ? 'released' : 'forfeited';
        const result = await updateHoldStatus(user.id, walletHoldActionMatch[1], status);
        if (!result.hold) return json(response, 404, { message: 'Deposit hold not found.' });
        return json(response, 200, result);
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      const hold = store.depositHolds.find((item) => item.id === walletHoldActionMatch[1]);
      if (!hold) return json(response, 404, { message: 'Deposit hold not found.' });
      hold.status = walletHoldActionMatch[2] === 'release' ? 'released' : 'forfeited';
      hold.updatedAt = new Date().toISOString();
      audit(store, user.id, `wallet.hold_${walletHoldActionMatch[2]}`, 'deposit_hold', hold.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { hold, wallet: walletSummary(store, user.id) });
    }

    if (request.method === 'GET' && path === '/orders') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (usesNormalizedEngagement()) return json(response, 200, { orders: await listOrders(user.id) });
      return json(response, 200, { orders: store.orders.filter((order) => order.buyerId === user.id || order.sellerId === user.id) });
    }

    if (request.method === 'POST' && path === '/orders') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (usesNormalizedEngagement()) {
        const order = await createOrder(user.id, body);
        return json(response, 201, { order });
      }
      const order = {
        id: createId('order'),
        buyerId: user.id,
        sellerId: body.sellerId || null,
        listingId: body.listingId || null,
        accessoryId: body.accessoryId || null,
        checkoutCaseId: body.checkoutCaseId || null,
        orderType: body.orderType || 'vehicle',
        status: body.status || 'created',
        amount: Number(body.amount || 0),
        currency: body.currency || 'PKR',
        metadata: body.metadata || {},
        createdAt: new Date().toISOString(),
      };
      store.orders.push(order);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { order });
    }

    const orderActionMatch = path.match(/^\/orders\/([^/]+)\/(confirm|schedule|ready|complete|dispute|cancel)$/);
    if (request.method === 'POST' && orderActionMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const [, orderId, action] = orderActionMatch;
      const statusMap = {
        confirm: 'seller_confirmed',
        schedule: 'scheduled',
        ready: 'ready_for_pickup_install',
        complete: 'completed',
        dispute: 'disputed',
        cancel: 'cancelled',
      };

      if (usesNormalizedEngagement()) {
        const order = await updateOrderWorkflow(user.id, orderId, {
          status: body.status || statusMap[action],
          action,
          note: body.note,
          pickupSlot: body.pickupSlot || body.slot,
          metadata: body.metadata,
        });
        if (!order) return json(response, 404, { message: 'Order not found.' });
        return json(response, 200, { order });
      }

      const order = store.orders.find((item) => String(item.id) === String(orderId));
      if (!order) return json(response, 404, { message: 'Order not found.' });
      if (order.sellerId && order.sellerId !== user.id && order.buyerId !== user.id && !user.roles?.includes('admin')) {
        return json(response, 403, { message: 'You cannot update this order.' });
      }
      order.status = body.status || statusMap[action];
      order.metadata = {
        ...(order.metadata || {}),
        ...(body.metadata || {}),
        sellerNote: body.note || order.metadata?.sellerNote,
        pickupSlot: body.pickupSlot || body.slot || order.metadata?.pickupSlot,
        timeline: [
          ...(order.metadata?.timeline || []),
          { action, actorId: user.id, note: body.note || null, createdAt: new Date().toISOString() },
        ],
      };
      order.updatedAt = new Date().toISOString();
      audit(store, user.id, `order.${action}`, 'order', order.id, { status: order.status });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { order });
    }

    if (request.method === 'GET' && (path === '/inspection-bookings' || path === '/inspections/bookings')) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (usesNormalizedEngagement()) return json(response, 200, { bookings: await listInspectionBookings(user.id) });
      return json(response, 200, { bookings: store.inspectionBookings.filter((booking) => booking.buyerId === user.id) });
    }

    if (request.method === 'POST' && (path === '/inspection-bookings' || path === '/inspections/bookings')) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (usesNormalizedEngagement()) {
        const booking = await createInspectionBooking(user.id, body);
        return json(response, 201, { booking });
      }
      const booking = {
        id: createId('inspection'),
        buyerId: user.id,
        listingId: body.listingId || null,
        packageType: body.packageType || 'basic',
        city: body.city || null,
        address: body.address || null,
        scheduledAt: body.scheduledAt || null,
        status: 'requested',
        price: Number(body.price || 0),
        createdAt: new Date().toISOString(),
      };
      store.inspectionBookings.push(booking);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { booking });
    }

    if (request.method === 'GET' && path === '/notifications') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (usesNormalizedEngagement()) return json(response, 200, { notifications: await listNotifications(user.id) });
      return json(response, 200, { notifications: store.notifications.filter((notification) => !notification.userId || notification.userId === user.id) });
    }

    if (request.method === 'POST' && path === '/notifications/read-all') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (usesNormalizedEngagement()) return json(response, 200, { notifications: await markAllNormalizedNotificationsRead(user.id) });
      store.notifications.forEach((notification) => {
        if (!notification.userId || notification.userId === user.id) Object.assign(notification, { read: true, readAt: new Date().toISOString() });
      });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { notifications: store.notifications.filter((notification) => !notification.userId || notification.userId === user.id) });
    }

    const notificationReadMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
    if (request.method === 'POST' && notificationReadMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (usesNormalizedEngagement()) return json(response, 200, { notifications: await markNormalizedNotificationRead(user.id, notificationReadMatch[1]) });
      const notification = store.notifications.find((item) => String(item.id) === notificationReadMatch[1] && (!item.userId || item.userId === user.id));
      if (!notification) return json(response, 404, { message: 'Notification not found.' });
      Object.assign(notification, { read: true, readAt: new Date().toISOString() });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { notification });
    }

    if (request.method === 'GET' && path === '/conversations') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (usesNormalizedEngagement()) return json(response, 200, { conversations: await listConversations(user.id) });
      return json(response, 200, { conversations: store.conversations.filter((conversation) => conversation.buyerId === user.id || conversation.sellerId === user.id || conversation.userId === user.id) });
    }

    if (request.method === 'POST' && path === '/conversations') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (usesNormalizedEngagement()) {
        const conversation = await createNormalizedConversation(user.id, body);
        return json(response, 201, { conversation: await getConversation(user.id, conversation.id) });
      }
      const conversation = {
        id: createId('conversation'),
        listingId: body.listingId || null,
        buyerId: user.id,
        sellerId: body.sellerId || null,
        status: 'open',
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        messages: body.body ? [{ id: createId('message'), senderId: user.id, body: body.body, createdAt: new Date().toISOString() }] : [],
      };
      store.conversations.push(conversation);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { conversation });
    }

    const conversationMatch = path.match(/^\/conversations\/([^/]+)$/);
    if (request.method === 'GET' && conversationMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (usesNormalizedEngagement()) {
        const conversation = await getConversation(user.id, conversationMatch[1]);
        if (!conversation) return json(response, 404, { message: 'Conversation not found.' });
        return json(response, 200, { conversation });
      }
      const conversation = store.conversations.find((item) => String(item.id) === conversationMatch[1] && (item.buyerId === user.id || item.sellerId === user.id || item.userId === user.id));
      if (!conversation) return json(response, 404, { message: 'Conversation not found.' });
      return json(response, 200, { conversation });
    }

    const conversationActionMatch = path.match(/^\/conversations\/([^/]+)\/(read|report|block)$/);
    if (request.method === 'POST' && conversationActionMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const action = conversationActionMatch[2];
      if (usesNormalizedEngagement()) {
        const conversation = action === 'read'
          ? await markNormalizedConversationRead(user.id, conversationActionMatch[1])
          : await updateConversationStatus(user.id, conversationActionMatch[1], action === 'block' ? 'blocked' : 'reported');
        if (!conversation) return json(response, 404, { message: 'Conversation not found.' });
        return json(response, 200, { conversation });
      }
      const conversation = store.conversations.find((item) => String(item.id) === conversationActionMatch[1] && (item.buyerId === user.id || item.sellerId === user.id || item.userId === user.id));
      if (!conversation) return json(response, 404, { message: 'Conversation not found.' });
      if (action === 'read') conversation.messages = (conversation.messages || []).map((message) => message.senderId === user.id ? message : { ...message, readAt: new Date().toISOString() });
      if (action === 'report') conversation.status = 'reported';
      if (action === 'block') conversation.status = 'blocked';
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { conversation });
    }

    const conversationMessagesMatch = path.match(/^\/conversations\/([^/]+)\/messages$/);
    if (request.method === 'POST' && conversationMessagesMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (!body.body) return json(response, 400, { message: 'Message body is required.' });
      if (usesNormalizedEngagement()) {
        const message = await sendNormalizedMessage(user.id, conversationMessagesMatch[1], body.body);
        if (!message) return json(response, 404, { message: 'Conversation not found.' });
        return json(response, 201, { message });
      }
      const conversation = store.conversations.find((item) => String(item.id) === conversationMessagesMatch[1] && (item.buyerId === user.id || item.sellerId === user.id || item.userId === user.id));
      if (!conversation) return json(response, 404, { message: 'Conversation not found.' });
      const message = { id: createId('message'), senderId: user.id, body: body.body, createdAt: new Date().toISOString() };
      conversation.messages = [...(conversation.messages || []), message];
      conversation.lastMessageAt = message.createdAt;
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { message, conversation });
    }

    if (request.method === 'GET' && path === '/forums') {
      if (usesNormalizedEngagement()) return json(response, 200, { forums: await listForums() });
      return json(response, 200, { forums: store.forums });
    }

    if (request.method === 'POST' && path === '/forums') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (!body.slug || !body.name) return json(response, 400, { message: 'Forum slug and name are required.' });
      if (usesNormalizedEngagement()) return json(response, 201, { forum: await createNormalizedForum(body) });
      const forum = { id: createId('forum'), slug: body.slug, name: body.name, description: body.description || null, createdBy: user.id, createdAt: new Date().toISOString() };
      const existing = store.forums.find((item) => item.slug === forum.slug);
      if (existing) Object.assign(existing, forum);
      else store.forums.push(forum);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { forum: existing || forum });
    }

    const forumPostsMatch = path.match(/^\/forums\/([^/]+)\/posts$/);
    if (request.method === 'GET' && forumPostsMatch) {
      if (usesNormalizedEngagement()) return json(response, 200, { posts: await listPosts(forumPostsMatch[1]) });
      const forumId = decodeURIComponent(forumPostsMatch[1]);
      return json(response, 200, { posts: store.posts.filter((post) => String(post.forumId) === forumId || post.forumSlug === forumId || post.category === forumId) });
    }

    if (request.method === 'GET' && path === '/posts') {
      if (usesNormalizedEngagement()) return json(response, 200, { posts: await listPosts() });
      return json(response, 200, { posts: store.posts });
    }

    if (request.method === 'POST' && path === '/posts') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (!body.title || !body.body) return json(response, 400, { message: 'Post title and body are required.' });
      if (usesNormalizedEngagement()) {
        const post = await createNormalizedPost(user.id, body);
        return json(response, 201, { post });
      }
      const post = {
        id: createId('post'),
        forumId: body.forumId || body.forumSlug || 'general',
        forumSlug: body.forumSlug || body.forumId || 'general',
        authorId: user.id,
        listingId: body.listingId || null,
        title: body.title,
        body: body.body,
        votes: 0,
        reportsCount: 0,
        comments: [],
        createdAt: new Date().toISOString(),
      };
      store.posts.unshift(post);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { post });
    }

    const postMatch = path.match(/^\/posts\/([^/]+)$/);
    if (request.method === 'GET' && postMatch) {
      if (usesNormalizedEngagement()) {
        const post = await getNormalizedPost(postMatch[1]);
        if (!post) return json(response, 404, { message: 'Post not found.' });
        return json(response, 200, { post });
      }
      const post = store.posts.find((item) => String(item.id) === postMatch[1]);
      if (!post) return json(response, 404, { message: 'Post not found.' });
      return json(response, 200, { post });
    }

    const postActionMatch = path.match(/^\/posts\/([^/]+)\/(vote|save|report)$/);
    if (request.method === 'POST' && postActionMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const action = postActionMatch[2];
      if (usesNormalizedEngagement()) {
        if (action === 'vote') {
          const post = await voteNormalizedPost(postActionMatch[1], body.delta || 1);
          if (!post) return json(response, 404, { message: 'Post not found.' });
          return json(response, 200, { post });
        }
        if (action === 'save') return json(response, 200, { savedPost: await saveNormalizedPost(user.id, postActionMatch[1], body.saved !== false) });
        const post = await reportNormalizedPost(postActionMatch[1]);
        if (!post) return json(response, 404, { message: 'Post not found.' });
        return json(response, 200, { post });
      }
      const post = store.posts.find((item) => String(item.id) === postActionMatch[1]);
      if (!post) return json(response, 404, { message: 'Post not found.' });
      if (action === 'vote') post.votes = Number(post.votes || 0) + Number(body.delta || 1);
      if (action === 'save') post.savedBy = body.saved === false ? (post.savedBy || []).filter((id) => id !== user.id) : Array.from(new Set([...(post.savedBy || []), user.id]));
      if (action === 'report') post.reportsCount = Number(post.reportsCount || 0) + 1;
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { post, saved: action === 'save' ? body.saved !== false : undefined });
    }

    const postCommentsMatch = path.match(/^\/posts\/([^/]+)\/comments$/);
    if (request.method === 'POST' && postCommentsMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (!body.body) return json(response, 400, { message: 'Comment body is required.' });
      if (usesNormalizedEngagement()) {
        const comment = await addNormalizedComment(user.id, postCommentsMatch[1], body);
        return json(response, 201, { comment });
      }
      const post = store.posts.find((item) => String(item.id) === postCommentsMatch[1]);
      if (!post) return json(response, 404, { message: 'Post not found.' });
      const comment = { id: createId('comment'), postId: post.id, parentCommentId: body.parentCommentId || null, authorId: user.id, body: body.body, votes: 0, createdAt: new Date().toISOString() };
      post.comments = [...(post.comments || []), comment];
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { comment });
    }

    const commentActionMatch = path.match(/^\/comments\/([^/]+)\/(vote|replies|best-answer)$/);
    if (commentActionMatch) {
      const needsAuth = request.method === 'POST';
      const user = needsAuth ? await requireAccountAuth(request, store, response) : null;
      if (needsAuth && !user) return;
      const body = needsAuth ? await readBody(request) : {};
      const action = commentActionMatch[2];
      if (usesNormalizedEngagement()) {
        if (request.method === 'GET' && action === 'replies') return json(response, 200, { replies: await listNormalizedReplies(commentActionMatch[1]) });
        if (request.method === 'POST' && action === 'vote') {
          const comment = await voteNormalizedComment(commentActionMatch[1], body.delta || 1);
          if (!comment) return json(response, 404, { message: 'Comment not found.' });
          return json(response, 200, { comment });
        }
        if (request.method === 'POST' && action === 'best-answer') {
          const comment = await markNormalizedBestAnswer(commentActionMatch[1], body.isBestAnswer !== false);
          if (!comment) return json(response, 404, { message: 'Comment not found.' });
          return json(response, 200, { comment });
        }
      }
      const comments = store.posts.flatMap((post) => post.comments || []);
      if (request.method === 'GET' && action === 'replies') return json(response, 200, { replies: comments.filter((comment) => String(comment.parentCommentId) === commentActionMatch[1]) });
      const comment = comments.find((item) => String(item.id) === commentActionMatch[1]);
      if (!comment) return json(response, 404, { message: 'Comment not found.' });
      if (request.method === 'POST' && action === 'vote') comment.votes = Number(comment.votes || 0) + Number(body.delta || 1);
      if (request.method === 'POST' && action === 'best-answer') comment.isBestAnswer = body.isBestAnswer !== false;
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { comment });
    }

    if (request.method === 'GET' && path === '/articles') {
      const category = url.searchParams.get('category');
      const status = url.searchParams.get('status') || 'published';
      const featured = url.searchParams.get('featured');
      const q = String(url.searchParams.get('q') || '').toLowerCase();
      const articles = store.editorialArticles
        .filter((article) => !status || article.status === status)
        .filter((article) => !category || category === 'All' || article.category === category)
        .filter((article) => featured === null || String(Boolean(article.featured)) === featured)
        .filter((article) => !q || `${article.title} ${article.deck} ${article.category} ${(article.tags || []).join(' ')}`.toLowerCase().includes(q))
        .map((article) => publicArticle(store, article))
        .sort((a, b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0));
      return json(response, 200, { articles, writers: store.editorialWriters });
    }

    if (request.method === 'GET' && path === '/articles/drafts') {
      const user = requireAuth(request, store, response);
      if (!user) return;
      if (!canWriteEditorial(user)) return json(response, 403, { message: 'Verified writer access required.' });
      const articles = store.editorialArticles
        .filter((article) => canEditEditorial(user) || String(article.authorId) === String(user.id))
        .map((article) => publicArticle(store, article));
      return json(response, 200, { articles });
    }

    if (request.method === 'POST' && path === '/articles') {
      const user = requireAuth(request, store, response);
      if (!user) return;
      if (!canWriteEditorial(user)) return json(response, 403, { message: 'Verified writer access required.' });
      const body = await readBody(request);
      if (!body.title || !body.deck || !body.body) return json(response, 400, { message: 'Title, deck, and body are required.' });
      const writer = store.editorialWriters.find((item) => String(item.userId) === String(user.id) || String(item.id) === String(body.authorId));
      const article = {
        id: createId('article'),
        slug: body.slug ? slugifyArticle(body.slug) : slugifyArticle(body.title),
        title: String(body.title).slice(0, 180),
        deck: String(body.deck).slice(0, 500),
        category: body.category || 'Market News',
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 8) : [],
        authorId: writer?.id || user.id,
        authorName: writer?.name || user.fullName || user.username || user.email || 'Verified writer',
        authorRole: writer?.role || 'Verified Writer',
        status: body.status || 'draft',
        featured: Boolean(body.featured),
        heroImage: body.heroImage || 'https://placehold.co/1200x640/0f172a/ffffff?text=Wheels+and+Deals+News',
        readMinutes: Math.max(1, Number(body.readMinutes) || Math.ceil(String(Array.isArray(body.body) ? body.body.join(' ') : body.body).split(/\s+/).length / 220)),
        body: Array.isArray(body.body) ? body.body : String(body.body).split(/\n{2,}/).filter(Boolean),
        views: 0,
        likes: 0,
        bookmarks: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: body.status === 'published' ? new Date().toISOString() : null,
      };
      store.editorialArticles.unshift(article);
      audit(store, user.id, 'article.create', 'article', article.id, { status: article.status });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { article: publicArticle(store, article) });
    }

    const articleStatusMatch = path.match(/^\/articles\/([^/]+)\/status$/);
    if (request.method === 'PATCH' && articleStatusMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      if (!canEditEditorial(user)) return json(response, 403, { message: 'Editor or admin access required.' });
      const body = await readBody(request);
      const article = store.editorialArticles.find((item) => String(item.id) === articleStatusMatch[1] || item.slug === articleStatusMatch[1]);
      if (!article) return json(response, 404, { message: 'Article not found.' });
      article.status = body.status || article.status;
      article.featured = body.featured === undefined ? article.featured : Boolean(body.featured);
      article.editorNotes = body.editorNotes || article.editorNotes || null;
      article.updatedAt = new Date().toISOString();
      if (article.status === 'published' && !article.publishedAt) article.publishedAt = new Date().toISOString();
      audit(store, user.id, 'article.status.update', 'article', article.id, { status: article.status });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { article: publicArticle(store, article) });
    }

    const articleMatch = path.match(/^\/articles\/([^/]+)$/);
    if (request.method === 'GET' && articleMatch) {
      const article = store.editorialArticles.find((item) => item.slug === articleMatch[1] || String(item.id) === articleMatch[1]);
      if (!article || article.status !== 'published') return json(response, 404, { message: 'Article not found.' });
      article.views = Number(article.views || 0) + 1;
      const comments = store.editorialComments.filter((comment) => String(comment.articleId) === String(article.id));
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { article: publicArticle(store, article), comments });
    }

    const articleActionMatch = path.match(/^\/articles\/([^/]+)\/(like|bookmark|comments)$/);
    if (articleActionMatch) {
      const article = store.editorialArticles.find((item) => item.slug === articleActionMatch[1] || String(item.id) === articleActionMatch[1]);
      if (!article) return json(response, 404, { message: 'Article not found.' });
      const action = articleActionMatch[2];
      if (request.method === 'POST' && action === 'like') {
        article.likes = Number(article.likes || 0) + 1;
        await withStore((current) => Object.assign(current, store));
        return json(response, 200, { article: publicArticle(store, article) });
      }
      if (request.method === 'POST' && action === 'bookmark') {
        article.bookmarks = Number(article.bookmarks || 0) + 1;
        await withStore((current) => Object.assign(current, store));
        return json(response, 200, { article: publicArticle(store, article) });
      }
      if (request.method === 'GET' && action === 'comments') {
        return json(response, 200, { comments: store.editorialComments.filter((comment) => String(comment.articleId) === String(article.id)) });
      }
      if (request.method === 'POST' && action === 'comments') {
        const user = requireAuth(request, store, response);
        if (!user) return;
        const body = await readBody(request);
        if (!body.body) return json(response, 400, { message: 'Comment body is required.' });
        const comment = {
          id: createId('article_comment'),
          articleId: article.id,
          userId: user.id,
          userName: user.fullName || user.username || user.email || 'Reader',
          body: String(body.body).slice(0, 1200),
          status: 'published',
          createdAt: new Date().toISOString(),
        };
        store.editorialComments.push(comment);
        await withStore((current) => Object.assign(current, store));
        return json(response, 201, { comment });
      }
    }

    if (request.method === 'GET' && path === '/faq') {
      return json(response, 200, { faqs: store.faqs });
    }

    const faqMatch = path.match(/^\/faq\/([^/]+)$/);
    if (request.method === 'GET' && faqMatch) {
      const faq = store.faqs.find((item) => String(item.id) === faqMatch[1] || item.slug === faqMatch[1]);
      if (!faq) return json(response, 404, { message: 'FAQ item not found.' });
      return json(response, 200, { faq });
    }

    if (request.method === 'GET' && path === '/trust/kyc-profile') {
      const user = requireAuth(request, store, response);
      if (!user) return;
      return json(response, 200, { kycProfile: store.kycProfiles.find((profile) => profile.userId === user.id) || null });
    }

    if (request.method === 'POST' && path === '/trust/kyc-documents') {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      let profile = store.kycProfiles.find((item) => item.userId === user.id);
      if (!profile) {
        profile = { id: createId('kyc'), userId: user.id, status: 'pending', documents: [] };
        store.kycProfiles.push(profile);
      }
      profile.status = 'pending';
      const documentRecord = {
        id: createId('doc'),
        profileId: profile.id,
        userId: user.id,
        documentType: body.documentType,
        mediaAssetId: body.mediaAssetId,
        status: 'pending',
        visibility: 'private',
        createdAt: new Date().toISOString(),
      };
      profile.documents.push(documentRecord);
      store.verificationDocuments.push({ ...documentRecord });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { kycProfile: profile });
    }

    if (request.method === 'GET' && path === '/kyc/me') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const profile = getKycProfile(store, user.id);
      return json(response, 200, {
        kycProfile: profile || null,
        verificationLevel: getVerificationLevel(store, user),
        acceptedDocuments: acceptedVerificationDocuments,
        providerInfo: kycProviderInfo(),
        securityNotice: 'Identity media is private, admin-only, and never exposed on public profile APIs.',
      });
    }

    if (request.method === 'POST' && path === '/kyc/submit') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (!body.consentAccepted) return json(response, 400, { message: 'KYC consent is required before document review.' });
      let profile = store.kycProfiles.find((item) => String(item.userId) === String(user.id));
      if (!profile) {
        profile = { id: createId('kyc'), userId: user.id, documents: [], createdAt: new Date().toISOString() };
        store.kycProfiles.push(profile);
      }
      const documents = Array.isArray(body.documents) ? body.documents : [];
      const allowedTypes = acceptedVerificationDocuments;
      const sanitizedDocuments = documents
        .filter((document) => allowedTypes.includes(document.documentType))
        .map((document) => ({
          id: document.id || createId('kyc_doc'),
          profileId: profile.id,
          userId: user.id,
          documentType: document.documentType,
          mediaAssetId: document.mediaAssetId || null,
          status: 'pending',
          visibility: 'private',
          createdAt: new Date().toISOString(),
        }));
      profile.status = 'pending';
      profile.provider = body.provider || 'manual_review';
      profile.consentAccepted = true;
      profile.consentTextVersion = body.consentTextVersion || 'kyc-consent-v1';
      profile.consentAcceptedAt = new Date().toISOString();
      profile.rejectionReason = null;
      profile.reviewNote = null;
      profile.nextAction = null;
      profile.reviewStatus = 'pending_review';
      profile.documents = [...(profile.documents || []), ...sanitizedDocuments];
      sanitizedDocuments.forEach((document) => {
        const existing = store.verificationDocuments.find((item) => String(item.id) === String(document.id));
        if (!existing) store.verificationDocuments.push({ ...document });
      });
      profile.updatedAt = new Date().toISOString();
      store.userVerifications.push({
        id: createId('verification'),
        userId: user.id,
        verificationType: 'kyc',
        status: 'pending_review',
        provider: profile.provider,
        consentTextVersion: profile.consentTextVersion,
        consentAcceptedAt: profile.consentAcceptedAt,
        createdAt: new Date().toISOString(),
      });
      audit(store, user.id, 'kyc.submit', 'kyc_profile', profile.id, { documents: sanitizedDocuments.map((doc) => doc.documentType) });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { kycProfile: profile, verificationLevel: getVerificationLevel(store, user) });
    }

    if (request.method === 'GET' && path === '/listings') {
      if (usesNormalizedCatalog()) {
        const listings = await listNormalizedListings(url.searchParams);
        if (listings.length) return json(response, 200, { listings });
      }

      const listings = store.listings.filter((listing) => matchesSearch(listing, url.searchParams));
      return json(response, 200, { listings });
    }

    if (request.method === 'POST' && path === '/listings') {
      if (usesNormalizedCatalog()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        if (!requireRole(user, response, ['seller', 'dealer', 'admin', 'super_admin'])) return;
        if (!requireCapability(store, user, response, 'listing.create')) return;
        const body = await readBody(request);
        if (!body.year || !body.make || !body.model || !body.city) return json(response, 400, { message: 'Year, make, model, and city are required.' });
        const listing = await createNormalizedListing(user.id, body);
        return json(response, 201, { listing });
      }

      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['seller', 'dealer', 'admin', 'super_admin'])) return;
      if (!requireCapability(store, user, response, 'listing.create')) return;
      const body = await readBody(request);
      if (!body.make || !body.model || !body.city) return json(response, 400, { message: 'Make, model, and city are required.' });
      const listing = {
        id: createId('listing'),
        sellerId: user.id,
        status: 'draft',
        listingType: body.listingType || 'classified',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...body,
      };
      const quality = listingQuality(listing);
      listing.qualityScore = quality.score;
      listing.qualityMissing = quality.missing;
      store.listings.push(listing);
      audit(store, user.id, 'listing.create', 'listing', listing.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { listing });
    }

    const listingMatch = path.match(/^\/listings\/([^/]+)$/);
    if (request.method === 'GET' && listingMatch) {
      if (usesNormalizedCatalog()) {
        const listing = await getNormalizedListing(listingMatch[1]);
        if (listing) return json(response, 200, { listing });
      }

      const listing = store.listings.find((item) => String(item.id) === listingMatch[1]);
      if (!listing) return json(response, 404, { message: 'Listing not found.' });
      return json(response, 200, { listing });
    }

    if (request.method === 'PATCH' && listingMatch) {
      if (usesNormalizedCatalog()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        if (!requireRole(user, response, ['seller', 'dealer', 'admin', 'super_admin'])) return;
        if (!requireCapability(store, user, response, 'auction.create')) return;
        const body = await readBody(request);
        const listing = await updateNormalizedListing(listingMatch[1], body);
        if (listing) return json(response, 200, { listing });
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      const listing = store.listings.find((item) => String(item.id) === listingMatch[1]);
      if (!listing) return json(response, 404, { message: 'Listing not found.' });
      const body = await readBody(request);
      Object.assign(listing, body, { updatedAt: new Date().toISOString() });
      const quality = listingQuality(listing);
      listing.qualityScore = quality.score;
      listing.qualityMissing = quality.missing;
      audit(store, user.id, 'listing.update', 'listing', listing.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { listing });
    }

    const listingPublishMatch = path.match(/^\/listings\/([^/]+)\/(publish|archive|report)$/);
    if (request.method === 'POST' && listingPublishMatch) {
      if (usesNormalizedCatalog() && listingPublishMatch[2] !== 'report') {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        const listing = await setNormalizedListingStatus(listingPublishMatch[1], listingPublishMatch[2] === 'publish' ? 'published' : 'archived');
        if (listing) return json(response, 200, { listing });
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      const listing = store.listings.find((item) => String(item.id) === listingPublishMatch[1]);
      if (!listing) return json(response, 404, { message: 'Listing not found.' });
      const action = listingPublishMatch[2];
      if (action === 'report') {
        const body = await readBody(request);
        const report = { id: createId('report'), reporterId: user.id, listingId: listing.id, reason: body.reason || 'unspecified', status: 'open', createdAt: new Date().toISOString() };
        store.reports.push(report);
        await withStore((current) => Object.assign(current, store));
        return json(response, 201, { report });
      }
      listing.status = action === 'publish' ? 'published' : 'archived';
      listing.updatedAt = new Date().toISOString();
      audit(store, user.id, `listing.${action}`, 'listing', listing.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { listing });
    }

    if (request.method === 'GET' && path === '/auctions') {
      if (usesNormalizedCatalog()) {
        const auctions = await listNormalizedAuctions(url.searchParams);
        if (auctions.length) return json(response, 200, { auctions });
      }

      const auctions = store.auctions.map((auction) => serializeAuction(store, auction));
      return json(response, 200, { auctions });
    }

    if (request.method === 'POST' && path === '/auctions') {
      if (usesNormalizedCatalog()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        const body = await readBody(request);
        if (!body.listingId) return json(response, 400, { message: 'Listing id is required.' });
        const auction = await createNormalizedAuction(body);
        return json(response, 201, { auction });
      }

      return json(response, 501, { message: 'Auction creation is available in Postgres mode or through seller submissions.' });
    }

    const auctionMatch = path.match(/^\/auctions\/([^/]+)$/);
    if (request.method === 'GET' && auctionMatch) {
      if (usesNormalizedCatalog()) {
        const auction = await getNormalizedAuction(auctionMatch[1]);
        if (auction) return json(response, 200, { auction });
      }

      const auction = store.auctions.find((item) => String(item.id) === auctionMatch[1]);
      if (!auction) return json(response, 404, { message: 'Auction not found.' });
      return json(response, 200, { auction: serializeAuction(store, auction) });
    }

    const auctionBidsGetMatch = path.match(/^\/auctions\/([^/]+)\/bids$/);
    if (request.method === 'GET' && auctionBidsGetMatch) {
      if (usesNormalizedCatalog()) {
        const bids = await listNormalizedAuctionBids(auctionBidsGetMatch[1]);
        if (bids.length) return json(response, 200, { bids });
      }

      return json(response, 200, { bids: bidAuditEvents(store, auctionBidsGetMatch[1]) });
    }

    const auctionActionMatch = path.match(/^\/auctions\/([^/]+)\/(start|pause|reopen|end|extend)$/);
    if (request.method === 'POST' && auctionActionMatch) {
      if (usesNormalizedCatalog()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        const body = await readBody(request);
        const action = auctionActionMatch[2];
        const currentAuction = await getNormalizedAuction(auctionActionMatch[1]);
        if (!currentAuction) return json(response, 404, { message: 'Auction not found.' });
        const transition = getAuctionTransition(currentAuction.status, action);
        if (!transition.ok) return json(response, 409, { message: transition.message, auction: currentAuction });
        const patch = {};
        if (action === 'reopen') patch.endsAt = new Date(Date.now() + Number(body.minutes || 1440) * 60000).toISOString();
        if (action === 'extend') patch.endsAt = new Date(Date.now() + Number(body.minutes || 30) * 60000).toISOString();
        if (action === 'start' && !currentAuction.startsAt) patch.startsAt = new Date().toISOString();
        let nextStatus = transition.nextStatus;
        if (action === 'end') {
          const reserveMet = Number(currentAuction.highBid || 0) >= Number(currentAuction.reservePrice || Infinity);
          patch.winnerId = reserveMet ? currentAuction.lastBidderId : null;
          nextStatus = reserveMet && currentAuction.lastBidderId ? transition.nextStatus : 'expired';
        }
        const auction = await setNormalizedAuctionStatus(auctionActionMatch[1], nextStatus, { ...patch, action: nextStatus === 'expired' ? 'expire' : action });
        if (auction) {
          const eventType = action === 'end' ? 'auction.ended' : action === 'extend' ? 'auction.extended' : 'auction.updated';
          publishEvent(`auction:${auction.id}`, eventType, { auction, action });
          if (action === 'end' && auction.winnerId) publishEvent(`auction:${auction.id}`, 'auction.winner_selected', { auction, winnerId: auction.winnerId });
          return json(response, 200, { auction, transition: { action, from: currentAuction.status, to: nextStatus } });
        }
      }

      return json(response, 404, { message: 'Auction not found.' });
    }

    const auctionWatchMatch = path.match(/^\/auctions\/([^/]+)\/watch$/);
    if (request.method === 'POST' && auctionWatchMatch) {
      const body = await readBody(request);
      const user = await getAccountAuth(request, store);
      if (usesNormalizedCatalog()) {
        const auction = await registerAuctionWatcher({
          auctionId: auctionWatchMatch[1],
          userId: user?.id,
          anonymousId: body.anonymousId || request.headers['x-client-id'] || request.socket.remoteAddress,
        });
        if (!auction) return json(response, 404, { message: 'Auction not found.' });
        publishEvent(`auction:${auction.id}`, 'auction.joined', { auctionId: auction.id, watchersCount: auction.watchersCount, userId: user?.id || null });
        return json(response, 200, { auction, watchersCount: auction.watchersCount });
      }

      const auction = store.auctions.find((item) => String(item.id) === auctionWatchMatch[1]);
      if (!auction) return json(response, 404, { message: 'Auction not found.' });
      const watcherId = user?.id || body.anonymousId || request.headers['x-client-id'] || request.socket.remoteAddress || createId('anon');
      auction.watchers = Array.from(new Set([...(auction.watchers || []), watcherId]));
      auction.spectators = auction.watchers.length;
      await withStore((current) => Object.assign(current, store));
      publishEvent(`auction:${auction.id}`, 'auction.joined', { auctionId: auction.id, watchersCount: auction.spectators, userId: user?.id || null });
      return json(response, 200, { auction, watchersCount: auction.spectators });
    }

    const auctionBidMatch = path.match(/^\/auctions\/([^/]+)\/bids$/);
    if (request.method === 'POST' && auctionBidMatch) {
      let bidBody;
      if (usesNormalizedWallet()) {
        const user = await getAccountAuth(request, store);
        if (!user) return json(response, 401, { message: 'Authentication required.' });
        if (!requireCapability(store, user, response, 'bid')) return;
        bidBody = await readBody(request);
        const amount = Number(bidBody.amount);
        const result = await placeAuctionBid({
          auctionId: auctionBidMatch[1],
          bidderId: user.id,
          amount,
          ipAddress: request.socket.remoteAddress,
          userAgent: request.headers['user-agent'],
          idempotencyKey: request.headers['idempotency-key'] || bidBody.idempotencyKey,
        });

        if (!result.notFound) {
          if (result.error) return json(response, result.status || 400, { message: result.error, requiredDeposit: result.requiredDeposit });
          if (result.duplicate) return json(response, 200, result);
          publishEvent(`auction:${result.auction.id}`, 'auction.bid_placed', { auction: result.auction, bid: result.bid });
          publishEvent(`auction:${result.auction.id}`, 'auction.updated', { auction: result.auction, reason: 'bid_placed' });
          if (Number(result.auction.highBid || 0) >= Number(result.auction.reservePrice || Infinity)) {
            publishEvent(`auction:${result.auction.id}`, 'auction.reserve_met', { auction: result.auction });
          }
          publishEvent('global', 'auction.bid_placed', { auction: result.auction, bid: result.bid });
          return json(response, 201, result);
        }

        // Transition fallback: seed auctions still live in the app-state snapshot.
        mirrorAuthUserToStore(store, user);
        await withStore((current) => Object.assign(current, store));
      }

      const user = requireAuth(request, store, response);
      if (!user) return;
      if (!requireCapability(store, user, response, 'bid')) return;
      const auction = store.auctions.find((item) => item.id === auctionBidMatch[1]);
      if (!auction) return json(response, 404, { message: 'Auction not found.' });

      const body = bidBody || await readBody(request);
      const amount = Number(body.amount);
      const policy = getAuctionBidPolicy(auction);
      if (!policy.isLive) {
        audit(store, user.id, 'auction.bid_rejected', 'auction', auction.id, { reason: policy.isPastEnd ? 'auction_ended' : 'not_live', amount });
        await withStore((current) => Object.assign(current, store));
        return json(response, policy.isPastEnd ? 409 : 404, { message: policy.isPastEnd ? 'Auction has ended.' : 'Live auction not found.' });
      }
      if (String(auction.lastBidderId || '') === String(user.id)) {
        audit(store, user.id, 'auction.bid_rejected', 'auction', auction.id, { reason: 'already_highest_bidder', amount });
        await withStore((current) => Object.assign(current, store));
        return json(response, 409, { message: 'You are already the highest bidder.' });
      }
      const idempotencyKey = request.headers['idempotency-key'] || body.idempotencyKey;
      if (idempotencyKey) {
        const duplicateBid = store.bids.find((bid) => bid.auctionId === auction.id && bid.bidderId === user.id && bid.idempotencyKey === idempotencyKey);
        if (duplicateBid) return json(response, 200, { duplicate: true, bid: duplicateBid, auction });
      }
      const minimumBid = policy.minimumBid;
      if (!amount || amount < minimumBid) return json(response, 400, { message: `Minimum bid is ${minimumBid}.` });

      const wallet = ensureWallet(store, user.id);
      const summary = walletSummary(store, user.id);
      const requiredDeposit = Math.max(policy.minimumDeposit, Math.ceil(amount * policy.requiredDepositRatio));
      if (summary.available < requiredDeposit) return json(response, 402, { message: 'Insufficient available deposit.', requiredDeposit });

      store.depositHolds = store.depositHolds.filter((hold) => !(hold.walletAccountId === wallet.id && hold.auctionId === auction.id && hold.status === 'locked'));
      store.depositHolds.push({ id: createId('hold'), walletAccountId: wallet.id, auctionId: auction.id, amount: requiredDeposit, status: 'locked', createdAt: new Date().toISOString() });

      const bid = { id: createId('bid'), auctionId: auction.id, bidderId: user.id, amount, status: 'accepted', idempotencyKey: idempotencyKey || null, createdAt: new Date().toISOString() };
      store.bids.push(bid);
      auction.highBid = amount;
      auction.lastBidderId = user.id;
      auction.bidsCount = Number(auction.bidsCount || 0) + 1;
      const remainingMs = new Date(auction.endsAt).getTime() - Date.now();
      if (remainingMs > 0 && remainingMs <= 120000) {
        auction.endsAt = new Date(Date.now() + 120000).toISOString();
        auction.extensionsCount = Number(auction.extensionsCount || 0) + 1;
      }
      await withStore((current) => Object.assign(current, store));
      publishEvent(`auction:${auction.id}`, 'auction.bid_placed', { auction, bid });
      publishEvent(`auction:${auction.id}`, 'auction.updated', { auction, reason: 'bid_placed' });
      if (Number(auction.highBid || 0) >= Number(auction.reservePrice || Infinity)) {
        publishEvent(`auction:${auction.id}`, 'auction.reserve_met', { auction });
      }
      if (remainingMs > 0 && remainingMs <= 120000) {
        publishEvent(`auction:${auction.id}`, 'auction.extended', { auction, seconds: 120 });
      }
      publishEvent('global', 'auction.bid_placed', { auction, bid });
      return json(response, 201, { bid, auction, requiredDeposit });
    }

    if (request.method === 'GET' && path === '/search/listings') {
      const user = getAuth(request, store);
      try {
        const external = await searchExternalListings(url.searchParams);
        if (external) {
          if (user) {
            if (usesNormalizedRecommendations()) {
              await recordRecommendationEvent(user.id, {
                eventType: 'search',
                metadata: { query: Object.fromEntries(url.searchParams.entries()), resultCount: external.listings.length, provider: external.provider },
              });
            } else {
              recordJsonRecommendationEvent(store, user.id, {
                eventType: 'search',
                metadata: { query: Object.fromEntries(url.searchParams.entries()), resultCount: external.listings.length, provider: external.provider },
              });
              await withStore((current) => Object.assign(current, store));
            }
          }
          return json(response, 200, {
            listings: external.listings,
            query: Object.fromEntries(url.searchParams.entries()),
            search: { ...searchProviderInfo(), provider: external.provider, external: true },
            index: external.raw,
          });
        }
      } catch (error) {
        if (url.searchParams.get('strictProvider') === 'true') return json(response, 502, { message: error.message, search: searchProviderInfo() });
      }
      if (usesNormalizedCatalog()) {
        const listings = await listNormalizedListings(url.searchParams);
        if (usesNormalizedRecommendations() && user) {
          await recordRecommendationEvent(user.id, {
            eventType: 'search',
            metadata: { query: Object.fromEntries(url.searchParams.entries()), resultCount: listings.length },
          });
        }
        if (listings.length) {
          const recommendationStore = usesNormalizedRecommendations()
            ? await buildRecommendationStoreFromEvents(listings, user?.id)
            : { listings, auctions: [], bids: [] };
          return json(response, 200, {
            listings: rankListingsAi(recommendationStore, { ...Object.fromEntries(url.searchParams.entries()), userId: user?.id }),
            query: Object.fromEntries(url.searchParams.entries()),
            search: searchProviderInfo(),
            index: { indexedDocuments: listings.length, provider: searchProviderInfo() },
          });
        }
      }

      const listings = searchListings(store.listings, url.searchParams);
      if (user) {
        recordJsonRecommendationEvent(store, user.id, {
          eventType: 'search',
          metadata: { query: Object.fromEntries(url.searchParams.entries()), resultCount: listings.length },
        });
        await withStore((current) => Object.assign(current, store));
      }
      return json(response, 200, buildSearchIndexResponse(store, listings, url.searchParams, user?.id));
    }

    if (request.method === 'POST' && path === '/search/reindex') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const listings = usesNormalizedCatalog() ? await listNormalizedListings(new URLSearchParams()) : store.listings;
      try {
        const result = await indexExternalListings(listings);
        audit(store, user.id, 'search.reindex', 'search_index', result.provider, result);
        await withStore((current) => Object.assign(current, store));
        return json(response, 200, { ...result, search: searchProviderInfo() });
      } catch (error) {
        return json(response, 502, { message: error.message, search: searchProviderInfo() });
      }
    }

    if (request.method === 'GET' && path === '/search/auctions') {
      const user = getAuth(request, store);
      if (usesNormalizedCatalog()) {
        const auctions = await listNormalizedAuctions(url.searchParams);
        if (auctions.length) {
          if (usesNormalizedRecommendations() && user) {
            await recordRecommendationEvent(user.id, {
              eventType: 'auction_search',
              metadata: { query: Object.fromEntries(url.searchParams.entries()), resultCount: auctions.length },
            });
          }
          return json(response, 200, { auctions, query: Object.fromEntries(url.searchParams.entries()), search: searchProviderInfo() });
        }
      }

      const auctions = store.auctions
        .map((auction) => serializeAuction(store, auction))
        .filter((auction) => searchListings([auction.listing || auction], url.searchParams).length || matchesSearch(auction, url.searchParams));
      if (user) {
        recordJsonRecommendationEvent(store, user.id, {
          eventType: 'auction_search',
          metadata: { query: Object.fromEntries(url.searchParams.entries()), resultCount: auctions.length },
        });
        await withStore((current) => Object.assign(current, store));
      }
      return json(response, 200, { auctions, query: Object.fromEntries(url.searchParams.entries()), search: searchProviderInfo() });
    }

    if (request.method === 'GET' && path === '/search/suggestions') {
      const term = (url.searchParams.get('q') || '').toLowerCase();
      const suggestions = store.listings
        .flatMap((listing) => [listing.make, listing.model, listing.variant, listing.city, listing.bodyStyle])
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .filter((value) => !term || String(value).toLowerCase().includes(term))
        .slice(0, 10);
      return json(response, 200, { suggestions });
    }

    if (request.method === 'GET' && path === '/search/facets') {
      if (usesNormalizedCatalog()) {
        const listings = await listNormalizedListings(url.searchParams);
        if (listings.length) return json(response, 200, { facets: buildFacets(listings), search: searchProviderInfo() });
      }
      return json(response, 200, { facets: buildFacets(store.listings), search: searchProviderInfo() });
    }

    if (request.method === 'POST' && path === '/saved-searches') {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (usesNormalizedRecommendations()) {
        await recordRecommendationEvent(user.id, { eventType: 'saved_search', metadata: { query: body.query || body, name: body.name || 'Saved search' } });
      }
      const savedSearch = { id: createId('search'), userId: user.id, name: body.name || 'Saved search', query: body.query || body, createdAt: new Date().toISOString() };
      store.savedSearches.push(savedSearch);
      recordJsonRecommendationEvent(store, user.id, { eventType: 'saved_search', metadata: savedSearch });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { savedSearch });
    }

    if (request.method === 'GET' && path === '/saved-searches') {
      const user = requireAuth(request, store, response);
      if (!user) return;
      return json(response, 200, { savedSearches: store.savedSearches.filter((item) => item.userId === user.id) });
    }

    if (request.method === 'GET' && path === '/recommendations/home') {
      const user = getAuth(request, store);
      if (usesNormalizedCatalog()) {
        const listings = await listNormalizedListings(url.searchParams);
        const recommendationStore = usesNormalizedRecommendations()
          ? await buildRecommendationStoreFromEvents(listings, user?.id)
          : { listings, auctions: [], bids: [] };
        return json(response, 200, {
          model: 'hybrid_content_collaborative',
          source: usesNormalizedRecommendations() ? 'postgres_events' : 'postgres_catalog',
          recommendations: rankListingsAi(recommendationStore, { ...Object.fromEntries(url.searchParams.entries()), userId: user?.id }).slice(0, 12),
        });
      }
      return json(response, 200, {
        model: 'hybrid_content_collaborative',
        source: 'json_events',
        recommendations: rankListingsAi(store, Object.fromEntries(url.searchParams.entries())).slice(0, 12),
      });
    }

    if (request.method === 'GET' && path === '/recommendations/auctions') {
      const user = getAuth(request, store);
      if (usesNormalizedCatalog()) {
        const auctions = await listNormalizedAuctions(url.searchParams);
        const auctionListings = auctions.map((auction) => ({ ...auction.listing, auction })).filter((item) => item.id);
        const recommendationStore = usesNormalizedRecommendations()
          ? await buildRecommendationStoreFromEvents(auctionListings, user?.id)
          : { listings: auctionListings, auctions, bids: [] };
        return json(response, 200, {
          model: 'hybrid_content_collaborative',
          source: usesNormalizedRecommendations() ? 'postgres_events' : 'postgres_catalog',
          recommendations: rankListingsAi(recommendationStore, { ...Object.fromEntries(url.searchParams.entries()), userId: user?.id }).slice(0, 12),
        });
      }
      const auctionListings = store.auctions
        .map((auction) => ({ ...store.listings.find((listing) => String(listing.id) === String(auction.listingId)), auction }))
        .filter((item) => item.id);
      return json(response, 200, {
        model: 'hybrid_content_collaborative',
        recommendations: rankListingsAi({ ...store, listings: auctionListings }, Object.fromEntries(url.searchParams.entries())).slice(0, 12),
      });
    }

    const similarMatch = path.match(/^\/recommendations\/similar\/([^/]+)$/);
    if (request.method === 'GET' && similarMatch) {
      const similar = similarListings(store, similarMatch[1]);
      if (!similar) return json(response, 404, { message: 'Listing not found.' });
      return json(response, 200, { recommendations: similar });
    }

    if (request.method === 'GET' && path === '/recommendations/deals') {
      const deals = store.listings
        .map((listing) => ({ ...listing, ...aiDealScore(listing) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      return json(response, 200, { deals });
    }

    if (request.method === 'POST' && path === '/recommendations/feedback') {
      const user = getAuth(request, store);
      const body = await readBody(request);
      if (usesNormalizedRecommendations()) {
        const event = await recordRecommendationEvent(user?.id || null, {
          ...body,
          eventType: body.eventType || body.action || 'feedback',
          metadata: body.metadata || body,
        });
        return json(response, 201, { feedback: event, event });
      }
      const feedback = { id: createId('recfb'), userId: user?.id || null, ...body, createdAt: new Date().toISOString() };
      store.recommendationFeedback.push(feedback);
      recordJsonRecommendationEvent(store, user?.id || null, { ...body, eventType: body.eventType || body.action || 'feedback' });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { feedback });
    }

    if (request.method === 'POST' && path === '/recommendations/events') {
      const user = getAuth(request, store);
      const body = await readBody(request);
      if (usesNormalizedRecommendations()) {
        const event = await recordRecommendationEvent(user?.id || body.userId || null, body);
        return json(response, 201, { event });
      }
      const event = recordJsonRecommendationEvent(store, user?.id || body.userId || null, body);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { event });
    }

    if (request.method === 'GET' && path === '/recommendations/events') {
      const user = getAuth(request, store);
      if (usesNormalizedRecommendations()) {
        return json(response, 200, { events: await listRecommendationEvents({ userId: user?.id || url.searchParams.get('userId'), listingId: url.searchParams.get('listingId') }) });
      }
      const events = store.recommendationEvents
        .filter((event) => !user?.id || event.userId === user.id)
        .filter((event) => !url.searchParams.get('listingId') || String(event.listingId) === String(url.searchParams.get('listingId')))
        .slice(0, 200);
      return json(response, 200, { events });
    }

    if (request.method === 'POST' && path === '/recommendations/rebuild-model') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const modelVersion = body.modelVersion || 'default';
      const listings = usesNormalizedCatalog() ? await listNormalizedListings(new URLSearchParams()) : store.listings;
      const recommendationStore = usesNormalizedRecommendations()
        ? await buildRecommendationStoreFromEvents(listings, null)
        : store;
      const ranked = rankListingsAi({ ...recommendationStore, listings }, { modelVersion });
      if (usesNormalizedRecommendations()) {
        const result = await saveRecommendationModelItems(modelVersion, ranked);
        return json(response, 200, { ...result, model: 'hybrid_content_collaborative' });
      }
      store.recommendationModel = {
        modelVersion,
        rebuiltAt: new Date().toISOString(),
        items: ranked.map((listing) => ({
          listingId: listing.id,
          hybridScore: listing.hybridScore || listing.aiMatchScore || listing.recommendationScore,
          contentScore: listing.contentScore || 0,
          collaborativeScore: listing.collaborativeScore || 0,
          reasons: listing.aiReasons || [],
        })),
      };
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { modelVersion, indexed: store.recommendationModel.items.length, model: 'hybrid_content_collaborative' });
    }

    if (request.method === 'GET' && path === '/recommendations/model') {
      const modelVersion = url.searchParams.get('modelVersion') || 'default';
      if (usesNormalizedRecommendations()) {
        return json(response, 200, { modelVersion, items: await listRecommendationModelItems(modelVersion, url.searchParams.get('limit')) });
      }
      return json(response, 200, { modelVersion, items: store.recommendationModel?.items || [] });
    }

    if (request.method === 'GET' && path === '/ai/features') {
      return json(response, 200, aiFeatureSet(store));
    }

    if (request.method === 'GET' && path === '/ai/recommendations/personalized') {
      const profile = Object.fromEntries(url.searchParams.entries());
      const user = getAuth(request, store);
      if (usesNormalizedCatalog()) {
        const listings = await listNormalizedListings(url.searchParams);
        const recommendationStore = usesNormalizedRecommendations()
          ? await buildRecommendationStoreFromEvents(listings, user?.id)
          : { listings, auctions: [], bids: [] };
        return json(response, 200, {
          model: 'hybrid_content_collaborative',
          source: usesNormalizedRecommendations() ? 'postgres_events' : 'postgres_catalog',
          weights: user ? { content: 0.68, collaborative: 0.32 } : { content: 0.82, collaborative: 0.18 },
          recommendations: rankListingsAi(recommendationStore, { ...profile, userId: user?.id }).slice(0, 12),
          profile,
        });
      }
      if (user) {
        profile.userId = user.id;
        profile.watchlist = store.recommendationEvents?.filter((item) => item.userId === user.id && ['watch', 'save', 'watchlist'].includes(item.eventType)).map((item) => item.listingId) || [];
        profile.recentlyViewed = store.recommendationEvents?.filter((item) => item.userId === user.id && ['view', 'click'].includes(item.eventType)).map((item) => item.listingId) || [];
      }
      return json(response, 200, {
        model: 'hybrid_content_collaborative',
        weights: profile.userId || profile.watchlist?.length || profile.recentlyViewed?.length
          ? { content: 0.68, collaborative: 0.32 }
          : { content: 0.82, collaborative: 0.18 },
        recommendations: rankListingsAi(store, profile).slice(0, 12),
        profile,
      });
    }

    const priceEstimateMatch = path.match(/^\/ai\/listings\/([^/]+)\/price-estimate$/);
    if (request.method === 'POST' && priceEstimateMatch) {
      const listing = store.listings.find((item) => String(item.id) === priceEstimateMatch[1]);
      if (!listing) return json(response, 404, { message: 'Listing not found.' });
      return json(response, 200, { estimate: predictVehiclePrice({ ...listing, ...(await readBody(request)) }, store) });
    }

    if (request.method === 'GET' && path === '/ai/price-model/status') {
      return json(response, 200, {
        model: pakistanValuationModel.name,
        market: pakistanValuationModel.market,
        currency: pakistanValuationModel.currency,
        trainedStatus: pakistanValuationModel.trainedStatus,
        appListingRows: store.listings.filter((item) => estimatePrice(item).mid || item.askingPrice || item.marketEstimate).length,
        anchorRows: pakistanValuationModel.anchorRows.length,
        featureWeights: pakistanValuationModel.featureWeights,
      });
    }

    if (request.method === 'POST' && path === '/ai/price-prediction') {
      const body = await readBody(request);
      const listing = body.listingId
        ? store.listings.find((item) => String(item.id) === String(body.listingId))
        : null;
      if (body.listingId && !listing) return json(response, 404, { message: 'Listing not found.' });
      return json(response, 200, {
        estimate: predictVehiclePrice({ ...(listing || {}), ...body }, store),
      });
    }

    const dealScoreMatch = path.match(/^\/ai\/listings\/([^/]+)\/deal-score$/);
    if (request.method === 'GET' && dealScoreMatch) {
      const listing = store.listings.find((item) => String(item.id) === dealScoreMatch[1]);
      if (!listing) return json(response, 404, { message: 'Listing not found.' });
      return json(response, 200, { deal: aiDealScore(listing) });
    }

    const aiSimilarMatch = path.match(/^\/ai\/listings\/([^/]+)\/similar$/);
    if (request.method === 'GET' && aiSimilarMatch) {
      const recommendations = similarListings(store, aiSimilarMatch[1]);
      if (!recommendations) return json(response, 404, { message: 'Listing not found.' });
      return json(response, 200, { recommendations: recommendations.slice(0, 8) });
    }

    if (request.method === 'POST' && path === '/ai/listings/quality-score') {
      const body = await readBody(request);
      return json(response, 200, { quality: listingQuality(body) });
    }

    if (request.method === 'POST' && path === '/ai/listings/fraud-check') {
      const body = await readBody(request);
      return json(response, 200, fraudRisk(body));
    }

    if (request.method === 'POST' && path === '/ai/search/natural-language') {
      const body = await readBody(request);
      const interpretedQuery = parseNaturalSearch(body.query || body.q || '');
      const listings = rankListingsAi(store, { ...body, ...interpretedQuery }).slice(0, 12);
      return json(response, 200, { model: 'hybrid_content_collaborative', listings, interpretedQuery });
    }

    const auctionAiMatch = path.match(/^\/ai\/auctions\/([^/]+)\/(win-probability|bid-timing|strategy)$/);
    if (request.method === 'GET' && auctionAiMatch) {
      const signals = auctionSignals(store, auctionAiMatch[1]);
      if (!signals) return json(response, 404, { message: 'Auction not found.' });
      const feature = auctionAiMatch[2];
      if (feature === 'win-probability') return json(response, 200, { winProbability: signals.winProbability, heat: signals.heat, auction: signals.auction });
      if (feature === 'bid-timing') return json(response, 200, { timing: signals.timing, advice: signals.advice, heat: signals.heat });
      return json(response, 200, { strategy: signals });
    }

    if (request.method === 'POST' && path === '/ai/community/summarize-thread') {
      const body = await readBody(request);
      let post = body.post;
      let comments = body.comments || [];
      if (!post && body.postId) {
        post = store.posts.find((item) => String(item.id) === String(body.postId));
        comments = post?.comments || [];
      }
      return json(response, 200, { summary: summarizeThread({ post, comments }) });
    }

    if (request.method === 'POST' && path === '/ai/community/moderation') {
      const body = await readBody(request);
      return json(response, 200, { moderation: moderateText(body.text || body.body || body.title || '') });
    }

    if (request.method === 'POST' && path === '/ai/inspections/insight') {
      const body = await readBody(request);
      return json(response, 200, { insight: inspectionInsight(body) });
    }

    if (request.method === 'POST' && path === '/ai/seller/pricing-coach') {
      const body = await readBody(request);
      return json(response, 200, { coach: sellerPricingCoach(body) });
    }

    if (request.method === 'GET' && path === '/accessories') {
      const vehicle = url.searchParams.get('garage')
        ? JSON.parse(url.searchParams.get('garage'))
        : null;
      const accessories = store.accessories.filter((item) => {
        const category = url.searchParams.get('category');
        const fitsGarage = url.searchParams.get('fitsGarage') === 'true';
        return matchesSearch(item, url.searchParams) &&
          (!category || category === 'All' || item.category === category) &&
          (!fitsGarage || accessoryFits(item, store.accessoryFitments, vehicle));
      }).map((item) => buildAccessoryProduct(store, item));
      return json(response, 200, { accessories });
    }

    if (request.method === 'POST' && path === '/accessories') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireCapability(store, user, response, 'accessory.sell')) return;
      const body = await readBody(request);
      if (!body.name || !body.category || !body.price) return json(response, 400, { message: 'Name, category, and price are required.' });
      const accessory = {
        id: createId('accessory'),
        sellerId: user.id,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...body,
      };
      store.accessories.push(accessory);
      (body.fitments || []).forEach((fitment) => store.accessoryFitments.push({ id: createId('fitment'), accessoryId: accessory.id, ...fitment }));
      audit(store, user.id, 'accessory.create', 'accessory', accessory.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { accessory });
    }

    const accessoryReviewsMatch = path.match(/^\/accessories\/([^/]+)\/reviews$/);
    if (request.method === 'GET' && accessoryReviewsMatch) {
      const accessory = store.accessories.find((item) => String(item.id) === accessoryReviewsMatch[1]);
      if (!accessory) return json(response, 404, { message: 'Accessory not found.' });
      const reviews = accessoryReviewsFor(store, accessory.id);
      return json(response, 200, { reviews, summary: accessoryReviewSummary(reviews) });
    }

    if (request.method === 'POST' && accessoryReviewsMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const accessory = store.accessories.find((item) => String(item.id) === accessoryReviewsMatch[1]);
      if (!accessory) return json(response, 404, { message: 'Accessory not found.' });
      const body = await readBody(request);
      const rating = validateRating(body.rating);
      if (!rating) return json(response, 400, { message: 'Rating must be between 1 and 5.' });
      const review = {
        id: createId('accessory_review'),
        accessoryId: accessory.id,
        userId: user.id,
        userName: user.fullName || user.username || user.email || 'Verified user',
        rating,
        title: String(body.title || '').trim().slice(0, 120),
        body: String(body.body || '').trim().slice(0, 2000),
        fitmentConfirmed: Boolean(body.fitmentConfirmed),
        serviceContext: String(body.serviceContext || '').trim().slice(0, 120),
        helpfulCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.accessoryReviews.push(review);
      audit(store, user.id, 'accessory.review.create', 'accessory', accessory.id, { reviewId: review.id, rating });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { review, summary: accessoryReviewSummary(accessoryReviewsFor(store, accessory.id)) });
    }

    const accessoryReviewHelpfulMatch = path.match(/^\/accessories\/([^/]+)\/reviews\/([^/]+)\/helpful$/);
    if (request.method === 'POST' && accessoryReviewHelpfulMatch) {
      const review = store.accessoryReviews.find((item) => String(item.accessoryId) === accessoryReviewHelpfulMatch[1] && String(item.id) === accessoryReviewHelpfulMatch[2]);
      if (!review) return json(response, 404, { message: 'Review not found.' });
      review.helpfulCount = Number(review.helpfulCount || 0) + 1;
      review.updatedAt = new Date().toISOString();
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { review });
    }

    const accessoryQuestionsMatch = path.match(/^\/accessories\/([^/]+)\/questions$/);
    if (request.method === 'GET' && accessoryQuestionsMatch) {
      const accessory = store.accessories.find((item) => String(item.id) === accessoryQuestionsMatch[1]);
      if (!accessory) return json(response, 404, { message: 'Accessory not found.' });
      return json(response, 200, { questions: accessoryQuestionsFor(store, accessory.id) });
    }

    if (request.method === 'POST' && accessoryQuestionsMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const accessory = store.accessories.find((item) => String(item.id) === accessoryQuestionsMatch[1]);
      if (!accessory) return json(response, 404, { message: 'Accessory not found.' });
      const body = await readBody(request);
      const questionText = String(body.question || body.body || '').trim();
      if (questionText.length < 8) return json(response, 400, { message: 'Question must be at least 8 characters.' });
      const question = {
        id: createId('accessory_question'),
        accessoryId: accessory.id,
        userId: user.id,
        userName: user.fullName || user.username || user.email || 'Buyer',
        question: questionText.slice(0, 1000),
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.accessoryQuestions.push(question);
      audit(store, user.id, 'accessory.question.create', 'accessory', accessory.id, { questionId: question.id });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { question });
    }

    const accessoryAnswerMatch = path.match(/^\/accessories\/([^/]+)\/questions\/([^/]+)\/answer$/);
    if (request.method === 'POST' && accessoryAnswerMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const accessory = store.accessories.find((item) => String(item.id) === accessoryAnswerMatch[1]);
      if (!accessory) return json(response, 404, { message: 'Accessory not found.' });
      const canAnswer = String(accessory.sellerId) === String(user.id) || ['admin', 'super_admin', 'dealer', 'seller'].some((role) => (user.roles || []).includes(role));
      if (!canAnswer) return json(response, 403, { message: 'Only the owner, seller, dealer, or admin can answer product questions.' });
      const question = store.accessoryQuestions.find((item) => String(item.accessoryId) === accessoryAnswerMatch[1] && String(item.id) === accessoryAnswerMatch[2]);
      if (!question) return json(response, 404, { message: 'Question not found.' });
      const body = await readBody(request);
      const answer = String(body.answer || '').trim();
      if (answer.length < 3) return json(response, 400, { message: 'Answer is required.' });
      Object.assign(question, {
        answer: answer.slice(0, 1600),
        answeredBy: user.id,
        answeredByName: user.fullName || user.username || user.email || 'Seller',
        answeredAt: new Date().toISOString(),
        status: 'answered',
        updatedAt: new Date().toISOString(),
      });
      audit(store, user.id, 'accessory.question.answer', 'accessory', accessory.id, { questionId: question.id });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { question });
    }

    const accessoryMatch = path.match(/^\/accessories\/([^/]+)$/);
    if (request.method === 'GET' && accessoryMatch) {
      const accessory = store.accessories.find((item) => String(item.id) === accessoryMatch[1]);
      if (!accessory) return json(response, 404, { message: 'Accessory not found.' });
      return json(response, 200, { accessory: buildAccessoryProduct(store, accessory), fitments: store.accessoryFitments.filter((item) => item.accessoryId === accessory.id) });
    }

    if (request.method === 'POST' && path === '/media/upload-intent') {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const validation = validateMediaRequest(body);
      if (!validation.ok) return json(response, 400, { message: validation.errors[0], errors: validation.errors });
      const intent = getMediaProvider().createUploadIntent({ ...body, ownerId: user.id });
      const { asset } = intent;
      asset.attachments = body.listingId ? [{ entityType: 'listing', entityId: body.listingId, sortOrder: body.sortOrder || 0, isCover: Boolean(body.isCover) }] : [];
      if (usesNormalizedMedia()) {
        const normalizedAsset = await createMediaAsset(asset);
        if (body.listingId) {
          await attachNormalizedListingMedia({ listingId: body.listingId, mediaAssetId: normalizedAsset.id, sortOrder: body.sortOrder || 0, isCover: Boolean(body.isCover) });
        }
        return json(response, 201, { ...intent, asset: normalizedAsset });
      }
      store.mediaAssets.push(asset);
      if (body.listingId) {
        store.listingMedia.push({ id: createId('listing_media'), listingId: body.listingId, mediaAssetId: asset.id, sortOrder: Number(body.sortOrder || 0), isCover: Boolean(body.isCover), createdAt: new Date().toISOString() });
      }
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, intent);
    }

    if (request.method === 'GET' && path === '/media/processing') {
      return json(response, 200, getMediaProcessingInfo());
    }

    const localUploadMatch = path.match(/^\/media\/local-upload\/([^/]+)$/);
    if (request.method === 'PUT' && localUploadMatch) {
      let asset = usesNormalizedMedia()
        ? await getMediaAsset(localUploadMatch[1])
        : store.mediaAssets.find((item) => item.id === localUploadMatch[1]);
      if (!asset) return json(response, 404, { message: 'Media asset not found.' });
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      const validation = validateMediaRequest({ fileName: asset.fileName, mimeType: asset.mimeType, purpose: asset.purpose, sizeBytes: bytes.length });
      if (!validation.ok) return json(response, 400, { message: validation.errors[0], errors: validation.errors });
      await writeLocalMediaObject(asset, bytes);
      asset.uploadStatus = 'uploaded';
      asset.sizeBytes = bytes.length;
      asset.uploadedAt = new Date().toISOString();
      asset.processingStatus = 'uploaded_waiting_completion';
      if (usesNormalizedMedia()) {
        asset = await updateMediaAsset(asset.id, asset);
        return json(response, 200, { asset });
      }
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { asset });
    }

    if (request.method === 'POST' && path === '/media/complete') {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      let asset = usesNormalizedMedia()
        ? await getMediaAsset(body.mediaAssetId || body.id)
        : store.mediaAssets.find((item) => item.id === body.mediaAssetId || item.id === body.id);
      if (!asset) return json(response, 404, { message: 'Media asset not found.' });
      if (!['uploaded', 'completed'].includes(asset.uploadStatus)) return json(response, 409, { message: 'Upload bytes must be received before completion.' });
      const processingPlan = buildMediaProcessingPlan(asset);
      asset.uploadStatus = 'completed';
      asset.completedAt = new Date().toISOString();
      asset.moderationStatus = asset.visibility === 'public' ? 'pending' : 'private_verified_pending';
      asset.processingStatus = processingPlan.processingStatus;
      asset.scanStatus = processingPlan.scanStatus;
      asset.exifStatus = processingPlan.exifStatus;
      asset.thumbnails = processingPlan.thumbnails;
      asset.renditions = processingPlan.renditions;
      asset.metadata = { ...(asset.metadata || {}), processingWarnings: processingPlan.warnings };
      if (usesNormalizedMedia()) {
        asset = await updateMediaAsset(asset.id, asset);
        return json(response, 200, { asset, processing: processingPlan });
      }
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { asset, processing: processingPlan });
    }

    const mediaContentMatch = path.match(/^\/media\/([^/]+)\/content$/);
    if (request.method === 'GET' && mediaContentMatch) {
      const asset = usesNormalizedMedia()
        ? await getMediaAsset(mediaContentMatch[1])
        : store.mediaAssets.find((item) => item.id === mediaContentMatch[1]);
      if (!asset) return json(response, 404, { message: 'Media asset not found.' });
      if (asset.visibility !== 'public') {
        const user = requireAuth(request, store, response);
        if (!user) return;
        if (asset.ownerId !== user.id && !user.roles?.some((role) => ['admin', 'super_admin', 'moderator'].includes(role))) {
          return json(response, 403, { message: 'You cannot access this private media asset.' });
        }
      }
      try {
        if (asset.bucket !== 'local-dev' && asset.url && asset.visibility === 'public') {
          response.writeHead(302, { Location: asset.url, 'Access-Control-Allow-Origin': getCorsOrigin(request) });
          return response.end();
        }
        const bytes = await readLocalMediaObject(asset);
        response.writeHead(200, {
          'Content-Type': asset.mimeType || 'application/octet-stream',
          'Content-Length': bytes.length,
          'Cache-Control': asset.visibility === 'public' ? 'public, max-age=86400' : 'no-store',
          'Access-Control-Allow-Origin': getCorsOrigin(request),
          'X-Content-Type-Options': 'nosniff',
        });
        return response.end(bytes);
      } catch (error) {
        return json(response, 404, { message: 'Media object not found on storage provider.' });
      }
    }

    const mediaMatch = path.match(/^\/media\/([^/]+)$/);
    if (request.method === 'GET' && mediaMatch) {
      const asset = usesNormalizedMedia()
        ? await getMediaAsset(mediaMatch[1])
        : store.mediaAssets.find((item) => item.id === mediaMatch[1]);
      if (!asset) return json(response, 404, { message: 'Media asset not found.' });
      return json(response, 200, { asset });
    }

    if (request.method === 'DELETE' && mediaMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const asset = usesNormalizedMedia()
        ? await getMediaAsset(mediaMatch[1])
        : store.mediaAssets.find((item) => item.id === mediaMatch[1]);
      if (!asset) return json(response, 404, { message: 'Media asset not found.' });
      if (asset.ownerId !== user.id && !user.roles?.some((role) => ['admin', 'super_admin', 'moderator'].includes(role))) {
        return json(response, 403, { message: 'You cannot delete this media asset.' });
      }
      await deleteLocalMediaObject(asset);
      if (usesNormalizedMedia()) {
        await deleteNormalizedMediaAsset(asset.id);
        return json(response, 200, { ok: true });
      }
      store.mediaAssets = store.mediaAssets.filter((item) => item.id !== asset.id);
      store.listingMedia = store.listingMedia.filter((item) => item.mediaAssetId !== asset.id);
      audit(store, user.id, 'media.delete', 'media_asset', asset.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { ok: true });
    }

    const mediaModerateMatch = path.match(/^\/media\/([^/]+)\/moderate$/);
    if (request.method === 'POST' && mediaModerateMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      let asset = usesNormalizedMedia()
        ? await getMediaAsset(mediaModerateMatch[1])
        : store.mediaAssets.find((item) => item.id === mediaModerateMatch[1]);
      if (!asset) return json(response, 404, { message: 'Media asset not found.' });
      asset.moderationStatus = body.status || 'approved';
      asset.moderationNotes = body.notes || null;
      asset.moderatedBy = user.id;
      asset.moderatedAt = new Date().toISOString();
      asset.processingStatus = body.processingStatus || asset.processingStatus;
      asset.scanStatus = body.scanStatus || asset.scanStatus;
      asset.exifStatus = body.exifStatus || asset.exifStatus;
      if (usesNormalizedMedia()) {
        asset = await updateMediaAsset(asset.id, {
          ...asset,
          metadata: { moderationNotes: asset.moderationNotes, moderatedBy: user.id, moderatedAt: asset.moderatedAt },
        });
        return json(response, 200, { asset });
      }
      audit(store, user.id, 'media.moderate', 'media_asset', asset.id, { status: asset.moderationStatus });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { asset });
    }

    const listingMediaReorderMatch = path.match(/^\/listings\/([^/]+)\/media\/reorder$/);
    if (request.method === 'POST' && listingMediaReorderMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const media = Array.isArray(body.media) ? body.media : [];
      if (usesNormalizedMedia()) {
        const ordered = await reorderNormalizedListingMedia(listingMediaReorderMatch[1], media);
        return json(response, 200, { media: ordered });
      }
      media.forEach((entry, index) => {
        let link = store.listingMedia.find((item) => item.listingId === listingMediaReorderMatch[1] && item.mediaAssetId === entry.mediaAssetId);
        if (!link) {
          link = { id: createId('listing_media'), listingId: listingMediaReorderMatch[1], mediaAssetId: entry.mediaAssetId, createdAt: new Date().toISOString() };
          store.listingMedia.push(link);
        }
        link.sortOrder = Number(entry.sortOrder ?? index);
        link.isCover = Boolean(entry.isCover);
      });
      audit(store, user.id, 'listing.media_reorder', 'listing', listingMediaReorderMatch[1], { count: media.length });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { media: store.listingMedia.filter((item) => item.listingId === listingMediaReorderMatch[1]).sort((a, b) => a.sortOrder - b.sortOrder) });
    }

    if (request.method === 'POST' && path === '/documents/upload-intent') {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const validation = validateMediaRequest({ ...body, purpose: body.purpose || 'user_document' });
      if (!validation.ok) return json(response, 400, { message: validation.errors[0], errors: validation.errors });
      const intent = getMediaProvider().createUploadIntent({ ...body, ownerId: user.id, purpose: body.purpose || 'user_document', visibility: 'private' });
      const { asset } = intent;
      if (usesNormalizedMedia()) {
        const normalizedAsset = await createMediaAsset(asset);
        return json(response, 201, { ...intent, asset: normalizedAsset });
      }
      store.mediaAssets.push(asset);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, intent);
    }

    const documentMatch = path.match(/^\/documents\/([^/]+)$/);
    if (request.method === 'GET' && documentMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const asset = usesNormalizedMedia()
        ? await getMediaAsset(documentMatch[1])
        : store.mediaAssets.find((item) => item.id === documentMatch[1]);
      if (!asset) return json(response, 404, { message: 'Document not found.' });
      if (asset.ownerId !== user.id && !user.roles?.some((role) => ['admin', 'super_admin', 'moderator'].includes(role))) {
        return json(response, 403, { message: 'You cannot access this document.' });
      }
      const verifications = usesNormalizedMedia()
        ? await listDocumentVerifications(asset.id)
        : store.documentVerifications.filter((item) => item.mediaAssetId === asset.id);
      return json(response, 200, { document: asset, verifications });
    }

    const documentVerifyMatch = path.match(/^\/documents\/([^/]+)\/verify$/);
    if (request.method === 'POST' && documentVerifyMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      let asset = usesNormalizedMedia()
        ? await getMediaAsset(documentVerifyMatch[1])
        : store.mediaAssets.find((item) => item.id === documentVerifyMatch[1]);
      if (!asset) return json(response, 404, { message: 'Document not found.' });
      if (usesNormalizedMedia()) {
        const verification = await createDocumentVerification({ mediaAssetId: asset.id, status: body.status || 'verified', notes: body.notes, verifiedBy: user.id });
        asset = await updateMediaAsset(asset.id, { moderationStatus: verification.status });
        return json(response, 200, { document: asset, verification });
      }
      const verification = {
        id: createId('docverify'),
        mediaAssetId: asset.id,
        status: body.status || 'verified',
        notes: body.notes || null,
        verifiedBy: user.id,
        createdAt: new Date().toISOString(),
      };
      asset.moderationStatus = verification.status;
      store.documentVerifications.push(verification);
      audit(store, user.id, 'document.verify', 'media_asset', asset.id, { status: verification.status });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { document: asset, verification });
    }

    if (request.method === 'GET' && path === '/repair-shops') {
      return json(response, 200, {
        shops: filterRepairShops(store, url.searchParams),
        categories: Object.entries(repairShopCategories).map(([id, category]) => ({ id, ...category })),
        source: 'verified_directory',
      });
    }

    if (request.method === 'GET' && path === '/rankings/repair-shops') {
      return json(response, 200, {
        rankings: filterRepairShops(store, url.searchParams),
        source: 'verified_directory',
        filters: {
          cities: Array.from(new Set(store.repairShops.map((shop) => shop.city).filter(Boolean))).sort(),
          categories: Object.entries(repairShopCategories).map(([id, category]) => ({ id, label: category.label })),
          sorts: ['distanceKm', 'rating', 'communityVotes', 'completedJobs', 'reviews'],
        },
      });
    }

    const repairShopMatch = path.match(/^\/repair-shops\/([^/]+)$/);
    if (request.method === 'GET' && repairShopMatch) {
      const shop = store.repairShops.find((item) => String(item.id) === repairShopMatch[1]);
      if (!shop) return json(response, 404, { message: 'Service provider not found.' });
      return json(response, 200, { shop: buildRepairShopProfile(store, shop) });
    }

    const repairShopSocialsMatch = path.match(/^\/repair-shops\/([^/]+)\/socials$/);
    if (request.method === 'PATCH' && repairShopSocialsMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const shop = store.repairShops.find((item) => String(item.id) === repairShopSocialsMatch[1]);
      if (!shop) return json(response, 404, { message: 'Service provider not found.' });
      const body = await readBody(request);
      shop.socialLinks = sanitizeSocialLinks(body.socialLinks || body);
      shop.updatedAt = new Date().toISOString();
      audit(store, user.id, 'repair_shop.socials.update', 'repair_shop', shop.id, { links: Object.keys(shop.socialLinks) });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { shop: buildRepairShopProfile(store, shop) });
    }

    const repairShopReviewsMatch = path.match(/^\/repair-shops\/([^/]+)\/reviews$/);
    if (request.method === 'GET' && repairShopReviewsMatch) {
      const shop = store.repairShops.find((item) => String(item.id) === repairShopReviewsMatch[1]);
      if (!shop) return json(response, 404, { message: 'Service provider not found.' });
      const reviews = repairShopReviewsFor(store, shop.id);
      return json(response, 200, { reviews, summary: accessoryReviewSummary(reviews) });
    }

    if (request.method === 'POST' && repairShopReviewsMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const shop = store.repairShops.find((item) => String(item.id) === repairShopReviewsMatch[1]);
      if (!shop) return json(response, 404, { message: 'Service provider not found.' });
      const body = await readBody(request);
      const rating = validateRating(body.rating);
      if (!rating) return json(response, 400, { message: 'Rating must be between 1 and 5.' });
      const review = {
        id: createId('repair_review'),
        shopId: shop.id,
        userId: user.id,
        userName: user.fullName || user.username || user.email || 'Verified user',
        rating,
        serviceType: String(body.serviceType || shop.category || '').slice(0, 80),
        title: String(body.title || '').trim().slice(0, 120),
        body: String(body.body || '').trim().slice(0, 2000),
        vehicle: String(body.vehicle || '').trim().slice(0, 120),
        helpfulCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.repairShopReviews.push(review);
      audit(store, user.id, 'repair_shop.review.create', 'repair_shop', shop.id, { reviewId: review.id, rating });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { review, summary: accessoryReviewSummary(repairShopReviewsFor(store, shop.id)) });
    }

    const repairShopQuestionsMatch = path.match(/^\/repair-shops\/([^/]+)\/questions$/);
    if (request.method === 'GET' && repairShopQuestionsMatch) {
      const shop = store.repairShops.find((item) => String(item.id) === repairShopQuestionsMatch[1]);
      if (!shop) return json(response, 404, { message: 'Service provider not found.' });
      return json(response, 200, { questions: repairShopQuestionsFor(store, shop.id) });
    }

    if (request.method === 'POST' && repairShopQuestionsMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const shop = store.repairShops.find((item) => String(item.id) === repairShopQuestionsMatch[1]);
      if (!shop) return json(response, 404, { message: 'Service provider not found.' });
      const body = await readBody(request);
      const questionText = String(body.question || body.body || '').trim();
      if (questionText.length < 8) return json(response, 400, { message: 'Question must be at least 8 characters.' });
      const question = {
        id: createId('repair_question'),
        shopId: shop.id,
        userId: user.id,
        userName: user.fullName || user.username || user.email || 'Customer',
        question: questionText.slice(0, 1000),
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.repairShopQuestions.push(question);
      audit(store, user.id, 'repair_shop.question.create', 'repair_shop', shop.id, { questionId: question.id });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { question });
    }

    const repairShopAnswerMatch = path.match(/^\/repair-shops\/([^/]+)\/questions\/([^/]+)\/answer$/);
    if (request.method === 'POST' && repairShopAnswerMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const shop = store.repairShops.find((item) => String(item.id) === repairShopAnswerMatch[1]);
      if (!shop) return json(response, 404, { message: 'Service provider not found.' });
      const canAnswer = String(shop.submittedBy || shop.ownerId) === String(user.id) || ['admin', 'super_admin', 'moderator', 'dealer', 'seller'].some((role) => (user.roles || []).includes(role));
      if (!canAnswer) return json(response, 403, { message: 'Only the provider owner, dealer, seller, moderator, or admin can answer.' });
      const question = store.repairShopQuestions.find((item) => String(item.shopId) === repairShopAnswerMatch[1] && String(item.id) === repairShopAnswerMatch[2]);
      if (!question) return json(response, 404, { message: 'Question not found.' });
      const body = await readBody(request);
      const answer = String(body.answer || '').trim();
      if (answer.length < 3) return json(response, 400, { message: 'Answer is required.' });
      Object.assign(question, {
        answer: answer.slice(0, 1600),
        answeredBy: user.id,
        answeredByName: user.fullName || user.username || user.email || shop.name,
        answeredAt: new Date().toISOString(),
        status: 'answered',
        updatedAt: new Date().toISOString(),
      });
      audit(store, user.id, 'repair_shop.question.answer', 'repair_shop', shop.id, { questionId: question.id });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { question });
    }

    const repairShopVideosMatch = path.match(/^\/repair-shops\/([^/]+)\/videos$/);
    if (request.method === 'GET' && repairShopVideosMatch) {
      const shop = store.repairShops.find((item) => String(item.id) === repairShopVideosMatch[1]);
      if (!shop) return json(response, 404, { message: 'Service provider not found.' });
      return json(response, 200, { videos: serviceVideosFor(store, 'repair_shop', shop.id) });
    }

    if (request.method === 'POST' && repairShopVideosMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const shop = store.repairShops.find((item) => String(item.id) === repairShopVideosMatch[1]);
      if (!shop) return json(response, 404, { message: 'Service provider not found.' });
      const body = await readBody(request);
      if (!body.videoUrl && !body.mediaAssetId) return json(response, 400, { message: 'Video URL or media asset is required.' });
      const video = {
        id: createId('service_video'),
        providerType: 'repair_shop',
        providerId: shop.id,
        ownerId: user.id,
        title: String(body.title || 'Service video').trim().slice(0, 140),
        description: String(body.description || '').trim().slice(0, 1200),
        serviceType: String(body.serviceType || shop.category || '').trim().slice(0, 80),
        videoUrl: String(body.videoUrl || '').trim().slice(0, 600),
        thumbnailUrl: String(body.thumbnailUrl || '').trim().slice(0, 600),
        mediaAssetId: body.mediaAssetId || null,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.serviceVideos.push(video);
      audit(store, user.id, 'service_video.create', 'repair_shop', shop.id, { videoId: video.id });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { video });
    }

    if (request.method === 'GET' && path === '/integrations/maps/places') {
      const category = url.searchParams.get('category') || 'workshops';
      const lat = Number(url.searchParams.get('lat'));
      const lng = Number(url.searchParams.get('lng'));
      const radius = Number(url.searchParams.get('radius') || 8000);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        try {
          const result = await searchGooglePlaces({ lat, lng, category, radius });
          if (result.configured && result.places.length) {
            return json(response, 200, { places: result.places, source: 'google_places', status: result.status });
          }
          return json(response, 200, {
            places: filterRepairShops(store, url.searchParams),
            source: 'verified_directory',
            status: result.configured ? result.status : 'GOOGLE_MAPS_API_KEY_NOT_CONFIGURED',
          });
        } catch (error) {
          return json(response, 200, {
            places: filterRepairShops(store, url.searchParams),
            source: 'verified_directory',
            warning: error.message,
          });
        }
      }

      return json(response, 200, {
        places: filterRepairShops(store, url.searchParams),
        source: 'verified_directory',
        status: 'LOCATION_NOT_PROVIDED',
      });
    }

    if (request.method === 'POST' && path === '/repair-shops') {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (!body.name || !body.city || !body.category) return json(response, 400, { message: 'Name, city, and category are required.' });
      const shop = {
        id: createId('repair'),
        name: body.name,
        category: body.category,
        city: body.city,
        area: body.area || '',
        address: body.address || '',
        lat: Number(body.lat) || null,
        lng: Number(body.lng) || null,
        distanceKm: Number(body.distanceKm) || null,
        rating: Number(body.rating) || 0,
        reviews: Number(body.reviews) || 0,
        completedJobs: 0,
        communityVotes: 0,
        responseTime: body.responseTime || 'New',
        verified: false,
        openNow: Boolean(body.openNow),
        specialties: Array.isArray(body.specialties) ? body.specialties : [],
        socialLinks: sanitizeSocialLinks(body.socialLinks || {}),
        submittedBy: user.id,
        createdAt: new Date().toISOString(),
      };
      store.repairShops.push(shop);
      (body.videos || []).forEach((entry) => {
        if (!entry.videoUrl && !entry.mediaAssetId) return;
        store.serviceVideos.push({
          id: createId('service_video'),
          providerType: 'repair_shop',
          providerId: shop.id,
          ownerId: user.id,
          title: String(entry.title || 'Service video').slice(0, 140),
          description: String(entry.description || '').slice(0, 1200),
          serviceType: String(entry.serviceType || shop.category).slice(0, 80),
          videoUrl: String(entry.videoUrl || '').slice(0, 600),
          thumbnailUrl: String(entry.thumbnailUrl || '').slice(0, 600),
          mediaAssetId: entry.mediaAssetId || null,
          status: 'published',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      audit(store, user.id, 'repair_shop.submit', 'repair_shop', shop.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { shop });
    }

    if (request.method === 'GET' && path === '/taxonomy/filters') {
      return json(response, 200, {
        categories: ['Cars', 'Cars on Installments', 'Bikes', 'Motorcycles', 'Scooters', 'Buses, Vans & Trucks', 'Loaders & Pickups', 'Rickshaw & Chingchi', 'Tractors & Trailers', 'Other Vehicles'],
        bodyStyles: ['SUV', 'Crossover', 'Sedan', 'Hatchback', 'Coupe', 'Convertible', 'Wagon', 'Minivan', 'Van', 'Pickup Truck', 'Commercial Truck', 'Loader', 'Mini Truck', 'Bus', 'Coaster', 'Rickshaw', 'Tractor', 'Motorcycle', 'Scooter', 'Sports Car', 'Luxury Car', 'Luxury SUV'],
        powertrains: ['Petrol', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric', 'CNG/LPG'],
        transmissions: ['Automatic', 'Manual', 'CVT', 'DCT', 'AMT'],
        engineCcRanges: ['Under 70cc', '70cc - 100cc', '101cc - 125cc', '126cc - 150cc', '151cc - 250cc', '251cc - 600cc', '660cc', '800cc - 1000cc', '1001cc - 1300cc', '1301cc - 1600cc', '1601cc - 2000cc', '2001cc - 3000cc', 'Above 3000cc'],
        colors: ['White', 'Black', 'Silver', 'Grey', 'Blue', 'Red', 'Green', 'Brown', 'Gold', 'Beige', 'Maroon', 'Pearl', 'Other'],
        sellerTypes: ['Private seller', 'Verified dealer', 'Brand certified', 'Bank/repossessed'],
        auctionStatuses: ['scheduled', 'live', 'ending', 'won', 'payment_pending', 'paid', 'handover', 'completed', 'cancelled', 'expired', 'disputed', 'forfeited'],
        accessoryCategories: ['Car Care Kits', 'Car Shampoo', 'Car Polish & Wax', 'Ceramic Coating', 'Seat Covers & Mats', 'Floor Mats', 'Dashboard Covers', 'Steering Covers', 'Body Kits', 'Bumpers', 'Side Mirrors', 'Headlights', 'Tail Lights', 'Fog Lights', 'LED Bulbs', 'Dashcams & Cameras', 'Reverse Cameras', 'Parking Sensors', 'Android Screens', 'Speakers & Woofers', 'Security & Trackers', 'Tires', 'Wheels/Rims', 'Alloy Rims', 'Engine Parts', 'Air Filters', 'Oil Filters', 'Brake Pads', 'Brake Discs', 'Suspension & Steering', 'Batteries', 'Engine Oil', 'Oils & Fluids', 'Performance Parts', 'Off-road Accessories', 'Bike Accessories', 'Bike Spare Parts', 'Helmets'],
      });
    }

    if (request.method === 'GET' && path === '/taxonomy/vehicles') {
      return json(response, 200, { vehicles: store.listings.map(({ year, make, model, variant, bodyStyle }) => ({ year, make, model, variant, bodyStyle })) });
    }

    if (request.method === 'GET' && path === '/taxonomy/makes') {
      return json(response, 200, { makes: Array.from(new Set(store.listings.map((listing) => listing.make).filter(Boolean))).sort() });
    }

    const taxonomyModelsMatch = path.match(/^\/taxonomy\/makes\/([^/]+)\/models$/);
    if (request.method === 'GET' && taxonomyModelsMatch) {
      const make = decodeURIComponent(taxonomyModelsMatch[1]).toLowerCase();
      return json(response, 200, { models: Array.from(new Set(store.listings.filter((listing) => String(listing.make).toLowerCase() === make).map((listing) => listing.model).filter(Boolean))).sort() });
    }

    const taxonomyVariantsMatch = path.match(/^\/taxonomy\/makes\/([^/]+)\/models\/([^/]+)\/variants$/);
    if (request.method === 'GET' && taxonomyVariantsMatch) {
      const make = decodeURIComponent(taxonomyVariantsMatch[1]).toLowerCase();
      const model = decodeURIComponent(taxonomyVariantsMatch[2]).toLowerCase();
      const variants = Array.from(new Set(store.listings
        .filter((listing) => String(listing.make).toLowerCase() === make && String(listing.model).toLowerCase() === model)
        .map((listing) => listing.variant)
        .filter(Boolean))).sort();
      return json(response, 200, { variants });
    }

    if (request.method === 'GET' && path === '/taxonomy/accessory-categories') {
      return json(response, 200, { categories: Array.from(new Set(store.accessories.map((item) => item.category).filter(Boolean))).sort() });
    }

    const checkoutMatch = path.match(/^\/checkout\/([^/]+)$/);
    if (request.method === 'GET' && checkoutMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const auction = store.auctions.find((item) => String(item.id) === checkoutMatch[1]);
      if (!auction) return json(response, 404, { message: 'Auction not found.' });
      const checkout = store.checkouts.find((item) => String(item.auctionId) === String(auction.id)) || null;
      const transactions = checkout ? store.paymentTransactions.filter((item) => String(item.checkoutId) === String(checkout.id)).map((item) => serializePaymentTransaction(store, item)) : [];
      return json(response, 200, { checkout: serializeCheckout(store, checkout), auction: serializeAuction(store, auction), transactions });
    }

    const checkoutActionMatch = path.match(/^\/checkout\/([^/]+)\/(start|upload-proof|confirm-payment|confirm-handover|confirm-title-transfer|open-dispute|close)$/);
    if (request.method === 'POST' && checkoutActionMatch) {
      const user = requireAuth(request, store, response);
      if (!user) return;
      const auction = store.auctions.find((item) => String(item.id) === checkoutActionMatch[1]);
      if (!auction) return json(response, 404, { message: 'Auction not found.' });
      const body = await readBody(request);
      const listing = store.listings.find((item) => String(item.id) === String(auction.listingId)) || null;
      let checkout = store.checkouts.find((item) => String(item.auctionId) === String(auction.id));
      if (!checkout) {
        checkout = {
          id: createId('checkout'),
          auctionId: auction.id,
          buyerId: auction.winnerId || auction.lastBidderId || user.id,
          sellerId: listing?.sellerId,
          status: 'started',
          paymentProofs: [],
          timeline: [],
          createdAt: new Date().toISOString(),
        };
        store.checkouts.push(checkout);
      }
      const action = checkoutActionMatch[2];
      const isAdminActor = hasRole(user, ['admin', 'super_admin']);
      const isBuyerActor = String(checkout.buyerId) === String(user.id);
      const isSellerActor = checkout.sellerId && String(checkout.sellerId) === String(user.id);
      const depositHold = auctionDepositHoldForUser(store, auction.id, checkout.buyerId);
      const selectedPaymentMethod = body.paymentMethodId
        ? store.paymentMethods.find((item) => String(item.id) === String(body.paymentMethodId) && String(item.userId) === String(checkout.buyerId))
        : null;
      const selectedPaymentConfig = selectedPaymentMethod ? getPaymentMethodConfig(selectedPaymentMethod.provider) : null;

      if (['start', 'upload-proof', 'confirm-payment', 'open-dispute'].includes(action) && !isBuyerActor && !isAdminActor) {
        return json(response, 403, { message: 'Only the winning buyer or admin can manage this payment step.' });
      }
      if (['confirm-handover', 'confirm-title-transfer', 'close'].includes(action) && !isBuyerActor && !isSellerActor && !isAdminActor) {
        return json(response, 403, { message: 'Only the buyer, seller, or admin can update this settlement step.' });
      }
      if (!auction.winnerId && !auction.lastBidderId) {
        return json(response, 409, { message: 'Checkout cannot start before the auction has a winner.' });
      }
      if ((action === 'start' || action === 'confirm-payment') && (!depositHold || depositHold.status !== 'locked')) {
        return json(response, 403, { message: 'A locked auction deposit is required before settlement can continue.' });
      }
      if (action === 'start' && String(checkout.buyerId) !== String(auction.winnerId || auction.lastBidderId)) {
        return json(response, 409, { message: 'Checkout is reserved for the winning bidder only.' });
      }
      if (body.paymentMethodId && !selectedPaymentMethod) {
        return json(response, 404, { message: 'Selected payment method was not found for this buyer account.' });
      }
      if (selectedPaymentMethod && !['sandbox_ready', 'verified'].includes(selectedPaymentMethod.status)) {
        return json(response, 409, { message: 'Selected payment method is not ready for checkout yet. Complete sandbox setup or admin verification first.' });
      }
      if (!isAdminActor && checkout.paymentDueAt && new Date(checkout.paymentDueAt) <= new Date() && ['start', 'upload-proof', 'confirm-payment'].includes(action)) {
        checkout.paymentStatus = 'payment_overdue';
        checkout.status = 'forfeited';
        auction.status = 'forfeited';
        if (depositHold?.status === 'locked') {
          depositHold.status = 'forfeited';
          depositHold.updatedAt = new Date().toISOString();
        }
        if (winningPayment) {
          winningPayment.status = 'payment_overdue';
          winningPayment.updatedAt = new Date().toISOString();
        }
        await withStore((current) => Object.assign(current, store));
        return json(response, 409, { message: 'Payment deadline has expired. Admin review is required.', checkout: serializeCheckout(store, checkout) });
      }
      checkout.timeline.push({ action, actorId: user.id, body, createdAt: new Date().toISOString() });
      const paymentAmount = Number(body.amount || auction.highBid || listing?.price || 0);
      const paymentProvider = selectedPaymentMethod?.provider || String(body.paymentMethod || body.provider || 'manual_confirmation').toLowerCase().replaceAll(' ', '_');
      const providerReference = body.reference || selectedPaymentMethod?.maskedReference || `checkout-${auction.id}`;
      let winningPayment = checkoutPaymentTransaction(store, checkout.id, 'auction_winning_payment');
      let sellerPayout = checkoutPaymentTransaction(store, checkout.id, 'seller_payout');

      if (action === 'start') {
        checkout.status = checkout.status === 'disputed' ? 'disputed' : 'payment_pending';
        checkout.paymentStatus = checkout.paymentStatus || 'awaiting_buyer_payment';
        checkout.paymentDueAt = checkout.paymentDueAt || new Date(Date.now() + checkoutPaymentDeadlineHours * 60 * 60 * 1000).toISOString();
        auction.status = auction.status === 'disputed' ? 'disputed' : 'payment_pending';
        if (!winningPayment) {
          winningPayment = {
            id: createId('payment_tx'),
            userId: checkout.buyerId,
            checkoutId: checkout.id,
            auctionId: auction.id,
            paymentMethodId: selectedPaymentMethod?.id || body.paymentMethodId || null,
            provider: paymentProvider,
            providerReference,
            amount: paymentAmount,
            currency: 'PKR',
            status: 'pending_review',
            reconciliationStatus: 'awaiting_provider_callback',
            providerCallbackStatus: 'not_received',
            transactionType: 'auction_winning_payment',
            metadata: {
              source: body.source || 'buyer_checkout',
              listingId: auction.listingId,
              listingTitle: listing?.title || listing?.name || null,
              depositHoldId: depositHold?.id || null,
              paymentDueAt: checkout.paymentDueAt,
              paymentMethodLabel: selectedPaymentMethod?.label || body.paymentMethod || body.provider || 'Manual confirmation',
              paymentMethodStatus: selectedPaymentMethod?.status || null,
              providerMode: selectedPaymentConfig?.mode || null,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          store.paymentTransactions.push(winningPayment);
        }
      }

      if (action === 'upload-proof') {
        checkout.paymentStatus = checkout.paymentStatus || 'proof_uploaded';
        checkout.paymentProofs.push({ id: createId('proof'), ...body, status: 'pending_review', createdAt: new Date().toISOString() });
        if (winningPayment) {
          winningPayment.status = winningPayment.status === 'confirmed' ? winningPayment.status : 'proof_uploaded';
          winningPayment.reconciliationStatus = winningPayment.reconciliationStatus || 'awaiting_provider_callback';
          winningPayment.metadata = {
            ...(winningPayment.metadata || {}),
            latestProof: {
              fileName: body.fileName || null,
              mimeType: body.mimeType || null,
              uploadedAt: new Date().toISOString(),
            },
          };
          winningPayment.updatedAt = new Date().toISOString();
        }
      }

      if (action === 'confirm-payment') {
        checkout.paymentStatus = 'submitted_for_review';
        checkout.status = checkout.status === 'disputed' ? 'disputed' : 'payment_review';
        auction.status = auction.status === 'disputed' ? 'disputed' : 'payment_pending';
        checkout.paymentDueAt = checkout.paymentDueAt || new Date(Date.now() + checkoutPaymentDeadlineHours * 60 * 60 * 1000).toISOString();
        if (!winningPayment) {
          winningPayment = {
            id: createId('payment_tx'),
            userId: checkout.buyerId,
            checkoutId: checkout.id,
            auctionId: auction.id,
            paymentMethodId: selectedPaymentMethod?.id || body.paymentMethodId || null,
            provider: paymentProvider,
            providerReference,
            amount: paymentAmount,
            currency: 'PKR',
            status: 'submitted_for_review',
            reconciliationStatus: 'provider_reference_submitted',
            providerCallbackStatus: 'not_received',
            transactionType: 'auction_winning_payment',
            metadata: {
              source: 'buyer_confirm_payment',
              listingId: auction.listingId,
              listingTitle: listing?.title || listing?.name || null,
              depositHoldId: depositHold?.id || null,
              paymentDueAt: checkout.paymentDueAt,
              paymentMethodLabel: selectedPaymentMethod?.label || body.paymentMethod || body.provider || 'Manual confirmation',
              paymentMethodStatus: selectedPaymentMethod?.status || null,
              providerMode: selectedPaymentConfig?.mode || null,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          store.paymentTransactions.push(winningPayment);
        } else {
          winningPayment.status = 'submitted_for_review';
          winningPayment.reconciliationStatus = 'provider_reference_submitted';
          winningPayment.provider = paymentProvider || winningPayment.provider || 'manual_confirmation';
          winningPayment.paymentMethodId = selectedPaymentMethod?.id || winningPayment.paymentMethodId || null;
          winningPayment.providerReference = providerReference || winningPayment.providerReference;
          winningPayment.amount = paymentAmount || winningPayment.amount;
          winningPayment.metadata = {
            ...(winningPayment.metadata || {}),
            depositHoldId: depositHold?.id || winningPayment.metadata?.depositHoldId || null,
            paymentDueAt: checkout.paymentDueAt,
            paymentMethodLabel: selectedPaymentMethod?.label || body.paymentMethod || body.provider || winningPayment.metadata?.paymentMethodLabel || 'Manual confirmation',
            paymentMethodStatus: selectedPaymentMethod?.status || winningPayment.metadata?.paymentMethodStatus || null,
            providerMode: selectedPaymentConfig?.mode || winningPayment.metadata?.providerMode || null,
          };
          winningPayment.updatedAt = new Date().toISOString();
        }
      }
      if (action === 'confirm-handover') checkout.handoverStatus = 'confirmed';
      if (action === 'confirm-title-transfer') checkout.titleTransferStatus = 'confirmed';
      if (action === 'close') checkout.status = 'closed';
      checkout.updatedAt = new Date().toISOString();
      if (action === 'open-dispute') {
        checkout.status = 'disputed';
        checkout.paymentStatus = checkout.paymentStatus === 'confirmed' ? 'confirmed' : 'dispute_hold';
        auction.status = 'disputed';
        if (winningPayment) {
          winningPayment.status = winningPayment.status === 'confirmed' ? winningPayment.status : 'dispute_hold';
          winningPayment.updatedAt = new Date().toISOString();
        }
        if (sellerPayout) {
          sellerPayout.status = 'dispute_hold';
          sellerPayout.updatedAt = new Date().toISOString();
        }
        const dispute = { id: createId('dispute'), checkoutId: checkout.id, auctionId: auction.id, openedBy: user.id, severity: body.severity || 'medium', reason: body.reason || 'No reason provided', status: 'open', createdAt: new Date().toISOString() };
        store.disputes.push(dispute);
        await withStore((current) => Object.assign(current, store));
        return json(response, 201, { checkout: serializeCheckout(store, checkout), dispute });
      }
      audit(store, user.id, `checkout.${action}`, 'checkout', checkout.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { checkout: serializeCheckout(store, checkout) });
    }

    if (request.method === 'GET' && path === '/auction-rules') {
      return json(response, 200, {
        rules: publicAuctionRules(),
        marketplaceRules: {
          bidderKycRequired: true,
          depositRequired: true,
          bidWithdrawal: 'admin_review_only',
          buyerDefault: 'deposit_may_be_forfeited_after_review',
          sellerCancellation: 'admin_review_required',
          paymentDeadlineHours: 72,
          bidIdentityDisplay: 'masked_username',
          legalNotice: 'Pakistan vehicle transfer, biometric, tax/token, and document review requirements vary by auction type and province.',
        },
      });
    }

    if (request.method === 'GET' && path === '/bank-partners') {
      const user = await getAccountAuth(request, store);
      const isAdmin = hasRole(user, ['admin', 'super_admin']);
      const partners = (store.bankPartners || []).filter((partner) => isAdmin || (partner.status === 'verified' && partner.publicEnabled));
      return json(response, 200, {
        partners,
        bankAuctionsPubliclyEnabled: hasVerifiedBankPartner(store),
        notice: 'Bank Verified Auctions stay disabled publicly until a verified bank/financial partner record exists.',
      });
    }

    if (request.method === 'POST' && path === '/bank-partners') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      const body = await readBody(request);
      if (!body.name) return json(response, 400, { message: 'Bank or partner name is required.' });
      const partner = {
        id: createId('bank_partner'),
        name: body.name,
        institutionType: body.institutionType || 'bank',
        status: body.status || 'pending_review',
        publicEnabled: Boolean(body.publicEnabled && body.status === 'verified'),
        contactPerson: body.contactPerson || null,
        contactEmail: body.contactEmail || null,
        legalAgreementRef: body.legalAgreementRef || null,
        termsUrl: body.termsUrl || null,
        metadata: body.metadata || {},
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.bankPartners.push(partner);
      audit(store, user.id, 'bank_partner.create', 'bank_partner', partner.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { partner });
    }

    const bankPartnerMatch = path.match(/^\/bank-partners\/([^/]+)$/);
    if (request.method === 'PATCH' && bankPartnerMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      const partner = store.bankPartners.find((item) => String(item.id) === bankPartnerMatch[1]);
      if (!partner) return json(response, 404, { message: 'Bank partner not found.' });
      const body = await readBody(request);
      Object.assign(partner, body, {
        publicEnabled: Boolean(body.publicEnabled && (body.status || partner.status) === 'verified'),
        reviewedBy: user.id,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      audit(store, user.id, 'bank_partner.update', 'bank_partner', partner.id, { status: partner.status });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { partner });
    }

    if (request.method === 'GET' && path === '/payments/methods') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      return json(response, 200, {
        methods: store.paymentMethods
          .filter((method) => String(method.userId) === String(user.id))
          .map((method) => serializePaymentMethod(method)),
      });
    }

    if (request.method === 'GET' && path === '/payments/providers') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      return json(response, 200, {
        provider: getPaymentProviderInfo(),
        methods: getPaymentMethodOptions(),
      });
    }

    if (request.method === 'POST' && path === '/payments/methods') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const methodConfig = getPaymentMethodConfig(body.provider);
      if (!methodConfig) return json(response, 400, { message: 'Unsupported payment provider.' });
      const method = {
        id: createId('payment_method'),
        userId: user.id,
        provider: body.provider,
        label: body.label || body.provider,
        status: methodConfig.defaultMethodStatus,
        maskedReference: body.maskedReference || null,
        providerMode: methodConfig.mode,
        metadata: {
          ...(body.metadata || {}),
          acceptedFor: methodConfig.acceptedFor,
          setupMode: methodConfig.mode,
        },
        createdAt: new Date().toISOString(),
      };
      store.paymentMethods.push(method);
      audit(store, user.id, 'payment_method.create', 'payment_method', method.id, { provider: method.provider });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { method: serializePaymentMethod(method) });
    }

    if (request.method === 'GET' && path === '/payments/transactions') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      return json(response, 200, {
        transactions: store.paymentTransactions
          .filter((transaction) => String(transaction.userId) === String(user.id))
          .map((transaction) => serializePaymentTransaction(store, transaction)),
      });
    }

    if (request.method === 'POST' && path === '/payments/sandbox/callbacks') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      const transaction = store.paymentTransactions.find((item) =>
        String(item.id) === String(body.transactionId || '')
        || (body.providerReference && String(item.providerReference) === String(body.providerReference))
      );
      if (!transaction) return json(response, 404, { message: 'Sandbox payment transaction not found.' });
      const isAdminActor = ['admin', 'super_admin'].includes(user.role);
      if (!isAdminActor && String(transaction.userId) !== String(user.id)) return json(response, 403, { message: 'You cannot simulate provider callbacks for this transaction.' });
      const paymentMethod = transaction.paymentMethodId
        ? store.paymentMethods.find((item) => String(item.id) === String(transaction.paymentMethodId))
        : null;
      const methodConfig = getPaymentMethodConfig(paymentMethod?.provider || transaction.provider);
      if (!(getPaymentProviderInfo().sandbox || methodConfig?.sandboxReady)) {
        return json(response, 409, { message: 'Sandbox callback simulation is disabled for this provider.' });
      }
      const eventType = String(body.eventType || 'provider_pending').toLowerCase();
      const checkout = transaction.checkoutId ? store.checkouts.find((item) => String(item.id) === String(transaction.checkoutId)) : null;
      const auction = transaction.auctionId ? store.auctions.find((item) => String(item.id) === String(transaction.auctionId)) : null;
      const depositHold = checkout ? auctionDepositHoldForUser(store, checkout.auctionId, checkout.buyerId) : null;
      const sandboxUpdateMap = {
        provider_pending: {
          status: transaction.transactionType === 'seller_payout' ? 'pending_release' : 'pending_review',
          reconciliationStatus: 'provider_processing',
          providerCallbackStatus: 'received',
          providerCallbackEvent: eventType,
          adminNote: body.note || 'Sandbox provider marked the transfer as pending.',
        },
        provider_confirmed: {
          status: transaction.transactionType === 'seller_payout' ? 'released' : 'confirmed',
          reconciliationStatus: transaction.transactionType === 'seller_payout' ? 'payout_released' : 'provider_confirmed',
          providerCallbackStatus: 'received',
          providerCallbackEvent: eventType,
          adminNote: body.note || 'Sandbox provider confirmed the payment callback.',
        },
        provider_failed: {
          status: 'failed',
          reconciliationStatus: 'provider_failed',
          providerCallbackStatus: 'received',
          providerCallbackEvent: eventType,
          adminNote: body.note || 'Sandbox provider failed the payment attempt.',
        },
        refund_pending: {
          status: 'dispute_hold',
          refundStatus: 'hold',
          reconciliationStatus: 'refund_pending',
          providerCallbackStatus: 'received',
          providerCallbackEvent: eventType,
          adminNote: body.note || 'Sandbox provider moved the settlement into refund review.',
        },
        refund_confirmed: {
          status: 'refunded',
          refundStatus: 'approved',
          reconciliationStatus: 'refund_completed',
          providerCallbackStatus: 'received',
          providerCallbackEvent: eventType,
          adminNote: body.note || 'Sandbox provider confirmed the refund callback.',
        },
      };
      const update = sandboxUpdateMap[eventType];
      if (!update) return json(response, 400, { message: 'Unsupported sandbox callback event.' });
      applyPaymentSettlementUpdate(store, {
        transaction,
        checkout,
        auction,
        depositHold,
        update: {
          ...update,
          providerResponseMeta: {
            simulated: true,
            eventType,
            providerReference: body.providerReference || transaction.providerReference || null,
            receivedAt: new Date().toISOString(),
          },
          depositHoldAction: body.depositHoldAction || null,
        },
        actorId: user.id,
        timelineAction: 'sandbox-provider-callback',
      });
      audit(store, user.id, 'payment.sandbox_callback', 'payment_transaction', transaction.id, { eventType, status: transaction.status });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, {
        transaction: serializePaymentTransaction(store, transaction),
        checkout: serializeCheckout(store, checkout),
        auction: auction ? serializeAuction(store, auction) : null,
      });
    }

    if (request.method === 'GET' && path === '/admin/payments') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      const status = url.searchParams.get('status');
      const provider = url.searchParams.get('provider');
      const transactions = store.paymentTransactions
        .filter((transaction) => !status || status === 'All' || transaction.status === status)
        .filter((transaction) => !provider || provider === 'All' || transaction.provider === provider)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .map((transaction) => ({
          ...serializePaymentTransaction(store, transaction),
          user: publicUser(store.users.find((item) => String(item.id) === String(transaction.userId))),
          checkout: transaction.checkoutId ? store.checkouts.find((item) => String(item.id) === String(transaction.checkoutId)) || null : null,
          auction: transaction.auctionId ? store.auctions.find((item) => String(item.id) === String(transaction.auctionId)) || null : null,
      }));
      return json(response, 200, { transactions });
    }

    const adminPaymentMatch = path.match(/^\/admin\/payments\/([^/]+)$/);
    if (request.method === 'PATCH' && adminPaymentMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      const body = await readBody(request);
      const transaction = store.paymentTransactions.find((item) => String(item.id) === adminPaymentMatch[1]);
      if (!transaction) return json(response, 404, { message: 'Payment transaction not found.' });
      const checkout = transaction.checkoutId ? store.checkouts.find((item) => String(item.id) === String(transaction.checkoutId)) : null;
      const auction = transaction.auctionId ? store.auctions.find((item) => String(item.id) === String(transaction.auctionId)) : null;
      const depositHold = checkout ? auctionDepositHoldForUser(store, checkout.auctionId, checkout.buyerId) : null;
      applyPaymentSettlementUpdate(store, {
        transaction,
        checkout,
        auction,
        depositHold,
        update: body,
        actorId: user.id,
        timelineAction: 'admin-payment-update',
      });

      audit(store, user.id, 'admin.payment_update', 'payment_transaction', transaction.id, { status: transaction.status, refundStatus: transaction.refundStatus || null });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, {
        transaction: {
          ...serializePaymentTransaction(store, transaction),
          user: publicUser(store.users.find((item) => String(item.id) === String(transaction.userId))),
        },
      });
    }

    if (request.method === 'GET' && path === '/wishlist') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireCapability(store, user, response, 'wishlist')) return;
      return json(response, 200, { items: store.wishlistItems.filter((item) => String(item.userId) === String(user.id)) });
    }

    if (request.method === 'POST' && path === '/wishlist') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireCapability(store, user, response, 'wishlist')) return;
      const body = await readBody(request);
      const itemType = body.itemType || body.type;
      const itemId = body.itemId || body.id;
      if (!itemType || !itemId) return json(response, 400, { message: 'Wishlist itemType and itemId are required.' });
      const existing = store.wishlistItems.find((item) => String(item.userId) === String(user.id) && item.itemType === itemType && String(item.itemId) === String(itemId));
      const item = existing || { id: createId('wishlist'), userId: user.id, itemType, itemId, createdAt: new Date().toISOString() };
      Object.assign(item, { notes: body.notes || item.notes || '', notifyPriceChange: body.notifyPriceChange !== false, notifyEndingSoon: body.notifyEndingSoon !== false, updatedAt: new Date().toISOString() });
      if (!existing) store.wishlistItems.push(item);
      await withStore((current) => Object.assign(current, store));
      return json(response, existing ? 200 : 201, { item });
    }

    const wishlistMatch = path.match(/^\/wishlist\/([^/]+)$/);
    if (request.method === 'DELETE' && wishlistMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      store.wishlistItems = store.wishlistItems.filter((item) => !(String(item.id) === wishlistMatch[1] && String(item.userId) === String(user.id)));
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { ok: true });
    }

    if (request.method === 'GET' && path === '/cart') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      return json(response, 200, { items: store.cartItems.filter((item) => String(item.userId) === String(user.id)) });
    }

    if (request.method === 'POST' && path === '/cart/items') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (!body.itemType || !body.itemId) return json(response, 400, { message: 'Cart itemType and itemId are required.' });
      const item = { id: createId('cart_item'), userId: user.id, itemType: body.itemType, itemId: body.itemId, quantity: Number(body.quantity || 1), status: 'active', priceSnapshot: body.priceSnapshot || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      store.cartItems.push(item);
      store.cartHistory.push({ id: createId('cart_history'), userId: user.id, action: 'added', itemType: item.itemType, itemId: item.itemId, metadata: { quantity: item.quantity }, createdAt: new Date().toISOString() });
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { item });
    }

    const cartItemMatch = path.match(/^\/cart\/items\/([^/]+)$/);
    if (request.method === 'DELETE' && cartItemMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const item = store.cartItems.find((entry) => String(entry.id) === cartItemMatch[1] && String(entry.userId) === String(user.id));
      if (!item) return json(response, 404, { message: 'Cart item not found.' });
      item.status = 'removed';
      item.updatedAt = new Date().toISOString();
      store.cartHistory.push({ id: createId('cart_history'), userId: user.id, action: 'removed', itemType: item.itemType, itemId: item.itemId, createdAt: new Date().toISOString() });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { ok: true });
    }

    if (request.method === 'GET' && path === '/cart/history') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      return json(response, 200, { history: store.cartHistory.filter((item) => String(item.userId) === String(user.id)) });
    }

    if (request.method === 'POST' && path === '/feature-suggestions') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const body = await readBody(request);
      if (!body.module || !body.title || !body.description) return json(response, 400, { message: 'Module, title, and description are required.' });
      const suggestion = {
        id: createId('suggestion'),
        userId: user.id,
        module: body.module,
        title: String(body.title).slice(0, 160),
        description: String(body.description).slice(0, 3000),
        problemSolved: body.problemSolved || '',
        userPriority: body.userPriority || 'medium',
        mediaAssetId: body.mediaAssetId || null,
        contactAllowed: Boolean(body.contactAllowed),
        status: 'under_review',
        publicRoadmap: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.featureSuggestions.push(suggestion);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { suggestion });
    }

    if (request.method === 'GET' && path === '/feature-suggestions') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      return json(response, 200, { suggestions: store.featureSuggestions.filter((item) => String(item.userId) === String(user.id)) });
    }

    if (request.method === 'GET' && path === '/admin/feature-suggestions') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin', 'moderator'])) return;
      const status = url.searchParams.get('status');
      const module = url.searchParams.get('module');
      const suggestions = store.featureSuggestions
        .filter((item) => !status || item.status === status)
        .filter((item) => !module || item.module === module)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return json(response, 200, { suggestions });
    }

    const adminSuggestionMatch = path.match(/^\/admin\/feature-suggestions\/([^/]+)$/);
    if (request.method === 'PATCH' && adminSuggestionMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin', 'moderator'])) return;
      const suggestion = store.featureSuggestions.find((item) => String(item.id) === adminSuggestionMatch[1]);
      if (!suggestion) return json(response, 404, { message: 'Feature suggestion not found.' });
      const body = await readBody(request);
      Object.assign(suggestion, {
        status: body.status || suggestion.status,
        internalNotes: body.internalNotes ?? suggestion.internalNotes,
        duplicateOf: body.duplicateOf ?? suggestion.duplicateOf,
        publicRoadmap: body.publicRoadmap ?? suggestion.publicRoadmap,
        backlogRef: body.backlogRef ?? suggestion.backlogRef,
        reviewedBy: user.id,
        updatedAt: new Date().toISOString(),
      });
      audit(store, user.id, 'feature_suggestion.review', 'feature_suggestion', suggestion.id, { status: suggestion.status });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { suggestion });
    }

    if (request.method === 'GET' && path === '/garage') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      return json(response, 200, { vehicles: store.ownedVehicles.filter((vehicle) => String(vehicle.userId) === String(user.id)) });
    }

    const garageArchiveMatch = path.match(/^\/garage\/([^/]+)\/archive$/);
    if (request.method === 'PATCH' && garageArchiveMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      const vehicle = store.ownedVehicles.find((item) => String(item.id) === garageArchiveMatch[1] && String(item.userId) === String(user.id));
      if (!vehicle) return json(response, 404, { message: 'Garage vehicle not found.' });
      const body = await readBody(request);
      vehicle.archived = body.archived !== false;
      vehicle.archivedReason = body.reason || vehicle.archivedReason || 'No longer active';
      vehicle.countsTowardRankings = !vehicle.archived;
      vehicle.updatedAt = new Date().toISOString();
      audit(store, user.id, vehicle.archived ? 'garage.archive' : 'garage.restore', 'garage_vehicle', vehicle.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { vehicle });
    }

    if (request.method === 'GET' && path === '/admin/submissions') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin', 'moderator'])) return;
      return json(response, 200, { submissions: store.sellerDrafts });
    }

    if (request.method === 'GET' && path === '/admin/audit-log') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      const entityType = url.searchParams.get('entityType');
      const action = url.searchParams.get('action');
      const limit = Math.min(Number(url.searchParams.get('limit') || 100), 250);
      const events = store.auditLogs
        .filter((event) => !entityType || event.entityType === entityType)
        .filter((event) => !action || event.action === action)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
      return json(response, 200, { events });
    }

    if (request.method === 'GET' && path === '/admin/kyc') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin', 'moderator'])) return;
      const status = url.searchParams.get('status');
      const queue = store.kycProfiles
        .filter((profile) => !status || status === 'All' || profile.status === status || profile.reviewStatus === status)
        .map((profile) => {
          const profileUser = store.users.find((item) => String(item.id) === String(profile.userId));
          const dealer = store.dealers.find((item) => String(item.userId || item.id) === String(profile.userId)) || null;
          const listings = store.listings.filter((listing) => String(listing.sellerId) === String(profile.userId));
          return {
            ...profile,
            user: publicUser(profileUser),
            latestDocuments: (profile.documents || []).slice(-3).reverse(),
            dealerProfile: dealer ? buildDealerProfile(store, dealer) : null,
            listingsCount: listings.length,
            levelRequested: dealer ? 'dealer_verified' : 'kyc_verified',
          };
        });
      return json(response, 200, { queue });
    }

    const kycReviewMatch = path.match(/^\/admin\/kyc\/([^/]+)\/review$/);
    if (request.method === 'POST' && kycReviewMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      const body = await readBody(request);
      const profile = store.kycProfiles.find((item) => item.id === kycReviewMatch[1]);
      if (!profile) return json(response, 404, { message: 'KYC profile not found.' });
      profile.status = body.status || 'verified';
      profile.reviewStatus = profile.status === 'verified' ? 'approved' : profile.status;
      profile.reviewedBy = user.id;
      profile.reviewedAt = new Date().toISOString();
      profile.reviewNote = body.reviewNote || body.note || profile.reviewNote || '';
      profile.rejectionReason = body.rejectionReason || (profile.status === 'rejected' ? (body.reviewNote || body.note || 'Admin review rejected the KYC package.') : null);
      profile.nextAction = body.nextAction || (profile.status === 'needs_resubmission' ? 'Upload corrected documents and resubmit for review.' : null);

      if (body.promoteDealer && profile.status === 'verified') {
        const dealer = store.dealers.find((item) => String(item.userId || item.id) === String(profile.userId));
        if (dealer) {
          dealer.status = 'verified';
          dealer.verified = true;
          dealer.reviewedBy = user.id;
          dealer.reviewedAt = new Date().toISOString();
        }
      }

      audit(store, user.id, 'admin.kyc_review', 'kyc_profile', profile.id, { status: profile.status });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { kycProfile: profile });
    }

    if (request.method === 'GET' && path === '/admin/documents') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin', 'moderator'])) return;
      const status = url.searchParams.get('status');
      const documents = store.verificationDocuments
        .filter((document) => !status || status === 'All' || document.status === status)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .map((document) => ({
          ...document,
          profile: store.kycProfiles.find((profile) => String(profile.id) === String(document.profileId) || String(profile.userId) === String(document.userId)) || null,
          user: publicUser(store.users.find((item) => String(item.id) === String(document.userId))),
          mediaAsset: document.mediaAssetId ? (store.mediaAssets.find((item) => String(item.id) === String(document.mediaAssetId)) || null) : null,
        }));
      return json(response, 200, { documents });
    }

    const documentReviewMatch = path.match(/^\/admin\/documents\/([^/]+)\/review$/);
    if (request.method === 'POST' && documentReviewMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      const document = store.verificationDocuments.find((item) => String(item.id) === documentReviewMatch[1]);
      if (!document) return json(response, 404, { message: 'Verification document not found.' });
      const body = await readBody(request);
      Object.assign(document, {
        status: body.status || 'approved',
        reviewNote: body.reviewNote || body.note || '',
        reviewedBy: user.id,
        reviewedAt: new Date().toISOString(),
      });
      const profile = store.kycProfiles.find((item) => String(item.id) === String(document.profileId) || String(item.userId) === String(document.userId));
      if (profile) {
        profile.documents = (profile.documents || []).map((item) => (
          String(item.id) === String(document.id)
            ? { ...item, status: document.status, reviewNote: document.reviewNote, reviewedBy: user.id, reviewedAt: document.reviewedAt }
            : item
        ));
        if (document.status === 'rejected' || document.status === 'needs_resubmission') {
          profile.status = 'needs_resubmission';
          profile.reviewStatus = 'needs_resubmission';
          profile.rejectionReason = body.reviewNote || body.note || 'A document needs to be corrected and resubmitted.';
          profile.nextAction = 'Replace the rejected document and resubmit the KYC package.';
        }
        profile.updatedAt = new Date().toISOString();
      }
      audit(store, user.id, 'admin.document_review', 'verification_document', document.id, { status: document.status });
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { document });
    }

    const adminBidAuditMatch = path.match(/^\/admin\/auctions\/([^/]+)\/bid-audit$/);
    if (request.method === 'GET' && adminBidAuditMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      const auction = store.auctions.find((item) => String(item.id) === adminBidAuditMatch[1]);
      if (!auction) return json(response, 404, { message: 'Auction not found.' });
      return json(response, 200, { auction: serializeAuction(store, auction), events: bidAuditEvents(store, auction.id) });
    }

    if (request.method === 'GET' && path === '/admin/disputes') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin', 'moderator'])) return;
      return json(response, 200, {
        disputes: store.disputes.map((dispute) => ({
          ...dispute,
          checkout: store.checkouts.find((item) => String(item.id) === String(dispute.checkoutId)) || null,
          buyer: publicUser(store.users.find((item) => String(item.id) === String(dispute.openedBy))),
        })),
      });
    }

    if (request.method === 'GET' && path === '/admin/orders') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      if (usesNormalizedEngagement()) {
        return json(response, 200, { orders: await listAdminOrders(Object.fromEntries(url.searchParams.entries())) });
      }
      const status = url.searchParams.get('status');
      const orderType = url.searchParams.get('orderType');
      const orders = store.orders
        .filter((order) => !status || status === 'All' || order.status === status)
        .filter((order) => !orderType || orderType === 'All' || order.orderType === orderType)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return json(response, 200, { orders });
    }

    const disputeMatch = path.match(/^\/admin\/disputes\/([^/]+)$/);
    if (request.method === 'GET' && disputeMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin', 'moderator'])) return;
      const dispute = store.disputes.find((item) => item.id === disputeMatch[1]);
      if (!dispute) return json(response, 404, { message: 'Dispute not found.' });
      return json(response, 200, { dispute });
    }

    if (request.method === 'PATCH' && disputeMatch) {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['admin', 'super_admin'])) return;
      const body = await readBody(request);
      const dispute = store.disputes.find((item) => item.id === disputeMatch[1]);
      if (!dispute) return json(response, 404, { message: 'Dispute not found.' });
      Object.assign(dispute, body, { updatedAt: new Date().toISOString(), updatedBy: user.id });
      audit(store, user.id, 'admin.dispute_update', 'dispute', dispute.id);
      await withStore((current) => Object.assign(current, store));
      return json(response, 200, { dispute });
    }

    if (request.method === 'GET' && path === '/seller/drafts') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['seller', 'dealer', 'admin', 'super_admin'])) return;
      return json(response, 200, { drafts: store.sellerDrafts.filter((draft) => draft.sellerId === user.id) });
    }

    if (request.method === 'GET' && path === '/seller/orders') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['seller', 'dealer', 'admin', 'super_admin'])) return;
      if (usesNormalizedEngagement()) return json(response, 200, { orders: await listSellerOrders(user.id) });
      return json(response, 200, { orders: store.orders.filter((order) => order.sellerId === user.id) });
    }

    if (request.method === 'POST' && path === '/seller/drafts') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['seller', 'dealer', 'admin', 'super_admin'])) return;
      const body = await readBody(request);
      const draft = { id: createId('draft'), sellerId: user.id, status: 'draft', payload: body, quality: listingQuality(body), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      store.sellerDrafts.push(draft);
      await withStore((current) => Object.assign(current, store));
      return json(response, 201, { draft });
    }

    if (request.method === 'GET' && path === '/seller/analytics') {
      const user = await requireAccountAuth(request, store, response);
      if (!user) return;
      if (!requireRole(user, response, ['seller', 'dealer', 'admin', 'super_admin'])) return;
      const listings = store.listings.filter((listing) => listing.sellerId === user.id);
      return json(response, 200, { analytics: { listings: listings.length, liveListings: listings.filter((listing) => listing.status === 'published' || listing.status === 'live').length, drafts: store.sellerDrafts.filter((draft) => draft.sellerId === user.id).length } });
    }

    return json(response, 404, { message: `Route not found: ${request.method} ${path}` });
  } catch (error) {
    return json(response, 500, { message: error.message });
  }
};

const server = http.createServer(route);

server.on('upgrade', handleRealtimeUpgrade);

server.listen(port, () => {
  console.log(`Wheels&Deals API listening on http://localhost:${port}/api/health`);
});
