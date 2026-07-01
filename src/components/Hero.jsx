import React from 'react';
import { useNavigate } from 'react-router-dom';
import heroImage from './car.png'; 

const Hero = () => {
  const navigate = useNavigate();

  return (
    // Hero Container
    <section
      className="w-full min-h-fit flex flex-col items-center justify-center pt-20 pb-0 px-4 bg-slate-50 relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      
      {/* Hero Heading */}
      <h1
        id="hero-heading"
        className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-6 text-center tracking-tight z-20 max-w-4xl"
      >
        Find Your Dream Car
      </h1>

      {/* Search Section */}
      <form
        role="search"
        aria-label="Car search"
        className="relative z-20 bg-white p-2 rounded-2xl shadow-xl flex flex-col md:flex-row items-center w-full max-w-5xl border border-slate-100 divide-y md:divide-y-0 md:divide-x divide-slate-100 transition-all duration-300"
        onSubmit={(e) => {
          e.preventDefault();
          navigate('/listings');
        }}
      >
        
        {/* Car Type */}
        <div className="w-full md:w-auto flex-1 p-2">
          <label
            htmlFor="car-type"
            className="block text-[10px] font-bold text-slate-400 uppercase md:hidden mb-1"
          >
            Type
          </label>
          <select
            id="car-type"
            className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
          >
            <option>Used Cars</option>
            <option>New Cars</option>
          </select>
        </div>

        {/* Make */}
        <div className="w-full md:w-auto flex-1 p-2">
          <label
            htmlFor="car-make"
            className="block text-[10px] font-bold text-slate-400 uppercase md:hidden mb-1"
          >
            Make
          </label>
          <select
            id="car-make"
            className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
          >
            <option>Any Makes</option>
            <option>Toyota</option>
            <option>Honda</option>
            <option>Hyundai</option>
            <option>BMW</option>
          </select>
        </div>

        {/* Model */}
        <div className="w-full md:w-auto flex-1 p-2">
          <label
            htmlFor="car-model"
            className="block text-[10px] font-bold text-slate-400 uppercase md:hidden mb-1"
          >
            Model
          </label>
          <select
            id="car-model"
            className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
          >
            <option>Any Models</option>
            <option>Civic</option>
            <option>Sonata</option>
            <option>Land Cruiser</option>
          </select>
        </div>

        {/* Price */}
        <div className="w-full md:w-auto flex-1 p-2">
          <label
            htmlFor="car-price"
            className="block text-[10px] font-bold text-slate-400 uppercase md:hidden mb-1"
          >
            Price
          </label>
          <select
            id="car-price"
            className="w-full text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
          >
            <option>All Prices</option>
            <option>Under 20 Lakh</option>
            <option>20 - 50 Lakh</option>
            <option>Above 50 Lakh</option>
          </select>
        </div>

        {/* Actions */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 p-1 md:pl-3">
          <button 
            type="submit"
            aria-label="Search cars"
            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-bold whitespace-nowrap text-sm shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
          >
            Search
          </button>

          <button 
            type="button"
            aria-label="Go to auction section"
            onClick={() =>
              document
                .getElementById('auction-section')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
            className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all font-bold whitespace-nowrap text-sm shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
          >
            Auction
          </button>

          <button
            type="button"
            aria-label="Shop accessories"
            onClick={() => navigate('/accessories')}
            className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all font-bold whitespace-nowrap text-sm shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
          >
            Accessories
          </button>
        </div>

      </form>

      {/* Hero Image */}
      <div className="relative z-0 mt-4 md:-mt-8 lg:-mt-32 w-full max-w-4xl flex justify-center transition-all duration-500">
        <img 
          src={heroImage} 
          alt="Silver sedan displayed on car marketplace homepage"
          className="w-full h-auto object-contain drop-shadow-xl"
          loading="eager"
        />
      </div>

    </section>
  );
};

export default Hero;
