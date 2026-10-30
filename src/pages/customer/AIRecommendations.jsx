import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Star,
  Clock,
  MapPin,
  TrendingUp,
  Award,
  Zap,
  ArrowRight,
  Filter,
  CheckCircle,
  Percent,
  Bot
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';

const AIRecommendations = () => {
  const { darkMode } = useOutletContext();
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const recs = await CustomerService.getAIRecommendations();
      setRecommendations(recs);
    } catch (e) {
      console.error(e);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecs = recommendations.filter(rec => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'History') return (rec.criteria || '').includes('Booking History');
    if (activeFilter === 'Seasonal') return (rec.criteria || '').includes('Seasonal Demand');
    if (activeFilter === 'Popular') return (rec.criteria || '').includes('Popular Services') || (rec.badge || '').includes('Coimbatore');
    if (activeFilter === 'Budget') return (rec.criteria || '').includes('Budget') || rec.estimatedPrice < 1000;
    return true;
  });

  // Ensure each provider is shown only once in recommendations
  const seenRecProviderIds = new Set();
  const uniqueRecs = [];
  for (const r of filteredRecs) {
    const pId = String(r.providerId || r.id);
    if (!seenRecProviderIds.has(pId)) {
      seenRecProviderIds.add(pId);
      uniqueRecs.push(r);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className={`p-8 rounded-[32px] border relative overflow-hidden ${
        darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-white/10' : 'bg-gradient-to-br from-white via-slate-50 to-blue-50/30 border-slate-200 shadow-sm'
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>AI Personalization Engine</span>
          </div>

          <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            AI Smart Recommendations
          </h2>

          <p className={`text-xs sm:text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Tailored suggestions derived from your booking history, Coimbatore seasonal weather demands, local provider ratings, and real-time market prices.
          </p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" /> 98% Match Algorithm
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-500" /> Coimbatore Geolocation
            </span>
            <span className="flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-purple-500" /> Live Preference Sync
            </span>
          </div>
        </div>
      </div>

      {/* Filter Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={`p-1.5 rounded-2xl flex flex-wrap gap-1 border ${
          darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {[
            { id: 'All', label: 'All Smart Recommendations' },
            { id: 'History', label: 'Based on History' },
            { id: 'Seasonal', label: 'Seasonal Demand' },
            { id: 'Popular', label: 'Popular in Coimbatore' },
            { id: 'Budget', label: 'Best Budget Value' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Showing {uniqueRecs.length} AI matches
        </span>
      </div>

      {/* Grid of Recommendation Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-80 rounded-3xl animate-pulse ${darkMode ? 'bg-slate-900/50' : 'bg-slate-200'}`} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueRecs.map((rec) => (
            <motion.div
              key={rec.id}
              whileHover={{ y: -6 }}
              className={`rounded-3xl border overflow-hidden flex flex-col justify-between transition-all ${
                darkMode ? 'bg-slate-900/50 border-white/10 hover:border-blue-500/50' : 'bg-white border-slate-200 shadow-sm hover:border-blue-400'
              }`}
            >
              {/* Card Image Banner */}
              <div className="h-44 relative bg-slate-800 flex items-center justify-center font-bold text-white text-3xl">
                {rec.image ? (
                  <img src={rec.image} alt={rec.serviceName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <span>{rec.serviceName?.charAt(0) || 'S'}</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                {/* Confidence score badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-blue-600/90 text-white backdrop-blur-md text-[10px] font-black tracking-wider shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{rec.confidence}% AI Match</span>
                </div>

                {/* Criteria badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 text-blue-400 border border-blue-500/20 backdrop-blur-md text-[9px] font-extrabold uppercase tracking-wider">
                  {rec.badge}
                </div>

                <div className="absolute bottom-3 left-4 right-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">{rec.category}</span>
                  <h4 className="text-white font-extrabold text-base leading-tight">{rec.serviceName}</h4>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                
                {/* AI Recommendation Reason */}
                <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  darkMode ? 'bg-blue-950/20 border-blue-500/10 text-slate-300' : 'bg-blue-50/70 border-blue-100 text-slate-700'
                }`}>
                  <div className="flex items-center gap-1 text-[10px] font-extrabold text-blue-500 uppercase tracking-wider mb-1">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Why AI Recommends This</span>
                  </div>
                  <p>{rec.reason}</p>
                </div>

                {/* Key specs */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className={`p-2.5 rounded-xl border ${darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Est. Duration</span>
                    <span className={`font-bold flex items-center gap-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      <Clock className="w-3 h-3 text-blue-500" />
                      {rec.estimatedDuration || 'Duration not available'}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Provider Rating</span>
                    {rec.reviewsCount > 0 && rec.rating > 0 ? (
                      <span className="font-bold flex items-center gap-1 text-amber-500">
                        <Star className="w-3 h-3 fill-amber-500" />
                        {rec.rating} ({rec.reviewsCount})
                      </span>
                    ) : (
                      <span className="font-bold text-blue-400 block mt-0.5">
                        New Provider
                      </span>
                    )}
                  </div>
                </div>

                {/* Multiple Services Offered */}
                {rec.services && rec.services.length > 1 && (
                  <div className="space-y-1 pt-1 border-t border-dashed border-white/10 text-xs">
                    <span className="text-[10px] text-slate-500 font-bold block">
                      Services by {rec.providerName} ({rec.services.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {rec.services.map((svc, idx) => (
                        <span
                          key={svc.id || idx}
                          className={`text-[9px] px-2 py-0.5 rounded font-medium ${
                            darkMode ? 'bg-slate-950 text-slate-300 border border-white/5' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {svc.name} (₹{svc.price})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Provider info */}
                <div className="flex items-center justify-between pt-2 border-t border-dashed border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Recommended Partner</span>
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{rec.providerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Location</span>
                    <span className="font-semibold text-slate-400 flex items-center gap-0.5 justify-end">
                      <MapPin className="w-3 h-3 text-blue-500" /> {rec.providerCity}
                    </span>
                  </div>
                </div>

                {/* Price & Book Now button */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] text-slate-500 block font-bold uppercase tracking-wider">Estimated Price</span>
                    <span className="text-2xl font-black text-blue-500">₹{rec.estimatedPrice.toLocaleString('en-IN')}</span>
                  </div>

                  <button
                    onClick={() => navigate(`/customer/providers?category=${encodeURIComponent(rec.category)}`)}
                    className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition-all"
                  >
                    <span>Book Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </motion.div>
          ))}
          {filteredRecs.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 space-y-3">
              <Bot className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold">No recommendations currently available for this filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
