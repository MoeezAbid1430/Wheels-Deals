import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';

const InspectionReport = () => {
  const { id } = useParams();
  const { getCar } = useAuctions();
  const car = getCar(id);

  if (!car) {
    return <main className="p-10 font-black">Inspection report not found.</main>;
  }

  const sections = [
    { label: 'Exterior', score: car.inspectionScore || 72, note: car.knownFlaws?.[0] || 'No major exterior flaws reported.' },
    { label: 'Interior', score: Math.max(65, (car.inspectionScore || 80) - 3), note: 'Interior condition consistent with mileage.' },
    { label: 'Mechanical', score: Math.max(65, (car.inspectionScore || 80) - 1), note: car.serviceHistory?.[0] || 'Service history pending.' },
    { label: 'Documentation', score: car.titleStatus?.includes('Clean') ? 92 : 70, note: car.titleStatus || 'Title review pending.' },
  ];

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="max-w-5xl mx-auto px-4 py-10">
        <Link to={`/listing/${car.id}`} className="text-blue-600 font-bold hover:underline">Back to listing</Link>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mt-4">
          <p className="text-green-600 font-black text-xs uppercase tracking-[0.3em]">Inspection report</p>
          <h1 className="text-4xl font-black text-slate-900 mt-2">{car.name}</h1>
          <p className="text-slate-500 mt-2">Demo inspection summary for buyer confidence and admin review.</p>
          <div className="mt-6 bg-slate-900 text-white rounded-xl p-6">
            <p className="text-slate-400 text-sm uppercase font-black">Overall inspection score</p>
            <p className="text-5xl font-black mt-2">{car.inspectionScore || 0}/100</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {sections.map((section) => (
            <article key={section.label} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">{section.label}</h2>
                <span className="font-black text-green-600">{section.score}/100</span>
              </div>
              <div className="bg-slate-100 rounded-full h-2 overflow-hidden my-4">
                <div className="bg-green-500 h-full" style={{ width: `${section.score}%` }} />
              </div>
              <p className="text-slate-600">{section.note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default InspectionReport;
