import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, CheckCircle, ArrowRight, Briefcase, Camera } from 'lucide-react';
import { AuthService } from '../services/authService';
import Input from '../components/Input';
import Button from '../components/Button';
import ImageUploadComponent from '../components/provider/ImageUploadComponent';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profilePhoto: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    setRegisterError('');
    try {
      const { confirmPassword, ...userData } = formData;
      const user = await AuthService.register({
        ...userData,
        role: 'Customer',
        profilePhoto: formData.profilePhoto,
        photo: formData.profilePhoto,
        profileImage: formData.profilePhoto
      });
      navigate('/customer/dashboard');
    } catch (err) {
      setRegisterError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950" />
      
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-white mb-2">Create Customer Account</h2>
          <p className="text-slate-400">Join SmartServe to book and manage expert home services</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[32px] shadow-2xl">
          {/* Role Choice Banner */}
          <div className="flex items-center justify-between p-4 mb-6 bg-slate-800/50 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-white">Registering as Customer</p>
                <p className="text-xs text-slate-400">Need to offer services instead?</p>
              </div>
            </div>
            <Link
              to="/provider/register"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" /> Service Provider Registration
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {registerError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                {registerError}
              </div>
            )}

            <div>
              <ImageUploadComponent
                label="Profile Photo (Optional)"
                value={formData.profilePhoto}
                onChange={(val) => setFormData({ ...formData, profilePhoto: val })}
                type="image"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                icon={User}
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (errors.fullName) setErrors({ ...errors, fullName: '' });
                }}
                error={errors.fullName}
              />
              <Input
                label="Email Address"
                type="email"
                icon={Mail}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                error={errors.email}
              />
            </div>

            <Input
              label="Phone Number"
              icon={Phone}
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              error={errors.phone}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Password"
                type="password"
                icon={Lock}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                error={errors.password}
              />
              <Input
                label="Confirm Password"
                type="password"
                icon={Lock}
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                }}
                error={errors.confirmPassword}
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
              <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-400">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create Customer Account <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </form>

          <p className="mt-8 text-center text-slate-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-white font-semibold hover:text-blue-500 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
