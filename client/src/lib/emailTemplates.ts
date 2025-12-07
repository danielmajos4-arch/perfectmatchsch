/**
 * Email Templates
 * 
 * Responsive HTML email templates for Perfect Match Schools
 * All templates are mobile-first and use inline styles for email client compatibility
 */

// Brand colors - Updated to match modern design
const BRAND_COLORS = {
  primary: '#6366F1',      // Indigo
  secondary: '#8B5CF6',    // Purple
  accent: '#06B6D4',       // Cyan
  background: '#f9f9f9',   // Light gray
  text: '#333333',         // Dark gray
  textLight: '#666666',    // Medium gray
  white: '#ffffff',
  border: '#e0e0e0',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

// Base email styles (inline for email client compatibility)
const BASE_STYLES = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: ${BRAND_COLORS.text};
    margin: 0;
    padding: 0;
    background-color: ${BRAND_COLORS.background};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .email-container {
    max-width: 600px;
    margin: 0 auto;
    background-color: ${BRAND_COLORS.white};
  }
  .email-header {
    background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary});
    color: ${BRAND_COLORS.white};
    padding: 40px 20px;
    text-align: center;
    border-radius: 8px 8px 0 0;
  }
  .email-header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }
  .email-content {
    padding: 30px 20px;
    background-color: ${BRAND_COLORS.white};
  }
  .email-footer {
    padding: 20px;
    background-color: ${BRAND_COLORS.background};
    border-radius: 0 0 8px 8px;
    text-align: center;
    font-size: 12px;
    color: ${BRAND_COLORS.textLight};
  }
  .button {
    display: inline-block;
    padding: 14px 28px;
    background-color: ${BRAND_COLORS.primary};
    color: ${BRAND_COLORS.white};
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    margin: 20px 0;
    text-align: center;
  }
  .button:hover {
    background-color: #00a5b8;
  }
  @media only screen and (max-width: 600px) {
    .email-container {
      width: 100% !important;
    }
    .email-header h1 {
      font-size: 24px !important;
    }
    .email-content {
      padding: 20px 15px !important;
    }
    .button {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }
  }
`;

/**
 * Base email template wrapper
 */
function baseEmailTemplate(
  title: string,
  content: string,
  buttonText?: string,
  buttonUrl?: string
): string {
  const buttonHtml = buttonText && buttonUrl
    ? `<a href="${buttonUrl}" class="button" style="display: inline-block; padding: 14px 28px; background-color: ${BRAND_COLORS.primary}; color: ${BRAND_COLORS.white}; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; text-align: center;">${buttonText}</a>`
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${title}</title>
        <style>
          ${BASE_STYLES}
        </style>
      </head>
      <body>
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: ${BRAND_COLORS.white};">
          <div class="email-header" style="background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary}); color: ${BRAND_COLORS.white}; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2;">${title}</h1>
          </div>
          <div class="email-content" style="padding: 30px 20px; background-color: ${BRAND_COLORS.white};">
            ${content}
            ${buttonHtml}
          </div>
          <div class="email-footer" style="padding: 20px; background-color: ${BRAND_COLORS.background}; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: ${BRAND_COLORS.textLight};">
            <p style="margin: 0 0 10px 0;">This is an automated notification from Perfect Match Schools.</p>
            <p style="margin: 0;">
              <a href="{{unsubscribe_url}}" style="color: ${BRAND_COLORS.textLight}; text-decoration: underline;">Unsubscribe</a> | 
              <a href="{{preferences_url}}" style="color: ${BRAND_COLORS.textLight}; text-decoration: underline;">Email Preferences</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * New Candidate Match Email (School)
 */
export function newCandidateMatchTemplate(data: {
  schoolName: string;
  jobTitle: string;
  candidateCount: number;
  dashboardUrl: string;
}): string {
  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.schoolName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      Great news! <strong style="color: ${BRAND_COLORS.primary};">${data.candidateCount}</strong> new candidate${data.candidateCount > 1 ? 's have' : ' has'} been matched to your job posting: <strong>${data.jobTitle}</strong>.
    </p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      These candidates have been carefully matched based on their teaching archetypes and your job requirements. Log in to your dashboard to review their profiles and find your perfect match!
    </p>
  `;

  return baseEmailTemplate(
    'New Candidates Matched!',
    content,
    'View Candidates',
    data.dashboardUrl
  );
}

/**
 * New Job Match Email (Teacher) - Single Match
 */
