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
  applicationSubmittedTemplate,
  newMessageTemplate,
  savedSearchAlertTemplate,
  welcomeEmailTemplate,
  digestEmailTemplate,
  replaceTemplateVariables,
  htmlToPlainText,
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

/**
 * Send email when teacher applies to a job
 */
export async function sendApplicationSubmittedEmail(applicationId: string): Promise<void> {
  try {
    // Fetch application details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        cover_letter,
        jobs (
          id,
          title,
          school_id,
          schools (
            id,
            school_name,
            user_id,
            users (
              email,
              full_name
            )
          )
        ),
        teachers (
          id,
          full_name,
          email,
          phone,
          years_experience,
          subjects
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      throw new Error(`Failed to fetch application: ${appError?.message}`);
    }

    const job = application.jobs as any;
    const school = job?.schools as any;
    const teacher = application.teachers as any;

    if (!school || !teacher) {
      throw new Error('Missing school or teacher data');
    }

    // Get match score if available
    const { data: match } = await supabase
      .from('candidate_matches')
      .select('match_score')
      .eq('job_id', job.id)
      .eq('teacher_id', teacher.id)
      .single();

    // Generate email
    const html = applicationSubmittedTemplate({
      schoolName: school.school_name || 'School',
      teacherName: teacher.full_name || 'Teacher',
      jobTitle: job.title || 'Job',
      teacherEmail: teacher.email || '',
      teacherPhone: teacher.phone || undefined,
      yearsExperience: teacher.years_experience || undefined,
      subjects: teacher.subjects || undefined,
      matchScore: match?.match_score || undefined,
      coverLetter: application.cover_letter || undefined,
      dashboardUrl: `${window.location.origin}/school/dashboard`,
    });

    const plainText = htmlToPlainText(html);

    // Send email
    const { sendEmail } = await import('./resendService');
    const result = await sendEmail({
      to: school.users?.email || school.user_id,
      subject: `New Application: ${teacher.full_name} for ${job.title}`,
      html: replaceTemplateVariables(html, {
        unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
        preferences_url: `${window.location.origin}/settings?tab=email`,
      }),
      text: plainText,
      tags: [
        { name: 'notification_type', value: 'application_submitted' },
        { name: 'application_id', value: applicationId },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
  } catch (error: any) {
    console.error('[EmailNotification] Error sending application submitted email:', error);
    throw error;
  }
}

/**
 * Send email when application status changes
 */
export async function sendApplicationStatusEmail(
  applicationId: string,
  newStatus: string
): Promise<void> {
  try {
    // Fetch application details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        jobs (
          id,
          title,
          school_id,
          schools (
            id,
            school_name
          )
        ),
        teachers (
          id,
          full_name,
          email
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      throw new Error(`Failed to fetch application: ${appError?.message}`);
    }

    const job = application.jobs as any;
    const school = job?.schools as any;
    const teacher = application.teachers as any;

    if (!school || !teacher) {
      throw new Error('Missing school or teacher data');
    }

    // Generate email
    const html = applicationStatusUpdateTemplate({
      teacherName: teacher.full_name || 'Teacher',
      jobTitle: job.title || 'Job',
      schoolName: school.school_name || 'School',
      status: newStatus as any,
      message: undefined, // Could be added from application notes
      dashboardUrl: `${window.location.origin}/teacher/dashboard`,
    });

    const plainText = htmlToPlainText(html);

    // Send email
    const { sendEmail } = await import('./resendService');
    const result = await sendEmail({
      to: teacher.email || '',
      subject: `Application Update: ${job.title} at ${school.school_name}`,
      html: replaceTemplateVariables(html, {
        unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
        preferences_url: `${window.location.origin}/settings?tab=email`,
      }),
      text: plainText,
      tags: [
        { name: 'notification_type', value: 'application_status' },
        { name: 'application_id', value: applicationId },
        { name: 'status', value: newStatus },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
  } catch (error: any) {
    console.error('[EmailNotification] Error sending application status email:', error);
    throw error;
  }
}

/**
 * Send email when new message is received
 */
export async function sendNewMessageEmail(messageId: string): Promise<void> {
  try {
    // Fetch message details
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_id,
        conversation_id,
        conversations (
          id,
          teacher_id,
          school_id,
          job_id,
          jobs (
            title
          ),
          teachers (
            full_name,
            email
          ),
          schools (
            school_name,
            users (
              email
            )
          )
        ),
        users!messages_sender_id_fkey (
          full_name
        )
      `)
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      throw new Error(`Failed to fetch message: ${msgError?.message}`);
    }

    const conversation = message.conversations as any;
    const sender = message.users as any;
    
    // Determine recipient
    let recipientEmail: string;
    let recipientName: string;
    const isTeacherSender = conversation.teacher_id === message.sender_id;
    
    if (isTeacherSender) {
      // School is recipient
      recipientEmail = conversation.schools?.users?.email || '';
      recipientName = conversation.schools?.school_name || 'School';
    } else {
      // Teacher is recipient
      recipientEmail = conversation.teachers?.email || '';
      recipientName = conversation.teachers?.full_name || 'Teacher';
    }

    if (!recipientEmail) {
      throw new Error('Recipient email not found');
    }

    // Generate email
    const messagePreview = message.content.length > 150
      ? message.content.substring(0, 150) + '...'
      : message.content;

    const html = newMessageTemplate({
      recipientName,
      senderName: sender.full_name || 'User',
      messagePreview,
      conversationUrl: `${window.location.origin}/messages?conversation=${conversation.id}`,
      jobTitle: conversation.jobs?.title || undefined,
    });

    const plainText = htmlToPlainText(html);

    // Send email
    const { sendEmail } = await import('./resendService');
    const result = await sendEmail({
      to: recipientEmail,
      subject: `New message from ${sender.full_name}`,
      html: replaceTemplateVariables(html, {
        unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
        preferences_url: `${window.location.origin}/settings?tab=email`,
      }),
      text: plainText,
      tags: [
        { name: 'notification_type', value: 'new_message' },
        { name: 'message_id', value: messageId },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
  } catch (error: any) {
    console.error('[EmailNotification] Error sending new message email:', error);
    throw error;
  }
}

/**
 * Send job match email to teacher (daily digest)
 */
export async function sendJobMatchEmail(teacherId: string, jobIds: string[]): Promise<void> {
  try {
    // This would typically be called as part of a daily digest
    // For now, we'll use the existing processNewJobMatch function
    console.log('[EmailNotification] Job match email will be sent via digest system');
  } catch (error: any) {
    console.error('[EmailNotification] Error sending job match email:', error);
    throw error;
  }
}

/**
 * Send candidate match email to school
 */
export async function sendCandidateMatchEmail(schoolId: string, teacherIds: string[]): Promise<void> {
  try {
    // Fetch school details
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select(`
        id,
        school_name,
        users (
          email
        )
      `)
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      throw new Error(`Failed to fetch school: ${schoolError?.message}`);
    }

    // This would typically aggregate matches and send digest
    // For now, use existing newCandidateMatchTemplate
    console.log('[EmailNotification] Candidate match email will be sent via digest system');
  } catch (error: any) {
    console.error('[EmailNotification] Error sending candidate match email:', error);
    throw error;
  }
}

/**
 * Send saved search alert email
 */
export async function sendSavedSearchAlertEmail(searchId: string, newJobIds: string[]): Promise<void> {
  try {
    // Fetch saved search details
    const { data: search, error: searchError } = await supabase
      .from('saved_searches')
      .select(`
        id,
        name,
        user_id,
        users (
          email,
          full_name
        )
      `)
      .eq('id', searchId)
      .single();

    if (searchError || !search) {
      throw new Error(`Failed to fetch saved search: ${searchError?.message}`);
    }

    // Fetch job details
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, school_name, location')
      .in('id', newJobIds);

    if (jobsError || !jobs) {
      throw new Error(`Failed to fetch jobs: ${jobsError?.message}`);
    }

    const user = search.users as any;
    if (!user) {
      throw new Error('User not found');
    }

    // Generate email
    const html = savedSearchAlertTemplate({
      teacherName: user.full_name || 'Teacher',
      searchName: search.name || 'Saved Search',
      jobs: jobs.map((job: any) => ({
        title: job.title || 'Job',
        schoolName: job.school_name || 'School',
        location: job.location || '',
        jobUrl: `${window.location.origin}/jobs/${job.id}`,
      })),
      dashboardUrl: `${window.location.origin}/teacher/dashboard`,
    });

    const plainText = htmlToPlainText(html);

    // Send email
    const { sendEmail } = await import('./resendService');
    const result = await sendEmail({
      to: user.email || '',
      subject: `New jobs match your search: ${search.name}`,
      html: replaceTemplateVariables(html, {
        unsubscribe_url: `${window.location.origin}/settings?tab=email&action=unsubscribe`,
        preferences_url: `${window.location.origin}/settings?tab=email`,
      }),
      text: plainText,
      tags: [
        { name: 'notification_type', value: 'saved_search_alert' },
        { name: 'search_id', value: searchId },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
  } catch (error: any) {
    console.error('[EmailNotification] Error sending saved search alert email:', error);
    throw error;
  }
}

