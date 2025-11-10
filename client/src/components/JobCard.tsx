import { Link } from 'wouter';
import { MapPin, Clock, DollarSign, Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Job } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className="p-4 md:p-6 hover-elevate cursor-pointer transition-all" data-testid={`card-job-${job.id}`}>
        <div className="flex gap-4">
          {/* School Logo */}
          <div className="flex-shrink-0">
            {job.school_logo ? (
              <img
                src={job.school_logo}
                alt={job.school_name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {job.school_name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Job Details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-foreground mb-1 truncate">
              {job.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {job.school_name}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary" className="rounded-full">
                {job.subject}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                {job.grade_level}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                {job.job_type}
              </Badge>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-5 w-5" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                <span>{job.salary}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-5 w-5" />
                <span>{formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
