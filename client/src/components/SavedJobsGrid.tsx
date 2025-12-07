import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, DollarSign, Calendar, Heart, X } from 'lucide-react';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import type { SavedJob, Job } from '@shared/schema';
import { unsaveJob } from '@/lib/savedJobsService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface SavedJobWithDetails extends SavedJob {
  job: Job;
}

interface SavedJobsGridProps {
  savedJobs: SavedJobWithDetails[];
  teacherId: string;
}

export function SavedJobsGrid({ savedJobs, teacherId }: SavedJobsGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const unsaveMutation = useMutation({
    mutationFn: (jobId: string) => unsaveJob(teacherId, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-jobs'] });
      toast({
        title: 'Job removed',
        description: 'Job has been removed from your saved jobs.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove saved job',
        variant: 'destructive',
      });
    },
  });

  if (savedJobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No saved jobs yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Save jobs you're interested in to view them later
          </p>
          <Link href="/jobs">
            <Button>Browse Jobs</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {savedJobs.map((savedJob) => {
        const daysSinceSaved = formatDistanceToNow(new Date(savedJob.saved_at), {
          addSuffix: true,
        });

        return (
          <Card key={savedJob.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={savedJob.job.school_logo || undefined} />
                    <AvatarFallback>
                      {savedJob.job.school_name?.charAt(0) || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Link href={`/jobs/${savedJob.job.id}`}>
                      <h3 className="font-semibold hover:text-primary cursor-pointer truncate">
                        {savedJob.job.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">
                      {savedJob.job.school_name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => unsaveMutation.mutate(savedJob.job_id)}
                  disabled={unsaveMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {savedJob.job.subject}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {savedJob.job.grade_level}
                  </Badge>
                </div>

                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{savedJob.job.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>{savedJob.job.salary}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Saved {daysSinceSaved}</span>
                  </div>
                </div>

                {savedJob.notes && (
                  <div className="p-2 bg-muted rounded text-xs text-muted-foreground">
                    <strong>Note:</strong> {savedJob.notes}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Link href={`/jobs/${savedJob.job.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/jobs/${savedJob.job.id}#apply`} className="flex-1">
                    <Button size="sm" className="w-full">Apply</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
