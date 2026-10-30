import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Lock,
  Award,
  Clock,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Check,
  AlertCircle,
  IndianRupee,
  MapPin
} from 'lucide-react';
import Input from '../../components/Input';
import Button from '../../components/Button';
import ImageUploadComponent from '../../components/provider/ImageUploadComponent';
import { ProviderService } from '../../services/providerService';
import { formatWorkingHours } from '../../utils/timeFormat';

const defaultCategories = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'AC Repair',
  'Home Cleaning',
  'Deep Cleaning',
  'Pest Control',
  'RO Water Purifier',
  'Gardening',
  'Beautician',
  'Interior Designer'
];

const pricingUnits = [
  'Per Visit',
  'Per Hour',
  'Per Sq.Ft',
  'Per BHK',
  'Per Session',
  'Per Project',
  'Per Service',
  'Per Day'
];

const getRecommendedUnit = (cat) => {
  const c = (cat || '').toLowerCase();
  if (c.includes('paint') || c.includes('interior')) return 'Per Sq.Ft';
  if (c.includes('clean') || c.includes('pest')) return 'Per BHK';
  if (c.includes('beautician') || c.includes('tutor')) return 'Per Session';
  if (c.includes('cctv')) return 'Per Project';
  if (c.includes('electric') || c.includes('carpenter')) return 'Per Hour';
  return 'Per Visit';
};

