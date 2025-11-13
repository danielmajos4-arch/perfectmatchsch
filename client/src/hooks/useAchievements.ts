/**
 * Achievement Hook
 * 
 * Manages achievement state, checking, and notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  Achievement,
  getUserAchievements,
  checkAllAchievements,
  getUserAchievementStats,
} from '@/lib/achievementService';

export function useAchievements() {
  const { user } = useAuth();
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [lastCheckedCount, setLastCheckedCount] = useState(0);

  // Fetch user achievements
  const {
    data: achievements = [],
    isLoading,
    refetch,
  } = useQuery<Achievement[]>({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getUserAchievements(user.id);
    },
    enabled: !!user?.id,
  });

  // Fetch achievement stats
  const { data: stats } = useQuery({
    queryKey: ['achievement-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await getUserAchievementStats(user.id);
    },
    enabled: !!user?.id,
  });

  // Check for new achievements
  const checkAchievements = useCallback(async () => {
    if (!user?.id) return;
    
    // Silently handle errors - achievements are non-critical
    try {
      const newAchievements = await checkAllAchievements(user.id);
      
      // If we have new achievements, show notification for the first one
      if (newAchievements.length > 0 && achievements.length > lastCheckedCount) {
        const latestAchievement = newAchievements[0];
        setNewAchievement(latestAchievement);
        setLastCheckedCount(achievements.length);
      }

      // Refetch to update the list
      await refetch();
    } catch {
      // Silently handle errors - achievements are non-critical
      // Don't spam console with achievement errors
    }
  }, [user?.id, achievements.length, lastCheckedCount, refetch]);

  // Check achievements on mount and periodically
  useEffect(() => {
    if (!user?.id) return;

    // Initial check
    checkAchievements();

    // Check every 30 seconds
    const interval = setInterval(checkAchievements, 30000);

    return () => clearInterval(interval);
  }, [user?.id, checkAchievements]);

  // Update last checked count when achievements change
  useEffect(() => {
    if (achievements.length > 0 && lastCheckedCount === 0) {
      setLastCheckedCount(achievements.length);
    }
  }, [achievements.length, lastCheckedCount]);

  const dismissNotification = useCallback(() => {
    setNewAchievement(null);
  }, []);

  return {
    achievements,
    stats,
    isLoading,
    newAchievement,
    dismissNotification,
    checkAchievements,
    refetch,
  };
}

