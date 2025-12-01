/**
 * Application Timeline Component
 * 
 * Visual timeline showing application status history and next steps
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CheckCircle2, 
  Clock, 
  Mail, 
  Eye, 
  UserCheck, 
  XCircle,
  FileText,
  Calendar,
  TrendingUp,
  MessageCircle
} from 'lucide-react';
import type { Application, Job } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { getOrCreateConversation } from '@/lib/conversationService';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface ApplicationTimelineProps {
  application: Application & { job?: Job };
}

type ApplicationStatus = 'pending' | 'under_review' | 'reviewed' | 'contacted' | 'shortlisted' | 'hired' | 'rejected';

interface StatusStep {
  status: ApplicationStatus;
  label: string;
  icon: typeof CheckCircle2;
  color: string;
  description: string;
  estimatedDays?: number;
}

const STATUS_STEPS: StatusStep[] = [
  {
    status: 'pending',
    label: 'Submitted',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    description: 'Your application has been submitted',
  },
  {
    status: 'under_review',
    label: 'Under Review',
    icon: Eye,
    color: 'text-purple-600 dark:text-purple-400',
    description: 'School is reviewing your application',
    estimatedDays: 3,
  },
  {
    status: 'reviewed',
    label: 'Reviewed',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    description: 'Application has been reviewed',
    estimatedDays: 5,
  },
  {
    status: 'contacted',
    label: 'Contacted',
    icon: Mail,
    color: 'text-orange-600 dark:text-orange-400',
    description: 'School has reached out to you',
    estimatedDays: 7,
  },
  {
    status: 'shortlisted',
    label: 'Shortlisted',
    icon: UserCheck,
    color: 'text-emerald-600 dark:text-emerald-400',
    description: 'You are on the shortlist',
    estimatedDays: 10,
  },
  {
    status: 'hired',
    label: 'Hired',
    icon: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    description: 'Congratulations! You got the job',
  },
  {
    status: 'rejected',
    label: 'Not Selected',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    description: 'Application was not selected',
  },
];

export function ApplicationTimeline({ application }: ApplicationTimelineProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const currentStatus = application.status as ApplicationStatus;
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.status === currentStatus);
  const currentStep = STATUS_STEPS[currentStepIndex] || STATUS_STEPS[0];

  const handleMessageSchool = async () => {
    if (!application.job) {
      toast({
        title: 'Error',
        description: 'Job information not available.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get current user (teacher)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'Please log in to message the school.',
          variant: 'destructive',
        });
        return;
      }

      // Get school user_id from job
      const schoolUserId = application.job.school_id;

      // Get or create conversation (with timeout)
      const convPromise = getOrCreateConversation(
        user.id, // teacher_id
        schoolUserId, // school_id
        application.job.id // job_id
      );
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Conversation creation timed out. Please try again.')), 10000);
      });
      
      const { conversation } = await Promise.race([convPromise, timeoutPromise]) as { conversation: any; isNew: boolean };

      // Navigate to messages with conversation ID
      navigate(`/messages?conversation=${conversation.id}`);
    } catch (error: any) {
      console.error('Error getting conversation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to open conversation.',
        variant: 'destructive',
      });
    }
  };

  // Get status history (simulated - in real app, this would come from a status_history table)
  const statusHistory = [
    {
      status: 'pending' as ApplicationStatus,
      timestamp: new Date(application.applied_at),
      note: 'Application submitted',
    },
    ...(currentStepIndex > 0 ? [{
      status: currentStatus,
      timestamp: new Date(), // In real app, get from status_history
      note: `Status updated to ${currentStep.label}`,
    }] : []),
  ];

  const getNextSteps = () => {
    if (currentStatus === 'hired' || currentStatus === 'rejected') {
      return [];
    }

    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < STATUS_STEPS.length) {
      const nextStep = STATUS_STEPS[nextStepIndex];
      if (nextStep.status === 'rejected') return [];
      
      return [{
        step: nextStep,
        estimatedDays: nextStep.estimatedDays,
      }];
    }
    return [];
  };

  const nextSteps = getNextSteps();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">Application Status</CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  currentStatus === 'hired'
                    ? 'default'
                    : currentStatus === 'rejected'
                    ? 'destructive'
                    : 'secondary'
                }
                className="rounded-full"
              >
                {currentStep.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Applied {formatDistanceToNow(new Date(application.applied_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          {application.job && (
            <div className="flex items-center gap-2">
              {application.job.school_logo ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={application.job.school_logo} />
                  <AvatarFallback>
                    {getInitials(application.job.school_name || 'S')}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {getInitials(application.job.school_name || 'S')}
                  </AvatarFallback>
                </Avatar>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleMessageSchool}
                className="h-9"
                title="Message school"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline */}
        <div className="space-y-4">
          {STATUS_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const isRejected = currentStatus === 'rejected' && step.status === 'rejected';
            const Icon = step.icon;

            return (
              <div key={step.status} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : isCompleted
                        ? 'bg-green-500 text-white border-green-500'
                        : isRejected
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-background text-muted-foreground border-border'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {index < STATUS_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-12 mt-1 ${
                        isCompleted ? 'bg-green-500' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <p
                      className={`font-semibold ${
                        isActive ? 'text-foreground' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </p>
                    {isActive && step.estimatedDays && (
                      <Badge variant="outline" className="text-xs">
                        ~{step.estimatedDays} days
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {isActive && statusHistory.find(h => h.status === step.status) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(statusHistory.find(h => h.status === step.status)!.timestamp, { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Next Steps */}
        {nextSteps.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              What's Next?
            </h4>
            <div className="space-y-2">
              {nextSteps.map(({ step, estimatedDays }) => (
                <div key={step.status} className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                    {estimatedDays && (
                      <span className="ml-1">(Typically within {estimatedDays} days)</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Job Info */}
        {application.job && (
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Job Details</h4>
            <div className="space-y-2">
              <p className="text-sm font-medium">{application.job.title}</p>
              <p className="text-xs text-muted-foreground">{application.job.school_name}</p>
              <p className="text-xs text-muted-foreground">{application.job.location}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

