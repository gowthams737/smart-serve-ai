import React, { useState } from 'react';
import { HelpCircle, Mail, Phone, MessageSquare, Send, Check } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';

const HelpCenter = () => {
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    { q: 'How does booking a service work?', a: 'You search for the category of service you require, browse through background-checked, qualified professionals in your area, and request an appointment instantly.' },
    { q: 'Can I cancel my booking?', a: 'Yes, bookings can be cancelled before the provider starts work. Cancellations are refunded within 3-5 business days.' },
    { q: 'How do you verify your partners?', a: 'Every provider undergoes criminal background screening, reference verification, and skill certification tests.' },
    { q: 'How does payment work?', a: 'We secure your payment upon booking. Payout is released to the provider only after you confirm service completion.' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSupportSubmitted(true);
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto space-y-12 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-white">Help & Support Center</h2>
        <p className="text-sm text-slate-400">Search guides, read common queries, or get in touch with our customer success team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* FAQs */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-500" /> Frequently Asked Questions
          </h3>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className="p-5 bg-slate-900/50 border border-white/10 rounded-2xl cursor-pointer"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>{faq.q}</span>
                  <span className="text-blue-500">{openFaq === i ? '−' : '+'}</span>
                </div>
                {openFaq === i && (
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-3 border-t border-slate-800 pt-3">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="p-6 bg-slate-900/50 border border-white/10 rounded-[32px] shadow-xl">
          {!supportSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-base font-bold text-white mb-4">Contact Support Team</h3>

              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              <Input
                label="Subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-medium">Message Body</label>
                <textarea
                  rows={3}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we assist you today?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <Button type="submit" className="w-full flex items-center justify-center gap-1.5">
                <Send className="w-4 h-4" /> Send Message
              </Button>
            </form>
          ) : (
            <div className="text-center py-10 space-y-4">
              <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-base">Ticket Submitted</h4>
              <p className="text-xs text-slate-400 leading-normal px-4">
                Thank you! Your inquiry has been registered. One of our support executives will follow up via email within 24 hours.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default HelpCenter;
