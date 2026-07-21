import type { ChatMessage, ConversationIntent } from '../types.js';

const latestUserText = (messages: ChatMessage[]) =>
  [...messages].reverse().find((message) => message.role === 'user')?.content.toLowerCase() || '';

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

export const classifyIntent = (messages: ChatMessage[]): ConversationIntent => {
  const text = latestUserText(messages);

  if (includesAny(text, ['compare', 'comparison', 'versus', ' vs ', 'difference between'])) {
    return { name: 'comparison', needsLiveData: true, recommendedTools: ['compare_vehicles', 'search_listings'], confidence: 0.82 };
  }

  if (includesAny(text, ['auction', 'bid', 'reserve', 'watcher', 'winning', 'current bid', 'anti-sniping'])) {
    return { name: 'auction', needsLiveData: true, recommendedTools: ['get_live_auction_status', 'get_auction_rules', 'search_listings'], confidence: 0.86 };
  }

  if (includesAny(text, ['price prediction', 'predict price', 'market value', 'valuation', 'fair price', 'worth', 'how much is my car', 'how much is this car'])) {
    return { name: 'valuation', needsLiveData: true, recommendedTools: ['predict_vehicle_price', 'search_listings'], confidence: 0.84 };
  }

  if (includesAny(text, ['garage', 'my car', 'owned vehicle', 'service history', 'accessory fit', 'fits my'])) {
    return { name: 'garage', needsLiveData: true, recommendedTools: ['get_user_garage', 'get_recommendations'], confidence: 0.8 };
  }

  if (includesAny(text, ['mechanic', 'workshop', 'repair', 'oil change', 'car wash', 'service near', 'inspection center'])) {
    return { name: 'services', needsLiveData: true, recommendedTools: ['find_services_nearby'], confidence: 0.84 };
  }

  if (includesAny(text, ['find', 'search', 'under', 'budget', 'price', 'city', 'mileage', 'automatic', 'manual', 'honda', 'toyota', 'bike'])) {
    return { name: 'marketplace', needsLiveData: true, recommendedTools: ['search_listings', 'get_recommendations'], confidence: 0.74 };
  }

  if (includesAny(text, ['kyc', 'privacy', 'policy', 'refund', 'deposit', 'cnic', 'verification', 'terms'])) {
    return { name: 'policy', needsLiveData: false, recommendedTools: ['get_auction_rules'], confidence: 0.78 };
  }

  if (includesAny(text, ['help', 'how do i', 'what should i', 'explain'])) {
    return { name: 'support', needsLiveData: false, recommendedTools: [], confidence: 0.62 };
  }

  return { name: 'general', needsLiveData: false, recommendedTools: [], confidence: 0.5 };
};
