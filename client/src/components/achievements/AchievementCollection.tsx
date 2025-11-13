/**
 * Achievement Collection Component
 * 
 * Displays a collection of achievements in a grid layout
 */

import { useState, useEffect } from 'react';
import { AchievementBadge } from './AchievementBadge';
import { Achievement, getUserAchievements, getAllAchievements } from '@/lib/achievementService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface AchievementCollectionProps {
  userId: string;
  showProgress?: boolean;
  compact?: boolean;
}

export function AchievementCollection({
  userId,
  showProgress = true,
  compact = false,
}: AchievementCollectionProps) {
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  async function loadAchievements() {
    setLoading(true);
    try {
      const [unlocked, all] = await Promise.all([
        getUserAchievements(userId),
        getAllAchievements(),
      ]);
      setUnlockedAchievements(unlocked);
      setAllAchievements(all);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  }

  const categories = ['all', 'profile', 'application', 'matching', 'engagement', 'milestone'];
  const unlockedIds = new Set(unlockedAchievements.map((a) => a.id));

  const filteredAchievements =
    selectedCategory === 'all'
      ? allAchievements
      : allAchievements.filter((a) => a.category === selectedCategory);

  const unlockedCount = unlockedAchievements.length;
  const totalCount = allAchievements.length;
  const progressPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {unlockedAchievements.slice(0, 5).map((achievement) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            size="sm"
            unlocked={true}
          />
        ))}
        {unlockedCount > 5 && (
          <Badge variant="secondary" className="h-8 px-3">
            +{unlockedCount - 5} more
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>
              {unlockedCount} of {totalCount} unlocked
            </CardDescription>
          </div>
          {showProgress && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{progressPercentage}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          )}
        </div>
        {showProgress && (
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-4">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="text-xs capitalize">
                {category === 'all' ? 'All' : category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-0">
            {filteredAchievements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No achievements in this category
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredAchievements.map((achievement) => {
                  const isUnlocked = unlockedIds.has(achievement.id);
                  const unlockedAchievement = unlockedAchievements.find(
                    (a) => a.id === achievement.id
                  );

                  return (
                    <div key={achievement.id} className="flex flex-col items-center gap-2">
                      <AchievementBadge
                        achievement={unlockedAchievement || achievement}
                        size="md"
                        unlocked={isUnlocked}
                      />
                      <div className="text-center">
                        <div
                          className={`text-xs font-medium ${
                            isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {achievement.name}
                        </div>
                        {achievement.points && (
                          <div className="text-xs text-muted-foreground">
                            {achievement.points} pts
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

