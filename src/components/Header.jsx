import React from 'react';
import brandLogo from '../assets/wheels-and-deals-logo-cropped.jpeg';

const Header = () => {
  return (
    <div className="flex justify-between items-center py-4 px-8 shadow-sm bg-white sticky top-0 z-50">
      
      <div className="flex items-center gap-3 cursor-pointer">
        <span className="h-20 w-56 overflow-hidden flex items-center bg-white" aria-hidden="true">
          <img src={brandLogo} alt="" className="w-full h-full object-contain object-left" />
        </span>
        <span className="sr-only">Wheels&Deals</span>
      </div>

      {/* Navigation Links */}
      <ul className="hidden md:flex gap-8 font-medium text-gray-600">
        <li className="hover:text-blue-600 cursor-pointer transition">Home</li>
        <li className="hover:text-blue-600 cursor-pointer transition">Listings</li>
        <li className="hover:text-blue-600 cursor-pointer transition">About</li>
        <li className="hover:text-blue-600 cursor-pointer transition">Contact</li>
      </ul>

      {/* Auth Buttons */}
      <div className="flex items-center gap-4">
        <button className="font-medium text-gray-700 hover:text-blue-600 transition">Sign in</button>
        <button className="border border-blue-600 text-blue-600 px-5 py-2 rounded-full font-medium hover:bg-blue-600 hover:text-white transition">
          Submit Listing
        </button>
      </div>
    </div>
  );
};

export default Header;
