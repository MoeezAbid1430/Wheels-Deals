import type { KnowledgeSnippet } from '../types.js';

export const knowledgeDocuments: KnowledgeSnippet[] = [
  {
    id: 'auction-rules-core',
    title: 'Auction rules and deposits',
    source: 'internal://auction-rules',
    tags: ['auction', 'deposit', 'bidding', 'reserve', 'anti-sniping'],
    text: 'Auction answers should explain that live bid values, reserve status, watchers, and end times come from backend tools. Deposits exist to discourage fake bidding. The bot should never invent a winning bid or final price when a live auction tool is available.',
  },
  {
    id: 'privacy-and-kyc',
    title: 'KYC and privacy guidance',
    source: 'internal://trust-center',
    tags: ['kyc', 'privacy', 'cnic', 'verification', 'trust'],
    text: 'KYC, privacy, and identity guidance should be conservative. Sensitive identity documents, payment proofs, bank details, and admin notes must never be exposed in chatbot answers. For account-specific verification questions, the bot should rely on authenticated backend tools and summarize only safe status labels.',
  },
  {
    id: 'garage-and-fitment',
    title: 'Garage and fitment policy',
    source: 'internal://garage',
    tags: ['garage', 'accessories', 'fitment', 'owned vehicles'],
    text: 'Garage-aware answers should personalize accessory suggestions, vehicle reminders, and service guidance to the user active vehicle. If fitment is uncertain, the assistant should say so clearly and recommend seller confirmation or inspection instead of pretending compatibility is certain.',
  },
  {
    id: 'marketplace-vs-auctions',
    title: 'Marketplace versus auctions',
    source: 'internal://product-rules',
    tags: ['marketplace', 'auction', 'listing', 'buy now'],
    text: 'Marketplace listings are fixed-price or slower-sale inventory. Auction inventory is separate and should be treated as live competition inventory with time pressure, watchers, and bid rules. The bot should help users understand which surface they are on before recommending an action.',
  },
  {
    id: 'services-near-me',
    title: 'Services and repair shops',
    source: 'internal://services',
    tags: ['services', 'workshops', 'repair', 'maps', 'oil change', 'car wash'],
    text: 'Service discovery should prefer nearby verified providers when the app has user location or city context. Answers should distinguish between workshops, inspection centers, tyre shops, oil change providers, car washes, and dealerships instead of treating all automotive services as one category.',
  },
];
