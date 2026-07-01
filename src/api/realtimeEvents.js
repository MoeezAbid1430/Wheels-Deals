export const realtimeEvents = {
  auction: {
    bidPlaced: 'auction.bid_placed',
    updated: 'auction.updated',
    outbid: 'auction.outbid',
    reserveMet: 'auction.reserve_met',
    extended: 'auction.extended',
    endingSoon: 'auction.ending_soon',
    ended: 'auction.ended',
    winnerDeclared: 'auction.winner_declared',
    reopened: 'auction.reopened',
  },
  wallet: {
    depositLocked: 'wallet.deposit_locked',
    depositReleased: 'wallet.deposit_released',
    paymentConfirmed: 'wallet.payment_confirmed',
    payoutCreated: 'wallet.payout_created',
  },
  checkout: {
    started: 'checkout.started',
    updated: 'checkout.updated',
    disputeOpened: 'checkout.dispute_opened',
    closed: 'checkout.closed',
  },
  messages: {
    created: 'message.created',
    read: 'message.read',
  },
  notifications: {
    created: 'notification.created',
    read: 'notification.read',
  },
  community: {
    postCreated: 'community.post_created',
    commentCreated: 'community.comment_created',
    reportCreated: 'community.report_created',
  },
  admin: {
    reviewUpdated: 'admin.review_updated',
    moderationUpdated: 'admin.moderation_updated',
  },
};
