import { knowledgeDocuments } from './knowledgeDocuments.js';
import type { ChatMessage, KnowledgeSnippet } from '../types.js';

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

const scoreDocument = (document: KnowledgeSnippet, query: string) => {
  const text = normalize(`${document.title} ${document.text} ${document.tags.join(' ')}`);
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
};

export const retrieveKnowledge = (messages: ChatMessage[], limit = 4): KnowledgeSnippet[] => {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  if (!latestUserMessage.trim()) return [];

  return knowledgeDocuments
    .map((document) => ({ ...document, score: scoreDocument(document, latestUserMessage) }))
    .filter((document) => (document.score || 0) > 0)
    .sort((left, right) => (right.score || 0) - (left.score || 0))
    .slice(0, limit);
};
