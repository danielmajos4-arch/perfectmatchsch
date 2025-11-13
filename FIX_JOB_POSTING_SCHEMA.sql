-- Fix Job Posting Schema Issues
-- Run this SQL in your Supabase SQL Editor to ensure all required columns exist

-- 1. Verify and add grade_level column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'grade_level'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN grade_level TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added grade_level column to jobs table';
  ELSE
    RAISE NOTICE 'grade_level column already exists';
  END IF;
END $$;

-- 2. Verify and add archetype_tags column if missing (from sprint6-matching-schema.sql)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'archetype_tags'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN archetype_tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE 'Added archetype_tags column to jobs table';
  ELSE
    RAISE NOTICE 'archetype_tags column already exists';
  END IF;
END $$;

-- 3. Add all missing required columns to jobs table
DO $$ 
BEGIN
  -- Add subject column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'subject'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN subject TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added subject column to jobs table';
  END IF;

  -- Add job_type column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN job_type TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added job_type column to jobs table';
  END IF;

  -- Add salary column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'salary'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN salary TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added salary column to jobs table';
  END IF;

  -- Add school_name column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'school_name'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN school_name TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added school_name column to jobs table';
  END IF;

  -- Add school_logo column if missing (nullable)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'school_logo'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN school_logo TEXT;
    RAISE NOTICE 'Added school_logo column to jobs table';
  END IF;

  -- Add posted_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'posted_at'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
    RAISE NOTICE 'Added posted_at column to jobs table';
  END IF;

  -- Add location column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN location TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added location column to jobs table';
  END IF;

  -- Add description column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN description TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added description column to jobs table';
  END IF;

  -- Add requirements column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'requirements'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN requirements TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added requirements column to jobs table';
  END IF;

  -- Add benefits column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'benefits'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN benefits TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added benefits column to jobs table';
  END IF;

  -- Add is_active column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;
    RAISE NOTICE 'Added is_active column to jobs table';
  END IF;

  -- Verify school_id column exists (critical)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN school_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added school_id column to jobs table';
  END IF;

  -- Verify title column exists (critical)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN title TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added title column to jobs table';
  END IF;

  RAISE NOTICE 'All required columns verified/added to jobs table';
END $$;

-- 4. Verify schools table has user_id column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'schools' 
    AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'schools table is missing user_id column. Please run supabase-schema-fixed.sql first.';
  ELSE
    RAISE NOTICE 'schools table has user_id column';
  END IF;
END $$;

-- 5. Create index on jobs.school_id if it doesn't exist (for performance)
CREATE INDEX IF NOT EXISTS idx_jobs_school_id ON public.jobs(school_id);

-- 6. Create index on jobs.grade_level if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_jobs_grade_level ON public.jobs(grade_level);

-- 7. Verify RLS policies are enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'jobs'
  ) THEN
    RAISE EXCEPTION 'jobs table does not exist. Please run supabase-schema-fixed.sql first.';
  END IF;

  -- Check if RLS is enabled
  IF NOT (
    SELECT relrowsecurity FROM pg_class 
    WHERE relname = 'jobs' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on jobs table';
  ELSE
    RAISE NOTICE 'RLS already enabled on jobs table';
  END IF;
END $$;

-- 8. Verify job posting policy exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'jobs' 
    AND policyname = 'Schools can insert their own jobs'
  ) THEN
    RAISE WARNING 'Job posting policy may be missing. Please verify RLS policies in supabase-schema-fixed.sql';
  ELSE
    RAISE NOTICE 'Job posting policy exists';
  END IF;
END $$;

-- Summary
SELECT 
  'Schema verification complete!' as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs') as jobs_column_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools') as schools_column_count;

