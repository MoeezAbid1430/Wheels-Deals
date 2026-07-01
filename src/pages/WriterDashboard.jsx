import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Send, ShieldCheck } from 'lucide-react';
import { articleCategories, editorialArticles } from '../data/articles';
import { useAuctions } from '../context/AuctionContext';

const emptyArticle = {
  title: '',
  deck: '',
  category: 'Market News',
  tags: '',
  heroImage: 'https://placehold.co/1200x640/111827/ffffff?text=Editorial+Story',
  body: '',
};

const WriterDashboard = () => {
  const { api } = useAuctions();
  const [articles, setArticles] = useState(editorialArticles);
  const [form, setForm] = useState(emptyArticle);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.articles?.drafts?.()
      .then((payload) => {
        if (!cancelled) setArticles(payload.articles || editorialArticles);
      })
      .catch(() => {
        if (!cancelled) setArticles(editorialArticles);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const stats = useMemo(() => ({
    published: articles.filter((item) => item.status === 'published').length,
    review: articles.filter((item) => item.status === 'pending_review').length,
    drafts: articles.filter((item) => item.status === 'draft').length,
  }), [articles]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submitArticle = async (status) => {
    if (!form.title.trim() || !form.deck.trim() || !form.body.trim()) {
      setMessage('Title, deck, and article body are required.');
      return;
    }
    const payload = {
      ...form,
      status,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      body: form.body.split('\n').map((line) => line.trim()).filter(Boolean),
    };
    try {
      const response = await api.articles.create(payload);
      setArticles((current) => [response.article, ...current]);
      setForm(emptyArticle);
      setMessage(status === 'pending_review' ? 'Article sent to editorial review.' : 'Draft saved.');
    } catch {
      const fallback = {
        ...payload,
        id: `article-${Date.now()}`,
        slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        authorName: 'Verified Writer',
        authorRole: 'Verified Contributor',
        readMinutes: Math.max(3, Math.ceil(payload.body.join(' ').split(/\s+/).length / 220)),
        updatedAt: new Date().toISOString(),
        publishedAt: status === 'published' ? new Date().toISOString() : null,
        views: 0,
        likes: 0,
        bookmarks: 0,
      };
      setArticles((current) => [fallback, ...current]);
      setForm(emptyArticle);
      setMessage('Saved locally for preview because the API is unavailable.');
    }
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <p className="text-emerald-400 text-xs uppercase tracking-[0.3em] font-black">Verified writers</p>
          <h1 className="text-4xl md:text-5xl font-black mt-3">Editorial publishing desk</h1>
          <p className="text-slate-300 mt-4 max-w-3xl">Create polished daily market reads, buying guides, trend explainers, and expert analysis. Community discussions stay in Community; this is the magazine/newsroom layer.</p>
          <div className="grid grid-cols-3 gap-3 mt-7 max-w-2xl">
            <Stat label="Published" value={stats.published} />
            <Stat label="In review" value={stats.review} />
            <Stat label="Drafts" value={stats.drafts} />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900">New article</h2>
          </div>
          {message && <p className="mb-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg px-4 py-3 font-bold">{message}</p>}
          <div className="grid gap-4">
            <label>
              <span className="text-xs uppercase tracking-wide font-black text-slate-400">Headline</span>
              <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} className="mt-2 w-full border border-slate-200 rounded-lg px-4 py-3 font-bold" placeholder="Example: What buyers should know before bidding this week" />
            </label>
            <label>
              <span className="text-xs uppercase tracking-wide font-black text-slate-400">Deck</span>
              <textarea value={form.deck} onChange={(event) => updateForm('deck', event.target.value)} className="mt-2 w-full border border-slate-200 rounded-lg px-4 py-3 min-h-24 font-bold" placeholder="Short editorial summary for sophisticated readers." />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label>
                <span className="text-xs uppercase tracking-wide font-black text-slate-400">Category</span>
                <select value={form.category} onChange={(event) => updateForm('category', event.target.value)} className="mt-2 w-full border border-slate-200 rounded-lg px-4 py-3 font-bold bg-white">
                  {articleCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label>
                <span className="text-xs uppercase tracking-wide font-black text-slate-400">Tags</span>
                <input value={form.tags} onChange={(event) => updateForm('tags', event.target.value)} className="mt-2 w-full border border-slate-200 rounded-lg px-4 py-3 font-bold" placeholder="auction, market, Lahore" />
              </label>
            </div>
            <label>
              <span className="text-xs uppercase tracking-wide font-black text-slate-400">Hero image URL</span>
              <input value={form.heroImage} onChange={(event) => updateForm('heroImage', event.target.value)} className="mt-2 w-full border border-slate-200 rounded-lg px-4 py-3 font-bold" />
            </label>
            <label>
              <span className="text-xs uppercase tracking-wide font-black text-slate-400">Article body</span>
              <textarea value={form.body} onChange={(event) => updateForm('body', event.target.value)} className="mt-2 w-full border border-slate-200 rounded-lg px-4 py-3 min-h-72 font-bold leading-7" placeholder="Write one paragraph per line..." />
            </label>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => submitArticle('draft')} className="bg-white border border-slate-200 text-slate-900 px-5 py-3 rounded-lg font-black">Save Draft</button>
              <button onClick={() => submitArticle('pending_review')} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-lg font-black"><Send size={18} /> Submit for Review</button>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-black text-slate-900 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600" /> Writer policy</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 font-bold list-disc pl-5">
              <li>Only verified writers can create articles.</li>
              <li>Editors approve or reject before publication.</li>
              <li>News must be separate from forum posts and opinion threads.</li>
              <li>Use reader-friendly analysis: trends, guides, risks, costs, and trust signals.</li>
            </ul>
          </section>
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-black text-slate-900">Editorial queue</h2>
            <div className="space-y-3 mt-4">
              {articles.slice(0, 8).map((article) => (
                <article key={article.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="font-black text-slate-900">{article.title}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">{article.category} - {article.status}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
    <p className="text-xs uppercase tracking-wider font-black text-slate-500">{label}</p>
    <p className="text-3xl font-black mt-1">{value}</p>
  </div>
);

export default WriterDashboard;
