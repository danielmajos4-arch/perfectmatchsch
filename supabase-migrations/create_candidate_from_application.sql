-- Create job_candidates entry when application is submitted
-- This ensures all applications appear in the candidate pool for schools

-- Function to create job_candidate from application
CREATE OR REPLACE FUNCTION public.create_candidate_from_application()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  teacher_record RECORD;
  match_score_val INTEGER := 0;
  match_reason_val TEXT := 'Application submitted';
  existing_candidate_id UUID;
BEGIN
  -- Check if candidate already exists (shouldn't happen, but be safe)
  SELECT id INTO existing_candidate_id
  FROM public.job_candidates
  WHERE job_id = NEW.job_id
  AND teacher_id = NEW.teacher_id
  LIMIT 1;

  -- If candidate already exists, just update the status to 'new' if needed
  IF existing_candidate_id IS NOT NULL THEN
    UPDATE public.job_candidates
    SET 
      status = CASE WHEN status = 'hidden' THEN 'new' ELSE status END,
      updated_at = NOW()
    WHERE id = existing_candidate_id;
    RETURN NEW;
  END IF;

  -- Get job information
  SELECT 
    j.id,
    j.school_id,
    j.archetype_tags,
    j.subject,
    j.grade_level
  INTO job_record
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  -- If job doesn't exist, skip
  IF job_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get teacher information
  SELECT 
    t.id,
    t.user_id,
    t.archetype_tags,
    t.subjects,
    t.grade_levels,
    t.archetype
  INTO teacher_record
  FROM public.teachers t
  WHERE t.user_id = NEW.teacher_id;

  -- If teacher profile exists, calculate match score
  IF teacher_record IS NOT NULL AND teacher_record.archetype_tags IS NOT NULL THEN
    -- Calculate match score if we have archetype tags
    IF job_record.archetype_tags IS NOT NULL AND array_length(job_record.archetype_tags, 1) > 0 THEN
      match_score_val := public.calculate_match_score(
        teacher_record.archetype_tags,
        job_record.archetype_tags,
        teacher_record.subjects,
        job_record.subject,
        teacher_record.grade_levels,
        job_record.grade_level
      );
      
      -- Generate match reason
      match_reason_val := 'Application submitted - Archetype match: ' || 
        COALESCE(array_to_string(
          (SELECT ARRAY(
            SELECT unnest(teacher_record.archetype_tags) 
            INTERSECT 
            SELECT unnest(job_record.archetype_tags)
          )),
          ', '
        ), 'N/A');
    ELSE
      -- Basic score for application without archetype match
      match_score_val := 5;
      match_reason_val := 'Application submitted';
    END IF;
  ELSE
    -- Default score for application without teacher profile
    match_score_val := 5;
    match_reason_val := 'Application submitted';
  END IF;

  -- Insert job_candidate entry
  INSERT INTO public.job_candidates (
    job_id,
    teacher_id,
    match_score,
    match_reason,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.job_id,
    NEW.teacher_id,
    match_score_val,
    match_reason_val,
    'new',
    NOW(),
    NOW()
  )
  ON CONFLICT (job_id, teacher_id) 
  DO UPDATE SET
    status = CASE WHEN job_candidates.status = 'hidden' THEN 'new' ELSE job_candidates.status END,
    match_score = GREATEST(job_candidates.match_score, EXCLUDED.match_score),
    match_reason = COALESCE(EXCLUDED.match_reason, job_candidates.match_reason),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_candidate_from_application ON public.applications;

-- Create trigger to fire when application is inserted
CREATE TRIGGER trigger_create_candidate_from_application
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_candidate_from_application();

-- Also handle existing applications that don't have candidates
-- This is a one-time migration for existing data
DO $$
DECLARE
  app_record RECORD;
  candidate_count INTEGER;
BEGIN
  -- For each application without a corresponding job_candidate
  FOR app_record IN
    SELECT 
      a.id,
      a.job_id,
      a.teacher_id,
      a.applied_at
    FROM public.applications a
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.job_candidates jc
      WHERE jc.job_id = a.job_id
      AND jc.teacher_id = a.teacher_id
    )
  LOOP
    -- Call the function logic inline (since we can't call the trigger function directly)
    -- This will create candidates for existing applications
    PERFORM public.create_candidate_from_application() FROM (
      SELECT app_record.id, app_record.job_id, app_record.teacher_id
    ) AS temp_app;
  END LOOP;
  
  RAISE NOTICE 'Processed existing applications without candidates';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error processing existing applications: %', SQLERRM;
END $$;

