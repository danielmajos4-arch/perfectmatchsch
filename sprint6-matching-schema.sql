-- Sprint 6: Matching Logic and Cross-Platform Integration
-- Run this AFTER supabase-schema-fixed.sql
-- This adds archetype matching, candidate pools, and matching views

-- Add archetype_tags column to jobs table (for matching)
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS archetype_tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add archetype_tags column to teachers table (extracted from archetype)
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS archetype_tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create job_candidates table (candidate pools for jobs)
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

-- Create teacher_job_matches table (jobs matched to teachers)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_candidates_job_id ON public.job_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_candidates_teacher_id ON public.job_candidates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_job_candidates_status ON public.job_candidates(status);
CREATE INDEX IF NOT EXISTS idx_teacher_job_matches_teacher_id ON public.teacher_job_matches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_job_matches_job_id ON public.teacher_job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_archetype_tags ON public.jobs USING GIN(archetype_tags);
CREATE INDEX IF NOT EXISTS idx_teachers_archetype_tags ON public.teachers USING GIN(archetype_tags);

-- Enable RLS on new tables
ALTER TABLE public.job_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_job_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_candidates
CREATE POLICY "Schools can view candidates for their jobs" ON public.job_candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_candidates.job_id
      AND jobs.school_id = auth.uid()
    )
  );

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

-- RLS Policies for teacher_job_matches
CREATE POLICY "Teachers can view their own matches" ON public.teacher_job_matches
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "System can insert matches" ON public.teacher_job_matches
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Teachers can update their matches" ON public.teacher_job_matches
  FOR UPDATE USING (auth.uid() = teacher_id);

-- Function to extract archetype tags from teacher archetype
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

-- Function to update teacher archetype_tags when archetype changes
CREATE OR REPLACE FUNCTION public.update_teacher_archetype_tags()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.archetype IS DISTINCT FROM OLD.archetype THEN
    NEW.archetype_tags := public.extract_archetype_tags(NEW.archetype);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update archetype_tags
DROP TRIGGER IF EXISTS trigger_update_teacher_archetype_tags ON public.teachers;
CREATE TRIGGER trigger_update_teacher_archetype_tags
  BEFORE INSERT OR UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teacher_archetype_tags();

-- Function to calculate match score between teacher and job
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
  tag_overlap INTEGER;
BEGIN
  -- Archetype tag overlap (weight: 3 points per match)
  SELECT COUNT(*) INTO tag_overlap
  FROM unnest(teacher_tags) AS t_tag
  WHERE t_tag = ANY(job_tags);
  score := score + (tag_overlap * 3);
  
  -- Subject match (weight: 5 points)
  IF job_subject = ANY(teacher_subjects) THEN
    score := score + 5;
  END IF;
  
  -- Grade level match (weight: 3 points)
  IF job_grade = ANY(teacher_grades) THEN
    score := score + 3;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-populate job candidates when job is created/updated
CREATE OR REPLACE FUNCTION public.auto_populate_job_candidates()
RETURNS TRIGGER AS $$
DECLARE
  teacher_record RECORD;
  match_score_val INTEGER;
  match_reason_val TEXT;
BEGIN
  -- Only process if job is active and has archetype_tags
  IF NEW.is_active = true AND array_length(NEW.archetype_tags, 1) > 0 THEN
    -- Find matching teachers
    FOR teacher_record IN
      SELECT 
        t.id,
        t.user_id,
        t.archetype_tags,
        t.subjects,
        t.grade_levels,
        t.archetype
      FROM public.teachers t
      WHERE t.profile_complete = true
      AND t.archetype_tags && NEW.archetype_tags  -- Overlap check
    LOOP
      -- Calculate match score
      match_score_val := public.calculate_match_score(
        teacher_record.archetype_tags,
        NEW.archetype_tags,
        teacher_record.subjects,
        NEW.subject,
        teacher_record.grade_levels,
        NEW.grade_level
      );
      
      -- Generate match reason
      match_reason_val := 'Archetype match: ' || array_to_string(
        (SELECT ARRAY(SELECT unnest(teacher_record.archetype_tags) INTERSECT SELECT unnest(NEW.archetype_tags))),
        ', '
      );
      
      -- Insert or update candidate
      INSERT INTO public.job_candidates (job_id, teacher_id, match_score, match_reason, status)
      VALUES (NEW.id, teacher_record.user_id, match_score_val, match_reason_val, 'new')
      ON CONFLICT (job_id, teacher_id) 
      DO UPDATE SET
        match_score = EXCLUDED.match_score,
        match_reason = EXCLUDED.match_reason,
        updated_at = NOW();
      
      -- Also create teacher_job_matches entry
      INSERT INTO public.teacher_job_matches (teacher_id, job_id, match_score, match_reason)
      VALUES (teacher_record.user_id, NEW.id, match_score_val, match_reason_val)
      ON CONFLICT (teacher_id, job_id)
      DO UPDATE SET
        match_score = EXCLUDED.match_score,
        match_reason = EXCLUDED.match_reason;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate candidates when job is created/updated
DROP TRIGGER IF EXISTS trigger_auto_populate_job_candidates ON public.jobs;
CREATE TRIGGER trigger_auto_populate_job_candidates
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_job_candidates();

-- Function to auto-populate teacher matches when teacher profile is updated
CREATE OR REPLACE FUNCTION public.auto_populate_teacher_matches()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  match_score_val INTEGER;
  match_reason_val TEXT;
BEGIN
  -- Only process if teacher profile is complete
  IF NEW.profile_complete = true AND array_length(NEW.archetype_tags, 1) > 0 THEN
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
      AND j.archetype_tags && NEW.archetype_tags  -- Overlap check
    LOOP
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
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate matches when teacher profile is updated
DROP TRIGGER IF EXISTS trigger_auto_populate_teacher_matches ON public.teachers;
CREATE TRIGGER trigger_auto_populate_teacher_matches
  AFTER INSERT OR UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_teacher_matches();

-- Create candidate_matches view (for easy querying)
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
  t.full_name as teacher_name,
  t.email as teacher_email,
  t.archetype as teacher_archetype,
  t.subjects as teacher_subjects,
  t.grade_levels as teacher_grade_levels,
  t.years_experience,
  t.location as teacher_location,
  t.profile_photo_url,
  t.resume_url,
  t.portfolio_url
FROM public.job_candidates jc
JOIN public.jobs j ON j.id = jc.job_id
JOIN public.teachers t ON t.user_id = jc.teacher_id;

-- Grant access to view
GRANT SELECT ON public.candidate_matches TO authenticated;
GRANT SELECT ON public.candidate_matches TO anon;

-- Enable realtime for matching tables
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.job_candidates;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_job_matches;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

