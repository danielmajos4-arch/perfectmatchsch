import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Briefcase, Users, Plus, Edit, Trash2, Eye, X, CheckCircle, Clock, Search, Filter, MessageCircle, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { notifyJobPostedToTeachers } from '@/lib/notificationService';
import { findMatchingTeachers } from '@/lib/jobMatchingService';
import { getOrCreateConversation } from '@/lib/conversationService';
import { CandidateDashboard } from '@/components/CandidateDashboard';
import { AchievementNotification } from '@/components/achievements';
import { AchievementCollection } from '@/components/achievements';
import { useAchievements } from '@/hooks/useAchievements';
import { EmptyState } from '@/components/EmptyState';
import type { Job, Application } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

type JobWithApplications = Job & { applications: Application[] };

interface FormData {
  title: string;
  department: string;
  subject: string;
  grade_level: string;
  job_type: string; // UI field name
  location: string;
  salary: string;
  description: string;
  requirements: string;
  benefits: string;
  school_name: string;
  archetype_tags: string[];
  start_date?: string;
  application_deadline?: string;
}

const DEPARTMENTS = [
  'Mathematics',
  'Science',
  'English/Language Arts',
  'Social Studies',
  'Special Education',
  'Physical Education',
  'Arts',
  'Technology/Computer Science',
  'Foreign Languages',
  'Administration',
  'Other'
];

// Employment types - MUST match database CHECK constraint exactly
const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Temporary',
  'Substitute'
] as const;

// Validation function to ensure exact match
const isValidEmploymentType = (value: string): boolean => {
  return EMPLOYMENT_TYPES.includes(value as any);
};

const GRADE_LEVELS = [
  'Pre-K',
  'Kindergarten',
  'Elementary (1-5)',
  'Middle School (6-8)',
  'High School (9-12)',
  'All Grades'
];

const ARCHETYPES = [
  'The Guide',
  'The Trailblazer',
  'The Changemaker',
  'The Connector',
  'The Explorer',
  'The Leader'
];

