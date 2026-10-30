import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, StarHalf, Filter, ArrowUpDown } from 'lucide-react';
import ReviewCard from '../../components/provider/ReviewCard';
import RatingStars from '../../components/provider/RatingStars';
import EmptyState from '../../components/provider/EmptyState';
import { ProviderService } from '../../services/providerService';
import { compareDatesDDMMYYYY } from '../../utils/dateFormat';

const ProviderReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [ratingFilter, setRatingFilter] = useState('All');
  const [sortOption, setSortOption] = useState('Newest');

  const fetchReviews = async () => {
    const list = await ProviderService.getReviews();
    setReviews(list);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleReplySubmit = async (reviewId, replyText) => {
    await ProviderService.addReviewReply(reviewId, replyText);
    await fetchReviews();
  };

  // Calculations for score distribution
  const totalReviewsCount = reviews.length;
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const percentage = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
    return { stars, count, percentage };
  });

  const averageRating =
    totalReviewsCount > 0
      ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviewsCount).toFixed(1)
      : '0.0';

  // Filters & sorting
  const filteredAndSortedReviews = reviews
    .filter((r) => ratingFilter === 'All' || r.rating === parseInt(ratingFilter))
    .sort((a, b) => {
      if (sortOption === 'Newest') {
        return compareDatesDDMMYYYY(b.date, a.date);
      }
      if (sortOption === 'Highest') {
        return b.rating - a.rating;
      }
      if (sortOption === 'Lowest') {
        return a.rating - b.rating;
      }
      return 0;
    });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">Customer Reviews</h2>
        <p className="text-slate-400 text-sm mt-1">Review feedback, rating averages, and write replies to customer ratings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Score Distribution summary */}
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 shadow-xl space-y-6">
          <h3 className="font-bold text-white text-base">Ratings Summary</h3>
          <hr className="border-slate-800" />

          {/* Average circle indicator */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950/40 rounded-2xl border border-white/5 text-center gap-2">
            <span className="text-4xl font-black text-white">{averageRating}</span>
            <RatingStars rating={parseFloat(averageRating)} size={18} />
            <span className="text-xs text-slate-500 font-semibold">{totalReviewsCount} Customer Reviews</span>
          </div>

          {/* Distribution chart */}
          <div className="space-y-3 pt-2">
            {ratingDistribution.map((dist) => (
              <div key={dist.stars} className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                <span className="w-10 whitespace-nowrap flex items-center gap-1">
                  {dist.stars} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                </span>
                
                {/* Progress bar wrapper */}
                <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: `${dist.percentage}%` }}
                  />
                </div>
                
                <span className="w-8 text-right text-slate-200">{dist.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Filters & reviews list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl">
            {/* Star ratings filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Ratings</option>
                <option value="5">5 Star Reviews</option>
                <option value="4">4 Star Reviews</option>
                <option value="3">3 Star Reviews</option>
              </select>
            </div>

            {/* Sort options */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Newest">Newest First</option>
                <option value="Highest">Highest Rated</option>
                <option value="Lowest">Lowest Rated</option>
              </select>
            </div>
          </div>

          {/* List */}
          {filteredAndSortedReviews.length === 0 ? (
            <EmptyState
              title="No reviews found"
              message="No reviews match your star rating filter choice."
              icon={Star}
            />
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredAndSortedReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onReplySubmit={handleReplySubmit}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderReviews;
