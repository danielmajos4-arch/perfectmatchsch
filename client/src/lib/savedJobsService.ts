import { supabase } from './supabaseClient';
import type { SavedJob, Job } from '@shared/schema';

export interface SavedJobWithDetails extends SavedJob {
  job: Job;
}

/**
 * Get all saved jobs for a teacher
 */
export async function getSavedJobs(teacherId: string): Promise<SavedJobWithDetails[]> {
  const { data, error } = await supabase
    .from('saved_jobs')
    .select('*, job:jobs(*)')
    .eq('teacher_id', teacherId)
    .order('saved_at', { ascending: false });

  if (error) throw error;
  return data as SavedJobWithDetails[];
}

/**
 * Save a job for a teacher
 */
export async function saveJob(teacherId: string, jobId: string, notes?: string): Promise<SavedJob> {
  const { data, error } = await supabase
    .from('saved_jobs')
    .insert({
      teacher_id: teacherId,
      job_id: jobId,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SavedJob;
}

/**
 * Remove a saved job
 */
export async function unsaveJob(teacherId: string, jobId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_jobs')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('job_id', jobId);

  if (error) throw error;
}

/**
 * Check if a job is saved
 */
export async function isJobSaved(teacherId: string, jobId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('saved_jobs')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

/**
 * Update notes for a saved job
 */
export async function updateSavedJobNotes(
  teacherId: string,
  jobId: string,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from('saved_jobs')
    .update({ notes })
    .eq('teacher_id', teacherId)
    .eq('job_id', jobId);

  if (error) throw error;
}

/**
 * Get saved jobs count
 */
export async function getSavedJobsCount(teacherId: string): Promise<number> {
  const { count, error } = await supabase
    .from('saved_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', teacherId);

  if (error) throw error;
  return count || 0;
}
