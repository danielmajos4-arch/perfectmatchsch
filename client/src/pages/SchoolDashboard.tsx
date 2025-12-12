import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CandidatePipelineView } from '@/components/CandidatePipelineView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Briefcase, Users, Plus, Edit, Trash2, Eye, X, CheckCircle, Clock, Search, Filter, MessageCircle, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { notifyJobPostedToTeachers } from '@/lib/notificationService';
import { findMatchingTeachers } from '@/lib/jobMatchingService';
import { getOrCreateConversation } from '@/lib/conversationService';
import { CandidateDashboard } from '@/components/CandidateDashboard';
import { AchievementNotification } from '@/components/achievements';
import { AchievementCollection } from '@/components/achievements';
import { useAchievements } from '@/hooks/useAchievements';
import { EmptyState } from '@/components/EmptyState';
import { JobPostingWizard, type JobPostingFormData } from '@/components/JobPostingWizard';
import { OffersTable } from '@/components/OffersTable';
import { SchoolAnalyticsDashboard } from '@/components/SchoolAnalyticsDashboard';
import { getOffersBySchool, getOfferStatusInfo } from '@/lib/offerService';
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
  application_requirements?: Record<string, boolean>;
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

import { ManualCandidateModal } from '@/components/ManualCandidateModal';
import { OnboardingTour } from '@/components/OnboardingTour';

