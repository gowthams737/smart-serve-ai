import React from 'react';
import { motion } from 'framer-motion';
import { Clock, IndianRupee, Edit, Trash2, Copy, ToggleLeft, ToggleRight, Layers } from 'lucide-react';
import Button from '../Button';

const ServiceCard = ({ service, onEdit, onDelete, onDuplicate, onToggleAvailability }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-3xl border border-white/10 bg-slate-900/40 overflow-hidden backdrop-blur-xl flex flex-col justify-between group hover:border-slate-700 transition-all duration-300 shadow-xl"
    >
      {/* Service Image */}
      <div className="relative h-48 overflow-hidden bg-slate-800 flex items-center justify-center">
        {service.image ? (
          <img
            src={service.image}
            alt={service.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement?.querySelector('.service-img-fallback');
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="service-img-fallback w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500 p-4 text-center"
          style={{ display: service.image ? 'none' : 'flex' }}
        >
          <Layers className="w-10 h-10 text-slate-600 mb-2" />
          <span className="text-xs font-semibold text-slate-400">{service.name}</span>
        </div>
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-950/80 backdrop-blur-md text-blue-400 border border-blue-500/20">
          {service.category}
        </div>
      </div>

      {/* Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <h4 className="text-lg font-bold text-white leading-tight">{service.name}</h4>
          <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
            {service.description}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>{service.time || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-0.5 text-blue-400 font-extrabold text-sm">
              <span className="text-xs font-bold mr-0.5">₹</span>
              <span>{(service.price ?? 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <hr className="border-white/5" />

          {/* Controls */}
          <div className="flex items-center justify-between gap-4 pt-1">
            {/* Availability Toggle */}
            <button
              onClick={() => onToggleAvailability(service.id, !service.isAvailable)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {service.isAvailable ? (
                <>
                  <ToggleRight className="w-6 h-6 text-green-500" />
                  <span>Available</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-6 h-6 text-slate-600" />
                  <span className="text-slate-500">Paused</span>
                </>
              )}
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onDuplicate(service.id)}
                title="Duplicate Service"
                className="p-2 rounded-xl bg-slate-950/60 text-slate-400 hover:text-white border border-white/5 hover:bg-slate-800 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onEdit(service)}
                title="Edit Service"
                className="p-2 rounded-xl bg-slate-950/60 text-blue-400 hover:text-blue-300 border border-blue-500/10 hover:bg-blue-600/10 transition-all"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(service.id)}
                title="Delete Service"
                className="p-2 rounded-xl bg-slate-950/60 text-red-400 hover:text-red-300 border border-red-500/10 hover:bg-red-600/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