export function newJobMatchTemplate(data: {
  teacherName: string;
  jobTitle: string;
  schoolName: string;
  location: string;
  matchScore: number;
  matchReason: string;
  dashboardUrl: string;
}): string {
  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.teacherName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      We found a new job that matches your teaching profile!
    </p>
    <div style="margin: 20px 0; padding: 20px; background-color: ${BRAND_COLORS.background}; border-radius: 6px; border-left: 4px solid ${BRAND_COLORS.primary};">
      <h2 style="margin: 0 0 10px 0; font-size: 20px; color: ${BRAND_COLORS.text}; font-weight: 600;">${data.jobTitle}</h2>
      <p style="margin: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textLight};">
        <strong>${data.schoolName}</strong> • ${data.location}
      </p>
      <p style="margin: 10px 0 5px 0; font-size: 14px; color: ${BRAND_COLORS.primary}; font-weight: 600;">
        Match Score: ${data.matchScore} pts
      </p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.textLight};">
        ${data.matchReason}
      </p>
    </div>
    <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 1.6;">
      View this job and more matches in your dashboard!
    </p>
  `;

  return baseEmailTemplate(
    'New Job Match for You!',
    content,
    'View Job Details',
    data.dashboardUrl
  );
}

/**
 * Job Match Digest Email (Teacher) - Multiple Matches
 */
export function jobMatchDigestTemplate(data: {
  teacherName: string;
  jobs: Array<{
    title: string;
    schoolName: string;
    location: string;
    matchScore: number;
    matchReason?: string;
    jobUrl?: string;
  }>;
  dashboardUrl: string;
}): string {
  const jobCards = data.jobs.map((job, index) => `
    <div style="margin: ${index > 0 ? '15px' : '0'} 0 15px 0; padding: 20px; background-color: ${BRAND_COLORS.background}; border-radius: 6px; border-left: 4px solid ${BRAND_COLORS.primary};">
      <h3 style="margin: 0 0 10px 0; font-size: 18px; color: ${BRAND_COLORS.text}; font-weight: 600;">${job.title}</h3>
      <p style="margin: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textLight};">
        <strong>${job.schoolName}</strong> • ${job.location}
      </p>
      <p style="margin: 10px 0 5px 0; font-size: 14px; color: ${BRAND_COLORS.primary}; font-weight: 600;">
        Match Score: ${job.matchScore} pts
      </p>
      ${job.matchReason ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.textLight};">${job.matchReason}</p>` : ''}
    </div>
  `).join('');

  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.teacherName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      We found <strong style="color: ${BRAND_COLORS.primary};">${data.jobs.length}</strong> new job${data.jobs.length > 1 ? 's' : ''} that match your teaching archetype:
    </p>
    ${jobCards}
    <p style="margin: 20px 0 0 0; font-size: 16px; line-height: 1.6;">
      View all your matches and apply to positions that interest you!
    </p>
  `;

  return baseEmailTemplate(
    `${data.jobs.length} New Job Match${data.jobs.length > 1 ? 'es' : ''} for You!`,
    content,
    'View All Matches',
    data.dashboardUrl
  );
}

/**
 * Application Status Update Email (Teacher)
 */
export function applicationStatusUpdateTemplate(data: {
  teacherName: string;
  jobTitle: string;
  schoolName: string;
  status: 'reviewed' | 'contacted' | 'shortlisted' | 'hired' | 'rejected';
  message?: string;
  dashboardUrl: string;
}): string {
  const statusMessages: Record<string, { title: string; message: string; color: string }> = {
    reviewed: {
      title: 'Application Under Review',
      message: 'Your application has been reviewed by the school.',
      color: BRAND_COLORS.primary,
    },
    contacted: {
      title: 'School Contacted You',
      message: 'The school has reached out regarding your application.',
      color: BRAND_COLORS.primary,
    },
    shortlisted: {
      title: 'You\'ve Been Shortlisted!',
      message: 'Congratulations! You\'ve been shortlisted for this position.',
      color: '#4CAF50',
    },
    hired: {
      title: 'Congratulations! You\'re Hired!',
      message: 'Great news! You\'ve been selected for this position.',
      color: '#4CAF50',
    },
    rejected: {
      title: 'Application Update',
      message: 'Thank you for your interest. Unfortunately, you were not selected for this position.',
      color: BRAND_COLORS.textLight,
    },
  };

  const statusInfo = statusMessages[data.status] || statusMessages.reviewed;

  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.teacherName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      Your application for <strong>${data.jobTitle}</strong> at <strong>${data.schoolName}</strong> has been updated.
    </p>
    <div style="margin: 20px 0; padding: 20px; background-color: ${BRAND_COLORS.background}; border-radius: 6px; border-left: 4px solid ${statusInfo.color};">
      <h2 style="margin: 0 0 10px 0; font-size: 20px; color: ${statusInfo.color}; font-weight: 600;">${statusInfo.title}</h2>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.text}; line-height: 1.6;">
        ${statusInfo.message}
      </p>
      ${data.message ? `<p style="margin: 15px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.text}; line-height: 1.6; font-style: italic;">"${data.message}"</p>` : ''}
    </div>
    <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 1.6;">
      View your application status and continue your job search in your dashboard.
    </p>
  `;

  return baseEmailTemplate(
    'Application Status Update',
    content,
    'View Application',
    data.dashboardUrl
  );
}

/**
 * Welcome Email (New User)
 */
export function welcomeEmailTemplate(data: {
  userName: string;
  userRole: 'teacher' | 'school';
  dashboardUrl: string;
  onboardingUrl: string;
}): string {
  const roleSpecificContent = data.userRole === 'teacher'
    ? `
      <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
        Complete your profile and take our archetype quiz to discover your teaching style and find jobs that match your unique strengths.
      </p>
    `
    : `
      <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
        Complete your school profile and start posting jobs to find the perfect teachers for your institution.
      </p>
    `;

  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.userName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      Welcome to Perfect Match Schools! We're excited to have you join our community.
    </p>
    ${roleSpecificContent}
    <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 1.6;">
      Get started by completing your profile setup.
    </p>
  `;

  return baseEmailTemplate(
    'Welcome to Perfect Match Schools!',
    content,
    'Complete Your Profile',
    data.onboardingUrl
  );
}