const ProviderRegister = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [categories, setCategories] = useState(defaultCategories);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    category: 'Electrician',
    serviceRate: '',
    pricingUnit: 'Per Hour',
    bio: '',
    gender: 'Male',
    age: '',
    workingHours: { start: '09:00', end: '18:00' },
    experience: '',
    profilePhoto: ''
  });

  useEffect(() => {
    // Load existing service categories from backend
    const loadCategories = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/customer/services');
        const data = await res.json();
        if (data.success && Array.isArray(data.services) && data.services.length > 0) {
          const names = data.services.map(s => s.name);
          setCategories(names);
          if (!names.includes(formData.category)) {
            setFormData(prev => ({ ...prev, category: names[0] }));
          }
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    loadCategories();
  }, []);

  const validateStep = (step) => {
    const stepErrors = {};

    if (step === 1) {
      // 1. Full Name
      if (!formData.fullName.trim()) {
        stepErrors.fullName = 'Full Name is required';
      } else if (formData.fullName.trim().length < 2) {
        stepErrors.fullName = 'Full Name must be at least 2 characters';
      }

      // 2. Email Address
      if (!formData.email.trim()) {
        stepErrors.email = 'Email address is required';
      } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
        stepErrors.email = 'Please enter a valid email address';
      }

      // 3. Phone Number
      const phoneDigits = formData.phone.replace(/[\s\-()+]/g, '');
      if (!formData.phone.trim()) {
        stepErrors.phone = 'Phone number is required';
      } else if (phoneDigits.length < 10 || isNaN(phoneDigits)) {
        stepErrors.phone = 'Please enter a valid 10-digit phone number';
      }

      // 8. Gender
      if (!formData.gender) {
        stepErrors.gender = 'Please select your gender';
      }

      // 9. Age
      const numAge = Number(formData.age);
      if (!formData.age || formData.age.toString().trim() === '') {
        stepErrors.age = 'Age is required';
      } else if (isNaN(numAge) || numAge < 18 || numAge > 100) {
        stepErrors.age = 'Age must be between 18 and 100';
      }

      // 6. Password
      if (!formData.password) {
        stepErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        stepErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        stepErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (step === 2) {
      // 4. Service Category
      if (!formData.category) {
        stepErrors.category = 'Service Category is required';
      }

      // Mandatory Service Rate
      const numRate = Number(formData.serviceRate);
      if (formData.serviceRate === '' || formData.serviceRate === undefined || formData.serviceRate === null) {
        stepErrors.serviceRate = 'Service rate is mandatory';
      } else if (isNaN(numRate) || numRate <= 0) {
        stepErrors.serviceRate = 'Please enter a valid rate greater than ₹0';
      }

      if (!formData.pricingUnit) {
        stepErrors.pricingUnit = 'Pricing unit is required';
      }

      // 11. Years of Experience
      const numExp = Number(formData.experience);
      const numAge = Number(formData.age);
      if (formData.experience === '' || formData.experience === undefined) {
        stepErrors.experience = 'Years of experience is required';
      } else if (isNaN(numExp) || numExp < 0 || numExp > 50) {
        stepErrors.experience = 'Experience must be a valid number between 0 and 50';
      } else if (numAge && numExp > (numAge - 15)) {
        stepErrors.experience = `Experience cannot exceed ${numAge - 15} years based on your age`;
      }

      // 10. Working Hours
      if (!formData.workingHours.start) {
        stepErrors.workingHoursStart = 'Start time is required';
      }
      if (!formData.workingHours.end) {
        stepErrors.workingHoursEnd = 'End time is required';
      }

      // 5. Professional Bio
      if (!formData.bio.trim()) {
        stepErrors.bio = 'Professional bio / description is required';
      } else if (formData.bio.trim().length < 15) {
        stepErrors.bio = 'Please provide a brief bio (at least 15 characters)';
      }
    } else if (step === 3) {
      // 7. Profile Image
      if (!formData.profilePhoto) {
        stepErrors.profilePhoto = 'Please upload a profile photo';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    setServerError('');
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setServerError('');
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      await ProviderService.registerProvider({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        category: formData.category,
        serviceRate: Number(formData.serviceRate),
        rate: Number(formData.serviceRate),
        pricingUnit: formData.pricingUnit,
        bio: formData.bio.trim(),
        about: formData.bio.trim(),
        gender: formData.gender,
        age: Number(formData.age),
        experience: Number(formData.experience),
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        workingHours: formData.workingHours,
        profilePhoto: formData.profilePhoto,
        photo: formData.profilePhoto,
        profileImage: formData.profilePhoto
      });

      navigate('/provider/dashboard');
    } catch (err) {
      console.error(err);
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = [
    'Account & Personal Info',
    'Professional & Work Details',
    'Profile Image'
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 bg-slate-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 blur-[150px] rounded-full -z-10" />

      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 group mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-blue-500/20">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              SmartServe AI Partner
            </span>
          </Link>
          <h2 className="text-3xl font-extrabold text-white mb-2">Service Provider Registration</h2>
          <p className="text-slate-400">Join our network of verified home service professionals</p>
        </div>

        {/* Form Panel */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[32px] shadow-2xl">
          {serverError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Progress Bar & Indicators */}
          <div className="mb-10 space-y-4">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Step {currentStep} of 3</span>
              <span className="text-blue-400">{stepTitles[currentStep - 1]}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
              {stepTitles.map((_, index) => (
                <div
                  key={index}
                  className={`h-full flex-1 transition-all duration-500 border-r border-slate-900 last:border-0 ${
                    index + 1 <= currentStep
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <AnimatePresence mode="wait">
              {/* STEP 1: Personal & Account Info */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold text-white mb-4">Personal & Login Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Full Name"
                      icon={User}
                      placeholder="Full name"
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
                      placeholder="Email address"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: '' });
                      }}
                      error={errors.email}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <Input
                        label="Phone Number"
                        icon={Phone}
                        placeholder="Phone number"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (errors.phone) setErrors({ ...errors, phone: '' });
                        }}
                        error={errors.phone}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-400 block ml-1">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => {
                          setFormData({ ...formData, gender: e.target.value });
                          if (errors.gender) setErrors({ ...errors, gender: '' });
                        }}
                        className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.gender && <p className="text-xs text-red-500 ml-1">{errors.gender}</p>}
                    </div>

                    <div>
                      <Input
                        label="Age"
                        type="number"
                        min="18"
                        max="100"
                        placeholder="Age"
                        value={formData.age}
                        onChange={(e) => {
                          setFormData({ ...formData, age: e.target.value });
                          if (errors.age) setErrors({ ...errors, age: '' });
                        }}
                        error={errors.age}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Login Password"
                      type="password"
                      icon={Lock}
                      placeholder="At least 6 characters"
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
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value });
                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                      }}
                      error={errors.confirmPassword}
                    />
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Professional & Work Details */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold text-white mb-4">Professional & Work Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-400 block ml-1">Service Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          const recommendedUnit = getRecommendedUnit(newCat);
                          setFormData({ ...formData, category: newCat, pricingUnit: recommendedUnit });
                          if (errors.category) setErrors({ ...errors, category: '' });
                        }}
                        className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {errors.category && <p className="text-xs text-red-500 ml-1">{errors.category}</p>}
                    </div>

                    <Input
                      label="Years of Experience"
                      type="number"
                      min="0"
                      max="50"
                      icon={Award}
                      placeholder="Years of experience"
                      value={formData.experience}
                      onChange={(e) => {
                        setFormData({ ...formData, experience: e.target.value });
                        if (errors.experience) setErrors({ ...errors, experience: '' });
                      }}
                      error={errors.experience}
                    />
                  </div>

                  {/* Mandatory Service Rate & Pricing Unit */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Service Rate (₹) *"
                      type="number"
                      min="1"
                      icon={IndianRupee}
                      placeholder="Rate"
                      value={formData.serviceRate}
                      onChange={(e) => {
                        setFormData({ ...formData, serviceRate: e.target.value });
                        if (errors.serviceRate) setErrors({ ...errors, serviceRate: '' });
                      }}
                      error={errors.serviceRate}
                    />

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-400 block ml-1">Pricing Unit *</label>
                      <select
                        value={formData.pricingUnit}
                        onChange={(e) => {
                          setFormData({ ...formData, pricingUnit: e.target.value });
                          if (errors.pricingUnit) setErrors({ ...errors, pricingUnit: '' });
                        }}
                        className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                      >
                        {pricingUnits.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      {errors.pricingUnit && <p className="text-xs text-red-500 ml-1">{errors.pricingUnit}</p>}
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-500" /> Working Hours
                      </label>
                      <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                        {formatWorkingHours(formData.workingHours)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Start Time</label>
                        <input
                          type="time"
                          value={formData.workingHours.start}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              workingHours: { ...formData.workingHours, start: e.target.value }
                            });
                            if (errors.workingHoursStart) setErrors({ ...errors, workingHoursStart: '' });
                          }}
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                        />
                        {errors.workingHoursStart && (
                          <p className="text-xs text-red-500 mt-1">{errors.workingHoursStart}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">End Time</label>
                        <input
                          type="time"
                          value={formData.workingHours.end}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              workingHours: { ...formData.workingHours, end: e.target.value }
                            });
                            if (errors.workingHoursEnd) setErrors({ ...errors, workingHoursEnd: '' });
                          }}
                          className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                        />
                        {errors.workingHoursEnd && (
                          <p className="text-xs text-red-500 mt-1">{errors.workingHoursEnd}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Service Territory (Fixed to Coimbatore) */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-400 block ml-1 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-500" /> Service Location
                    </label>
                    <div className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 text-sm flex items-center justify-between">
                      <span>Coimbatore, Tamil Nadu, India</span>
                      <span className="text-[10px] font-bold text-blue-400 uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Exclusive Region</span>
                    </div>
                    <p className="text-[11px] text-slate-500 ml-1">Providers register and offer services exclusively within Coimbatore.</p>
                  </div>

                  {/* Professional Bio */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-400 block ml-1">
                      Professional Bio / Description
                    </label>
                    <textarea
                      rows={4}
                      value={formData.bio}
                      onChange={(e) => {
                        setFormData({ ...formData, bio: e.target.value });
                        if (errors.bio) setErrors({ ...errors, bio: '' });
                      }}
                      placeholder="Describe your expertise, past experience, and quality of service you deliver to customers..."
                      className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all duration-300"
                    />
                    {errors.bio && <p className="text-xs text-red-500 ml-1">{errors.bio}</p>}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Profile Image */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-bold text-white mb-2">Profile Image</h3>
                  <p className="text-sm text-slate-400">
                    Upload a clear professional photo of yourself. This image will be displayed on your provider profile and visible to customers searching for services.
                  </p>

                  <div className="max-w-md mx-auto">
                    <ImageUploadComponent
                      label="Upload Profile Photo"
                      value={formData.profilePhoto}
                      onChange={(val) => {
                        setFormData({ ...formData, profilePhoto: val });
                        if (errors.profilePhoto) setErrors({ ...errors, profilePhoto: '' });
                      }}
                      type="image"
                    />
                    {errors.profilePhoto && (
                      <p className="text-xs text-red-500 text-center mt-2">{errors.profilePhoto}</p>
                    )}
                  </div>

                  {/* Summary Preview Box */}
                  <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-3 mt-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration Summary</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Name:</span>
                        <span className="text-white font-semibold">{formData.fullName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Email:</span>
                        <span className="text-white font-semibold">{formData.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Phone:</span>
                        <span className="text-white font-semibold">{formData.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Category:</span>
                        <span className="text-blue-400 font-semibold">{formData.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Gender & Age:</span>
                        <span className="text-white font-semibold">{formData.gender}, {formData.age} yrs</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Experience:</span>
                        <span className="text-white font-semibold">{formData.experience} years</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Service Pricing:</span>
                        <span className="text-blue-400 font-bold">
                          ₹{formData.serviceRate || 0} / {formData.pricingUnit}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 block">Working Hours:</span>
                        <span className="text-white font-semibold">
                          {formatWorkingHours(formData.workingHours)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step Navigation Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800/80">
              {currentStep > 1 ? (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleBack}
                  className="font-semibold text-slate-300 hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleNext}
                  className="font-semibold px-8 shadow-lg shadow-blue-500/25"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  type="submit"
                  loading={loading}
                  className="font-semibold px-8 shadow-lg shadow-blue-500/25 bg-gradient-to-r from-blue-600 to-cyan-500"
                >
                  <Check className="w-4 h-4 mr-2" /> Submit Registration
                </Button>
              )}
            </div>
          </form>

          <p className="mt-8 text-center text-slate-400 text-sm">
            Already registered as a partner?{' '}
            <Link to="/login" className="text-white font-semibold hover:text-blue-500 transition-all">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProviderRegister;