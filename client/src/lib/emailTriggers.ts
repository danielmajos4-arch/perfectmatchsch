/**
 * Email Trigger System
 * 
 * Automatically triggers email notifications when:
 * - New candidates match a school's job posting
 * - New jobs match a teacher's archetype
 * - Application status changes
 * 
 * Uses Supabase realtime subscriptions for immediate notifications
 */

import { supabase } from './supabaseClient';
import { sendEmail } from './resendService';
import {
  newCandidateMatchTemplate,
  newJobMatchTemplate,
  applicationStatusUpdateTemplate,
  replaceTemplateVariables,
} from './emailTemplates';

// Store subscriptions for cleanup
let candidateSubscription: any = null;
let jobMatchSubscription: any = null;

// Debounce map to prevent duplicate emails
const emailDebounce = new Map<string, number>();
const DEBOUNCE_MS = 60000; // 1 minute debounce

/**
 * Check if we should send an email (debounce check)
 */
function shouldSendEmail(key: string): boolean {
  const now = Date.now();
  const lastSent = emailDebounce.get(key);
  
  if (lastSent && now - lastSent < DEBOUNCE_MS) {
    return false;
  }
  
  emailDebounce.set(key, now);
  return true;
}

/**
 * Start listening for new candidate matches
 * Triggers email to schools when teachers match their jobs
 */
export function startCandidateMatchListener(): void {
  if (candidateSubscription) {
    console.log('[EmailTriggers] Candidate match listener already running');
    return;
  }

  console.log('[EmailTriggers] Starting candidate match listener...');

  candidateSubscription = supabase
    .channel('candidate-matches')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'job_candidates',
      },
      async (payload) => {
        try {
          await handleNewCandidateMatch(payload.new as any);
        } catch (error) {
          console.error('[EmailTriggers] Error handling candidate match:', error);
        }
      }
    )
    .subscribe((status) => {
      console.log('[EmailTriggers] Candidate match subscription status:', status);
    });
}

/**
 * Start listening for new job matches
 * Triggers email to teachers when jobs match their archetype
 */
export function startJobMatchListener(): void {
  if (jobMatchSubscription) {
    console.log('[EmailTriggers] Job match listener already running');
    return;
  }

  console.log('[EmailTriggers] Starting job match listener...');

  jobMatchSubscription = supabase
    .channel('job-matches')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'teacher_job_matches',
      },
      async (payload) => {
        try {
          await handleNewJobMatch(payload.new as any);
        } catch (error) {
          console.error('[EmailTriggers] Error handling job match:', error);
        }
      }
    )
    .subscribe((status) => {
      console.log('[EmailTriggers] Job match subscription status:', status);
    });
}

/**
 * Stop all email trigger listeners
 */
export function stopEmailTriggerListeners(): void {
  if (candidateSubscription) {
    supabase.removeChannel(candidateSubscription);
    candidateSubscription = null;
    console.log('[EmailTriggers] Candidate match listener stopped');
  }

  if (jobMatchSubscription) {
    supabase.removeChannel(jobMatchSubscription);
    jobMatchSubscription = null;
    console.log('[EmailTriggers] Job match listener stopped');
  }
}

/**
 * Handle new candidate match - send email to school
 */
