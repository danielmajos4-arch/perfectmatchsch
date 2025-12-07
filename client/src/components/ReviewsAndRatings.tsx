import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, User, Calendar } from 'lucide-react';
import { createReview, getUserReviews, getAverageRating, canReview } from '@/lib/reviewService';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import type { Review } from '@shared/schema';

interface ReviewsAndRatingsProps {
  userId: string;
  reviewType: 'teacher_review' | 'school_review';
  jobId?: string;
  interviewId?: string;
  onReviewSubmitted?: () => void;
}

export function ReviewsAndRatings({
  userId,
  reviewType,
  jobId,
  interviewId,
  onReviewSubmitted,
}: ReviewsAndRatingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  // Check if user can review
  const { data: canReviewUser } = useQuery({
    queryKey: ['/api/can-review', user?.id, userId, jobId],
    queryFn: () => canReview(user?.id || '', userId, jobId),
    enabled: !!user?.id,
  });

  // Get existing reviews
  const { data: reviews } = useQuery<Review[]>({
    queryKey: ['/api/reviews', userId, reviewType],
    queryFn: () => getUserReviews(userId, reviewType),
  });

  // Get average rating
  const { data: ratingStats } = useQuery({
    queryKey: ['/api/average-rating', userId, reviewType],
    queryFn: () => getAverageRating(userId, reviewType),
  });

  const createMutation = useMutation({
    mutationFn: () => createReview({
      reviewerId: user?.id || '',
      revieweeId: userId,
      reviewType,
      jobId,
      interviewId,
      rating,
      title: title || undefined,
      comment: comment || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/average-rating', userId] });
      toast({
        title: 'Review submitted',
        description: 'Thank you for your feedback!',
      });
      setRating(0);
      setTitle('');
      setComment('');
      onReviewSubmitted?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to submit review',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Average Rating Display */}
      {ratingStats && ratingStats.totalReviews > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold">{ratingStats.averageRating.toFixed(1)}</div>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(ratingStats.averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {ratingStats.totalReviews} review{ratingStats.totalReviews !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Write Review Form */}
      {canReviewUser && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Rating *</Label>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground hover:text-yellow-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-title">Title (Optional)</Label>
              <Input
                id="review-title"
                placeholder="Brief summary of your experience"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="review-comment">Your Review *</Label>
              <Textarea
                id="review-comment"
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                required
              />
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!rating || !comment || createMutation.isPending}
            >
              Submit Review
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews && reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reviews ({reviews.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {!review.is_anonymous && review.reviewer && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {(review.reviewer as any)?.full_name || 'Anonymous'}
                        </span>
                      </div>
                    )}
                    {review.is_anonymous && (
                      <span className="text-muted-foreground">Anonymous</span>
                    )}
                    {review.is_verified && (
                      <Badge variant="secondary" className="text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {review.title && (
                  <h4 className="font-semibold mb-1">{review.title}</h4>
                )}
                <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(!reviews || reviews.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No reviews yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
