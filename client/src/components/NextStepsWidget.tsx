import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Briefcase, MessageCircle, FileText, TrendingUp, Sparkles } from 'lucide-react';
import type { Teacher, Job } from '@shared/schema';

interface NextStepsWidgetProps {
  teacher: Teacher;
  matchedJobsCount?: number;
  unreadMessagesCount?: number;
  recentApplicationsCount?: number;
}

export function NextStepsWidget({
  teacher,
  matchedJobsCount = 0,
  unreadMessagesCount = 0,
  recentApplicationsCount = 0,
}: NextStepsWidgetProps) {
  const steps = [
    {
      id: 'jobs',
      label: 'Explore Matched Jobs',
      description: `${matchedJobsCount} new job${matchedJobsCount !== 1 ? 's' : ''} matched to your archetype`,
      icon: Briefcase,
      link: '/dashboard',
      action: 'View Jobs',
      priority: matchedJobsCount > 0 ? 'high' : 'normal',
    },
    {
      id: 'messages',
      label: 'Check Messages',
      description: unreadMessagesCount > 0
        ? `${unreadMessagesCount} unread message${unreadMessagesCount !== 1 ? 's' : ''}`
        : 'No new messages',
      icon: MessageCircle,
      link: '/messages',
      action: 'Open Messages',
      priority: unreadMessagesCount > 0 ? 'high' : 'normal',
    },
    {
      id: 'applications',
      label: 'Track Applications',
      description: `${recentApplicationsCount} active application${recentApplicationsCount !== 1 ? 's' : ''}`,
      icon: FileText,
      link: '/dashboard',
      action: 'View Applications',
      priority: recentApplicationsCount > 0 ? 'normal' : 'low',
    },
    {
      id: 'profile',
      label: 'Complete Profile',
      description: teacher.profile_complete
        ? 'Profile complete! Keep it updated'
        : 'Finish your profile to get better matches',
      icon: TrendingUp,
      link: '/profile',
      action: teacher.profile_complete ? 'Update Profile' : 'Complete Profile',
      priority: !teacher.profile_complete ? 'high' : 'low',
    },
  ];

  const highPrioritySteps = steps.filter(s => s.priority === 'high');
  const normalSteps = steps.filter(s => s.priority === 'normal');

  return (
    <Card className="p-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Your Next Steps</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {highPrioritySteps.length > 0 && (
          <>
            {highPrioritySteps.map((step) => {
              const Icon = step.icon;
              return (
                <Link key={step.id} href={step.link}>
                  <div className="p-4 border border-primary/20 rounded-lg hover-elevate bg-primary/5 cursor-pointer transition-all">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground mb-1 break-words">{step.label}</h4>
                          <p className="text-sm text-muted-foreground break-words">{step.description}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1 flex-shrink-0 whitespace-nowrap">
                        {step.action}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </>
        )}
        {normalSteps.length > 0 && (
          <div className="pt-2 space-y-2">
            {normalSteps.map((step) => {
              const Icon = step.icon;
              return (
                <Link key={step.id} href={step.link}>
                  <div className="p-3 border border-border rounded-lg hover-elevate cursor-pointer transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground mb-1 break-words">{step.label}</h4>
                          <p className="text-xs text-muted-foreground break-words">{step.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

