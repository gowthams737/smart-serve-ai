import React from 'react';
import { cn } from '../utils/cn';

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  icon: Icon,
  ...props 
}) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-white',
    outline: 'border-2 border-blue-600/50 hover:border-blue-600 text-blue-400 hover:bg-blue-600/10',
    ghost: 'hover:bg-slate-800 text-slate-300 hover:text-white',
    danger: 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5',
    lg: 'px-8 py-3.5 text-lg'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon className="w-5 h-5" />}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
