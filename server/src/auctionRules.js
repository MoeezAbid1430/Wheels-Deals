export const AUCTION_STATES = Object.freeze({
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  ENDING: 'ending',
  WON: 'won',
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
  HANDOVER: 'handover',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  DISPUTED: 'disputed',
  FORFEITED: 'forfeited',
});

export const AUCTION_ACTIONS = Object.freeze({
  SUBMIT_REVIEW: 'submit_review',
  APPROVE: 'approve',
  START: 'start',
  PAUSE: 'pause',
  REOPEN: 'reopen',
  EXTEND: 'extend',
  END: 'end',
  PAYMENT_DUE: 'payment_due',
  MARK_PAID: 'mark_paid',
  HANDOVER: 'handover',
  COMPLETE: 'complete',
  CANCEL: 'cancel',
  EXPIRE: 'expire',
  DISPUTE: 'dispute',
  FORFEIT: 'forfeit',
});

const allowedTransitions = {
  [AUCTION_STATES.DRAFT]: [AUCTION_STATES.PENDING_REVIEW, AUCTION_STATES.CANCELLED],
  [AUCTION_STATES.PENDING_REVIEW]: [AUCTION_STATES.SCHEDULED, AUCTION_STATES.CANCELLED],
  [AUCTION_STATES.SCHEDULED]: [AUCTION_STATES.LIVE, AUCTION_STATES.CANCELLED],
  [AUCTION_STATES.LIVE]: [AUCTION_STATES.ENDING, AUCTION_STATES.WON, AUCTION_STATES.EXPIRED, AUCTION_STATES.CANCELLED, AUCTION_STATES.DISPUTED],
  [AUCTION_STATES.ENDING]: [AUCTION_STATES.WON, AUCTION_STATES.EXPIRED, AUCTION_STATES.CANCELLED, AUCTION_STATES.DISPUTED],
  [AUCTION_STATES.WON]: [AUCTION_STATES.PAYMENT_PENDING, AUCTION_STATES.FORFEITED, AUCTION_STATES.DISPUTED],
  [AUCTION_STATES.PAYMENT_PENDING]: [AUCTION_STATES.PAID, AUCTION_STATES.FORFEITED, AUCTION_STATES.DISPUTED],
  [AUCTION_STATES.PAID]: [AUCTION_STATES.HANDOVER, AUCTION_STATES.DISPUTED],
  [AUCTION_STATES.HANDOVER]: [AUCTION_STATES.COMPLETED, AUCTION_STATES.DISPUTED],
  [AUCTION_STATES.DISPUTED]: [AUCTION_STATES.PAYMENT_PENDING, AUCTION_STATES.PAID, AUCTION_STATES.HANDOVER, AUCTION_STATES.COMPLETED, AUCTION_STATES.FORFEITED],
};

export const terminalAuctionStates = new Set([
  AUCTION_STATES.COMPLETED,
  AUCTION_STATES.CANCELLED,
  AUCTION_STATES.EXPIRED,
  AUCTION_STATES.FORFEITED,
]);

export const actionStateMap = {
  [AUCTION_ACTIONS.SUBMIT_REVIEW]: AUCTION_STATES.PENDING_REVIEW,
  [AUCTION_ACTIONS.APPROVE]: AUCTION_STATES.SCHEDULED,
  [AUCTION_ACTIONS.START]: AUCTION_STATES.LIVE,
  [AUCTION_ACTIONS.REOPEN]: AUCTION_STATES.LIVE,
  [AUCTION_ACTIONS.EXTEND]: AUCTION_STATES.LIVE,
  [AUCTION_ACTIONS.PAUSE]: AUCTION_STATES.SCHEDULED,
  [AUCTION_ACTIONS.END]: AUCTION_STATES.WON,
  [AUCTION_ACTIONS.PAYMENT_DUE]: AUCTION_STATES.PAYMENT_PENDING,
  [AUCTION_ACTIONS.MARK_PAID]: AUCTION_STATES.PAID,
  [AUCTION_ACTIONS.HANDOVER]: AUCTION_STATES.HANDOVER,
  [AUCTION_ACTIONS.COMPLETE]: AUCTION_STATES.COMPLETED,
  [AUCTION_ACTIONS.CANCEL]: AUCTION_STATES.CANCELLED,
  [AUCTION_ACTIONS.EXPIRE]: AUCTION_STATES.EXPIRED,
  [AUCTION_ACTIONS.DISPUTE]: AUCTION_STATES.DISPUTED,
  [AUCTION_ACTIONS.FORFEIT]: AUCTION_STATES.FORFEITED,
};

export const normalizeAuctionStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'ended') return AUCTION_STATES.WON;
  if (value === 'paused') return AUCTION_STATES.SCHEDULED;
  if (value === 'pending') return AUCTION_STATES.PENDING_REVIEW;
  return Object.values(AUCTION_STATES).includes(value) ? value : AUCTION_STATES.DRAFT;
};

export const canTransitionAuction = (fromStatus, toStatus) => {
  const from = normalizeAuctionStatus(fromStatus);
  const to = normalizeAuctionStatus(toStatus);
  if (from === to) return true;
  if (terminalAuctionStates.has(from)) return false;
  return (allowedTransitions[from] || []).includes(to);
};

export const getAuctionTransition = (currentStatus, action) => {
  const nextStatus = actionStateMap[action];
  if (!nextStatus) return { ok: false, message: `Unsupported auction action "${action}".` };
  if (!canTransitionAuction(currentStatus, nextStatus)) {
    return {
      ok: false,
      message: `Auction cannot move from ${normalizeAuctionStatus(currentStatus)} to ${nextStatus}.`,
      nextStatus,
    };
  }
  return { ok: true, nextStatus };
};

export const getAuctionBidPolicy = (auction = {}) => {
  const status = normalizeAuctionStatus(auction.status);
  const endsAt = auction.endsAt || auction.ends_at;
  const endsAtMs = endsAt ? new Date(endsAt).getTime() : null;
  const now = Date.now();
  const isPastEnd = Number.isFinite(endsAtMs) && endsAtMs <= now;
  const isLive = status === AUCTION_STATES.LIVE && !isPastEnd;
  const highBid = Number(auction.highBid ?? auction.high_bid ?? 0);
  const bidIncrement = Number(auction.bidIncrement ?? auction.bid_increment ?? 25000);
  return {
    isLive,
    status,
    isPastEnd,
    minimumBid: highBid + bidIncrement,
    requiredDepositRatio: 0.05,
    minimumDeposit: 100000,
    antiSnipingWindowSeconds: 120,
    antiSnipingExtensionSeconds: 120,
  };
};

export const publicAuctionRules = () => ({
  states: Object.values(AUCTION_STATES),
  actions: Object.values(AUCTION_ACTIONS),
  terminalStates: Array.from(terminalAuctionStates),
  transitions: allowedTransitions,
  bidding: {
    serverAuthoritative: true,
    requiresAuthenticatedBidder: true,
    duplicateProtection: 'Idempotency-Key header or idempotencyKey body field',
    deposit: 'max(PKR 100,000, 5% of bid amount)',
    antiSniping: 'Bids inside the final 120 seconds extend the auction by 120 seconds.',
    selfOutbidBlocked: true,
  },
});
