import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Button from '../components/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 bg-slate-950 text-white relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950" />
      
      <div className="w-full max-w-md text-center space-y-8 p-10 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl">
        <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-3">
          <h1 className="text-6xl font-black bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">404</h1>
          <h2 className="text-xl font-bold">Page Not Found</h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Sorry, the page you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="pt-4">
          <Link to="/">
            <Button size="lg" className="w-full flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
