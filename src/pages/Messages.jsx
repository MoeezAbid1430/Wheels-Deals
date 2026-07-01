import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const Messages = () => {
  const { conversations, visibleCars, sendMessage } = useAuctions();
  const [activeId, setActiveId] = useState(conversations[0]?.id || null);
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const active = conversations.find((conversation) => conversation.id === activeId) || conversations[0];
  const listing = active ? visibleCars.find((car) => car.id === active.listingId) : null;
  const quickReplies = [
    'Is the inspection report available?',
    'Can you confirm final all-in price and transfer fees?',
    'Can I schedule a viewing with a mechanic?',
  ];

  const handleSend = () => {
    if (!active) return;
    const result = sendMessage(active.listingId, body);
    setMessage(result.message);
    if (result.ok) setBody('');
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-black text-slate-900 mb-6">Messages</h1>
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <aside className="bg-white border border-slate-200 rounded-xl p-4 space-y-3" aria-label="Conversation list">
            {conversations.map((conversation) => (
              <button key={conversation.id} aria-pressed={active?.id === conversation.id} onClick={() => setActiveId(conversation.id)} className={`w-full text-left rounded-lg p-3 border min-h-16 ${active?.id === conversation.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}>
                <p className="font-black text-slate-900">{conversation.seller}</p>
                <p className="text-xs text-slate-500 truncate">{conversation.messages[conversation.messages.length - 1]?.body}</p>
              </button>
            ))}
          </aside>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            {active ? (
              <>
                <div className="border-b border-slate-100 pb-4 mb-4">
                  <h2 className="text-xl font-black text-slate-900">{active.seller}</h2>
                  {listing && <Link to={`/listing/${listing.id}`} className="text-sm text-blue-600 font-bold hover:underline">{listing.name}</Link>}
                  <p className="mt-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 p-3 text-sm font-bold">
                    Safety: keep payments inside checkout, verify inspection proof, and report pressure tactics or off-platform payment requests.
                  </p>
                </div>
                <div className="space-y-3 min-h-[320px]">
                  {active.messages.map((item) => (
                    <div key={item.id} className={`max-w-xl rounded-xl p-3 ${item.from === 'You' ? 'bg-blue-600 text-white ml-auto' : 'bg-slate-100 text-slate-800'}`}>
                      <p className="font-bold text-sm">{item.from}</p>
                      <p className="mt-1">{item.body}</p>
                      <p className="text-xs opacity-70 mt-2">{item.time}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-5">
                  {quickReplies.map((reply) => (
                    <button key={reply} onClick={() => setBody(reply)} className="border border-slate-200 rounded-full px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-400">
                      {reply}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <label className="sr-only" htmlFor="message-body">Write a message</label>
                  <input id="message-body" value={body} onChange={(event) => setBody(event.target.value)} className="flex-1 border border-slate-200 rounded-lg p-3" placeholder="Write a message..." />
                  <button onClick={handleSend} className="bg-slate-900 text-white px-5 rounded-lg font-bold">Send</button>
                </div>
                {message && <p role="status" aria-live="polite" className="text-sm text-slate-500 mt-3">{message}</p>}
              </>
            ) : (
              <p className="text-slate-500">No messages yet.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
};

export default Messages;
