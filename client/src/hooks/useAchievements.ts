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
  const { user, role } = useAuth();
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [lastCheckedCount, setLastCheckedCount] = useState(0);

  // Only enable achievements for teachers (schools don't have achievements)
  const isTeacher = role === 'teacher';

  // Fetch user achievements
  const {
    data: achievements = [],
    isLoading,
    refetch,
  } = useQuery<Achievement[]>({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user?.id || !isTeacher) return [];
      return await getUserAchievements(user.id);
    },
    enabled: !!user?.id && isTeacher,
  });

  // Fetch achievement stats
  const { data: stats } = useQuery({
    queryKey: ['achievement-stats', user?.id],
    queryFn: async () => {
      if (!user?.id || !isTeacher) return null;
      return await getUserAchievementStats(user.id);
    },
    enabled: !!user?.id && isTeacher,
  });

  // Check for new achievements
  const checkAchievements = useCallback(async () => {
    if (!user?.id || !isTeacher) return; // Skip for school users
    
    // Silently handle errors - achievements are non-critical
    try {
      const newAchievements = await checkAllAchievements(user.id);
      
      // If achievement system is disabled, don't try again
      if (!newAchievements || newAchievements.length === 0) {
        return;
      }
      
      // If we have new achievements, show notification for the first one
      if (newAchievements.length > 0 && achievements.length > lastCheckedCount) {
        const latestAchievement = newAchievements[0];
        setNewAchievement(latestAchievement);
        setLastCheckedCount(achievements.length);
      }

      // Refetch to update the list (only if we got achievements)
      if (newAchievements.length > 0) {
        await refetch();
      }
    } catch {
      // Silently handle errors - achievements are non-critical
      // Don't spam console with achievement errors
    }
  }, [user?.id, isTeacher, achievements.length, lastCheckedCount, refetch]);

  // Check achievements on mount and periodically (with longer interval to reduce spam)
  useEffect(() => {
    if (!user?.id || !isTeacher) return; // Skip for school users

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkAchievements, 2000);

    // Check every 60 seconds (reduced from 30 to minimize spam)
    const interval = setInterval(checkAchievements, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user?.id, isTeacher, checkAchievements]);

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

