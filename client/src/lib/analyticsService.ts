import { supabase } from './supabaseClient';

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