export default function SchoolDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { achievements, newAchievement, dismissNotification } = useAchievements();
  const [showJobModal, setShowJobModal] = useState(false);
  const [activeTab, setActiveTab] = useState('jobs');
  const [editingJob, setEditingJob] = useState<JobWithApplications | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobFilterDepartment, setJobFilterDepartment] = useState<string>('all');
  const [jobFilterStatus, setJobFilterStatus] = useState<string>('all');
  
  // Handle hash routes
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#post-job') {
      setShowJobModal(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hash === '#applications') {
      setActiveTab('candidates');
      setTimeout(() => {
        const element = document.getElementById('applications');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  const [formData, setFormData] = useState<FormData>({
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
    start_date: '',
    application_deadline: '',
  });

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // Fetch jobs with applications
  const { data: jobs, isLoading: jobsLoading } = useQuery<JobWithApplications[]>({
    queryKey: ['/api/jobs/school', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch jobs with explicit column selection to avoid 400 errors
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          school_id,
          title,
          department,
          subject,
          grade_level,
          employment_type,
          location,
          salary,
          description,
          requirements,
          benefits,
          school_name,
          school_logo,
          posted_at,
          is_active,
          archetype_tags
        `)
        .eq('school_id', user.id)
        .order('posted_at', { ascending: false });

      if (jobsError) {
        console.error('Jobs fetch error:', jobsError);
        throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
      }

      if (jobsData && jobsData.length > 0) {
        const jobIds = jobsData.map(j => j.id);
        const { data: applicationsData } = await supabase
          .from('applications')
          .select('*')
          .in('job_id', jobIds);

        return jobsData.map(job => ({
          ...job,
          job_type: (job as any).employment_type || (job as any).job_type,
          applications: applicationsData?.filter(app => app.job_id === job.id) || []
        })) as any;
      }

      return (jobsData || []).map(job => ({
        ...job,
        job_type: (job as any).employment_type || (job as any).job_type
      })) as any;
    },
    enabled: !!user?.id,
    retry: 1,
  });

  // Fetch recent applications for dashboard widget
  const { data: recentApplications } = useQuery<Application[]>({
    queryKey: ['/api/applications/recent', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id')
        .eq('school_id', user.id);

      if (!jobsData || jobsData.length === 0) return [];

      const jobIds = jobsData.map(j => j.id);
      const { data, error } = await supabase
        .from('applications')
        .select('*, jobs(title)')
        .in('job_id', jobIds)
        .order('applied_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Recent applications error:', error);
        return [];
      }

      return (data || []) as Application[];
    },
    enabled: !!user?.id && !!jobs && jobs.length > 0,
  });

  // Calculate dashboard stats
  const stats = useMemo(() => {
    if (!jobs) return null;

    const activeJobs = jobs.filter(j => j.is_active);
    const totalApplications = jobs.reduce((acc, job) => acc + (job.applications?.length || 0), 0);
    const pendingApplications = jobs.reduce((acc, job) => {
      return acc + (job.applications?.filter(app => app.status === 'pending' || app.status === 'under_review').length || 0);
    }, 0);
    const recentApplicationsCount = recentApplications?.length || 0;

    return {
      activeJobs: activeJobs.length,
      totalApplications,
      pendingApplications,
      recentApplications: recentApplicationsCount,
    };
  }, [jobs, recentApplications]);

  // Filter and search jobs
  const filteredJobs = useMemo(() => {
    if (!jobs) return [];

    return jobs.filter(job => {
      const matchesSearch = !jobSearchQuery || 
        job.title.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(jobSearchQuery.toLowerCase());
      
      const matchesDepartment = jobFilterDepartment === 'all' || job.department === jobFilterDepartment;
      
      const matchesStatus = jobFilterStatus === 'all' || 
        (jobFilterStatus === 'active' && job.is_active) ||
        (jobFilterStatus === 'closed' && !job.is_active);

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [jobs, jobSearchQuery, jobFilterDepartment, jobFilterStatus]);

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async () => {
      // Comprehensive validation
      const errors: string[] = [];
      
      if (!formData.title?.trim()) errors.push('Job title is required');
      if (!formData.department?.trim()) errors.push('Department is required');
      if (!formData.subject?.trim()) errors.push('Subject is required');
      if (!formData.grade_level?.trim()) errors.push('Grade level is required');
      if (!formData.job_type?.trim()) errors.push('Employment type is required');
      if (!formData.location?.trim()) errors.push('Location is required');
      if (!formData.salary?.trim()) errors.push('Salary is required');
      if (!formData.description?.trim()) errors.push('Job description is required');
      if (!formData.requirements?.trim()) errors.push('Requirements are required');
      if (!formData.benefits?.trim()) errors.push('Benefits are required');
      if (!formData.school_name?.trim()) errors.push('School name is required');

      // Validate employment type matches constraint exactly
      const employmentType = formData.job_type.trim();
      if (!isValidEmploymentType(employmentType)) {
        errors.push(`Invalid employment type. Must be one of: ${EMPLOYMENT_TYPES.join(', ')}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join('. '));
      }

      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) {
        throw new Error('Not authenticated. Please log in again.');
      }

      // Prepare job data - map job_type to employment_type for database
      // CRITICAL: Use exact value that matches database CHECK constraint
      const employmentTypeValue = employmentType; // Already validated above
      
      console.log('Job submission debug:', {
        employmentType: employmentTypeValue,
        isValid: isValidEmploymentType(employmentTypeValue),
        allValidTypes: EMPLOYMENT_TYPES
      });

      const jobData: any = {
        school_id: userData.user.id,
        title: formData.title.trim(),
        department: formData.department.trim(),
        subject: formData.subject.trim(),
        grade_level: formData.grade_level.trim(),
        employment_type: employmentTypeValue, // Use validated value
        location: formData.location.trim(),
        salary: formData.salary.trim(),
        description: formData.description.trim(),
        requirements: formData.requirements.trim(),
        benefits: formData.benefits.trim(),
        school_name: formData.school_name.trim(),
        is_active: true,
      };

      if (formData.archetype_tags && formData.archetype_tags.length > 0) {
        jobData.archetype_tags = formData.archetype_tags;
      }

      if (formData.start_date) {
        jobData.start_date = formData.start_date;
      }

      if (formData.application_deadline) {
        jobData.application_deadline = formData.application_deadline;
      }

      // Fetch school logo
      try {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('logo_url')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        
        jobData.school_logo = schoolData?.logo_url || null;
      } catch (logoError) {
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

        // Comprehensive error handling
        if (error.code === '23502') {
          const column = error.message.match(/column "(\w+)"/)?.[1];
          throw new Error(`Missing required field: ${column}. Please fill all required fields.`);
        }
        if (error.code === '23503') {
          throw new Error('Invalid school reference. Please complete your school profile first.');
        }
        if (error.code === '23505') {
          throw new Error('A job with these details already exists.');
        }
        if (error.code === '23514') {
          // CHECK constraint violation - likely employment_type
          if (error.message.includes('employment_type')) {
            throw new Error(`Invalid employment type. Must be exactly one of: ${EMPLOYMENT_TYPES.join(', ')}. Received: "${employmentTypeValue}"`);
          }
          throw new Error(`Data validation error: ${error.message}`);
        }
        if (error.code === 'PGRST116' || error.message.includes('column') || error.message.includes('does not exist')) {
          throw new Error(`Database schema error: ${error.message}. Please ensure all required columns exist.`);
        }
        
        throw new Error(error.message || 'Failed to create job posting. Please try again.');
      }

      // Find matching teachers and send notifications (non-blocking)
      if (data) {
        try {
          const matchingTeachers = await findMatchingTeachers({
            id: data.id,
            subject: data.subject,
            grade_level: data.grade_level,
            location: data.location,
            archetype_tags: data.archetype_tags,
          });

          if (matchingTeachers.length > 0) {
            const teacherUserIds = matchingTeachers.map(t => t.user_id);
            await notifyJobPostedToTeachers(
              teacherUserIds,
              data.id,
              data.title,
              data.school_name
            );
          }
        } catch (notifError) {
          // Log but don't fail job creation
          console.error('Error sending job match notifications:', notifError);
        }
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Job posted successfully!',
        description: 'Your job posting is now live and visible to teachers.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/school'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications/recent'] });
      setShowJobModal(false);
      resetForm();
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

  // Update job mutation
  const updateJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!editingJob) throw new Error('No job selected for editing');

      // Validate employment type
      const employmentType = formData.job_type.trim();
      if (!isValidEmploymentType(employmentType)) {
        throw new Error(`Invalid employment type. Must be one of: ${EMPLOYMENT_TYPES.join(', ')}`);
      }

      const jobData: any = {
        title: formData.title.trim(),
        department: formData.department.trim(),
        subject: formData.subject.trim(),
        grade_level: formData.grade_level.trim(),
        employment_type: employmentType, // Use validated value
        location: formData.location.trim(),
        salary: formData.salary.trim(),
        description: formData.description.trim(),
        requirements: formData.requirements.trim(),
        benefits: formData.benefits.trim(),
        school_name: formData.school_name.trim(),
      };

      if (formData.archetype_tags && formData.archetype_tags.length > 0) {
        jobData.archetype_tags = formData.archetype_tags;
      }

      const { data, error } = await supabase
        .from('jobs')
        .update(jobData)
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        console.error('Job update error:', {
          message: error.message,
          code: error.code,
          details: error.details,
        });

        // Handle CHECK constraint violation
        if (error.code === '23514') {
          if (error.message.includes('employment_type')) {
            throw new Error(`Invalid employment type. Must be exactly one of: ${EMPLOYMENT_TYPES.join(', ')}. Received: "${employmentType}"`);
          }
          throw new Error(`Data validation error: ${error.message}`);
        }

        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Job updated successfully!',
        description: 'Your job posting has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/school'] });
      setShowJobModal(false);
      setEditingJob(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update job',
        description: error?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Job deleted',
        description: 'The job posting has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/school'] });
      setDeleteJobId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete job',
        description: error?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Toggle job active status
  const toggleJobStatusMutation = useMutation({
    mutationFn: async ({ jobId, isActive }: { jobId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('jobs')
        .update({ is_active: isActive })
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.isActive ? 'Job reopened' : 'Job closed',
        description: variables.isActive 
          ? 'The job posting is now active and accepting applications.'
          : 'The job posting is now closed and no longer accepting applications.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/school'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update job status',
        description: error?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
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
      start_date: '',
      application_deadline: '',
    });
    setEditingJob(null);
  };

  const handleEditJob = (job: JobWithApplications) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      department: job.department || '',
      subject: job.subject,
      grade_level: job.grade_level,
      job_type: job.job_type || '',
      location: job.location,
      salary: job.salary,
      description: job.description,
      requirements: job.requirements,
      benefits: job.benefits,
      school_name: job.school_name,
      archetype_tags: job.archetype_tags || [],
      start_date: '',
      application_deadline: '',
    });
    setShowJobModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingJob) {
      updateJobMutation.mutate(editingJob.id);
    } else {
    createJobMutation.mutate();
    }
  };

  const handleDeleteJob = (jobId: string) => {
    deleteJobMutation.mutate(jobId);
  };

  const handleToggleJobStatus = (job: JobWithApplications) => {
    toggleJobStatusMutation.mutate({ jobId: job.id, isActive: !job.is_active });
  };

  return (
    <AuthenticatedLayout showMobileNav>
      {/* Achievement Notification - Only for teachers */}
      {user?.user_metadata?.role === 'teacher' && (
        <AchievementNotification
          achievement={newAchievement}
          onClose={dismissNotification}
          onViewAll={() => setLocation('/profile#achievements')}
        />
      )}
      
      <div className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent">
              School Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your job postings and applications</p>
            {user?.user_metadata?.role === 'teacher' && achievements.length > 0 && user?.id && (
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className="text-xs text-muted-foreground">Achievements:</span>
                <AchievementCollection userId={user.id} compact={true} />
              </div>
            )}
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowJobModal(true);
            }}
            className="gap-2 h-11 w-full sm:w-auto"
            data-testid="button-post-job"
          >
            <Plus className="h-5 w-5" />
            <span>Post Job</span>
          </Button>
        </div>

        {/* Dashboard Stats */}
        {jobsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Active Jobs</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.activeJobs}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Applications</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.totalApplications}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Pending Reviews</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.pendingApplications}</p>
            </Card>
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Recent (7 days)</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats.recentApplications}</p>
            </Card>
          </div>
        ) : null}

        {/* Recent Applications Widget */}
        {recentApplications && recentApplications.length > 0 && (
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Applications</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('candidates')}
                className="text-sm"
              >
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {recentApplications.slice(0, 5).map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(app as any).jobs?.title || 'Job Application'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={app.status === 'pending' ? 'secondary' : 'default'}>
                      {app.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Get job_id from application
                          const jobId = (app as any).job_id;
                          
                          if (!user?.id) {
                            toast({
                              title: 'Error',
                              description: 'Please log in to message applicants.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          
                          // Get or create conversation (with timeout)
                          const convPromise = getOrCreateConversation(
                            app.teacher_id,
                            user.id,
                            jobId
                          );
                          const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Conversation creation timed out. Please try again.')), 10000);
                          });
                          
                          const { conversation } = await Promise.race([convPromise, timeoutPromise]) as { conversation: any; isNew: boolean };
                          
                          // Navigate to messages
                          setLocation(`/messages?conversation=${conversation.id}`);
                        } catch (error: any) {
                          toast({
                            title: 'Error',
                            description: error.message || 'Failed to open conversation.',
                            variant: 'destructive',
                          });
                        }
                      }}
                      className="h-8"
                      title="Message applicant"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
              </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="jobs">Job Postings</TabsTrigger>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  className="h-12 pl-10"
                />
              </div>
              <Select value={jobFilterDepartment} onValueChange={setJobFilterDepartment}>
                <SelectTrigger className="h-12 w-full sm:w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={jobFilterStatus} onValueChange={setJobFilterStatus}>
                <SelectTrigger className="h-12 w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Job List */}
          {jobsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-4 w-full" />
                  </Card>
              ))}
            </div>
            ) : filteredJobs && filteredJobs.length > 0 ? (
            <div className="space-y-4">
                {filteredJobs.map((job) => (
                <Card key={job.id} className="p-6" data-testid={`card-job-${job.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                      <Link href={`/jobs/${job.id}`}>
                            <a className="text-xl font-semibold text-primary hover:underline block">
                          {job.title}
                        </a>
                      </Link>
                          <Badge variant={job.is_active ? 'default' : 'secondary'} className="rounded-full flex-shrink-0">
                            {job.is_active ? 'Active' : 'Closed'}
                          </Badge>
                        </div>
                      <p className="text-sm text-muted-foreground mb-2">{job.location}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="secondary" className="rounded-full">
                            {job.department || job.subject}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full">
                          {job.grade_level}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full">
                          {job.job_type}
                        </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          <span>{job.applications?.length || 0} applications</span>
                          <span>•</span>
                          <span>Posted {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:flex-col sm:flex-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditJob(job)}
                          className="h-10 gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleJobStatus(job)}
                          className="h-10 gap-2"
                          disabled={toggleJobStatusMutation.isPending}
                        >
                          {job.is_active ? (
                            <>
                              <X className="h-4 w-4" />
                              <span className="hidden sm:inline">Close</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              <span className="hidden sm:inline">Reopen</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteJobId(job.id)}
                          className="h-10 gap-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveTab('candidates');
                            // Could filter by job ID here
                          }}
                          className="h-10 gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">View Apps</span>
                        </Button>
                      </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
              <EmptyState
                icon="briefcase"
                title="No job postings yet"
                description={jobSearchQuery || jobFilterDepartment !== 'all' || jobFilterStatus !== 'all'
                  ? "No jobs match your search criteria. Try adjusting your filters."
                  : "Create your first job posting to start receiving applications from qualified teachers."}
                action={{
                  label: jobSearchQuery || jobFilterDepartment !== 'all' || jobFilterStatus !== 'all' 
                    ? "Clear Filters" 
                    : "Post Your First Job",
                  onClick: () => {
                    if (jobSearchQuery || jobFilterDepartment !== 'all' || jobFilterStatus !== 'all') {
                      setJobSearchQuery('');
                      setJobFilterDepartment('all');
                      setJobFilterStatus('all');
                    } else {
                      resetForm();
                      setShowJobModal(true);
                    }
                  }
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="candidates">
            <div id="applications">
            {user?.id && <CandidateDashboard schoolId={user.id} />}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Job Posting/Editing Modal */}
      <Dialog open={showJobModal} onOpenChange={(open) => {
        setShowJobModal(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl">
              {editingJob ? 'Edit Job Posting' : 'Post a New Job'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Fill in the details for your teaching position
            </DialogDescription>
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
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="h-12"
                  placeholder="e.g., Mathematics, English"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level *</Label>
                <Select value={formData.grade_level} onValueChange={(value) => setFormData({ ...formData, grade_level: value })}>
                  <SelectTrigger className="h-12" data-testid="select-grade">
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentType">Employment Type *</Label>
                <Select value={formData.job_type} onValueChange={(value) => setFormData({ ...formData, job_type: value })}>
                  <SelectTrigger className="h-12" data-testid="select-employment-type">
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
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

              <div className="space-y-2">
                <Label htmlFor="salary">Salary Range *</Label>
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
              <Label htmlFor="description">Job Description *</Label>
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
              <Label htmlFor="requirements">Requirements *</Label>
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
              <Label htmlFor="benefits">Benefits *</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                required
                className="min-h-24 text-base"
                data-testid="textarea-benefits"
              />
            </div>

            {/* Teaching Archetypes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Desired Teaching Archetypes (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Select archetypes that would be a good fit for this position. This helps match teachers automatically.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ARCHETYPES.map((archetype) => (
                  <label 
                    key={archetype} 
                    className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted transition-colors min-h-[44px]"
                  >
                    <Checkbox
                      checked={formData.archetype_tags.includes(archetype)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, archetype_tags: [...formData.archetype_tags, archetype] });
                        } else {
                          setFormData({ ...formData, archetype_tags: formData.archetype_tags.filter(t => t !== archetype) });
                        }
                      }}
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
                onClick={() => {
                  setShowJobModal(false);
                  resetForm();
                }}
                disabled={createJobMutation.isPending || updateJobMutation.isPending}
                className="w-full sm:w-auto h-11 order-2 sm:order-1"
                data-testid="button-cancel-job"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createJobMutation.isPending || updateJobMutation.isPending}
                className="w-full sm:w-auto h-11 order-1 sm:order-2"
                data-testid="button-submit-job"
              >
                {createJobMutation.isPending || updateJobMutation.isPending
                  ? (editingJob ? 'Updating...' : 'Posting...')
                  : (editingJob ? 'Update Job' : 'Post Job')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteJobId} onOpenChange={(open) => !open && setDeleteJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Posting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job posting? This action cannot be undone and will remove all associated applications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteJobId && handleDeleteJob(deleteJobId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthenticatedLayout>
  );
}