export default function SchoolDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { achievements, newAchievement, dismissNotification } = useAchievements();
  const [showJobModal, setShowJobModal] = useState(false);
  const [showManualCandidateModal, setShowManualCandidateModal] = useState(false);
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
    application_requirements: {
      resume: true,
      cover_letter: false,
      desired_salary: false,
      linkedin_url: false,
      date_available: false,
      website_portfolio: false,
    },
  });

  // Use user from AuthContext instead of query - more reliable, especially when offline
  const { user, loading: authLoading } = useAuth();

  // Check school approval status
  const { data: schoolProfile } = useQuery({
    queryKey: ['/api/school-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('schools')
        .select('id, approval_status, school_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching school profile:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  // Redirect to pending approval page if not approved
  useEffect(() => {
    if (schoolProfile && schoolProfile.approval_status === 'pending') {
      setLocation('/school/pending-approval');
    }
  }, [schoolProfile, setLocation]);

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

      // Use user from AuthContext - check if available
      // Wait for auth to finish loading if still loading
      if (authLoading) {
        throw new Error('Authentication is still loading. Please wait a moment and try again.');
      }

      if (!user) {
        // Check if we're offline or if it's an auth issue
        const isOnline = navigator.onLine;
        if (!isOnline) {
          throw new Error('You appear to be offline. Please check your internet connection and try again.');
        }
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
        school_id: user.id,
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

      if (formData.application_requirements) {
        jobData.application_requirements = formData.application_requirements;
      }

      // Fetch school profile to get school_id (not user_id)
      let schoolProfile: any = null;
      try {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('id, logo_url, school_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (schoolError) {
          console.error('[Job Insert] Error fetching school profile:', schoolError);
        } else {
          schoolProfile = schoolData;
          console.log('[Job Insert] School profile fetched:', {
            school_id: schoolData?.id,
            user_id: user.id,
            school_name: schoolData?.school_name
          });
        }
      } catch (schoolErr) {
        console.error('[Job Insert] Exception fetching school profile:', schoolErr);
      }

      // Use school.id as school_id if available, otherwise fall back to user.id
      if (schoolProfile?.id) {
        jobData.school_id = schoolProfile.id;
        console.log('[Job Insert] Using school.id as school_id:', schoolProfile.id);
      } else {
        console.warn('[Job Insert] No school profile found, using user.id as school_id:', user.id);
        // Keep user.id as fallback, but this might cause RLS issues
      }

      // Fetch school logo in parallel (non-blocking) - set to null initially, update after job creation
      // This prevents logo fetch from blocking job creation
      jobData.school_logo = schoolProfile?.logo_url || null;
      const logoFetchPromise = Promise.resolve(
        supabase
          .from('schools')
          .select('logo_url')
          .eq('user_id', user.id)
          .maybeSingle()
      ).then(({ data }) => data?.logo_url || null).catch((err: unknown) => {
        console.warn('Could not fetch school logo:', err);
        return null;
      });

      // DETAILED LOGGING BEFORE INSERT
      console.log('[Job Insert] ============================================');
      console.log('[Job Insert] Attempting insert with data:', {
        ...jobData,
        user_id: user?.id,
        user_email: user?.email,
        school_profile_id: schoolProfile?.id,
        school_profile_name: schoolProfile?.school_name,
        timestamp: new Date().toISOString(),
      });
      console.log('[Job Insert] User info:', {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role,
      });
      console.log('[Job Insert] School profile:', schoolProfile);
      console.log('[Job Insert] Job data keys:', Object.keys(jobData));
      console.log('[Job Insert] Job data values:', Object.values(jobData).map(v =>
        typeof v === 'string' ? v.substring(0, 50) : v
      ));

      // Insert job with increased timeout (database operations can be slow with triggers)
      const insertTimeout = 20000; // 20 seconds - allows for database triggers and network latency
      const insertController = new AbortController();
      const insertTimeoutId = setTimeout(() => {
        insertController.abort();
      }, insertTimeout);

      let data, error;
      const startTime = Date.now();
      console.log('[Job Insert] Starting insert query at:', new Date().toISOString());

      // OPTION: Test with minimal insert first to isolate the issue
      // Uncomment this block to test with minimal data
      const USE_MINIMAL_TEST_INSERT = false; // Set to true for testing

      try {
        let insertQuery;
        let insertPromise;

        if (USE_MINIMAL_TEST_INSERT && schoolProfile?.id) {
          // Minimal test insert with just required fields
          console.log('[Job Insert] USING MINIMAL TEST INSERT');
          const minimalJobData = {
            school_id: schoolProfile.id,
            title: 'Test Job',
            department: formData.department.trim() || 'Test',
            subject: formData.subject.trim() || 'Test',
            grade_level: formData.grade_level.trim() || 'Elementary (1-5)',
            employment_type: employmentTypeValue || 'Full-time',
            location: formData.location.trim() || 'Test',
            salary: formData.salary.trim() || 'Test',
            description: 'Test description',
            requirements: 'Test requirements',
            benefits: 'Test benefits',
            school_name: formData.school_name.trim() || 'Test School',
            is_active: true,
          };

          console.log('[Job Insert] Minimal test data:', minimalJobData);

          insertQuery = supabase
            .from('jobs')
            .insert([minimalJobData])
            .select()
            .single();
        } else {
          // Full insert with all data
          console.log('[Job Insert] Using full job data insert');
          insertQuery = supabase
            .from('jobs')
            .insert([jobData])
            .select()
            .single();
        }

        console.log('[Job Insert] Insert query constructed:', {
          table: 'jobs',
          data: USE_MINIMAL_TEST_INSERT ? 'minimal' : 'full',
          select: 'single',
          hasAbortSignal: !!insertController.signal,
        });

        insertPromise = insertQuery;

        const insertTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Job creation timed out')), insertTimeout);
        });

        console.log('[Job Insert] Executing Promise.race with timeout:', insertTimeout, 'ms');
        const result = await Promise.race([insertPromise, insertTimeoutPromise]);
        clearTimeout(insertTimeoutId);
        const elapsedTime = Date.now() - startTime;
        console.log(`[Job Insert] Promise.race completed in ${elapsedTime}ms`);
        console.log('[Job Insert] Result type:', typeof result);
        console.log('[Job Insert] Result keys:', result ? Object.keys(result) : 'null');

        // Handle Supabase response structure
        if (result && 'data' in result) {
          data = result.data;
          error = result.error;
          console.log('[Job Insert] Supabase response:', {
            hasData: !!data,
            hasError: !!error,
            errorCode: error?.code,
            errorMessage: error?.message,
          });
        } else {
          // If result is the data directly (shouldn't happen, but handle it)
          console.warn('[Job Insert] Unexpected result structure:', result);
          data = result as any;
          error = null;
        }
      } catch (insertError: any) {
        clearTimeout(insertTimeoutId);
        const elapsedTime = Date.now() - startTime;
        console.error(`[Job Insert] ============================================`);
        console.error(`[Job Insert] FAILED after ${elapsedTime}ms`);
        console.error('[Job Insert] Error name:', insertError.name);
        console.error('[Job Insert] Error message:', insertError.message);
        console.error('[Job Insert] Error stack:', insertError.stack);
        console.error('[Job Insert] Full error object:', insertError);

        if (insertError.name === 'AbortError' || insertError.message?.includes('timed out')) {
          console.error('[Job Insert] TIMEOUT DETECTED - Query took longer than', insertTimeout, 'ms');
          console.error('[Job Insert] This suggests:');
          console.error('[Job Insert]   1. RLS policy is blocking or hanging');
          console.error('[Job Insert]   2. Database trigger is stuck');
          console.error('[Job Insert]   3. Network connectivity issue');
          console.error('[Job Insert]   4. Foreign key constraint issue');
          throw new Error('Job creation took too long. The database may be experiencing high load or there may be a policy/constraint issue. Please try again in a moment.');
        }
        throw insertError;
      }

      if (error) {
        const elapsedTime = Date.now() - startTime;
        console.error(`[Job Insert] ============================================`);
        console.error(`[Job Insert] Supabase returned error after ${elapsedTime}ms`);
        console.error('[Job Insert] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        console.error('[Job Insert] Common error codes:');
        console.error('[Job Insert]   - 42501: Insufficient privilege (RLS policy blocking)');
        console.error('[Job Insert]   - 23503: Foreign key violation');
        console.error('[Job Insert]   - 23502: Not null violation');
        console.error('[Job Insert]   - 23505: Unique constraint violation');
        console.error('[Job Insert]   - PGRST116: Column does not exist');
        console.error('[Job Insert]   - PGRST204: Column not in schema cache');

        // Comprehensive error handling with helpful messages
        console.error('[Job Insert] Processing error code:', error.code);

        if (error.code === '42501') {
          // Insufficient privilege - RLS policy blocking
          console.error('[Job Insert] RLS POLICY BLOCKING INSERT');
          console.error('[Job Insert] This means the Row Level Security policy is preventing the insert.');
          console.error('[Job Insert] Check:');
          console.error('[Job Insert]   1. RLS policies on jobs table');
          console.error('[Job Insert]   2. school_id matches authenticated user');
          console.error('[Job Insert]   3. User has INSERT permission');
          throw new Error('Permission denied. Your account may not have permission to post jobs. Please ensure your school profile is complete and contact support if this persists.');
        }
        if (error.code === '23502') {
          const column = error.message.match(/column "(\w+)"/)?.[1];
          console.error('[Job Insert] Missing required field:', column);
          throw new Error(`Missing required field: ${column}. Please fill all required fields.`);
        }
        if (error.code === '23503') {
          console.error('[Job Insert] Foreign key violation - school_id likely invalid');
          console.error('[Job Insert] school_id used:', jobData.school_id);
          console.error('[Job Insert] school_profile.id:', schoolProfile?.id);
          throw new Error('Invalid school reference. Please complete your school profile first.');
        }
        if (error.code === '23505') {
          throw new Error('A job with these details already exists. Please check your existing job postings.');
        }
        if (error.code === '23514') {
          // CHECK constraint violation - likely employment_type
          if (error.message.includes('employment_type')) {
            throw new Error(`Invalid employment type. Must be exactly one of: ${EMPLOYMENT_TYPES.join(', ')}. Received: "${employmentTypeValue}"`);
          }
          throw new Error(`Data validation error: ${error.message}. Please check your input and try again.`);
        }
        if (error.code === 'PGRST116' || error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('does not exist')) {
          if (error.message.includes('application_requirements')) {
            throw new Error(
              `Database schema error: The 'application_requirements' column is missing. ` +
              `Please run the migration in Supabase SQL Editor: ` +
              `Copy and run the contents of 'supabase-migrations/add_application_requirements.sql'`
            );
          }
          throw new Error(`Database schema error: ${error.message}. Please ensure all required columns exist. Contact support if this persists.`);
        }

        // Generic error with helpful context
        const errorMessage = error.message || 'Failed to create job posting';
        console.error('[Job Insert] Unknown error code:', error.code);
        throw new Error(`${errorMessage}. Error code: ${error.code}. If this problem continues, please try again in a moment or contact support.`);
      }

      // Update logo if it was fetched (non-blocking - don't wait for it)
      if (data && data.id) {
        logoFetchPromise.then((logoUrl: string | null) => {
          if (logoUrl) {
            // Update job with logo in background (don't await)
            Promise.resolve(
              supabase
                .from('jobs')
                .update({ school_logo: logoUrl })
                .eq('id', data.id)
            ).then(({ error }) => {
              if (error) {
                console.warn('Failed to update job with logo:', error);
              }
            }).catch((err: unknown) => {
              console.warn('Error updating job logo:', err);
            });
          }
        }).catch((err: unknown) => {
          console.warn('Logo fetch failed, job created without logo:', err);
        });
      }

      // Find matching teachers and send notifications (truly non-blocking)
      // This happens after job creation and won't block the response or throw errors
      if (data) {
        // Run matching/notifications in background - don't await or throw errors
        Promise.resolve().then(async () => {
          try {
            const matchingStartTime = Date.now();
            const matchingTimeout = 15000; // 15 seconds for matching + notifications

            const matchingPromise = findMatchingTeachers({
              id: data.id,
              subject: data.subject,
              grade_level: data.grade_level,
              location: data.location,
              archetype_tags: data.archetype_tags,
            }).then(matchingTeachers => {
              if (matchingTeachers.length > 0) {
                const teacherUserIds = matchingTeachers.map(t => t.user_id);
                return notifyJobPostedToTeachers(
                  teacherUserIds,
                  data.id,
                  data.title,
                  data.school_name
                );
              }
              return Promise.resolve();
            });

            const matchingTimeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Matching and notifications timed out')), matchingTimeout);
            });

            try {
              await Promise.race([matchingPromise, matchingTimeoutPromise]);
              const matchingElapsed = Date.now() - matchingStartTime;
              console.log(`Matching and notifications completed in ${matchingElapsed}ms`);
            } catch (matchingError: any) {
              const matchingElapsed = Date.now() - matchingStartTime;
              if (matchingError.message?.includes('timed out')) {
                console.warn(`Matching and notifications timed out after ${matchingElapsed}ms, but job was created successfully`);
              } else {
                console.error(`Matching error after ${matchingElapsed}ms:`, matchingError);
              }
              // Don't throw - job creation was successful
            }
          } catch (notifError) {
            // Log but don't fail job creation - this is background processing
            console.error('Error in background matching/notifications:', notifError);
          }
        }).catch((err) => {
          // Catch any unhandled errors in the background process
          console.error('Unexpected error in background matching:', err);
        });
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

      // Provide more helpful error messages based on error type
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('timed out') || errorMessage.includes('took too long')) {
        userFriendlyMessage = 'The request took too long. This might be due to high server load. Please try again in a moment.';
      } else if (errorMessage.includes('schema error')) {
        userFriendlyMessage = 'Database configuration issue detected. Please contact support.';
      } else if (errorMessage.includes('Missing required field')) {
        userFriendlyMessage = errorMessage; // Keep the specific field error
      }

      toast({
        title: 'Failed to post job',
        description: userFriendlyMessage,
        variant: 'destructive',
        duration: 6000, // Show longer for important errors
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
      application_requirements: {
        resume: true,
        cover_letter: false,
        desired_salary: false,
        linkedin_url: false,
        date_available: false,
        website_portfolio: false,
      },
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
      application_requirements: job.application_requirements || {
        resume: true,
        cover_letter: false,
        desired_salary: false,
        linkedin_url: false,
        date_available: false,
        website_portfolio: false,
      },
      start_date: '',
      application_deadline: '',
    });
    setShowJobModal(true);
  };

  const handleWizardSubmit = async (wizardData: JobPostingFormData) => {
    // Convert wizard data to formData format
    setFormData({
      title: wizardData.title,
      department: wizardData.department,
      subject: wizardData.subject,
      grade_level: wizardData.grade_level,
      job_type: wizardData.job_type,
      location: wizardData.location,
      salary: wizardData.salary,
      description: wizardData.description,
      requirements: wizardData.requirements,
      benefits: wizardData.benefits,
      school_name: wizardData.school_name,
      archetype_tags: wizardData.archetype_tags,
      start_date: wizardData.start_date,
      application_deadline: wizardData.application_deadline,
      application_requirements: wizardData.application_requirements,
    });

    // Use the existing mutation logic
    if (editingJob) {
      await updateJobMutation.mutateAsync(editingJob.id);
    } else {
      await createJobMutation.mutateAsync();
    }
  };

  const handleDeleteJob = (jobId: string) => {
    deleteJobMutation.mutate(jobId);
  };

  const handleToggleJobStatus = (job: JobWithApplications) => {
    toggleJobStatusMutation.mutate({ jobId: job.id, isActive: !job.is_active });
  };

  // Tour steps configuration
  const tourSteps = [
    {
      element: '[data-tour="dashboard-header"]',
      popover: {
        title: 'Welcome to your Dashboard',
        description: 'This is your command center for managing jobs and candidates.',
        side: 'bottom' as const,
        align: 'start' as const,
      }
    },
    {
      element: '[data-tour="post-job-btn"]',
      popover: {
        title: 'Post a New Job',
        description: 'Create a new job listing to start finding great teachers.',
        side: 'bottom' as const,
        align: 'end' as const,
      }
    },
    {
      element: '[data-tour="stats-cards"]',
      popover: {
        title: 'Quick Stats',
        description: 'See your active jobs and total applications at a glance.',
        side: 'top' as const,
        align: 'center' as const,
      }
    },
    {
      element: '[data-tour="candidates-tab"]',
      popover: {
        title: 'Manage Candidates',
        description: 'View and manage all your candidate applications here.',
        side: 'top' as const,
        align: 'center' as const,
      }
    }
  ];

  return (
    <AuthenticatedLayout showMobileNav>
      <OnboardingTour tourKey="school-dashboard" steps={tourSteps} />

      {/* Achievement Notification - Only for teachers */}
      {user?.user_metadata?.role === 'teacher' && (
        <AchievementNotification
          achievement={newAchievement}
          onClose={dismissNotification}
          onViewAll={() => setLocation('/profile#achievements')}
        />
      )}

      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12 max-w-6xl mx-auto" data-tour="dashboard-header">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 md:mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 bg-gradient-to-r from-[#00BCD4] via-[#E91E8C] to-[#FF6B35] bg-clip-text text-transparent break-words">
              School Dashboard
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Manage your job postings and applications</p>
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
            className="gap-2 h-10 sm:h-11 w-full sm:w-auto text-sm sm:text-base"
            data-testid="button-post-job"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Post Job</span>
          </Button>
        </div>

        {/* Dashboard Stats */}
        {jobsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6 sm:mb-8" data-tour="stats-cards">
            <Card className="p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground truncate">Active Jobs</span>
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{stats.activeJobs}</p>
            </Card>
            <Card className="p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground truncate">Total Applications</span>
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{stats.totalApplications}</p>
            </Card>
            <Card className="p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground truncate">Pending Reviews</span>
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{stats.pendingApplications}</p>
            </Card>
            <Card className="p-4 sm:p-5 md:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground truncate">Recent (7 days)</span>
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{stats.recentApplications}</p>
            </Card>
          </div>
        ) : null}

        {/* Recent Applications Widget */}
        {recentApplications && recentApplications.length > 0 && (
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 xs:gap-4 mb-4">
              <h2 className="text-base sm:text-lg font-semibold">Recent Applications</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTab('candidates');
                  setTimeout(() => {
                    const element = document.getElementById('applications');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }, 100);
                }}
                className="text-xs sm:text-sm w-full xs:w-auto"
              >
                View All
              </Button>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {recentApplications.slice(0, 5).map((app) => (
                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">
                      {(app as any).jobs?.title || 'Job Application'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    <Badge variant={app.status === 'pending' ? 'secondary' : 'default'} className="shrink-0 text-xs">
                      {app.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          const jobId = (app as any).job_id;
                          if (!user?.id || !app.teacher_id) return;

                          const convPromise = getOrCreateConversation(app.teacher_id, user.id, jobId);
                          const timeoutPromise = new Promise<never>((_, reject) => {
                            setTimeout(() => reject(new Error('Timeout')), 10000);
                          });
                          const result = await Promise.race([convPromise, timeoutPromise]) as { conversation: any };
                          if (result?.conversation?.id) {
                            setLocation(`/messages?conversation=${result.conversation.id}`);
                          }
                        } catch (error) {
                          console.error('Error opening conversation', error);
                        }
                      }}
                      className="h-8 w-8 sm:w-auto sm:px-2"
                      title="Message applicant"
                      disabled={!app.teacher_id}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">Message</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <TabsList className="grid min-w-[280px] w-full grid-cols-2 sm:grid-cols-4 h-auto mb-4 sm:mb-6 gap-1">
              <TabsTrigger value="jobs" className="h-10 sm:h-11 text-xs sm:text-sm md:text-base px-2 sm:px-4">Job Postings</TabsTrigger>
              <TabsTrigger value="candidates" data-tour="candidates-tab" className="h-10 sm:h-11 text-xs sm:text-sm md:text-base px-2 sm:px-4">Candidates</TabsTrigger>
              <TabsTrigger value="offers" className="h-10 sm:h-11 text-xs sm:text-sm md:text-base px-2 sm:px-4">Offers</TabsTrigger>
              <TabsTrigger value="analytics" className="h-10 sm:h-11 text-xs sm:text-sm md:text-base px-2 sm:px-4">Analytics</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="jobs" className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 mb-4 sm:mb-6">
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  className="h-10 sm:h-12 pl-9 sm:pl-10 w-full text-sm sm:text-base"
                />
              </div>
              <div className="flex flex-col xs:flex-row xs:flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
                <Select value={jobFilterDepartment} onValueChange={setJobFilterDepartment}>
                  <SelectTrigger className="h-10 sm:h-12 w-full xs:w-auto min-w-[140px] text-sm sm:text-base">
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
                  <SelectTrigger className="h-10 sm:h-12 w-full xs:w-auto min-w-[140px] text-sm sm:text-base">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-3 sm:space-y-4">
                {filteredJobs.map((job) => (
                  <Card key={job.id} className="p-3 sm:p-4 md:p-6" data-testid={`card-job-${job.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 xs:gap-3 mb-2 sm:mb-3">
                          <Link href={`/jobs/${job.id}`} className="text-base sm:text-lg md:text-xl font-semibold text-primary hover:underline block break-words pr-2">
                            {job.title}
                          </Link>
                          <Badge variant={job.is_active ? 'default' : 'secondary'} className="rounded-full flex-shrink-0 w-fit text-xs">
                            {job.is_active ? 'Active' : 'Closed'}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 flex items-center gap-1">
                          <span className="truncate">{job.location}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          <Badge variant="outline" className="rounded-full bg-muted/30 text-xs">
                            {job.department || job.subject}
                          </Badge>
                          <Badge variant="outline" className="rounded-full bg-muted/30 text-xs">
                            {job.grade_level}
                          </Badge>
                          <Badge variant="outline" className="rounded-full bg-muted/30 text-xs">
                            {job.job_type}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            {job.applications?.length || 0} apps
                          </span>
                          <span className="hidden xs:inline">•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:flex-col sm:flex-nowrap pt-2 sm:pt-0 border-t sm:border-t-0 border-border mt-2 sm:mt-0 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditJob(job)}
                          className="h-9 sm:h-10 gap-1.5 sm:gap-2 flex-1 sm:flex-grow-0 text-xs sm:text-sm"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="inline">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleJobStatus(job)}
                          className="h-9 sm:h-10 gap-1.5 sm:gap-2 flex-1 sm:flex-grow-0 text-xs sm:text-sm"
                          disabled={toggleJobStatusMutation.isPending}
                        >
                          {job.is_active ? (
                            <>
                              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              <span className="inline">Close</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              <span className="inline">Open</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteJobId(job.id)}
                          className="h-9 sm:h-10 gap-1.5 sm:gap-2 flex-1 sm:flex-grow-0 text-xs sm:text-sm text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="inline">Delete</span>
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setActiveTab('candidates');
                            // Could filter by job ID here
                          }}
                          className="h-9 sm:h-10 gap-1.5 sm:gap-2 flex-1 sm:flex-grow-0 text-xs sm:text-sm"
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="inline">View</span>
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
            <Card>
              <CardContent className="pt-4 sm:pt-6 overflow-x-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">Candidate Pipeline</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage applications across all your jobs</p>
                  </div>
                  <Button onClick={() => setShowManualCandidateModal(true)} className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Candidate
                  </Button>
                </div>

                {user?.id && (
                  <CandidatePipelineView schoolId={user.id} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers">
            <Card>
              <CardContent className="p-4 sm:p-6 overflow-x-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold break-words">Job Offers</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Track all offers sent to candidates</p>
                  </div>
                </div>

                {user?.id && <OffersTable schoolId={user.id} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              {user?.id && <SchoolAnalyticsDashboard schoolId={user.id} />}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Job Posting/Editing Wizard */}
      <JobPostingWizard
        isOpen={showJobModal}
        onClose={() => {
          setShowJobModal(false);
          resetForm();
        }}
        onSubmit={handleWizardSubmit}
        initialData={editingJob ? {
          title: editingJob.title,
          department: editingJob.department || '',
          subject: editingJob.subject,
          grade_level: editingJob.grade_level,
          job_type: editingJob.job_type || '',
          location: editingJob.location,
          salary: editingJob.salary,
          description: editingJob.description,
          requirements: editingJob.requirements,
          benefits: editingJob.benefits,
          school_name: editingJob.school_name,
          archetype_tags: editingJob.archetype_tags || [],
          start_date: '',
          application_deadline: '',
          application_requirements: editingJob.application_requirements || {
            resume: true,
            cover_letter: false,
            desired_salary: false,
            linkedin_url: false,
            date_available: false,
            website_portfolio: false,
          },
        } : undefined}
        isSubmitting={createJobMutation.isPending || updateJobMutation.isPending}
      />


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
