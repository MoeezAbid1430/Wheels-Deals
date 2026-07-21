import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Car, ChevronDown, CircleAlert, Gauge, Loader2, Maximize2, MessageCircle, Minimize2, Send, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Wrench, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { chatbotApi } from '../api/chatbotApi';
import { useAuctions } from '../context/AuctionContext';

const CHATBOT_CONVERSATION_KEY = 'wheels_deals_chatbot_conversation_id';

const createConversationId = () => {
  const existing = window.localStorage.getItem(CHATBOT_CONVERSATION_KEY);
  if (existing) return existing;
  const next = `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(CHATBOT_CONVERSATION_KEY, next);
  return next;
};

const inferSurface = (pathname) => {
  if (pathname.includes('auction') || pathname.includes('checkout')) return 'auctions';
  if (pathname.includes('garage')) return 'garage';
  if (pathname.includes('accessor')) return 'accessories';
  if (pathname.includes('repair') || pathname.includes('services')) return 'services';
  if (pathname.includes('community')) return 'community';
  if (pathname.includes('listing') || pathname.includes('buy-car') || pathname.includes('marketplace')) return 'marketplace';
  if (pathname.includes('faq') || pathname.includes('policy') || pathname.includes('trust')) return 'support';
  return 'home';
};

const starterMessages = [
  {
    role: 'assistant',
    content: 'Hi, I am Wheels&Deals Copilot. Ask me to find cars, explain auctions, compare vehicles, suggest garage accessories, or find services near you.',
    meta: { status: 'ready' },
  },
];

const quickPrompts = [
  { label: 'Find cars', icon: Car, text: 'Find automatic Honda cars under 55 lacs in Karachi.' },
  { label: 'Auction help', icon: Gauge, text: 'Explain how this auction deposit and bidding process works.' },
  { label: 'Garage fitment', icon: Sparkles, text: 'Suggest accessories according to the vehicles in my garage.' },
  { label: 'Services', icon: Wrench, text: 'Find verified oil change shops near me.' },
];

const getFallbackAnswer = (message, context) => {
  const text = message.toLowerCase();
  if (text.includes('auction') || text.includes('bid')) {
    return 'Chatbot service is offline, but for the demo: auction questions should be answered with live auction status, deposit rules, watchers, reserve status, and next minimum bid from the backend. Start the chatbot service to verify live numbers.';
  }
  if (text.includes('garage') || text.includes('accessor')) {
    return `Chatbot service is offline, but for the demo: I would use My Garage context${context.garageSummary ? ` (${context.garageSummary})` : ''} to suggest compatible accessories and warn when fitment is uncertain.`;
  }
  if (text.includes('repair') || text.includes('service') || text.includes('oil')) {
    return 'Chatbot service is offline, but for the demo: service questions should route to verified workshops, oil change shops, car washes, inspection centers, and dealerships by city/category.';
  }
  return 'Chatbot service is offline. The UI is ready, but start the chatbot backend on port 4100 with an OpenAI key to get live AI answers.';
};

const ChatbotWidget = () => {
  const location = useLocation();
  const {
    authUser,
    backendStatus,
    myGarage,
    ownedVehicles,
    verification,
  } = useAuctions();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState(starterMessages);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({ checked: false, online: false, label: 'Checking' });
  const [activeTrace, setActiveTrace] = useState({ intent: null, tools: [], reliability: null, responseId: null });
  const conversationId = useMemo(createConversationId, []);
  const scrollRef = useRef(null);

  const activeSurface = inferSurface(location.pathname);
  const garageSummary = myGarage ? `${myGarage.year} ${myGarage.make} ${myGarage.model} ${myGarage.variant || ''}`.trim() : '';

  const userContext = useMemo(() => ({
    userId: authUser?.id,
    city: authUser?.city || myGarage?.city || myGarage?.registrationCity || 'Karachi',
    activeSurface,
    garageVehicleId: myGarage?.id ? String(myGarage.id) : undefined,
    garageSummary,
  }), [activeSurface, authUser?.city, authUser?.id, garageSummary, myGarage?.city, myGarage?.id, myGarage?.registrationCity]);

  useEffect(() => {
    if (!isOpen || serviceStatus.checked) return;
    chatbotApi.health()
      .then((health) => setServiceStatus({ checked: true, online: true, label: `${health.model || 'AI'} online` }))
      .catch(() => setServiceStatus({ checked: true, online: false, label: 'Offline demo mode' }));
  }, [isOpen, serviceStatus.checked]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  const appendMessage = (message) => {
    setMessages((current) => [...current, message]);
  };

  const updateAssistantMessage = (id, patch) => {
    setMessages((current) => current.map((message) => (
      message.id === id ? { ...message, ...patch, meta: { ...message.meta, ...patch.meta } } : message
    )));
  };

  const runPrompt = async (text) => {
    const clean = text.trim();
    if (!clean || isSending) return;

    const userMessage = { role: 'user', content: clean };
    const assistantId = `assistant_${Date.now()}`;
    setDraft('');
    setIsSending(true);
    setActiveTrace({ intent: null, tools: [], reliability: null, responseId: null });
    appendMessage(userMessage);
    appendMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      meta: { status: 'thinking', stage: 'Understanding request' },
    });

    try {
      let finalAnswer = '';
      let responseId = null;

      await chatbotApi.sendMessage({
        conversationId,
        userContext,
        messages: [{ role: 'user', content: clean }],
        onEvent: ({ event, data }) => {
          if (event === 'intent') {
            setActiveTrace((current) => ({ ...current, intent: data }));
            updateAssistantMessage(assistantId, { meta: { status: 'thinking', stage: `Routing: ${data?.name || 'request'}` } });
          }
          if (event === 'knowledge') {
            updateAssistantMessage(assistantId, { meta: { status: 'thinking', stage: `Grounding with ${data?.count || 0} policy notes` } });
          }
          if (event === 'tool_call') {
            setActiveTrace((current) => ({ ...current, tools: [...current.tools, { name: data?.name, status: 'running' }] }));
            updateAssistantMessage(assistantId, { meta: { status: 'thinking', stage: `Checking ${data?.name || 'live data'}` } });
          }
          if (event === 'tool_result') {
            setActiveTrace((current) => ({
              ...current,
              tools: current.tools.map((tool, index, all) => (
                index === all.length - 1 ? { ...tool, status: data?.ok === false ? 'failed' : 'done', durationMs: data?.durationMs } : tool
              )),
            }));
          }
          if (event === 'reliability') {
            setActiveTrace((current) => ({ ...current, reliability: data }));
          }
          if (event === 'final') {
            finalAnswer = data?.answer || '';
            responseId = data?.responseId || null;
            setActiveTrace((current) => ({ ...current, responseId }));
            updateAssistantMessage(assistantId, {
              content: finalAnswer,
              meta: { status: 'done', responseId },
            });
          }
        },
      });

      if (!finalAnswer) {
        updateAssistantMessage(assistantId, {
          content: 'I could not form a final answer. Try asking again with a make, model, city, auction, or listing.',
          meta: { status: 'warning' },
        });
      }
    } catch (error) {
      updateAssistantMessage(assistantId, {
        content: getFallbackAnswer(clean, userContext),
        meta: { status: 'offline', error: error.message },
      });
      setServiceStatus({ checked: true, online: false, label: 'Offline demo mode' });
    } finally {
      setIsSending(false);
    }
  };

  const submitFeedback = async (rating, message) => {
    updateAssistantMessage(message.id, { meta: { ...message.meta, feedback: rating } });
    chatbotApi.submitFeedback({
      conversationId,
      responseId: message.meta?.responseId || activeTrace.responseId,
      rating,
      module: activeSurface,
      reason: rating === 'positive' ? 'Helpful demo response' : 'Needs improvement',
    }).catch(() => undefined);
  };

  const statusColor = serviceStatus.online ? 'bg-emerald-500' : serviceStatus.checked ? 'bg-amber-500' : 'bg-slate-400';
  const panelWidth = isExpanded ? 'md:w-[520px]' : 'md:w-[420px]';
  const panelHeight = isExpanded ? 'md:h-[720px]' : 'md:h-[620px]';

  return (
    <div className="fixed bottom-5 right-5 z-[1000] font-sans">
      {isOpen && (
        <section className={`mb-4 w-[calc(100vw-2.5rem)] ${panelWidth} h-[min(720px,calc(100vh-7rem))] ${panelHeight} bg-white border border-slate-200 shadow-2xl rounded-lg overflow-hidden flex flex-col`}>
          <header className="bg-slate-950 text-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0">
                <Bot size={22} strokeWidth={2.6} />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-black leading-tight truncate">Wheels&Deals Copilot</p>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                  <span className="truncate">{serviceStatus.label}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setIsExpanded((value) => !value)} className="h-9 w-9 rounded-lg hover:bg-white/10 flex items-center justify-center" aria-label={isExpanded ? 'Minimize chat' : 'Expand chat'}>
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button type="button" onClick={() => setIsOpen(false)} className="h-9 w-9 rounded-lg hover:bg-white/10 flex items-center justify-center" aria-label="Close chat">
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((prompt) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => runPrompt(prompt.text)}
                    disabled={isSending}
                    className="text-left rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-emerald-300 disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 text-xs font-black text-slate-800">
                      <Icon size={15} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{prompt.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
            <div className="space-y-3">
              {messages.map((message, index) => {
                const key = message.id || `${message.role}_${index}`;
                const isAssistant = message.role === 'assistant';
                return (
                  <div key={key} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 ${isAssistant ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-white'}`}>
                      {message.meta?.status === 'thinking' ? (
                        <div className="flex items-center gap-2 font-bold text-slate-600">
                          <Loader2 size={16} className="animate-spin" />
                          <span>{message.meta.stage || 'Thinking'}</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      {isAssistant && message.meta?.status === 'offline' && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 p-2 text-xs font-bold text-amber-800">
                          <CircleAlert size={15} className="mt-0.5 shrink-0" />
                          <span>{message.meta.error || 'Chatbot backend is not reachable.'}</span>
                        </div>
                      )}
                      {isAssistant && message.meta?.status === 'done' && (
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                            <ShieldCheck size={14} />
                            Checked
                          </span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => submitFeedback('positive', message)} className="h-7 w-7 rounded-lg hover:bg-white flex items-center justify-center" aria-label="Helpful answer">
                              <ThumbsUp size={14} className={message.meta?.feedback === 'positive' ? 'text-emerald-600' : 'text-slate-500'} />
                            </button>
                            <button type="button" onClick={() => submitFeedback('negative', message)} className="h-7 w-7 rounded-lg hover:bg-white flex items-center justify-center" aria-label="Not helpful answer">
                              <ThumbsDown size={14} className={message.meta?.feedback === 'negative' ? 'text-red-600' : 'text-slate-500'} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-1">{activeSurface}</span>
              {backendStatus?.available && <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-1">API connected</span>}
              {authUser && <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-1">{verification?.verificationLevel || 'registered'}</span>}
              {garageSummary && <span className="rounded-full bg-slate-100 px-2 py-1 max-w-full truncate">{garageSummary}</span>}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                runPrompt(draft);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    runPrompt(draft);
                  }
                }}
                rows="2"
                className="min-h-[48px] max-h-28 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-500"
                placeholder={ownedVehicles?.length ? 'Ask about auctions, cars, garage fitment...' : 'Ask about auctions, cars, services...'}
              />
              <button type="submit" disabled={isSending || !draft.trim()} className="h-12 w-12 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black disabled:bg-slate-200 disabled:text-slate-400" aria-label="Send message">
                {isSending ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="ml-auto flex h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-white shadow-2xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-300"
        aria-label={isOpen ? 'Hide Wheels and Deals Copilot' : 'Open Wheels and Deals Copilot'}
      >
        {isOpen ? <ChevronDown size={22} /> : <MessageCircle size={22} />}
        {!isOpen && <span className="hidden sm:inline font-black">Copilot</span>}
      </button>
    </div>
  );
};

export default ChatbotWidget;
