import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Briefcase, MessageCircle, FileText, TrendingUp, Sparkles, AlertCircle, ChevronRight } from 'lucide-react';
import type { Teacher } from '@shared/schema';
import { cn } from '@/lib/utils';

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
      description: matchedJobsCount > 0
        ? `${matchedJobsCount} new job${matchedJobsCount !== 1 ? 's' : ''} matched to your archetype`
        : 'No new matches yet',
      icon: Briefcase,
      link: '/dashboard#matches',
      action: 'View',
      priority: matchedJobsCount > 0 ? 'high' : 'normal',
      hasNotification: matchedJobsCount > 0,
    },
    {
      id: 'messages',
      label: 'Check Messages',
      description: unreadMessagesCount > 0
        ? `${unreadMessagesCount} unread message${unreadMessagesCount !== 1 ? 's' : ''}`
        : 'No new messages',
      icon: MessageCircle,
      link: '/messages',
      action: 'Open',
      priority: unreadMessagesCount > 0 ? 'high' : 'normal',
      hasNotification: unreadMessagesCount > 0,
    },
    {
      id: 'applications',
      label: 'Track Applications',
      description: recentApplicationsCount > 0
        ? `${recentApplicationsCount} active application${recentApplicationsCount !== 1 ? 's' : ''}`
        : 'No active applications',
      icon: FileText,
      link: '/dashboard#applications',
      action: 'View',
      priority: recentApplicationsCount > 0 ? 'normal' : 'low',
      hasNotification: false,
    },
    {
      id: 'profile',
      label: 'Complete Profile',
      description: teacher.profile_complete
        ? 'Profile complete! Keep it updated'
        : 'Finish your profile to get better matches',
      icon: TrendingUp,
      link: '/profile',
      action: teacher.profile_complete ? 'Update' : 'Complete',
      priority: !teacher.profile_complete ? 'high' : 'low',
      hasNotification: !teacher.profile_complete,
    },
  ];

  // Sort by priority: high -> normal -> low
  const sortedSteps = [...steps].sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 0, normal: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const highPrioritySteps = sortedSteps.filter(s => s.priority === 'high');
  const otherSteps = sortedSteps.filter(s => s.priority !== 'high');

  const StepItem = ({ step, isHighPriority = false }: { step: typeof steps[0], isHighPriority?: boolean }) => {
    const Icon = step.icon;
    return (
      <Link href={step.link}>
        <div className={cn(
          "group flex items-center gap-4 p-3 rounded-xl transition-all duration-200 cursor-pointer border",
          isHighPriority
            ? "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:shadow-sm"
            : "bg-card border-transparent hover:bg-muted hover:border-border/50"
        )}>
          <div className={cn(
            "p-2.5 rounded-lg flex-shrink-0 transition-colors",
            isHighPriority ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground"
          )}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm text-foreground truncate">
                {step.label}
              </span>
              {step.hasNotification && (
                <Badge variant="destructive" className="h-4 px-1.5 text-[10px] rounded-full animate-pulse">
                  New
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate group-hover:text-foreground/80 transition-colors">
              {step.description}
            </p>
          </div>

          <div className="flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border/50">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Next Steps
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 flex-1 flex flex-col gap-6 overflow-y-auto">
        {highPrioritySteps.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Priority Actions
              </span>
            </div>
            <div className="space-y-2">
              {highPrioritySteps.map((step) => (
                <StepItem key={step.id} step={step} isHighPriority={true} />
              ))}
            </div>
          </div>
        )}

        {otherSteps.length > 0 && (
          <div className="space-y-3">
            <div className="px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Other Actions
              </span>
            </div>
            <div className="space-y-2">
              {otherSteps.map((step) => (
                <StepItem key={step.id} step={step} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
