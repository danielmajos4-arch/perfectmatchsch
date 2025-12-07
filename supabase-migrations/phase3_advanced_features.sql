-- Phase 3: Advanced Features
-- Calendar Integration, Reviews & Ratings, Analytics, Salary Insights, Video, Templates

-- ============================================
-- 1. Interview Scheduling & Calendar
-- ============================================

CREATE TABLE IF NOT EXISTS public.interview_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  interview_type TEXT DEFAULT 'video' CHECK (interview_type IN ('video', 'phone', 'in_person')),
  location TEXT, -- For in-person interviews
  meeting_link TEXT, -- For video interviews
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  teacher_response_at TIMESTAMPTZ,
  teacher_notes TEXT,
  google_calendar_event_id TEXT, -- For Google Calendar sync
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_invites_teacher_id ON public.interview_invites(teacher_id);
CREATE INDEX IF NOT EXISTS idx_interview_invites_school_id ON public.interview_invites(school_id);
CREATE INDEX IF NOT EXISTS idx_interview_invites_application_id ON public.interview_invites(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_invites_scheduled_at ON public.interview_invites(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interview_invites_status ON public.interview_invites(status);

ALTER TABLE public.interview_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Teachers can view their interview invites" ON public.interview_invites;
CREATE POLICY "Teachers can view their interview invites"
ON public.interview_invites FOR SELECT
TO authenticated
USING (teacher_id IN (
  SELECT id FROM public.teachers WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Schools can manage their interview invites" ON public.interview_invites;
CREATE POLICY "Schools can manage their interview invites"
ON public.interview_invites FOR ALL
TO authenticated
USING (school_id IN (
  SELECT id FROM public.schools WHERE user_id = auth.uid()
))
WITH CHECK (school_id IN (
  SELECT id FROM public.schools WHERE user_id = auth.uid()
));

-- ============================================
-- 2. Reviews & Ratings
-- ============================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL CHECK (review_type IN ('teacher_review', 'school_review')),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  interview_id UUID REFERENCES public.interview_invites(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  categories JSONB DEFAULT '{}'::jsonb, -- e.g., {"communication": 5, "professionalism": 4}
  is_anonymous BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Verified if from actual interview/hire
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reviewer_id, reviewee_id, job_id) -- One review per job
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON public.reviews(review_type);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view public reviews" ON public.reviews;
CREATE POLICY "Anyone can view public reviews"
ON public.reviews FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (reviewer_id = auth.uid());

-- ============================================
-- 3. Salary Insights Data
-- ============================================

CREATE TABLE IF NOT EXISTS public.salary_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  location TEXT NOT NULL,
  years_experience TEXT NOT NULL, -- e.g., "0-1 years", "2-5 years"
  salary_min INTEGER NOT NULL,
  salary_max INTEGER NOT NULL,
  salary_median INTEGER NOT NULL,
  sample_size INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, grade_level, location, years_experience)
);

CREATE INDEX IF NOT EXISTS idx_salary_data_subject ON public.salary_data(subject);
CREATE INDEX IF NOT EXISTS idx_salary_data_location ON public.salary_data(location);
CREATE INDEX IF NOT EXISTS idx_salary_data_experience ON public.salary_data(years_experience);

ALTER TABLE public.salary_data ENABLE ROW LEVEL SECURITY;

-- Anyone can view salary data (aggregated, not personal)
DROP POLICY IF EXISTS "Anyone can view salary data" ON public.salary_data;
CREATE POLICY "Anyone can view salary data"
ON public.salary_data FOR SELECT
USING (true);

-- ============================================
-- 4. Application Templates
-- ============================================

CREATE TABLE IF NOT EXISTS public.application_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  archetype TEXT, -- Template for specific archetype
  subject TEXT, -- Template for specific subject
  cover_letter_template TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_templates_archetype ON public.application_templates(archetype);
CREATE INDEX IF NOT EXISTS idx_application_templates_subject ON public.application_templates(subject);

ALTER TABLE public.application_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view templates
DROP POLICY IF EXISTS "Anyone can view application templates" ON public.application_templates;
CREATE POLICY "Anyone can view application templates"
ON public.application_templates FOR SELECT
USING (true);

-- ============================================
-- 5. Video Introductions
-- ============================================

-- Add video_url column to teachers table if not exists
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS video_intro_url TEXT,
ADD COLUMN IF NOT EXISTS video_intro_thumbnail_url TEXT;

-- ============================================
-- 6. Helper Functions
-- ============================================

-- Function to calculate average rating
CREATE OR REPLACE FUNCTION public.get_average_rating(p_user_id UUID, p_review_type TEXT)
RETURNS TABLE (
  average_rating NUMERIC,
  total_reviews INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::numeric, 2) as average_rating,
    COUNT(*)::integer as total_reviews
  FROM public.reviews
  WHERE reviewee_id = p_user_id
  AND review_type = p_review_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get salary insights
CREATE OR REPLACE FUNCTION public.get_salary_insights(
  p_subject TEXT,
  p_grade_level TEXT,
  p_location TEXT,
  p_years_experience TEXT
)
RETURNS TABLE (
  salary_min INTEGER,
  salary_max INTEGER,
  salary_median INTEGER,
  sample_size INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.salary_min,
    s.salary_max,
    s.salary_median,
    s.sample_size
  FROM public.salary_data s
  WHERE s.subject = p_subject
  AND s.grade_level = p_grade_level
  AND s.location = p_location
  AND s.years_experience = p_years_experience
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment template usage
CREATE OR REPLACE FUNCTION public.increment_template_usage(p_template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.application_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_average_rating TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_salary_insights TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_template_usage TO authenticated;

-- ============================================
-- 7. Seed Default Application Templates
-- ============================================

INSERT INTO public.application_templates (name, archetype, cover_letter_template, description, is_default) VALUES
(
  'Enthusiastic Educator',
  'The Mentor',
  'Dear Hiring Manager,

I am writing to express my strong interest in the {{job_title}} position at {{school_name}}. As a dedicated educator with {{years_experience}} of experience, I am passionate about creating engaging learning environments that inspire students to reach their full potential.

My teaching philosophy centers on building strong relationships with students and fostering a growth mindset. I believe in meeting students where they are and providing differentiated instruction that addresses diverse learning needs.

I am particularly drawn to {{school_name}} because of [your research about the school]. I am excited about the opportunity to contribute to your educational mission and help students achieve academic success.

Thank you for considering my application. I look forward to discussing how my experience and passion for teaching align with your school''s goals.

Sincerely,
{{teacher_name}}',
  'Template for mentor-style teachers who focus on student relationships',
  true
),
(
  'Innovative Teacher',
  'The Innovator',
  'Dear Hiring Committee,

I am excited to apply for the {{job_title}} position at {{school_name}}. With {{years_experience}} of experience in education, I bring a passion for innovative teaching methods and technology integration.

My approach to education emphasizes project-based learning, critical thinking, and real-world applications. I believe in empowering students to become active learners who can adapt to an ever-changing world.

What excites me about {{school_name}} is [your research]. I am eager to bring my creative teaching strategies to your team and help prepare students for future success.

I would welcome the opportunity to discuss how my innovative teaching methods can benefit your students.

Best regards,
{{teacher_name}}',
  'Template for innovative teachers who use technology and modern methods',
  true
)
ON CONFLICT DO NOTHING;