/**
 * Daily/Weekly Digest Email
 */
export function digestEmailTemplate(data: {
  userName: string;
  userRole: 'teacher' | 'school';
  summary: {
    newMatches?: number;
    newCandidates?: number;
    applications?: number;
    messages?: number;
  };
  dashboardUrl: string;
}): string {
  const summaryItems: string[] = [];

  if (data.userRole === 'teacher') {
    if (data.summary.newMatches) {
      summaryItems.push(`${data.summary.newMatches} new job match${data.summary.newMatches > 1 ? 'es' : ''}`);
    }
    if (data.summary.applications) {
      summaryItems.push(`${data.summary.applications} application update${data.summary.applications > 1 ? 's' : ''}`);
    }
  } else {
    if (data.summary.newCandidates) {
      summaryItems.push(`${data.summary.newCandidates} new candidate${data.summary.newCandidates > 1 ? 's' : ''}`);
    }
    if (data.summary.applications) {
      summaryItems.push(`${data.summary.applications} new application${data.summary.applications > 1 ? 's' : ''}`);
    }
  }

  if (data.summary.messages) {
    summaryItems.push(`${data.summary.messages} new message${data.summary.messages > 1 ? 's' : ''}`);
  }

  const summaryList = summaryItems.length > 0
    ? `<ul style="margin: 15px 0; padding-left: 20px; font-size: 16px; line-height: 1.8;">
        ${summaryItems.map(item => `<li style="margin: 5px 0;">${item}</li>`).join('')}
      </ul>`
    : '<p style="margin: 15px 0; font-size: 16px; line-height: 1.6;">No new updates this period.</p>';

  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.userName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      Here's your weekly summary from Perfect Match Schools:
    </p>
    ${summaryList}
    <p style="margin: 20px 0 0 0; font-size: 16px; line-height: 1.6;">
      Log in to your dashboard to see all the details and take action!
    </p>
  `;

  return baseEmailTemplate(
    'Your Weekly Summary',
    content,
    'View Dashboard',
    data.dashboardUrl
  );
}

/**
 * Application Submitted Email Template (Teacher → School)
 */
export function applicationSubmittedTemplate(data: {
  schoolName: string;
  teacherName: string;
  jobTitle: string;
  teacherEmail: string;
  teacherPhone?: string;
  yearsExperience?: string;
  subjects?: string[];
  matchScore?: number;
  coverLetter?: string;
  dashboardUrl: string;
}): string {
  const subjectsList = data.subjects && data.subjects.length > 0
    ? `<p style="margin: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textLight};"><strong>Subjects:</strong> ${data.subjects.join(', ')}</p>`
    : '';
  
  const matchScoreBadge = data.matchScore
    ? `<div style="display: inline-block; padding: 6px 12px; background-color: ${BRAND_COLORS.primary}; color: ${BRAND_COLORS.white}; border-radius: 4px; font-size: 14px; font-weight: 600; margin: 10px 0;">Match Score: ${data.matchScore} pts</div>`
    : '';

  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.schoolName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      You have received a new application for <strong>${data.jobTitle}</strong>.
    </p>
    <div style="margin: 20px 0; padding: 20px; background-color: ${BRAND_COLORS.background}; border-radius: 6px; border-left: 4px solid ${BRAND_COLORS.primary};">
      <h2 style="margin: 0 0 15px 0; font-size: 20px; color: ${BRAND_COLORS.text}; font-weight: 600;">${data.teacherName}</h2>
      ${matchScoreBadge}
      <p style="margin: 10px 0 5px 0; font-size: 14px; color: ${BRAND_COLORS.textLight};"><strong>Email:</strong> ${data.teacherEmail}</p>
      ${data.teacherPhone ? `<p style="margin: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textLight};"><strong>Phone:</strong> ${data.teacherPhone}</p>` : ''}
      ${data.yearsExperience ? `<p style="margin: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textLight};"><strong>Experience:</strong> ${data.yearsExperience} years</p>` : ''}
      ${subjectsList}
      ${data.coverLetter ? `<div style="margin: 15px 0 0 0; padding: 15px; background-color: ${BRAND_COLORS.white}; border-radius: 4px;"><p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: ${BRAND_COLORS.text};">Cover Letter:</p><p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.text}; line-height: 1.6; white-space: pre-wrap;">${data.coverLetter}</p></div>` : ''}
    </div>
    <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 1.6;">
      Review this application and other candidates in your dashboard.
    </p>
  `;

  return baseEmailTemplate(
    'New Application Received',
    content,
    'View Application',
    data.dashboardUrl
  );
}

/**
 * New Message Email Template
 */
export function newMessageTemplate(data: {
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationUrl: string;
  jobTitle?: string;
}): string {
  const jobContext = data.jobTitle
    ? `<p style="margin: 0 0 10px 0; font-size: 14px; color: ${BRAND_COLORS.textLight};"><strong>Regarding:</strong> ${data.jobTitle}</p>`
    : '';

  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.recipientName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      You have received a new message from <strong>${data.senderName}</strong>.
    </p>
    <div style="margin: 20px 0; padding: 20px; background-color: ${BRAND_COLORS.background}; border-radius: 6px; border-left: 4px solid ${BRAND_COLORS.primary};">
      ${jobContext}
      <p style="margin: 10px 0 5px 0; font-size: 14px; font-weight: 600; color: ${BRAND_COLORS.text};">Message Preview:</p>
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.text}; line-height: 1.6; font-style: italic;">"${data.messagePreview}"</p>
    </div>
    <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 1.6;">
      Continue the conversation in your messages.
    </p>
  `;

  return baseEmailTemplate(
    `New Message from ${data.senderName}`,
    content,
    'View Message',
    data.conversationUrl
  );
}

/**
 * Saved Search Alert Email Template
 */
export function savedSearchAlertTemplate(data: {
  teacherName: string;
  searchName: string;
  jobs: Array<{
    title: string;
    schoolName: string;
    location: string;
    jobUrl?: string;
  }>;
  dashboardUrl: string;
}): string {
  const jobCards = data.jobs.map((job, index) => `
    <div style="margin: ${index > 0 ? '15px' : '0'} 0 15px 0; padding: 20px; background-color: ${BRAND_COLORS.background}; border-radius: 6px; border-left: 4px solid ${BRAND_COLORS.primary};">
      <h3 style="margin: 0 0 10px 0; font-size: 18px; color: ${BRAND_COLORS.text}; font-weight: 600;">${job.title}</h3>
      <p style="margin: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textLight};">
        <strong>${job.schoolName}</strong> • ${job.location}
      </p>
      ${job.jobUrl ? `<a href="${job.jobUrl}" style="display: inline-block; margin-top: 10px; font-size: 14px; color: ${BRAND_COLORS.primary}; text-decoration: underline;">View Job →</a>` : ''}
    </div>
  `).join('');

  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.teacherName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      We found <strong style="color: ${BRAND_COLORS.primary};">${data.jobs.length}</strong> new job${data.jobs.length > 1 ? 's' : ''} that match your saved search: <strong>"${data.searchName}"</strong>
    </p>
    ${jobCards}
    <p style="margin: 20px 0 0 0; font-size: 16px; line-height: 1.6;">
      View all matching jobs and update your saved search preferences in your dashboard.
    </p>
  `;

  return baseEmailTemplate(
    `New Jobs Match Your Search: ${data.searchName}`,
    content,
    'View All Matches',
    data.dashboardUrl
  );
}

/**
 * Replace template variables with actual values
 */
/**
 * Profile Viewed Email (Teacher)
 */
