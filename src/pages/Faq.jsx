import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const Faq = () => {
  const { faqs } = useAuctions();
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const categories = ['All', ...new Set(faqs.map((faq) => faq.category))];

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return faqs.filter((faq) => {
      const matchesCategory = category === 'All' || faq.category === category;
      const matchesQuery = !normalizedQuery || `${faq.question} ${faq.answer}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [faqs, category, query]);

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10 text-center">
          <p className="text-green-400 font-black text-xs uppercase tracking-[0.3em]">Help center</p>
          <h1 className="text-4xl md:text-5xl font-black mt-2">Auction rules, buyer protection, and seller help.</h1>
          <p className="text-slate-300 mt-4">A support layer for users before we add real support tickets and moderation workflows.</p>
          <div className="max-w-2xl mx-auto mt-6">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search FAQ..."
              className="w-full bg-white text-slate-900 rounded-xl px-5 py-4 font-bold outline-none"
            />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`px-4 py-2 rounded-full font-bold text-sm ${category === item ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredFaqs.map((faq) => (
            <article key={faq.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-blue-600 font-black uppercase tracking-wider">{faq.category}</p>
              <h2 className="text-xl font-black text-slate-900 mt-2">{faq.question}</h2>
              <p className="text-slate-600 mt-3 leading-relaxed">{faq.answer}</p>
            </article>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mt-8 text-center">
          <h2 className="text-2xl font-black text-slate-900">Need a community answer?</h2>
          <p className="text-slate-500 mt-2">Ask buyers, sellers, and auction watchers in the forums.</p>
          <Link to="/community" className="inline-block mt-4 bg-blue-600 text-white px-5 py-3 rounded-lg font-bold">
            Go to Community
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Faq;
