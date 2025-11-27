/**
 * Default Email Templates
 * 
 * Pre-populated templates created for schools on signup
 */

import type { EmailTemplate } from '@/pages/EmailTemplates';

export const DEFAULT_EMAIL_TEMPLATES: Omit<EmailTemplate, 'id' | 'school_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Standard Rejection Letter',
    category: 'rejection',
    subject: 'Application Update - {{job_title}}',
    body: `Dear {{teacher_name}},

Thank you for your interest in the {{job_title}} position at {{school_name}}.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.

We appreciate the time you took to apply and wish you the best in your job search.

Sincerely,
{{school_name}} Hiring Team`,
    is_default: true,
  },
  {
    name: 'Interview Invitation',
    category: 'interview',
    subject: 'Interview Invitation - {{job_title}} at {{school_name}}',
    body: `Dear {{teacher_name}},

We were impressed with your application for the {{job_title}} position and would like to invite you for an interview.

Interview Details:
Date: {{interview_date}}
Time: {{interview_time}}
Location: {{interview_location}}

Please confirm your availability by replying to this email.

We look forward to speaking with you!

Best regards,
{{school_name}} Hiring Team`,
    is_default: true,
  },
  {
    name: 'Job Offer',
    category: 'offer',
    subject: 'Job Offer - {{job_title}} at {{school_name}}',
    body: `Dear {{teacher_name}},

We are pleased to offer you the position of {{job_title}} at {{school_name}}.

Position Details:
- Start Date: {{start_date}}
- Salary: {{salary}}
- Department: {{department}}

Please review the attached offer letter and let us know your decision.

Congratulations!

Best regards,
{{school_name}} Hiring Team`,
    is_default: true,
  },
  {
    name: 'Request for More Information',
    category: 'request_info',
    subject: 'Additional Information Needed - {{job_title}}',
    body: `Dear {{teacher_name}},

Thank you for your application for the {{job_title}} position at {{school_name}}.

We would like to request some additional information to help us better evaluate your candidacy:

[Please specify what information is needed]

Please provide this information at your earliest convenience.

Thank you for your interest in joining our team.

Best regards,
{{school_name}} Hiring Team`,
    is_default: false,
  },
];

/**
 * Create default templates for a school
 */
export async function createDefaultTemplates(schoolId: string) {
  const { supabase } = await import('@/lib/supabaseClient');
  
  const templates = DEFAULT_EMAIL_TEMPLATES.map(template => ({
    ...template,
    school_id: schoolId,
  }));

  const { data, error } = await supabase
    .from('email_templates')
    .insert(templates)
    .select();

  if (error) {
    console.error('Error creating default templates:', error);
    throw error;
  }

  return data;
}
