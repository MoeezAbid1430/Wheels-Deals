import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformApi } from '../api/platformApi';

const trustPolicies = [
  { title: 'Terms & Marketplace Rules', to: '/terms', text: 'Core platform usage, seller obligations, fee visibility, and dispute boundaries.' },
  { title: 'Privacy Policy', to: '/privacy-policy', text: 'Public/private profile visibility, document secrecy, retention, and data handling boundaries.' },
  { title: 'Auction Rules', to: '/auction-rules', text: 'Bid increments, anti-sniping, deposits, winner default, seller cancellation, and review paths.' },
  { title: 'Buyer Protection', to: '/buyer-protection', text: 'Deposits, payment review, inspections, title transfer steps, and dispute escalation.' },
  { title: 'KYC & Data Handling', to: '/kyc-policy', text: 'CNIC, passport, license, ownership proof, selfie/liveness, and admin review expectations.' },
];

const verificationLevels = [
  ['Guest', 'Browse only'],
  ['Registered', 'Wishlist, communities, profile basics'],
  ['Email / Phone Verified', 'Comment, request info, message within privacy rules'],
  ['KYC Verified', 'Bid, sell, claim garage ownership, receive payouts'],
  ['Dealer Verified', 'Dealer dashboard, bulk inventory, dealer auction tools'],
  ['Bank / Partner Verified', 'Restricted partner auction access only'],
];

const TrustCenter = () => {
  const [contracts, setContracts] = useState(null);
  const [readiness, setReadiness] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      platformApi.platform.contracts().catch(() => null),
      platformApi.platform.readiness().catch(() => null),
    ]).then(([contractsResult, readinessResult]) => {
      if (cancelled) return;
      setContracts(contractsResult);
      setReadiness(readinessResult);
    });
    return () => { cancelled = true; };
  }, []);

  const authProviders = contracts?.providers?.auth || [];
  const kycProvider = contracts?.providers?.kyc || null;
  const compliance = contracts?.compliance || null;

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">Trust center</p>
          <h1 className="mt-3 text-4xl font-black">Verified marketplace rules, privacy guardrails, and auction expectations.</h1>
          <p className="mt-4 max-w-4xl text-sm font-bold text-slate-300">
            Wheels and Deals is being built as a verified car marketplace and auction ecosystem for Pakistan. This section explains what users can do, what requires verification, and which trust checks must exist before real money moves.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/auction-rules" className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700">Read auction rules</Link>
            <Link to="/privacy-policy" className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">Privacy policy</Link>
            <Link to="/kyc-policy" className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:border-emerald-400">KYC handling</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-black text-slate-900">Policy set</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {trustPolicies.map((policy) => (
                  <Link key={policy.to} to={policy.to} className="rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-500 hover:shadow-sm">
                    <p className="font-black text-slate-900">{policy.title}</p>
                    <p className="mt-2 text-sm font-bold text-slate-500">{policy.text}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-black text-slate-900">Verification ladder</h2>
              <div className="mt-5 grid gap-3">
                {verificationLevels.map(([label, text]) => (
                  <div key={label} className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center">
                    <p className="font-black text-slate-900">{label}</p>
                    <p className="text-sm font-bold text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-black text-slate-900">Pakistan-specific trust notes</h2>
              <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
                <p>Vehicle transfer, biometric steps, tax/token status, and ownership proof vary by seller type and registration authority.</p>
                <p>Private auctions, dealer auctions, and bank or government auctions cannot be treated as the same operational flow.</p>
                <p>"Bank verified" must stay disabled until an actual partner record, representative, documentation trail, and public enablement review exist.</p>
                <p>The platform should not present itself as a licensed bank, wallet, or escrow provider unless that legal relationship truly exists.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-black text-slate-900">Provider reality check</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {authProviders.map((provider) => (
                  <div key={provider.provider} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900 capitalize">{provider.provider.replaceAll('_', ' ')}</p>
                        <p className="mt-1 text-sm font-bold text-slate-500">{provider.configured ? `Configured via ${provider.mode}` : 'Waiting for real credentials and approval.'}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black ${provider.configured ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {provider.configured ? 'configured' : 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Identity review rail</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <StatusRow label="KYC provider" value={kycProvider?.provider || 'manual_review'} />
                  <StatusRow label="Liveness" value={kycProvider?.livenessProvider || 'placeholder_adapter'} />
                  <StatusRow label="CNIC verification" value={kycProvider?.cnicVerificationProvider || 'not_configured'} />
                  <StatusRow label="Consent version" value={kycProvider?.consentTextVersion || 'kyc-consent-v1'} />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black text-slate-900">Platform backbone</h2>
              <div className="mt-4 space-y-3">
                <StatusRow label="Readiness score" value={readiness?.score ? `${readiness.score}%` : 'Loading'} />
                <StatusRow label="Launch class" value={readiness?.launchClass || 'Checking'} />
                <StatusRow label="Payment adapter" value={contracts?.providers?.payments?.provider || 'Checking'} />
                <StatusRow label="Search provider" value={contracts?.providers?.search?.provider || 'Checking'} />
                <StatusRow label="Storage driver" value={contracts?.storage?.driver || 'Checking'} />
                <StatusRow label="Policy set" value={compliance?.policyPages?.length ? `${compliance.policyPages.length} public trust pages` : 'Checking'} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black text-slate-900">Compliance bridge</h2>
              <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
                <p>Consent version: <span className="text-slate-900">{compliance?.consentTextVersion || 'kyc-consent-v1'}</span></p>
                <p>Legal review required: <span className="text-slate-900">{compliance?.legalReviewRequired ? 'Yes' : 'No'}</span></p>
                <p>Bank auctions public: <span className="text-slate-900">{compliance?.publicBankAuctionsEnabled ? 'Enabled' : 'Disabled until partner approval'}</span></p>
                <p>Jurisdiction focus: <span className="text-slate-900">{compliance?.auctionJurisdiction || 'Pakistan-first'}</span></p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black text-slate-900">Sensitive data is never public</h2>
              <div className="mt-4 space-y-2 text-sm font-bold text-slate-600">
                <p>CNIC, passport, license, payment proofs, bank details, internal risk notes, and admin comments must stay private.</p>
                <p>Public profiles should expose only approved visibility fields and masked bid identity by default.</p>
                <p>KYC files belong in private document storage with audit trails and controlled retrieval.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black text-slate-900">Main trust actions</h2>
              <div className="mt-4 grid gap-3">
                <QuickAction to="/settings" label="Account settings" text="OTP, KYC, payments, sessions" />
                <QuickAction to="/privacy" label="Privacy & Visibility Center" text="Control public profile and garage visibility" />
                <QuickAction to="/feature-suggestions" label="Feature suggestions" text="Send structured feedback to the team" />
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
};

const StatusRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3">
    <span className="text-sm font-bold text-slate-500">{label}</span>
    <span className="text-sm font-black text-slate-900 text-right">{value}</span>
  </div>
);

const QuickAction = ({ to, label, text }) => (
  <Link to={to} className="rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-500">
    <p className="font-black text-slate-900">{label}</p>
    <p className="mt-1 text-sm font-bold text-slate-500">{text}</p>
  </Link>
);

export default TrustCenter;
