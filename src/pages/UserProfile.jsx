import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const UserProfile = () => {
  const { userProfile, watchedCars, posts, savedPosts, conversations, forums, garageRankings } = useAuctions();
  const [isFollowing, setIsFollowing] = useState(false);
  const userPosts = posts.filter((post) => post.author === userProfile.name || post.author === 'You');
  const commentActivity = useMemo(() =>
    posts.flatMap((post) =>
      (post.comments || [])
        .filter((comment) => comment.author === userProfile.name || comment.author === 'You')
        .map((comment) => ({ ...comment, postTitle: post.title, postId: post.id, forumId: post.forumId }))
    ), [posts, userProfile.name]);
  const joinedForums = forums.filter((forum) => (userProfile.joinedForums || []).includes(forum.id));
  const publicPosts = userPosts.length ? userPosts : posts.slice(0, 2);
  const publicComments = commentActivity.length ? commentActivity : posts.slice(0, 2).map((post) => ({
    id: `sample-${post.id}`,
    body: `Following this discussion about ${post.title.toLowerCase()}.`,
    votes: post.votes,
    createdAt: post.createdAt,
    postTitle: post.title,
    postId: post.id,
    forumId: post.forumId,
  }));

  const shareProfile = async () => {
    const url = `${window.location.origin}/profile`;
    if (navigator.share) {
      await navigator.share({ title: `${userProfile.name} on Wheels&Deals`, url }).catch(() => null);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => null);
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="h-48 bg-slate-900 relative">
            <img src={userProfile.cover} alt="" className="w-full h-full object-cover opacity-70" />
          </div>
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 -mt-20">
              <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                <img src={userProfile.avatar} alt={`${userProfile.name} profile`} className="w-32 h-32 rounded-2xl border-4 border-white object-cover bg-slate-900" />
                <div className="pb-2">
                  <p className="text-sm font-black text-blue-600">@{userProfile.username || 'user'}</p>
                  <h1 className="text-4xl font-black text-slate-900">{userProfile.name}</h1>
                  <p className="text-slate-500 mt-1">{userProfile.role} - {userProfile.city}</p>
                  <p className="text-slate-700 mt-3 max-w-2xl">{userProfile.bio}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setIsFollowing((current) => !current)} className={`px-4 py-3 rounded-lg font-black ${isFollowing ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <Link to="/messages" className="px-4 py-3 rounded-lg font-black bg-white border border-slate-200 text-slate-700">Message</Link>
                <button onClick={shareProfile} className="px-4 py-3 rounded-lg font-black bg-white border border-slate-200 text-slate-700">Share</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              {userProfile.badges.map((badge) => (
                <span key={badge} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-black">{badge}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <Stat label="Reputation" value={userProfile.reputation} />
          <Stat label="Followers" value={userProfile.followers || 0} />
          <Stat label="Following" value={userProfile.following || 0} />
          <Stat label="Posts" value={publicPosts.length} />
          <Stat label="Comments" value={publicComments.length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 mt-6">
          <aside className="space-y-5">
            <Panel title="Joined communities">
              <div className="space-y-3">
                {joinedForums.map((forum) => (
                  <Link key={forum.id} to="/community" className="block border border-slate-100 rounded-lg p-3 hover:border-blue-300">
                    <p className="font-black text-slate-900">r/{forum.name.replace(/\s+/g, '')}</p>
                    <p className="text-sm text-slate-500 mt-1">{forum.description}</p>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel title="Marketplace activity">
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Watching" value={watchedCars.length} />
                <MiniStat label="Saved posts" value={savedPosts.length} />
                <MiniStat label="Messages" value={conversations.length} />
                <MiniStat label="Garage" value="Public" />
              </div>
            </Panel>

            <Panel title="Collection ranking">
              {garageRankings.slice(0, 4).map((collector) => (
                <Link key={collector.id} to="/rankings" className="flex items-center justify-between gap-3 border border-slate-100 rounded-lg p-3 mb-2 hover:border-emerald-300">
                  <span>
                    <span className="block font-black text-slate-900">#{collector.rank} {collector.name}</span>
                    <span className="block text-xs text-slate-500">{collector.vehicles} cars - {formatPkr(collector.collectionValue)}</span>
                  </span>
                  <span className="text-xs font-black text-emerald-700">{collector.verified ? 'Verified' : 'Public'}</span>
                </Link>
              ))}
            </Panel>
          </aside>

          <div className="space-y-5">
            <Panel title="Posts">
              <div className="space-y-3">
                {publicPosts.map((post) => (
                  <Link key={post.id} to={`/community/post/${post.id}`} className="block border border-slate-100 rounded-lg p-4 hover:border-blue-300">
                    <p className="text-xs font-black uppercase text-blue-600">{post.flair}</p>
                    <h2 className="font-black text-xl text-slate-900 mt-1">{post.title}</h2>
                    <p className="text-sm text-slate-500 mt-2">{post.votes} votes - {post.comments.length} comments - {post.createdAt}</p>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel title="Comment activity">
              <div className="space-y-3">
                {publicComments.map((comment) => (
                  <Link key={comment.id} to={`/community/post/${comment.postId}`} className="block border border-slate-100 rounded-lg p-4 hover:border-blue-300">
                    <p className="text-xs font-black uppercase text-slate-400">Commented on</p>
                    <h3 className="font-black text-slate-900 mt-1">{comment.postTitle}</h3>
                    <p className="text-slate-600 mt-2">{comment.body}</p>
                    <p className="text-xs text-slate-400 font-bold mt-2">{comment.votes} votes - {comment.createdAt}</p>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel title="Watched vehicles">
              {watchedCars.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {watchedCars.map((car) => (
                    <Link key={car.id} to={`/listing/${car.id}`} className="border border-slate-100 rounded-lg p-4 hover:border-red-300">
                      <p className="font-black text-slate-900">{car.name}</p>
                      <p className="text-sm text-slate-500 mt-1">{car.city} - {car.listingType}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-slate-500">No public watched vehicles yet.</p>
              )}
            </Panel>
          </div>
        </div>
      </section>
    </main>
  );
};

const Panel = ({ title, children }) => (
  <section className="bg-white border border-slate-200 rounded-xl p-5">
    <h2 className="text-xl font-black text-slate-900 mb-4">{title}</h2>
    {children}
  </section>
);

const Stat = ({ label, value }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5">
    <p className="text-xs text-slate-400 uppercase font-black">{label}</p>
    <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
  </div>
);

const MiniStat = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
    <p className="text-[10px] uppercase text-slate-400 font-black">{label}</p>
    <p className="font-black text-slate-900 mt-1">{value}</p>
  </div>
);

export default UserProfile;
