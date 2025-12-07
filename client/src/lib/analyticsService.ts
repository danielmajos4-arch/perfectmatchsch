import { supabase } from './supabaseClient';
import type { ProfileView } from '@shared/schema';

export interface TimeToHireMetric {
    jobId: string;
    jobTitle: string;
    daysToHire: number;
    postedAt: string;
    hiredAt: string;
}

export interface ConversionMetrics {
    totalApplications: number;
    interviewed: number;
    offersExtended: number;
    offersAccepted: number;
    conversionRate: {
        applicationToInterview: number;
        interviewToOffer: number;
        offerToAcceptance: number;
        overallConversion: number;
    };
}

export interface AnalyticsOverview {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    avgTimeToHire: number;
    offerAcceptanceRate: number;
}

/**
 * Calculate time to hire metrics for a school
 */
export async function getTimeToHireMetrics(schoolId: string): Promise<TimeToHireMetric[]> {
    const { data, error } = await supabase
        .from('offers')
        .select(`
      id,
      created_at,
      status,
      application:applications(
        id,
        applied_at,
        job:jobs(
          id,
          title,
          posted_at,
          school_id
        )
      )
    `)
        .eq('application.job.school_id', schoolId)
        .eq('status', 'accepted');

    if (error) throw error;

    return (data || [])
        .filter((offer: any) => offer.application?.job)
        .map((offer: any) => {
            const postedAt = new Date(offer.application.job.posted_at);
            const hiredAt = new Date(offer.created_at);
            const daysToHire = Math.ceil((hiredAt.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24));

            return {
                jobId: offer.application.job.id,
                jobTitle: offer.application.job.title,
                daysToHire,
                postedAt: offer.application.job.posted_at,
                hiredAt: offer.created_at,
            };
        });
}

/**
 * Get conversion rate metrics
 */
export async function getConversionMetrics(schoolId: string): Promise<ConversionMetrics> {
    // Get all applications for school's jobs
    const { data: applications, error: appError } = await supabase
        .from('applications')
        .select(`
      id,
      status,
      job:jobs!inner(school_id)
    `)
        .eq('job.school_id', schoolId);

    if (appError) throw appError;

    // Get offers
    const { data: offers, error: offerError } = await supabase
        .from('offers')
        .select(`
      id,
      status,
      application:applications!inner(
        job:jobs!inner(school_id)
      )
    `)
        .eq('application.job.school_id', schoolId);

    if (offerError) throw offerError;

    const totalApplications = applications?.length || 0;

    // Count interviewed (assuming 'contacted' or 'shortlisted' status means interviewed)
    const interviewed = applications?.filter((app: any) =>
        ['contacted', 'shortlisted', 'interviewed'].includes(app.status)
    ).length || 0;

    const offersExtended = offers?.length || 0;
    const offersAccepted = offers?.filter((offer: any) => offer.status === 'accepted').length || 0;

    return {
        totalApplications,
        interviewed,
        offersExtended,
        offersAccepted,
        conversionRate: {
            applicationToInterview: totalApplications > 0 ? (interviewed / totalApplications) * 100 : 0,
            interviewToOffer: interviewed > 0 ? (offersExtended / interviewed) * 100 : 0,
            offerToAcceptance: offersExtended > 0 ? (offersAccepted / offersExtended) * 100 : 0,
            overallConversion: totalApplications > 0 ? (offersAccepted / totalApplications) * 100 : 0,
        },
    };
}

/**
 * Get analytics overview for dashboard
 */
export async function getAnalyticsOverview(schoolId: string): Promise<AnalyticsOverview> {
    // Get jobs count
    const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, is_active')
        .eq('school_id', schoolId);

    if (jobsError) throw jobsError;

    // Get applications count
    const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select(`
      id,
      job:jobs!inner(school_id)
    `)
        .eq('job.school_id', schoolId);

    if (appsError) throw appsError;

    // Get time to hire metrics
    const timeToHireData = await getTimeToHireMetrics(schoolId);
    const avgTimeToHire = timeToHireData.length > 0
        ? timeToHireData.reduce((sum, metric) => sum + metric.daysToHire, 0) / timeToHireData.length
        : 0;

    // Get offer acceptance rate
    const { data: offers } = await supabase
        .from('offers')
        .select(`
      id,
      status,
      application:applications!inner(
        job:jobs!inner(school_id)
      )
    `)
        .eq('application.job.school_id', schoolId);

    const totalOffers = offers?.length || 0;
    const acceptedOffers = offers?.filter((offer: any) => offer.status === 'accepted').length || 0;
    const offerAcceptanceRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0;

    return {
        totalJobs: jobs?.length || 0,
        activeJobs: jobs?.filter((job: any) => job.is_active).length || 0,
        totalApplications: applications?.length || 0,
        avgTimeToHire: Math.round(avgTimeToHire),
        offerAcceptanceRate: Math.round(offerAcceptanceRate),
    };
}

