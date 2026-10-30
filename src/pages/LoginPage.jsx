import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight, User, Briefcase, CheckCircle } from 'lucide-react';
import { AuthService } from '../services/authService';
import Input from '../components/Input';
import Button from '../components/Button';

const LoginPage = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [selectedRole, setSelectedRole] = useState('Customer');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!selectedRole) {
      setAuthError('Please select a role (Customer or Service Provider) to continue.');
      return;
    }

    setLoading(true);
    setAuthError('');
    try {
      const user = await AuthService.login(formData.email, formData.password, selectedRole);
      // Direct redirection based on user role from database
      if (user.role === 'Customer') {
        navigate('/customer/dashboard');
      } else if (user.role === 'Provider') {
        navigate('/provider/dashboard');
      } else if (user.role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/customer/dashboard');
      }
    } catch (err) {
      setAuthError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-slate-400">Login to your SmartServe account</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-[32px] shadow-2xl">
          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Login As</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setSelectedRole('Customer'); setAuthError(''); }}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all duration-200 ${
                  selectedRole === 'Customer'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                    : 'bg-slate-800/40 border-white/10 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <User className={`w-5 h-5 mb-1 ${selectedRole === 'Customer' ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold">Customer</span>
                <span className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight">Book & manage services</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedRole('Provider'); setAuthError(''); }}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all duration-200 ${
                  selectedRole === 'Provider'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                    : 'bg-slate-800/40 border-white/10 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <Briefcase className={`w-5 h-5 mb-1 ${selectedRole === 'Provider' ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold">Service Provider</span>
                <span className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight">Manage services & jobs</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {successMessage && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl animate-in fade-in zoom-in-95 duration-300">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{successMessage}</p>
              </div>
            )}

            {authError && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl animate-in fade-in zoom-in-95 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{authError}</p>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setErrors({ ...errors, email: '' });
              }}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                setErrors({ ...errors, password: '' });
              }}
              error={errors.password}
            />

            <div className="flex items-center justify-end">
              <a href="#" className="text-sm text-blue-500 hover:text-blue-400 font-medium">Forgot password?</a>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Login <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </form>

          <p className="mt-8 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-white font-semibold hover:text-blue-500 transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
