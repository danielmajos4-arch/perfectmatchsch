import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Briefcase, MapPin, DollarSign, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import type { Job } from '@shared/schema';
import { JobCard } from '@/components/JobCard';

interface RecommendedJobsProps {
  jobs: Job[];
  teacherArchetype?: string;
  isLoading?: boolean;
}

export function RecommendedJobs({ jobs, teacherArchetype, isLoading }: RecommendedJobsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recommended jobs at the moment. Complete your profile to see personalized matches.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recommended Jobs</CardTitle>
          <Link href="/jobs">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>
        {teacherArchetype && (
          <p className="text-sm text-muted-foreground">
            Based on your {teacherArchetype} archetype and preferences
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.slice(0, 4).map((job) => (
          <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={job.school_logo || undefined} />
                <AvatarFallback>{job.school_name?.charAt(0) || 'S'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div>
                  <Link href={`/jobs/${job.id}`}>
                    <h3 className="font-semibold hover:text-primary cursor-pointer">
                      {job.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">{job.school_name}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs">
                    {job.subject}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {job.grade_level}
                  </Badge>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {job.salary}
                  </span>
                </div>
                {teacherArchetype && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>95% match based on your personality quiz</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Link href={`/jobs/${job.id}`}>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/jobs/${job.id}#apply`}>
                    <Button size="sm">Quick Apply</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