// ============================================
// Profile View Tracking (Phase 1)
// ============================================

/**
 * Track when a school views a teacher's profile
 * Also sends email notification if enabled
 */
export async function trackProfileView(
  teacherId: string,
  schoolId?: string,
  source: 'search' | 'application' | 'direct_link' = 'search'
): Promise<void> {
  // Only track if schoolId is provided
  if (!schoolId) return;

  // Check if view already exists today (to respect UNIQUE constraint)
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('profile_views')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)
    .gte('viewed_at', `${today}T00:00:00`)
    .lt('viewed_at', `${today}T23:59:59`)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from('profile_views')
      .insert({
        teacher_id: teacherId,
        school_id: schoolId,
        source,
      });

    if (error) throw error;

    // Send email notification (non-blocking)
    try {
      const { data: school } = await supabase
        .from('schools')
        .select('school_name, logo_url')
        .eq('id', schoolId)
        .single();

      if (school) {
        // Import and call email notification (async, don't await)
        import('./emailService').then(({ notifyProfileViewed }) => {
          notifyProfileViewed({
            teacherId,
            schoolName: school.school_name,
            schoolLogo: school.logo_url || undefined,
          }).catch(err => console.error('[Email] Failed to send profile viewed notification:', err));
        });
      }
    } catch (err) {
      // Silently fail - email notification is non-critical
      console.error('[Analytics] Failed to send profile viewed email:', err);
    }
  }
}

/**
 * Get profile view statistics for a teacher
 */
export interface ProfileViewStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  weeklyData: Array<{ date: string; count: number }>;
}

export async function getProfileViewStats(teacherId: string): Promise<ProfileViewStats> {
  const { data, error } = await supabase
    .from('profile_views')
    .select('viewed_at')
    .eq('teacher_id', teacherId)
    .order('viewed_at', { ascending: false });

  if (error) throw error;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const views = data || [];
  const thisWeek = views.filter(v => new Date(v.viewed_at) >= weekAgo).length;
  const thisMonth = views.filter(v => new Date(v.viewed_at) >= monthAgo).length;

  // Group by date for weekly chart
  const weeklyDataMap = new Map<string, number>();
  const last30Days = views.filter(v => new Date(v.viewed_at) >= monthAgo);

  last30Days.forEach(view => {
    const date = new Date(view.viewed_at).toISOString().split('T')[0];
    weeklyDataMap.set(date, (weeklyDataMap.get(date) || 0) + 1);
  });

  // Fill in missing dates with 0
  const weeklyData: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    weeklyData.push({
      date,
      count: weeklyDataMap.get(date) || 0,
    });
  }

  return {
    total: views.length,
    thisWeek,
    thisMonth,
    weeklyData,
  };
}

/**
 * Get recent profile views
 */
