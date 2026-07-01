import React from 'react';
import { Link } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const CommunityModeration = () => {
  const { posts, forums, pinPost, lockPost, deletePost, resolvePostReports } = useAuctions();
  const reportedPosts = posts.filter((post) => post.reports > 0 || post.comments.some((comment) => (comment.reports || 0) > 0));
  const pinnedPosts = posts.filter((post) => post.isPinned);
  const lockedPosts = posts.filter((post) => post.isLocked);

  return (
    <main className="bg-slate-950 min-h-screen text-white">
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-red-400 font-black text-xs uppercase tracking-[0.3em]">Community moderation</p>
            <h1 className="text-4xl font-black mt-2">Forum safety queue</h1>
            <p className="text-slate-400 mt-2">Review reported, pinned, locked, and deleted discussion activity.</p>
          </div>
          <Link to="/community" className="bg-white text-slate-950 px-5 py-3 rounded-lg font-bold text-center">
            Back to Community
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="Reported" value={reportedPosts.length} />
          <Stat label="Pinned" value={pinnedPosts.length} />
          <Stat label="Locked" value={lockedPosts.length} />
          <Stat label="Deleted" value={posts.filter((post) => post.isDeleted).length} />
        </div>

        <Queue title="Reported Queue" posts={reportedPosts} forums={forums} pinPost={pinPost} lockPost={lockPost} deletePost={deletePost} resolvePostReports={resolvePostReports} />
        <Queue title="Pinned Posts" posts={pinnedPosts} forums={forums} pinPost={pinPost} lockPost={lockPost} deletePost={deletePost} resolvePostReports={resolvePostReports} />
        <Queue title="Locked Posts" posts={lockedPosts} forums={forums} pinPost={pinPost} lockPost={lockPost} deletePost={deletePost} resolvePostReports={resolvePostReports} />
      </section>
    </main>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
    <p className="text-xs text-zinc-500 uppercase tracking-wider font-black">{label}</p>
    <p className="text-3xl font-black mt-1">{value}</p>
  </div>
);

const Queue = ({ title, posts, forums, pinPost, lockPost, deletePost, resolvePostReports }) => (
  <section className="mb-8">
    <h2 className="text-2xl font-black mb-4">{title}</h2>
    {posts.length > 0 ? (
      <div className="space-y-4">
        {posts.map((post) => {
          const forum = forums.find((item) => item.id === post.forumId);
          const reportedComments = post.comments.filter((comment) => (comment.reports || 0) > 0);
          return (
            <article key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge>{forum?.name || 'Forum'}</Badge>
                    <Badge>{post.flair}</Badge>
                    {post.isPinned && <Badge>Pinned</Badge>}
                    {post.isLocked && <Badge>Locked</Badge>}
                    {post.isDeleted && <Badge>Deleted</Badge>}
                  </div>
                  <Link to={`/community/post/${post.id}`} className="text-xl font-black hover:text-blue-300">{post.title}</Link>
                  <p className="text-sm text-zinc-400 mt-2">{post.reports} post reports - {reportedComments.length} reported comments</p>
                  {reportedComments.length > 0 && (
                    <ul className="list-disc pl-5 text-sm text-zinc-300 mt-3">
                      {reportedComments.map((comment) => (
                        <li key={comment.id}>{comment.author}: {comment.body}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 min-w-[260px]">
                  <button onClick={() => pinPost(post.id)} className="bg-green-500 text-slate-950 py-2 rounded-lg font-black">{post.isPinned ? 'Unpin' : 'Pin'}</button>
                  <button onClick={() => lockPost(post.id)} className="bg-yellow-400 text-slate-950 py-2 rounded-lg font-black">{post.isLocked ? 'Unlock' : 'Lock'}</button>
                  <button onClick={() => resolvePostReports(post.id)} className="bg-blue-500 text-white py-2 rounded-lg font-black">Resolve</button>
                  <button onClick={() => deletePost(post.id)} className="bg-red-600 text-white py-2 rounded-lg font-black">Delete</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    ) : (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-400">Nothing in this queue.</div>
    )}
  </section>
);

const Badge = ({ children }) => (
  <span className="bg-zinc-800 text-slate-200 px-2 py-1 rounded text-xs font-black">{children}</span>
);

export default CommunityModeration;
