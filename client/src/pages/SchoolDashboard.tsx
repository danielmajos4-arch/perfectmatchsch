import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Users, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CandidateDashboard } from '@/components/CandidateDashboard';
import { AchievementNotification } from '@/components/achievements';
import { useAchievements } from '@/hooks/useAchievements';
import type { Job, Application } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

type JobWithApplications = Job & { applications: Application[] };

export default function SchoolDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { achievements, newAchievement, dismissNotification } = useAchievements();
  const [showJobModal, setShowJobModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    subject: '',
    grade_level: '',
    job_type: '',
    location: '',
    salary: '',
    description: '',
    requirements: '',
    benefits: '',
    school_name: '',
    archetype_tags: [] as string[], // Added for Sprint 6 matching
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
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // First verify school record exists
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (schoolError) {
        console.error('School lookup error:', schoolError);
        // Don't throw - allow job posting even if school record doesn't exist yet
      }

      // Fetch jobs - try with applications first, fallback to jobs only if that fails
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('school_id', user.id)
        .order('posted_at', { ascending: false });

      const { data: jobsData, error: jobsError } = await query;

      if (jobsError) {
        console.error('Jobs fetch error:', jobsError);
        throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
      }

      // If we got jobs, try to fetch applications separately
      if (jobsData && jobsData.length > 0) {
        const jobIds = jobsData.map(j => j.id);
        const { data: applicationsData } = await supabase
          .from('applications')
          .select('*')
          .in('job_id', jobIds);

        // Attach applications to jobs
        return jobsData.map(job => ({
          ...job,
          applications: applicationsData?.filter(app => app.job_id === job.id) || []
        })) as any;
      }

      return (jobsData || []) as any;
    },
    enabled: !!user?.id,
    retry: 1,
  });

  const createJobMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!formData.title?.trim()) {
        throw new Error('Job title is required');
      }
      if (!formData.department?.trim()) {
        throw new Error('Department is required');
      }
      if (!formData.subject?.trim()) {
        throw new Error('Subject is required');
      }
      if (!formData.grade_level?.trim()) {
        throw new Error('Grade level is required');
      }
      if (!formData.job_type?.trim()) {
        throw new Error('Job type is required');
      }
      if (!formData.location?.trim()) {
        throw new Error('Location is required');
      }
      if (!formData.salary?.trim()) {
        throw new Error('Salary is required');
      }
      if (!formData.description?.trim()) {
        throw new Error('Job description is required');
      }
      if (!formData.requirements?.trim()) {
        throw new Error('Requirements are required');
      }
      if (!formData.benefits?.trim()) {
        throw new Error('Benefits are required');
      }
      if (!formData.school_name?.trim()) {
        throw new Error('School name is required');
      }

      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Prepare job data - only include fields that exist in the schema
      const jobData: any = {
        school_id: userData.user.id,
        title: formData.title.trim(),
        department: formData.department.trim(),
        subject: formData.subject.trim(),
        grade_level: formData.grade_level.trim(),
        job_type: formData.job_type.trim(),
        location: formData.location.trim(),
        salary: formData.salary.trim(),
        description: formData.description.trim(),
        requirements: formData.requirements.trim(),
        benefits: formData.benefits.trim(),
        school_name: formData.school_name.trim(),
        is_active: true,
      };

      // Only add archetype_tags if the column exists (added in sprint6-matching-schema.sql)
      // If it doesn't exist, the insert will fail, so we'll handle that gracefully
      if (formData.archetype_tags && formData.archetype_tags.length > 0) {
        jobData.archetype_tags = formData.archetype_tags;
      }

      // Add school_logo if available (optional)
      // Try to fetch school logo from school profile
      try {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('logo_url')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        
        if (schoolData?.logo_url) {
          jobData.school_logo = schoolData.logo_url;
        } else {
          jobData.school_logo = null;
        }
      } catch (logoError) {
        // If logo fetch fails, just set to null (optional field)
        console.warn('Could not fetch school logo:', logoError);
        jobData.school_logo = null;
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single();

      if (error) {
        console.error('Job creation error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        // Provide more specific error messages
        if (error.code === 'PGRST116' || error.message.includes('column') || error.message.includes('does not exist')) {
          throw new Error(`Database schema error: ${error.message}. Please ensure all required columns exist.`);
        }
        if (error.code === '23503' || error.message.includes('foreign key')) {
          throw new Error('Invalid school reference. Please complete your school profile first.');
        }
        if (error.code === '23505' || error.message.includes('unique')) {
          throw new Error('A job with these details already exists.');
        }
        
        throw new Error(error.message || 'Failed to create job posting. Please try again.');
      }

      return data;
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
        department: '',
        subject: '',
        grade_level: '',
        job_type: '',
        location: '',
        salary: '',
        description: '',
        requirements: '',
        benefits: '',
        school_name: '',
        archetype_tags: [],
      });
    },
    onError: (error: any) => {
      console.error('Job posting error:', error);
      
      const errorMessage = error?.message || 'Something went wrong. Please try again.';
      
      toast({
        title: 'Failed to post job',
        description: errorMessage,
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
    <AuthenticatedLayout showMobileNav>
      {/* Achievement Notification */}
      <AchievementNotification
        achievement={newAchievement}
        onClose={dismissNotification}
        onViewAll={() => setLocation('/profile#achievements')}
      />
      
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto">
        {/* Header - Mobile First */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent">
              School Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your job postings and applications</p>
            {/* Achievement Badges - Compact View */}
            {achievements.length > 0 && user?.id && (
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className="text-xs text-muted-foreground">Achievements:</span>
                <AchievementCollection userId={user.id} compact={true} />
              </div>
            )}
          </div>
          <Button
            onClick={() => setShowJobModal(true)}
            className="gap-2 h-11 w-full sm:w-auto"
            data-testid="button-post-job"
          >
            <Plus className="h-5 w-5" />
            <span>Post Job</span>
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

        {/* Tabs for Jobs and Candidates */}
        <Tabs defaultValue="jobs" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="jobs">Job Postings</TabsTrigger>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
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
                        <a className="text-xl font-semibold text-primary hover:underline block mb-1">
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
          </TabsContent>

          <TabsContent value="candidates">
            {user?.id && <CandidateDashboard schoolId={user.id} />}
          </TabsContent>
        </Tabs>
      </div>

      {/* Post Job Modal - Mobile Optimized */}
      <Dialog open={showJobModal} onOpenChange={setShowJobModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl">Post a New Job</DialogTitle>
            <DialogDescription className="text-sm">Fill in the details for your teaching position</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="department">Department *</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                  <SelectTrigger className="h-12" data-testid="select-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="English/Language Arts">English/Language Arts</SelectItem>
                    <SelectItem value="Social Studies">Social Studies</SelectItem>
                    <SelectItem value="Special Education">Special Education</SelectItem>
                    <SelectItem value="Physical Education">Physical Education</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="salary" className="text-sm font-medium">Salary Range *</Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="e.g., $50,000 - $70,000"
                  required
                  className="h-12 text-base"
                  data-testid="input-salary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Job Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="min-h-32 text-base"
                data-testid="textarea-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements" className="text-sm font-medium">Requirements *</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                required
                className="min-h-24 text-base"
                data-testid="textarea-requirements"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefits" className="text-sm font-medium">Benefits *</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                required
                className="min-h-24 text-base"
                data-testid="textarea-benefits"
              />
            </div>

            {/* Archetype Tags for Matching (Sprint 6) - Mobile Optimized */}
            <div className="space-y-2">
              <Label htmlFor="archetypeTags" className="text-sm font-medium">Desired Teaching Archetypes (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Select archetypes that would be a good fit for this position. This helps match teachers automatically.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {['The Guide', 'The Trailblazer', 'The Changemaker', 'The Connector', 'The Explorer', 'The Leader'].map((archetype) => (
                  <label 
                    key={archetype} 
                    className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted transition-colors min-h-[44px]"
                  >
                    <input
                      type="checkbox"
                      checked={formData.archetype_tags.includes(archetype)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, archetype_tags: [...formData.archetype_tags, archetype] });
                        } else {
                          setFormData({ ...formData, archetype_tags: formData.archetype_tags.filter(t => t !== archetype) });
                        }
                      }}
                      className="w-5 h-5 rounded border-border accent-primary"
                    />
                    <span className="text-sm font-medium">{archetype}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowJobModal(false)}
                disabled={createJobMutation.isPending}
                className="w-full sm:w-auto h-11 order-2 sm:order-1"
                data-testid="button-cancel-job"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createJobMutation.isPending}
                className="w-full sm:w-auto h-11 order-1 sm:order-2"
                data-testid="button-submit-job"
              >
                {createJobMutation.isPending ? 'Posting...' : 'Post Job'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
