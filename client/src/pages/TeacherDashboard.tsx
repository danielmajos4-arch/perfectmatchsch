import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, FileText, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Application, Job } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

type ApplicationWithJob = Application & { job: Job };

export default function TeacherDashboard() {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<ApplicationWithJob[]>({
    queryKey: ['/api/applications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*, job:jobs(*)')
        .eq('teacher_id', user?.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  const { data: recommendedJobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs/recommended'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .order('posted_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as Job[];
    },
  });

  const stats = [
    {
      label: 'Active Applications',
      value: applications?.filter(a => a.status === 'pending' || a.status === 'under_review').length || 0,
      icon: Clock,
    },
    {
      label: 'Total Applications',
      value: applications?.length || 0,
      icon: FileText,
    },
    {
      label: 'Interviews',
      value: applications?.filter(a => a.status === 'accepted').length || 0,
      icon: CheckCircle,
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: 'Applied' },
      under_review: { variant: 'default', label: 'Under Review' },
      accepted: { variant: 'default', label: 'Accepted' },
      rejected: { variant: 'secondary', label: 'Not Selected' },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className="rounded-full">{config.label}</Badge>;
  };

  return (
    <Layout showMobileNav>
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            Welcome back, {user?.user_metadata?.full_name || 'Teacher'}
          </h1>
          <p className="text-muted-foreground">Track your applications and discover new opportunities</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Applications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-foreground">Your Applications</h2>
              <Link href="/jobs">
                <a className="text-sm text-primary font-medium hover:underline" data-testid="link-browse-jobs">
                  Browse Jobs
                </a>
              </Link>
            </div>

            {applicationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-card border border-card-border rounded-lg animate-pulse" />
                ))}
              </div>
            ) : applications && applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((application) => (
                  <Card key={application.id} className="p-4" data-testid={`card-application-${application.id}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/jobs/${application.job_id}`}>
                          <a className="text-lg font-semibold text-foreground hover:text-primary truncate block">
                            {application.job.title}
                          </a>
                        </Link>
                        <p className="text-sm text-muted-foreground">{application.job.school_name}</p>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Applied {formatDistanceToNow(new Date(application.applied_at), { addSuffix: true })}
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-2">No applications yet</p>
                <p className="text-sm text-muted-foreground mb-4">Start applying to teaching positions</p>
                <Link href="/jobs">
                  <Button data-testid="button-browse-jobs">Browse Jobs</Button>
                </Link>
              </Card>
            )}
          </div>

          {/* Recommended Jobs */}
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Recommended for You</h2>

            {jobsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-card border border-card-border rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recommendedJobs && recommendedJobs.length > 0 ? (
              <div className="space-y-4">
                {recommendedJobs.map((job) => (
                  <Card key={job.id} className="p-4 hover-elevate" data-testid={`card-job-${job.id}`}>
                    <Link href={`/jobs/${job.id}`}>
                      <a className="block">
                        <h3 className="text-lg font-semibold text-foreground mb-1">{job.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{job.school_name}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="rounded-full text-xs">
                            {job.subject}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full text-xs">
                            {job.location}
                          </Badge>
                        </div>
                      </a>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}
