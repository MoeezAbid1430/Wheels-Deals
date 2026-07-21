import { appConfig } from '../config.js';
import { buildDemoAnswer } from '../dialogue/demoAnswer.js';
import { classifyIntent } from '../dialogue/intentRouter.js';
import { conversationStore } from '../memory/conversationStore.js';
import { logEvent, userMessageFingerprint } from '../observability/eventLogger.js';
import { buildSystemPrompt } from '../prompts/systemPrompt.js';
import { applyResponseGuard } from '../reliability/responseGuard.js';
import { sanitizeForModel } from '../reliability/sanitize.js';
import { retrieveKnowledge } from '../retrieval/knowledgeBase.js';
import { ToolRegistry } from '../tools/registry.js';
import type { ChatMessage, ChatRequestBody, ChatRunResult, StreamEvent, ToolExecutionContext, ToolEvent } from '../types.js';
import { openAiClient } from './client.js';

const toolRegistry = new ToolRegistry();

const toInputItem = (message: ChatMessage) => ({
  role: message.role,
  content: [{ type: 'input_text', text: message.content }],
});

const getResponseText = (response: any) => {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();

  const messageItem = (response?.output || []).find((item: any) => item.type === 'message');
  const chunks = (messageItem?.content || [])
    .filter((item: any) => item.type === 'output_text')
    .map((item: any) => item.text);

  return chunks.join('\n').trim() || 'I could not find a confident answer for that yet.';
};

const getFunctionCalls = (response: any) => (response?.output || []).filter((item: any) => item.type === 'function_call');

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

interface RunOptions {
  request: ChatRequestBody;
  authToken?: string;
  emit?: (event: StreamEvent) => Promise<void> | void;
}

