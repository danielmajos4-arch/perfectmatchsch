/**
 * Achievement Service
 * 
 * Handles achievement checking, unlocking, and tracking
 */

import { supabase } from './supabaseClient';
import { useToast } from '@/hooks/use-toast';

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: 'profile' | 'application' | 'matching' | 'engagement' | 'milestone';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  unlocked_at?: string;
  progress?: Record<string, any>;
}

export interface AchievementProgress {
  achievement_id: string;
  code: string;
  name: string;
  progress_percentage: number;
  requirements_met: Record<string, any>;
}

/**
 * Check and unlock achievements for a user
 * This should be called after significant user actions
 */
export async function checkAndUnlockAchievements(
  userId: string,
  achievementCode?: string
): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase.rpc('check_and_unlock_achievements', {
      p_user_id: userId,
      p_achievement_code: achievementCode || null,
    });

    if (error) {
      // Silently handle database function errors (e.g., "record not assigned yet")
      // These are typically database schema/function issues, not critical app errors
      if (error.code === '55000' || error.message?.includes('not assigned yet')) {
        // Database function error - return empty array silently
        return [];
      }
      // Only log non-database-function errors
      console.error('Error checking achievements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    // Silently handle errors - achievements are non-critical
    return [];
  }
}

/**
 * Get all unlocked achievements for a user
 */
export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_achievements', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserAchievements:', error);
    return [];
  }
}

/**
 * Get achievement progress for locked achievements
 */
export async function getUserAchievementProgress(
  userId: string
): Promise<AchievementProgress[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_achievement_progress', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching achievement progress:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserAchievementProgress:', error);
    return [];
  }
}

/**
 * Get all available achievements (for display)
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('points', { ascending: false });

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllAchievements:', error);
    return [];
  }
}

/**
 * Mark achievement as notified (user has seen the notification)
 */
export async function markAchievementNotified(
  userId: string,
  achievementId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_achievements')
      .update({ is_notified: true })
      .eq('user_id', userId)
      .eq('achievement_id', achievementId);

    if (error) {
      console.error('Error marking achievement as notified:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAchievementNotified:', error);
    return false;
  }
}

/**
 * Get user's total achievement points
 */
export async function getUserTotalPoints(userId: string): Promise<number> {
  try {
    const achievements = await getUserAchievements(userId);
    return achievements.reduce((total, achievement) => total + (achievement.points || 0), 0);
  } catch (error) {
    console.error('Error calculating total points:', error);
    return 0;
  }
}

/**
 * Get user's achievement statistics
 */
export interface AchievementStats {
  totalAchievements: number;
  totalPoints: number;
  byCategory: Record<string, number>;
  byRarity: Record<string, number>;
}

export async function getUserAchievementStats(
  userId: string
): Promise<AchievementStats> {
  try {
    const achievements = await getUserAchievements(userId);

    const stats: AchievementStats = {
      totalAchievements: achievements.length,
      totalPoints: achievements.reduce((total, a) => total + (a.points || 0), 0),
      byCategory: {},
      byRarity: {},
    };

    achievements.forEach((achievement) => {
      // Count by category
      const category = achievement.category || 'other';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Count by rarity
      const rarity = achievement.rarity || 'common';
      stats.byRarity[rarity] = (stats.byRarity[rarity] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error calculating achievement stats:', error);
    return {
      totalAchievements: 0,
      totalPoints: 0,
      byCategory: {},
      byRarity: {},
    };
  }
}

/**
 * Achievement trigger points
 * Call checkAndUnlockAchievements after these actions:
 */

// After profile completion
export async function checkAchievementsOnProfileComplete(userId: string): Promise<void> {
  await checkAndUnlockAchievements(userId, 'profile_complete');
  await checkAndUnlockAchievements(userId, 'archetype_master');
}

// After submitting application
export async function checkAchievementsOnApplication(userId: string): Promise<void> {
  await checkAndUnlockAchievements(userId, 'first_application');
  await checkAndUnlockAchievements(userId, 'job_seeker');
}

// After job match
export async function checkAchievementsOnJobMatch(userId: string): Promise<void> {
  await checkAndUnlockAchievements(userId, 'perfect_match');
}

// After being shortlisted/hired
export async function checkAchievementsOnStatusUpdate(
  userId: string,
  status: string
): Promise<void> {
  if (status === 'shortlisted' || status === 'hired') {
    await checkAndUnlockAchievements(userId, 'top_candidate');
  }
  if (status === 'contacted') {
    await checkAndUnlockAchievements(userId, 'hot_candidate');
  }
}

// After sending message
export async function checkAchievementsOnMessage(userId: string): Promise<void> {
  await checkAndUnlockAchievements(userId, 'networker');
}

// After posting job (school)
export async function checkAchievementsOnJobPost(userId: string): Promise<void> {
  await checkAndUnlockAchievements(userId, 'first_job_posted');
}

// After hiring candidate (school)
export async function checkAchievementsOnHire(userId: string): Promise<void> {
  await checkAndUnlockAchievements(userId, 'hiring_manager');
}

/**
 * Check all achievements (useful for periodic checks or on login)
 */
export async function checkAllAchievements(userId: string): Promise<Achievement[]> {
  return await checkAndUnlockAchievements(userId);
}

