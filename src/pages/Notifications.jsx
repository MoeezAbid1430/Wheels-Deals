import React from 'react';
import { Link } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const Notifications = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAuctions();

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-blue-600 font-black text-xs uppercase tracking-[0.3em]">Alerts</p>
            <h1 className="text-4xl font-black text-slate-900 mt-2">Notifications</h1>
          </div>
          <button onClick={markAllNotificationsRead} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold">
            Mark all read
          </button>
        </div>

        <div className="space-y-3" aria-live="polite">
          {notifications.length > 0 ? notifications.map((notification) => (
            <article key={notification.id} className={`border rounded-xl p-5 ${notification.read ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400 font-black uppercase">{notification.type}</p>
                  <h2 className="font-black text-slate-900 text-xl mt-1">{notification.title}</h2>
                  <p className="text-slate-600 mt-1">{notification.body}</p>
                  <p className="text-xs text-slate-400 mt-2">{notification.createdAt}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={notification.link} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Open</Link>
                  <button onClick={() => markNotificationRead(notification.id)} disabled={notification.read} className="border border-slate-300 disabled:opacity-50 px-4 py-2 rounded-lg font-bold text-sm">
                    Read
                  </button>
                </div>
              </div>
            </article>
          )) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <h2 className="text-xl font-black text-slate-900">No notifications yet.</h2>
              <p className="text-slate-500 mt-2">Bid alerts, seller replies, checkout updates, and community replies will appear here.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Notifications;
