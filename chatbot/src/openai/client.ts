import OpenAI from 'openai';
import { appConfig } from '../config.js';

export const openAiClient = new OpenAI({
  apiKey: appConfig.openAiApiKey || 'demo-key-not-used',
});
