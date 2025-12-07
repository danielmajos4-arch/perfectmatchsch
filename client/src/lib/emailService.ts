/**
 * Email Service - Phase 2
 * 
 * Handles email notifications with queue system and preference checking
 */

import { supabase } from './supabaseClient';
import { sendEmail } from './resendService';
import {
  applicationStatusUpdateTemplate,
  newJobMatchTemplate,
  newMessageTemplate,
} from './emailTemplates';

export interface EmailTemplate {
  template_name: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  template_data: Record<string, any>;
}

/**
 * Queue an email for sending
 * Emails are sent asynchronously to avoid blocking UI
 */
export async function queueEmail(email: EmailTemplate): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('queue_email', {
      p_recipient_email: email.recipient_email,
      p_recipient_name: email.recipient_name,
      p_subject: email.subject,
      p_template_name: email.template_name,
      p_template_data: email.template_data,
    });

    if (error) {
      console.error('[Email] Failed to queue:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Queued: ${email.template_name} to ${email.recipient_email}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to queue:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send application status change notification
 */
export async function notifyApplicationStatusChanged(params: {
  teacherId: string;
  schoolName: string;
  jobTitle: string;
  oldStatus: string;
  newStatus: string;
  applicationId: string;
}): Promise<void> {
  try {
    // Get teacher info
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('full_name, email, user_id')
      .eq('id', params.teacherId)
      .single();

    if (teacherError || !teacher) {
      console.error('[Email] Teacher not found:', teacherError);
      return;
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('email_application_updates')
      .eq('user_id', teacher.user_id)
      .single();

    // Default to true if preferences don't exist
    if (prefs && !prefs.email_application_updates) {
      console.log('[Email] User has disabled application update emails');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://perfectmatchschools.com';
    
    await queueEmail({
      template_name: 'application_status_changed',
      recipient_email: teacher.email,
      recipient_name: teacher.full_name,
      subject: `Your application to ${params.schoolName} has been updated`,
      template_data: {
        teacherName: teacher.full_name,
        schoolName: params.schoolName,
        jobTitle: params.jobTitle,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
        dashboardLink: `${origin}/teacher/dashboard`,
        applicationLink: `${origin}/teacher/applications`,
      },
    });
  } catch (error) {
    console.error('[Email] Failed to send application status notification:', error);
  }
}

/**
 * Send new matching job notification
 */
export async function notifyNewMatchingJob(params: {
  teacherId: string;
  jobId: string;
  jobTitle: string;
  schoolName: string;
  matchPercentage: number;
  salary: string;
  location: string;
}): Promise<void> {
  try {
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('full_name, email, archetype, user_id')
      .eq('id', params.teacherId)
      .single();

    if (teacherError || !teacher) {
      console.error('[Email] Teacher not found:', teacherError);
      return;
    }

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('email_new_matches')
      .eq('user_id', teacher.user_id)
      .single();

    if (prefs && !prefs.email_new_matches) {
      console.log('[Email] User has disabled new match emails');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://perfectmatchschools.com';

    await queueEmail({
      template_name: 'new_matching_job',
      recipient_email: teacher.email,
      recipient_name: teacher.full_name,
      subject: `New ${params.matchPercentage}% match: ${params.jobTitle}`,
      template_data: {
        teacherName: teacher.full_name,
        jobTitle: params.jobTitle,
        schoolName: params.schoolName,
        matchPercentage: params.matchPercentage,
        salary: params.salary,
        location: params.location,
        archetype: teacher.archetype || 'teacher',
        jobLink: `${origin}/jobs/${params.jobId}`,
      },
    });
  } catch (error) {
    console.error('[Email] Failed to send new matching job notification:', error);
  }
}

/**
 * Send profile viewed notification
 */
export async function notifyProfileViewed(params: {
  teacherId: string;
  schoolName: string;
  schoolLogo?: string;
}): Promise<void> {
  try {
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('full_name, email, user_id')
      .eq('id', params.teacherId)
      .single();

    if (teacherError || !teacher) {
      console.error('[Email] Teacher not found:', teacherError);
      return;
    }

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('email_profile_views')
      .eq('user_id', teacher.user_id)
      .single();

    if (prefs && !prefs.email_profile_views) {
      console.log('[Email] User has disabled profile view emails');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://perfectmatchschools.com';

    await queueEmail({
      template_name: 'profile_viewed',
      recipient_email: teacher.email,
      recipient_name: teacher.full_name,
      subject: `${params.schoolName} viewed your profile`,
      template_data: {
        teacherName: teacher.full_name,
        schoolName: params.schoolName,
        schoolLogo: params.schoolLogo,
        dashboardLink: `${origin}/teacher/dashboard`,
      },
    });
  } catch (error) {
    console.error('[Email] Failed to send profile viewed notification:', error);
  }
}

/**
 * Send new message notification
 */
export async function notifyNewMessage(params: {
  recipientId: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}): Promise<void> {
  try {
    // Get recipient info (could be teacher or school)
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;

    // Get user email from users table
    const { data: userData } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', params.recipientId)
      .single();

    if (!userData) return;

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('email_messages')
      .eq('user_id', params.recipientId)
      .single();

    if (prefs && !prefs.email_messages) {
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://perfectmatchschools.com';

    await queueEmail({
      template_name: 'new_message',
      recipient_email: userData.email,
      recipient_name: userData.full_name,
      subject: `New message from ${params.senderName}`,
      template_data: {
        recipientName: userData.full_name,
        senderName: params.senderName,
        messagePreview: params.messagePreview,
        conversationLink: `${origin}/messages?conversation=${params.conversationId}`,
      },
    });
  } catch (error) {
    console.error('[Email] Failed to send new message notification:', error);
  }
}
