import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Menu, X, ShieldCheck } from 'lucide-react';
import { AuthService } from '../services/authService';
import { cleanImageUrl } from '../utils/imageUrl';
import Button from './Button';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update user state when location changes or profile-updated event fires
  useEffect(() => {
    setUser(AuthService.getCurrentUser());
    const handleProfileUpdate = () => {
      setUser(AuthService.getCurrentUser());
    };
    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, [location]);

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    navigate('/login');
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      isScrolled ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/10 py-3' : 'bg-transparent py-5'
    }`}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-blue-500/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            SmartServe AI
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
          <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
          <a href="#services" className="text-slate-300 hover:text-white transition-colors">Services</a>
          
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/profile" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full border border-blue-500/50 flex items-center justify-center bg-slate-800 group-hover:border-blue-500 transition-colors overflow-hidden">
                  {cleanImageUrl(user.profileImage) ? (
                    <img src={cleanImageUrl(user.profileImage)} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <span className="text-slate-200 group-hover:text-white">{user.fullName?.split(' ')[0]}</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-red-300">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary">Get Started</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-slate-300 hover:text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-slate-900 border-b border-white/10 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-4">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
            {user ? (
              <>
                <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>Profile</Link>
                <button onClick={handleLogout} className="text-left text-red-400">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
