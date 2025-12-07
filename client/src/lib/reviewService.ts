/**
 * Reviews & Ratings Service
 */

import { supabase } from './supabaseClient';
import type { Review } from '@shared/schema';

export interface CreateReviewParams {
  reviewerId: string;
  revieweeId: string;
  reviewType: 'teacher_review' | 'school_review';
  jobId?: string;
  interviewId?: string;
  rating: number;
  title?: string;
  comment?: string;
  categories?: Record<string, number>;
  isAnonymous?: boolean;
}

/**
 * Create a review
 */
export async function createReview(params: CreateReviewParams): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      reviewer_id: params.reviewerId,
      reviewee_id: params.revieweeId,
      review_type: params.reviewType,
      job_id: params.jobId || null,
      interview_id: params.interviewId || null,
      rating: params.rating,
      title: params.title || null,
      comment: params.comment || null,
      categories: params.categories || {},
      is_anonymous: params.isAnonymous || false,
      is_verified: !!params.interviewId, // Verified if from interview
    })
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}

/**
 * Get reviews for a user
 */
export async function getUserReviews(
  userId: string,
  reviewType: 'teacher_review' | 'school_review'
): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:users!reviews_reviewer_id_fkey(full_name, profile_photo_url)
    `)
    .eq('reviewee_id', userId)
    .eq('review_type', reviewType)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Review[];
}

/**
 * Get average rating for a user
 */
export async function getAverageRating(
  userId: string,
  reviewType: 'teacher_review' | 'school_review'
): Promise<{ averageRating: number; totalReviews: number }> {
  const { data, error } = await supabase.rpc('get_average_rating', {
    p_user_id: userId,
    p_review_type: reviewType,
  });

  if (error) throw error;
  return {
    averageRating: parseFloat(data[0]?.average_rating || '0'),
    totalReviews: data[0]?.total_reviews || 0,
  };
}

/**
 * Check if user can review (hasn't reviewed this job yet)
 */
export async function canReview(
  reviewerId: string,
  revieweeId: string,
  jobId?: string
): Promise<boolean> {
  if (!jobId) return true;

  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('reviewer_id', reviewerId)
    .eq('reviewee_id', revieweeId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) throw error;
  return !data; // Can review if no existing review
}
