import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { platformApi } from '../api/platformApi';

const policyContent = {
  'terms': {
    eyebrow: 'Marketplace terms',
    title: 'Terms & Marketplace Rules',
    intro: 'These platform rules define how buyers, sellers, dealers, writers, and admins use Wheels and Deals. High-value actions require verification and may enter manual review.',
    sections: [
      {
        heading: 'Account classes',
        points: [
          'Guest and basic accounts can browse, read, and save content, but they cannot post vehicles, bid, or receive payouts.',
          'Sensitive actions are restricted by verification level, role, and trust status.',
          'Suspended or rejected accounts can lose access to bidding, listing, messaging, or settlement flows.',
        ],
      },
      {
        heading: 'Seller and dealer obligations',
        points: [
          'Sellers must provide truthful vehicle identity, ownership, title, tax/token, and inspection-related information.',
          'Dealers require approval before using dealer badges, dealer dashboards, or bulk inventory privileges.',
          'False images, stolen media, or misleading descriptions can trigger rejection, suspension, or permanent ban review.',
        ],
      },
      {
        heading: 'Marketplace conduct',
        points: [
          'Listings, accessories, communities, and repair-shop profiles may be moderated, returned for correction, or removed.',
          'Public claims such as verified dealer, inspected, or bank verified must be backed by actual review state.',
          'The platform may ask for additional proof before reactivating disputed accounts or listings.',
        ],
      },
    ],
  },
  'privacy-policy': {
    eyebrow: 'Privacy rules',
    title: 'Privacy Policy',
    intro: 'The platform is designed so users control public profile visibility while identity, payment, and moderation evidence stay private.',
    sections: [
      {
        heading: 'Public visibility',
        points: [
          'Users can control profile photo, city, garage, owned vehicles, archived vehicles, badges, wishlist, and community activity visibility.',
          'Bid identity should be masked by default unless a narrower product rule changes it.',
          'Phone and contact visibility should only expand according to explicit privacy settings or deal state.',
        ],
      },
      {
        heading: 'Sensitive data',
        points: [
          'CNIC, passport, driving license, bank proofs, payment proofs, risk signals, and admin notes must never be publicly exposed.',
          'KYC and ownership documents belong in private storage and should only be retrievable through authorized review paths.',
          'The platform should minimize retention and avoid storing raw financial or identity secrets where they are not needed.',
        ],
      },
      {
        heading: 'Messaging and activity',
        points: [
          'Messaging availability follows user privacy controls and verification policy.',
          'Saved cars, saved auctions, cart history, and private purchases are personal account data.',
          'Audit trails are operational records and are not part of the public profile surface.',
        ],
      },
    ],
  },
  'auction-rules': {
    eyebrow: 'Auction conduct',
    title: 'Auction Rules',
    intro: 'Auction actions must be server-authoritative, deposit-backed where required, and reviewable through audit logs.',
    sections: [
      {
        heading: 'Eligibility',
        points: [
          'Bidding requires the correct verification level and any required deposit or hold.',
          'Seller, bidder, dealer, and partner roles must be enforced before sensitive auction actions are accepted.',
          'Bank or partner auction participation must remain restricted until partner verification exists.',
        ],
      },
      {
        heading: 'Bid handling',
        points: [
          'Bids should follow increment rules, reserve handling, anti-sniping extension rules, and auction state transitions.',
          'Late, duplicate, or invalid bids should be rejected by the backend with clear reason codes.',
          'The frontend must never be the source of truth for winner state or live bid acceptance.',
        ],
      },
      {
        heading: 'Settlement and failure states',
        points: [
          'Winning bidders must pay within the configured deadline or risk forfeit review.',
          'Seller payout should not complete until buyer payment clears and handover/title steps satisfy the configured workflow.',
          'Disputes, fraud signals, reserve failures, or ownership issues can freeze or reverse settlement paths.',
        ],
      },
    ],
  },
  'buyer-protection': {
    eyebrow: 'Buyer protection',
    title: 'Buyer Protection',
    intro: 'Buyer protection depends on verified sellers, reviewable payment references, inspections, and transparent dispute handling.',
    sections: [
      {
        heading: 'Before payment',
        points: [
          'Buyers should understand reserve status, deposit expectations, handover responsibility, and document transfer steps before committing.',
          'Inspection status and title or ownership proof should be visible where supported.',
          'Bank verified or inspected labels must only appear when evidence and approval truly exist.',
        ],
      },
      {
        heading: 'After winning',
        points: [
          'Checkout should show a clear payment deadline, selected method, proof path, and admin review state.',
          'Dispute entry points must remain available when payment, handover, inspection, or title transfer does not match expectations.',
          'Buyer deposit treatment must be explicit in normal, refunded, disputed, and forfeited outcomes.',
        ],
      },
      {
        heading: 'What the platform does not claim',
        points: [
          'The platform should not present itself as a licensed bank or escrow institution unless that legal relationship exists.',
          'Manual review and payment references reduce risk, but they do not replace licensed financial rails.',
          'Government, customs, and bank auctions may require extra legal and documentation layers beyond private marketplace deals.',
        ],
      },
    ],
  },
  'kyc-policy': {
    eyebrow: 'Verification handling',
    title: 'KYC & Data Handling',
    intro: 'Identity and ownership verification must be consent-based, reviewable, and separated from public profile data.',
    sections: [
      {
        heading: 'Accepted verification evidence',
        points: [
          'Government ID such as CNIC, passport, and driving license can support user verification.',
          'Dealers may also need NTN, business registration, and business banking proof.',
          'Vehicle ownership and transfer proofs may be required before listing or settlement approval.',
        ],
      },
      {
        heading: 'Review process',
        points: [
          'Users can move through registered, phone or email verified, KYC pending, KYC verified, dealer verified, partner verified, rejected, or suspended states.',
          'Manual admin review should remain available when automated verification fails or requires confirmation.',
          'Consent timestamp, versioned consent text, review notes, and resubmission reasons belong in the audit trail.',
        ],
      },
      {
        heading: 'Storage and exposure',
        points: [
          'Identity files should not live in casual public payloads or public URLs.',
          'Only authorized admins or reviewers should access document evidence, and access should be audited.',
          'Retention and deletion policies should minimize how long sensitive material remains in the system.',
        ],
      },
    ],
  },
};

