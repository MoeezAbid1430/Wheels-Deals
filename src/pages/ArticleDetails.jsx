import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, ChevronLeft, Clock, Heart, MessageCircle, ShieldCheck } from 'lucide-react';
import { editorialArticles, editorialWriters } from '../data/articles';
import { useAuctions } from '../context/AuctionContext';

const ArticleDetails = () => {
  const { slug } = useParams();
  const { api } = useAuctions();
  const seedArticle = useMemo(() => editorialArticles.find((item) => item.slug === slug), [slug]);
  const [article, setArticle] = useState(seedArticle);
  const [comments, setComments] = useState(seedArticle?.comments || []);
  const [message, setMessage] = useState('');
  const [commentForm, setCommentForm] = useState({ authorName: 'Reader', body: '' });

  useEffect(() => {
    let cancelled = false;
    api.articles?.get?.(slug)
      .then((payload) => {
        if (!cancelled) {
          setArticle(payload.article || seedArticle);
          setComments(payload.comments || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setArticle(seedArticle);
          setComments(seedArticle?.comments || []);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, seedArticle, slug]);

  const writer = useMemo(() => {
    if (!article) return null;
    return editorialWriters.find((item) => item.id === article.authorId || item.name === article.authorName);
  }, [article]);

  const related = useMemo(() => (
    editorialArticles.filter((item) => item.slug !== slug && item.category === article?.category).slice(0, 3)
  ), [article, slug]);

  const handleReact = async (type) => {
    if (!article) return;
    const key = type === 'bookmark' ? 'bookmarks' : 'likes';
    try {
      const payload = await (type === 'bookmark' ? api.articles.bookmark(article.slug) : api.articles.like(article.slug));
      setArticle(payload.article || { ...article, [key]: (article[key] || 0) + 1 });
      setMessage(type === 'bookmark' ? 'Saved to your reading list.' : 'Thanks for the signal.');
    } catch {
      setArticle((current) => current ? ({ ...current, [key]: (current[key] || 0) + 1 }) : current);
      setMessage(type === 'bookmark' ? 'Saved locally for this demo.' : 'Reaction recorded locally.');
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!article || !commentForm.body.trim()) return;
    try {
      const payload = await api.articles.addComment(article.slug, commentForm);
      setComments((current) => payload.comments || (payload.comment ? [payload.comment, ...current] : current));
      setCommentForm((current) => ({ ...current, body: '' }));
      setMessage('Comment submitted for editorial moderation.');
    } catch {
      const fallback = {
        id: `comment-${Date.now()}`,
        authorName: commentForm.authorName || 'Reader',
        body: commentForm.body,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
      };
      setComments((current) => [fallback, ...current]);
      setCommentForm((current) => ({ ...current, body: '' }));
      setMessage('Comment saved locally for preview.');
    }
  };

  if (!article) {
    return (
      <main className="bg-slate-50 min-h-screen px-4 py-14">
        <section className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
          <h1 className="text-3xl font-black text-slate-900">Article not found</h1>
          <p className="text-slate-500 mt-2">This story is unavailable or still in editorial review.</p>
          <Link to="/news" className="inline-block mt-5 bg-slate-900 text-white px-5 py-3 rounded-lg font-black">Back to News</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 min-h-screen">
      <article>
        <section className="bg-slate-950 text-white">
          <div className="max-w-5xl mx-auto px-4 py-8">
            <Link to="/news" className="inline-flex items-center gap-2 text-sm font-black text-emerald-300">
              <ChevronLeft size={18} /> News
            </Link>
            <p className="mt-7 text-xs uppercase tracking-[0.3em] text-emerald-400 font-black">{article.category}</p>
            <h1 className="text-4xl md:text-6xl font-black mt-3 leading-tight">{article.title}</h1>
            <p className="text-xl text-slate-300 mt-5 max-w-4xl">{article.deck}</p>
            <div className="flex flex-wrap gap-3 mt-6 text-sm font-bold text-slate-300">
              <span>{article.authorName}</span>
              {article.authorRole && <span>{article.authorRole}</span>}
              <span className="inline-flex items-center gap-1"><Clock size={15} /> {article.readMinutes} min read</span>
              <span>{new Date(article.publishedAt || article.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <img src={article.heroImage} alt={article.title} className="w-full aspect-[16/8] object-cover" />
              <div className="p-6 md:p-8">
                <div className="flex flex-wrap gap-2 mb-7">
                  {(article.tags || []).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-black">{tag}</span>
                  ))}
                </div>
                <div>
                  {(article.body || []).map((paragraph) => (
                    <p key={paragraph} className="text-lg leading-8 text-slate-700 mb-6">{paragraph}</p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-200">
                  <button onClick={() => handleReact('like')} className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg font-black">
                    <Heart size={18} /> Like {article.likes || 0}
                  </button>
                  <button onClick={() => handleReact('bookmark')} className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-900 px-4 py-3 rounded-lg font-black">
                    <Bookmark size={18} /> Save {article.bookmarks || 0}
                  </button>
                </div>
              </div>
            </div>

            <section className="bg-white border border-slate-200 rounded-xl p-6 mt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest font-black text-slate-400">Reader response</p>
                  <h2 className="text-2xl font-black text-slate-900">Comments and questions</h2>
                </div>
                <MessageCircle className="text-slate-400" />
              </div>
              {message && <p className="mt-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg px-4 py-3 font-bold">{message}</p>}
              <form onSubmit={handleComment} className="grid gap-3 mt-5">
                <input value={commentForm.authorName} onChange={(event) => setCommentForm((current) => ({ ...current, authorName: event.target.value }))} className="border border-slate-200 rounded-lg px-4 py-3 font-bold" placeholder="Display name" />
                <textarea value={commentForm.body} onChange={(event) => setCommentForm((current) => ({ ...current, body: event.target.value }))} className="border border-slate-200 rounded-lg px-4 py-3 min-h-28 font-bold" placeholder="Ask the writer a question or add a useful reader note..." />
                <button className="justify-self-start bg-emerald-600 text-white px-5 py-3 rounded-lg font-black">Submit</button>
              </form>
              <div className="space-y-3 mt-6">
                {comments.length ? comments.map((comment) => (
                  <div key={comment.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="font-black text-slate-900">{comment.authorName || 'Reader'}</p>
                    <p className="text-slate-600 mt-1">{comment.body}</p>
                    <p className="text-xs font-bold text-slate-400 mt-2">{comment.status === 'pending_review' ? 'Pending moderation' : 'Published'}</p>
                  </div>
                )) : <p className="text-sm font-bold text-slate-500">No comments yet. Be the first useful reader in the room.</p>}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            {writer && (
              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <img src={writer.avatar} alt={writer.name} className="w-16 h-16 rounded-full object-cover" />
                <h2 className="font-black text-slate-900 mt-3 flex items-center gap-2">{writer.name} {writer.verified && <ShieldCheck size={17} className="text-emerald-600" />}</h2>
                <p className="text-sm font-bold text-slate-500">{writer.role} - {writer.city}</p>
                <p className="text-sm text-slate-600 mt-3">{writer.bio}</p>
              </section>
            )}
            <section className="bg-slate-900 text-white rounded-xl p-5">
              <h2 className="font-black">Editorial promise</h2>
              <p className="text-sm text-slate-300 mt-2">News is written by verified contributors and reviewed before publication. Community debates live separately in forums.</p>
            </section>
            {!!related.length && (
              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="font-black text-slate-900">More in {article.category}</h2>
                <div className="space-y-4 mt-4">
                  {related.map((item) => (
                    <Link key={item.id} to={`/news/${item.slug}`} className="block group">
                      <p className="font-black text-slate-900 group-hover:text-emerald-700">{item.title}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">{item.readMinutes} min read</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </article>
    </main>
  );
};

export default ArticleDetails;
