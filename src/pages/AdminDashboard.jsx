import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformApi } from '../api/platformApi';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const fallbackKyc = [
  { id: 'kyc-preview-1', userId: 'dealer-preview', userName: 'Dealer applicant', status: 'pending', levelRequested: 'dealer_verified', risk: 'Medium', note: 'NTN/business proof and owner CNIC need admin review.' },
  { id: 'kyc-preview-2', userId: 'bidder-preview', userName: 'High bidder', status: 'pending', levelRequested: 'kyc_verified', risk: 'Low', note: 'CNIC uploaded, selfie/liveness still pending.' },
];

const fallbackDocuments = [
  { id: 'doc-preview-1', userName: 'Dealer applicant', documentType: 'business_registration', status: 'pending', fileName: 'NTN-certificate.pdf', note: 'Match business name with dealer profile.' },
  { id: 'doc-preview-2', userName: 'Private seller', documentType: 'vehicle_ownership', status: 'needs_review', fileName: 'fortuner-title-scan.jpg', note: 'Name mismatch must be resolved before listing approval.' },
];

const fallbackPayments = [
  { id: 'pay-preview-1', userName: 'Auction winner', provider: 'bank_transfer', status: 'pending_review', amount: 9200000, reference: 'IBFT-REVO-9200', createdAt: 'Preview' },
  { id: 'pay-preview-2', userName: 'Bidder deposit', provider: 'easypaisa', status: 'held', amount: 250000, reference: 'EP-DEPOSIT-250', createdAt: 'Preview' },
];

const fallbackPartners = [
  { id: 'bank-preview-1', name: 'Partner Bank Sandbox', institutionType: 'bank', status: 'pending_review', publicEnabled: false, legalAgreementRef: 'Draft MOU required' },
];

const fallbackSuggestions = [
  { id: 'suggestion-preview-1', module: 'Auctions', title: 'Show deposit deadline warnings', status: 'under_review', userPriority: 'high', problemSolved: 'Stops winners from missing payment deadlines.' },
];

const fallbackAudit = [
  { id: 'audit-preview-1', actorId: 'system', action: 'admin.preview_loaded', entityType: 'admin_dashboard', entityId: 'preview', createdAt: 'Preview mode', details: { source: 'fallback' } },
];

