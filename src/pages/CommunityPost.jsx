import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const CommunityPost = () => {
  const { id } = useParams();
  const {
    posts,
    forums,
    visibleCars,
    votePost,
    addComment,
    reportPost,
    savedPosts,
    toggleSavedPost,
    editPost,
    deletePost,
    pinPost,
    lockPost,
    voteComment,
    reportComment,
    addReply,
    markBestAnswer,
  } = useAuctions();
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', body: '' });
  const post = posts.find((item) => item.id === Number(id));

  if (!post) {
    return (
      <main className="bg-slate-50 min-h-screen flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-black text-slate-900">Post not found</h1>
          <Link to="/community" className="inline-block mt-4 bg-slate-900 text-white px-5 py-3 rounded-lg font-bold">
            Back to Community
          </Link>
        </div>
      </main>
    );
  }

  const forum = forums.find((item) => item.id === post.forumId);
  const listing = visibleCars.find((car) => car.id === post.listingId);
  const isSaved = savedPosts.includes(post.id);

  const handleComment = () => {
    const result = addComment(post.id, comment);
    setMessage(result.message);
    if (result.ok) setComment('');
  };

  const startEditing = () => {
    setEditForm({ title: post.title, body: post.body });
    setIsEditing(true);
  };

  const saveEdit = () => {
    editPost(post.id, editForm);
    setIsEditing(false);
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/community" className="text-sm font-bold text-blue-600 hover:underline">Back to community</Link>

        <article className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mt-4">
          <div className="flex gap-5">
            <div className="flex flex-col items-center gap-2">
              <button aria-label={`Upvote ${post.title}`} onClick={() => votePost(post.id, 1)} className="w-11 h-11 rounded bg-slate-100 font-black hover:bg-green-100">+</button>
              <span className="font-black text-slate-900">{post.votes}</span>
              <button aria-label={`Downvote ${post.title}`} onClick={() => votePost(post.id, -1)} className="w-11 h-11 rounded bg-slate-100 font-black hover:bg-red-100">-</button>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-black">{forum?.name || 'Forum'}</span>
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-black">{post.flair}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {post.isPinned && <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-black">Pinned</span>}
                {post.isLocked && <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-black">Locked</span>}
                {isSaved && <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-black">Saved</span>}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-black uppercase text-slate-400">Post title</span>
                    <input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-black text-xl" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase text-slate-400">Post body</span>
                    <textarea value={editForm.body} onChange={(event) => setEditForm({ ...editForm, body: event.target.value })} rows="6" className="mt-1 w-full border border-slate-200 rounded-lg p-3" />
                  </label>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold">Save Edit</button>
                    <button onClick={() => setIsEditing(false)} className="border border-slate-300 px-4 py-2 rounded-lg font-bold">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-black text-slate-900">{post.title}</h1>
                  <p className="text-sm text-slate-400 mt-2">
                    Posted by {post.author} - {post.createdAt}{post.editedAt ? ` - edited ${post.editedAt}` : ''}
                  </p>
                  <p className="text-slate-700 text-lg leading-relaxed mt-6">{post.body}</p>
                </>
              )}

              {listing && (
                <Link to={`/listing/${listing.id}`} className="block bg-red-50 border border-red-100 rounded-xl p-4 mt-6 hover:border-red-300">
                  <p className="text-xs text-red-600 font-black uppercase tracking-wider">Linked listing</p>
                  <p className="font-black text-slate-900 mt-1">{listing.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{listing.city} - {listing.listingType}</p>
                </Link>
              )}

              <div className="flex flex-wrap gap-3 mt-5">
                <button onClick={() => toggleSavedPost(post.id)} className="text-xs text-blue-600 hover:underline font-bold">
                  {isSaved ? 'Unsave' : 'Save post'}
                </button>
                <button onClick={startEditing} className="text-xs text-slate-500 hover:underline font-bold">Edit</button>
                <button onClick={() => pinPost(post.id)} className="text-xs text-green-600 hover:underline font-bold">{post.isPinned ? 'Unpin' : 'Pin'}</button>
                <button onClick={() => lockPost(post.id)} className="text-xs text-yellow-600 hover:underline font-bold">{post.isLocked ? 'Unlock' : 'Lock'}</button>
                <button onClick={() => reportPost(post.id)} className="text-xs text-red-600 hover:underline font-bold">Report</button>
                <button onClick={() => deletePost(post.id)} className="text-xs text-red-700 hover:underline font-bold">Delete</button>
              </div>
            </div>
          </div>
        </article>

        <section className="bg-white border border-slate-200 rounded-xl p-6 mt-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">Comments ({post.comments.length})</h2>
          <div className="space-y-4 mb-6">
            {post.comments.length > 0 ? post.comments.map((item) => (
              <CommentItem
                key={item.id}
                postId={post.id}
                comment={item}
                onVote={voteComment}
                onReport={reportComment}
                onReply={addReply}
                onBest={markBestAnswer}
              />
            )) : (
              <p className="text-slate-500">No comments yet. Start the discussion.</p>
            )}
          </div>

          {post.isLocked ? (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 text-yellow-800 font-bold">
              This post is locked. New comments are disabled.
            </div>
          ) : (
            <>
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-400">Your comment</span>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows="4" className="mt-1 w-full border border-slate-200 rounded-lg p-3" placeholder="Write a helpful reply..." />
              </label>
              <button onClick={handleComment} className="mt-3 bg-slate-900 text-white px-5 py-3 rounded-lg font-bold">
                Add Comment
              </button>
            </>
          )}
          {message && <p role="status" aria-live="polite" className="mt-3 text-sm text-slate-500">{message}</p>}
        </section>
      </section>
    </main>
  );
};

