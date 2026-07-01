import React from 'react';
import LogoLoader from './LogoLoader';

export const LoadingBlock = ({ title = 'Loading', text = 'Fetching the latest details...' }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center gap-4">
    <div className="w-24 shrink-0">
      <LogoLoader label={title} />
    </div>
    <div>
      <p className="font-black text-slate-900">{title}</p>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  </div>
);

export const ErrorBanner = ({ title = 'Something needs attention', text }) => (
  <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
    <p className="font-black">{title}</p>
    {text && <p className="text-sm mt-1 font-semibold">{text}</p>}
  </div>
);

export const EmptyBlock = ({ title = 'Nothing here yet', text, action }) => (
  <div className="bg-white border border-dashed border-slate-300 rounded-lg p-6 text-center">
    <p className="font-black text-slate-900">{title}</p>
    {text && <p className="text-sm text-slate-500 mt-1">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
