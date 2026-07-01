import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const Community = () => {
  const { forums, posts, createPost, visibleCars, votePost, savedPosts, toggleSavedPost, reportPost } = useAuctions();
  const [activeForum, setActiveForum] = useState('all');
  const [sort, setSort] = useState('Hot');
  const [query, setQuery] = useState('');
  const [communityQuery, setCommunityQuery] = useState('');
  const [flair, setFlair] = useState('All');
  const [following, setFollowing] = useState(['AuctionPilot']);
  const [joinedForums, setJoinedForums] = useState(['auction-talk', 'price-checks']);
  const [form, setForm] = useState({
    forumId: 'auction-talk',
    title: '',
    body: '',
    flair: 'Discussion',
    listingId: '',
  });
  const [message, setMessage] = useState('');

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const scoped = posts.filter((post) => {
      const matchesForum = activeForum === 'all' || post.forumId === activeForum;
      const matchesFlair = flair === 'All' || post.flair === flair;
      const matchesQuery = !normalizedQuery || `${post.title} ${post.body} ${post.author}`.toLowerCase().includes(normalizedQuery);
      return matchesForum && matchesFlair && matchesQuery && !post.isDeleted;
    });
    return [...scoped].sort((a, b) => {
      if ((b.isPinned ? 1 : 0) !== (a.isPinned ? 1 : 0)) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      if (sort === 'New') return b.id - a.id;
      if (sort === 'Top') return b.votes - a.votes;
      if (sort === 'Commented') return b.comments.length - a.comments.length;
      return (b.votes + b.comments.length * 2) - (a.votes + a.comments.length * 2);
    });
  }, [posts, activeForum, sort, query, flair]);

  const filteredForums = useMemo(() => {
    const normalizedQuery = communityQuery.trim().toLowerCase();
    return forums.filter((forum) => !normalizedQuery || `${forum.name} ${forum.description}`.toLowerCase().includes(normalizedQuery));
  }, [forums, communityQuery]);

  const handleSubmit = () => {
    const result = createPost(form);
    setMessage(result.message);
    if (result.ok) {
      setForm({ forumId: 'auction-talk', title: '', body: '', flair: 'Discussion', listingId: '' });
    }
  };

  const toggleFollow = (name) => {
    setFollowing((current) => current.includes(name) ? current.filter((item) => item !== name) : [name, ...current]);
  };

  const toggleJoinForum = (forumId) => {
    setJoinedForums((current) => current.includes(forumId) ? current.filter((item) => item !== forumId) : [forumId, ...current]);
  };

  const sharePost = async (post) => {
    const shareUrl = `${window.location.origin}/community/post/${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: post.title, text: post.body, url: shareUrl }).catch(() => null);
      return;
    }
    await navigator.clipboard?.writeText(shareUrl).catch(() => null);
    setMessage('Post link copied for sharing.');
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <p className="text-blue-400 font-black text-xs uppercase tracking-[0.3em]">Community</p>
          <h1 className="text-4xl md:text-5xl font-black mt-2">Ask, debate, price-check, and learn before you bid.</h1>
          <p className="text-slate-300 mt-4 max-w-3xl">
            A Reddit-style layer for auction strategy, listing discussions, maintenance advice, seller help, and local car knowledge.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <HeroStat label="Forums" value={forums.length} />
            <HeroStat label="Posts" value={posts.length} />
            <HeroStat label="Comments" value={posts.reduce((sum, post) => sum + post.comments.length, 0)} />
            <HeroStat label="Reports" value={posts.reduce((sum, post) => sum + post.reports, 0)} />
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/community/model/Toyota/Fortuner" className="bg-white text-slate-950 px-4 py-2 rounded-lg font-black">Toyota Fortuner group</Link>
            <Link to="/community/model/Honda/Civic" className="bg-white text-slate-950 px-4 py-2 rounded-lg font-black">Honda Civic group</Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[300px_1fr_360px] gap-6">
        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wide text-slate-400 font-black">Search communities</span>
              <input
                value={communityQuery}
                onChange={(event) => setCommunityQuery(event.target.value)}
                className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 font-bold outline-none focus:border-blue-600"
                placeholder="Search forums, models, cities..."
              />
            </label>
          </div>
          <button
            onClick={() => setActiveForum('all')}
            className={`w-full text-left border rounded-xl p-4 font-black ${activeForum === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-200'}`}
          >
            All Communities
          </button>
          {filteredForums.map((forum) => (
            <div
              key={forum.id}
              className={`w-full text-left border rounded-xl p-4 ${activeForum === forum.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-200'}`}
            >
              <button onClick={() => setActiveForum(forum.id)} className="w-full text-left">
              <p className="font-black">r/{forum.name.replace(/\s+/g, '')}</p>
              <p className={`text-sm mt-1 ${activeForum === forum.id ? 'text-slate-300' : 'text-slate-500'}`}>{forum.description}</p>
              </button>
              <button
                onClick={() => toggleJoinForum(forum.id)}
                className={`mt-3 px-3 py-1.5 rounded-full text-xs font-black ${joinedForums.includes(forum.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {joinedForums.includes(forum.id) ? 'Joined' : 'Join'}
              </button>
            </div>
          ))}
          {!filteredForums.length && <p className="bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-500">No communities found.</p>}
        </aside>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h2 className="text-2xl font-black text-slate-900">{filteredPosts.length} discussions</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold" placeholder="Search posts" />
              <select value={flair} onChange={(event) => setFlair(event.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold">
                <option>All</option>
                <option>Discussion</option>
                <option>Price Check</option>
                <option>Inspection</option>
                <option>Auction Strategy</option>
                <option>Seller Help</option>
              </select>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold">
                <option>Hot</option>
                <option>New</option>
                <option>Top</option>
                <option>Commented</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                forum={forums.find((item) => item.id === post.forumId)}
                listing={visibleCars.find((car) => car.id === post.listingId)}
                saved={savedPosts.includes(post.id)}
                following={following.includes(post.author)}
                onVote={(direction) => votePost(post.id, direction)}
                onSave={() => toggleSavedPost(post.id)}
                onReport={() => reportPost(post.id)}
                onFollow={() => toggleFollow(post.author)}
                onShare={() => sharePost(post)}
              />
            ))}
          </div>
        </div>

        <aside className="bg-white border border-slate-200 rounded-xl p-5 h-fit sticky top-24">
          <h2 className="font-black text-slate-900 text-xl mb-4">Create post</h2>
          <div className="space-y-3">
            <select value={form.forumId} onChange={(event) => setForm({ ...form, forumId: event.target.value })} className="w-full border border-slate-200 rounded-lg p-3 font-bold">
              {forums.map((forum) => <option key={forum.id} value={forum.id}>{forum.name}</option>)}
            </select>
            <select value={form.flair} onChange={(event) => setForm({ ...form, flair: event.target.value })} className="w-full border border-slate-200 rounded-lg p-3 font-bold">
              <option>Discussion</option>
              <option>Price Check</option>
              <option>Inspection</option>
              <option>Auction Strategy</option>
              <option>Seller Help</option>
            </select>
            <select value={form.listingId} onChange={(event) => setForm({ ...form, listingId: event.target.value })} className="w-full border border-slate-200 rounded-lg p-3 font-bold">
              <option value="">No linked listing</option>
              {visibleCars.map((car) => <option key={car.id} value={car.id}>{car.name}</option>)}
            </select>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full border border-slate-200 rounded-lg p-3 font-bold" placeholder="Post title" />
            <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} rows="5" className="w-full border border-slate-200 rounded-lg p-3" placeholder="Ask the community..." />
            <button onClick={handleSubmit} className="w-full bg-blue-600 text-white rounded-lg py-3 font-black hover:bg-blue-700">
              Publish
            </button>
            {message && <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">{message}</p>}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="font-black text-slate-900 mb-3">People to follow</h3>
            {['AuctionPilot', 'MarketWatcher', 'FamilyBuyer', 'AutoKing'].map((name) => (
              <button key={name} onClick={() => toggleFollow(name)} className="w-full flex items-center justify-between gap-3 border border-slate-100 rounded-lg p-3 mb-2 hover:border-blue-200">
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-black">{name.charAt(0)}</span>
                  <span className="text-left">
                    <span className="block font-black text-slate-900">{name}</span>
                    <span className="block text-xs text-slate-500">Cars, auctions, price checks</span>
                  </span>
                </span>
                <span className={`text-xs font-black rounded-full px-3 py-1 ${following.includes(name) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {following.includes(name) ? 'Following' : 'Follow'}
                </span>
              </button>
            ))}
          </div>
        </aside>
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

const PostCard = ({ post, forum, listing, saved, following, onVote, onSave, onReport, onFollow, onShare }) => (
  <article className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-2">
        <button aria-label={`Like ${post.title}`} onClick={() => onVote(1)} className="w-9 h-9 rounded bg-slate-100 font-black hover:bg-green-100">▲</button>
        <span className="font-black text-slate-900">{post.votes}</span>
        <button aria-label={`Dislike ${post.title}`} onClick={() => onVote(-1)} className="w-9 h-9 rounded bg-slate-100 font-black hover:bg-red-100">▼</button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-black">r/{(forum?.name || 'Forum').replace(/\s+/g, '')}</span>
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-black">{post.flair}</span>
          {post.isPinned && <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-black">Pinned</span>}
          {post.isLocked && <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-black">Locked</span>}
          {saved && <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-black">Saved</span>}
          {listing && <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-black">Linked listing</span>}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <Link to={`/community/post/${post.id}`} className="text-xl font-black text-slate-900 hover:text-blue-600">
          {post.title}
        </Link>
        <button onClick={onFollow} className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${following ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
          {following ? 'Following' : `Follow ${post.author}`}
        </button>
        </div>
        <p className="text-slate-600 mt-2 line-clamp-2">{post.body}</p>
        {listing && (
          <Link to={`/listing/${listing.id}`} className="inline-block text-sm font-bold text-red-600 mt-3 hover:underline">
            Discussing {listing.name}
          </Link>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-bold mt-4">
          <span>Posted by {post.author}</span>
          <span>{post.createdAt}</span>
          <span>{post.comments.length} comments</span>
          <span>{post.reports} reports</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to={`/community/post/${post.id}`} className="bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-2 text-xs font-black text-slate-700">
            Comment
          </Link>
          <button onClick={onShare} className="bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-2 text-xs font-black text-slate-700">
            Share
          </button>
          <button onClick={onSave} className="bg-blue-50 hover:bg-blue-100 rounded-full px-3 py-2 text-xs font-black text-blue-700">
            {saved ? 'Unsave' : 'Save'}
          </button>
          <button onClick={onReport} className="bg-red-50 hover:bg-red-100 rounded-full px-3 py-2 text-xs font-black text-red-700">
            Report
          </button>
        </div>
      </div>
    </div>
  </article>
);

export default Community;