const PolicyPage = () => {
  const { slug } = useParams();
  const location = useLocation();
  const activeSlug = slug || location.pathname.replace(/^\//, '') || 'terms';
  const page = policyContent[activeSlug] || policyContent['terms'];
  const [contracts, setContracts] = useState(null);
  const [auctionRules, setAuctionRules] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      platformApi.platform.contracts().catch(() => null),
      activeSlug === 'auction-rules' ? platformApi.auctionRules.list().catch(() => null) : Promise.resolve(null),
    ]).then(([contractsResult, rulesResult]) => {
      if (cancelled) return;
      setContracts(contractsResult);
      setAuctionRules(rulesResult);
    });
    return () => { cancelled = true; };
  }, [activeSlug]);

  const liveAuctionRuleRows = useMemo(() => {
    const rules = auctionRules?.rules || auctionRules?.auctionRules || contracts?.auctionRules || null;
    if (!rules) return [];
    return [
      ['Starting increment', rules.startingIncrement || rules.minimumIncrement || 'Configured'],
      ['Anti-sniping', rules.antiSniping ? 'Enabled' : rules.antiSniping === false ? 'Disabled' : 'Configured'],
      ['Deposit required', rules.depositRequired ? 'Yes' : 'Policy based'],
      ['Buyer default', rules.buyerDefault || 'Review based'],
      ['Seller cancellation', rules.sellerCancellation || 'Policy based'],
    ];
  }, [auctionRules, contracts]);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">{page.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black text-slate-900">{page.title}</h1>
          <p className="mt-4 max-w-4xl text-sm font-bold text-slate-500">{page.intro}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/trust" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 hover:border-blue-500">Back to Trust Center</Link>
            <Link to="/faq" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">Help & FAQ</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {page.sections.map((section) => (
              <section key={section.heading} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-2xl font-black text-slate-900">{section.heading}</h2>
                <div className="mt-4 space-y-3">
                  {section.points.map((point) => (
                    <div key={point} className="rounded-xl border border-slate-100 p-4 text-sm font-bold text-slate-600">
                      {point}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {activeSlug === 'auction-rules' && liveAuctionRuleRows.length ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-2xl font-black text-slate-900">Current configured auction controls</h2>
                <div className="mt-4 space-y-3">
                  {liveAuctionRuleRows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
                      <span className="text-sm font-bold text-slate-500">{label}</span>
                      <span className="text-sm font-black text-slate-900 text-right">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black text-slate-900">Live trust rails</h2>
              <div className="mt-4 space-y-3">
                <PolicyStat label="Consent version" value={contracts?.compliance?.consentTextVersion || 'Checking'} />
                <PolicyStat label="Payment adapter" value={contracts?.providers?.payments?.provider || 'Checking'} />
                <PolicyStat label="KYC provider" value={contracts?.providers?.kyc?.provider || 'Checking'} />
                <PolicyStat label="Liveness" value={contracts?.providers?.kyc?.livenessProvider || 'Checking'} />
                <PolicyStat label="Media adapter" value={contracts?.providers?.media?.provider || 'Checking'} />
                <PolicyStat label="Search adapter" value={contracts?.providers?.search?.provider || 'Checking'} />
                <PolicyStat label="Realtime events" value={contracts?.realtimeEvents?.length ? `${contracts.realtimeEvents.length} events` : 'Checking'} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black text-slate-900">Provider status</h2>
              <div className="mt-4 space-y-3">
                {(contracts?.providers?.auth || []).map((provider) => (
                  <PolicyStat
                    key={provider.provider}
                    label={provider.provider.replaceAll('_', ' ')}
                    value={provider.configured ? provider.mode : 'credentials required'}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black text-slate-900">What users should expect</h2>
              <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
                <p>Real payments and legal language depend on official provider credentials, merchant onboarding, and local review.</p>
                <p>Bank auction visibility must remain controlled until verified partner records and public enablement exist.</p>
                <p>Trust labels should always correspond to actual review state, not marketing copy.</p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
};

const PolicyStat = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3">
    <span className="text-sm font-bold text-slate-500">{label}</span>
    <span className="text-sm font-black text-slate-900 text-right">{value}</span>
  </div>
);

export default PolicyPage;
