import { createId } from './security.js';

const providerName = process.env.PAYMENT_PROVIDER || 'mock';
const configuredProviders = new Set(['mock']);
const sandboxMode = providerName === 'mock';

const methodCatalog = {
  bank_transfer: {
    id: 'bank_transfer',
    label: 'Bank transfer / IBFT',
    description: 'Manual banking review flow for auction settlement, seller payouts, and high-value proof checks.',
    mode: sandboxMode ? 'sandbox' : 'manual_review',
    configured: true,
    sandboxReady: true,
    requiresAdminReview: true,
    acceptedFor: ['wallet_topup', 'auction_checkout', 'seller_payout'],
  },
  easypaisa: {
    id: 'easypaisa',
    label: 'Easypaisa',
    description: 'Pakistan wallet rail with masked wallet storage and admin-side reference review.',
    mode: sandboxMode ? 'sandbox' : 'adapter_pending',
    configured: sandboxMode,
    sandboxReady: sandboxMode,
    requiresAdminReview: true,
    acceptedFor: ['auction_checkout', 'seller_payout'],
  },
  jazzcash: {
    id: 'jazzcash',
    label: 'JazzCash',
    description: 'Parallel mobile wallet path for buyer settlement and seller payout review.',
    mode: sandboxMode ? 'sandbox' : 'adapter_pending',
    configured: sandboxMode,
    sandboxReady: sandboxMode,
    requiresAdminReview: true,
    acceptedFor: ['auction_checkout', 'seller_payout'],
  },
  card_gateway: {
    id: 'card_gateway',
    label: 'Card gateway',
    description: 'Adapter-first card or merchant gateway path that stores references, not raw card data.',
    mode: sandboxMode ? 'sandbox' : 'adapter_pending',
    configured: sandboxMode,
    sandboxReady: sandboxMode,
    requiresAdminReview: true,
    acceptedFor: ['wallet_topup', 'auction_checkout'],
  },
  manual_confirmation: {
    id: 'manual_confirmation',
    label: 'Manual confirmation',
    description: 'Controlled beta fallback for high-value deals that need human payment confirmation.',
    mode: 'manual_review',
    configured: true,
    sandboxReady: true,
    requiresAdminReview: true,
    acceptedFor: ['auction_checkout', 'seller_payout'],
  },
};

const mockProvider = {
  name: 'mock',
  async createTopUpIntent({ amount, currency = 'PKR', userId }) {
    return {
      provider: 'mock',
      providerReference: createId('mockpay'),
      amount,
      currency,
      status: 'succeeded',
      metadata: {
        userId,
        mode: 'dev',
        message: 'Mock provider succeeds immediately. Replace with a real banking gateway adapter before launch.',
      },
    };
  },
  verifyWebhook() {
    return { verified: true, event: null };
  },
};

const bankProvider = {
  name: 'bank',
  async createTopUpIntent() {
    throw new Error('Banking provider is not configured. Set PAYMENT_PROVIDER=mock for dev or implement the selected bank gateway adapter.');
  },
  verifyWebhook() {
    throw new Error('Banking webhook verification is not configured.');
  },
};

export const getPaymentProvider = () => {
  if (providerName === 'mock') return mockProvider;
  if (providerName === 'bank') return bankProvider;
  throw new Error(`Unknown PAYMENT_PROVIDER "${providerName}".`);
};

export const getPaymentMethodOptions = () => (
  Object.values(methodCatalog).map((method) => ({
    ...method,
    defaultMethodStatus: sandboxMode
      ? 'sandbox_ready'
      : method.configured
        ? 'verified'
        : 'pending_verification',
  }))
);

export const getPaymentMethodConfig = (methodId) => (
  getPaymentMethodOptions().find((method) => method.id === methodId) || null
);

export const getPaymentProviderInfo = () => ({
  provider: providerName,
  configured: configuredProviders.has(providerName),
  live: providerName !== 'mock' && configuredProviders.has(providerName),
  sandbox: sandboxMode,
  methods: getPaymentMethodOptions(),
});
