import { appConfig } from '../config.js';
import type { ChatUserContext, KnowledgeSnippet } from '../types.js';

interface PromptOptions {
  userContext?: ChatUserContext;
  knowledgeSnippets?: KnowledgeSnippet[];
}

export const buildSystemPrompt = ({ userContext, knowledgeSnippets = [] }: PromptOptions) => {
  const contextSummary = [
    `Assistant name: ${appConfig.systemName}.`,
    `Primary market: Pakistan.`,
    `Default city: ${userContext?.city || appConfig.defaultCity}.`,
    userContext?.activeSurface ? `Current product surface: ${userContext.activeSurface}.` : '',
    userContext?.viewingListingId ? `User is viewing listing ${userContext.viewingListingId}.` : '',
    userContext?.viewingAuctionId ? `User is viewing auction ${userContext.viewingAuctionId}.` : '',
    userContext?.garageSummary ? `Garage context: ${userContext.garageSummary}.` : '',
  ].filter(Boolean).join(' ');

  const retrievalContext = knowledgeSnippets.length
    ? `Knowledge snippets:\n${knowledgeSnippets.map((snippet, index) => `${index + 1}. ${snippet.title}: ${snippet.text}`).join('\n')}`
    : 'Knowledge snippets: none attached for this turn.';

  return [
    `You are ${appConfig.systemName}, the in-product assistant for Wheels&Deals.`,
    'Your job is to help buyers, sellers, bidders, and service seekers using accurate live data whenever possible.',
    'Rules:',
    '- Use live tools for auctions, listings, prices, bid state, garage-aware data, recommendations, and services.',
    '- Use attached knowledge snippets for policy, trust, privacy, and help guidance.',
    '- If live data is unavailable, say that clearly instead of inventing values.',
    '- Never reveal KYC documents, payment proofs, internal risk scores, admin notes, or hidden private account data.',
    '- Prefer short, direct, marketplace-operator style answers.',
    '- If the user asks for a comparison or recommendation, explain the reasoning in plain language.',
    contextSummary,
    retrievalContext,
  ].join('\n\n');
};
