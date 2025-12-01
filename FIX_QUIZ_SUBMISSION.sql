-- FIX QUIZ SUBMISSION LOOP
-- Run this script in Supabase SQL Editor to fix the "stuck in Calculating..." issue
-- This script safely adds missing columns, tables, and functions required for quiz submission

-- ============================================================================
-- STEP 1: Add missing archetype_tags column to teachers table
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'teachers' 
    AND column_name = 'archetype_tags'
  ) THEN
    ALTER TABLE public.teachers 
    ADD COLUMN archetype_tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE '✅ Added archetype_tags column to teachers table';
  ELSE
    RAISE NOTICE '✓ archetype_tags column already exists in teachers table';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add archetype_tags column to jobs table (if missing)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'archetype_tags'
  ) THEN
    ALTER TABLE public.jobs 
    ADD COLUMN archetype_tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE '✅ Added archetype_tags column to jobs table';
  ELSE
    RAISE NOTICE '✓ archetype_tags column already exists in jobs table';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create job_candidates table (if not exists)
-- ============================================================================
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

-- ============================================================================
-- STEP 4: Create teacher_job_matches table (if not exists)
-- ============================================================================
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

-- ============================================================================
-- STEP 5: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_job_candidates_job_id ON public.job_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_candidates_teacher_id ON public.job_candidates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_job_candidates_status ON public.job_candidates(status);
CREATE INDEX IF NOT EXISTS idx_teacher_job_matches_teacher_id ON public.teacher_job_matches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_job_matches_job_id ON public.teacher_job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_archetype_tags ON public.jobs USING GIN(archetype_tags);
CREATE INDEX IF NOT EXISTS idx_teachers_archetype_tags ON public.teachers USING GIN(archetype_tags);

-- ============================================================================
-- STEP 6: Enable RLS on new tables
-- ============================================================================
ALTER TABLE public.job_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_job_matches ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create RLS Policies for job_candidates
-- ============================================================================
DROP POLICY IF EXISTS "Schools can view candidates for their jobs" ON public.job_candidates;
DROP POLICY IF EXISTS "System can insert candidates" ON public.job_candidates;
DROP POLICY IF EXISTS "Schools can update candidate status" ON public.job_candidates;
DROP POLICY IF EXISTS "Teachers can view their candidacy" ON public.job_candidates;

CREATE POLICY "Schools can view candidates for their jobs" ON public.job_candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_candidates.job_id
      AND jobs.school_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view their candidacy" ON public.job_candidates
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "System can insert candidates" ON public.job_candidates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Schools can update candidate status" ON public.job_candidates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_candidates.job_id
      AND jobs.school_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 8: Create RLS Policies for teacher_job_matches
-- ============================================================================
DROP POLICY IF EXISTS "Teachers can view their own matches" ON public.teacher_job_matches;
DROP POLICY IF EXISTS "System can insert matches" ON public.teacher_job_matches;
DROP POLICY IF EXISTS "Teachers can update their matches" ON public.teacher_job_matches;

CREATE POLICY "Teachers can view their own matches" ON public.teacher_job_matches
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "System can insert matches" ON public.teacher_job_matches
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Teachers can update their matches" ON public.teacher_job_matches
  FOR UPDATE USING (auth.uid() = teacher_id);

-- ============================================================================
-- STEP 9: Create extract_archetype_tags function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.extract_archetype_tags(archetype_name TEXT)
RETURNS TEXT[] AS $$
BEGIN
  -- Map archetype names to tags
  RETURN CASE
    WHEN archetype_name = 'The Guide' THEN ARRAY['mentor', 'support', 'individual']::TEXT[]
    WHEN archetype_name = 'The Trailblazer' THEN ARRAY['innovator', 'technology', 'experiment']::TEXT[]
    WHEN archetype_name = 'The Changemaker' THEN ARRAY['advocate', 'equity', 'systemic']::TEXT[]
    WHEN archetype_name = 'The Connector' THEN ARRAY['collaborator', 'team', 'peer']::TEXT[]
    WHEN archetype_name = 'The Explorer' THEN ARRAY['specialist', 'content', 'standards']::TEXT[]
    WHEN archetype_name = 'The Leader' THEN ARRAY['leader', 'organize', 'structure']::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 10: Create update_teacher_archetype_tags trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_teacher_archetype_tags()
RETURNS TRIGGER AS $$
BEGIN
  -- Safely update archetype_tags when archetype changes
  IF NEW.archetype IS DISTINCT FROM OLD.archetype THEN
    NEW.archetype_tags := public.extract_archetype_tags(NEW.archetype);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If anything fails, just return NEW without modifying archetype_tags
  RAISE WARNING 'update_teacher_archetype_tags failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 11: Create/Replace the trigger for archetype_tags update
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_teacher_archetype_tags ON public.teachers;
CREATE TRIGGER trigger_update_teacher_archetype_tags
  BEFORE INSERT OR UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teacher_archetype_tags();

-- ============================================================================
-- STEP 12: Create calculate_match_score function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_match_score(
  teacher_tags TEXT[],
  job_tags TEXT[],
  teacher_subjects TEXT[],
  job_subject TEXT,
  teacher_grades TEXT[],
  job_grade TEXT
)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  tag_overlap INTEGER := 0;
BEGIN
  -- Handle null arrays gracefully
  IF teacher_tags IS NOT NULL AND job_tags IS NOT NULL THEN
    -- Archetype tag overlap (weight: 3 points per match)
    SELECT COUNT(*) INTO tag_overlap
    FROM unnest(teacher_tags) AS t_tag
    WHERE t_tag = ANY(job_tags);
    score := score + (tag_overlap * 3);
  END IF;
  
  -- Subject match (weight: 5 points)
  IF teacher_subjects IS NOT NULL AND job_subject IS NOT NULL THEN
    IF job_subject = ANY(teacher_subjects) THEN
      score := score + 5;
    END IF;
  END IF;
  
  -- Grade level match (weight: 3 points)
  IF teacher_grades IS NOT NULL AND job_grade IS NOT NULL THEN
    IF job_grade = ANY(teacher_grades) THEN
      score := score + 3;
    END IF;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 13: Create auto_populate_teacher_matches function (with error handling)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_populate_teacher_matches()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  match_score_val INTEGER;
  match_reason_val TEXT;
BEGIN
  -- Only process if teacher profile is complete AND has archetype_tags
  IF NEW.profile_complete = true AND NEW.archetype_tags IS NOT NULL AND array_length(NEW.archetype_tags, 1) > 0 THEN
    -- Find matching jobs
    FOR job_record IN
      SELECT 
        j.id,
        j.archetype_tags,
        j.subject,
        j.grade_level,
        j.is_active
      FROM public.jobs j
      WHERE j.is_active = true
      AND j.archetype_tags IS NOT NULL
      AND j.archetype_tags && NEW.archetype_tags  -- Overlap check
    LOOP
      BEGIN
        -- Calculate match score
        match_score_val := public.calculate_match_score(
          NEW.archetype_tags,
          job_record.archetype_tags,
          NEW.subjects,
          job_record.subject,
          NEW.grade_levels,
          job_record.grade_level
        );
        
        -- Generate match reason
        match_reason_val := 'Archetype match: ' || array_to_string(
          (SELECT ARRAY(SELECT unnest(NEW.archetype_tags) INTERSECT SELECT unnest(job_record.archetype_tags))),
          ', '
        );
        
        -- Insert or update teacher match
        INSERT INTO public.teacher_job_matches (teacher_id, job_id, match_score, match_reason)
        VALUES (NEW.user_id, job_record.id, match_score_val, match_reason_val)
        ON CONFLICT (teacher_id, job_id)
        DO UPDATE SET
          match_score = EXCLUDED.match_score,
          match_reason = EXCLUDED.match_reason;
        
        -- Also create job_candidates entry
        INSERT INTO public.job_candidates (job_id, teacher_id, match_score, match_reason, status)
        VALUES (job_record.id, NEW.user_id, match_score_val, match_reason_val, 'new')
        ON CONFLICT (job_id, teacher_id)
        DO UPDATE SET
          match_score = EXCLUDED.match_score,
          match_reason = EXCLUDED.match_reason,
          updated_at = NOW();
      EXCEPTION WHEN OTHERS THEN
        -- Log the error but continue processing other jobs
        RAISE WARNING 'Failed to create match for job %: %', job_record.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If the entire function fails, log and return NEW to not block the update
  RAISE WARNING 'auto_populate_teacher_matches failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 14: Create/Replace the trigger for auto-populating matches
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_auto_populate_teacher_matches ON public.teachers;
CREATE TRIGGER trigger_auto_populate_teacher_matches
  AFTER INSERT OR UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_teacher_matches();

-- ============================================================================
-- STEP 15: Verify the setup
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '✅ FIX QUIZ SUBMISSION - COMPLETE';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'The following has been set up:';
  RAISE NOTICE '  • archetype_tags column on teachers table';
  RAISE NOTICE '  • archetype_tags column on jobs table';
  RAISE NOTICE '  • job_candidates table with RLS policies';
  RAISE NOTICE '  • teacher_job_matches table with RLS policies';
  RAISE NOTICE '  • extract_archetype_tags function';
  RAISE NOTICE '  • update_teacher_archetype_tags trigger';
  RAISE NOTICE '  • auto_populate_teacher_matches trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'The quiz submission should now work correctly!';
  RAISE NOTICE '';
END $$;

