/**
 * Profile Completion Circle Component
 * 
 * Enhanced profile completion visualization with circular progress indicator
 */

import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ArrowRight, User, FileText, BookOpen, Upload, Award, Trophy, TrendingUp } from 'lucide-react';
import type { Teacher } from '@shared/schema';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileCompletionCircleProps {
  teacher: Teacher;
  completionPercentage: number;
  showImpact?: boolean;
  showRewards?: boolean;
}

interface Step {
  id: string;
  label: string;
  description: string;
  icon: typeof User;
  isComplete: boolean;
  link?: string;
  weight: number; // Weight for completion calculation
}

export function ProfileCompletionCircle({
  teacher,
  completionPercentage,
  showImpact = true,
  showRewards = true,
}: ProfileCompletionCircleProps) {
  const { user } = useAuth();
  const { achievements } = useAchievements();

  const steps: Step[] = [
    {
      id: 'profile',
      label: 'Basic Information',
      description: 'Name, phone, location, bio',
      icon: User,
      isComplete: !!(teacher.full_name && teacher.phone && teacher.location),
      link: '/profile',
      weight: 20,
    },
    {
      id: 'quiz',
      label: 'Archetype Quiz',
      description: 'Complete the teaching archetype assessment',
      icon: BookOpen,
      isComplete: !!teacher.archetype,
      link: teacher.archetype ? undefined : '/onboarding/teacher',
      weight: 25,
    },
    {
      id: 'subjects',
      label: 'Subjects & Grade Levels',
      description: 'Select your teaching subjects and grade levels',
      icon: Award,
      isComplete: !!(teacher.subjects?.length > 0 && teacher.grade_levels?.length > 0),
      link: '/profile',
      weight: 20,
    },
    {
      id: 'resume',
      label: 'Resume Upload',
      description: 'Upload your resume or portfolio',
      icon: Upload,
      isComplete: !!teacher.resume_url,
      link: '/profile',
      weight: 20,
    },
    {
      id: 'photo',
      label: 'Profile Photo',
      description: 'Add a professional profile photo',
      icon: FileText,
      isComplete: !!teacher.profile_photo_url,
      link: '/profile',
      weight: 15,
    },
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const totalSteps = steps.length;
  const incompleteSteps = steps.filter(s => !s.isComplete);
  const nextStep = incompleteSteps[0];

  // Calculate radius and circumference for SVG circle
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (completionPercentage / 100) * circumference;

  // Get impact message based on completion
  const getImpactMessage = () => {
    if (completionPercentage >= 100) {
      return "Your profile is complete! You're seeing maximum matches.";
    } else if (completionPercentage >= 75) {
      return "Almost there! Complete your profile to see 2x more matches.";
    } else if (completionPercentage >= 50) {
      return "Complete your profile to see 3x more matches and unlock achievements.";
    } else {
      return "Complete your profile to unlock more job matches and achievements.";
    }
  };

  // Check if profile complete achievement is unlocked
  const hasProfileCompleteAchievement = achievements.some(a => a.code === 'profile_complete');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Profile Completion</CardTitle>
            <CardDescription className="text-sm">Complete your profile to unlock more opportunities</CardDescription>
          </div>
          {completionPercentage === 100 && (
            <Trophy className="h-6 w-6 text-yellow-500" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Circular Progress Indicator */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative flex-shrink-0">
            <svg
              className="transform -rotate-90"
              width="140"
              height="140"
              viewBox="0 0 140 140"
            >
              {/* Background circle */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out ${
                  completionPercentage >= 100
                    ? 'text-green-500'
                    : completionPercentage >= 75
                    ? 'text-primary'
                    : completionPercentage >= 50
                    ? 'text-yellow-500'
                    : 'text-orange-500'
                }`}
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">{completionPercentage}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {completedSteps}/{totalSteps} steps
                </div>
              </div>
            </div>
          </div>

          {/* Section Breakdown */}
          <div className="flex-1 space-y-3 min-w-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {step.isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span
                        className={`text-sm font-medium ${
                          step.isComplete ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Impact Message */}
        {showImpact && completionPercentage < 100 && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">Boost Your Matches</p>
                <p className="text-xs text-muted-foreground">{getImpactMessage()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Next Step CTA */}
        {nextStep && (
          <div className="pt-4 border-t">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Next Step</p>
                <p className="text-xs text-muted-foreground">
                  {nextStep.label}: {nextStep.description}
                </p>
              </div>
              {nextStep.link && (
                <Link href={nextStep.link}>
                  <Button size="sm" className="gap-2">
                    Complete
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Achievement Reward Message */}
        {showRewards && !hasProfileCompleteAchievement && completionPercentage < 100 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  Unlock Achievement
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Complete your profile to 100% to unlock the "Profile Complete" achievement badge!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Completion Celebration */}
        {completionPercentage === 100 && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                  Profile Complete! 🎉
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Your profile is fully optimized for maximum job matches.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