async function handleNewCandidateMatch(match: {
  id: string;
  job_id: string;
  teacher_id: string;
  match_score: number;
  match_reason: string;
}): Promise<void> {
  // Get job details and school info
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      school_id,
      school_name
    `)
    .eq('id', match.job_id)
    .single();

  if (jobError || !job) {
    console.error('[EmailTriggers] Failed to fetch job:', jobError);
    return;
  }

  // Get school user email
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select(`
      id,
      school_name,
      user_id,
      users (
        email,
        full_name
      )
    `)
    .eq('user_id', job.school_id)
    .single();

  if (schoolError || !school) {
    console.error('[EmailTriggers] Failed to fetch school:', schoolError);
    return;
  }

  const schoolUser = school.users as any;
  if (!schoolUser?.email) {
    console.error('[EmailTriggers] School email not found');
    return;
  }

  // Debounce check - aggregate multiple matches
  const debounceKey = `candidate:${job.school_id}:${match.job_id}`;
  if (!shouldSendEmail(debounceKey)) {
    console.log('[EmailTriggers] Debouncing candidate match email for job:', match.job_id);
    return;
  }

  // Count total new candidates for this job
  const { count } = await supabase
    .from('job_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', match.job_id)
    .eq('status', 'new');

  const candidateCount = count || 1;

  // Generate and send email
  const dashboardUrl = `${window.location.origin}/school/dashboard`;
  const html = newCandidateMatchTemplate({
    schoolName: school.school_name || 'School',
    jobTitle: job.title,
    candidateCount,
    dashboardUrl,
  });

  const finalHtml = replaceTemplateVariables(html, {
    unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
    preferences_url: `${window.location.origin}/settings?tab=email`,
  });

  const result = await sendEmail({
    to: schoolUser.email,
    subject: `${candidateCount} New Candidate${candidateCount > 1 ? 's' : ''} for ${job.title}`,
    html: finalHtml,
    tags: [
      { name: 'notification_type', value: 'new_candidate_match' },
      { name: 'job_id', value: match.job_id },
    ],
  });

  if (result.success) {
    console.log('[EmailTriggers] Sent candidate match email to:', schoolUser.email);
  } else {
    console.error('[EmailTriggers] Failed to send candidate match email:', result.error);
  }
}

/**
 * Handle new job match - send email to teacher
 */
async function handleNewJobMatch(match: {
  id: string;
  teacher_id: string;
  job_id: string;
  match_score: number;
  match_reason: string;
}): Promise<void> {
  // Debounce check - teachers may get multiple matches at once
  const debounceKey = `job:${match.teacher_id}`;
  if (!shouldSendEmail(debounceKey)) {
    console.log('[EmailTriggers] Debouncing job match email for teacher:', match.teacher_id);
    return;
  }

  // Get teacher info
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select(`
      id,
      full_name,
      email,
      user_id
    `)
    .eq('user_id', match.teacher_id)
    .single();

  if (teacherError || !teacher) {
    console.error('[EmailTriggers] Failed to fetch teacher:', teacherError);
    return;
  }

  if (!teacher.email) {
    console.error('[EmailTriggers] Teacher email not found');
    return;
  }

  // Get job details
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      school_name,
      location,
      subject,
      grade_level
    `)
    .eq('id', match.job_id)
    .single();

  if (jobError || !job) {
    console.error('[EmailTriggers] Failed to fetch job:', jobError);
    return;
  }

  // Generate and send email
  const dashboardUrl = `${window.location.origin}/teacher/dashboard`;
  const html = newJobMatchTemplate({
    teacherName: teacher.full_name || 'Teacher',
    jobTitle: job.title,
    schoolName: job.school_name,
    location: job.location || '',
    matchScore: match.match_score,
    matchReason: match.match_reason || 'Archetype match',
    dashboardUrl,
  });

  const finalHtml = replaceTemplateVariables(html, {
    unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
    preferences_url: `${window.location.origin}/settings?tab=email`,
  });

  const result = await sendEmail({
    to: teacher.email,
    subject: `New Job Match: ${job.title} at ${job.school_name}`,
    html: finalHtml,
    tags: [
      { name: 'notification_type', value: 'new_job_match' },
      { name: 'job_id', value: match.job_id },
      { name: 'teacher_id', value: match.teacher_id },
    ],
  });

  if (result.success) {
    console.log('[EmailTriggers] Sent job match email to:', teacher.email);
  } else {
    console.error('[EmailTriggers] Failed to send job match email:', result.error);
  }
}

/**
 * Trigger email when application status changes
 * Called from matchingService.ts when candidate status is updated
 */
export async function triggerApplicationStatusEmail(
  teacherId: string,
  jobId: string,
  status: string
): Promise<void> {
  // Get teacher info
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('full_name, email')
    .eq('user_id', teacherId)
    .single();

  if (teacherError || !teacher?.email) {
    console.error('[EmailTriggers] Failed to fetch teacher for status update:', teacherError);
    return;
  }

  // Get job info
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('title, school_name')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    console.error('[EmailTriggers] Failed to fetch job for status update:', jobError);
    return;
  }

  // Map status to email-friendly format
  const statusMap: Record<string, 'reviewed' | 'contacted' | 'shortlisted' | 'hired' | 'rejected'> = {
    'reviewed': 'reviewed',
    'contacted': 'contacted',
    'shortlisted': 'shortlisted',
    'hired': 'hired',
    'hidden': 'rejected',
  };

  const emailStatus = statusMap[status];
  if (!emailStatus) {
    console.log('[EmailTriggers] Status not email-worthy:', status);
    return;
  }

  // Generate and send email
  const dashboardUrl = `${window.location.origin}/teacher/dashboard`;
  const html = applicationStatusUpdateTemplate({
    teacherName: teacher.full_name || 'Teacher',
    jobTitle: job.title,
    schoolName: job.school_name,
    status: emailStatus,
    dashboardUrl,
  });

  const finalHtml = replaceTemplateVariables(html, {
    unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
    preferences_url: `${window.location.origin}/settings?tab=email`,
  });

  const result = await sendEmail({
    to: teacher.email,
    subject: `Application Update: ${job.title} at ${job.school_name}`,
    html: finalHtml,
    tags: [
      { name: 'notification_type', value: 'application_status' },
      { name: 'status', value: status },
    ],
  });

  if (result.success) {
    console.log('[EmailTriggers] Sent application status email to:', teacher.email);
  } else {
    console.error('[EmailTriggers] Failed to send application status email:', result.error);
  }
}

/**
 * Initialize email triggers
 * Call this after user authentication
 */
export function initializeEmailTriggers(): void {
  try {
    console.log('[EmailTriggers] Initializing email trigger system...');
    
    // Delay initialization slightly to ensure Supabase is ready
    setTimeout(() => {
      try {
        startCandidateMatchListener();
        startJobMatchListener();
        console.log('[EmailTriggers] Email trigger system initialized');
      } catch (error) {
        console.warn('[EmailTriggers] Failed to start listeners (non-critical):', error);
      }
    }, 1000);
  } catch (error) {
    console.warn('[EmailTriggers] Failed to initialize (non-critical):', error);
  }
}

/**
 * Cleanup email triggers
 * Call this on app shutdown
 */
export function cleanupEmailTriggers(): void {
  stopEmailTriggerListeners();
  emailDebounce.clear();
  console.log('[EmailTriggers] Email trigger system cleaned up');
}

