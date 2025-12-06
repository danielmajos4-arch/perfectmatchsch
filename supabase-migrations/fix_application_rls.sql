-- Fix RLS policies for applications and job_candidates
-- Ensures schools can properly access applications and candidates

-- ============================================================================
-- 1. Ensure applications RLS policies are correct
-- ============================================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Teachers can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Schools can view applications for their jobs" ON public.applications;
DROP POLICY IF EXISTS "Teachers can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Schools can update application status" ON public.applications;

-- Recreate applications policies
CREATE POLICY "Teachers can view their own applications" ON public.applications
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Schools can view applications for their jobs" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
      AND jobs.school_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert applications" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Schools can update application status" ON public.applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
      AND jobs.school_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. Ensure job_candidates RLS policies are correct
-- ============================================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Schools can view candidates for their jobs" ON public.job_candidates;
DROP POLICY IF EXISTS "System can insert candidates" ON public.job_candidates;
DROP POLICY IF EXISTS "Schools can update candidate status" ON public.job_candidates;

-- Recreate job_candidates policies
CREATE POLICY "Schools can view candidates for their jobs" ON public.job_candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_candidates.job_id
      AND jobs.school_id = auth.uid()
    )
  );

-- Allow system/triggers to insert candidates
CREATE POLICY "System can insert candidates" ON public.job_candidates
  FOR INSERT WITH CHECK (true);

-- Allow schools to update candidate status
CREATE POLICY "Schools can update candidate status" ON public.job_candidates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_candidates.job_id
      AND jobs.school_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. Ensure candidate_matches view has proper permissions
-- ============================================================================

-- Grant SELECT on candidate_matches view to authenticated users
GRANT SELECT ON public.candidate_matches TO authenticated;
GRANT SELECT ON public.candidate_matches TO anon;

-- ============================================================================
-- 4. Add RLS policy for teachers to view their own candidate entries
-- ============================================================================

-- Teachers should be able to see if they're in a candidate pool
CREATE POLICY "Teachers can view their own candidate entries" ON public.job_candidates
  FOR SELECT USING (auth.uid() = teacher_id);

-- ============================================================================
-- 5. Verify RLS is enabled on all relevant tables
-- ============================================================================

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_candidates ENABLE ROW LEVEL SECURITY;

