import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  MapPin,
  Star,
  CheckCircle,
  FileText,
  AlertCircle,
  Info,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';

const AICostEstimator = () => {
  const { darkMode } = useOutletContext();
  const navigate = useNavigate();

  // Inputs
  const [selectedService, setSelectedService] = useState('Electrician');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [houseSize, setHouseSize] = useState('2 BHK');
  const [rooms, setRooms] = useState(2);
  const [quantity, setQuantity] = useState(1);

  // Genuine loaded records
  const [categories, setCategories] = useState([]);
  const [liveProviders, setLiveProviders] = useState([]);
  const [catalogServices, setCatalogServices] = useState([]);

  // Outputs
  const [estimate, setEstimate] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        const [cats, pros, servs] = await Promise.all([
          CustomerService.getServiceCategories(),
          CustomerService.getProviders(),
          CustomerService.getServicesCatalog()
        ]);
        if (!isMounted) return;
        setCategories(cats || []);
        setLiveProviders(pros || []);
        setCatalogServices(servs || []);
      } catch (err) {
        console.error('Failed to load initial data for cost estimator:', err);
      }
    };
    loadInitialData();
    return () => { isMounted = false; };
  }, []);

  // Filter packages and providers matching selected category, deduplicated by provider ID
  const availableServices = catalogServices.filter(
    s => (s.category || '').toLowerCase() === (selectedService || '').toLowerCase()
  );

  const seenProvIds = new Set();
  const availableProviders = [];
  for (const p of liveProviders) {
    if ((p.category || '').toLowerCase() === (selectedService || '').toLowerCase()) {
      const idStr = String(p.id || p._id);
      if (!seenProvIds.has(idStr)) {
        seenProvIds.add(idStr);
        availableProviders.push(p);
      }
    }
  }

  // Determine current unit and if room count affects pricing
  const selectedCatDoc = categories.find(c => (c.name || '').toLowerCase() === (selectedService || '').toLowerCase());
  const selectedServiceDoc = catalogServices.find(s => String(s._id || s.id) === String(selectedServiceId));
  const selectedProviderDoc = liveProviders.find(p => String(p.id || p._id) === String(selectedProviderId));

  const activeUnit = selectedServiceDoc?.pricingUnit ||
    selectedProviderDoc?.pricingUnit ||
    (selectedProviderDoc?.hourlyRate ? 'Per Hour' : '') ||
    selectedCatDoc?.duration ||
    estimate?.unit ||
    'Per Visit';

  const isRoomDependent = activeUnit.toLowerCase().includes('hour') || activeUnit.toLowerCase().includes('room');

  const handleCategoryChange = (e) => {
    setSelectedService(e.target.value);
    setSelectedServiceId('');
    setSelectedProviderId('');
  };

  // Run automatically when selections change
  useEffect(() => {
    let active = true;
    const runEstimate = async () => {
      setCalculating(true);
      try {
        const result = await CustomerService.getAICostEstimate(
          selectedService,
          houseSize,
          rooms,
          liveProviders,
          selectedServiceId,
          selectedProviderId,
          null, // hours
          null, // areaSqFt
          quantity
        );
        if (active) {
          setEstimate(result);
        }
      } catch (err) {
        console.error('Estimation error:', err);
      } finally {
        if (active) {
          setCalculating(false);
        }
      }
    };

    runEstimate();
    return () => { active = false; };
  }, [selectedService, selectedServiceId, selectedProviderId, houseSize, rooms, quantity, liveProviders]);

  // Deduplicate recommended providers in estimate output
  const seenRecIds = new Set();
  const uniqueRecommendedProviders = (estimate?.recommendedProviders || []).filter(p => {
    const idStr = String(p.id || p._id);
    if (seenRecIds.has(idStr)) return false;
    seenRecIds.add(idStr);
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className={`text-3xl font-extrabold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <Calculator className="w-8 h-8 text-blue-500" />
          AI Cost Estimator
        </h2>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
          Accurate home service cost breakdowns and matching experts in Coimbatore using verified provider rates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Input parameters panel */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border space-y-6 ${
          darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h4 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
            <span>1. Configuration Parameters</span>
          </h4>

          <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

          {/* Service Dropdown */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Service Category</label>
            <select
              value={selectedService}
              onChange={handleCategoryChange}
              className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              {categories.map(cat => (
                <option key={cat.id || cat._id || cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Specific Service Package (Optional) */}
          {availableServices.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Service Package (Optional)
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="">Standard {selectedService} Service</option>
                {availableServices.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name} (₹{s.price}{s.estimatedDuration ? ` • ${s.estimatedDuration}` : ''})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Specific Provider (Optional) - Deduplicated */}
          {availableProviders.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Preferred Provider (Optional)
              </label>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="">Best Match (First Available)</option>
                {availableProviders.map(p => (
                  <option key={p.id || p._id} value={p.id || p._id}>
                    {p.name} — ₹{p.hourlyRate || (p.pricing && p.pricing[0]?.price) || p.rate || p.price} ({p.pricingUnit || 'Per Service'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* House Size grid */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">House Configuration</label>
            <div className="grid grid-cols-3 gap-2">
              {['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Villa/Independent'].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setHouseSize(size)}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-colors ${
                    houseSize === size
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : darkMode ? 'bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Room Count Slider */}
          {isRoomDependent ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span>Rooms Count</span>
                <span className="text-blue-500 font-extrabold text-xs">
                  {rooms} Room{rooms > 1 ? 's' : ''}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={rooms}
                onChange={(e) => setRooms(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                <span>1 Room</span>
                <span>5 Rooms</span>
                <span>10 Rooms</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 p-3 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 text-[11px] text-slate-400">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Rooms Count</span>
                <span className="text-slate-400 font-normal lowercase">(not applicable)</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={rooms}
                disabled
                className="w-full accent-slate-500 cursor-not-allowed opacity-30 h-1.5"
              />
              <p className="text-[10px] text-slate-500 leading-tight pt-0.5">
                Pricing for {selectedService} is configured {activeUnit} and does not depend on room count.
              </p>
            </div>
          )}

          {/* Quality Assurance Note */}
          <div className={`p-4 rounded-2xl border text-xs ${
            darkMode ? 'bg-slate-950/60 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div className="flex items-center gap-2 font-bold text-blue-500 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Transparent Pricing Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Every estimate reflects the genuine fee configured by verified providers in Coimbatore. SmartServe AI adds zero platform fees, convenience surcharges, or extra taxes.
            </p>
          </div>
        </div>

        {/* Output prediction dashboard */}
        <div className="lg:col-span-3 space-y-6">
          {calculating ? (
            <div className={`p-12 rounded-3xl border flex flex-col items-center justify-center h-full min-h-[400px] ${
              darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'
            }`}>
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-4" />
              <p className="text-xs font-bold text-slate-500 animate-pulse">Calculating Real-Time Estimate from Verified Data...</p>
            </div>
          ) : estimate && estimate.available === false ? (
            /* Clear honest unavailable state when category has no registered providers */
            <div className={`p-8 rounded-[32px] border space-y-6 ${
              darkMode ? 'bg-amber-950/20 border-amber-500/20 text-amber-200' : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold">Service Currently Unavailable in Coimbatore</h4>
                  <p className="text-xs mt-1.5 leading-relaxed text-amber-400/90 font-medium">
                    {estimate.message || `Cost estimate is currently unavailable for ${selectedService} because there are no verified providers registered in Coimbatore.`}
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border text-xs ${
                darkMode ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-white border-amber-200 text-slate-700'
              }`}>
                <div className="flex items-center gap-2 font-semibold text-blue-400 mb-1">
                  <Info className="w-4 h-4" />
                  <span>SmartServe AI Data Integrity</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  We strictly calculate estimates based on real, background-verified professionals in Coimbatore. Rather than showing synthetic prices, we inform you honestly when providers are not yet onboarded.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedService(categories.find(c => c.name !== selectedService)?.name || 'Electrician')}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <span>Explore Other Categories</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : estimate && estimate.breakdown ? (
            <>
              {/* Main estimate highlight */}
              <div className={`p-8 rounded-[32px] border relative overflow-hidden ${
                darkMode ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-white/10' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm'
              }`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full" />
                
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 uppercase tracking-widest">
                    <Sparkles className="w-4 h-4" />
                    <span>Verified Provider Estimate</span>
                  </div>
                  {estimate.unit && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-500 border border-blue-500/20">
                      {estimate.unit}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-3">
                  <span className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    ₹{estimate.breakdown.total.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Direct Provider Fee (Zero Platform Surcharges)
                  </span>
                </div>

                {estimate.explanation && (
                  <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                    {estimate.explanation}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-white/10 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>Est. Duration: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{estimate.duration || 'Duration not available'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <UserCheck className="w-4 h-4 text-green-500" />
                    <span>Provider: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{estimate.provider?.name || 'Verified Specialist'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown - Strictly Provider Service Fee Only */}
              <div className={`p-6 rounded-3xl border space-y-4 ${
                darkMode ? 'bg-slate-900/30 border-white/5' : 'bg-white border-slate-100 shadow-sm'
              }`}>
                <h5 className={`font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2`}>
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Price Breakdown</span>
                </h5>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between font-semibold text-slate-400">
                    <span>Provider Service Fee ({estimate.provider?.name || selectedService})</span>
                    <span className={darkMode ? 'text-white' : 'text-slate-900'}>
                      ₹{estimate.breakdown.providerServiceFee.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

                  <div className="flex justify-between font-extrabold text-base text-blue-500">
                    <span>Total</span>
                    <span>₹{estimate.breakdown.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    SmartServe AI Price Guarantee: Direct provider pricing. Absolutely zero platform fees, convenience charges, booking fees, or hidden extra taxes.
                  </p>
                </div>
              </div>

              {/* Recommended Professionals - Deduplicated */}
              <div className="space-y-3">
                <h5 className={`font-bold text-xs uppercase tracking-wider text-slate-400`}>
                  Verified Providers in Coimbatore ({selectedService})
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {uniqueRecommendedProviders.map((p) => (
                    <div
                      key={p.id || p._id}
                      onClick={() => navigate(`/customer/providers?search=${encodeURIComponent(p.name)}`)}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-4 cursor-pointer hover:border-blue-500 transition-colors ${
                        darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                          {p.photo ? (
                            <img src={p.photo} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <span>{p.name?.charAt(0) || 'P'}</span>
                          )}
                        </div>
                        <div>
                          <h6 className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</h6>
                          <div className="flex items-center gap-1 mt-0.5 text-slate-500 text-[10px]">
                            <MapPin className="w-3 h-3" />
                            <span>{p.city || 'Coimbatore'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[8px] font-extrabold text-blue-500 uppercase tracking-widest block w-fit ml-auto mb-1">
                          ₹{p.hourlyRate || (p.pricing && p.pricing[0]?.price) || p.rate || p.price || 350} {p.pricingUnit || 'Per Service'}
                        </span>
                        {p.rating > 0 ? (
                          <div className="flex items-center gap-0.5 text-amber-500 font-bold text-[10px] justify-end">
                            <Star className="w-3 h-3 fill-amber-500" />
                            <span>{p.rating}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-400 block">Verified</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {uniqueRecommendedProviders.length === 0 && (
                    <div className="col-span-full py-4 text-center text-xs text-slate-500">
                      No registered providers available for {selectedService} currently.
                    </div>
                  )}
                </div>
              </div>

              {/* Booking CTA with room count and selected provider/service */}
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (selectedService) params.set('category', selectedService);
                  if (selectedServiceId) params.set('serviceId', selectedServiceId);
                  if (selectedProviderId) params.set('providerId', selectedProviderId);
                  if (isRoomDependent && rooms) params.set('rooms', String(rooms));
                  navigate(`/customer/providers?${params.toString()}`);
                }}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-colors"
              >
                <span>Book Service Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 font-semibold text-xs">
              Configure parameters to see pricing forecast.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AICostEstimator;