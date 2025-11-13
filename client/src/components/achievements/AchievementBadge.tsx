/**
 * Achievement Badge Component
 * 
 * Displays a single achievement badge with icon, name, and rarity styling
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Achievement } from '@/lib/achievementService';
import { Trophy, Star, Award, Medal, Crown } from 'lucide-react';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showPoints?: boolean;
  unlocked?: boolean;
  className?: string;
}

const rarityConfig = {
  common: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    icon: Star,
  },
  uncommon: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-700 dark:text-green-300',
    icon: Award,
  },
  rare: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-700 dark:text-blue-300',
    icon: Medal,
  },
  epic: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-700 dark:text-purple-300',
    icon: Trophy,
  },
  legendary: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: Crown,
  },
};

const sizeConfig = {
  sm: {
    container: 'w-8 h-8 text-xs',
    icon: 'w-4 h-4',
    text: 'text-xs',
  },
  md: {
    container: 'w-12 h-12 text-base',
    icon: 'w-6 h-6',
    text: 'text-sm',
  },
  lg: {
    container: 'w-16 h-16 text-lg',
    icon: 'w-8 h-8',
    text: 'text-base',
  },
};

export function AchievementBadge({
  achievement,
  size = 'md',
  showName = false,
  showPoints = false,
  unlocked = true,
  className = '',
}: AchievementBadgeProps) {
  const rarity = achievement.rarity || 'common';
  const config = rarityConfig[rarity];
  const sizeStyle = sizeConfig[size];
  const IconComponent = config.icon;

  const badgeContent = (
    <div
      className={`
        ${sizeStyle.container}
        ${config.bg}
        ${config.border}
        ${unlocked ? 'opacity-100' : 'opacity-50 grayscale'}
        border-2 rounded-full
        flex items-center justify-center
        transition-all duration-200
        ${unlocked ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}
        ${className}
      `}
    >
      {achievement.icon ? (
        <span className={`${sizeStyle.text} ${config.text}`}>{achievement.icon}</span>
      ) : (
        <IconComponent className={`${sizeStyle.icon} ${config.text}`} />
      )}
    </div>
  );

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold">{achievement.name}</div>
      <div className="text-xs text-muted-foreground">{achievement.description}</div>
      {showPoints && achievement.points && (
        <div className="text-xs text-primary">{achievement.points} points</div>
      )}
      {achievement.unlocked_at && (
        <div className="text-xs text-muted-foreground">
          Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
        </div>
      )}
      {!unlocked && (
        <div className="text-xs text-muted-foreground italic">Locked</div>
      )}
    </div>
  );

  if (showName) {
    return (
      <div className="flex flex-col items-center gap-2">
        {badgeContent}
        <div className={`${sizeStyle.text} ${config.text} text-center font-medium`}>
          {achievement.name}
        </div>
        {showPoints && achievement.points && (
          <div className="text-xs text-muted-foreground">{achievement.points} pts</div>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

