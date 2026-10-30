import React from 'react';
import { Star } from 'lucide-react';

const RatingStars = ({ rating = 5, maxStars = 5, size = 16, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= rating;
        const isHalf = !isFilled && starValue - 0.5 <= rating;

        return (
          <Star
            key={index}
            size={size}
            className={`${
              isFilled
                ? 'text-amber-400 fill-amber-400'
                : isHalf
                ? 'text-amber-400 fill-amber-400 opacity-70'
                : 'text-slate-600'
            }`}
          />
        );
      })}
    </div>
  );
};

export default RatingStars;
