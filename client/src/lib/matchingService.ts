// Matching service functions for Sprint 6
// Provides helper functions for candidate/job matching

import { supabase } from './supabaseClient';
import { notifyApplicationStatusUpdate } from './notificationService';
import type { CandidateMatchView, TeacherJobMatch, Job } from '@shared/matching';

/**
 * Get candidates for a specific job (for school dashboard)
 */
export async function getJobCandidates(
  jobId: string,
  filters?: {
    status?: string;
    archetype?: string;
    gradeLevel?: string;
    certification?: string;
  }
) {
  let query = supabase
    .from('candidate_matches')
    .select('*')
    .eq('job_id', jobId)
    .order('match_score', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.archetype) {
    query = query.eq('teacher_archetype', filters.archetype);
  }

  if (filters?.gradeLevel) {
    query = query.contains('teacher_grade_levels', [filters.gradeLevel]);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as CandidateMatchView[];
}

/**
 * Get all candidates for a school (across all their jobs)
 */
export async function getSchoolCandidates(schoolId: string, filters?: {
  jobId?: string;
  status?: string;
  archetype?: string;
}) {
  // First get all jobs for this school
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id')
    .eq('school_id', schoolId);

  if (jobsError) throw jobsError;
  if (!jobs || jobs.length === 0) return [];

  const jobIds = jobs.map(j => j.id);

  let query = supabase
    .from('candidate_matches')
    .select('*')
    .in('job_id', jobIds)
    .order('match_score', { ascending: false });

  if (filters?.jobId) {
    query = query.eq('job_id', filters.jobId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.archetype) {
    query = query.eq('teacher_archetype', filters.archetype);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as CandidateMatchView[];
}

/**
 * Get matched jobs for a teacher (for teacher dashboard)
 */
export async function getTeacherJobMatches(
  teacherId: string,
  filters?: {
    archetype?: string;
    subject?: string;
    gradeLevel?: string;
    favorited?: boolean;
  }
) {
  let query = supabase
    .from('teacher_job_matches')
    .select(`
      *,
      job:jobs(*)
    `)
    .eq('teacher_id', teacherId)
    .eq('is_hidden', false)
    .order('match_score', { ascending: false });

  if (filters?.favorited !== undefined) {
    query = query.eq('is_favorited', filters.favorited);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Apply additional filters on the job data
  let matches = data as any[];

  if (filters?.subject) {
    matches = matches.filter(m => m.job?.subject === filters.subject);
  }

  if (filters?.gradeLevel) {
    matches = matches.filter(m => m.job?.grade_level === filters.gradeLevel);
  }

  return matches.map(m => ({
    ...m,
    job: {
      ...(m.job as Job),
      job_type: (m.job as any)?.employment_type || (m.job as any)?.job_type || ''
    } as Job,
  })) as (TeacherJobMatch & { job: Job })[];
}

/**
 * Update candidate status (for school dashboard)
 * Also updates application status and sends notification to teacher
 */
export async function updateCandidateStatus(
  candidateId: string,
  status: 'new' | 'reviewed' | 'contacted' | 'shortlisted' | 'hired' | 'hidden',
  notes?: string
) {
  const updateData: any = { status, updated_at: new Date().toISOString() };
  if (notes !== undefined) {
    updateData.school_notes = notes;
  }

  // Get candidate data first to find application
  const { data: candidateData, error: candidateError } = await supabase
    .from('job_candidates')
    .select('job_id, teacher_id')
    .eq('id', candidateId)
    .single();

  if (candidateError) throw candidateError;

  // Update job_candidates table
  const { data, error } = await supabase
    .from('job_candidates')
    .update(updateData)
    .eq('id', candidateId)
    .select()
    .single();

  if (error) throw error;

  // Map candidate status to application status
  const applicationStatusMap: Record<string, string> = {
    'new': 'pending',
    'reviewed': 'under_review',
    'contacted': 'under_review',
    'shortlisted': 'under_review',
    'hired': 'accepted',
    'hidden': 'rejected',
  };

  const applicationStatus = applicationStatusMap[status] || 'pending';

  // Update application status and send notification
  if (candidateData?.teacher_id && candidateData?.job_id) {
    try {
      // Find application by job_id and teacher_id
      const { data: applicationData } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', candidateData.job_id)
        .eq('teacher_id', candidateData.teacher_id)
        .maybeSingle();

      if (applicationData) {
        // Update application status
        await supabase
          .from('applications')
          .update({ status: applicationStatus })
          .eq('id', applicationData.id);

        // Get job and teacher info for notification
        const [jobResult, teacherResult] = await Promise.all([
          supabase.from('jobs').select('title, school_name').eq('id', candidateData.job_id).single(),
          supabase.from('teachers').select('full_name').eq('user_id', candidateData.teacher_id).maybeSingle(),
        ]);

        const job = jobResult.data;
        const teacher = teacherResult.data;

        if (job && teacher) {
          // Send notification to teacher about status change
          await notifyApplicationStatusUpdate(
            candidateData.teacher_id,
            applicationData.id,
            job.title,
            applicationStatus
          );
        }
      }
    } catch (notifError) {
      // Log but don't fail the status update
      console.error('Error updating application status or sending notification:', notifError);
    }
  }

  return data;
}

/**
 * Favorite or hide a job match (for teacher dashboard)
 */
export async function updateTeacherJobMatch(
  matchId: string,
  updates: {
    is_favorited?: boolean;
    is_hidden?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('teacher_job_matches')
    .update(updates)
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get jobs filtered by archetype tags (for teacher dashboard)
 */
export async function getJobsByArchetype(
  archetypeTags: string[],
  additionalFilters?: {
    subject?: string;
    gradeLevel?: string;
    location?: string;
  }
) {
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('is_active', true)
    .overlaps('archetype_tags', archetypeTags)
    .order('posted_at', { ascending: false });

  if (additionalFilters?.subject) {
    query = query.eq('subject', additionalFilters.subject);
  }

  if (additionalFilters?.gradeLevel) {
    query = query.eq('grade_level', additionalFilters.gradeLevel);
  }

  if (additionalFilters?.location) {
    query = query.ilike('location', `%${additionalFilters.location}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  // Map employment_type to job_type for UI consistency
  return (data || []).map(job => ({
    ...job,
    job_type: (job as any).employment_type || (job as any).job_type
  })) as Job[];
}

