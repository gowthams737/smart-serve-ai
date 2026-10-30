import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Check, AlertCircle, Loader2, Edit3, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatWorkingHours, formatTimeToAMPM } from '../../utils/timeFormat';
import { ProviderService } from '../../services/providerService';

const ALL_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const DAY_ABBR = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun'
};

const HoursSetupCard = ({ provider, onUpdate, isEditing, setIsEditing }) => {
  const [internalEditing, setInternalEditing] = useState(false);
  const activeEditing = isEditing !== undefined ? isEditing : internalEditing;
  const setEditingMode = (val) => {
    if (setIsEditing) setIsEditing(val);
    setInternalEditing(val);
  };

  const currentStart = provider?.workingHours?.start || '09:00';
  const currentEnd = provider?.workingHours?.end || '18:00';
  const currentDays = Array.isArray(provider?.workingDays) && provider.workingDays.length > 0
    ? provider.workingDays
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const [startTime, setStartTime] = useState(currentStart);
  const [endTime, setEndTime] = useState(currentEnd);
  const [selectedDays, setSelectedDays] = useState(currentDays);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Synchronize when provider prop changes
  useEffect(() => {
    if (provider?.workingHours?.start) setStartTime(provider.workingHours.start);
    if (provider?.workingHours?.end) setEndTime(provider.workingHours.end);
    if (Array.isArray(provider?.workingDays)) setSelectedDays(provider.workingDays);
  }, [provider]);

  const validate = (start, end, days) => {
    if (!start || !end) {
      return 'Please enter both start and end times.';
    }

    const parseToMinutes = (str) => {
      const [h, m] = str.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return -1;
      return h * 60 + m;
    };

    const startMin = parseToMinutes(start);
    const endMin = parseToMinutes(end);

    if (startMin < 0 || endMin < 0) {
      return 'Invalid time format. Please provide valid HH:MM times.';
    }

    if (startMin >= endMin) {
      return 'Start time must be earlier than end time.';
    }

    if (!Array.isArray(days) || days.length === 0) {
      return 'Please select at least one working day.';
    }

    return null;
  };

  const handleToggleDay = (day) => {
    setErrorMessage('');
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSelectWeekdays = () => {
    setErrorMessage('');
    setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  };

  const handleSelectAll = () => {
    setErrorMessage('');
    setSelectedDays([...ALL_DAYS]);
  };

  const handleCancel = () => {
    setStartTime(currentStart);
    setEndTime(currentEnd);
    setSelectedDays(currentDays);
    setErrorMessage('');
    setEditingMode(false);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationError = validate(startTime, endTime, selectedDays);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfile = await ProviderService.updateProviderInfo({
        workingHours: { start: startTime, end: endTime },
        workingDays: selectedDays
      });

      if (!updatedProfile) {
        throw new Error('Failed to update working hours. Please try again.');
      }

      setSuccessMessage('Working hours updated and synchronized successfully!');
      if (onUpdate) {
        onUpdate(updatedProfile);
      }
      setTimeout(() => {
        setSuccessMessage('');
        setEditingMode(false);
      }, 1500);
    } catch (err) {
      console.error('Error saving hours setup:', err);
      setErrorMessage(err.message || 'Unable to save working hours to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      id="hours-setup-section"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl shadow-xl space-y-5 relative overflow-hidden"
    >
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 blur-2xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-white text-base tracking-tight">Hours Setup</h4>
            <p className="text-[11px] text-slate-400">Daily working schedule & availability</p>
          </div>
        </div>

        <div>
          {!activeEditing ? (
            <button
              onClick={() => {
                setErrorMessage('');
                setEditingMode(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Edit Hours</span>
            </button>
          ) : (
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Messages */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-200 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-green-950/50 border border-green-500/30 rounded-xl text-xs text-green-200 flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-green-400 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!activeEditing ? (
        /* View Mode */
        <div className="space-y-4">
          {/* Operating Time Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                Operating Window
              </span>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono">
                  {formatWorkingHours(provider?.workingHours || { start: currentStart, end: currentEnd })}
                </span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Active
            </div>
          </div>

          {/* Working Days Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Working Days</span>
              <span className="text-slate-300 font-semibold">
                {currentDays.length} {currentDays.length === 1 ? 'day' : 'days'} / week
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {ALL_DAYS.map((day) => {
                const isActive = currentDays.includes(day);
                return (
                  <div
                    key={day}
                    className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300 shadow-sm'
                        : 'bg-slate-950/40 border border-white/5 text-slate-600'
                    }`}
                    title={day}
                  >
                    <span>{DAY_ABBR[day]}</span>
                    <span className="block text-[9px] mt-0.5 opacity-80">
                      {isActive ? '✓' : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Availability Link */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Holidays & Blocked Dates</span>
            <Link
              to="/provider/availability"
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 group"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form onSubmit={handleSave} className="space-y-4">
          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 block uppercase tracking-wider">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setErrorMessage('');
                }}
                disabled={isSaving}
                className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition-colors"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 block uppercase tracking-wider">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setErrorMessage('');
                }}
                disabled={isSaving}
                className="w-full bg-slate-950 border border-slate-700/60 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition-colors"
                required
              />
            </div>
          </div>

          {/* Quick presets for days */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Working Days
              </label>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectWeekdays}
                  className="text-blue-400 hover:text-blue-300 underline font-semibold"
                >
                  Mon–Fri
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-blue-400 hover:text-blue-300 underline font-semibold"
                >
                  All 7 Days
                </button>
              </div>
            </div>

            {/* Day toggle buttons */}
            <div className="grid grid-cols-7 gap-1.5">
              {ALL_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleDay(day)}
                    disabled={isSaving}
                    aria-pressed={isSelected}
                    className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      isSelected
                        ? 'bg-blue-600 border border-blue-400 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    title={`Toggle ${day}`}
                  >
                    <span>{DAY_ABBR[day]}</span>
                    <span className="block text-[9px] mt-0.5 opacity-90">
                      {isSelected ? '✓' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save / Cancel Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Hours</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
};

export default HoursSetupCard;
