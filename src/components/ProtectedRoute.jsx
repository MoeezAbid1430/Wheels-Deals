import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, LockKeyhole, ArrowLeftRight } from 'lucide-react';
import { useAuctions } from '../context/AuctionContext';

const roleLabels = {
  buyer: 'buyer',
  seller: 'seller',
  dealer: 'dealer',
  writer: 'writer',
  verified_writer: 'verified writer',
  editor: 'editor',
  moderator: 'moderator',
  admin: 'admin',
  super_admin: 'super admin',
};

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  title = 'Sign in required',
  description = 'This part of the platform is only available after you sign in.',
}) => {
  const location = useLocation();
  const { authReady, authUser, hasRole } = useAuctions();

  if (!authReady) {
    return (
      <main className="min-h-[60vh] bg-slate-50 flex items-center justify-center px-4 py-12">
        <section className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <ArrowLeftRight className="mx-auto h-10 w-10 text-blue-600" />
          <h1 className="mt-4 text-2xl font-black text-slate-900">Checking your session</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            We are confirming your account and access level before opening this screen.
          </p>
        </section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          reason: title,
          description,
        }}
      />
    );
  }

  if (allowedRoles.length && !hasRole(...allowedRoles)) {
    return (
      <main className="min-h-[60vh] bg-slate-50 flex items-center justify-center px-4 py-12">
        <section className="max-w-xl w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-50 p-3">
              <ShieldAlert className="h-7 w-7 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Access blocked</p>
              <h1 className="text-2xl font-black text-slate-900">{title}</h1>
            </div>
          </div>

          <p className="mt-4 text-sm font-bold text-slate-600">{description}</p>
          <p className="mt-2 text-sm font-bold text-slate-500">
            This screen is currently limited to {allowedRoles.map((role) => roleLabels[role] || role).join(', ')} accounts.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link to="/" className="rounded-xl border border-slate-200 px-4 py-3 text-center font-black text-slate-700 hover:bg-slate-50">
              Back to home
            </Link>
            <Link to="/settings" className="rounded-xl bg-slate-900 px-4 py-3 text-center font-black text-white hover:bg-slate-800">
              Review account access
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 text-blue-700" />
              <p className="text-sm font-bold text-blue-900">
                Your current account is signed in, but this route expects a stronger role or trust state.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return children;
};

export default ProtectedRoute;
