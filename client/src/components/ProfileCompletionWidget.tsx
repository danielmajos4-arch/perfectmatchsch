import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Upload, FileText, Award, BookOpen } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import type { Teacher } from '@shared/schema';

interface ProfileCompletionWidgetProps {
  teacher: Teacher;
}

export function ProfileCompletionWidget({ teacher }: ProfileCompletionWidgetProps) {
  const items = [
    {
      label: 'Basic info filled',
      completed: !!(teacher.full_name && teacher.phone && teacher.location),
      icon: CheckCircle2,
    },
    {
      label: 'Quiz completed',
      completed: !!teacher.archetype,
      icon: Award,
    },
    {
      label: 'Resume uploaded',
      completed: !!teacher.resume_url,
      icon: Upload,
    },
    {
      label: 'Teaching philosophy added',
      completed: !!teacher.teaching_philosophy,
      icon: FileText,
    },
    {
      label: 'Certifications added',
      completed: !!(teacher.certifications && teacher.certifications.length > 0),
      icon: Award,
    },
    {
      label: 'Portfolio/sample lessons uploaded',
      completed: !!teacher.portfolio_url,
      icon: BookOpen,
    },
  ];

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile Completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{completionPercentage}% Complete</span>
            <span className="text-muted-foreground">
              {completedCount} of {totalCount} items
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className={item.completed ? '' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {completionPercentage < 100 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Complete your profile to get 3x more views!
            </p>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="w-full">
                Complete Profile
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
