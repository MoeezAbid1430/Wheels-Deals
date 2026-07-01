import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { editorialArticles } from '../data/articles';
import { useAuctions } from '../context/AuctionContext';

const AdminEditorial = () => {
  const { api } = useAuctions();
  const [articles, setArticles] = useState(editorialArticles);
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

  const updateStatus = async (article, status, featured = article.featured) => {
    try {
      const payload = await api.articles.updateStatus(article.id, { status, featured, editorNotes: status === 'published' ? 'Approved by editorial desk.' : 'Needs revision.' });
      setArticles((current) => current.map((item) => item.id === article.id ? { ...item, ...(payload.article || {}), status, featured } : item));
      setMessage(status === 'published' ? 'Article published.' : 'Article returned to writer.');
    } catch {
      setArticles((current) => current.map((item) => item.id === article.id ? { ...item, status, featured } : item));
      setMessage('Editorial status updated locally for preview.');
    }
  };

  return (
    <main className="bg-slate-950 text-white min-h-screen">
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em]">Editorial admin</p>
            <h1 className="text-4xl font-black mt-2">News review queue</h1>
            <p className="text-slate-400 mt-2">Approve writer articles, control featured stories, and keep editorial separate from Community moderation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin" className="bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-lg font-black">Admin Center</Link>
            <Link to="/writer/dashboard" className="bg-white text-slate-950 px-5 py-3 rounded-lg font-black">Writer Desk</Link>
          </div>
        </div>

        {message && <p className="mt-6 bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-bold text-slate-200">{message}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">
          {articles.map((article) => (
            <article key={article.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <img src={article.heroImage} alt={article.title} className="w-full h-48 object-cover" />
              <div className="p-5">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge>{article.status}</Badge>
                  <Badge>{article.category}</Badge>
                  {article.featured && <Badge>Featured</Badge>}
                </div>
                <h2 className="text-2xl font-black">{article.title}</h2>
                <p className="text-slate-400 mt-2">{article.deck}</p>
                <p className="text-xs font-bold text-slate-500 mt-3">{article.authorName} - {article.readMinutes} min read</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
                  <button onClick={() => updateStatus(article, 'published', true)} className="inline-flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 rounded-lg py-3 font-black"><CheckCircle2 size={18} /> Publish</button>
                  <button onClick={() => updateStatus(article, 'published', false)} className="bg-white text-slate-950 rounded-lg py-3 font-black">Publish Normal</button>
                  <button onClick={() => updateStatus(article, 'rejected', false)} className="inline-flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg py-3 font-black"><XCircle size={18} /> Reject</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

const Badge = ({ children }) => (
  <span className="bg-zinc-950 border border-zinc-800 rounded-full px-3 py-1 text-xs font-black text-slate-300">{children}</span>
);

export default AdminEditorial;
