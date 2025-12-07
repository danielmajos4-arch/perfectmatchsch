-- Achievements System Schema
-- Run this AFTER supabase-schema-fixed.sql
-- This adds achievement tracking and gamification

-- Create achievements master table (defines all available achievements)
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE, -- e.g., 'profile_complete', 'first_application'
  name TEXT NOT NULL, -- e.g., 'Profile Complete'
  description TEXT NOT NULL, -- e.g., 'Complete your profile to 100%'
  icon TEXT NOT NULL, -- Icon name or emoji, e.g., '🎯', 'trophy', 'star'
  category TEXT NOT NULL CHECK (category IN ('profile', 'application', 'matching', 'engagement', 'milestone')),
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  points INTEGER DEFAULT 10, -- Points awarded for unlocking
  requirements JSONB DEFAULT '{}'::jsonb, -- Requirements to unlock (e.g., {"profile_complete": true, "applications": 1})
  role_filter TEXT[] DEFAULT ARRAY[]::TEXT[], -- Empty = both roles, ['teacher'] = teachers only, ['school'] = schools only
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_achievements table (tracks which users have unlocked which achievements)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  progress JSONB DEFAULT '{}'::jsonb, -- Progress tracking (e.g., {"applications": 3, "target": 10})
  is_notified BOOLEAN DEFAULT false, -- Whether user has been notified about this achievement
  UNIQUE(user_id, achievement_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON public.user_achievements(unlocked_at);
CREATE INDEX IF NOT EXISTS idx_achievements_code ON public.achievements(code);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_role_filter ON public.achievements USING GIN(role_filter);

-- Enable RLS on both tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view active achievements
DROP POLICY IF EXISTS "Anyone can view active achievements" ON public.achievements;
CREATE POLICY "Anyone can view active achievements"
  ON public.achievements
  FOR SELECT
  USING (is_active = true);

-- RLS Policy: Users can view their own achievements
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own achievements (via service)
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own achievements (for progress tracking)
DROP POLICY IF EXISTS "Users can update their own achievements" ON public.user_achievements;
CREATE POLICY "Users can update their own achievements"
  ON public.user_achievements
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(
  p_user_id UUID,
  p_achievement_code TEXT DEFAULT NULL -- If NULL, checks all achievements
)
RETURNS TABLE (
  unlocked_achievement_id UUID,
  achievement_code TEXT,
  achievement_name TEXT
) AS $$
DECLARE
  achievement_record RECORD;
  user_record RECORD;
  teacher_record RECORD;
  school_record RECORD;
  requirements_met BOOLEAN;
  application_count INTEGER;
  match_count INTEGER;
  message_count INTEGER;
  profile_complete BOOLEAN;
BEGIN
  -- Get user info
  SELECT * INTO user_record FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get role-specific data
  IF user_record.role = 'teacher' THEN
    SELECT * INTO teacher_record FROM public.teachers WHERE user_id = p_user_id;
    
    -- Count applications
    SELECT COUNT(*) INTO application_count
    FROM public.applications
    WHERE teacher_id = p_user_id;
    
    -- Count job matches
    SELECT COUNT(*) INTO match_count
    FROM public.teacher_job_matches
    WHERE teacher_id = p_user_id;
    
    -- Check profile completion
    profile_complete := COALESCE(teacher_record.profile_complete, false);
    
  ELSIF user_record.role = 'school' THEN
    SELECT * INTO school_record FROM public.schools WHERE user_id = p_user_id;
    
    -- Count applications received
    SELECT COUNT(*) INTO application_count
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE j.school_id = (SELECT id FROM public.schools WHERE user_id = p_user_id);
    
    -- Count candidates
    SELECT COUNT(*) INTO match_count
    FROM public.job_candidates jc
    JOIN public.jobs j ON j.id = jc.job_id
    WHERE j.school_id = (SELECT id FROM public.schools WHERE user_id = p_user_id);
    
    -- Check profile completion
    profile_complete := COALESCE(school_record.profile_complete, false);
  END IF;

  -- Loop through achievements
  FOR achievement_record IN
    SELECT * FROM public.achievements
    WHERE is_active = true
    AND (p_achievement_code IS NULL OR code = p_achievement_code)
    AND (
      array_length(role_filter, 1) IS NULL 
      OR user_record.role = ANY(role_filter)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_id = achievement_record.id
    )
  LOOP
    requirements_met := true;
    
    -- Check requirements based on achievement code
    CASE achievement_record.code
      WHEN 'profile_complete' THEN
        requirements_met := profile_complete = true;
        
      WHEN 'first_application' THEN
        requirements_met := application_count >= 1;
        
      WHEN 'job_seeker' THEN
        requirements_met := application_count >= 10;
        
      WHEN 'perfect_match' THEN
        requirements_met := match_count >= 5;
        
      WHEN 'top_candidate' THEN
        IF user_record.role = 'teacher' THEN
          SELECT COUNT(*) INTO match_count
          FROM public.job_candidates
          WHERE teacher_id = p_user_id AND status IN ('shortlisted', 'hired');
          requirements_met := match_count >= 1;
        ELSE
          requirements_met := false;
        END IF;
        
      WHEN 'archetype_master' THEN
        IF user_record.role = 'teacher' THEN
          requirements_met := teacher_record.archetype IS NOT NULL 
            AND array_length(teacher_record.archetype_tags, 1) > 0;
        ELSE
          requirements_met := false;
        END IF;
        
      WHEN 'networker' THEN
        -- Count messages sent
        SELECT COUNT(*) INTO message_count
        FROM public.messages
        WHERE sender_id = p_user_id;
        requirements_met := message_count >= 5;
        
      WHEN 'hot_candidate' THEN
        IF user_record.role = 'teacher' THEN
          SELECT COUNT(DISTINCT j.school_id) INTO match_count
          FROM public.job_candidates jc
          JOIN public.jobs j ON j.id = jc.job_id
          WHERE jc.teacher_id = p_user_id AND jc.status = 'contacted';
          requirements_met := match_count >= 3;
        ELSE
          requirements_met := false;
        END IF;
        
      WHEN 'first_job_posted' THEN
        IF user_record.role = 'school' THEN
          SELECT COUNT(*) INTO match_count
          FROM public.jobs
          WHERE school_id = (SELECT id FROM public.schools WHERE user_id = p_user_id);
          requirements_met := match_count >= 1;
        ELSE
          requirements_met := false;
        END IF;
        
      WHEN 'hiring_manager' THEN
        IF user_record.role = 'school' THEN
          SELECT COUNT(*) INTO match_count
          FROM public.job_candidates
          WHERE status = 'hired'
          AND job_id IN (
            SELECT id FROM public.jobs 
            WHERE school_id = (SELECT id FROM public.schools WHERE user_id = p_user_id)
          );
          requirements_met := match_count >= 1;
        ELSE
          requirements_met := false;
        END IF;
        
      ELSE
        -- For custom achievements, check requirements JSONB
        -- This is a simplified check - can be enhanced
        requirements_met := true;
    END CASE;
    
    -- If requirements met, unlock achievement
    IF requirements_met THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress)
      VALUES (
        p_user_id,
        achievement_record.id,
        jsonb_build_object(
          'applications', application_count,
          'matches', match_count,
          'profile_complete', profile_complete
        )
      )
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      -- Return unlocked achievement
      unlocked_achievement_id := achievement_record.id;
      achievement_code := achievement_record.code;
      achievement_name := achievement_record.name;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's achievements with details