const CommentItem = ({ postId, comment, onVote, onReport, onReply, onBest }) => {
  const [reply, setReply] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [message, setMessage] = useState('');

  const handleReply = () => {
    const result = onReply(postId, comment.id, reply);
    setMessage(result.message);
    if (result.ok) {
      setReply('');
      setShowReply(false);
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${comment.isBestAnswer ? 'border-green-300 bg-green-50' : 'border-slate-100'}`}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <button aria-label={`Upvote comment by ${comment.author}`} onClick={() => onVote(postId, comment.id, 1)} className="w-10 h-10 rounded bg-white border border-slate-200 font-black">+</button>
          <span className="font-black text-sm">{comment.votes}</span>
          <button aria-label={`Downvote comment by ${comment.author}`} onClick={() => onVote(postId, comment.id, -1)} className="w-10 h-10 rounded bg-white border border-slate-200 font-black">-</button>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <p className="font-black text-slate-900">{comment.author} {comment.isBestAnswer ? '(Best answer)' : ''}</p>
            <p className="text-xs text-slate-400">{comment.createdAt}</p>
          </div>
          <p className="text-slate-600 mt-2">{comment.body}</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <button onClick={() => setShowReply(!showReply)} className="text-xs font-bold text-blue-600 hover:underline">Reply</button>
            <button onClick={() => onBest(postId, comment.id)} className="text-xs font-bold text-green-600 hover:underline">Best answer</button>
            <button onClick={() => onReport(postId, comment.id)} className="text-xs font-bold text-red-600 hover:underline">Report</button>
          </div>
          {showReply && (
            <div className="mt-3">
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-400">Reply</span>
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows="2" className="mt-1 w-full border border-slate-200 rounded-lg p-2" placeholder="Write a reply..." />
              </label>
              <button onClick={handleReply} className="mt-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-bold">Reply</button>
              {message && <p role="status" aria-live="polite" className="text-xs text-slate-500 mt-2">{message}</p>}
            </div>
          )}
          {(comment.replies || []).length > 0 && (
            <div className="mt-4 space-y-2 border-l-2 border-slate-200 pl-4">
              {comment.replies.map((item) => (
                <div key={item.id} className="bg-white border border-slate-100 rounded-lg p-3">
                  <p className="font-black text-sm text-slate-900">{item.author}</p>
                  <p className="text-sm text-slate-600 mt-1">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityPost;
