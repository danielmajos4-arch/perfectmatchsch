/**
 * Achievement Notification Component
 * 
 * Displays a popup notification when an achievement is unlocked
 */

import { useEffect, useState } from 'react';
import { Achievement } from '@/lib/achievementService';
import { AchievementBadge } from './AchievementBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles } from 'lucide-react';

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
  onViewAll?: () => void;
}

export function AchievementNotification({
  achievement,
  onClose,
  onViewAll,
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50 w-full max-w-sm
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
      `}
    >
      <Card className="border-2 border-primary shadow-2xl bg-gradient-to-br from-background to-primary/5 animate-in slide-in-from-bottom-5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Achievement Badge */}
            <div className="relative">
              <AchievementBadge achievement={achievement} size="lg" unlocked={true} />
              <div className="absolute -top-2 -right-2 animate-pulse">
                <Sparkles className="h-5 w-5 text-yellow-400" />
              </div>
            </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-lg text-primary">Achievement Unlocked!</h3>
                      <p className="text-sm font-semibold">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {achievement.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {achievement.points && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        +{achievement.points} points
                      </Badge>
                    </div>
                  )}

                  {onViewAll && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => {
                        setIsVisible(false);
                        setTimeout(() => {
                          onClose();
                          onViewAll();
                        }, 300);
                      }}
                    >
                      View All Achievements
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
  );
}

