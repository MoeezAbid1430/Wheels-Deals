import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4100),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default('gpt-5-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-large'),
  CHATBOT_BACKEND_BASE_URL: z.string().url().default('http://localhost:4000/api'),
  CHATBOT_PUBLIC_BASE_URL: z.string().url().default('http://localhost:4100'),
  CHATBOT_SYSTEM_NAME: z.string().default('Wheels&Deals Copilot'),
  CHATBOT_ENABLE_RAG: z.coerce.boolean().default(true),
  CHATBOT_ENABLE_LIVE_TOOLS: z.coerce.boolean().default(true),
  CHATBOT_DEFAULT_CITY: z.string().default('Karachi'),
  CHATBOT_MAX_TOOL_CALLS: z.coerce.number().int().min(1).max(12).default(6),
  CHATBOT_ALLOWED_TOOL_NAMES: z.string().default('search_listings,get_listing_details,get_live_auction_status,get_user_garage,find_services_nearby,compare_vehicles,get_auction_rules,get_recommendations,predict_vehicle_price'),
  CHATBOT_LIVE_TOOL_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(8000),
  CHATBOT_LIVE_TOOL_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
  CHATBOT_LOG_EVENTS: z.coerce.boolean().default(true),
  CHATBOT_LOG_DIR: z.string().default('logs'),
  CHATBOT_GROUNDING_STRICTNESS: z.enum(['relaxed', 'balanced', 'strict']).default('balanced'),
});

const parsed = envSchema.parse(process.env);

export const appConfig = {
  port: parsed.PORT,
  openAiApiKey: parsed.OPENAI_API_KEY,
  openAiConfigured: Boolean(parsed.OPENAI_API_KEY),
  openAiModel: parsed.OPENAI_MODEL,
  embeddingModel: parsed.OPENAI_EMBEDDING_MODEL,
  backendBaseUrl: parsed.CHATBOT_BACKEND_BASE_URL.replace(/\/$/, ''),
  publicBaseUrl: parsed.CHATBOT_PUBLIC_BASE_URL.replace(/\/$/, ''),
  systemName: parsed.CHATBOT_SYSTEM_NAME,
  enableRag: parsed.CHATBOT_ENABLE_RAG,
  enableLiveTools: parsed.CHATBOT_ENABLE_LIVE_TOOLS,
  defaultCity: parsed.CHATBOT_DEFAULT_CITY,
  maxToolCalls: parsed.CHATBOT_MAX_TOOL_CALLS,
  allowedToolNames: parsed.CHATBOT_ALLOWED_TOOL_NAMES.split(',').map((value) => value.trim()).filter(Boolean),
  liveToolTimeoutMs: parsed.CHATBOT_LIVE_TOOL_TIMEOUT_MS,
  liveToolRetries: parsed.CHATBOT_LIVE_TOOL_RETRIES,
  logEvents: parsed.CHATBOT_LOG_EVENTS,
  logDir: parsed.CHATBOT_LOG_DIR,
  groundingStrictness: parsed.CHATBOT_GROUNDING_STRICTNESS,
};