export const runChat = async ({ request, authToken, emit }: RunOptions): Promise<ChatRunResult> => {
  const priorConversation = request.conversationId ? conversationStore.get(request.conversationId) : [];
  const incomingMessages = request.messages.filter((message) => message.role !== 'system');
  const messages = [...priorConversation, ...incomingMessages].slice(-12);
  const intent = classifyIntent(messages);
  const knowledge = appConfig.enableRag ? retrieveKnowledge(messages) : [];
  const toolContext: ToolExecutionContext = {
    authToken: authToken || request.userContext?.authToken,
    userId: request.userContext?.userId,
    city: request.userContext?.city || appConfig.defaultCity,
  };

  await emit?.({
    type: 'intent',
    data: intent,
  });

  await logEvent({
    type: 'chat_started',
    conversationId: request.conversationId,
    intent,
    latestUserMessage: userMessageFingerprint(incomingMessages[incomingMessages.length - 1]?.content || ''),
    messageCount: messages.length,
  });

  await emit?.({
    type: 'knowledge',
    data: {
      count: knowledge.length,
      snippets: knowledge.map((snippet) => ({ id: snippet.id, title: snippet.title, source: snippet.source })),
    },
  });

  if (!appConfig.openAiConfigured) {
    const preflightToolEvents: ToolEvent[] = [];
    for (const toolName of intent.recommendedTools.slice(0, 2)) {
      const startedAt = Date.now();
      await emit?.({ type: 'tool_call', data: { name: toolName, args: { city: toolContext.city, q: incomingMessages[incomingMessages.length - 1]?.content || '' } } });
      const args = toolName === 'get_auction_rules'
        ? {}
        : { city: toolContext.city, q: incomingMessages[incomingMessages.length - 1]?.content || '' };
      const result = await toolRegistry.invoke(toolName, args, toolContext);
      const sanitizedResult = sanitizeForModel(result);
      const ok = Boolean((result as { ok?: unknown })?.ok ?? true);
      const durationMs = Date.now() - startedAt;
      preflightToolEvents.push({ name: toolName, args, result: sanitizedResult, durationMs, ok });
      await emit?.({ type: 'tool_result', data: { name: toolName, result: sanitizedResult, durationMs, ok } });
    }

    const rawDemoAnswer = buildDemoAnswer({ messages, intent, knowledge, toolEvents: preflightToolEvents });
    const reliability = applyResponseGuard({
      answer: rawDemoAnswer,
      messages,
      intent,
      toolEvents: preflightToolEvents,
    });
    const answer = reliability.finalAnswer;
    const responseId = `demo_${Date.now()}`;

    if (request.conversationId) {
      conversationStore.append(request.conversationId, [
        ...incomingMessages,
        { role: 'assistant', content: answer },
      ]);
    }

    await emit?.({ type: 'reliability', data: reliability });
    await emit?.({ type: 'final', data: { responseId, answer } });
    await logEvent({
      type: 'chat_completed',
      conversationId: request.conversationId,
      responseId,
      intent,
      mode: 'demo_without_openai_key',
      toolCount: preflightToolEvents.length,
      reliabilityChecks: reliability.checks.map((check) => ({ name: check.name, passed: check.passed, severity: check.severity })),
    });

    return {
      responseId,
      answer,
      knowledge,
      toolEvents: preflightToolEvents,
      intent,
      reliability,
    };
  }

  const responseInput = [
    ...messages.map(toInputItem),
  ];

  let response = await openAiClient.responses.create({
    model: appConfig.openAiModel,
    instructions: buildSystemPrompt({ userContext: request.userContext, knowledgeSnippets: knowledge }),
    input: responseInput as any,
    tools: appConfig.enableLiveTools ? (toolRegistry.definitions as any) : [],
    max_tool_calls: appConfig.maxToolCalls,
    temperature: 0.2,
    store: false,
    metadata: {
      application: 'wheels-deals-chatbot',
      surface: request.userContext?.activeSurface || 'unknown',
    },
  } as any);

  const toolEvents: ToolEvent[] = [];
  let toolLoopCount = 0;

  while (toolLoopCount < appConfig.maxToolCalls) {
    const functionCalls = getFunctionCalls(response);
    if (!functionCalls.length) break;

    const outputs = [];
    for (const call of functionCalls) {
      const args = safeJsonParse(call.arguments || '{}');
      await emit?.({ type: 'tool_call', data: { name: call.name, args } });
      const startedAt = Date.now();
      const result = await toolRegistry.invoke(call.name, args, toolContext);
      const sanitizedResult = sanitizeForModel(result);
      const durationMs = Date.now() - startedAt;
      const ok = Boolean((result as { ok?: unknown })?.ok ?? true);
      toolEvents.push({ name: call.name, args, result: sanitizedResult, durationMs, ok });
      await emit?.({ type: 'tool_result', data: { name: call.name, result: sanitizedResult, durationMs, ok } });
      await logEvent({
        type: 'tool_completed',
        conversationId: request.conversationId,
        toolName: call.name,
        durationMs,
        ok,
      });
      outputs.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(sanitizedResult),
      });
    }

    response = await openAiClient.responses.create({
      model: appConfig.openAiModel,
      previous_response_id: response.id,
      input: outputs as any,
      store: false,
    } as any);

    toolLoopCount += functionCalls.length;
  }

  const rawAnswer = getResponseText(response);
  const reliability = applyResponseGuard({
    answer: rawAnswer,
    messages,
    intent,
    toolEvents,
  });
  const answer = reliability.finalAnswer;

  if (request.conversationId) {
    conversationStore.append(request.conversationId, [
      ...incomingMessages,
      { role: 'assistant', content: answer },
    ]);
  }

  await emit?.({
    type: 'reliability',
    data: reliability,
  });

  await emit?.({
    type: 'final',
    data: {
      responseId: response.id,
      answer,
    },
  });

  await logEvent({
    type: 'chat_completed',
    conversationId: request.conversationId,
    responseId: response.id,
    intent,
    toolCount: toolEvents.length,
    reliabilityChecks: reliability.checks.map((check) => ({ name: check.name, passed: check.passed, severity: check.severity })),
  });

  return {
    responseId: response.id,
    answer,
    knowledge,
    toolEvents,
    intent,
    reliability,
  };
};
