import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
import {
  formatDateDDMMYYYY,
  parseDDMMYYYY,
  isValidDDMMYYYY,
  getDaysInMonth,
  isLeapYear,
  getDayOfWeek,
  areDatesEqual
} from '../utils/dateFormat';

/**
 * Standardized DateInput component for SmartServe AI
 * Guarantees DD/MM/YYYY format throughout the application.
 * Supports direct typing with auto-masking, strict validation (leap years, max days),
 * and an interactive dropdown calendar with holiday/non-working day disabling.
 */
const DateInput = ({
  value = '',
  onChange,
  onDateChange,
  placeholder = 'DD/MM/YYYY',
  label,
  error: customError,
  disabledDates = [], // e.g. ['25/12/2026', '04/07/2026']
  disabledDaysOfWeek = [], // e.g. ['Sunday', 'Saturday']
  minDate, // DD/MM/YYYY or YYYY-MM-DD
  maxDate,
  disabled = false,
  className = '',
  darkMode = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [textValue, setTextValue] = useState(formatDateDDMMYYYY(value) || '');
  const [inputError, setInputError] = useState('');

  // Calendar view navigation state
  const today = new Date();
  const initialYear = value && isValidDDMMYYYY(value) ? parseDDMMYYYY(value).year : today.getFullYear();
  const initialMonth = value && isValidDDMMYYYY(value) ? parseDDMMYYYY(value).month : (today.getMonth() + 1);

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth); // 1-12

  const containerRef = useRef(null);

  // Synchronize internal text state when external value changes
  useEffect(() => {
    const formatted = formatDateDDMMYYYY(value) || '';
    setTextValue(formatted);
    if (formatted && isValidDDMMYYYY(formatted)) {
      const parsed = parseDDMMYYYY(formatted);
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
      setInputError('');
    }
  }, [value]);

  // Close calendar popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTextChange = (e) => {
    let input = e.target.value;
    
    // Allow digits and forward slashes
    input = input.replace(/[^\d/]/g, '');

    // Auto-insert slash after day and month if user is typing numbers
    if (input.length === 2 && !input.includes('/') && textValue.length < 2) {
      input = input + '/';
    } else if (input.length === 5 && input.split('/').length === 2 && textValue.length < 5) {
      input = input + '/';
    }

    if (input.length > 10) {
      input = input.substring(0, 10);
    }

    setTextValue(input);

    if (input.length === 10) {
      const parsed = parseDDMMYYYY(input);
      if (!parsed.valid) {
        setInputError(parsed.error || 'Invalid date format.');
      } else {
        setInputError('');
        const formatted = parsed.formatted;
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
        if (onChange) onChange(formatted);
        if (onDateChange) onDateChange(formatted);
      }
    } else if (input.length === 0) {
      setInputError('');
      if (onChange) onChange('');
      if (onDateChange) onDateChange('');
    }
  };

  const handleBlur = () => {
    if (textValue && textValue.length < 10) {
      setInputError('Please enter full date as DD/MM/YYYY.');
    }
  };

  const handleSelectDay = (day) => {
    const d = String(day).padStart(2, '0');
    const m = String(viewMonth).padStart(2, '0');
    const y = String(viewYear);
    const selectedDate = `${d}/${m}/${y}`;

    setTextValue(selectedDate);
    setInputError('');
    setIsOpen(false);

    if (onChange) onChange(selectedDate);
    if (onDateChange) onDateChange(selectedDate);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Build calendar matrix
  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDayOfMonthUTC = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay(); // 0 = Sun, 1 = Mon...
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonthName = monthNames[viewMonth - 1];

  const effectiveError = customError || inputError;

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-slate-400 block mb-1.5 ml-0.5">
          {label} <span className="text-[10px] text-slate-500 font-normal">(DD/MM/YYYY)</span>
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={textValue}
          onChange={handleTextChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={10}
          className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-200 outline-none pr-10 ${
            darkMode
              ? 'bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
          } ${effectiveError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />

        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`absolute right-2.5 p-1 rounded-lg transition-colors ${
            darkMode
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Open calendar"
        >
          <CalendarIcon className="w-4 h-4 text-blue-500" />
        </button>
      </div>

      {effectiveError && (
        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-red-400 ml-0.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{effectiveError}</span>
        </div>
      )}

      {/* Calendar Popup */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-2 z-50 w-72 p-3.5 rounded-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-xs tracking-wide">
              {currentMonthName} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank cells for offset */}
            {Array.from({ length: firstDayOfMonthUTC }).map((_, i) => (
              <div key={`empty-${i}`} className="w-8 h-8" />
            ))}

            {/* Days in month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dStr = String(day).padStart(2, '0');
              const mStr = String(viewMonth).padStart(2, '0');
              const yStr = String(viewYear);
              const cellDateStr = `${dStr}/${mStr}/${yStr}`;
              const dayOfWeek = getDayOfWeek(cellDateStr);

              const isSelected = textValue === cellDateStr;
              const isToday =
                today.getDate() === day &&
                today.getMonth() + 1 === viewMonth &&
                today.getFullYear() === viewYear;

              // Check if day is disabled (holiday, non-working day)
              const isHoliday = disabledDates.some(hd => areDatesEqual(hd, cellDateStr));
              const isNonWorkingDay = disabledDaysOfWeek.includes(dayOfWeek);
              const isDateDisabled = isHoliday || isNonWorkingDay;

              return (
                <button
                  type="button"
                  key={day}
                  disabled={isDateDisabled}
                  onClick={() => handleSelectDay(day)}
                  title={
                    isHoliday
                      ? 'Marked Holiday / Blocked Date'
                      : isNonWorkingDay
                      ? `Provider does not work on ${dayOfWeek}s`
                      : cellDateStr
                  }
                  className={`w-8 h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : isDateDisabled
                      ? 'text-slate-600 line-through cursor-not-allowed opacity-40 hover:bg-transparent'
                      : isToday
                      ? 'border border-blue-500/50 text-blue-400 hover:bg-blue-500/10'
                      : darkMode
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
            <span>Format: DD/MM/YYYY</span>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const d = String(now.getDate()).padStart(2, '0');
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const y = String(now.getFullYear());
                handleSelectDay(parseInt(d, 10));
              }}
              className="text-blue-400 hover:text-blue-300 font-bold"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateInput;
