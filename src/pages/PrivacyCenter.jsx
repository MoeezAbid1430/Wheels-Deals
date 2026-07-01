import React, { useEffect, useMemo, useState } from 'react';
import { createHttpClient } from '../api/httpClient';
import { createPlatformApi } from '../api/platformApi';
import { useAuctions } from '../context/AuctionContext';

const AUTH_TOKEN_KEY = 'wheels_deals_auth_token';

const privacyLabels = {
  showFullName: 'Show full name',
  showDisplayName: 'Show display name',
  showProfilePhoto: 'Show profile photo',
  showCity: 'Show city',
  showPhone: 'Show phone number',
  showEmail: 'Show email',
  showGarage: 'Show garage publicly',
  showOwnedVehicles: 'Show owned vehicles',
  showArchivedVehicles: 'Show archived vehicles',
  showBadgesRankings: 'Show badges and rankings',
  showAuctionHistory: 'Show auction activity',
  showWishlist: 'Show wishlist',
  showCommunityHistory: 'Show community activity',
};

const PrivacyCenter = () => {
  const { authUser, userProfile } = useAuctions();
  const api = useMemo(() => createPlatformApi(createHttpClient({ getToken: () => window.localStorage.getItem(AUTH_TOKEN_KEY) })), []);
  const [privacy, setPrivacy] = useState(null);
  const [verification, setVerification] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.privacy.get().catch(() => null),
      api.verification.me().catch(() => null),
    ]).then(([privacyResult, verificationResult]) => {
      if (cancelled) return;
      setPrivacy(privacyResult?.privacy || {
        showDisplayName: true,
        showProfilePhoto: true,
        showCity: true,
        showGarage: true,
        showOwnedVehicles: true,
        showBadgesRankings: true,
        showCommunityHistory: true,
        messagePolicy: 'verified_users',
        bidDisplayPolicy: 'masked_username',
      });
      setVerification(verificationResult);
    });
    return () => { cancelled = true; };
  }, [api]);

  const updatePrivacy = async (patch) => {
    const next = { ...privacy, ...patch };
    setPrivacy(next);
    const result = await api.privacy.update(patch).catch((error) => ({ error }));
    setMessage(result?.error ? result.error.message : 'Privacy settings saved.');
  };

  if (!authUser && !privacy) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <section className="mx-auto max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-2xl font-black text-slate-900">Privacy & Visibility Center</h1>
          <p className="mt-2 font-bold text-amber-800">Login is required to manage public profile, garage, wishlist, and auction visibility.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-lg bg-slate-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Trust layer</p>
          <h1 className="mt-2 text-3xl font-black">Privacy & Visibility Center</h1>
          <p className="mt-3 max-w-3xl text-sm font-bold text-slate-300">
            Control what buyers, sellers, communities, and visitors can see. Sensitive KYC, payment, banking, risk, and admin data is never public.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-black text-slate-900">Public profile visibility</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(privacyLabels).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <span className="font-bold text-slate-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(privacy?.[key])}
                    onChange={(event) => updatePrivacy({ [key]: event.target.checked })}
                    className="h-5 w-5"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block rounded-lg border border-slate-200 p-3">
                <span className="text-sm font-black text-slate-700">Who can message me?</span>
                <select value={privacy?.messagePolicy || 'verified_users'} onChange={(event) => updatePrivacy({ messagePolicy: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-bold">
                  <option value="everyone">Everyone</option>
                  <option value="verified_users">Verified users only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </label>
              <label className="block rounded-lg border border-slate-200 p-3">
                <span className="text-sm font-black text-slate-700">Bid name display</span>
                <select value={privacy?.bidDisplayPolicy || 'masked_username'} onChange={(event) => updatePrivacy({ bidDisplayPolicy: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-bold">
                  <option value="masked_username">Masked username</option>
                  <option value="display_name">Display name</option>
                </select>
              </label>
            </div>
            {message && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-black text-emerald-700">{message}</p>}
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-900">Current trust status</h2>
            <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
              <p>Name: {userProfile?.name || authUser?.fullName || authUser?.email || 'Member'}</p>
              <p>Verification: <span className="text-slate-950">{verification?.verificationLevel || 'registered'}</span></p>
              <p>KYC: <span className="text-slate-950">{verification?.kycProfile?.status || 'not_started'}</span></p>
              <p>Bid: {verification?.eligibility?.bid?.ok ? 'Allowed' : 'Requires KYC'}</p>
              <p>Sell: {verification?.eligibility?.['listing.create']?.ok ? 'Allowed' : 'Requires KYC'}</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default PrivacyCenter;
