/**
 * Email Notification Service
 * 
 * Processes email notification queue from database
 * and sends emails via Resend API
 */

import { supabase } from './supabaseClient';
import { sendEmail } from './resendService';
import {
  newCandidateMatchTemplate,
  newJobMatchTemplate,
  jobMatchDigestTemplate,
  applicationStatusUpdateTemplate,
  welcomeEmailTemplate,
  digestEmailTemplate,
  replaceTemplateVariables,
} from './emailTemplates';

export interface EmailNotification {
  id: string;
  type: 'new_candidate_match' | 'new_job_match' | 'application_status' | 'digest';
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  template_data: Record<string, any>;
}

/**
 * Process pending email notifications from the queue
 * This should be called periodically (e.g., every minute) or via a cron job
 */
export async function processEmailNotifications(batchSize: number = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // Get pending notifications from database
    const { data: notifications, error } = await supabase
      .rpc('get_pending_email_notifications', { batch_size: batchSize });

    if (error) {
      console.error('Error fetching pending notifications:', error);
      return { processed, succeeded, failed };
    }

    if (!notifications || notifications.length === 0) {
      return { processed, succeeded, failed };
    }

    // Filter notifications based on user preferences
    const filteredNotifications = [];
    for (const notification of notifications) {
      // Get recipient user_id from email
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', notification.recipient_email)
        .single();

      if (userData) {
        // Check if user should receive this notification
        const { data: shouldSend } = await supabase
          .rpc('should_send_email_notification', {
            p_user_id: userData.id,
            p_notification_type: notification.type,
          });

        if (shouldSend) {
          filteredNotifications.push(notification);
        } else {
          // Mark as cancelled if user has disabled this notification type
          await supabase.rpc('update_email_notification_status', {
            notification_id: notification.id,
            new_status: 'cancelled',
          });
        }
      } else {
        // If user not found, still try to send (might be external email)
        filteredNotifications.push(notification);
      }
    }

    if (filteredNotifications.length === 0) {
      return { processed, succeeded, failed };
    }

    // Process each filtered notification
    for (const notification of filteredNotifications) {
      processed++;
      
      try {
        await processSingleNotification(notification);
        succeeded++;
      } catch (error: any) {
        console.error(`Error processing notification ${notification.id}:`, error);
        failed++;
        
        // Update notification status to failed
        await supabase.rpc('update_email_notification_status', {
          notification_id: notification.id,
          new_status: 'failed',
          error_msg: error.message || 'Unknown error'
        });
      }
    }
  } catch (error) {
    console.error('Error in processEmailNotifications:', error);
  }

  return { processed, succeeded, failed };
}

/**
 * Process a single email notification
 */
async function processSingleNotification(notification: EmailNotification): Promise<void> {
  switch (notification.type) {
    case 'new_candidate_match':
      await processNewCandidateMatch(notification);
      break;
    
    case 'new_job_match':
      await processNewJobMatch(notification);
      break;
    
    case 'application_status':
      await processApplicationStatus(notification);
      break;
    
    case 'digest':
      await processDigest(notification);
      break;
    
    default:
      throw new Error(`Unknown notification type: ${notification.type}`);
  }

  // Mark as sent
  await supabase.rpc('update_email_notification_status', {
    notification_id: notification.id,
    new_status: 'sent'
  });
}

/**
 * Process new candidate match notification for schools
 */
async function processNewCandidateMatch(notification: EmailNotification): Promise<void> {
  const { job_id, job_title, candidate_count, school_name } = notification.template_data;
  const dashboardUrl = `${window.location.origin}/school/dashboard`;

  const html = newCandidateMatchTemplate({
    schoolName: school_name || 'School',
    jobTitle: job_title || 'Job Posting',
    candidateCount: candidate_count || 0,
    dashboardUrl,
  });

  // Replace template variables
  const finalHtml = replaceTemplateVariables(html, {
    unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
    preferences_url: `${window.location.origin}/settings?tab=email`,
  });

  await sendEmail({
    to: notification.recipient_email,
    subject: notification.subject,
    html: finalHtml,
  });
}

/**
 * Process new job match notification for teachers
 * This aggregates all matches into a digest
 */
