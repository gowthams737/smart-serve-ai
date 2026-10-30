import React from 'react';

const FilterComponent = ({ options = [], activeFilter, onFilterChange, className = '' }) => {
  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onFilterChange(option.value)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-300 ${
            activeFilter === option.value
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default FilterComponent;
