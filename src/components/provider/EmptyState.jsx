import React from 'react';
import { Database, Plus } from 'lucide-react';
import Button from '../Button';

const EmptyState = ({
  title = 'No data found',
  message = 'Get started by creating something new.',
  icon: Icon = Database,
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-slate-900/20 border border-slate-800/60 backdrop-blur-xl ${className}`}>
      <div className="p-4 bg-slate-900 border border-slate-800 text-slate-500 rounded-2xl mb-4 flex items-center justify-center">
        <Icon size={32} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-6">{message}</p>
      {actionText && onAction && (
        <Button onClick={onAction} className="shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4 mr-2" /> {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
