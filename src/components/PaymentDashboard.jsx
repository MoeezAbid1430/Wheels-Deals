import React, { useState } from 'react';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const PaymentDashboard = () => {
  const { wallet, availableWallet, lockedDepositTotal, activeDepositLocks, deposit, withdraw, resetDemoState, backendStatus, authUser } = useAuctions();
  const [amount, setAmount] = useState(250000);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runWalletAction = async (action) => {
    setIsSubmitting(true);
    const result = await action(Number(amount));
    setIsSubmitting(false);
    setMessage(result.message);
  };

  return (
    <div className="bg-white min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Wallet</h1>
          <p className="text-slate-500 mt-2 text-lg">Manage demo deposits used to qualify for auction bidding.</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#34D399] rounded-full opacity-20 blur-3xl" />

          <div className="relative z-10">
            <p className="text-slate-400 font-medium mb-1 uppercase tracking-wider text-sm">Available Demo Deposit</p>
            <h2 className="text-5xl font-black mb-2">{formatPkr(availableWallet)}</h2>
            <p className="text-sm text-slate-300 mb-8">
              Total balance {formatPkr(wallet.balance)} - locked in auctions {formatPkr(lockedDepositTotal)}
            </p>
            <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-bold ${backendStatus.available && authUser ? 'bg-green-400/15 text-green-100' : 'bg-amber-400/15 text-amber-100'}`}>
              {backendStatus.available && authUser ? 'Backend wallet ledger connected.' : 'Using local wallet mode until backend login is active.'}
            </p>
            <p className="mb-4 rounded-lg px-3 py-2 text-sm font-bold bg-red-400/15 text-red-100">
              Banking is not live yet. Do not treat demo deposits as real money until a payment/KYC provider is connected.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
              <label className="block">
                <span className="sr-only">Wallet amount in PKR</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full bg-white text-slate-900 px-4 py-3 rounded-lg font-bold outline-none"
                  placeholder="Amount in PKR"
                />
              </label>
              <button
                onClick={() => runWalletAction(deposit)}
                disabled={isSubmitting}
                className="bg-[#34D399] disabled:bg-slate-400 hover:bg-[#2cb682] text-slate-900 px-6 py-3 rounded-lg font-bold transition-all active:scale-95"
              >
                {isSubmitting ? 'Working...' : 'Deposit'}
              </button>
              <button
                onClick={() => runWalletAction(withdraw)}
                disabled={isSubmitting}
                className="bg-slate-700 disabled:bg-slate-500 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold transition-all active:scale-95"
              >
                Withdraw
              </button>
            </div>

            {message && <p role="status" aria-live="polite" className="mt-4 bg-white/10 border border-white/10 rounded-lg p-3 text-sm font-semibold">{message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <WalletRule title="Bid eligibility" text="A bid requires a demo deposit equal to 5% of the bid or PKR 100,000 minimum." />
          <WalletRule title="No full charge" text="The demo does not deduct the full bid amount. It records bid verification only." />
          <WalletRule title="Reset anytime" text="Clear wallet and auction demo state when testing edge cases." />
        </div>

        {activeDepositLocks.length > 0 && (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 mb-10">
            <h3 className="text-xl font-bold text-slate-900 mb-5">Active Auction Deposit Holds</h3>
            <div className="space-y-3">
              {activeDepositLocks.map((lock) => (
                <div key={lock.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div>
                    <p className="font-bold text-slate-800">{lock.reason}</p>
                    <p className="text-xs text-slate-500">{lock.createdAt} - {lock.status}</p>
                  </div>
                  <p className="font-black text-amber-600">{formatPkr(lock.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h3 className="text-xl font-bold text-slate-900">Recent Transactions</h3>
            <button onClick={resetDemoState} className="text-red-600 font-bold hover:underline text-sm">
              Reset Demo State
            </button>
          </div>

          <div className="space-y-4">
            {wallet.transactions.length > 0 ? (
              wallet.transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">{transaction.type}</p>
                    <p className="text-xs text-slate-500">{transaction.note} - {transaction.time}</p>
                  </div>
                  <p className={`font-bold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {transaction.amount === 0 ? 'Verified' : formatPkr(transaction.amount)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No transactions yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const WalletRule = ({ title, text }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
    <h2 className="font-black text-slate-900">{title}</h2>
    <p className="text-sm text-slate-500 mt-2">{text}</p>
  </div>
);

export default PaymentDashboard;
