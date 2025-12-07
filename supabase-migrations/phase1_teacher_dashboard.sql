-- Phase 1: Teacher Dashboard & Application Tracking System
-- Database Schema Updates

-- ============================================
-- 1. Update applications table with status tracking
-- ============================================

-- Add status tracking columns to applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS viewed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS school_notes TEXT,
ADD COLUMN IF NOT EXISTS interview_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS offer_made_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

-- Update status constraint to include new statuses
ALTER TABLE public.applications 
DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications 
ADD CONSTRAINT applications_status_check 
CHECK (status IN ('pending', 'under_review', 'interview_scheduled', 'offer_made', 'rejected', 'withdrawn'));

-- Update default status if needed
ALTER TABLE public.applications 
ALTER COLUMN status SET DEFAULT 'pending';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_applications_teacher_status ON public.applications(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

-- ============================================
-- 2. Create profile_views table
-- ============================================

CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  source TEXT, -- 'search', 'application', 'direct_link'
  UNIQUE(teacher_id, school_id, DATE(viewed_at))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_views_teacher_id ON public.profile_views(teacher_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON public.profile_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_profile_views_school_id ON public.profile_views(school_id);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Teachers can view their profile analytics" ON public.profile_views;
CREATE POLICY "Teachers can view their profile analytics"
ON public.profile_views FOR SELECT
TO authenticated
USING (teacher_id IN (
  SELECT id FROM public.teachers WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Schools can log profile views" ON public.profile_views;
CREATE POLICY "Schools can log profile views"
ON public.profile_views FOR INSERT
TO authenticated
WITH CHECK (school_id IN (
  SELECT id FROM public.schools WHERE user_id = auth.uid()
));

-- ============================================
-- 3. Create saved_jobs table
-- ============================================

CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes TEXT,
  UNIQUE(teacher_id, job_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_jobs_teacher_id ON public.saved_jobs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_saved_at ON public.saved_jobs(saved_at);

-- Enable RLS
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Teachers manage their saved jobs" ON public.saved_jobs;
CREATE POLICY "Teachers manage their saved jobs"
ON public.saved_jobs FOR ALL
TO authenticated
USING (teacher_id IN (
  SELECT id FROM public.teachers WHERE user_id = auth.uid()
));

-- ============================================
-- 4. Function to auto-update application status when viewed
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_application_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-update status to 'under_review' when school first views
  IF NEW.viewed_at IS NOT NULL AND OLD.viewed_at IS NULL THEN
    NEW.status := 'under_review';
    NEW.viewed_count := COALESCE(OLD.viewed_count, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS application_view_trigger ON public.applications;
CREATE TRIGGER application_view_trigger
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  WHEN (NEW.viewed_at IS DISTINCT FROM OLD.viewed_at)
  EXECUTE FUNCTION public.handle_application_view();
