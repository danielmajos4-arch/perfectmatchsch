import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Briefcase, MessageCircle, FileText, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import type { Teacher } from '@shared/schema';

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
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const highPrioritySteps = sortedSteps.filter(s => s.priority === 'high');
  const otherSteps = sortedSteps.filter(s => s.priority !== 'high');

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Next Steps
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {highPrioritySteps.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Priority Actions
              </span>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableBody>
                  {highPrioritySteps.map((step) => {
                    const Icon = step.icon;
                    const row = (
                      <TableRow 
                        key={step.id}
                        className="hover:bg-primary/5 cursor-pointer border-b last:border-b-0"
                      >
                        <TableCell className="w-12">
                          <div className="p-1.5 rounded-md bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {step.label}
                              </span>
                              {step.hasNotification && (
                                <Badge variant="destructive" className="h-4 px-1.5 text-xs rounded-full">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="w-20 text-right">
                          <Link href={step.link}>
                            <Button variant="ghost" size="sm" className="h-8 gap-1">
                              {step.action}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                    
                    return (
                      <Link key={step.id} href={step.link} className="contents">
                        {row}
                      </Link>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {otherSteps.length > 0 && (
          <div>
            <div className="mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Other Actions
              </span>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableBody>
                  {otherSteps.map((step) => {
                    const Icon = step.icon;
                    const row = (
                      <TableRow 
                        key={step.id}
                        className="hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                      >
                        <TableCell className="w-12">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium text-foreground mb-0.5">
                              {step.label}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="w-20 text-right">
                          <Link href={step.link}>
                            <Button variant="ghost" size="sm" className="h-8 gap-1">
                              {step.action}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                    
                    return (
                      <Link key={step.id} href={step.link} className="contents">
                        {row}
                      </Link>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
