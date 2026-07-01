import { platformApi } from '../api';

export const paymentStatuses = {
  pending: 'pending',
  processing: 'processing',
  succeeded: 'succeeded',
  failed: 'failed',
  refunded: 'refunded',
};

export const kycStatuses = {
  notStarted: 'not_started',
  pending: 'pending',
  verified: 'verified',
  rejected: 'rejected',
  manualReview: 'manual_review',
};

export const paymentService = {
  getWallet: () => platformApi.wallet.summary(),
  createTopUpIntent: (payload) => platformApi.wallet.createTopUpIntent(payload),
  requestWithdrawal: (payload) => platformApi.wallet.requestWithdrawal(payload),
  getTransactions: (query) => platformApi.wallet.transactions(query),
  getDepositHolds: () => platformApi.wallet.holds(),
  createDepositHold: (payload) => platformApi.wallet.createHold(payload),
  releaseDepositHold: (id, payload) => platformApi.wallet.releaseHold(id, payload),
  forfeitDepositHold: (id, payload) => platformApi.wallet.forfeitHold(id, payload),
  startKyc: (payload) => platformApi.integrations.startKyc(payload),
  getKycProfile: () => platformApi.trust.getKycProfile(),
  submitKycDocument: (payload) => platformApi.trust.submitKycDocument(payload),
  checkBidderEligibility: (payload) => platformApi.trust.bidderEligibility(payload),
};
