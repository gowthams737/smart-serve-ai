import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Heart, Star, MapPin, Search } from 'lucide-react';
import { CustomerService, serviceCategories } from '../../services/customerService';
import { cleanImageUrl } from '../../utils/imageUrl';

const CustomerSaved = () => {
  const { darkMode } = useOutletContext();
  const [savedProviders, setSavedProviders] = useState([]);

  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    const savedIds = await CustomerService.getSavedProviders();
    const allProviders = await CustomerService.getProviders();
    const filtered = allProviders.filter(p => savedIds.includes(p.id));
    setSavedProviders(filtered);
  };

  const handleRemove = async (providerId) => {
    await CustomerService.toggleSaveProvider(providerId);
    await loadSaved();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h2 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Saved Providers
        </h2>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
          Your preferred service experts bookable in one click.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedProviders.map((p) => (
          <div
            key={p.id}
            className={`p-6 rounded-3xl border flex flex-col justify-between gap-6 relative group ${
              darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {/* Unsave button */}
            <button
              onClick={() => handleRemove(p.id)}
              className="absolute top-4 right-4 p-2.5 rounded-xl border flex items-center justify-center bg-rose-500/10 border-rose-500/20 text-rose-500 transition-colors"
              title="Remove from saved"
            >
              <Heart className="w-4 h-4 fill-rose-500" />
            </button>

            {/* Profile info */}
            <div className="flex items-center gap-4 pt-2">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-blue-500/20 bg-slate-800 flex-shrink-0 flex items-center justify-center font-bold text-white text-lg">
                {cleanImageUrl(p.photo) ? (
                  <img src={cleanImageUrl(p.photo)} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <span>{p.name?.charAt(0) || 'P'}</span>
                )}
              </div>
              <div>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block w-fit mb-1">
                  {p.category}
                </span>
                <h4 className={`font-bold text-base leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</h4>
                <div className="flex items-center gap-1 mt-1 text-slate-500 text-xs">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{p.city}</span>
                </div>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'} line-clamp-2`}>
              {p.about}
            </p>

            <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

            {/* Price / Star stats */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Rates from</span>
                <span className="text-lg font-black text-blue-500">
                  ₹{p.price.toLocaleString('en-IN')}
                  <span className="text-xs text-slate-500 font-medium">
                    /{serviceCategories.find(c => c.name === p.category)?.unit || 'visit'}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                {p.rating > 0 ? (
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{p.rating}</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-blue-400">New Provider</span>
                )}
                
                <Link to={`/customer/providers?search=${encodeURIComponent(p.name)}`}>
                  <button className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20">
                    Book
                  </button>
                </Link>
              </div>
            </div>

          </div>
        ))}

        {savedProviders.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <p className="text-slate-500 font-medium">You haven't saved any providers yet.</p>
            <Link to="/customer/providers" className="text-xs text-blue-500 hover:underline font-bold flex items-center justify-center gap-1">
              Find providers now <Search className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

    </div>
  );
};

export default CustomerSaved;