const AdminDashboard = () => {
  const { submissions, updateSubmissionStatus, accessories, posts, accessoryOrders, updateAccessoryOrderStatus } = useAuctions();
  const [activeQueue, setActiveQueue] = useState('Overview');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [queues, setQueues] = useState({
    submissions,
    kyc: fallbackKyc,
    documents: fallbackDocuments,
    payments: fallbackPayments,
    partners: fallbackPartners,
    suggestions: fallbackSuggestions,
    audit: fallbackAudit,
    disputes: [{ id: 'dispute-preview-1', title: 'Winner payment delay', status: 'open', owner: 'Checkout team', next: 'Contact bidder before deposit forfeit.' }],
    orders: accessoryOrders,
  });

  useEffect(() => {
    setQueues((current) => ({ ...current, submissions, orders: accessoryOrders.length ? accessoryOrders : current.orders }));
  }, [submissions, accessoryOrders]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        platformApi.admin.listSubmissions({ status: 'All' }),
        platformApi.admin.kycQueue({ status: 'All' }),
        platformApi.admin.documentQueue({ status: 'All' }),
        platformApi.admin.payments({ status: 'All' }),
        platformApi.bankPartners.list(),
        platformApi.featureSuggestions.adminList({}),
        platformApi.admin.auditLog({ limit: 20 }),
        platformApi.admin.disputes({ status: 'All' }),
        platformApi.admin.orders({ status: 'All' }),
      ]);
      if (cancelled) return;

      const value = (index) => (results[index].status === 'fulfilled' ? results[index].value : null);
      const next = {
        submissions: value(0)?.submissions || submissions,
        kyc: normalizeKyc(value(1)?.queue || value(1)?.kycProfiles || fallbackKyc),
        documents: normalizeDocuments(value(2)?.documents || value(2)?.queue || fallbackDocuments),
        payments: normalizePayments(value(3)?.transactions || fallbackPayments),
        partners: value(4)?.partners?.length ? value(4).partners : fallbackPartners,
        suggestions: value(5)?.suggestions?.length ? value(5).suggestions : fallbackSuggestions,
        audit: value(6)?.events?.length ? value(6).events : fallbackAudit,
        disputes: value(7)?.disputes?.length ? value(7).disputes : [{ id: 'dispute-preview-1', title: 'Winner payment delay', status: 'open', owner: 'Checkout team', next: 'Contact bidder before deposit forfeit.' }],
        orders: value(8)?.orders?.length ? value(8).orders : accessoryOrders,
      };
      setQueues(next);
      const failed = results.filter((result) => result.status === 'rejected').length;
      setMessage(failed ? 'Preview mode: some protected admin APIs need a real admin session, so fallback queues are shown.' : 'Admin trust queues loaded from API.');
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [accessoryOrders, submissions]);

  const reportedPosts = posts.filter((post) => post.reports > 0);
  const stats = useMemo(() => buildStats(queues, submissions, reportedPosts, accessories), [queues, submissions, reportedPosts, accessories]);

  const updateQueueItem = (queueName, id, patch) => {
    setQueues((current) => ({
      ...current,
      [queueName]: (current[queueName] || []).map((item) => (String(item.id) === String(id) ? { ...item, ...patch } : item)),
    }));
  };

  const setReviewDraft = (id, patch) => {
    setReviewDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] || {}), ...patch },
    }));
  };

  const reviewKyc = async (id, status) => {
    const draft = reviewDrafts[id] || {};
    updateQueueItem('kyc', id, {
      status,
      reviewedAt: 'Just now',
      reviewNote: draft.reviewNote || '',
      rejectionReason: status === 'verified' ? null : (draft.rejectionReason || draft.reviewNote || ''),
      nextAction: draft.nextAction || '',
    });
    setMessage(`KYC marked ${status}.`);
    try {
      await platformApi.admin.reviewKyc(id, {
        status,
        reviewNote: draft.reviewNote,
        rejectionReason: draft.rejectionReason,
        nextAction: draft.nextAction,
        promoteDealer: Boolean(draft.promoteDealer),
      });
    } catch {
      setMessage(`Preview action saved locally: KYC marked ${status}.`);
    }
  };

  const reviewDocument = async (id, status) => {
    const draft = reviewDrafts[id] || {};
    updateQueueItem('documents', id, { status, reviewedAt: 'Just now', reviewNote: draft.reviewNote || '' });
    setMessage(`Document marked ${status}.`);
    try {
      await platformApi.admin.reviewDocument(id, { status, reviewNote: draft.reviewNote || `Admin marked ${status}` });
    } catch {
      setMessage(`Preview action saved locally: document marked ${status}.`);
    }
  };

  const updateSuggestion = async (id, status) => {
    updateQueueItem('suggestions', id, { status, reviewedAt: 'Just now' });
    setMessage(`Suggestion moved to ${status}.`);
    try {
      await platformApi.featureSuggestions.adminUpdate(id, { status });
    } catch {
      setMessage(`Preview action saved locally: suggestion moved to ${status}.`);
    }
  };

  const updatePartner = async (id, status) => {
    const publicEnabled = status === 'verified';
    updateQueueItem('partners', id, { status, publicEnabled, reviewedAt: 'Just now' });
    setMessage(status === 'verified' ? 'Bank partner verified. Bank auction visibility can now be enabled.' : `Bank partner marked ${status}.`);
    try {
      await platformApi.bankPartners.update(id, { status, publicEnabled });
    } catch {
      setMessage(`Preview action saved locally: bank partner marked ${status}.`);
    }
  };

  const updatePayment = async (id, status, adminNote, refundStatus = null, depositHoldAction = null) => {
    updateQueueItem('payments', id, { status, adminNote, refundStatus, depositHoldAction, reviewedAt: 'Just now' });
    setMessage(`Payment marked ${status}.`);
    try {
      await platformApi.admin.updatePayment(id, { status, adminNote, refundStatus, depositHoldAction });
    } catch {
      setMessage(`Preview action saved locally: payment marked ${status}.`);
    }
  };

  const updateDispute = async (id, status, resolutionNote) => {
    updateQueueItem('disputes', id, { status, resolutionNote, updatedAt: 'Just now' });
    setMessage(`Dispute moved to ${status}.`);
    try {
      await platformApi.admin.updateDispute(id, { status, resolutionNote });
    } catch {
      setMessage(`Preview action saved locally: dispute moved to ${status}.`);
    }
  };

  return (
    <main className="bg-slate-950 min-h-screen text-white">
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-red-400 font-black text-xs uppercase tracking-[0.3em]">Admin trust operations</p>
            <h1 className="text-4xl font-black mt-2">Verification, payments, disputes, and marketplace control.</h1>
            <p className="text-slate-400 mt-2 max-w-3xl">
              This is the operational layer that decides who can bid, sell, receive payouts, claim bank auctions, and publish trusted inventory.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/auctions" className="bg-red-600 text-white px-5 py-3 rounded-lg font-bold text-center">Auction Control</Link>
            <Link to="/admin/editorial" className="bg-emerald-500 text-slate-950 px-5 py-3 rounded-lg font-bold text-center">Editorial Review</Link>
            <Link to="/seller/dashboard" className="bg-white text-slate-950 px-5 py-3 rounded-lg font-bold text-center">Seller View</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
          {stats.map((stat) => <Stat key={stat.label} {...stat} />)}
        </div>

        {message && <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-bold text-slate-200 mb-5">{loading ? 'Loading protected queues...' : message}</div>}

        <div className="flex flex-wrap gap-2 mb-6">
          {['Overview', 'Listings', 'KYC', 'Documents', 'Payments', 'Bank Partners', 'Suggestions', 'Fraud', 'Accessories', 'Orders', 'Community', 'Disputes', 'Audit'].map((queue) => (
            <button
              key={queue}
              onClick={() => setActiveQueue(queue)}
              className={`px-4 py-2 rounded-lg font-black text-sm ${activeQueue === queue ? 'bg-red-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-slate-200 hover:border-red-500'}`}
            >
              {queue}
            </button>
          ))}
        </div>

        {activeQueue === 'Overview' && <Overview queues={queues} />}
        {activeQueue === 'Listings' && <ListingsQueue submissions={queues.submissions} onApprove={(id) => updateSubmissionStatus(id, 'Approved')} onReject={(id) => updateSubmissionStatus(id, 'Rejected')} onReturn={(id) => updateSubmissionStatus(id, 'Pending Review')} />}
        {activeQueue === 'KYC' && <TrustQueue items={queues.kyc} type="kyc" drafts={reviewDrafts} onDraftChange={setReviewDraft} onApprove={(id) => reviewKyc(id, 'verified')} onReject={(id) => reviewKyc(id, 'rejected')} onResubmit={(id) => reviewKyc(id, 'needs_resubmission')} />}
        {activeQueue === 'Documents' && <TrustQueue items={queues.documents} type="document" drafts={reviewDrafts} onDraftChange={setReviewDraft} onApprove={(id) => reviewDocument(id, 'approved')} onReject={(id) => reviewDocument(id, 'rejected')} onResubmit={(id) => reviewDocument(id, 'needs_resubmission')} />}
        {activeQueue === 'Payments' && <PaymentQueue items={queues.payments} onApprove={(item) => updatePayment(item.id, item.transactionType === 'seller_payout' ? 'released' : 'confirmed', item.transactionType === 'seller_payout' ? 'Admin released seller payout.' : 'Admin approved payment evidence.')} onHold={(item) => updatePayment(item.id, item.transactionType === 'seller_payout' ? 'dispute_hold' : 'pending_review', item.transactionType === 'seller_payout' ? 'Seller payout held pending dispute or ops review.' : 'Needs manual banking confirmation.', item.transactionType === 'seller_payout' ? 'hold' : null)} onRefund={(item) => updatePayment(item.id, item.status || (item.transactionType === 'seller_payout' ? 'cancelled' : 'refunded'), item.adminNote || (item.transactionType === 'seller_payout' ? 'Admin cancelled seller payout.' : 'Admin approved refund.'), item.refundStatus !== undefined ? item.refundStatus : (item.transactionType === 'seller_payout' ? 'cancelled' : 'approved'), item.depositHoldAction || null)} />}
        {activeQueue === 'Bank Partners' && <BankPartnerQueue items={queues.partners} onApprove={(id) => updatePartner(id, 'verified')} onReject={(id) => updatePartner(id, 'rejected')} />}
        {activeQueue === 'Suggestions' && <SuggestionQueue items={queues.suggestions} onPlan={(id) => updateSuggestion(id, 'planned')} onReject={(id) => updateSuggestion(id, 'rejected')} />}
        {activeQueue === 'Fraud' && <GenericQueue items={fallbackFraud()} primary="signal" secondary="entity" meta="action" />}
        {activeQueue === 'Accessories' && <AccessoryModeration items={accessories.slice(0, 8)} />}
        {activeQueue === 'Orders' && <OrderOpsQueue orders={queues.orders} onAction={(orderId, status, note) => {
          const result = updateAccessoryOrderStatus(orderId, status, note);
          setMessage(result.message);
        }} />}
        {activeQueue === 'Community' && <GenericQueue items={reportedPosts.length ? reportedPosts : [{ id: 'community-clear', title: 'No active reports', forumId: 'community', status: 'Clear', body: 'Community reports will appear here.' }]} primary="title" secondary="forumId" meta="body" />}
        {activeQueue === 'Disputes' && <DisputeQueue items={queues.disputes} onResolve={(id) => updateDispute(id, 'resolved', 'Admin resolved dispute after review.')} onEscalate={(id) => updateDispute(id, 'escalated', 'Escalated for manual legal or operations review.')} />}
        {activeQueue === 'Audit' && <AuditQueue items={queues.audit} />}
      </section>
    </main>
  );
};

