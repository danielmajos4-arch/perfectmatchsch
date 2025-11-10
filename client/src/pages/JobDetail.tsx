import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApplicationModal } from '@/components/ApplicationModal';
import { MapPin, DollarSign, Briefcase, Clock, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Job } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

export default function JobDetail() {
  const [, params] = useRoute('/jobs/:id');
  const [, setLocation] = useLocation();
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ['/api/jobs', params?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', params?.id)
        .single();

      if (error) throw error;
      return data as Job;
    },
    enabled: !!params?.id,
  });

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  if (isLoading) {
    return (
      <Layout showMobileNav>
        <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-card border border-card-border rounded-xl" />
            <div className="h-96 bg-card border border-card-border rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout showMobileNav>
        <div className="px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Job not found</p>
        </div>
      </Layout>
    );
  }

  const isTeacher = user?.user_metadata?.role === 'teacher';

  return (
    <Layout showMobileNav>
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 mb-8 lg:mb-0">
            {/* Header */}
            <div>
              <div className="flex items-start gap-4 mb-4">
                {job.school_logo ? (
                  <img
                    src={job.school_logo}
                    alt={job.school_name}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-primary">
                      {job.school_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                    {job.title}
                  </h1>
                  <p className="text-lg text-muted-foreground mb-3">{job.school_name}</p>
                  <div className="flex flex-wrap gap-2">
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
                </div>
              </div>

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
                  <Briefcase className="h-5 w-5" />
                  <span>{job.job_type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-5 w-5" />
                  <span>Posted {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Job Description</h2>
              <div className="prose max-w-none text-foreground">
                <p className="whitespace-pre-line">{job.description}</p>
              </div>
            </Card>

            {/* Requirements */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Requirements</h2>
              <div className="prose max-w-none text-foreground">
                <p className="whitespace-pre-line">{job.requirements}</p>
              </div>
            </Card>

            {/* Benefits */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Benefits</h2>
              <div className="prose max-w-none text-foreground">
                <p className="whitespace-pre-line">{job.benefits}</p>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Apply Button */}
              {isTeacher && (
                <Button
                  className="w-full h-12 font-medium"
                  onClick={() => setShowApplicationModal(true)}
                  data-testid="button-apply"
                >
                  Apply for this Position
                </Button>
              )}

              {/* School Info */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">About the School</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-foreground">School:</span>
                    <span className="text-muted-foreground ml-2">{job.school_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Location:</span>
                    <span className="text-muted-foreground ml-2">{job.location}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile Apply Button */}
        {isTeacher && (
          <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border">
            <Button
              className="w-full h-12 font-medium"
              onClick={() => setShowApplicationModal(true)}
              data-testid="button-apply-mobile"
            >
              Apply for this Position
            </Button>
          </div>
        )}
      </div>

      {/* Application Modal */}
      {showApplicationModal && (
        <ApplicationModal
          job={job}
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
        />
      )}
    </Layout>
  );
}
