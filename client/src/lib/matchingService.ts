// Matching service functions for Sprint 6
// Provides helper functions for candidate/job matching

import { supabase } from './supabaseClient';
import { notifyApplicationStatusUpdate } from './notificationService';
import { triggerApplicationStatusEmail } from './emailTriggers';
import type { CandidateMatchView, TeacherJobMatch } from '@shared/matching';
import type { Job } from '@shared/schema';

/**
 * Get candidates for a specific job (for school dashboard)
 */
export async function getJobCandidates(
  jobId: string,
  filters?: {
    status?: string;
    archetype?: string;
    gradeLevel?: string;
    certification?: string;
  }
) {
  let query = supabase
    .from('candidate_matches')
    .select('*')
    .eq('job_id', jobId)
    .order('match_score', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.archetype) {
    query = query.eq('teacher_archetype', filters.archetype);
  }

  if (filters?.gradeLevel) {
    query = query.contains('teacher_grade_levels', [filters.gradeLevel]);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as CandidateMatchView[];
}

/**
 * Get all candidates for a school (across all their jobs)
 * Includes both candidate_matches and applications without candidates
 */
export async function getSchoolCandidates(schoolId: string, filters?: {
  jobId?: string;
  status?: string;
  archetype?: string;
}) {
  // First get all jobs for this school
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, title, school_name, subject, grade_level, location')
    .eq('school_id', schoolId);

  if (jobsError) throw jobsError;
  if (!jobs || jobs.length === 0) return [];

  const jobIds = jobs.map(j => j.id);

  // Query candidate_matches (includes job_candidates)
  let candidateQuery = supabase
    .from('candidate_matches')
    .select('*')
    .in('job_id', jobIds);

  if (filters?.jobId) {
    candidateQuery = candidateQuery.eq('job_id', filters.jobId);
  }

  if (filters?.status) {
    candidateQuery = candidateQuery.eq('status', filters.status);
  }

  if (filters?.archetype) {
    candidateQuery = candidateQuery.eq('teacher_archetype', filters.archetype);
  }

  let candidates: CandidateMatchView[] = [];
  const { data: candidatesData, error: candidatesError } = await candidateQuery;

  if (candidatesError) {
    console.error('Error fetching candidates:', candidatesError);
    // If view doesn't exist, try querying job_candidates directly
    if (candidatesError.code === '42P01' || candidatesError.message?.includes('does not exist')) {
      console.warn('candidate_matches view not found, querying job_candidates directly');
      // Fallback: query job_candidates directly
      let fallbackQuery = supabase
        .from('job_candidates')
        .select(`
          *,
          job:jobs(id, title, school_name, subject, grade_level, location),
          teacher:teachers!job_candidates_teacher_id_fkey(
            id,
            user_id,
            full_name,
            email,
            archetype,
            subjects,
            grade_levels,
            years_experience,
            location,
            profile_photo_url,
            resume_url,
            portfolio_url
          )
        `)
        .in('job_id', jobIds);

      if (filters?.jobId) {
        fallbackQuery = fallbackQuery.eq('job_id', filters.jobId);
      }

      if (filters?.status) {
        fallbackQuery = fallbackQuery.eq('status', filters.status);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (!fallbackError && fallbackData) {
        // Transform to CandidateMatchView format
        candidates = fallbackData.map((c: any) => {
          const job = Array.isArray(c.job) ? c.job[0] : c.job;
          const teacher = Array.isArray(c.teacher) ? c.teacher[0] : c.teacher;

          return {
            id: c.id,
            job_id: c.job_id,
            teacher_id: c.teacher_id,
            match_score: c.match_score,
            match_reason: c.match_reason,
            status: c.status,
            school_notes: c.school_notes,
            created_at: c.created_at,
            updated_at: c.updated_at,
            job_title: job?.title || '',
            school_name: job?.school_name || '',
            job_subject: job?.subject || '',
            job_grade_level: job?.grade_level || '',
            job_location: job?.location || '',
            teacher_name: teacher?.full_name || 'Unknown Teacher',
            teacher_email: teacher?.email || '',
            teacher_archetype: teacher?.archetype || null,
            teacher_subjects: teacher?.subjects || [],
            teacher_grade_levels: teacher?.grade_levels || [],
            years_experience: teacher?.years_experience || '',
            teacher_location: teacher?.location || '',
            profile_photo_url: teacher?.profile_photo_url || null,
            resume_url: teacher?.resume_url || null,
            portfolio_url: teacher?.portfolio_url || null,
          };
        }) as CandidateMatchView[];
      }
    }
  } else {
    candidates = (candidatesData || []) as CandidateMatchView[];
  }

  // Also query applications directly to catch any that don't have candidates
  let applicationQuery = supabase
    .from('applications')
    .select(`
      id,
      job_id,
      teacher_id,
      status,
      applied_at,
      cover_letter,
      job:jobs(id, title, school_name, subject, grade_level, location),
      teacher:teachers!applications_teacher_id_fkey(
        id,
        user_id,
        full_name,
        email,
        archetype,
        subjects,
        grade_levels,
        years_experience,
        location,
        profile_photo_url,
        resume_url,
        portfolio_url
      )
    `)
    .in('job_id', jobIds);

  if (filters?.jobId) {
    applicationQuery = applicationQuery.eq('job_id', filters.jobId);
  }

  const { data: applications, error: applicationsError } = await applicationQuery;

  if (applicationsError) {
    console.error('Error fetching applications:', applicationsError);
  }

  // Get candidate IDs to check which applications already have candidates
  const candidateTeacherIds = new Set(
    candidates.map(c => `${c.job_id}-${c.teacher_id}`)
  );

  // Convert applications to CandidateMatchView format for those without candidates
  const applicationCandidates: CandidateMatchView[] = (applications || [])
    .filter(app => {
      const key = `${app.job_id}-${app.teacher_id}`;
      return !candidateTeacherIds.has(key);
    })
    .map(app => {
      const job = Array.isArray(app.job) ? app.job[0] : app.job;
      const teacher = Array.isArray(app.teacher) ? app.teacher[0] : app.teacher;

      return {
        id: app.id, // Use application ID as candidate ID
        job_id: app.job_id,
        teacher_id: app.teacher_id,
        match_score: 5, // Default score for applications
        match_reason: 'Application submitted',
        status: app.status === 'pending' ? 'new' :
          app.status === 'under_review' ? 'reviewed' :
            app.status === 'accepted' ? 'shortlisted' :
              app.status === 'rejected' ? 'hidden' : 'new',
        school_notes: null,
        created_at: app.applied_at,
        updated_at: app.applied_at,
        job_title: job?.title || 'Unknown Job',
        school_name: job?.school_name || 'Unknown School',
        job_subject: job?.subject || '',
        job_grade_level: job?.grade_level || '',
        job_location: job?.location || '',
        teacher_profile_id: teacher?.id || '',
        teacher_name: teacher?.full_name || 'Unknown Teacher',
        teacher_email: teacher?.email || '',
        teacher_archetype: teacher?.archetype || null,
        teacher_subjects: teacher?.subjects || [],
        teacher_grade_levels: teacher?.grade_levels || [],
        years_experience: teacher?.years_experience || '',
        teacher_location: teacher?.location || '',
        profile_photo_url: teacher?.profile_photo_url || null,
        resume_url: teacher?.resume_url || null,
        portfolio_url: teacher?.portfolio_url || null,
        application_id: app.id, // Store application ID for reference
      } as CandidateMatchView;
    });

  // Combine candidates and application-based candidates
  const allCandidates = [
    ...candidates,
    ...applicationCandidates
  ];

  // Sort by match score (descending) and then by created_at (newest first)
  allCandidates.sort((a, b) => {
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return allCandidates;
}

/**
 * Get matched jobs for a teacher (for teacher dashboard)
 */
export async function getTeacherJobMatches(
  teacherId: string,
  filters?: {
    archetype?: string;
    subject?: string;
    gradeLevel?: string;
    favorited?: boolean;
  }
) {
  let query = supabase
    .from('teacher_job_matches')
    .select(`
      *,
      job:jobs(*)
    `)
    .eq('teacher_id', teacherId)
    .eq('is_hidden', false)
    .order('match_score', { ascending: false });

  if (filters?.favorited !== undefined) {
    query = query.eq('is_favorited', filters.favorited);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Apply additional filters on the job data
  let matches = data as any[];

  if (filters?.subject) {
    matches = matches.filter(m => m.job?.subject === filters.subject);
  }

  if (filters?.gradeLevel) {
    matches = matches.filter(m => m.job?.grade_level === filters.gradeLevel);
  }

  return matches.map(m => ({
    ...m,
    job: {
      ...(m.job as Job),
      job_type: (m.job as any)?.employment_type || (m.job as any)?.job_type || ''
    } as Job,
  })) as (TeacherJobMatch & { job: Job })[];
}

/**
 * Update candidate status (for school dashboard)
 * Also updates application status and sends notification to teacher
 */
export async function updateCandidateStatus(
  candidateId: string,
  status: string,
  notes?: string
) {
  const updateData: any = { status, updated_at: new Date().toISOString() };
  if (notes !== undefined) {
    updateData.school_notes = notes;
  }

  // Get candidate data first to find application
  const { data: candidateData, error: candidateError } = await supabase
    .from('job_candidates')
    .select('job_id, teacher_id')
    .eq('id', candidateId)
    .single();

  if (candidateError) throw candidateError;

  // Update job_candidates table
  const { data, error } = await supabase
    .from('job_candidates')
    .update(updateData)
    .eq('id', candidateId)
    .select()
    .single();

  if (error) throw error;

  // Map candidate status to application status
  const applicationStatusMap: Record<string, string> = {
    'new': 'pending',
    'reviewed': 'under_review',
    'contacted': 'under_review',
    'shortlisted': 'under_review',
    'hired': 'accepted',
    'hidden': 'rejected',
  };

  const applicationStatus = applicationStatusMap[status] || 'pending';

  // Update application status and send notification
  if (candidateData?.teacher_id && candidateData?.job_id) {
    try {
      // Find application by job_id and teacher_id
      const { data: applicationData } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', candidateData.job_id)
        .eq('teacher_id', candidateData.teacher_id)
        .maybeSingle();

      if (applicationData) {
        // Update application status
        await supabase
          .from('applications')
          .update({ status: applicationStatus })
          .eq('id', applicationData.id);

        // Get job and teacher info for notification
        const [jobResult, teacherResult] = await Promise.all([
          supabase.from('jobs').select('title, school_name').eq('id', candidateData.job_id).single(),
          supabase.from('teachers').select('full_name').eq('user_id', candidateData.teacher_id).maybeSingle(),
        ]);

        const job = jobResult.data;
        const teacher = teacherResult.data;

        if (job && teacher) {
          // Send notification to teacher about status change
          await notifyApplicationStatusUpdate(
            candidateData.teacher_id,
            applicationData.id,
            job.title,
            applicationStatus
          );

          // Also trigger email notification
          await triggerApplicationStatusEmail(
            candidateData.teacher_id,
            candidateData.job_id,
            status
          );
        }
      }
    } catch (notifError) {
      // Log but don't fail the status update
      console.error('Error updating application status or sending notification:', notifError);
    }
  }

  return data;
}

/**
 * Favorite or hide a job match (for teacher dashboard)
 */
export async function updateTeacherJobMatch(
  matchId: string,
  updates: {
    is_favorited?: boolean;
    is_hidden?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('teacher_job_matches')
    .update(updates)
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get jobs filtered by archetype tags (for teacher dashboard)
 */
export async function getJobsByArchetype(
  archetypeTags: string[],
  additionalFilters?: {
    subject?: string;
    gradeLevel?: string;
    location?: string;
  }
) {
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('is_active', true)
    .overlaps('archetype_tags', archetypeTags)
    .order('posted_at', { ascending: false });

  if (additionalFilters?.subject) {
    query = query.eq('subject', additionalFilters.subject);
  }

  if (additionalFilters?.gradeLevel) {
    query = query.eq('grade_level', additionalFilters.gradeLevel);
  }

  if (additionalFilters?.location) {
    query = query.ilike('location', `%${additionalFilters.location}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Map employment_type to job_type for UI consistency
  return (data || []).map(job => ({
    ...job,
    job_type: (job as any).employment_type || (job as any).job_type
  })) as Job[];
}

/**
 * Calculate match percentage between teacher and job
 * Returns score from 0-100
 */
export function calculateJobMatch(teacher: any, job: Job): number {
  let score = 0;
  let totalWeight = 0;

  // Subject match (weight: 35%)
  const subjectWeight = 35;
  const teacherSubjects = teacher.subjects || [];
  const jobSubject = job.subject || '';
  const subjectMatches = teacherSubjects.includes(jobSubject) ? 1 : 0;
  const subjectScore = subjectMatches * 100;
  score += subjectScore * (subjectWeight / 100);
  totalWeight += subjectWeight;

  // Grade level match (weight: 25%)
  const gradeWeight = 25;
  const teacherGrades = teacher.grade_levels || [];
  const jobGrade = job.grade_level || '';
  const gradeMatches = teacherGrades.includes(jobGrade) ? 1 : 0;
  const gradeScore = gradeMatches > 0 ? 100 : 0;
  score += gradeScore * (gradeWeight / 100);
  totalWeight += gradeWeight;

  // Archetype/culture match (weight: 20%)
  const cultureWeight = 20;
  const teacherArchetype = teacher.archetype || '';
  const jobArchetypeTags = job.archetype_tags || [];
  const cultureScore = jobArchetypeTags.length > 0 && teacherArchetype 
    ? (jobArchetypeTags.includes(teacherArchetype) ? 100 : 50)
    : 50;
  score += cultureScore * (cultureWeight / 100);
  totalWeight += cultureWeight;

  // Location match (weight: 15%)
  const locationWeight = 15;
  const teacherLocation = teacher.location || '';
  const jobLocation = job.location || '';
  const locationScore = teacherLocation === jobLocation ? 100 : 70;
  score += locationScore * (locationWeight / 100);
  totalWeight += locationWeight;

  // Experience match (weight: 5%)
  const expWeight = 5;
  const expScore = 80; // Default reasonable match
  score += expScore * (expWeight / 100);
  totalWeight += expWeight;

  return Math.round(score);
}

/**
 * Get recommended jobs for teacher with match scores
 */
export async function getRecommendedJobs(teacherId: string, limit = 10): Promise<Array<Job & { matchScore: number }>> {
  // Get teacher profile
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', teacherId)
    .single();

  if (teacherError || !teacher) {
    console.error('[Matching] Teacher not found:', teacherError);
    return [];
  }

  // Get all active jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(`
      *,
      school:schools(school_name, logo_url, location)
    `)
    .eq('is_active', true)
    .order('posted_at', { ascending: false });

  if (jobsError || !jobs) {
    console.error('[Matching] Failed to fetch jobs:', jobsError);
    return [];
  }

  // Calculate match score for each job
  const jobsWithScores = jobs.map(job => ({
    ...job,
    matchScore: calculateJobMatch(teacher, job as Job),
  }));

  // Sort by match score and return top N
  return jobsWithScores
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

