export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatUserContext {
  userId?: string;
  city?: string;
  authToken?: string;
  viewingListingId?: string;
  viewingAuctionId?: string;
  garageVehicleId?: string;
  garageSummary?: string;
  activeSurface?: 'home' | 'marketplace' | 'auctions' | 'garage' | 'accessories' | 'services' | 'community' | 'support';
}

export interface ChatRequestBody {
  conversationId?: string;
  stream?: boolean;
  messages: ChatMessage[];
  userContext?: ChatUserContext;
}

export interface KnowledgeSnippet {
  id: string;
  title: string;
  text: string;
  tags: string[];
  source: string;
  score?: number;
}

export interface ToolExecutionContext {
  authToken?: string;
  userId?: string;
  city?: string;
}

export interface ToolEvent {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
  durationMs?: number;
  ok?: boolean;
}

export interface ConversationIntent {
  name: 'auction' | 'marketplace' | 'valuation' | 'services' | 'garage' | 'policy' | 'comparison' | 'support' | 'general';
  needsLiveData: boolean;
  recommendedTools: string[];
  confidence: number;
}

export interface ReliabilityCheck {
  name: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface ReliabilityReport {
  checks: ReliabilityCheck[];
  finalAnswer: string;
}

export interface ChatRunResult {
  responseId?: string;
  answer: string;
  knowledge: KnowledgeSnippet[];
  toolEvents: ToolEvent[];
  intent: ConversationIntent;
  reliability: ReliabilityReport;
}

export interface StreamEvent {
  type: 'status' | 'intent' | 'knowledge' | 'tool_call' | 'tool_result' | 'reliability' | 'final' | 'error';
  data: unknown;
}
