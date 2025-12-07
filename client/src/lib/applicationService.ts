import { supabase } from './supabaseClient';
import type { Application, Job } from '@shared/schema';

export interface ApplicationWithJob extends Application {
  job: Job;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  underReview: number;
  interviewScheduled: number;
  offerMade: number;
  rejected: number;
  withdrawn: number;
  thisWeek: number;
}

/**
 * Get all applications for a teacher
 * Note: teacherId here is the user_id (from auth.users), not teachers.id
 */
export async function getTeacherApplications(teacherId: string): Promise<ApplicationWithJob[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, job:jobs(*)')
    .eq('teacher_id', teacherId)
    .order('applied_at', { ascending: false });

  if (error) throw error;
  return data as ApplicationWithJob[];
}

/**
 * Get a single application with job details
 */
export async function getApplication(applicationId: string): Promise<ApplicationWithJob | null> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, job:jobs(*)')
    .eq('id', applicationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as ApplicationWithJob;
}

/**
 * Get application statistics for a teacher
 * Note: teacherId here is the user_id (from auth.users), not teachers.id
 */
export async function getApplicationStats(teacherId: string): Promise<ApplicationStats> {
  const { data, error } = await supabase
    .from('applications')
    .select('status, applied_at')
    .eq('teacher_id', teacherId);

  if (error) throw error;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const stats: ApplicationStats = {
    total: data?.length || 0,
    pending: data?.filter(a => a.status === 'pending').length || 0,
    underReview: data?.filter(a => a.status === 'under_review').length || 0,
    interviewScheduled: data?.filter(a => a.status === 'interview_scheduled').length || 0,
    offerMade: data?.filter(a => a.status === 'offer_made').length || 0,
    rejected: data?.filter(a => a.status === 'rejected').length || 0,
    withdrawn: data?.filter(a => a.status === 'withdrawn').length || 0,
    thisWeek: data?.filter(a => {
      const appliedAt = new Date(a.applied_at);
      return appliedAt >= weekAgo;
    }).length || 0,
  };

  return stats;
}

/**
 * Update application status with email notification
 */
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: Application['status'],
  notes?: string
): Promise<void> {
  // Get current application data
  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select(`
      *,
      job:jobs(
        title,
        school_name
      )
    `)
    .eq('id', applicationId)
    .single();

  if (fetchError || !application) throw fetchError || new Error('Application not found');

  const oldStatus = application.status;

  // Update status
  const updateData: any = {
    status: newStatus,
    school_notes: notes,
  };

  if (newStatus === 'interview_scheduled') {
    updateData.interview_scheduled_at = new Date().toISOString();
  } else if (newStatus === 'offer_made') {
    updateData.offer_made_at = new Date().toISOString();
  } else if (newStatus === 'rejected') {
    updateData.rejected_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('applications')
    .update(updateData)
    .eq('id', applicationId);

  if (error) throw error;

  // Send email notification (non-blocking)
  if (oldStatus !== newStatus && application.job) {
    import('./emailService').then(({ notifyApplicationStatusChanged }) => {
      notifyApplicationStatusChanged({
        teacherId: application.teacher_id,
        schoolName: (application.job as any).school_name || 'School',
        jobTitle: (application.job as any).title || 'Job',
        oldStatus,
        newStatus,
        applicationId,
      }).catch(err => console.error('[Email] Failed to send notification:', err));
    });
  }
}

/**
 * Withdraw an application
 */
export async function withdrawApplication(applicationId: string): Promise<void> {
  await updateApplicationStatus(applicationId, 'withdrawn');
}

/**
 * Get applications filtered by status
 */
export async function getApplicationsByStatus(
  teacherId: string,
  status: Application['status']
): Promise<ApplicationWithJob[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, job:jobs(*)')
    .eq('teacher_id', teacherId)
    .eq('status', status)
    .order('applied_at', { ascending: false });

  if (error) throw error;
  return data as ApplicationWithJob[];
}

/**
 * Search applications by school name
 */
export async function searchApplications(
  teacherId: string,
  searchQuery: string
): Promise<ApplicationWithJob[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, job:jobs(*)')
    .eq('teacher_id', teacherId)
    .ilike('job.school_name', `%${searchQuery}%`)
    .order('applied_at', { ascending: false });

  if (error) throw error;
  return data as ApplicationWithJob[];
}
