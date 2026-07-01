import React from 'react';
import { useNavigate } from 'react-router-dom';

const InfoSection = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* --- LEFT CARD: Looking for a Car --- */}
      <div className="bg-blue-50 rounded-[30px] p-8 md:p-12 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
            Are You Looking <br /> For a Car?
          </h2>
          <p className="text-slate-500 font-medium text-lg max-w-sm mb-8">
            We are committed to providing our customers with exceptional service.
          </p>
        </div>

        <div className="flex items-end justify-between mt-auto">
          <button 
            onClick={() => navigate('/listings')} 
            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 text-lg"
          >
            Get Started
          </button>
          
          {/* Truck Icon (SVG) */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-blue-600 opacity-90 transform translate-x-4 translate-y-4">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.8 0-1.6.3-2.1.9l-1.1 1.5c-.5.6-.8 1.4-.8 2.2v4.7c0 .8.6 1.5 1.4 1.7" />
            <path d="M7 17h.01" />
            <path d="M17 17h.01" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
            <path d="M5 13h10" />
            <path d="M12 5L12 13" />
          </svg>
        </div>
      </div>

      {/* --- RIGHT CARD: Sell a Car --- */}
      <div className="bg-pink-50 rounded-[30px] p-8 md:p-12 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
            Do You Want to <br /> Sell a Car?
          </h2>
          <p className="text-slate-500 font-medium text-lg max-w-sm mb-8">
            We are committed to providing our customers with exceptional service.
          </p>
        </div>

        <div className="flex items-end justify-between mt-auto">
          <button 
            onClick={() => navigate('/sell/listing')} 
            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95 text-lg"
          >
            Get Started
          </button>

          {/* Money/Dollar Icon (SVG) */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-pink-500 opacity-90 transform translate-x-2 translate-y-2">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path d="M12 6v12" strokeWidth="2" />
            <path d="M15 9.5c0-1.5-1.5-2.5-3-2.5s-3 1-3 2.5 1.5 2.5 3 2.5 3 1 3 2.5-1.5 2.5-3 2.5s-3-1-3-2.5" strokeWidth="2" />
          </svg>
        </div>
      </div>

    </div>
  );
};

export default InfoSection;
