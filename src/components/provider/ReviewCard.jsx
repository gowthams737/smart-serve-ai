import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send } from 'lucide-react';
import RatingStars from './RatingStars';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';

const ReviewCard = ({ review, onReplySubmit }) => {
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (onReplySubmit) {
      onReplySubmit(review.id, replyText);
    }
    setReplyText('');
    setIsReplying(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-slate-800 flex items-center justify-center">
            {review.customerImage ? (
              <img src={review.customerImage} alt={review.customerName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-blue-400">{review.customerName?.charAt(0)}</span>
            )}
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">{review.customerName}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <RatingStars rating={review.rating} size={14} />
              <span className="text-[10px] text-slate-500 font-medium">{formatDateDDMMYYYY(review.date) || review.date}</span>
            </div>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {review.serviceTaken}
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed font-medium">
        {review.comment}
      </p>

      {review.reply ? (
        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-white/5 space-y-1 ml-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Your Response</span>
          </div>
          <p className="text-xs text-slate-400 leading-normal font-medium">{review.reply}</p>
        </div>
      ) : (
        <div className="ml-4">
          {!isReplying ? (
            <button
              onClick={() => setIsReplying(true)}
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 font-bold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Reply to Review
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2 mt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2 text-xs rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReplying(false);
                  setReplyText('');
                }}
                className="text-[10px] text-slate-500 hover:text-slate-400 font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ReviewCard;