async function processNewJobMatch(notification: EmailNotification): Promise<void> {
  const { teacher_id, match_count } = notification.template_data;
  const dashboardUrl = `${window.location.origin}/teacher/dashboard`;

  // Fetch all recent job matches for this teacher
  const { data: matches, error } = await supabase
    .from('teacher_job_matches')
    .select(`
      match_score,
      match_reason,
      jobs (
        id,
        title,
        school_name,
        location,
        subject,
        grade_level
      )
    `)
    .eq('teacher_id', teacher_id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    .order('match_score', { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to fetch job matches: ${error.message}`);
  }

  if (!matches || matches.length === 0) {
    // No matches to send, mark as cancelled
    await supabase.rpc('update_email_notification_status', {
      notification_id: notification.id,
      new_status: 'cancelled'
    });
    return;
  }

  // Format jobs for email template
  const jobs = matches.map((match: any) => ({
    title: match.jobs?.title || 'Job',
    schoolName: match.jobs?.school_name || 'School',
    location: match.jobs?.location || '',
    matchScore: match.match_score || 0,
    matchReason: match.match_reason || undefined,
    jobUrl: `${dashboardUrl}/jobs/${match.jobs?.id}`,
  }));

  // Use digest template for multiple matches, single template for one match
  let html: string;
  if (jobs.length === 1) {
    html = newJobMatchTemplate({
      teacherName: notification.recipient_name || 'Teacher',
      jobTitle: jobs[0].title,
      schoolName: jobs[0].schoolName,
      location: jobs[0].location,
      matchScore: jobs[0].matchScore,
      matchReason: jobs[0].matchReason || 'Archetype match',
      dashboardUrl: jobs[0].jobUrl || dashboardUrl,
    });
  } else {
    html = jobMatchDigestTemplate({
      teacherName: notification.recipient_name || 'Teacher',
      jobs,
      dashboardUrl,
    });
  }

  // Replace template variables
  const finalHtml = replaceTemplateVariables(html, {
    unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
    preferences_url: `${window.location.origin}/settings?tab=email`,
  });

  await sendEmail({
    to: notification.recipient_email,
    subject: notification.subject,
    html: finalHtml,
  });
}

/**
 * Process application status update notification
 */
async function processApplicationStatus(notification: EmailNotification): Promise<void> {
  const { application_id, status, job_title, school_name, message } = notification.template_data;
  const dashboardUrl = `${window.location.origin}/teacher/dashboard`;

  const html = applicationStatusUpdateTemplate({
    teacherName: notification.recipient_name || 'Teacher',
    jobTitle: job_title || 'Job',
    schoolName: school_name || 'School',
    status: status as 'reviewed' | 'contacted' | 'shortlisted' | 'hired' | 'rejected',
    message: message || undefined,
    dashboardUrl,
  });

  // Replace template variables
  const finalHtml = replaceTemplateVariables(html, {
    unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
    preferences_url: `${window.location.origin}/settings?tab=email`,
  });

  await sendEmail({
    to: notification.recipient_email,
    subject: notification.subject,
    html: finalHtml,
  });
}

/**
 * Process digest notification (daily/weekly summary)
 */
async function processDigest(notification: EmailNotification): Promise<void> {
  const { digest_type, summary_data, user_role } = notification.template_data;
  const dashboardUrl = user_role === 'teacher'
    ? `${window.location.origin}/teacher/dashboard`
    : `${window.location.origin}/school/dashboard`;

  const html = digestEmailTemplate({
    userName: notification.recipient_name || 'User',
    userRole: (user_role as 'teacher' | 'school') || 'teacher',
    summary: summary_data || {},
    dashboardUrl,
  });

  // Replace template variables
  const finalHtml = replaceTemplateVariables(html, {
    unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
    preferences_url: `${window.location.origin}/settings?tab=email`,
  });

  await sendEmail({
    to: notification.recipient_email,
    subject: notification.subject,
    html: finalHtml,
  });
}

/**
 * Start email notification processor
 * This should be called when the app starts (in production)
 * For now, it processes notifications on-demand
 */
export function startEmailNotificationProcessor(intervalMs: number = 60000): () => void {
  // Process immediately
  processEmailNotifications().catch(console.error);

  // Then process every interval
  const intervalId = setInterval(() => {
    processEmailNotifications().catch(console.error);
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Manually trigger email notification processing
 * Useful for testing or on-demand processing
 */
export async function triggerEmailProcessing(): Promise<void> {
  const result = await processEmailNotifications();
  console.log('Email processing result:', result);
}

