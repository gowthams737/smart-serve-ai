import React from 'react';

const LoadingSkeleton = ({ type = 'card', count = 3, className = '' }) => {
  const renderSkeletons = () => {
    return Array.from({ length: count }).map((_, index) => {
      if (type === 'card') {
        return (
          <div key={index} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-800 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-800 rounded-md w-3/4" />
                <div className="h-3 bg-slate-800 rounded-md w-1/2" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 bg-slate-800 rounded-md w-full" />
              <div className="h-3 bg-slate-800 rounded-md w-5/6" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-10 bg-slate-800 rounded-xl flex-1" />
              <div className="h-10 bg-slate-800 rounded-xl flex-1" />
            </div>
          </div>
        );
      }

      if (type === 'stats') {
        return (
          <div key={index} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-slate-800 rounded-md w-1/3" />
              <div className="h-8 bg-slate-800 rounded-md w-1/2" />
              <div className="h-3 bg-slate-800 rounded-md w-2/3" />
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-xl" />
          </div>
        );
      }

      // Default: List item
      return (
        <div key={index} className="p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30 animate-pulse flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-slate-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-800 rounded-md w-1/3" />
              <div className="h-3 bg-slate-800 rounded-md w-1/4" />
            </div>
          </div>
          <div className="w-16 h-8 bg-slate-800 rounded-lg" />
        </div>
      );
    });
  };

  return <div className={`grid gap-6 ${className}`}>{renderSkeletons()}</div>;
};

export default LoadingSkeleton;
