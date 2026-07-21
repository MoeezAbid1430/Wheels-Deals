import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { appConfig } from '../config.js';

export interface FeedbackSubmission {
  conversationId?: string;
  responseId?: string;
  rating: 'positive' | 'negative' | 'neutral';
  reason?: string;
  expectedAnswer?: string;
  module?: string;
}

export const saveFeedback = async (feedback: FeedbackSubmission) => {
  await mkdir(appConfig.logDir, { recursive: true });
  const record = {
    at: new Date().toISOString(),
    ...feedback,
  };
  await appendFile(path.join(appConfig.logDir, 'chatbot-feedback.jsonl'), `${JSON.stringify(record)}\n`, 'utf8');
  return record;
};
