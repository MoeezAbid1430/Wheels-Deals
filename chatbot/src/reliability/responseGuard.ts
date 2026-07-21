import { appConfig } from '../config.js';
import type { ChatMessage, ConversationIntent, ReliabilityCheck, ReliabilityReport, ToolEvent } from '../types.js';

const toolNamesForLiveData = new Set([
  'search_listings',
  'get_listing_details',
  'get_live_auction_status',
  'get_user_garage',
  'find_services_nearby',
  'compare_vehicles',
  'get_recommendations',
  'predict_vehicle_price',
]);

const hasLiveTool = (toolEvents: ToolEvent[]) => toolEvents.some((event) => toolNamesForLiveData.has(event.name) && event.ok !== false);

const latestUserText = (messages: ChatMessage[]) =>
  [...messages].reverse().find((message) => message.role === 'user')?.content || '';

const containsSensitiveLeak = (answer: string) =>
  /\b\d{5}-?\d{7}-?\d\b/.test(answer) ||
  /\b03\d{2}-?\d{7}\b/.test(answer) ||
  /admin notes?|risk score|payment proof|passport number|bank account number/i.test(answer);

const containsLiveClaim = (answer: string) =>
  /current bid|highest bid|watchers?|viewing now|available now|exact price|live auction|ending in|reserve met|stock is available/i.test(answer) ||
  /\bPKR\s?\d[\d,]{4,}/i.test(answer);

export const applyResponseGuard = ({
  answer,
  messages,
  intent,
  toolEvents,
}: {
  answer: string;
  messages: ChatMessage[];
  intent: ConversationIntent;
  toolEvents: ToolEvent[];
}): ReliabilityReport => {
  const checks: ReliabilityCheck[] = [];
  let finalAnswer = answer.trim();
  const userText = latestUserText(messages);
  const liveToolUsed = hasLiveTool(toolEvents);

  const liveDataCheckPassed = !intent.needsLiveData || liveToolUsed || !containsLiveClaim(finalAnswer);
  checks.push({
    name: 'grounding_for_live_data',
    passed: liveDataCheckPassed,
    severity: liveDataCheckPassed ? 'info' : 'warning',
    message: liveDataCheckPassed
      ? 'Live-data claims are grounded or not required.'
      : 'Answer may contain live marketplace claims without a successful live-data tool call.',
  });

  if (!liveDataCheckPassed && appConfig.groundingStrictness !== 'relaxed') {
    finalAnswer += '\n\nLive data note: I could not verify the latest marketplace or auction state from the backend for this answer, so confirm live price, availability, watchers, and bid status on the listing page before acting.';
  }

  const sensitiveCheckPassed = !containsSensitiveLeak(finalAnswer);
  checks.push({
    name: 'sensitive_data_exposure',
    passed: sensitiveCheckPassed,
    severity: sensitiveCheckPassed ? 'info' : 'critical',
    message: sensitiveCheckPassed
      ? 'No obvious sensitive identity/payment leakage detected.'
      : 'Potential sensitive identity/payment data appeared in the answer.',
  });

  if (!sensitiveCheckPassed) {
    finalAnswer = 'I cannot display sensitive identity, payment, admin, or private verification data. I can still help with safe status summaries, next steps, and public marketplace information.';
  }

  checks.push({
    name: 'user_goal_clarity',
    passed: Boolean(userText.trim()),
    severity: userText.trim() ? 'info' : 'warning',
    message: userText.trim() ? 'User request was present.' : 'No clear user message was provided.',
  });

  return { checks, finalAnswer };
};
