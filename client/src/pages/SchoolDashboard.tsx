import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Users, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Job, Application } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

type JobWithApplications = Job & { applications: Application[] };

export default function SchoolDashboard() {
  const { toast } = useToast();
  const [showJobModal, setShowJobModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    grade_level: '',
    job_type: '',
    location: '',
    salary: '',
    description: '',
    requirements: '',
    benefits: '',
    school_name: '',
  });

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<JobWithApplications[]>({
    queryKey: ['/api/jobs/school', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, applications(*)')
        .eq('school_id', user?.id)
        .order('posted_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  const createJobMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('jobs').insert({
        ...formData,
        school_id: userData.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Job posted!',
        description: 'Your job posting is now live.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/school'] });
      setShowJobModal(false);
      setFormData({
        title: '',
        subject: '',
        grade_level: '',
        job_type: '',
        location: '',
        salary: '',
        description: '',
        requirements: '',
        benefits: '',
        school_name: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to post job',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createJobMutation.mutate();
  };

  const stats = [
    {
      label: 'Open Positions',
      value: jobs?.filter(j => j.is_active).length || 0,
      icon: Briefcase,
    },
    {
      label: 'Total Applications',
      value: jobs?.reduce((acc, job) => acc + (job.applications?.length || 0), 0) || 0,
      icon: Users,
    },
  ];

  return (
    <Layout showMobileNav>
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              School Dashboard
            </h1>
            <p className="text-muted-foreground">Manage your job postings and applications</p>
          </div>
          <Button
            onClick={() => setShowJobModal(true)}
            className="gap-2"
            data-testid="button-post-job"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden md:inline">Post Job</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">
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

        {/* Posted Jobs */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Your Job Postings</h2>

          {jobsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-card border border-card-border rounded-lg animate-pulse" />
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Card key={job.id} className="p-6" data-testid={`card-job-${job.id}`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/jobs/${job.id}`}>
                        <a className="text-xl font-semibold text-foreground hover:text-primary block mb-1">
                          {job.title}
                        </a>
                      </Link>
                      <p className="text-sm text-muted-foreground mb-2">{job.location}</p>
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
                    <Badge variant={job.is_active ? 'default' : 'secondary'} className="rounded-full">
                      {job.is_active ? 'Active' : 'Closed'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{job.applications?.length || 0} applications</span>
                    <span>Posted {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}</span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-2">No job postings yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first job posting to start receiving applications</p>
              <Button onClick={() => setShowJobModal(true)} data-testid="button-create-first-job">
                Post Your First Job
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Post Job Modal */}
      <Dialog open={showJobModal} onOpenChange={setShowJobModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Post a New Job</DialogTitle>
            <DialogDescription>Fill in the details for your teaching position</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="h-12"
                  data-testid="input-job-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name *</Label>
                <Input
                  id="schoolName"
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  required
                  className="h-12"
                  data-testid="input-school-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                  <SelectTrigger className="h-12" data-testid="select-subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="History">History</SelectItem>
                    <SelectItem value="Art">Art</SelectItem>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Physical Education">Physical Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level *</Label>
                <Select value={formData.grade_level} onValueChange={(value) => setFormData({ ...formData, grade_level: value })}>
                  <SelectTrigger className="h-12" data-testid="select-grade">
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Elementary">Elementary</SelectItem>
                    <SelectItem value="Middle School">Middle School</SelectItem>
                    <SelectItem value="High School">High School</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type *</Label>
                <Select value={formData.job_type} onValueChange={(value) => setFormData({ ...formData, job_type: value })}>
                  <SelectTrigger className="h-12" data-testid="select-type">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  className="h-12"
                  data-testid="input-location"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="salary">Salary Range *</Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="e.g., $50,000 - $70,000"
                  required
                  className="h-12"
                  data-testid="input-salary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="min-h-32"
                data-testid="textarea-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements *</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                required
                className="min-h-24"
                data-testid="textarea-requirements"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits *</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                required
                className="min-h-24"
                data-testid="textarea-benefits"
              />
            </div>

            <DialogFooter className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowJobModal(false)}
                disabled={createJobMutation.isPending}
                data-testid="button-cancel-job"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createJobMutation.isPending}
                data-testid="button-submit-job"
              >
                {createJobMutation.isPending ? 'Posting...' : 'Post Job'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
