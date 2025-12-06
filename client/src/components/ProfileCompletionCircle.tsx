/**
 * Profile Completion Circle Component
 * 
 * Professional profile completion visualization with table-based step tracking
 */

import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ArrowRight, User, FileText, BookOpen, Upload, Award, Trophy, TrendingUp, Rocket, ChevronRight } from 'lucide-react';
import type { Teacher } from '@shared/schema';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
  weight: number;
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
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (completionPercentage / 100) * circumference;

  // Check if profile complete achievement is unlocked
  const hasProfileCompleteAchievement = achievements.some(a => a.code === 'profile_complete');

  const StepItem = ({ step }: { step: Step }) => {
    const Icon = step.icon;
    const content = (
      <div className={cn(
        "group flex items-center gap-4 p-3 rounded-xl transition-all duration-200 border",
        step.isComplete
          ? "bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900/20"
          : "bg-card border-transparent hover:bg-muted hover:border-border/50 cursor-pointer"
      )}>
        <div className="flex-shrink-0">
          {step.isComplete ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground/30" />
          )}
        </div>

        <div className={cn(
          "p-2.5 rounded-lg flex-shrink-0 transition-colors",
          step.isComplete ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground"
        )}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-semibold text-sm truncate",
            step.isComplete ? "text-foreground" : "text-foreground"
          )}>
            {step.label}
          </p>
          <p className="text-xs text-muted-foreground truncate group-hover:text-foreground/80 transition-colors">
            {step.description}
          </p>
        </div>

        {!step.isComplete && step.link && (
          <div className="flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );

    return step.link && !step.isComplete ? (
      <Link href={step.link}>
        {content}
      </Link>
    ) : (
      content
    );
  };

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Profile Completion</CardTitle>
            <CardDescription className="text-sm mt-1">
              Complete your profile to unlock more opportunities
            </CardDescription>
          </div>
          {completionPercentage === 100 && (
            <Trophy className="h-5 w-5 text-yellow-500 animate-bounce" />
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Progress Indicator - Compact */}
        <div className="flex items-center justify-center py-2">
          <div className="relative flex-shrink-0">
            <svg
              className="transform -rotate-90"
              width="120"
              height="120"
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-1000 ease-out",
                  completionPercentage >= 100 ? "text-green-500" :
                    completionPercentage >= 75 ? "text-primary" :
                      completionPercentage >= 50 ? "text-yellow-500" : "text-orange-500"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-foreground tracking-tight">{completionPercentage}%</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {completedSteps}/{totalSteps} Steps
              </span>
            </div>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          {steps.map((step) => (
            <StepItem key={step.id} step={step} />
          ))}
        </div>

        {/* Consolidated Action Section */}
        {completionPercentage < 100 && (
          <div className="space-y-3 mt-auto pt-4 border-t border-border/50">
            {nextStep && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground mb-0.5">
                      Next Step: {nextStep.label}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                      {nextStep.description}
                    </p>
                    {nextStep.link && (
                      <Link href={nextStep.link}>
                        <Button size="sm" className="w-full sm:w-auto h-8 text-xs gap-2 shadow-sm">
                          Complete Now
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showRewards && !hasProfileCompleteAchievement && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-center gap-3">
                <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex-shrink-0">
                  <Rocket className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                  Complete your profile to unlock the "Profile Complete" badge
                </p>
              </div>
            )}
          </div>
        )}

        {/* Completion Celebration */}
        {completionPercentage === 100 && (
          <div className="mt-auto p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-900 dark:text-green-100">
                  Profile Complete! 🎉
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
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