CREATE OR REPLACE FUNCTION public.get_user_achievements(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  description TEXT,
  icon TEXT,
  category TEXT,
  rarity TEXT,
  points INTEGER,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  progress JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.code,
    a.name,
    a.description,
    a.icon,
    a.category,
    a.rarity,
    a.points,
    ua.unlocked_at,
    ua.progress
  FROM public.achievements a
  JOIN public.user_achievements ua ON ua.achievement_id = a.id
  WHERE ua.user_id = p_user_id
  AND a.is_active = true
  ORDER BY ua.unlocked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's achievement progress
CREATE OR REPLACE FUNCTION public.get_user_achievement_progress(p_user_id UUID)
RETURNS TABLE (
  achievement_id UUID,
  code TEXT,
  name TEXT,
  progress_percentage INTEGER,
  requirements_met JSONB
) AS $$
DECLARE
  user_record RECORD;
  achievement_record RECORD;
  progress_val INTEGER;
  requirements_met JSONB;
BEGIN
  -- Get user info
  SELECT * INTO user_record FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Loop through all active achievements for this user's role
  FOR achievement_record IN
    SELECT * FROM public.achievements
    WHERE is_active = true
    AND (
      array_length(role_filter, 1) IS NULL 
      OR user_record.role = ANY(role_filter)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_id = achievement_record.id
    )
  LOOP
    -- Calculate progress (simplified - can be enhanced)
    progress_val := 0;
    requirements_met := '{}'::jsonb;
    
    -- This is a placeholder - actual progress calculation would be more complex
    -- based on specific achievement requirements
    
    achievement_id := achievement_record.id;
    code := achievement_record.code;
    name := achievement_record.name;
    progress_percentage := progress_val;
    requirements_met := requirements_met;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_unlock_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_achievement_progress TO authenticated;

-- Insert default achievements
INSERT INTO public.achievements (code, name, description, icon, category, rarity, points, role_filter) VALUES
-- Profile Achievements
('profile_complete', 'Profile Complete', 'Complete your profile to 100%', '🎯', 'profile', 'common', 10, ARRAY[]::TEXT[]),
('archetype_master', 'Archetype Master', 'Complete the archetype quiz and discover your teaching style', '🎓', 'profile', 'uncommon', 20, ARRAY['teacher']),

-- Application Achievements
('first_application', 'First Application', 'Submit your first job application', '📝', 'application', 'common', 15, ARRAY['teacher']),
('job_seeker', 'Job Seeker', 'Apply to 10 or more jobs', '💼', 'application', 'rare', 50, ARRAY['teacher']),

-- Matching Achievements
('perfect_match', 'Perfect Match', 'Get matched to 5 or more jobs', '⭐', 'matching', 'uncommon', 30, ARRAY['teacher']),
('top_candidate', 'Top Candidate', 'Get shortlisted by a school', '🏆', 'matching', 'rare', 75, ARRAY['teacher']),
('hot_candidate', 'Hot Candidate', 'Get contacted by 3 or more schools', '🔥', 'matching', 'epic', 100, ARRAY['teacher']),

-- Engagement Achievements
('networker', 'Networker', 'Send messages to 5 or more schools', '📧', 'engagement', 'uncommon', 25, ARRAY['teacher']),

-- School Achievements
('first_job_posted', 'First Job Posted', 'Post your first job listing', '📋', 'milestone', 'common', 10, ARRAY['school']),
('hiring_manager', 'Hiring Manager', 'Successfully hire your first candidate', '👔', 'milestone', 'rare', 100, ARRAY['school'])

ON CONFLICT (code) DO NOTHING;

-- Create view for easy querying
CREATE OR REPLACE VIEW public.user_achievements_view AS
SELECT 
  ua.id,
  ua.user_id,
  ua.unlocked_at,
  ua.is_notified,
  ua.progress,
  a.code,
  a.name,
  a.description,
  a.icon,
  a.category,
  a.rarity,
  a.points
FROM public.user_achievements ua
JOIN public.achievements a ON a.id = ua.achievement_id
WHERE a.is_active = true;

