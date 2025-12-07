/**
 * Interview Scheduling Service
 * Handles interview invites, responses, and calendar integration
 */

import { supabase } from './supabaseClient';
import type { InterviewInvite } from '@shared/schema';

export interface CreateInterviewInviteParams {
  applicationId: string;
  teacherId: string;
  schoolId: string;
  jobId: string;
  scheduledAt: string;
  durationMinutes?: number;
  interviewType?: 'video' | 'phone' | 'in_person';
  location?: string;
  meetingLink?: string;
  notes?: string;
}

/**
 * Create an interview invite
 */
export async function createInterviewInvite(
  params: CreateInterviewInviteParams
): Promise<InterviewInvite> {
  const { data, error } = await supabase
    .from('interview_invites')
    .insert({
      application_id: params.applicationId,
      teacher_id: params.teacherId,
      school_id: params.schoolId,
      job_id: params.jobId,
      scheduled_at: params.scheduledAt,
      duration_minutes: params.durationMinutes || 30,
      interview_type: params.interviewType || 'video',
      location: params.location || null,
      meeting_link: params.meetingLink || null,
      notes: params.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as InterviewInvite;
}

/**
 * Get interview invites for a teacher
 */
export async function getTeacherInterviews(teacherId: string): Promise<InterviewInvite[]> {
  const { data, error } = await supabase
    .from('interview_invites')
    .select('*, job:jobs(*), school:schools(school_name, logo_url)')
    .eq('teacher_id', teacherId)
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data as InterviewInvite[];
}

/**
 * Get interview invites for a school
 */
export async function getSchoolInterviews(schoolId: string): Promise<InterviewInvite[]> {
  const { data, error } = await supabase
    .from('interview_invites')
    .select('*, job:jobs(*), teacher:teachers(full_name, profile_photo_url)')
    .eq('school_id', schoolId)
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data as InterviewInvite[];
}

/**
 * Accept an interview invite
 */
export async function acceptInterviewInvite(
  inviteId: string,
  teacherNotes?: string
): Promise<void> {
  const { error } = await supabase
    .from('interview_invites')
    .update({
      status: 'accepted',
      teacher_response_at: new Date().toISOString(),
      teacher_notes: teacherNotes || null,
    })
    .eq('id', inviteId);

  if (error) throw error;

  // Update application status to interview_scheduled
  const { data: invite } = await supabase
    .from('interview_invites')
    .select('application_id')
    .eq('id', inviteId)
    .single();

  if (invite) {
    await supabase
      .from('applications')
      .update({ status: 'interview_scheduled' })
      .eq('id', invite.application_id);
  }
}

/**
 * Decline an interview invite
 */
export async function declineInterviewInvite(
  inviteId: string,
  teacherNotes?: string
): Promise<void> {
  const { error } = await supabase
    .from('interview_invites')
    .update({
      status: 'declined',
      teacher_response_at: new Date().toISOString(),
      teacher_notes: teacherNotes || null,
    })
    .eq('id', inviteId);

  if (error) throw error;
}

/**
 * Sync interview to Google Calendar
 * Note: This requires Google Calendar API setup
 */
export async function syncToGoogleCalendar(inviteId: string): Promise<string | null> {
  // This would integrate with Google Calendar API
  // For now, return null (placeholder)
  console.log('[Calendar] Google Calendar sync not yet implemented');
  return null;
}
