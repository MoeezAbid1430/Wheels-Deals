import React from 'react';
import { Link } from 'react-router-dom';
import { formatPkr } from '../data/cars';
import { useAuctions } from '../context/AuctionContext';

const AuctionCarousel = () => {
  const { liveAuctionCars } = useAuctions();

  return (
    <section id="auction-section" className="w-full max-w-7xl mx-auto px-4 py-8 scroll-mt-24">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 border-l-4 border-red-600 pl-3">
            Live Auctions
          </h2>
          <p className="text-slate-500 mt-2">Auction heat, deal score, and trust signals make bidding smarter.</p>
        </div>
        <Link to="/auctions" className="text-red-600 font-black hover:underline">
          Open auction hub
        </Link>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {liveAuctionCars.map((car) => (
          
          <Link 
            to={`/listing/${car.id}`} 
            key={car.id} 
            className="group bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
          >
            
            {/* Image Area */}
            <div className="relative h-48 bg-slate-100 overflow-hidden">
              <img 
                src={car.images[0]} 
                alt={car.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
              
              <div className="absolute top-2 right-2 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                {car.timeLeft} Left
              </div>

              <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm animate-pulse">
                {car.status.toUpperCase()}
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4 flex flex-col flex-1">
              <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors truncate">
                {car.name}
              </h3>
              
              <p className="text-red-600 font-extrabold text-lg mb-3">{formatPkr(car.highBid)}</p>

              <div className="mt-auto space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span>Engine:</span>
                  <span className="font-semibold text-slate-700">{car.engine}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mileage:</span>
                  <span className="font-semibold text-slate-700">{car.mileage}</span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="font-semibold text-slate-700">{car.city}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deal Score:</span>
                  <span className="font-semibold text-slate-700">{car.dealScore}</span>
                </div>
              </div>

              <div className="w-full mt-4 bg-slate-900 text-white text-center text-xs font-bold py-2 rounded group-hover:bg-blue-600 transition-colors">
                Bid Now
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default AuctionCarousel;
