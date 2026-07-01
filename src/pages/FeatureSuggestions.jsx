import React, { useEffect, useMemo, useState } from 'react';
import { createHttpClient } from '../api/httpClient';
import { createPlatformApi } from '../api/platformApi';

const AUTH_TOKEN_KEY = 'wheels_deals_auth_token';

const modules = ['Registration', 'Auctions', 'Buy Car', 'Sell Car', 'Garage', 'Accessories', 'Communities', 'News', 'Profile', 'Payments', 'Admin', 'Wishlist', 'Search', 'Other'];

const FeatureSuggestions = () => {
  const api = useMemo(() => createPlatformApi(createHttpClient({ getToken: () => window.localStorage.getItem(AUTH_TOKEN_KEY) })), []);
  const [form, setForm] = useState({ module: 'Auctions', title: '', description: '', problemSolved: '', userPriority: 'high', contactAllowed: true });
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.featureSuggestions.list()
      .then((result) => setSuggestions(result.suggestions || []))
      .catch(() => setSuggestions([]));
  }, [api]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const result = await api.featureSuggestions.create(form).catch((error) => ({ error }));
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setSuggestions((items) => [result.suggestion, ...items]);
    setMessage('Suggestion submitted to the product review queue.');
    setForm((current) => ({ ...current, title: '', description: '', problemSolved: '' }));
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-lg bg-slate-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Product feedback</p>
          <h1 className="mt-2 text-3xl font-black">Feature Suggestions</h1>
          <p className="mt-3 max-w-3xl text-sm font-bold text-slate-300">Submit improvements by module. Admins can mark ideas duplicate, planned, rejected, under review, or convert them into backlog items.</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_380px]">
          <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-black text-slate-700">Module area</span>
                <select value={form.module} onChange={(event) => update('module', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-bold">
                  {modules.map((module) => <option key={module} value={module}>{module}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black text-slate-700">Priority</span>
                <select value={form.userPriority} onChange={(event) => update('userPriority', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-bold">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-black text-slate-700">Suggestion title</span>
              <input value={form.title} onChange={(event) => update('title', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-bold" placeholder="Example: Add bid deposit reminder" />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-black text-slate-700">Description</span>
              <textarea value={form.description} onChange={(event) => update('description', event.target.value)} className="mt-2 min-h-32 w-full rounded-lg border border-slate-200 p-3 font-bold" placeholder="What should be improved?" />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-black text-slate-700">Problem this solves</span>
              <textarea value={form.problemSolved} onChange={(event) => update('problemSolved', event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 p-3 font-bold" placeholder="Why does this matter to buyers, sellers, dealers, admins, or communities?" />
            </label>
            <label className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input type="checkbox" checked={form.contactAllowed} onChange={(event) => update('contactAllowed', event.target.checked)} className="h-5 w-5" />
              <span className="font-bold text-slate-700">Allow team to contact me about this suggestion</span>
            </label>
            <button className="mt-5 rounded-lg bg-slate-950 px-5 py-3 font-black text-white">Submit suggestion</button>
            {message && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm font-black text-blue-700">{message}</p>}
          </form>

          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-900">My suggestions</h2>
            <div className="mt-4 space-y-3">
              {suggestions.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">{item.module} • {item.status}</p>
                  <p className="mt-1 font-black text-slate-900">{item.title}</p>
                </article>
              ))}
              {!suggestions.length && <p className="font-bold text-slate-500">No suggestions submitted yet.</p>}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default FeatureSuggestions;