export async function getRecentProfileViews(teacherId: string, limit = 10): Promise<ProfileView[]> {
  const { data, error } = await supabase
    .from('profile_views')
    .select('*, school:schools(school_name, logo_url)')
    .eq('teacher_id', teacherId)
    .order('viewed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
    return data as ProfileView[];
}

// ============================================
// Phase 3: Advanced Analytics
// ============================================

/**
 * Get application funnel metrics for school
 */
export interface ApplicationFunnel {
  totalApplications: number;
  underReview: number;
  interviewsScheduled: number;
  offersMade: number;
  offersAccepted: number;
  conversionRates: {
    reviewToInterview: number;
    interviewToOffer: number;
    offerToAcceptance: number;
    overallConversion: number;
  };
}

export async function getApplicationFunnel(schoolId: string): Promise<ApplicationFunnel> {
  // Get all applications for school's jobs
  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      id,
      status,
      job:jobs!inner(school_id)
    `)
    .eq('job.school_id', schoolId);

  if (error) throw error;

  const total = applications?.length || 0;
  const underReview = applications?.filter(a => a.status === 'under_review').length || 0;
  const interviewsScheduled = applications?.filter(a => a.status === 'interview_scheduled').length || 0;
  const offersMade = applications?.filter(a => a.status === 'offer_made').length || 0;
  const offersAccepted = applications?.filter(a => a.status === 'accepted').length || 0;

  return {
    totalApplications: total,
    underReview,
    interviewsScheduled,
    offersMade,
    offersAccepted,
    conversionRates: {
      reviewToInterview: underReview > 0 ? (interviewsScheduled / underReview) * 100 : 0,
      interviewToOffer: interviewsScheduled > 0 ? (offersMade / interviewsScheduled) * 100 : 0,
      offerToAcceptance: offersMade > 0 ? (offersAccepted / offersMade) * 100 : 0,
      overallConversion: total > 0 ? (offersAccepted / total) * 100 : 0,
    },
  };
}

/**
 * Get teacher application success metrics
 */
export interface TeacherSuccessMetrics {
  totalApplications: number;
  underReview: number;
  interviewsScheduled: number;
  offersReceived: number;
  successRate: number;
  averageResponseTime: number; // Days
}

export async function getTeacherSuccessMetrics(teacherId: string): Promise<TeacherSuccessMetrics> {
  const { data: applications, error } = await supabase
    .from('applications')
    .select('status, applied_at, viewed_at, interview_scheduled_at, offer_made_at')
    .eq('teacher_id', teacherId);

  if (error) throw error;

  const total = applications?.length || 0;
  const underReview = applications?.filter(a => a.status === 'under_review').length || 0;
  const interviewsScheduled = applications?.filter(a => a.status === 'interview_scheduled').length || 0;
  const offersReceived = applications?.filter(a => a.status === 'offer_made').length || 0;

  // Calculate average response time (from applied to viewed)
  const responseTimes = applications
    ?.filter(a => a.viewed_at && a.applied_at)
    .map(a => {
      const applied = new Date(a.applied_at);
      const viewed = new Date(a.viewed_at!);
      return (viewed.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24); // Days
    }) || [];

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  return {
    totalApplications: total,
    underReview,
    interviewsScheduled,
    offersReceived,
    successRate: total > 0 ? (offersReceived / total) * 100 : 0,
    averageResponseTime: Math.round(avgResponseTime * 10) / 10,
  };
}

/**
 * Calculate profile strength score (0-100)
 */
export interface ProfileStrength {
  score: number;
  breakdown: {
    basicInfo: number;
    experience: number;
    portfolio: number;
    engagement: number;
  };
  recommendations: string[];
}

export async function getProfileStrength(teacherId: string): Promise<ProfileStrength> {
  const { data: teacher, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', teacherId)
    .single();

  if (error || !teacher) throw error || new Error('Teacher not found');

  const breakdown = {
    basicInfo: 0,
    experience: 0,
    portfolio: 0,
    engagement: 0,
  };

  const recommendations: string[] = [];

  // Basic Info (25 points)
  if (teacher.full_name) breakdown.basicInfo += 5;
  if (teacher.phone) breakdown.basicInfo += 5;
  if (teacher.location) breakdown.basicInfo += 5;
  if (teacher.bio) breakdown.basicInfo += 5;
  if (teacher.profile_photo_url) breakdown.basicInfo += 5;
  if (breakdown.basicInfo < 25) recommendations.push('Complete your basic profile information');

  // Experience (30 points)
  if (teacher.years_experience) breakdown.experience += 10;
  if (teacher.subjects && teacher.subjects.length > 0) breakdown.experience += 10;
  if (teacher.grade_levels && teacher.grade_levels.length > 0) breakdown.experience += 10;
  if (breakdown.experience < 30) recommendations.push('Add your teaching experience and subjects');

  // Portfolio (25 points)
  if (teacher.resume_url) breakdown.portfolio += 10;
  if (teacher.teaching_philosophy) breakdown.portfolio += 10;
  if (teacher.portfolio_url) breakdown.portfolio += 5;
  if (breakdown.portfolio < 25) recommendations.push('Upload your resume and add a teaching philosophy');

  // Engagement (20 points)
  const { data: applications } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacherId);

  const appCount = applications?.length || 0;
  if (appCount > 0) breakdown.engagement += 10;
  if (appCount > 5) breakdown.engagement += 10;

  const { data: views } = await supabase
    .from('profile_views')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacherId);

  if ((views?.length || 0) > 10) breakdown.engagement += 5;
  if (breakdown.engagement < 20) recommendations.push('Start applying to jobs to increase engagement');

  const totalScore = breakdown.basicInfo + breakdown.experience + breakdown.portfolio + breakdown.engagement;

  return {
    score: totalScore,
    breakdown,
    recommendations,
  };
}
