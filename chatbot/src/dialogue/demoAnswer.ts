import type { ChatMessage, ConversationIntent, KnowledgeSnippet, ToolEvent } from '../types.js';

const latestUserText = (messages: ChatMessage[]) =>
  [...messages].reverse().find((message) => message.role === 'user')?.content || '';

const summarizeTool = (toolEvents: ToolEvent[]) => {
  const successful = toolEvents.filter((event) => event.ok !== false);
  if (!successful.length) return 'I could not verify live backend data for this turn.';
  return `I checked ${successful.map((event) => event.name).join(', ')}.`;
};

export const buildDemoAnswer = ({
  messages,
  intent,
  knowledge,
  toolEvents,
}: {
  messages: ChatMessage[];
  intent: ConversationIntent;
  knowledge: KnowledgeSnippet[];
  toolEvents: ToolEvent[];
}) => {
  const userText = latestUserText(messages);
  const toolSummary = summarizeTool(toolEvents);
  const policyNote = knowledge[0]?.title ? `Relevant trust note: ${knowledge[0].title}.` : '';

  if (intent.name === 'auction') {
    return `${toolSummary}\n\nFor auctions, focus on current bid, next minimum bid, reserve status, watchers, end time, required deposit, and anti-sniping extension. I will not invent live bid numbers unless the auction backend verifies them.\n\n${policyNote}`.trim();
  }

  if (intent.name === 'marketplace') {
    return `${toolSummary}\n\nFor this marketplace search, narrow by city, make, model, year range, price, mileage, transmission, fuel, seller verification, and inspection score. Query understood: "${userText}".`;
  }

  if (intent.name === 'valuation') {
    return `${toolSummary}\n\nFor price prediction, I use the Pakistan comparable-sales baseline: make, model, variant, year, mileage, engine cc, city demand, transmission, fuel, inspection score, seller trust, and nearby comparable listings. Treat the range as guidance until the model is trained on completed Pakistani sale prices. Query understood: "${userText}".`;
  }

  if (intent.name === 'garage') {
    return `${toolSummary}\n\nGarage-aware recommendations should use your active owned vehicle, then match accessories by make, model, year, variant, engine, and fitment type. If fitment is uncertain, ask the seller to confirm before payment.`;
  }

  if (intent.name === 'services') {
    return `${toolSummary}\n\nFor services near you, filter workshops by category, city, verified status, rating, review count, open-now status, and specialty such as oil change, inspection, car wash, tyres, diagnostics, or dealership.`;
  }

  if (intent.name === 'comparison') {
    return `${toolSummary}\n\nA good comparison should cover price, year, mileage, engine cc, fuel, transmission, inspection score, ownership documents, seller trust, maintenance cost, resale demand, and auction pressure if one vehicle is live.`;
  }

  if (intent.name === 'policy') {
    return `${policyNote || 'Policy guidance loaded.'}\n\nFor KYC, payments, privacy, and auction rules, the assistant should explain safe next steps and never reveal CNIC, payment proofs, bank account data, admin notes, or internal risk scores.`;
  }

  return `${toolSummary}\n\nI can help with car search, auctions, garage accessories, comparisons, services near you, KYC/privacy rules, and seller workflows. For live prices or bids, I will use backend tools instead of guessing.`;
};
