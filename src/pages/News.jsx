import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Clock, Search, ShieldCheck, TrendingUp } from 'lucide-react';
import { articleCategories, editorialArticles, editorialWriters } from '../data/articles';
import { useAuctions } from '../context/AuctionContext';

const News = () => {
  const { api, visibleCars } = useAuctions();
  const [articles, setArticles] = useState(editorialArticles);
  const [writers, setWriters] = useState(editorialWriters);
  const [filters, setFilters] = useState({ category: 'All', q: '' });

  useEffect(() => {
    let cancelled = false;
    api.articles?.list?.(filters)
      .then((payload) => {
        if (!cancelled) {
          setArticles(payload.articles || editorialArticles);
          setWriters(payload.writers || editorialWriters);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setArticles(editorialArticles);
          setWriters(editorialWriters);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, filters]);

  const featured = articles.find((article) => article.featured) || articles[0];
  const visibleArticles = useMemo(() => articles.filter((article) => article.id !== featured?.id), [articles, featured]);
  const marketRadar = useMemo(() => {
    const marketplaceCars = visibleCars.filter((car) => car.listingType !== 'Auction');
    const installmentCount = marketplaceCars.filter((car) => car.installmentAvailable).length;
    const dealerCount = marketplaceCars.filter((car) => String(car.sellerType || '').toLowerCase().includes('dealer')).length;
    const inspectedCount = marketplaceCars.filter((car) => Number(car.inspectionScore || 0) >= 80).length;
    return [
      { label: 'Installment listings', value: installmentCount, to: '/listings?installmentsOnly=Installments%20only' },
      { label: 'Verified/dealer stock', value: dealerCount, to: '/listings?sellerType=Verified%20Dealer' },
      { label: 'High inspection cars', value: inspectedCount, to: '/listings?minInspection=80' },
      { label: 'Accessory fitment reads', value: 'Guide', to: '/accessories?fitment=Fits%20My%20Garage' },
    ];
  }, [visibleCars]);

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <p className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em]">News & Blogs</p>
          <h1 className="text-4xl md:text-5xl font-black mt-3 max-w-4xl">Daily car market intelligence for sophisticated readers.</h1>
          <p className="text-slate-300 mt-4 text-lg max-w-3xl">
            Verified writers cover auctions, market movement, installments, accessories, EVs, bikes, maintenance, dealer trends, and buying strategy. This is editorial content, separate from community discussions.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <HeroStat label="Articles" value={articles.length} />
            <HeroStat label="Verified writers" value={writers.filter((writer) => writer.verified).length} />
            <HeroStat label="Categories" value={articleCategories.length} />
            <HeroStat label="Daily signals" value="Live" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-[1fr_240px_auto] gap-3 sticky top-20 z-20">
          <label className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              className="w-full border border-slate-200 rounded-lg pl-11 pr-4 py-3 font-bold outline-none focus:border-emerald-600"
              placeholder="Search market, auction, installments, accessories..."
            />
          </label>
          <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} className="border border-slate-200 rounded-lg px-3 py-3 font-bold bg-white">
            {['All', ...articleCategories].map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <Link to="/writer/dashboard" className="bg-slate-900 text-white rounded-lg px-4 py-3 font-black text-center">Writer Dashboard</Link>
        </div>

        {featured && (
          <article className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
            <Link to={`/news/${featured.slug}`} className="block min-h-[320px] bg-slate-100">
              <img src={featured.heroImage} alt={featured.title} className="w-full h-full object-cover" />
            </Link>
            <div className="p-6 lg:p-8 flex flex-col justify-center">
              <p className="text-xs font-black uppercase text-emerald-600 tracking-widest">{featured.category}</p>
              <Link to={`/news/${featured.slug}`} className="text-3xl md:text-4xl font-black text-slate-900 mt-2 hover:text-emerald-700">{featured.title}</Link>
              <p className="text-slate-600 mt-4 text-lg">{featured.deck}</p>
              <ArticleMeta article={featured} />
              <div className="flex flex-wrap gap-2 mt-5">
                {(featured.tags || []).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{tag}</span>)}
              </div>
            </div>
          </article>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mt-8">
          <section>
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-black uppercase text-slate-400">Latest editorial</p>
                <h2 className="text-2xl font-black text-slate-900">Market reads</h2>
              </div>
              <span className="text-sm font-bold text-slate-500">{visibleArticles.length} stories</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {visibleArticles.map((article) => <ArticleCard key={article.id} article={article} />)}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-black text-slate-900">Verified writers</h2>
              <div className="space-y-4 mt-4">
                {writers.map((writer) => (
                  <div key={writer.id} className="flex items-start gap-3">
                    <img src={writer.avatar} alt={writer.name} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <p className="font-black text-slate-900 flex items-center gap-1">{writer.name} {writer.verified && <ShieldCheck size={15} className="text-emerald-600" />}</p>
                      <p className="text-xs font-bold text-slate-500">{writer.role} - {writer.city}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-black text-slate-900">Market radar</h2>
              <div className="space-y-3 mt-4">
                {marketRadar.map((item) => (
                  <Link key={item.label} to={item.to} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 hover:border-emerald-300">
                    <span className="font-bold text-slate-700">{item.label}</span>
                    <span className="font-black text-slate-950">{item.value}</span>
                  </Link>
                ))}
              </div>
            </section>
            <section className="bg-slate-900 text-white rounded-xl p-5">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" />
                <h2 className="font-black">Editorial rules</h2>
              </div>
              <ul className="text-sm text-slate-300 mt-4 space-y-2 list-disc pl-5">
                <li>Only verified writers can submit articles.</li>
                <li>Editors approve before publishing.</li>
                <li>Community posts stay separate from articles.</li>
                <li>News, guides, and trends can be featured on Home later.</li>
              </ul>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
};

const HeroStat = ({ label, value }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
    <p className="text-slate-500 text-xs uppercase tracking-wider font-black">{label}</p>
    <p className="text-2xl font-black mt-1">{value}</p>
  </div>
);

const ArticleMeta = ({ article }) => (
  <div className="flex flex-wrap gap-3 mt-4 text-xs font-bold text-slate-500">
    <span>{article.authorName}</span>
    <span className="inline-flex items-center gap-1"><Clock size={13} /> {article.readMinutes} min read</span>
    <span className="inline-flex items-center gap-1"><Bookmark size={13} /> {article.bookmarks || 0}</span>
  </div>
);

const ArticleCard = ({ article }) => (
  <article className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl transition-all">
    <Link to={`/news/${article.slug}`} className="block h-44 bg-slate-100">
      <img src={article.heroImage} alt={article.title} className="w-full h-full object-cover" />
    </Link>
    <div className="p-5">
      <p className="text-xs font-black uppercase text-emerald-600">{article.category}</p>
      <Link to={`/news/${article.slug}`} className="block font-black text-xl text-slate-900 mt-1 hover:text-emerald-700">{article.title}</Link>
      <p className="text-sm text-slate-500 mt-2 line-clamp-3">{article.deck}</p>
      <ArticleMeta article={article} />
    </div>
  </article>
);

export default News;
