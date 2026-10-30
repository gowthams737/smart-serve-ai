import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, ToggleLeft, ToggleRight, AlertCircle, Plus, Trash2, Power, Check, Loader2, RefreshCw } from 'lucide-react';
import Button from '../../components/Button';
import DateInput from '../../components/DateInput';
import LoadingSkeleton from '../../components/provider/LoadingSkeleton';
import { ProviderService } from '../../services/providerService';
import { formatWorkingHours } from '../../utils/timeFormat';
import {
  formatDateDDMMYYYY,
  parseDDMMYYYY,
  isValidDDMMYYYY,
  compareDatesDDMMYYYY,
  areDatesEqual
} from '../../utils/dateFormat';

const ProviderAvailability = () => {
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [newHoliday, setNewHoliday] = useState('');
  const [holidayError, setHolidayError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const availableDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  const fetchInfo = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const info = await ProviderService.getProviderInfo();
      if (!info) {
        throw new Error('Unable to retrieve service provider information. Please ensure you are logged in.');
      }
      // Standardize holidays & blocked dates to DD/MM/YYYY format
      const rawHolidays = info.holidays || info.blockedDates || [];
      const normalizedHolidays = rawHolidays
        .map(h => formatDateDDMMYYYY(h) || h)
        .filter(Boolean);
      const uniqueHolidays = [...new Set(normalizedHolidays)].sort(compareDatesDDMMYYYY);

      setProvider({
        ...info,
        holidays: uniqueHolidays,
        blockedDates: uniqueHolidays
      });
    } catch (err) {
      console.error('Error fetching provider availability:', err);
      setLoadError(err.message || 'Failed to load availability settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const handleOnlineToggle = async () => {
    if (!provider) return;
    const nextState = !provider.isOnline;
    // Optimistic local update
    setProvider(prev => ({ ...prev, isOnline: nextState }));
    try {
      await ProviderService.updateProviderInfo({ isOnline: nextState });
      ProviderService.addNotification({
        title: nextState ? 'Status: Online' : 'Status: Offline',
        message: nextState 
          ? 'You are now online and available for bookings.' 
          : 'You are now offline and paused from receiving requests.',
        type: 'new_booking'
      });
    } catch (err) {
      console.error('Failed to toggle online status:', err);
      // Revert if error
      setProvider(prev => ({ ...prev, isOnline: !nextState }));
    }
  };

  const handleDayToggle = (day) => {
    if (!provider) return;
    const workingDays = provider.workingDays || [];
    const isSelected = workingDays.includes(day);
    let updatedDays = [];
    if (isSelected) {
      updatedDays = workingDays.filter((d) => d !== day);
    } else {
      updatedDays = [...workingDays, day];
    }
    setProvider({ ...provider, workingDays: updatedDays });
  };

  const handleHourChange = (type, value) => {
    if (!provider) return;
    setProvider({
      ...provider,
      workingHours: {
        ...provider.workingHours,
        [type]: value
      }
    });
  };

  const handleAddHoliday = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setHolidayError('');

    if (!newHoliday || !newHoliday.trim()) {
      setHolidayError('Please enter a date in DD/MM/YYYY format.');
      return;
    }

    const parsed = parseDDMMYYYY(newHoliday);
    if (!parsed.valid) {
      setHolidayError(parsed.error || 'Invalid date format. Use DD/MM/YYYY (e.g. 25/12/2026).');
      return;
    }

    const formattedDate = parsed.formatted; // standard DD/MM/YYYY
    const currentHolidays = provider?.holidays || [];

    if (currentHolidays.some(h => areDatesEqual(h, formattedDate))) {
      setHolidayError(`Holiday ${formattedDate} is already added.`);
      return;
    }

    const updatedHolidays = [...currentHolidays, formattedDate].sort(compareDatesDDMMYYYY);
    setProvider({
      ...provider,
      holidays: updatedHolidays,
      blockedDates: updatedHolidays
    });
    setNewHoliday('');
    setHolidayError('');
  };

  const handleRemoveHoliday = (date) => {
    if (!provider) return;
    const currentHolidays = provider.holidays || [];
    const updatedHolidays = currentHolidays.filter((d) => !areDatesEqual(d, date));
    setProvider({
      ...provider,
      holidays: updatedHolidays,
      blockedDates: updatedHolidays
    });
  };

  const handleSaveSettings = async () => {
    if (!provider || isSaving) return;
    setIsSaving(true);
    setSaveError('');

    try {
      const updated = await ProviderService.updateProviderInfo({
        workingDays: provider.workingDays,
        workingHours: provider.workingHours,
        holidays: provider.holidays,
        blockedDates: provider.holidays,
        isOnline: provider.isOnline
      });

      if (updated) {
        setShowSaveSuccess(true);
        setTimeout(() => {
          setShowSaveSuccess(false);
        }, 2000);
      } else {
        throw new Error('Failed to save availability settings.');
      }
    } catch (err) {
      console.error('Save availability error:', err);
      setSaveError(err.message || 'Unable to save availability settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div>
          <div className="h-8 bg-slate-800 rounded-lg w-64 animate-pulse" />
          <div className="h-4 bg-slate-800 rounded-lg w-96 mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <LoadingSkeleton type="card" count={2} />
          </div>
          <div>
            <LoadingSkeleton type="card" count={1} />
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !provider) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-red-500/20 text-center space-y-4 max-w-lg mx-auto mt-12 shadow-2xl">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Failed to Load Availability</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{loadError || 'Unable to retrieve provider account.'}</p>
        <button
          onClick={fetchInfo}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shadow-lg"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">Availability Management</h2>
        <p className="text-slate-400 text-sm mt-1">Configure your online presence, working hours, active days, and scheduled holidays.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Online/Offline & Working Days setup */}
        <div className="lg:col-span-2 space-y-8">
          {/* Online status card */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 shadow-xl flex flex-col sm:flex-row justify-between sm:items-center gap-6 relative overflow-hidden">
            <div className="space-y-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block">Status Control</span>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Power className="w-5 h-5 text-blue-500" />
                Go Online & Accept Requests
              </h3>
              <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                Toggle your online state. If offline, customer bookings are paused and you will not appear in listings.
              </p>
            </div>

            <button
              onClick={handleOnlineToggle}
              className={`flex items-center justify-center p-1.5 rounded-2xl border transition-all duration-300 ${
                provider.isOnline
                  ? 'bg-green-500/15 border-green-500/30 text-green-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              {provider.isOnline ? (
                <ToggleRight className="w-14 h-9" />
              ) : (
                <ToggleLeft className="w-14 h-9" />
              )}
            </button>
          </div>

          {/* Working Days scheduler */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 shadow-xl space-y-6">
            <div className="space-y-2">
              <h3 className="font-bold text-white text-base">Select Working Days</h3>
              <p className="text-xs text-slate-500">Pick which days of the week you are ready to serve clients.</p>
            </div>
            <hr className="border-slate-800" />

            <div className="flex flex-wrap gap-2.5">
              {availableDays.map((day) => {
                const isSelected = provider.workingDays?.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => handleDayToggle(day)}
                    className={`px-5 py-3 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500/10 shadow-lg shadow-blue-500/25'
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex items-start gap-2.5 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
              <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Changes to working days will apply only to new booking requests. Existing active schedules will remain unaffected.
              </p>
            </div>
          </div>

          {/* Working Hours scheduler */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base">Working Hours</h3>
                <p className="text-xs text-slate-500">Define hours of availability per working day.</p>
              </div>
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                {formatWorkingHours(provider.workingHours)}
              </span>
            </div>
            <hr className="border-slate-800" />

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 block ml-1">Shift Start Time</label>
                <input
                  type="time"
                  value={provider.workingHours?.start || '09:00'}
                  onChange={(e) => handleHourChange('start', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 block ml-1">Shift End Time</label>
                <input
                  type="time"
                  value={provider.workingHours?.end || '18:00'}
                  onChange={(e) => handleHourChange('end', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Holidays list */}
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-bold text-white text-base">Mark Holidays</h3>
              <p className="text-xs text-slate-500">Prevent customer bookings on holiday dates.</p>
            </div>
            <hr className="border-slate-800" />

            {/* Holiday Input with DD/MM/YYYY format & mini calendar picker */}
            <form onSubmit={handleAddHoliday} className="space-y-2">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <DateInput
                    value={newHoliday}
                    onChange={(val) => {
                      setNewHoliday(val);
                      if (holidayError) setHolidayError('');
                    }}
                    placeholder="DD/MM/YYYY"
                    error={holidayError}
                    darkMode={true}
                  />
                </div>
                <Button type="submit" size="sm" className="px-3 h-[42px] mt-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </form>

            {/* Holidays List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {provider.holidays?.map((date) => (
                <div key={date} className="p-3 bg-slate-950/40 rounded-2xl border border-white/5 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>{formatDateDDMMYYYY(date) || date}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveHoliday(date)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                    title="Remove Holiday"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(!provider.holidays || provider.holidays.length === 0) && (
                <p className="text-center text-xs text-slate-600 py-6 italic">No holidays marked yet.</p>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 space-y-2">
            {saveError && (
              <p className="text-xs text-red-400 text-center font-medium">{saveError}</p>
            )}

            <Button
              variant={showSaveSuccess ? 'ghost' : 'primary'}
              onClick={handleSaveSettings}
              disabled={isSaving || showSaveSuccess}
              className="w-full shadow-lg shadow-blue-500/10"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2 text-white font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Availability...
                </span>
              ) : showSaveSuccess ? (
                <span className="flex items-center justify-center gap-1.5 text-green-400 font-bold">
                  <Check className="w-4 h-4" /> Availability Saved!
                </span>
              ) : (
                'Save Availability'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderAvailability;
