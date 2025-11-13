-- Quick Fix: Create Missing Tables for Email Notifications
-- 
-- ⚠️ This is a TEMPORARY fix if you haven't run sprint6-matching-schema.sql yet
-- 
-- PROPER FIX: Run schemas in order (see SCHEMA_EXECUTION_ORDER.md)
-- 1. supabase-schema-fixed.sql
-- 2. sprint6-matching-schema.sql ← This creates job_candidates
-- 3. EMAIL_PREFERENCES_SCHEMA.sql
-- 4. EMAIL_NOTIFICATIONS_SCHEMA.sql
--
-- This script will create the missing tables if they don't exist
-- It's safe to run even if tables already exist (uses IF NOT EXISTS)

-- Check if job_candidates table exists, if not, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'job_candidates'
  ) THEN
    -- Create job_candidates table
    CREATE TABLE IF NOT EXISTS public.job_candidates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
      teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      match_score INTEGER DEFAULT 0,
      match_reason TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted', 'shortlisted', 'hired', 'hidden')),
      school_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      UNIQUE(job_id, teacher_id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_job_candidates_job_id ON public.job_candidates(job_id);
    CREATE INDEX IF NOT EXISTS idx_job_candidates_teacher_id ON public.job_candidates(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_job_candidates_status ON public.job_candidates(status);

    -- Enable RLS
    ALTER TABLE public.job_candidates ENABLE ROW LEVEL SECURITY;

    RAISE NOTICE 'Created job_candidates table';
  ELSE
    RAISE NOTICE 'job_candidates table already exists';
  END IF;
END $$;

-- Check if teacher_job_matches table exists, if not, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'teacher_job_matches'
  ) THEN
    -- Create teacher_job_matches table
    CREATE TABLE IF NOT EXISTS public.teacher_job_matches (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
      match_score INTEGER DEFAULT 0,
      match_reason TEXT,
      is_favorited BOOLEAN DEFAULT FALSE,
      is_hidden BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      UNIQUE(teacher_id, job_id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_teacher_job_matches_teacher_id ON public.teacher_job_matches(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_job_matches_job_id ON public.teacher_job_matches(job_id);

    -- Enable RLS
    ALTER TABLE public.teacher_job_matches ENABLE ROW LEVEL SECURITY;

    RAISE NOTICE 'Created teacher_job_matches table';
  ELSE
    RAISE NOTICE 'teacher_job_matches table already exists';
  END IF;
END $$;

-- Check if archetype_tags columns exist, if not, add them
DO $$
BEGIN
  -- Add to jobs table
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'archetype_tags'
  ) THEN
    ALTER TABLE public.jobs 
    ADD COLUMN archetype_tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE 'Added archetype_tags column to jobs table';
  ELSE
    RAISE NOTICE 'archetype_tags column already exists on jobs table';
  END IF;

  -- Add to teachers table
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'teachers' 
    AND column_name = 'archetype_tags'
  ) THEN
    ALTER TABLE public.teachers 
    ADD COLUMN archetype_tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE 'Added archetype_tags column to teachers table';
  ELSE
    RAISE NOTICE 'archetype_tags column already exists on teachers table';
  END IF;
END $$;

-- Summary
SELECT 
  'Schema check complete!' as status,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'job_candidates') 
    THEN '✅ job_candidates exists' 
    ELSE '❌ job_candidates missing' 
  END as job_candidates_status,
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teacher_job_matches') 
    THEN '✅ teacher_job_matches exists' 
    ELSE '❌ teacher_job_matches missing' 
  END as teacher_job_matches_status,
  CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'archetype_tags') 
    THEN '✅ jobs.archetype_tags exists' 
    ELSE '❌ jobs.archetype_tags missing' 
  END as jobs_archetype_tags_status,
  CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'archetype_tags') 
    THEN '✅ teachers.archetype_tags exists' 
    ELSE '❌ teachers.archetype_tags missing' 
  END as teachers_archetype_tags_status;

