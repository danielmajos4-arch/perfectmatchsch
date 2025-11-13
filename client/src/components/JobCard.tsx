import { useState } from 'react';
import { Link } from 'wouter';
import { MapPin, Clock, DollarSign, Briefcase, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApplicationModal } from '@/components/ApplicationModal';
import { MatchScoreIndicator, MatchScoreBadge } from '@/components/MatchScoreIndicator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Job } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

interface JobCardProps {
  job: Job;
  showQuickApply?: boolean;
  matchScore?: number;
}

export function JobCard({ job, showQuickApply = false, matchScore }: JobCardProps) {
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: hasApplied } = useQuery({
    queryKey: ['/api/has-applied', user?.id, job.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from('applications')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('job_id', job.id)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!user?.id && showQuickApply,
  });

  const isTeacher = user?.user_metadata?.role === 'teacher';

  return (
    <>
      <Card className="p-4 md:p-6 card-hover group cursor-pointer" data-testid={`card-job-${job.id}`}>
        {/* Mobile First: Stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* School Logo */}
          <div className="flex-shrink-0 flex justify-center sm:justify-start">
            {job.school_logo ? (
              <img
                src={job.school_logo}
                alt={job.school_name}
                className="h-16 w-16 sm:h-12 sm:w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xl sm:text-lg font-semibold text-primary">
                  {job.school_name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Job Details */}
          <div className="flex-1 min-w-0">
            {/* Title and Match Score - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
              <Link href={`/jobs/${job.id}`} className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground hover:text-primary transition-colors break-words cursor-pointer">
                  {job.title}
                </h3>
              </Link>
              {matchScore !== undefined && (
                <MatchScoreBadge score={matchScore} />
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3 break-words">
              {job.school_name}
            </p>

            {/* Tags - Wrap on mobile */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary" className="rounded-full text-xs sm:text-sm">
                {job.subject}
              </Badge>
              <Badge variant="secondary" className="rounded-full text-xs sm:text-sm">
                {job.grade_level}
              </Badge>
              <Badge variant="secondary" className="rounded-full text-xs sm:text-sm">
                {job.job_type}
              </Badge>
            </div>

            {/* Footer - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {/* Info Icons - Wrap on mobile */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">{job.salary}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span>{formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}</span>
                </div>
              </div>
              
              {/* Action Buttons - Full width on mobile */}
              {showQuickApply && isTeacher && (
                <div className="flex flex-col sm:flex-row gap-2 sm:w-auto w-full">
                  {hasApplied ? (
                    <Badge variant="secondary" className="rounded-full w-full sm:w-auto justify-center py-2 sm:py-1">
                      Applied
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowApplicationModal(true);
                      }}
                      className="gap-1 h-11 w-full sm:w-auto"
                    >
                      <Zap className="h-4 w-4" />
                      Quick Apply
                    </Button>
                  )}
                  <Link href={`/jobs/${job.id}`} className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto h-11">
                      View Details
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
      {showApplicationModal && (
        <ApplicationModal
          job={job}
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
        />
      )}
    </>
  );
}
