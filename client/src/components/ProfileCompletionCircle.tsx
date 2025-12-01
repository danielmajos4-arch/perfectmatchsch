/**
 * Profile Completion Circle Component
 * 
 * Professional profile completion visualization with table-based step tracking
 */

import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Circle, ArrowRight, User, FileText, BookOpen, Upload, Award, Trophy, TrendingUp, Rocket } from 'lucide-react';
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

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Profile Completion</CardTitle>
            <CardDescription className="text-sm mt-1">
              Complete your profile to unlock more opportunities
            </CardDescription>
          </div>
          {completionPercentage === 100 && (
            <Trophy className="h-5 w-5 text-yellow-500" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Progress Indicator - Compact */}
        <div className="flex items-center justify-center gap-6">
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
                className="text-muted"
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
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{completionPercentage}%</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {completedSteps}/{totalSteps}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Step</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.map((step) => {
                const Icon = step.icon;
                const StepRow = (
                  <TableRow 
                    key={step.id}
                    className={step.isComplete ? 'bg-green-50/50 dark:bg-green-950/10' : ''}
                  >
                    <TableCell className="w-12">
                      {step.isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${
                            step.isComplete ? 'text-foreground' : 'text-foreground'
                          }`}>
                            {step.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-24 text-right">
                      {!step.isComplete && step.link && (
                        <Link href={step.link}>
                          <Button variant="ghost" size="sm" className="h-8">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
                
                return step.link && !step.isComplete ? (
                  <Link key={step.id} href={step.link} className="contents">
                    {StepRow}
                  </Link>
                ) : (
                  StepRow
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Consolidated Action Section */}
        {completionPercentage < 100 && (
          <div className="space-y-3">
            {nextStep && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Next Step: {nextStep.label}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {nextStep.description}
                    </p>
                    {nextStep.link && (
                      <Link href={nextStep.link}>
                        <Button size="sm" className="gap-2">
                          Complete Now
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showRewards && !hasProfileCompleteAchievement && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Complete your profile to unlock the "Profile Complete" achievement badge
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completion Celebration */}
        {completionPercentage === 100 && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">
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