const Overview = ({ queues }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <PolicyCard title="Sensitive actions are gated" text="Bidding, selling, payouts, dealer tools, bank auctions, and ownership claims require the correct verification level." />
    <PolicyCard title="Bank auctions stay disabled" text="Public bank-verified auctions only unlock after a verified bank partner is approved and publicEnabled is true." />
    <PolicyCard title="Private documents stay private" text="CNIC, license, bank proofs, ownership files, and admin notes never appear in public user responses." />
    <QueuePreview title="KYC waiting" items={queues.kyc} />
    <QueuePreview title="Document review" items={queues.documents} />
    <QueuePreview title="Payment review" items={queues.payments} />
  </div>
);

const ListingsQueue = ({ submissions, onApprove, onReject, onReturn }) => {
  if (!submissions.length) return <EmptyQueue />;
  return (
    <div className="space-y-5">
      {submissions.map((submission) => (
        <article key={submission.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge>{submission.status}</Badge>
                <Badge>{submission.listingType || submission.payload?.listingType || 'listing'}</Badge>
                <Badge>{submission.sellerType || submission.payload?.sellerType || 'seller'}</Badge>
              </div>
              <h2 className="text-2xl font-black">{submission.year || submission.payload?.year} {submission.make || submission.payload?.make} {submission.model || submission.payload?.model}</h2>
              <p className="text-slate-400 mt-1">{submission.fullName || submission.payload?.fullName || submission.sellerId || 'Seller'} - {submission.phone || submission.payload?.phone || 'No phone'} - {submission.titleLocation || submission.payload?.titleLocation || 'Title location pending'}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                <Mini label="Quality" value={`${submission.qualityScore || submission.quality || 0}/100`} />
                <Mini label="VIN" value={submission.vin || submission.payload?.vin || 'Missing'} />
                <Mini label="Title" value={submission.titleStatus || submission.payload?.titleStatus || 'Missing'} />
                <Mini label="Price" value={submission.reservePrice || submission.askingPrice || submission.payload?.askingPrice || 'Missing'} />
              </div>
            </div>
            <DecisionPanel onApprove={() => onApprove(submission.id)} onReject={() => onReject(submission.id)} onEscalate={() => onReturn(submission.id)} approve="Approve Listing" reject="Reject" escalate="Return Pending" />
          </div>
        </article>
      ))}
    </div>
  );
};

const TrustQueue = ({ items, type, drafts, onDraftChange, onApprove, onReject, onResubmit }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {items.map((item) => (
      <article key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 font-black uppercase">{type === 'kyc' ? (item.levelRequested || item.verificationLevel || 'kyc review') : (item.documentType || item.purpose || 'document')}</p>
            <h2 className="text-xl font-black mt-1">{item.userName || item.user?.fullName || item.user?.email || item.userId || item.fileName || item.id}</h2>
            <p className="text-sm text-slate-400 mt-2">{item.note || item.rejectionReason || item.fileName || 'Review consent, document quality, and fraud signals before approval.'}</p>
          </div>
          <StatusBadge status={item.status || item.risk || 'pending'} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Mini label="Verification target" value={item.levelRequested || item.documentType || 'kyc_verified'} />
          <Mini label="Listings / dealer" value={item.listingsCount !== undefined ? `${item.listingsCount} listings` : (item.dealerProfile?.status || 'No dealer profile')} />
        </div>
        {type === 'kyc' ? (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Mini label="Consent version" value={item.consentTextVersion || 'kyc-consent-v1'} />
            <Mini label="Provider rail" value={item.provider || 'manual_review'} />
          </div>
        ) : null}
        {type === 'kyc' && item.consentAcceptedAt ? (
          <p className="mt-3 text-xs font-bold text-zinc-400">Consent accepted {new Date(item.consentAcceptedAt).toLocaleString()}</p>
        ) : null}
        {type === 'documents' && item.mediaAsset ? (
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-black uppercase text-zinc-500">Document media</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Mini label="Mime" value={item.mediaAsset.mimeType || 'Unknown'} />
              <Mini label="Size" value={item.mediaAsset.sizeBytes ? `${Math.round(Number(item.mediaAsset.sizeBytes) / 1024)} KB` : 'Unknown'} />
              <Mini label="Upload" value={item.mediaAsset.uploadStatus || 'Pending'} />
              <Mini label="Processing" value={item.mediaAsset.processingStatus || item.mediaAsset.moderationStatus || 'Pending'} />
            </div>
          </div>
        ) : null}
        {type === 'documents' && item.profile ? (
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-black uppercase text-zinc-500">Linked KYC profile</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Mini label="Profile status" value={item.profile.status || 'pending'} />
              <Mini label="Review state" value={item.profile.reviewStatus || 'waiting'} />
            </div>
          </div>
        ) : null}
        {type === 'kyc' && item.latestDocuments?.length ? (
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-black uppercase text-zinc-500">Latest documents</p>
            <div className="mt-2 space-y-2">
              {item.latestDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-200">{document.documentType}</span>
                  <span className="text-zinc-400">{document.status}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-4 space-y-3">
          <textarea
            value={drafts[item.id]?.reviewNote || ''}
            onChange={(event) => onDraftChange(item.id, { reviewNote: event.target.value })}
            rows="3"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-slate-100 outline-none focus:border-red-500"
            placeholder={type === 'kyc' ? 'Add review note for the applicant and audit trail...' : 'Add document review note or correction request...'}
          />
          {type === 'kyc' ? (
            <>
              <input
                value={drafts[item.id]?.rejectionReason || ''}
                onChange={(event) => onDraftChange(item.id, { rejectionReason: event.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-slate-100 outline-none focus:border-red-500"
                placeholder="Rejection or resubmission reason"
              />
              <input
                value={drafts[item.id]?.nextAction || ''}
                onChange={(event) => onDraftChange(item.id, { nextAction: event.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-slate-100 outline-none focus:border-red-500"
                placeholder="Next action for applicant or ops team"
              />
              {item.dealerProfile ? (
                <label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(drafts[item.id]?.promoteDealer)}
                    onChange={(event) => onDraftChange(item.id, { promoteDealer: event.target.checked })}
                  />
                  <span className="text-sm font-bold text-slate-200">Promote linked dealer profile when KYC is approved</span>
                </label>
              ) : null}
            </>
          ) : null}
        </div>
        <DecisionPanel onApprove={() => onApprove(item.id)} onReject={() => onReject(item.id)} onEscalate={() => onResubmit(item.id)} approve="Approve" reject="Reject" escalate="Needs Resubmission" compact />
      </article>
    ))}
  </div>
);

const PaymentQueue = ({ items, onApprove, onHold, onRefund }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {items.map((item) => (
      <article key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 font-black uppercase">{item.transactionType || item.provider || 'payment provider'}</p>
            <h2 className="text-xl font-black mt-1">{item.userName || item.user?.fullName || item.user?.email || item.userId || 'Payment user'}</h2>
            <p className="text-sm text-slate-400 mt-2">Reference: {item.reference || item.providerReference || item.id}</p>
          </div>
          <StatusBadge status={item.status || 'pending'} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Mini label="Amount" value={formatPkr(Number(item.amount || 0))} />
          <Mini label="Created" value={item.createdAt || 'Preview'} />
          <Mini label="Auction" value={item.auction?.id || item.auctionId || 'Manual'} />
          <Mini label="Checkout" value={item.checkout?.status || item.checkoutId || 'N/A'} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Mini label="Method" value={item.paymentMethod?.label || item.paymentMethodLabel || item.providerLabel || item.provider || 'Manual'} />
          <Mini label="Mode" value={item.paymentMethod?.providerMode || item.providerMode || item.metadata?.providerMode || 'review'} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Mini label="Reconciliation" value={item.reconciliationStatus || 'not_started'} />
          <Mini label="Callback" value={item.providerCallbackStatus || 'not_received'} />
        </div>
        <p className="text-sm text-slate-400 mt-3">{item.adminNote || item.refundStatus || 'Review provider reference, payment proof, and release timing before approval.'}</p>
        <DecisionPanel
          onApprove={() => onApprove(item)}
          onReject={() => onRefund(item)}
          onEscalate={() => onHold(item)}
          approve={item.transactionType === 'seller_payout' ? 'Release Payout' : 'Confirm Payment'}
          reject={item.transactionType === 'seller_payout' ? 'Hold / Cancel' : 'Refund / Reverse'}
          escalate={item.transactionType === 'seller_payout' ? 'Dispute Hold' : 'Keep In Review'}
          compact
        />
        {item.transactionType !== 'seller_payout' && (
          <button
            onClick={() => onRefund({ ...item, depositHoldAction: 'forfeit', status: 'forfeited', refundStatus: 'forfeit', adminNote: 'Buyer default confirmed. Deposit hold forfeited after review.' })}
            className="mt-3 w-full rounded-lg border border-amber-500/40 bg-amber-500/10 py-3 text-sm font-black text-amber-200 hover:bg-amber-500/20"
          >
            Forfeit Buyer Deposit
          </button>
        )}
      </article>
    ))}
  </div>
);

const BankPartnerQueue = ({ items, onApprove, onReject }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {items.map((item) => (
      <article key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 font-black uppercase">{item.institutionType || 'bank partner'}</p>
            <h2 className="text-xl font-black mt-1">{item.name}</h2>
            <p className="text-sm text-slate-400 mt-2">{item.legalAgreementRef || item.termsUrl || 'Legal agreement, representative, and terms must be checked before public bank auctions.'}</p>
          </div>
          <StatusBadge status={item.publicEnabled ? 'public enabled' : item.status || 'pending'} />
        </div>
        <DecisionPanel onApprove={() => onApprove(item.id)} onReject={() => onReject(item.id)} onEscalate={() => onReject(item.id)} approve="Verify Partner" reject="Reject" escalate="Keep Private" compact />
      </article>
    ))}
  </div>
);

const SuggestionQueue = ({ items, onPlan, onReject }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {items.map((item) => (
      <article key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-xs text-emerald-400 font-black uppercase">{item.module} - {item.userPriority || 'medium'}</p>
        <h2 className="text-xl font-black mt-1">{item.title}</h2>
        <p className="text-sm text-slate-400 mt-2">{item.problemSolved || item.description || 'No problem statement yet.'}</p>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={() => onPlan(item.id)} className="bg-green-500 text-slate-950 rounded-lg py-3 font-black">Mark Planned</button>
          <button onClick={() => onReject(item.id)} className="border border-zinc-700 text-slate-200 rounded-lg py-3 font-black">Reject</button>
        </div>
      </article>
    ))}
  </div>
);

const GenericQueue = ({ items, primary, secondary, meta }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {items.map((item) => (
      <article key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 font-black uppercase">{item[secondary] || 'queue item'}</p>
            <h2 className="text-xl font-black mt-1">{item[primary] || item.id}</h2>
            <p className="text-sm text-slate-400 mt-2">{item[meta] || 'No detail provided.'}</p>
          </div>
          <StatusBadge status={item.status || item.severity || 'Open'} />
        </div>
      </article>
    ))}
  </div>
);

const DisputeQueue = ({ items, onResolve, onEscalate }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {items.map((item) => (
      <article key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 font-black uppercase">{item.severity || item.owner || 'dispute'}</p>
            <h2 className="text-xl font-black mt-1">{item.title || item.reason || item.id}</h2>
            <p className="text-sm text-slate-400 mt-2">{item.reason || item.next || item.resolutionNote || 'Review buyer claim, payment evidence, and handover notes.'}</p>
          </div>
          <StatusBadge status={item.status || 'open'} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Mini label="Opened by" value={item.buyer?.fullName || item.buyer?.email || item.owner || item.openedBy || 'Member'} />
          <Mini label="Auction" value={item.auctionId || item.checkout?.auctionId || 'Manual'} />
        </div>
        <DecisionPanel onApprove={() => onResolve(item.id)} onReject={() => onEscalate(item.id)} onEscalate={() => onEscalate(item.id)} approve="Resolve Dispute" reject="Escalate" escalate="Need Manual Review" compact />
      </article>
    ))}
  </div>
);

const AuditQueue = ({ items }) => (
  <div className="space-y-3">
    {items.map((item) => (
      <article key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-[220px_1fr_180px] gap-3">
        <p className="font-black text-slate-200">{item.action}</p>
        <p className="text-sm text-slate-400">{item.entityType} / {item.entityId}</p>
        <p className="text-xs text-zinc-500 font-black text-right">{item.createdAt}</p>
      </article>
    ))}
  </div>
);

const AccessoryModeration = ({ items }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    {items.map((item) => (
      <article key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-xs text-emerald-400 font-black uppercase">{item.category}</p>
        <h2 className="text-xl font-black mt-1">{item.name}</h2>
        <p className="text-sm text-slate-400 mt-2">{item.fitmentType} - {item.condition} - stock {item.stock}</p>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <button className="bg-green-500 text-slate-950 rounded-lg py-3 font-black">Approve</button>
          <button className="bg-red-600 text-white rounded-lg py-3 font-black">Reject</button>
          <button className="border border-zinc-700 text-slate-200 rounded-lg py-3 font-black">Edit</button>
        </div>
      </article>
    ))}
  </div>
);

const OrderOpsQueue = ({ orders, onAction }) => {
  const visibleOrders = orders.length ? orders : [{
    id: 'demo-order-ops',
    title: 'No live accessory orders yet',
    status: 'Clear',
    deliveryMethod: 'Orders will appear here',
    next: 'Create an accessory order from the cart to test seller/admin workflow.',
    amount: 0,
    items: [],
  }];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {visibleOrders.map((order) => (
        <article key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-500 font-black uppercase">{order.deliveryMethod || order.orderType || 'order'}</p>
              <h2 className="text-xl font-black mt-1">{order.title || order.id}</h2>
              <p className="text-sm text-slate-400 mt-2">{order.next || order.statusNote || 'Review payment, delivery/pickup, and dispute state.'}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button onClick={() => onAction(order.id, 'Admin approved handoff', 'Admin cleared seller/buyer handoff.')} className="bg-green-500 text-slate-950 rounded-lg py-3 font-black">Approve Handoff</button>
            <button onClick={() => onAction(order.id, 'Disputed', 'Admin opened a dispute case for review.')} className="bg-red-600 text-white rounded-lg py-3 font-black">Open Dispute</button>
          </div>
        </article>
      ))}
    </div>
  );
};

const DecisionPanel = ({ onApprove, onReject, onEscalate, approve = 'Approve', reject = 'Reject', escalate = 'Escalate', compact = false }) => (
  <div className={`grid gap-3 ${compact ? 'grid-cols-3 mt-5' : 'bg-zinc-950 border border-zinc-800 rounded-xl p-4'}`}>
    {!compact && <h3 className="font-black">Admin decision</h3>}
    <button onClick={onApprove} className="bg-green-500 text-slate-950 font-black py-3 rounded-lg hover:bg-green-400">{approve}</button>
    <button onClick={onReject} className="bg-red-600 text-white font-black py-3 rounded-lg hover:bg-red-500">{reject}</button>
    <button onClick={onEscalate} className="border border-zinc-700 text-slate-200 font-black py-3 rounded-lg hover:bg-zinc-900">{escalate}</button>
  </div>
);

const QueuePreview = ({ title, items }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
    <h2 className="font-black text-xl">{title}</h2>
    <div className="mt-4 space-y-3">
      {items.slice(0, 3).map((item) => (
        <div key={item.id} className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
          <p className="font-black">{item.userName || item.name || item.title || item.fileName || item.id}</p>
          <p className="text-xs text-slate-500 mt-1">{item.status || item.provider || item.documentType || 'pending'}</p>
        </div>
      ))}
    </div>
  </div>
);

const PolicyCard = ({ title, text }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
    <h2 className="font-black text-xl">{title}</h2>
    <p className="text-sm text-slate-400 mt-2">{text}</p>
  </div>
);

const Stat = ({ label, value, tone = 'neutral' }) => (
  <div className={`border rounded-xl p-5 ${tone === 'danger' ? 'bg-red-950/40 border-red-900' : tone === 'good' ? 'bg-emerald-950/40 border-emerald-900' : 'bg-zinc-900 border-zinc-800'}`}>
    <p className="text-xs text-zinc-500 uppercase tracking-wider font-black">{label}</p>
    <p className="text-3xl font-black mt-1">{value}</p>
  </div>
);

const EmptyQueue = () => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
    <h2 className="text-2xl font-black">No submissions waiting.</h2>
    <p className="text-slate-400 mt-2">Seller submissions will appear here for approval.</p>
    <Link to="/sell/listing" className="inline-block mt-5 bg-red-600 text-white px-5 py-3 rounded-lg font-bold">
      Create Test Submission
    </Link>
  </div>
);

const StatusBadge = ({ status }) => (
  <span className="bg-zinc-800 text-slate-200 rounded-full px-3 py-1 text-xs font-black whitespace-nowrap">{String(status || 'pending').replaceAll('_', ' ')}</span>
);

const Badge = ({ children }) => (
  <span className="bg-zinc-800 text-slate-200 px-3 py-1 rounded-full text-xs font-black">{children}</span>
);

const Mini = ({ label, value }) => (
  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
    <p className="text-[10px] text-zinc-500 font-black uppercase">{label}</p>
    <p className="text-sm font-black truncate">{value}</p>
  </div>
);

const normalizeKyc = (items) => items.map((item) => ({
  ...item,
  userName: item.userName || item.user?.fullName || item.user?.email || item.userId || 'User',
  levelRequested: item.levelRequested || item.verificationLevel || item.status || 'kyc_verified',
  consentTextVersion: item.consentTextVersion || item.profile?.consentTextVersion || 'kyc-consent-v1',
  consentAcceptedAt: item.consentAcceptedAt || item.profile?.consentAcceptedAt || null,
  provider: item.provider || item.profile?.provider || 'manual_review',
}));

const normalizeDocuments = (items) => items.map((item) => ({
  ...item,
  userName: item.userName || item.user?.fullName || item.user?.email || item.userId || 'User',
  fileName: item.fileName || item.originalName || item.mediaAssetId || item.id,
}));

const normalizePayments = (items) => items.map((item) => ({
  ...item,
  userName: item.userName || item.user?.fullName || item.user?.email || item.userId || 'Payment user',
  reference: item.reference || item.providerReference || item.id,
  paymentMethodLabel: item.paymentMethod?.label || item.metadata?.paymentMethodLabel || null,
  providerMode: item.paymentMethod?.providerMode || item.metadata?.providerMode || null,
}));

const buildStats = (queues, submissions, reportedPosts, accessories) => [
  { label: 'Listings', value: submissions.filter((item) => item.status === 'Pending Review').length },
  { label: 'KYC', value: queues.kyc.length, tone: queues.kyc.length ? 'danger' : 'good' },
  { label: 'Documents', value: queues.documents.length, tone: queues.documents.length ? 'danger' : 'good' },
  { label: 'Payments', value: queues.payments.length },
  { label: 'Bank Partners', value: queues.partners.filter((item) => item.status === 'verified').length },
  { label: 'Suggestions', value: queues.suggestions.length },
  { label: 'Reports', value: reportedPosts.length },
  { label: 'Accessories', value: accessories.length },
];

const fallbackFraud = () => [
  { id: 'fraud-preview-1', signal: 'Repeated bid attempts', severity: 'Medium', entity: 'auction-fortuner', action: 'Review bidder overlap and deposit source.' },
  { id: 'fraud-preview-2', signal: 'Duplicate photo pattern', severity: 'Low', entity: 'seller submission', action: 'Ask seller for fresh walkaround media.' },
];

export default AdminDashboard;
