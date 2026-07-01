import React, { useState } from 'react';

// --- IMPORTS: Car Body Type Icons ---
import suvIcon from './icon/suv.png';
import sedanIcon from './icon/sedan.png';
import hatchbackIcon from './icon/Hatchback.png'; 
import coupeIcon from './icon/couple.png';        
import hybridIcon from './icon/hybrid.png';
import convertibleIcon from './icon/convertible.png';
import vanIcon from './icon/van.png';
import truckIcon from './icon/truck.png';
import electricIcon from './icon/electric.png';

const BrowseByType = () => {
  const [activeCategory, setActiveCategory] = useState('Body Type');

  const categories = ['City', 'Make', 'Model', 'Budget', 'Body Type'];

  // Data for "Body Type" mapped to your imported images
  const bodyTypes = [
    { name: 'SUV', icon: suvIcon },
    { name: 'Sedan', icon: sedanIcon },
    { name: 'Hatchback', icon: hatchbackIcon },
    { name: 'Coupe', icon: coupeIcon },
    { name: 'Hybrid', icon: hybridIcon },
    { name: 'Convertible', icon: convertibleIcon },
    { name: 'Van', icon: vanIcon },
    { name: 'Truck', icon: truckIcon },
    { name: 'Electric', icon: electricIcon },
  ];

  // Dummy data for other text-based categories
  const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];
  const makes = ['Toyota', 'Honda', 'Suzuki', 'Hyundai', 'KIA', 'BMW', 'Mercedes', 'Audi'];
  const models = ['Corolla', 'Civic', 'City', 'Alto', 'Sportage', 'Tucson', 'Fortuner', 'Swift'];
  const budgets = ['Under 20 Lakh', '20-40 Lakh', '40-60 Lakh', '60-80 Lakh', '80 Lakh - 1 Crore', 'Above 1 Crore'];

  const renderContent = () => {
    switch (activeCategory) {
      case 'Body Type':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {bodyTypes.map((item, index) => (
              <div key={index} className="group bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center hover:shadow-lg hover:border-blue-600 cursor-pointer transition-all duration-300">
                <img 
                  src={item.icon} 
                  alt={item.name} 
                  className="w-16 h-12 object-contain mb-3 opacity-80 group-hover:opacity-100 transition-all duration-300" 
                />
                <span className="font-bold text-slate-800 group-hover:text-blue-600">{item.name}</span>
              </div>
            ))}
          </div>
        );
      
      case 'City':
      case 'Make':
      case 'Model':
      case 'Budget':
        const dataMap = {
          'City': cities,
          'Make': makes,
          'Model': models,
          'Budget': budgets
        };
        const items = dataMap[activeCategory] || [];
        
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((item, index) => (
              <div key={index} className="bg-white border border-slate-200 rounded-xl p-5 text-center hover:shadow-md hover:border-blue-600 cursor-pointer transition-all">
                 <span className="font-bold text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-16">
      <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-8">
        Browse by {activeCategory}
      </h2>

      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-all duration-300 ${
              activeCategory === cat
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="animate-fade-in-up">
        {renderContent()}
      </div>
    </div>
  );
};

export default BrowseByType;