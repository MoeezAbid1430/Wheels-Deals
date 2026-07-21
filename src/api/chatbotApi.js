const CHATBOT_BASE_URL = process.env.REACT_APP_CHATBOT_URL || 'http://localhost:4100';
const AUTH_TOKEN_KEY = 'wheels_deals_auth_token';

const buildChatbotUrl = (path) => `${CHATBOT_BASE_URL.replace(/\/$/, '')}${path}`;

const getAuthToken = () => window.localStorage.getItem(AUTH_TOKEN_KEY);

const parseSseData = (chunk) => {
  const events = [];
  const blocks = chunk.split('\n\n');

  blocks.forEach((block) => {
    if (!block.trim()) return;
    const lines = block.split('\n');
    const event = lines.find((line) => line.startsWith('event:'))?.replace('event:', '').trim() || 'message';
    const dataLine = lines.find((line) => line.startsWith('data:'));

    if (!dataLine) return;

    try {
      events.push({ event, data: JSON.parse(dataLine.replace('data:', '').trim()) });
    } catch {
      events.push({ event, data: dataLine.replace('data:', '').trim() });
    }
  });

  return events;
};

export const chatbotApi = {
  health: async () => {
    const response = await fetch(buildChatbotUrl('/health'), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Chatbot service is offline.');
    return response.json();
  },

  sendMessage: async ({ conversationId, messages, userContext, onEvent }) => {
    const response = await fetch(buildChatbotUrl('/chat'), {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      },
      body: JSON.stringify({
        conversationId,
        stream: true,
        messages,
        userContext,
      }),
    });

    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Chatbot could not answer right now.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lastBoundary = buffer.lastIndexOf('\n\n');
      if (lastBoundary === -1) continue;

      const ready = buffer.slice(0, lastBoundary + 2);
      buffer = buffer.slice(lastBoundary + 2);
      parseSseData(ready).forEach(onEvent);
    }

    if (buffer.trim()) parseSseData(buffer).forEach(onEvent);
  },

  submitFeedback: async ({ conversationId, responseId, rating, reason, module }) => {
    const response = await fetch(buildChatbotUrl('/feedback'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      },
      body: JSON.stringify({ conversationId, responseId, rating, reason, module }),
    });

    if (!response.ok) throw new Error('Feedback could not be saved.');
    return response.json();
  },
};
