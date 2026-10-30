import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Info,
  Check,
  Plus,
  AlertTriangle,
  Send,
  User,
  ShieldCheck,
  X,
  ChevronRight,
  Sliders,
  MessageSquare,
  RefreshCw,
  Star,
  Search,
  CheckCircle2,
  ListOrdered,
  Users,
  DollarSign
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';
import { AuthService } from '../../services/authService';

const QUICK_PROMPTS = [
  { label: '3 Rooms Painting & Deep Cleaning', text: '3 rooms painting and deep cleaning in Peelamedu' },
  { label: 'Fan repair & pipe leak', text: 'need fan repair and bathroom pipe leak' },
  { label: 'Veetukku paint adikka & cleaning (Tanglish)', text: 'veetukku paint adikka and full cleaning' },
  { label: 'AC repair & RO filter change', text: 'AC not cooling and water purifier filter replacement' },
  { label: 'Electrician Gowtham', text: 'Gowtham electrician' }
];

const AIServicePlanner = () => {
  const { darkMode } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [categories, setCategories] = useState([]);
  const [selectedServices, setSelectedServices] = useState(['Electrician', 'Deep Cleaning']);
  const [rooms, setRooms] = useState(3);
  const [queryInput, setQueryInput] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clarification, setClarification] = useState(null);
  const [locationNote, setLocationNote] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);

  // Race condition prevention
  const searchIdRef = useRef(0);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [activeBookingStep, setActiveBookingStep] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState('');

  // Current logged in user
  const currentUser = AuthService.getCurrentUser();

  // Load Categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await CustomerService.getServiceCategories();
        setCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();

    // Default booking date to tomorrow in DD/MM/YYYY
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const yyyy = tomorrow.getFullYear();
    setBookingDate(`${dd}/${mm}/${yyyy}`);

    if (currentUser?.address) {
      setBookingAddress(currentUser.address);
    }
  }, []);

  // Fetch plan from backend grounded in MongoDB
  const fetchPlan = async (overrides = {}) => {
    const currentSearchId = ++searchIdRef.current;
    setLoading(true);
    setClarification(null);
    setLocationNote('');
    setBookingError('');

    const targetServices = overrides.services !== undefined ? overrides.services : selectedServices;
    const targetRooms = overrides.rooms !== undefined ? overrides.rooms : rooms;
    const targetQuery = overrides.query !== undefined ? overrides.query : '';

    try {
      const payload = {
        services: targetServices,
        rooms: targetRooms,
        message: targetQuery,
        location: 'Coimbatore',
        history: conversationHistory,
        customer: currentUser
      };

      const res = await CustomerService.getAIServicePlan(payload);

      // Discard stale responses if a newer search/request was triggered
      if (currentSearchId !== searchIdRef.current) {
        return;
      }

      if (res && res.clarificationNeeded) {
        setClarification({
          message: res.message || "Could you please specify which services you need for your project in Coimbatore?",
          suggestedCategories: res.suggestedCategories || []
        });
        setPlan(null);
        setLoading(false);
        return;
      }

      if (res && res.noMatches) {
        setPlan({
          ...res,
          noMatches: true
        });
        setLoading(false);
        return;
      }

      if (res && res.error) {
        setLocationNote(res.error);
        setLoading(false);
        return;
      }

      if (res) {
        setPlan(res);
        if (res.selectedServices && Array.isArray(res.selectedServices) && res.selectedServices.length > 0) {
          setSelectedServices(res.selectedServices);
        }
        if (res.rooms) {
          setRooms(res.rooms);
        }
      }
    } catch (err) {
      if (currentSearchId === searchIdRef.current) {
        console.error('Plan fetch error:', err);
        setLocationNote('Failed to retrieve service plan. Please check your network connection.');
      }
    } finally {
      if (currentSearchId === searchIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchPlan();
  }, []);

  // Handle toggling category checkbox
  const handleToggleService = (catName) => {
    const updated = selectedServices.includes(catName)
      ? selectedServices.filter(s => s !== catName)
      : [...selectedServices, catName];

    setSelectedServices(updated);
    fetchPlan({ services: updated, query: '' });
  };

  // Handle slider room count change
  const handleRoomSliderChange = (e) => {
    const newRooms = parseInt(e.target.value, 10);
    setRooms(newRooms);
    fetchPlan({ rooms: newRooms });
  };

  // Handle Natural Language Query Submission
  const handleQuerySubmit = (e) => {
    e?.preventDefault();
    if (!queryInput.trim()) return;

    const userText = queryInput.trim();
    setConversationHistory(prev => [...prev, { role: 'user', text: userText }]);
    setQueryInput('');

    fetchPlan({ query: userText, services: [] });
  };

  // Handle Quick Prompt Chip click
  const handleQuickPromptClick = (text) => {
    setQueryInput(text);
    setConversationHistory(prev => [...prev, { role: 'user', text }]);
    fetchPlan({ query: text, services: [] });
  };

  // Handle Clarification Suggestion Click
  const handleAddSuggestedCategory = (catName) => {
    const updated = Array.from(new Set([...selectedServices, catName]));
    setSelectedServices(updated);
    setClarification(null);
    fetchPlan({ services: updated });
  };

  // Deduplicated matching providers list with multiple services grouped
  const matchingProvidersList = useMemo(() => {
    if (!plan) return [];
    if (Array.isArray(plan.matchingProviders) && plan.matchingProviders.length > 0) {
      return plan.matchingProviders;
    }
    // Fallback: extract unique providers from steps
    const seen = new Set();
    const list = [];
    if (Array.isArray(plan.steps)) {
      for (const step of plan.steps) {
        if (step.provider) {
          const idStr = String(step.provider._id || step.provider.id);
          if (!seen.has(idStr)) {
            seen.add(idStr);
            list.push({
              ...step.provider,
              services: step.recommendedProviders?.find(rp => String(rp._id || rp.id) === idStr)?.services || [
                {
                  id: step.serviceId || 'svc_' + idStr,
                  name: step.serviceName,
                  price: step.estimatedCost,
                  unit: step.pricingUnit || 'Per Visit',
                  duration: step.duration
                }
              ]
            });
          }
        }
      }
    }
    return list;
  }, [plan]);

  // Open In-Page Booking Modal for a step
  const handleOpenBookingModal = (step) => {
    if (!step.available || !step.provider) {
      alert('This step cannot be booked currently as no approved provider is registered for this category in Coimbatore.');
      return;
    }
    setActiveBookingStep(step);
    setBookingSuccess(null);
    setBookingError('');
    setBookingModalOpen(true);
  };

  // Open In-Page Booking Modal for a specific provider
  const handleOpenBookingModalForProvider = (provider, service = null) => {
    const selectedService = service || (provider.services && provider.services[0]) || null;
    const stepObj = {
      stepNumber: 1,
      category: provider.category,
      serviceName: selectedService?.name || `${provider.category} Standard Service`,
      serviceId: selectedService?.id || null,
      provider: provider,
      available: true,
      duration: selectedService?.duration || provider.duration || 'Duration unavailable',
      estimatedCost: selectedService?.price || provider.rate || 350,
      rooms: rooms
    };
    setActiveBookingStep(stepObj);
    setBookingSuccess(null);
    setBookingError('');
    setBookingModalOpen(true);
  };

  // Submit Booking
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!activeBookingStep || !activeBookingStep.provider) return;

    setBookingSubmitting(true);
    setBookingError('');

    try {
      const payload = {
        providerId: activeBookingStep.provider._id || activeBookingStep.provider.id,
        providerName: activeBookingStep.provider.name,
        providerEmail: activeBookingStep.provider.email || '',
        providerPhone: activeBookingStep.provider.phone || '',
        category: activeBookingStep.category,
        service: activeBookingStep.serviceName,
        serviceId: activeBookingStep.serviceId,
        rooms: activeBookingStep.rooms || rooms,
        price: activeBookingStep.estimatedCost,
        amount: activeBookingStep.estimatedCost,
        date: bookingDate,
        time: bookingTime,
        address: bookingAddress || 'Peelamedu, Coimbatore',
        customerAddress: bookingAddress || 'Peelamedu, Coimbatore'
      };

      const created = await CustomerService.createBooking(payload);
      setBookingSuccess(created);
    } catch (err) {
      setBookingError(err.message || 'Failed to submit booking. Please verify details.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-black flex items-center gap-2.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Calendar className="w-8 h-8 text-blue-500" />
            AI Service Planner
          </h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Coordinate multiple projects in the correct logical sequence with smart scheduling, verified provider rates, and authentic durations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${
            darkMode ? 'bg-slate-900/80 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span>Coimbatore, Tamil Nadu</span>
          </div>
          <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Live DB Grounded</span>
          </div>
        </div>
      </div>

      {/* Natural Language Prompt & Planner Search Bar */}
      <div className={`p-6 rounded-3xl border transition-all ${
        darkMode ? 'bg-slate-900/60 border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <form onSubmit={handleQuerySubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-xs font-extrabold uppercase tracking-wider block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Search Services, Providers or Describe Project Requirements
            </label>
            <span className="text-[10px] text-slate-500 font-medium">Supports English, Typos & Tanglish</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuerySubmit(e);
                  }
                }}
                placeholder="Search services, provider name, or describe requirements..."
                className={`w-full pl-4 pr-10 py-3.5 rounded-2xl text-sm font-medium border outline-none transition-all ${
                  darkMode
                    ? 'bg-slate-950/70 border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
              />
              {queryInput && (
                <button
                  type="button"
                  onClick={() => setQueryInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !queryInput.trim()}
              className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{loading ? 'Searching...' : 'Search Plan'}</span>
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] font-bold text-slate-500">Try asking:</span>
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickPromptClick(qp.text)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border transition-all ${
                  darkMode
                    ? 'bg-slate-950/40 border-white/10 text-slate-300 hover:bg-blue-600/20 hover:border-blue-500/40'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                {qp.label}
              </button>
            ))}
          </div>
        </form>

        {/* Location / Validation Warning */}
        {locationNote && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <span>{locationNote}</span>
          </div>
        )}

        {/* AI Clarifying Question Alert */}
        {clarification && (
          <div className={`mt-4 p-5 rounded-2xl border ${
            darkMode ? 'bg-blue-950/30 border-blue-500/30 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" />
              <div className="space-y-3">
                <p className="text-xs font-bold leading-relaxed">{clarification.message}</p>
                {clarification.suggestedCategories && clarification.suggestedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {clarification.suggestedCategories.map((cat, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAddSuggestedCategory(cat)}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{cat}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Room Count Slider Panel */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-6 ${
        darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h4 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Project Property Size / Room Count
            </h4>
          </div>
          <p className="text-[11px] text-slate-500">
            Dynamically scales labor hours, square footage, and BHK multipliers for room-dependent services.
          </p>
        </div>

        <div className="flex items-center gap-4 min-w-[280px]">
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={rooms}
            onChange={handleRoomSliderChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-black text-xs min-w-[70px] text-center shadow-md shadow-blue-500/20">
            {rooms} Room{rooms > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: Selector Panel & Follow-up History */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`p-6 rounded-3xl border space-y-6 ${
            darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Bundle Categories
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select 2 or more verified categories to calculate sequence timeline.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-500 font-bold text-[10px]">
                {selectedServices.length} Selected
              </span>
            </div>

            <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2">
              {categories.map((c) => {
                const isChecked = selectedServices.includes(c.name);
                return (
                  <button
                    key={c.id || c._id}
                    onClick={() => handleToggleService(c.name)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      isChecked
                        ? 'bg-blue-600/10 border-blue-600/50 text-white'
                        : darkMode
                        ? 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{c.icon || '🛠️'}</span>
                      <span className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{c.name}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      isChecked ? 'bg-blue-600 border-blue-600 text-white' : darkMode ? 'border-white/10' : 'border-slate-300'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation Inquiry Thread */}
          {conversationHistory.length > 0 && (
            <div className={`p-5 rounded-3xl border space-y-3 ${
              darkMode ? 'bg-slate-900/30 border-white/10' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                  Recent Inquiries
                </span>
                <button
                  onClick={() => setConversationHistory([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  Clear History
                </button>
              </div>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {conversationHistory.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950/40 border border-white/5 text-xs">
                    <span className="text-[10px] text-blue-400 font-bold block mb-0.5">You:</span>
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: 8 Structured Output Sections & Recommendations */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className={`p-12 rounded-3xl border flex flex-col items-center justify-center h-full min-h-[420px] ${
              darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-4" />
              <p className="text-xs font-bold text-slate-400 animate-pulse">Calculating Optimal Sequence & Real Provider Rates...</p>
            </div>
          ) : plan && plan.noMatches ? (
            /* Clear Empty State for Unmatched Queries */
            <div className={`p-8 rounded-3xl border text-center space-y-4 ${
              darkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  No Matching Services or Providers Found
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {plan.message || `No approved providers or services match "${plan.searchQuery || ''}" in Coimbatore.`}
                </p>
              </div>
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-500 mb-2">Supported Categories in Coimbatore:</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                  {categories.map((c) => (
                    <button
                      key={c.id || c._id}
                      type="button"
                      onClick={() => {
                        setSelectedServices([c.name]);
                        setQueryInput(c.name);
                        fetchPlan({ services: [c.name], query: c.name });
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        darkMode
                          ? 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-blue-500 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : plan && ((plan.steps && plan.steps.length > 0) || (plan.matchingProviders && plan.matchingProviders.length > 0)) ? (
            <>
              {/* Highlight Overview: Sections 6 (Estimated Cost) & 7 (Estimated Duration) */}
              <div className={`p-6 rounded-[32px] border relative overflow-hidden ${
                darkMode ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-white/10' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm'
              }`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full" />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 uppercase tracking-widest">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Service Plan & Execution Sequence</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20">
                    Provider Fee Only • Zero Platform Surcharges
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs font-bold pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider mb-1">
                      6. Estimated Cost
                    </span>
                    <span className="text-xl font-black text-blue-500">
                      ₹{(plan.estimatedCost !== undefined ? plan.estimatedCost : plan.totalBudget || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider mb-1">
                      7. Estimated Duration
                    </span>
                    <span className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                      {plan.estimatedDuration || plan.totalDuration || 'Duration unavailable'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider mb-1">
                      Configured Scope
                    </span>
                    <span className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                      {plan.rooms || rooms} Room(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 1: Understanding Your Requirement */}
              {plan.understanding && (
                <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    <h5 className={`font-extrabold text-xs uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      1. Understanding Your Requirement
                    </h5>
                  </div>
                  <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {plan.understanding}
                  </p>
                </div>
              )}

              {/* Section 2: Recommended Service */}
              {plan.recommendedService && (
                <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h5 className={`font-extrabold text-xs uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      2. Recommended Service & Scope
                    </h5>
                  </div>
                  <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {plan.recommendedService}
                  </p>
                </div>
              )}

              {/* Section 3: Required Details */}
              {plan.requiredDetails && (
                <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h5 className={`font-extrabold text-xs uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      3. Required Details & Scope Multipliers
                    </h5>
                  </div>
                  <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {plan.requiredDetails}
                  </p>
                </div>
              )}

              {/* Section 4: Suggested Work Plan */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-blue-500" />
                    <h5 className={`font-extrabold text-xs uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      4. Suggested Work Plan (Execution Sequence)
                    </h5>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">
                    {plan.steps ? plan.steps.length : 0} Phase(s)
                  </span>
                </div>

                <div className="space-y-4 relative pl-4 border-l border-dashed border-slate-800">
                  {(plan.steps || []).map((step) => (
                    <div key={step.stepNumber} className="relative">
                      {/* Step marker */}
                      <div className={`absolute -left-[24px] top-3 w-4 h-4 rounded-full border-4 flex items-center justify-center ${
                        step.available ? 'bg-blue-600 border-slate-950' : 'bg-amber-500 border-slate-950'
                      }`} />

                      <div className={`p-5 rounded-2xl border transition-all ${
                        darkMode ? 'bg-slate-900/40 border-white/5 hover:border-white/10' : 'bg-white border-slate-100 shadow-sm'
                      }`}>
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-600 text-[9px] font-black text-white uppercase tracking-wider">
                              Step {step.stepNumber}
                            </span>
                            <h5 className={`font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {step.category}
                            </h5>
                            <span className="text-[11px] font-semibold text-slate-500">({step.serviceName})</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-blue-500" />
                              {step.schedule}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-500" />
                              {step.duration}
                            </span>
                          </div>
                        </div>

                        <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-3`}>
                          <strong className="text-blue-500 font-bold block mb-0.5">Optimal Order Reason:</strong>
                          {step.optimalOrderReason}
                        </p>

                        {/* Provider Card Snapshot */}
                        {step.available && step.provider ? (
                          <div className={`p-3.5 rounded-xl border mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            darkMode ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              {step.provider.photo ? (
                                <img
                                  src={step.provider.photo}
                                  alt={step.provider.name}
                                  className="w-10 h-10 rounded-full object-cover border border-white/10"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                                  {step.provider.name?.slice(0, 2).toUpperCase() || 'SP'}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {step.provider.name}
                                  </span>
                                  <span className="text-[10px] text-amber-400 font-bold flex items-center">
                                    ★ {step.provider.rating || 4.8}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 block">
                                  {step.provider.city || 'Coimbatore'} • Rate: ₹{step.provider.rate} {step.provider.pricingUnit}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-500 block uppercase">Applicable Fee</span>
                                <span className={`text-sm font-black text-blue-500`}>
                                  ₹{step.estimatedCost.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenBookingModal(step)}
                                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <span>Book Step</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{step.note || 'Currently, no approved providers are registered for this category in Coimbatore.'}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>Price Breakdown: <strong>Provider: ₹{step.estimatedCost}</strong> | Platform Fee: ₹0</span>
                          <span className="text-green-500 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Verified DB Rate
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 5: Matching Verified Providers */}
              {matchingProvidersList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <h5 className={`font-extrabold text-xs uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        5. Matching Verified Providers ({matchingProvidersList.length})
                      </h5>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Approved & Grounded in DB
                    </span>
                  </div>

                  <div className="space-y-3">
                    {matchingProvidersList.map((prov) => (
                      <div
                        key={prov.id || prov._id}
                        className={`p-4 rounded-2xl border transition-all ${
                          darkMode ? 'bg-slate-900/60 border-white/5 hover:border-white/10' : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {prov.photo ? (
                              <img
                                src={prov.photo}
                                alt={prov.name}
                                className="w-12 h-12 rounded-full object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                                {prov.name?.slice(0, 2).toUpperCase() || 'SP'}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h6 className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {prov.name}
                                </h6>
                                <span className="text-[11px] text-amber-400 font-bold flex items-center">
                                  ★ {prov.rating || 4.8}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>{prov.category}</span>
                                <span>•</span>
                                <span>{prov.city || 'Coimbatore'}</span>
                                <span>•</span>
                                <span className="font-semibold text-blue-400">
                                  ₹{prov.rate} {prov.pricingUnit}
                                </span>
                              </div>
                              {prov.duration && (
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>Configured Duration: {prov.duration}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenBookingModalForProvider(prov)}
                              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <span>Book Provider</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* If provider offers multiple matching services, group and list them inside this card */}
                        {prov.services && prov.services.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-slate-800/40">
                            <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">
                              All Services Offered by {prov.name}:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {prov.services.map((svc, sIdx) => (
                                <div
                                  key={svc.id || sIdx}
                                  className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                                    darkMode ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div>
                                    <span className={`font-semibold block ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                      {svc.name}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      ₹{svc.price} {svc.unit} • {svc.duration}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBookingModalForProvider(prov, svc)}
                                    className="px-2 py-1 text-[10px] font-bold rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white transition-all cursor-pointer"
                                  >
                                    Select
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Climate tip */}
              <div className={`p-4 rounded-2xl border flex gap-3 text-xs ${
                darkMode ? 'bg-amber-950/20 border-amber-500/10 text-amber-300' : 'bg-amber-50 border-amber-100 text-amber-800'
              }`}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                <p className="leading-relaxed">
                  <strong>Coimbatore Climate Note:</strong> {plan.coimbatoreTip || 'Electrical, carpentry, plumbing, and deep cleaning can proceed smoothly indoors throughout the year in Coimbatore.'}
                </p>
              </div>

              {/* Section 8: Next Step & Booking Action */}
              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-blue-950/30 border-blue-500/20' : 'bg-blue-50 border-blue-200 shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="w-4 h-4 text-blue-500" />
                  <h5 className={`font-extrabold text-xs uppercase tracking-wider ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                    8. Next Step
                  </h5>
                </div>
                <p className={`text-xs leading-relaxed mb-4 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                  {plan.nextStep || "Review the matching providers above and select 'Book Provider' or 'Proceed to Book Plan' to schedule your appointment."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (plan.steps && plan.steps.length > 0 && plan.steps[0].provider) {
                      handleOpenBookingModal(plan.steps[0]);
                    } else if (matchingProvidersList.length > 0) {
                      handleOpenBookingModalForProvider(matchingProvidersList[0]);
                    } else {
                      navigate('/customer/providers');
                    }
                  }}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Proceed to Book Plan (Start with Step 1)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className={`p-12 rounded-3xl border flex flex-col items-center justify-center text-center ${
              darkMode ? 'bg-slate-900/30 border-white/5 text-slate-500' : 'bg-white border-slate-200 text-slate-500'
            }`}>
              <Calendar className="w-10 h-10 mb-3 text-slate-600" />
              <p className="text-sm font-bold">Select 2 or more services or describe your project above to generate plan layout.</p>
            </div>
          )}
        </div>
      </div>

      {/* In-Page Booking Modal */}
      <AnimatePresence>
        {bookingModalOpen && activeBookingStep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl relative ${
                darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded bg-blue-600 text-[9px] font-black text-white uppercase tracking-wider">
                  Step {activeBookingStep.stepNumber || 1}
                </span>
                <h3 className="text-lg font-black">
                  Book {activeBookingStep.category} Service
                </h3>
              </div>

              {bookingSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-green-400">Booking Successfully Confirmed!</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Booking Reference: <strong>{bookingSuccess.bookingId}</strong>
                    </p>
                    <p className="text-xs text-slate-400">
                      Scheduled for {bookingDate} at {bookingTime} in Coimbatore.
                    </p>
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingModalOpen(false);
                        navigate('/customer/bookings-and-saved');
                      }}
                      className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      View in Bookings
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingModalOpen(false)}
                      className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs font-semibold">
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500">Provider</span>
                      <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{activeBookingStep.provider?.name}</strong>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500">Service</span>
                      <strong>{activeBookingStep.serviceName}</strong>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500">Configured Duration</span>
                      <strong className="text-blue-500">{activeBookingStep.duration}</strong>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-slate-500">Provider Fee (Total)</span>
                      <strong className="text-sm font-black text-blue-500">₹{activeBookingStep.estimatedCost.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  {bookingError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      {bookingError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Booking Date</label>
                      <input
                        type="text"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-xs ${
                          darkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Preferred Time</label>
                      <select
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border outline-none text-xs ${
                          darkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <option value="09:00 AM">09:00 AM</option>
                        <option value="10:00 AM">10:00 AM</option>
                        <option value="11:30 AM">11:30 AM</option>
                        <option value="02:00 PM">02:00 PM</option>
                        <option value="03:30 PM">03:30 PM</option>
                        <option value="05:00 PM">05:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Service Address (Coimbatore)</label>
                    <input
                      type="text"
                      value={bookingAddress}
                      onChange={(e) => setBookingAddress(e.target.value)}
                      placeholder="Enter street/locality in Coimbatore..."
                      className={`w-full px-3 py-2.5 rounded-xl border outline-none text-xs ${
                        darkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {bookingSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirm Booking (₹{activeBookingStep.estimatedCost})</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIServicePlanner;