export function profileViewedTemplate(data: {
  teacherName: string;
  schoolName: string;
  schoolLogo?: string;
  dashboardUrl: string;
}): string {
  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.teacherName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      Great news! <strong style="color: ${BRAND_COLORS.primary};">${data.schoolName}</strong> viewed your profile.
    </p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      This could be a sign they're interested in your teaching style and experience. Keep your profile updated and respond to messages promptly to increase your chances!
    </p>
    <p style="margin: 15px 0 0 0; font-size: 16px; line-height: 1.6;">
      View your profile analytics and see who's been checking you out.
    </p>
  `;

  return baseEmailTemplate(
    `${data.schoolName} Viewed Your Profile`,
    content,
    'View Dashboard',
    data.dashboardUrl
  );
}

/**
 * Weekly Digest Email (Teacher)
 */
export function weeklyDigestTemplate(data: {
  teacherName: string;
  weekStats: {
    newApplications: number;
    profileViews: number;
    newMatches: number;
    messagesReceived: number;
  };
  topMatches: Array<{
    title: string;
    schoolName: string;
    location: string;
    matchScore: number;
    jobUrl?: string;
  }>;
  dashboardUrl: string;
}): string {
  const statsContent = `
    <div style="margin: 20px 0; padding: 20px; background-color: ${BRAND_COLORS.background}; border-radius: 6px;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; color: ${BRAND_COLORS.text}; font-weight: 600;">Your Week in Review</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="text-align: center; padding: 15px; background-color: ${BRAND_COLORS.white}; border-radius: 4px;">
          <div style="font-size: 32px; font-weight: 700; color: ${BRAND_COLORS.primary}; margin-bottom: 5px;">${data.weekStats.newApplications}</div>
          <div style="font-size: 14px; color: ${BRAND_COLORS.textLight};">Applications Sent</div>
        </div>
        <div style="text-align: center; padding: 15px; background-color: ${BRAND_COLORS.white}; border-radius: 4px;">
          <div style="font-size: 32px; font-weight: 700; color: ${BRAND_COLORS.primary}; margin-bottom: 5px;">${data.weekStats.profileViews}</div>
          <div style="font-size: 14px; color: ${BRAND_COLORS.textLight};">Profile Views</div>
        </div>
        <div style="text-align: center; padding: 15px; background-color: ${BRAND_COLORS.white}; border-radius: 4px;">
          <div style="font-size: 32px; font-weight: 700; color: ${BRAND_COLORS.primary}; margin-bottom: 5px;">${data.weekStats.newMatches}</div>
          <div style="font-size: 14px; color: ${BRAND_COLORS.textLight};">New Matches</div>
        </div>
        <div style="text-align: center; padding: 15px; background-color: ${BRAND_COLORS.white}; border-radius: 4px;">
          <div style="font-size: 32px; font-weight: 700; color: ${BRAND_COLORS.primary}; margin-bottom: 5px;">${data.weekStats.messagesReceived}</div>
          <div style="font-size: 14px; color: ${BRAND_COLORS.textLight};">Messages</div>
        </div>
      </div>
    </div>
  `;

  const matchesContent = data.topMatches.length > 0 ? `
    <div style="margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; color: ${BRAND_COLORS.text}; font-weight: 600;">Top Matches This Week</h3>
      ${data.topMatches.map((job, index) => `
        <div style="margin: ${index > 0 ? '15px' : '0'} 0 15px 0; padding: 20px; background-color: ${BRAND_COLORS.background}; border-radius: 6px; border-left: 4px solid ${BRAND_COLORS.primary};">
          <h4 style="margin: 0 0 10px 0; font-size: 16px; color: ${BRAND_COLORS.text}; font-weight: 600;">${job.title}</h4>
          <p style="margin: 5px 0; font-size: 14px; color: ${BRAND_COLORS.textLight};">
            ${job.schoolName} • ${job.location}
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.primary}; font-weight: 600;">
            ${job.matchScore}% match
          </p>
        </div>
      `).join('')}
    </div>
  ` : '';

  const content = `
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">Hi ${data.teacherName},</p>
    <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
      Here's your weekly summary of activity on Perfect Match Schools:
    </p>
    ${statsContent}
    ${matchesContent}
    <p style="margin: 20px 0 0 0; font-size: 16px; line-height: 1.6;">
      Keep up the great work! Continue applying to positions and engaging with schools to increase your chances of finding the perfect match.
    </p>
  `;

  return baseEmailTemplate(
    'Your Weekly Job Search Summary',
    content,
    'View Dashboard',
    data.dashboardUrl
  );
}

export function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Generate plain text version from HTML email
 */
export function htmlToPlainText(html: string): string {
  // Simple HTML to plain text conversion
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

