/**
 * Match Score Indicator Component
 * 
 * Visualizes match score with color-coded strength levels and breakdown
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface MatchScoreIndicatorProps {
  score: number; // 0-100
  maxScore?: number; // Default 100
  showBreakdown?: boolean;
  breakdown?: {
    archetype?: number;
    subject?: number;
    gradeLevel?: number;
    location?: number;
  };
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-primary';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-orange-600 dark:text-orange-400';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'bg-primary/10';
  if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-orange-100 dark:bg-orange-900/30';
};

const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent Match';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Fair Match';
  return 'Low Match';
};

const getScoreIcon = (score: number) => {
  if (score >= 80) return CheckCircle2;
  if (score >= 60) return TrendingUp;
  if (score >= 40) return AlertCircle;
  return XCircle;
};

export function MatchScoreIndicator({
  score,
  maxScore = 100,
  showBreakdown = false,
  breakdown,
  size = 'md',
  showLabel = true,
  className = '',
}: MatchScoreIndicatorProps) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const color = getScoreColor(percentage);
  const bgColor = getScoreBgColor(percentage);
  const label = getScoreLabel(percentage);
  const Icon = getScoreIcon(percentage);

  const sizeConfig = {
    sm: {
      text: 'text-lg',
      icon: 'h-4 w-4',
      progress: 'h-1.5',
    },
    md: {
      text: 'text-2xl',
      icon: 'h-5 w-5',
      progress: 'h-2',
    },
    lg: {
      text: 'text-3xl',
      icon: 'h-6 w-6',
      progress: 'h-2.5',
    },
  };

  const config = sizeConfig[size];

  const breakdownContent = breakdown && (
    <div className="space-y-2 mt-3 pt-3 border-t">
      {breakdown.archetype !== undefined && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Archetype Match</span>
          <div className="flex items-center gap-2">
            <Progress value={breakdown.archetype} className="w-20 h-1.5" />
            <span className="font-medium w-10 text-right">{breakdown.archetype}%</span>
          </div>
        </div>
      )}
      {breakdown.subject !== undefined && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Subject Match</span>
          <div className="flex items-center gap-2">
            <Progress value={breakdown.subject} className="w-20 h-1.5" />
            <span className="font-medium w-10 text-right">{breakdown.subject}%</span>
          </div>
        </div>
      )}
      {breakdown.gradeLevel !== undefined && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Grade Level</span>
          <div className="flex items-center gap-2">
            <Progress value={breakdown.gradeLevel} className="w-20 h-1.5" />
            <span className="font-medium w-10 text-right">{breakdown.gradeLevel}%</span>
          </div>
        </div>
      )}
      {breakdown.location !== undefined && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Location</span>
          <div className="flex items-center gap-2">
            <Progress value={breakdown.location} className="w-20 h-1.5" />
            <span className="font-medium w-10 text-right">{breakdown.location}%</span>
          </div>
        </div>
      )}
    </div>
  );

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Score Display */}
      <div className={`flex items-center gap-2 ${bgColor} px-3 py-1.5 rounded-lg`}>
        <Icon className={`${config.icon} ${color}`} />
        <span className={`${config.text} font-bold ${color}`}>{score}</span>
        {showLabel && (
          <Badge variant="secondary" className="text-xs ml-1">
            {label}
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      <div className="flex-1 min-w-0">
        <Progress value={percentage} className={config.progress} />
      </div>
    </div>
  );

  if (showBreakdown && breakdown) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{content}</div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <div className="font-semibold mb-2">Match Breakdown</div>
              {breakdownContent}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

/**
 * Compact Match Score Badge
 * For use in lists/cards where space is limited
 */
export function MatchScoreBadge({ score, maxScore = 100 }: { score: number; maxScore?: number }) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const color = getScoreColor(percentage);
  const bgColor = getScoreBgColor(percentage);

  return (
    <div className={`inline-flex items-center gap-1.5 ${bgColor} px-2 py-1 rounded-md`}>
      <div className={`h-2 w-2 rounded-full ${color.replace('text-', 'bg-')}`} />
      <span className={`text-xs font-semibold ${color}`}>{score}</span>
    </div>
  );
}

