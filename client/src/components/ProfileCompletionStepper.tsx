import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ArrowRight, User, FileText, BookOpen, Upload, Award, Trophy, TrendingUp } from 'lucide-react';
import type { Teacher } from '@shared/schema';
import { useAchievements } from '@/hooks/useAchievements';

interface ProfileCompletionStepperProps {
  teacher: Teacher;
  completionPercentage: number;
}

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isComplete: boolean;
  link?: string;
}

export function ProfileCompletionStepper({ teacher, completionPercentage }: ProfileCompletionStepperProps) {
  const { achievements } = useAchievements();
  
  const steps: Step[] = [
    {
      id: 'profile',
      label: 'Basic Information',
      description: 'Name, phone, location, bio',
      icon: User,
      isComplete: !!(teacher.full_name && teacher.phone && teacher.location),
      link: '/profile',
    },
    {
      id: 'quiz',
      label: 'Archetype Quiz',
      description: 'Complete the teaching archetype assessment',
      icon: BookOpen,
      isComplete: !!teacher.archetype,
      link: teacher.archetype ? undefined : '/onboarding/teacher',
    },
    {
      id: 'subjects',
      label: 'Subjects & Grade Levels',
      description: 'Select your teaching subjects and grade levels',
      icon: Award,
      isComplete: !!(teacher.subjects?.length > 0 && teacher.grade_levels?.length > 0),
      link: '/profile',
    },
    {
      id: 'resume',
      label: 'Resume Upload',
      description: 'Upload your resume or portfolio',
      icon: Upload,
      isComplete: !!teacher.resume_url,
      link: '/profile',
    },
    {
      id: 'photo',
      label: 'Profile Photo',
      description: 'Add a professional profile photo',
      icon: FileText,
      isComplete: !!teacher.profile_photo_url,
      link: '/profile',
    },
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const totalSteps = steps.length;
  const incompleteSteps = steps.filter(s => !s.isComplete);
  const nextStep = incompleteSteps[0];
  
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
    <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl mb-1">Complete Your Profile</CardTitle>
            <CardDescription>
              {completionPercentage < 100
                ? `Complete ${totalSteps - completedSteps} more step${totalSteps - completedSteps !== 1 ? 's' : ''} to unlock better job matches`
                : 'Your profile is complete! 🎉'}
            </CardDescription>
          </div>
          <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'} className="text-lg px-3 py-1">
            {completionPercentage}%
          </Badge>
        </div>
        <Progress value={completionPercentage} className="h-2 mt-4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      step.isComplete
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border'
                    }`}
                  >
                    {step.isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 h-8 mt-1 ${
                        step.isComplete ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pt-2 min-w-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-semibold mb-1 break-words ${
                          step.isComplete ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </h4>
                      <p className="text-sm text-muted-foreground break-words">{step.description}</p>
                    </div>
                    {!step.isComplete && step.link && (
                      <Link href={step.link}>
                        <Button variant="ghost" size="sm" className="gap-1 flex-shrink-0 whitespace-nowrap">
                          Complete
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Impact Message */}
        {completionPercentage < 100 && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">Boost Your Matches</p>
                <p className="text-xs text-muted-foreground">{getImpactMessage()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Achievement Reward Message */}
        {!hasProfileCompleteAchievement && completionPercentage < 100 && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
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
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
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

        {completionPercentage < 100 && (
          <div className="mt-6 pt-4 border-t border-border">
            {nextStep && nextStep.link ? (
              <Link href={nextStep.link}>
                <Button className="w-full gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Complete Next Step: {nextStep.label}
                </Button>
              </Link>
            ) : (
              <Link href="/profile">
                <Button variant="outline" className="w-full gap-2">
                  <User className="h-4 w-4" />
                  Complete All Steps
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
