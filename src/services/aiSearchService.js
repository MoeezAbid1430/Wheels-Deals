import { platformApi } from '../api';

export const aiSearchService = {
  searchListings: (query) => platformApi.search.listings(query),
  searchAuctions: (query) => platformApi.search.auctions(query),
  getSuggestions: (query) => platformApi.search.suggestions(query),
  getFacets: (query) => platformApi.search.facets(query),
  getHomeRecommendations: (query) => platformApi.recommendations.home(query),
  getAuctionRecommendations: (query) => platformApi.recommendations.auctions(query),
  getSimilarListings: (listingId) => platformApi.recommendations.similar(listingId),
  sendRecommendationFeedback: (payload) => platformApi.recommendations.feedback(payload),
  estimatePrice: (listingId, payload) => platformApi.ai.priceEstimate(listingId, payload),
  scoreListingQuality: (payload) => platformApi.ai.listingQuality(payload),
  checkFraudRisk: (payload) => platformApi.ai.fraudCheck(payload),
  naturalLanguageSearch: (payload) => platformApi.ai.naturalLanguageSearch(payload),
  summarizeCommunityThread: (payload) => platformApi.ai.summarizeThread(payload),
};
