import http from 'node:http';
import { appConfig } from './config.js';
import { saveFeedback } from './feedback/feedbackStore.js';
import { runChat } from './openai/chatRunner.js';
import type { ChatRequestBody } from './types.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const sendJson = (response: http.ServerResponse, status: number, payload: unknown) => {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    ...corsHeaders,
  });
  response.end(JSON.stringify(payload));
};

const readBody = async (request: http.IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const wantsSse = (request: http.IncomingMessage, body: ChatRequestBody) =>
  body.stream === true || String(request.headers.accept || '').includes('text/event-stream');

const writeSseEvent = (response: http.ServerResponse, event: string, data: unknown) => {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
};

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  const url = new URL(request.url, appConfig.publicBaseUrl);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'wheels-deals-chatbot',
      model: appConfig.openAiModel,
      openAiConfigured: appConfig.openAiConfigured,
      backendBaseUrl: appConfig.backendBaseUrl,
      ragEnabled: appConfig.enableRag,
      liveToolsEnabled: appConfig.enableLiveTools,
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/capabilities') {
    sendJson(response, 200, {
      ok: true,
      stack: {
        llm: 'OpenAI Responses API',
        model: appConfig.openAiModel,
        mode: appConfig.openAiConfigured ? 'openai' : 'demo_without_openai_key',
        embeddings: appConfig.embeddingModel,
        transport: 'SSE + JSON',
        retrieval: appConfig.enableRag ? 'starter lexical corpus, pgvector planned' : 'disabled',
        liveTools: appConfig.enableLiveTools,
        reliability: {
          groundingStrictness: appConfig.groundingStrictness,
          eventLogging: appConfig.logEvents,
          toolTimeoutMs: appConfig.liveToolTimeoutMs,
          toolRetries: appConfig.liveToolRetries,
        },
      },
      allowedToolNames: appConfig.allowedToolNames,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/chat') {
    try {
      const body = (await readBody(request)) as ChatRequestBody;
      const authToken = request.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!Array.isArray(body.messages) || !body.messages.length) {
        sendJson(response, 400, { error: 'messages is required.' });
        return;
      }

      if (wantsSse(request, body)) {
        response.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          ...corsHeaders,
        });

        writeSseEvent(response, 'status', { stage: 'started' });

        await runChat({
          request: body,
          authToken,
          emit: async (event) => {
            writeSseEvent(response, event.type, event.data);
          },
        });

        writeSseEvent(response, 'done', { ok: true });
        response.end();
        return;
      }

      const result = await runChat({ request: body, authToken });
      sendJson(response, 200, { ok: true, ...result });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown chatbot error';
      sendJson(response, 500, { ok: false, error: message });
      return;
    }
  }

  if (request.method === 'POST' && url.pathname === '/feedback') {
    try {
      const body = await readBody(request);
      if (!['positive', 'negative', 'neutral'].includes(String(body.rating))) {
        sendJson(response, 400, { error: 'rating must be positive, negative, or neutral.' });
        return;
      }

      const record = await saveFeedback({
        conversationId: body.conversationId,
        responseId: body.responseId,
        rating: body.rating,
        reason: body.reason,
        expectedAnswer: body.expectedAnswer,
        module: body.module,
      });

      sendJson(response, 201, { ok: true, feedback: record });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown feedback error';
      sendJson(response, 500, { ok: false, error: message });
      return;
    }
  }

  sendJson(response, 404, { error: 'Not found' });
});

export const startServer = () => {
  server.listen(appConfig.port, () => {
    console.log(`Wheels&Deals chatbot listening on http://localhost:${appConfig.port}`);
  });
};
