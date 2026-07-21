import type { ChatMessage } from '../types.js';

const MAX_MESSAGES_PER_THREAD = 20;

class InMemoryConversationStore {
  private readonly conversations = new Map<string, ChatMessage[]>();

  get(conversationId: string): ChatMessage[] {
    return [...(this.conversations.get(conversationId) || [])];
  }

  append(conversationId: string, messages: ChatMessage[]): void {
    const current = this.get(conversationId);
    const next = [...current, ...messages].slice(-MAX_MESSAGES_PER_THREAD);
    this.conversations.set(conversationId, next);
  }
}

export const conversationStore = new InMemoryConversationStore();
