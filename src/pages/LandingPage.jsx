import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CustomerService } from '../services/customerService';
import { ArrowRight, Star, CheckCircle, Smartphone, Zap, Shield, Sparkles, Bot, MapPin, Calculator, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/Button';

const LandingPage = () => {
  const recommendedForYou = [
    { name: 'Annual AC Deep Chemical Wash', category: 'AC Repair', price: '₹699', rating: 4.8, match: '98% Match' },
    { name: 'Full Home Pest Control & Sanitization', category: 'Pest Control', price: '₹1,199', rating: 4.7, match: '94% Match' },
    { name: 'Monsoon Electrical Safety Checkup', category: 'Electrician', price: '₹350', rating: 4.9, match: '92% Match' }
  ];

  const frequentlyBookedTogether = [
    { title: 'Monsoon Home Guard Pack', services: 'Pest Control + Deep Cleaning', price: '₹3,899', discount: '17% OFF' },
    { title: 'Power & Cooling Maintenance', services: 'Electrician Check + AC Servicing', price: '₹699', discount: '18% OFF' }
  ];

  const popularInCoimbatore = [
    { name: 'Electrician', location: 'Peelamedu', demand: 'High Demand' },
    { name: 'AC Servicing', location: 'RS Puram', demand: 'Very High' },
    { name: 'Deep Cleaning', location: 'Saibaba Colony', demand: 'Trending' },
    { name: 'Interior Design', location: 'Race Course', demand: 'Popular' }
  ];

  const [topRatedProfessionals, setTopRatedProfessionals] = useState([]);

  useEffect(() => {
    const fetchTop = async () => {
      try {
        const list = await CustomerService.getTopProviders();
        setTopRatedProfessionals(list);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTop();
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>AI-Powered Home Service Platform</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold mb-8 leading-tight">
              The Smarter Way to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">
                Serve and Connect.
              </span>
            </h1>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Experience the future of service management in Coimbatore with AI provider matching, intelligent price estimation, and instant scheduling.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full">
                  Register
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  Login
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Happy Clients in Coimbatore', value: '10k+' },
              { label: 'Verified Experts', value: '500+' },
              { label: 'AI Match Success Rate', value: '99%' },
              { label: 'Localities Covered', value: '15+' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-slate-500 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended For You Section */}
      <section className="py-20 px-6 bg-slate-950">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-blue-500 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4" /> AI Recommendations
              </span>
              <h2 className="text-3xl font-extrabold text-white">Recommended For You</h2>
            </div>
            <Link to="/customer/ai-recommendations" className="text-blue-500 font-bold text-xs hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendedForYou.map((item, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase">
                    {item.match}
                  </span>
                  <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500" /> {item.rating}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">{item.category}</span>
                  <h3 className="text-lg font-bold text-white mt-1">{item.name}</h3>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-xl font-black text-blue-400">{item.price}</span>
                  <Link to="/login" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">
                    Book Service
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Frequently Booked Together & Popular in Coimbatore */}
      <section className="py-20 px-6">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Frequently Booked Together */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-blue-500" /> Frequently Booked Together
            </h3>
            <div className="space-y-4">
              {frequentlyBookedTogether.map((bundle, idx) => (
                <div key={idx} className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase">
                      {bundle.discount}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">{bundle.title}</h4>
                    <p className="text-xs text-slate-400">{bundle.services}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-blue-400 block">{bundle.price}</span>
                    <Link to="/login" className="text-xs text-blue-500 font-bold hover:underline">Book Package</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular in Coimbatore */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-6 h-6 text-blue-500" /> Popular in Coimbatore
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {popularInCoimbatore.map((pop, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-900/40 border border-white/10 space-y-2">
                  <span className="text-[10px] text-blue-400 font-bold uppercase">{pop.demand}</span>
                  <h4 className="font-bold text-white text-sm">{pop.name}</h4>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {pop.location}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Top Rated Professionals */}
      <section className="py-20 px-6 bg-slate-900/40 border-t border-b border-white/5">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <span className="text-blue-500 font-bold text-xs uppercase tracking-widest">Verified Experts</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">Top Rated Professionals</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topRatedProfessionals.slice(0, 3).map((pro, idx) => (
              <div key={pro.id || idx} className="p-6 rounded-3xl bg-slate-950 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-extrabold uppercase">
                    {pro.rating >= 4.8 ? 'Best Rated' : 'Verified Expert'}
                  </span>
                  <h4 className="text-base font-bold text-white mt-1">{pro.name}</h4>
                  <p className="text-xs text-slate-400">{pro.category} • {pro.city || 'Coimbatore'}</p>
                  <span className="text-xs text-amber-500 font-bold flex items-center gap-1 mt-1">
                    {pro.rating > 0 ? (
                      <>
                        <Star className="w-3.5 h-3.5 fill-amber-500" /> {pro.rating} ({pro.jobs || 0} Jobs)
                      </>
                    ) : (
                      <span className="text-blue-400 font-semibold">New Provider • {pro.jobs || 0} Jobs</span>
                    )}
                  </span>
                </div>
                <Link to="/login">
                  <Button size="sm">Hire</Button>
                </Link>
              </div>
            ))}
            {topRatedProfessionals.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                Verified service providers available in Coimbatore.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white">Why Choose SmartServe?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Our platform is built with the latest AI technology to ensure a seamless experience for both providers and customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Instant Booking',
                desc: 'Book your service in seconds with our optimized scheduling system.',
              },
              {
                icon: Shield,
                title: 'Secure Payments',
                desc: 'All transactions are encrypted and protected by industry-standard security.',
              },
              {
                icon: Smartphone,
                title: 'Mobile Ready',
                desc: 'Manage your appointments on the go with our fully responsive interface.',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -10 }}
                className="p-8 rounded-3xl bg-slate-900/50 border border-white/5 hover:border-blue-500/50 transition-colors"
              >
                <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6">
                  <feature.icon className="text-blue-500 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-white">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="relative overflow-hidden p-12 lg:p-20 rounded-[40px] bg-gradient-to-br from-blue-600 to-blue-800 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full" />
            <h2 className="text-3xl lg:text-5xl font-bold mb-8 text-white">Ready to elevate your service business?</h2>
            <p className="text-blue-100 mb-12 max-w-xl mx-auto text-lg">
              Join thousands of professionals already using SmartServe AI to grow their business.
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-slate-100">
                Register Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

