import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ArrowRight, User, FileText, BookOpen, Upload, Award } from 'lucide-react';
import type { Teacher } from '@shared/schema';

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
        {completionPercentage < 100 && (
          <div className="mt-6 pt-4 border-t border-border">
            <Link href="/profile">
              <Button variant="outline" className="w-full gap-2">
                <User className="h-4 w-4" />
                Complete All Steps
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
