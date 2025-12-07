import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle2,
  Clock,
  Eye,
  Calendar,
  XCircle,
  FileText,
  MessageCircle,
  X,
  TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Application, Job } from '@shared/schema';
import { useLocation } from 'wouter';
import { withdrawApplication } from '@/lib/applicationService';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ApplicationDetailModalProps {
  application: Application & { job: Job };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplicationDetailModal({
  application,
  open,
  onOpenChange,
}: ApplicationDetailModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawApplication(application.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      toast({
        title: 'Application withdrawn',
        description: 'Your application has been withdrawn successfully.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to withdraw application',
        variant: 'destructive',
      });
    },
  });

  const getStatusConfig = (status: Application['status']) => {
    const configs = {
      pending: {
        label: 'Pending Review',
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        badge: '🟡',
      },
      under_review: {
        label: 'Under Review',
        icon: Eye,
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        badge: '🔵',
      },
      interview_scheduled: {
        label: 'Interview Scheduled',
        icon: Calendar,
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        badge: '🟢',
      },
      offer_made: {
        label: 'Offer Received',
        icon: CheckCircle2,
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        badge: '✅',
      },
      rejected: {
        label: 'Not Selected',
        icon: XCircle,
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        badge: '⚫',
      },
      withdrawn: {
        label: 'Withdrawn',
        icon: X,
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        badge: '⚫',
      },
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(application.status);
  const StatusIcon = statusConfig.icon;

  const timelineSteps = [
    {
      completed: true,
      label: 'Applied',
      date: application.applied_at,
      icon: FileText,
    },
    {
      completed: !!application.viewed_at,
      label: 'Viewed by School',
      date: application.viewed_at,
      icon: Eye,
    },
    {
      completed: application.status === 'under_review' || ['interview_scheduled', 'offer_made'].includes(application.status),
      label: 'Under Review',
      date: application.viewed_at,
      icon: Clock,
    },
    {
      completed: application.status === 'interview_scheduled',
      label: 'Interview Scheduled',
      date: application.interview_scheduled_at,
      icon: Calendar,
    },
    {
      completed: application.status === 'offer_made',
      label: 'Offer Made',
      date: application.offer_made_at,
      icon: TrendingUp,
    },
  ].filter(step => step.completed || step.label === 'Applied');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{statusConfig.badge}</span>
            Application Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Applied {formatDistanceToNow(new Date(application.applied_at), { addSuffix: true })}
            </span>
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Application Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timelineSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  return (
                    <div key={step.label} className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <StepIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`font-medium ${step.completed ? '' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        {step.date && (
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(step.date), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={application.job?.school_logo || undefined} />
                  <AvatarFallback>
                    {application.job?.school_name?.charAt(0) || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{application.job?.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{application.job?.school_name}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{application.job?.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{application.job?.location}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Salary</p>
                  <p className="text-sm text-muted-foreground">{application.job?.salary}</p>
                </div>
              </div>
              {application.job?.requirements && (
                <div>
                  <h4 className="font-semibold mb-2">Requirements</h4>
                  <p className="text-sm text-muted-foreground">{application.job.requirements}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Your Application */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Cover Letter</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {application.cover_letter}
                </p>
              </div>
              {application.rejection_reason && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-1 text-sm">Rejection Reason</h4>
                  <p className="text-sm text-muted-foreground">{application.rejection_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setLocation(`/jobs/${application.job_id}`)}
            >
              View Job Posting
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation(`/messages?job=${application.job_id}`)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message School
            </Button>
            {['pending', 'under_review'].includes(application.status) && (
              <Button
                variant="destructive"
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending}
              >
                {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw Application'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
