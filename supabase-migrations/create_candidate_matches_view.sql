-- Create candidate_matches view if it doesn't exist
-- This view combines job_candidates with job and teacher information

-- Drop the view if it exists to recreate it
DROP VIEW IF EXISTS public.candidate_matches;

-- Create the view with LEFT JOIN to handle cases where teacher profile might not exist
CREATE OR REPLACE VIEW public.candidate_matches AS
SELECT 
  jc.id,
  jc.job_id,
  jc.teacher_id,
  jc.match_score,
  jc.match_reason,
  jc.status,
  jc.school_notes,
  jc.created_at,
  jc.updated_at,
  j.id as job_id_full,
  j.title as job_title,
  j.school_name,
  j.subject as job_subject,
  j.grade_level as job_grade_level,
  j.location as job_location,
  t.id as teacher_profile_id,
  COALESCE(t.full_name, u.full_name, u.email, 'Unknown Teacher') as teacher_name,
  COALESCE(t.email, u.email, '') as teacher_email,
  t.archetype as teacher_archetype,
  COALESCE(t.subjects, ARRAY[]::TEXT[]) as teacher_subjects,
  COALESCE(t.grade_levels, ARRAY[]::TEXT[]) as teacher_grade_levels,
  COALESCE(t.years_experience, '') as years_experience,
  COALESCE(t.location, '') as teacher_location,
  t.profile_photo_url,
  t.resume_url,
  t.portfolio_url
FROM public.job_candidates jc
JOIN public.jobs j ON j.id = jc.job_id
LEFT JOIN public.teachers t ON t.user_id = jc.teacher_id
LEFT JOIN public.users u ON u.id = jc.teacher_id;

-- Grant access to view
GRANT SELECT ON public.candidate_matches TO authenticated;
GRANT SELECT ON public.candidate_matches TO anon;

-- Add comment
COMMENT ON VIEW public.candidate_matches IS 'View combining job_candidates with job and teacher information for easy querying';

