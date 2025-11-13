// Matching service functions for Sprint 6
// Provides helper functions for candidate/job matching

import { supabase } from './supabaseClient';
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
    job: m.job as Job,
  })) as (TeacherJobMatch & { job: Job })[];
}

/**
 * Update candidate status (for school dashboard)
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

  const { data, error } = await supabase
    .from('job_candidates')
    .update(updateData)
    .eq('id', candidateId)
    .select()
    .single();

  if (error) throw error;
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
  return data as Job[];
}

