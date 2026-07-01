import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingBlock } from '../components/StateBlocks';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const AuctionCheckout = () => {
  const { id } = useParams();
  const { api, backendStatus, authUser, getCar, checkoutAuction, releaseDepositLock, wallet, activeDepositLocks } = useAuctions();
  const car = getCar(id);
  const [message, setMessage] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentProviders, setPaymentProviders] = useState([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [checkoutRecord, setCheckoutRecord] = useState(null);
  const [checkoutTransactions, setCheckoutTransactions] = useState([]);
  const [sandboxEvent, setSandboxEvent] = useState('provider_confirmed');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disputeSeverity, setDisputeSeverity] = useState('Medium');

  useEffect(() => {
    let cancelled = false;

    const loadCheckout = async () => {
      if (!backendStatus.available || !authUser || !car?.id) return;
      setIsLoading(true);
      try {
        const [checkoutResult, methodsResult, providersResult] = await Promise.all([
          api.checkout.get(car.id),
          api.payments.methods().catch(() => ({ methods: [] })),
          api.payments.providers ? api.payments.providers().catch(() => ({ methods: [] })) : Promise.resolve({ methods: [] }),
        ]);
        if (!cancelled) {
          setCheckoutRecord(checkoutResult?.checkout || null);
          setCheckoutTransactions(checkoutResult?.transactions || []);
          setPaymentMethods(methodsResult?.methods || []);
          setPaymentProviders(providersResult?.methods || []);
          if (methodsResult?.methods?.length) {
            const preferred = methodsResult.methods.find((method) => ['sandbox_ready', 'verified'].includes(method.status)) || methodsResult.methods[0];
            setSelectedPaymentMethodId((current) => current || preferred?.id || '');
            setPaymentMethod(preferred?.provider || 'bank_transfer');
          }
        }
      } catch {
        if (!cancelled) {
          setCheckoutRecord(null);
          setCheckoutTransactions([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadCheckout();
    return () => {
      cancelled = true;
    };
  }, [api, authUser, backendStatus.available, car?.id]);

  if (!car || car.listingType !== 'Auction') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-black text-slate-900">Checkout not available</h1>
          <p className="text-slate-500 mt-2">This room opens only for completed auction listings.</p>
          <Link to="/auctions" className="inline-block mt-5 bg-slate-900 text-white px-5 py-3 rounded-lg font-bold">
            Back to auctions
          </Link>
        </div>
      </main>
    );
  }

  const lock = activeDepositLocks.find((item) => item.carId === car.id);
  const canCheckout = car.status === 'Ended' && car.userIsWinner;
  const paymentProofs = checkoutRecord?.paymentProofs || [];
  const depositHold = checkoutRecord?.depositHold || lock || null;
  const paymentDeadline = checkoutRecord?.paymentDueAt ? new Date(checkoutRecord.paymentDueAt) : null;
  const paymentDeadlineText = paymentDeadline ? paymentDeadline.toLocaleString() : 'Starts after checkout begins';
  const selectedPaymentMethod = paymentMethods.find((method) => String(method.id) === String(selectedPaymentMethodId)) || null;
  const selectedProvider = paymentProviders.find((provider) => provider.id === (selectedPaymentMethod?.provider || paymentMethod)) || null;
  const paymentMethodLabel = selectedPaymentMethod?.label || selectedProvider?.label || humanizePaymentProvider(paymentMethod);
  const winningPaymentTransaction = checkoutTransactions.find((transaction) => transaction.transactionType === 'auction_winning_payment') || null;
  const isSandboxProvider = Boolean(selectedProvider?.sandboxReady || selectedProvider?.mode === 'sandbox');

  const refreshCheckoutState = async () => {
    const refreshed = await api.checkout.get(car.id).catch(() => null);
    if (refreshed?.checkout) setCheckoutRecord(refreshed.checkout);
    if (refreshed?.transactions) setCheckoutTransactions(refreshed.transactions);
  };

  const startCheckout = async () => {
    if (!canCheckout) {
      setMessage('Checkout is locked until the auction ends and your account is the winning bidder.');
      return;
    }
    if (!depositHold) {
      setMessage('A locked auction deposit is required before checkout can begin.');
      return;
    }

    if (!backendStatus.available || !authUser) {
      const result = checkoutAuction(car.id);
      setMessage(result.message);
      return;
    }
    if (!selectedPaymentMethodId) {
      setMessage('Add a sandbox-ready payment method in account settings before starting checkout.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.checkout.start(car.id, {
        paymentMethodId: selectedPaymentMethodId,
        paymentMethod: selectedPaymentMethod?.provider || paymentMethod,
        provider: selectedPaymentMethod?.provider || paymentMethod,
        reference: selectedPaymentMethod?.maskedReference || undefined,
        source: 'buyer_checkout',
      });
      setCheckoutRecord(result.checkout);
      await refreshCheckoutState();
      setMessage('Checkout started. Seller and admin can now review payment and handover progress.');
    } catch (error) {
      setMessage(error.message || 'Unable to start checkout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmPayment = async () => {
    if (!backendStatus.available || !authUser) {
      setMessage('Payment confirmation is staged locally until the backend payment sandbox is connected.');
      return;
    }
    if (!selectedPaymentMethodId) {
      setMessage('Choose a saved sandbox-ready payment method first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.checkout.confirmPayment(car.id, {
        paymentMethodId: selectedPaymentMethodId,
        paymentMethod: selectedPaymentMethod?.provider || paymentMethod,
        provider: selectedPaymentMethod?.provider || paymentMethod,
        reference: selectedPaymentMethod?.maskedReference || undefined,
        amount: car.highBid,
      });
      setCheckoutRecord(result.checkout);
      await refreshCheckoutState();
      setMessage('Payment confirmation sent for admin review.');
    } catch (error) {
      setMessage(error.message || 'Unable to confirm payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const releaseHold = () => {
    const result = releaseDepositLock(car.id);
    setMessage(result.message);
  };

  const uploadProof = async (event) => {
    const file = event.target.files?.[0];
    setProofFile(file || null);
    if (!file) return;

    if (!backendStatus.available || !authUser) {
      setMessage(`Payment proof staged locally: ${file.name}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.checkout.uploadProof(car.id, {
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        paymentMethodId: selectedPaymentMethodId || null,
        paymentMethod: selectedPaymentMethod?.provider || paymentMethod,
      });
      setCheckoutRecord(result.checkout);
      await refreshCheckoutState();
      setMessage('Payment proof uploaded for admin review.');
    } catch (error) {
      setMessage(error.message || 'Unable to upload payment proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDispute = async () => {
    if (!disputeReason.trim()) {
      setMessage('Add dispute details first.');
      return;
    }

    if (!backendStatus.available || !authUser) {
      setMessage(`Dispute draft saved for admin review with ${disputeSeverity.toLowerCase()} priority.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.checkout.openDispute(car.id, {
        severity: disputeSeverity.toLowerCase(),
        reason: disputeReason.trim(),
      });
      setCheckoutRecord(result.checkout);
      await refreshCheckoutState();
      setMessage(`Dispute opened with ${disputeSeverity.toLowerCase()} priority.`);
    } catch (error) {
      setMessage(error.message || 'Unable to open dispute.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const simulateSandboxCallback = async () => {
    if (!backendStatus.available || !authUser) {
      setMessage('Sandbox callback simulation needs the backend session.');
      return;
    }
    if (!winningPaymentTransaction?.id) {
      setMessage('Start checkout or submit payment first so a payment transaction exists.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.payments.simulateCallback({
        transactionId: winningPaymentTransaction.id,
        eventType: sandboxEvent,
        providerReference: winningPaymentTransaction.providerReference,
      });
      await refreshCheckoutState();
      setMessage(`Sandbox provider event applied: ${sandboxEvent.replaceAll('_', ' ')}.`);
    } catch (error) {
      setMessage(error.message || 'Unable to simulate sandbox callback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-green-600">Auction checkout</p>
            <h1 className="text-4xl font-black text-slate-900 mt-1">{car.name}</h1>
            <p className="text-slate-500 mt-2">Winner handoff, deposit hold, seller contact, and transfer checklist.</p>
          </div>
          <Link to={`/listing/${car.id}`} className="bg-white border border-slate-200 text-slate-800 px-5 py-3 rounded-lg font-bold text-center">
            View listing
          </Link>
        </div>

        {!canCheckout && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 font-bold mb-6">
            Checkout is locked until the auction ends and your account is the winning bidder.
          </div>
        )}

        {message && <div className="bg-white border border-slate-200 rounded-lg p-4 font-bold text-slate-700 mb-6">{message}</div>}
        {isLoading && <div className="mb-6"><LoadingBlock title="Loading checkout" text="Refreshing payment proof, dispute, and handoff status from the backend." /></div>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <section className="space-y-4">
            <CheckoutStep
              number="1"
              title="Review winning bid"
              status={car.userIsWinner ? 'Ready' : 'Waiting'}
              text={`Final auction amount is ${formatPkr(car.highBid)}. Reserve status: ${car.reserveStatus}.`}
            />
            <CheckoutStep
              number="2"
              title="Confirm seller handoff"
              status={checkoutRecord?.handoverStatus || (car.checkedOut ? 'Started' : 'Pending')}
              text={`Seller ${car.seller} should confirm inspection slot, vehicle handover location, and document availability.`}
            />
            <CheckoutStep
              number="3"
              title="Settle payment"
              status={checkoutRecord?.paymentStatus || (depositHold ? `Deposit ${depositHold.status}` : 'No active hold')}
              text={`Selected settlement method is ${paymentMethodLabel}. Upload payment proof before admin releases the vehicle handoff.`}
            />
            <CheckoutStep
              number="4"
              title="Transfer documents"
              status={checkoutRecord?.titleTransferStatus || 'Checklist'}
              text="CNIC verification, title transfer, token tax, biometric handoff, and signed delivery note belong here before closing the deal."
            />

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Payment handoff</h2>
                  <p className="text-slate-500 mt-1">Choose a saved settlement method and stage transfer proof for seller/admin review.</p>
                </div>
                <span className="bg-green-50 text-green-700 rounded-full px-3 py-1 text-xs font-black">{paymentProofs.length ? `${paymentProofs.length} proof item${paymentProofs.length > 1 ? 's' : ''}` : 'Proof needed'}</span>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-bold text-slate-500">Deposit hold</span>
                  <span className="font-black text-slate-900">{depositHold ? `${formatPkr(Number(depositHold.amount || 0))} - ${depositHold.status}` : 'No locked deposit found'}</span>
                </div>
                <div className="flex justify-between gap-3 mt-2">
                  <span className="font-bold text-slate-500">Payment deadline</span>
                  <span className="font-black text-slate-900">{paymentDeadlineText}</span>
                </div>
                <p className="mt-2 font-bold text-slate-600">
                  Checkout and payment review now expect a locked buyer deposit before settlement can proceed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                {(backendStatus.available ? paymentMethods : fallbackCheckoutMethods).map((method) => {
                  const selected = backendStatus.available
                    ? String(selectedPaymentMethodId) === String(method.id)
                    : paymentMethod === method.provider;
                  return (
                    <button
                      key={method.id || method.provider}
                      onClick={() => {
                        setPaymentMethod(method.provider);
                        if (backendStatus.available) setSelectedPaymentMethodId(method.id);
                      }}
                      className={`border rounded-lg p-3 text-left ${selected ? 'border-green-600 bg-green-50 text-green-800' : 'border-slate-200 text-slate-700'}`}
                    >
                      <p className="font-black">{method.label || humanizePaymentProvider(method.provider)}</p>
                      <p className="mt-1 text-xs font-bold opacity-80">
                        {backendStatus.available
                          ? `${method.providerLabel || humanizePaymentProvider(method.provider)} - ${method.status}${method.maskedReference ? ` - ${method.maskedReference}` : ''}`
                          : 'Sandbox preview method'}
                      </p>
                    </button>
                  );
                })}
              </div>
              {backendStatus.available && !paymentMethods.length && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                  No sandbox-ready payment methods found for this account yet. Add one in <Link to="/account/settings" className="underline">Account Settings</Link> before buyer checkout can continue.
                </div>
              )}

              {selectedProvider && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Provider path</p>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    {selectedProvider.description || 'Settlement references are stored for admin review and sandbox payment tracing.'}
                  </p>
                </div>
              )}

              {backendStatus.available && isSandboxProvider && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase text-emerald-700">Sandbox callback simulator</p>
                  <p className="mt-2 text-sm font-bold text-emerald-900">
                    Use this to emulate provider-side payment events so checkout can move through real callback-style states during beta testing.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
                    <select value={sandboxEvent} onChange={(event) => setSandboxEvent(event.target.value)} className="w-full rounded-lg border border-emerald-200 bg-white p-3 font-bold outline-none focus:border-emerald-500">
                      <option value="provider_pending">Provider pending</option>
                      <option value="provider_confirmed">Provider confirmed</option>
                      <option value="provider_failed">Provider failed</option>
                      <option value="refund_pending">Refund pending</option>
                      <option value="refund_confirmed">Refund confirmed</option>
                    </select>
                    <button onClick={simulateSandboxCallback} disabled={isSubmitting || !winningPaymentTransaction?.id} className="rounded-lg bg-emerald-600 px-4 py-3 font-black text-white disabled:bg-emerald-200 disabled:text-emerald-700">
                      Simulate Callback
                    </button>
                  </div>
                </div>
              )}

              <label className="block mt-4 border border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:border-green-500">
                <span className="text-xs font-black uppercase text-slate-400">Payment receipt / bank proof</span>
                <span className="block mt-1 font-bold text-slate-700">{proofFile?.name || 'Upload receipt image or PDF'}</span>
                <input type="file" accept="image/*,.pdf" onChange={uploadProof} className="hidden" />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <button onClick={confirmPayment} disabled={isSubmitting} className="rounded-lg bg-green-600 text-white font-black py-3 disabled:bg-slate-300">
                  {isSubmitting ? 'Submitting...' : 'Confirm Payment'}
                </button>
                <button onClick={startCheckout} disabled={isSubmitting || !canCheckout || !depositHold} className="rounded-lg border border-slate-300 text-slate-800 font-black py-3 disabled:text-slate-400 disabled:border-slate-200">
                  {checkoutRecord ? 'Refresh Checkout' : 'Start Checkout'}
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Dispute center</h2>
                  <p className="text-slate-500 mt-1">Use this if payment, handover, inspection, or documents do not match the auction terms.</p>
                </div>
                <span className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs font-black">{checkoutRecord?.status === 'disputed' ? 'Dispute open' : `Draft - ${disputeSeverity}`}</span>
              </div>
              <select value={disputeSeverity} onChange={(event) => setDisputeSeverity(event.target.value)} className="mt-4 w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-red-500 bg-white">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent handoff blocked</option>
              </select>
              <textarea value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} rows="3" className="mt-4 w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-red-500" placeholder="Describe the issue for admin review..." />
              <button onClick={openDispute} disabled={isSubmitting} className="mt-3 border border-red-200 text-red-700 rounded-lg px-4 py-2 font-black hover:bg-red-50 disabled:text-slate-400 disabled:border-slate-200">
                {isSubmitting ? 'Submitting...' : 'Open Dispute'}
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Settlement timeline</h2>
                  <p className="text-slate-500 mt-1">See how buyer payment and seller payout are moving through review.</p>
                </div>
                <span className="bg-slate-100 text-slate-700 rounded-full px-3 py-1 text-xs font-black">{checkoutTransactions.length} transaction{checkoutTransactions.length === 1 ? '' : 's'}</span>
              </div>
              <div className="mt-4 space-y-3">
                {checkoutTransactions.length ? checkoutTransactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-400">{String(transaction.transactionType || 'payment').replaceAll('_', ' ')}</p>
                        <p className="font-black text-slate-900 mt-1">{formatPkr(Number(transaction.amount || 0))}</p>
                        <p className="text-sm text-slate-500 mt-1">{transaction.paymentMethod?.label || transaction.metadata?.paymentMethodLabel || humanizePaymentProvider(transaction.provider)} - {transaction.status}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 border border-slate-200">{transaction.refundStatus || 'normal flow'}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">{transaction.adminNote || transaction.providerReference || 'Waiting for admin or settlement action.'}</p>
                    {transaction.reconciliationStatus || transaction.providerCallbackStatus ? (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <SummaryRow label="Reconciliation" value={transaction.reconciliationStatus || 'not set'} />
                        <SummaryRow label="Callback" value={transaction.providerCallbackStatus || 'not received'} />
                      </div>
                    ) : null}
                    {transaction.paymentMethod?.providerMode || transaction.metadata?.providerMode ? (
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        Mode: {transaction.paymentMethod?.providerMode || transaction.metadata?.providerMode}
                      </p>
                    ) : null}
                  </div>
                )) : (
                  <p className="text-sm font-bold text-slate-500">No settlement transactions yet. Starting checkout will create the buyer payment record.</p>
                )}
              </div>
            </div>
          </section>

          <aside className="bg-white border border-slate-200 rounded-lg p-6 h-fit">
            <p className="text-xs font-black uppercase text-slate-400">Checkout summary</p>
            <h2 className="text-3xl font-black text-slate-900 mt-2">{formatPkr(car.highBid)}</h2>
            <div className="mt-5 space-y-3 text-sm">
              <SummaryRow label="Auction status" value={car.outcomeLabel} />
              <SummaryRow label="Wallet balance" value={formatPkr(wallet.balance)} />
              <SummaryRow label="Deposit hold" value={depositHold ? `${formatPkr(Number(depositHold.amount || 0))} - ${depositHold.status}` : 'None'} />
              <SummaryRow label="Checkout" value={checkoutRecord?.status || (car.checkedOut ? 'Started' : 'Not started')} />
              <SummaryRow label="Payment" value={checkoutRecord?.paymentStatus || 'Pending'} />
              <SummaryRow label="Method" value={paymentMethodLabel} />
              <SummaryRow label="Deadline" value={paymentDeadlineText} />
            </div>
            <button
              disabled={!canCheckout || isSubmitting}
              onClick={startCheckout}
              className="w-full mt-6 bg-green-600 disabled:bg-slate-300 text-white font-bold py-3 rounded hover:bg-green-700"
            >
              {checkoutRecord ? 'Checkout Active' : 'Start Checkout'}
            </button>
            {lock && (
              <button onClick={releaseHold} className="w-full mt-3 border border-slate-300 text-slate-800 font-bold py-3 rounded hover:bg-slate-50">
                Release Deposit Hold
              </button>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
};

const CheckoutStep = ({ number, title, status, text }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-5 flex gap-4">
    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black flex-shrink-0">{number}</div>
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        <span className="bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs font-black">{status}</span>
      </div>
      <p className="text-slate-500 mt-2">{text}</p>
    </div>
  </div>
);

const SummaryRow = ({ label, value }) => (
  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
    <span className="text-slate-500 font-bold">{label}</span>
    <span className="text-slate-900 font-black text-right">{value}</span>
  </div>
);

const fallbackCheckoutMethods = [
  { id: 'demo-bank-transfer', provider: 'bank_transfer', label: 'Bank transfer / IBFT' },
  { id: 'demo-manual-confirmation', provider: 'manual_confirmation', label: 'Manual confirmation' },
  { id: 'demo-easypaisa', provider: 'easypaisa', label: 'Easypaisa sandbox' },
];

const humanizePaymentProvider = (value) => String(value || 'manual_confirmation').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default AuctionCheckout;
