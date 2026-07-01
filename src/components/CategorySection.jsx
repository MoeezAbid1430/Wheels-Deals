import React from 'react';

// Using lowercase imports to match your file system
import SUV from './icon/suv.png'; 
import Sedan from './icon/sedan.png';
import Hatchback from './icon/Hatchback.png'; // Check if this file is lowercase or capitalized on your disk
import Coupe from './icon/couple.png'; 
import Hybrid from './icon/hybrid.png';
import Convertible from './icon/convertible.png';
import Van from './icon/van.png';
import Truck from './icon/truck.png';
import Electric from './icon/electric.png';

const CategorySection = () => {
  
  const categories = [
    { id: 1, name: 'SUV', icon: SUV },
    { id: 2, name: 'Sedan', icon: Sedan },
    { id: 3, name: 'Hatchback', icon: Hatchback },
    { id: 4, name: 'Coupe', icon: Coupe },
    { id: 5, name: 'Hybrid', icon: Hybrid },
    { id: 6, name: 'Convertible', icon: Convertible },
    { id: 7, name: 'Van', icon: Van },
    { id: 8, name: 'Truck', icon: Truck },
    { id: 9, name: 'Electric', icon: Electric },
  ];

  return (
    <div className="mt-20 mb-20 px-4 md:px-20">
      <h2 className="text-3xl font-bold text-center mb-10 font-outfit">Browse by Type</h2>
      
      {/* FIXED: grid-cols-9 ensures they stay in one line on large screens */}
      <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-4">
        {categories.map((item) => (
          <div key={item.id} className="border rounded-xl p-3 flex flex-col items-center justify-center hover:shadow-lg cursor-pointer transition-all bg-white hover:text-blue-600 min-w-[100px]">
            {item.icon ? (
              <img src={item.icon} alt={item.name} className="w-10 h-8 object-contain mb-2" />
            ) : (
              <div className="w-10 h-8 bg-gray-200 rounded mb-2"></div>
            )}
            <span className="font-medium text-xs md:text-sm truncate">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategorySection;