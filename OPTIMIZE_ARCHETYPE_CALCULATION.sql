-- ============================================================================
-- OPTIMIZE ARCHETYPE CALCULATION PERFORMANCE
-- ============================================================================
-- This script modifies the auto_populate_teacher_matches trigger to skip
-- expensive match calculations during quiz submission, improving UX.
-- ============================================================================

-- ============================================================================
-- STEP 1: Modify auto_populate_teacher_matches to skip during quiz submission
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_populate_teacher_matches()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  match_score_val INTEGER;
  match_reason_val TEXT;
  is_quiz_submission BOOLEAN;
BEGIN
  -- Detect if this is a quiz submission (quiz_result being set for the first time)
  -- Skip expensive match calculation during quiz submission for better UX
  is_quiz_submission := (
    (OLD.quiz_result IS NULL OR OLD.quiz_result = '{}'::JSONB) 
    AND NEW.quiz_result IS NOT NULL 
    AND NEW.quiz_result != '{}'::JSONB
  );

  -- Skip match calculation during quiz submission
  -- Matches will be calculated later when teacher completes profile or updates it
  IF is_quiz_submission THEN
    RETURN NEW;
  END IF;

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
-- STEP 2: Create function to manually trigger match calculation
-- ============================================================================
-- This function can be called after onboarding completes to calculate matches
CREATE OR REPLACE FUNCTION public.calculate_teacher_matches(teacher_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  teacher_record RECORD;
  job_record RECORD;
  match_score_val INTEGER;
  match_reason_val TEXT;
  matches_created INTEGER := 0;
BEGIN
  -- Get teacher record
  SELECT * INTO teacher_record
  FROM public.teachers
  WHERE user_id = teacher_user_id;

  -- Check if teacher has required data
  IF teacher_record IS NULL THEN
    RAISE EXCEPTION 'Teacher not found: %', teacher_user_id;
  END IF;

  IF teacher_record.profile_complete = false OR teacher_record.archetype_tags IS NULL OR array_length(teacher_record.archetype_tags, 1) = 0 THEN
    RAISE NOTICE 'Teacher % does not have complete profile or archetype_tags', teacher_user_id;
    RETURN 0;
  END IF;

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
    AND j.archetype_tags && teacher_record.archetype_tags
  LOOP
    BEGIN
      -- Calculate match score
      match_score_val := public.calculate_match_score(
        teacher_record.archetype_tags,
        job_record.archetype_tags,
        teacher_record.subjects,
        job_record.subject,
        teacher_record.grade_levels,
        job_record.grade_level
      );
      
      -- Generate match reason
      match_reason_val := 'Archetype match: ' || array_to_string(
        (SELECT ARRAY(SELECT unnest(teacher_record.archetype_tags) INTERSECT SELECT unnest(job_record.archetype_tags))),
        ', '
      );
      
      -- Insert or update teacher match
      INSERT INTO public.teacher_job_matches (teacher_id, job_id, match_score, match_reason)
      VALUES (teacher_record.user_id, job_record.id, match_score_val, match_reason_val)
      ON CONFLICT (teacher_id, job_id)
      DO UPDATE SET
        match_score = EXCLUDED.match_score,
        match_reason = EXCLUDED.match_reason;
      
      -- Also create job_candidates entry
      INSERT INTO public.job_candidates (job_id, teacher_id, match_score, match_reason, status)
      VALUES (job_record.id, teacher_record.user_id, match_score_val, match_reason_val, 'new')
      ON CONFLICT (job_id, teacher_id)
      DO UPDATE SET
        match_score = EXCLUDED.match_score,
        match_reason = EXCLUDED.match_reason,
        updated_at = NOW();
      
      matches_created := matches_created + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create match for job %: %', job_record.id, SQLERRM;
    END;
  END LOOP;

  RETURN matches_created;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '✅ ARCHETYPE CALCULATION OPTIMIZED';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  • auto_populate_teacher_matches now skips during quiz submission';
  RAISE NOTICE '  • Match calculation deferred until after onboarding';
  RAISE NOTICE '  • Added calculate_teacher_matches() function for manual calculation';
  RAISE NOTICE '';
  RAISE NOTICE 'Quiz submission should now complete instantly!';
  RAISE NOTICE '';
  RAISE NOTICE 'To calculate matches after onboarding, call:';
  RAISE NOTICE '  SELECT public.calculate_teacher_matches(user_id);';
  RAISE NOTICE '';
END $$;

