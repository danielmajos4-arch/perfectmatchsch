/**
 * Resend API Service for Email Notifications
 * 
 * Handles email sending via server-side endpoint to avoid CORS issues.
 * The server handles all Resend API communication.
 */

import { supabase } from './supabaseClient';

const RESEND_FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || import.meta.env.VITE_FROM_EMAIL || 'noreply@perfectmatchschools.com';
const RESEND_SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@perfectmatchschools.com';

/**
 * Get authorization header with current session token
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    // Continue without auth header - server will reject if auth required
  }
  
  return headers;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via server-side endpoint (avoids CORS issues)
 * The server handles all Resend API communication
 * Requires authenticated user session
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const headers = await getAuthHeaders();
    
    // Call YOUR server endpoint, not Resend directly
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || RESEND_SUPPORT_EMAIL,
        from: options.from || RESEND_FROM_EMAIL,
        tags: options.tags || []
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send email'
      };
    }

    return {
      success: true,
      messageId: data.messageId
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

/**
 * Send email using a template
 */
export async function sendTemplateEmail(
  templateId: string,
  to: string,
  data: Record<string, any>
): Promise<EmailResult> {
  // This would use Resend's template API if available
  // For now, we'll use the regular sendEmail function
  // Templates should be rendered before calling this
  return {
    success: false,
    error: 'Template email not implemented. Use sendEmail with rendered template.',
  };
}

/**
 * Send notification to school when new candidates match
 */
export async function notifySchoolNewCandidates(
  schoolEmail: string,
  schoolName: string,
  candidateCount: number,
  jobTitle: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00BCD4, #E91E8C); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #00BCD4; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Candidates Matched!</h1>
          </div>
          <div class="content">
            <p>Hi ${schoolName},</p>
            <p>Great news! <strong>${candidateCount}</strong> new candidate${candidateCount > 1 ? 's have' : ' has'} been matched to your job posting: <strong>${jobTitle}</strong>.</p>
            <p>Log in to your dashboard to review these candidates and find your perfect match!</p>
            <a href="${window.location.origin}/school/dashboard" class="button">View Candidates</a>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This is an automated notification from Perfect Match Schools.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: schoolEmail,
    subject: `${candidateCount} New Candidate${candidateCount > 1 ? 's' : ''} Matched to Your Job`,
    html,
  });
}

/**
 * Send daily/weekly job match digest to teacher
 */
export async function sendTeacherJobDigest(
  teacherEmail: string,
  teacherName: string,
  jobs: Array<{ title: string; school_name: string; location: string; match_score: number }>
): Promise<void> {
  const jobList = jobs
    .map(
      (job) => `
      <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 6px; border-left: 4px solid #00BCD4;">
        <h3 style="margin: 0 0 10px 0; color: #333;">${job.title}</h3>
        <p style="margin: 5px 0; color: #666;">${job.school_name} • ${job.location}</p>
        <p style="margin: 5px 0; color: #00BCD4; font-weight: bold;">Match Score: ${job.match_score} pts</p>
      </div>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00BCD4, #E91E8C); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #00BCD4; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Job Matches for You!</h1>
          </div>
          <div class="content">
            <p>Hi ${teacherName},</p>
            <p>We found <strong>${jobs.length}</strong> new job${jobs.length > 1 ? 's' : ''} that match your teaching archetype:</p>
            ${jobList}
            <a href="${window.location.origin}/teacher/dashboard" class="button">View All Matches</a>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This is an automated notification from Perfect Match Schools.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: teacherEmail,
    subject: `${jobs.length} New Job Match${jobs.length > 1 ? 'es' : ''} for You`,
    html,
  });
}

