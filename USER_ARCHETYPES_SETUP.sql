-- User Archetypes Table Setup
-- Run this in your Supabase SQL Editor to create archetype definitions

-- 1. Drop and create user_archetypes table
DROP TABLE IF EXISTS public.user_archetypes CASCADE;

CREATE TABLE public.user_archetypes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  archetype_name TEXT NOT NULL UNIQUE,
  archetype_description TEXT NOT NULL,
  strengths TEXT[] NOT NULL,
  growth_areas TEXT[] NOT NULL,
  ideal_environments TEXT[] NOT NULL,
  teaching_style TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_archetypes_name ON public.user_archetypes(archetype_name);
CREATE INDEX IF NOT EXISTS idx_user_archetypes_user_id ON public.user_archetypes(user_id);

-- 3. Enable RLS
ALTER TABLE public.user_archetypes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Allow everyone to read archetype definitions
CREATE POLICY "Anyone can view archetype definitions" ON public.user_archetypes
  FOR SELECT USING (true);

-- 5. Insert archetype definitions (these are the template definitions, not user-specific)
INSERT INTO public.user_archetypes (archetype_name, archetype_description, strengths, growth_areas, ideal_environments, teaching_style) VALUES
  (
    'The Guide',
    'You are a supportive mentor who focuses on individual student needs and provides personalized guidance. You excel at understanding each student''s unique learning style and helping them overcome challenges.',
    ARRAY[
      'One-on-one student support',
      'Understanding individual learning needs',
      'Patience and empathy',
      'Building strong relationships',
      'Differentiated instruction'
    ],
    ARRAY[
      'Balancing individual attention with whole-class instruction',
      'Setting boundaries while remaining approachable',
      'Managing time for multiple students'
    ],
    ARRAY[
      'Small class sizes',
      'Supportive school culture',
      'Access to resources for differentiated learning',
      'Collaborative teams that value student-centered approaches'
    ],
    'Student-centered, relationship-focused, supportive, personalized'
  ),
  (
    'The Trailblazer',
    'You are an innovative educator who embraces new technology and teaching methods. You love experimenting with creative approaches and staying ahead of educational trends.',
    ARRAY[
      'Technology integration',
      'Creative problem-solving',
      'Adaptability',
      'Innovation',
      'Engaging teaching methods'
    ],
    ARRAY[
      'Following through on long-term projects',
      'Balancing innovation with proven methods',
      'Managing technology challenges'
    ],
    ARRAY[
      'Schools with technology resources',
      'Flexible curriculum',
      'Supportive of experimentation',
      'Professional development opportunities'
    ],
    'Innovative, tech-forward, experimental, engaging, creative'
  ),
  (
    'The Changemaker',
    'You are an equity-focused educator who addresses systemic issues in education. You work to create inclusive, fair learning environments and advocate for all students.',
    ARRAY[
      'Equity and inclusion',
      'Systemic thinking',
      'Advocacy',
      'Cultural competence',
      'Social justice awareness'
    ],
    ARRAY[
      'Navigating institutional barriers',
      'Balancing advocacy with day-to-day teaching',
      'Managing emotional demands'
    ],
    ARRAY[
      'Diverse student populations',
      'Schools committed to equity',
      'Supportive administration',
      'Resources for inclusive practices'
    ],
    'Equity-focused, inclusive, systemic, advocacy-oriented, transformative'
  ),
  (
    'The Connector',
    'You are a collaborative educator who thrives in team environments. You build strong relationships with colleagues and create a sense of community in your classroom.',
    ARRAY[
      'Team collaboration',
      'Building community',
      'Peer relationships',
      'Communication',
      'Shared decision-making'
    ],
    ARRAY[
      'Taking individual initiative when needed',
      'Making quick independent decisions',
      'Working in isolation'
    ],
    ARRAY[
      'Collaborative school culture',
      'Team teaching opportunities',
      'Professional learning communities',
      'Shared planning time'
    ],
    'Collaborative, community-focused, team-oriented, relationship-building, inclusive'
  ),
  (
    'The Explorer',
    'You are a content specialist who dives deep into subject matter. You have extensive knowledge in your field and help students master complex concepts and standards.',
    ARRAY[
      'Deep content knowledge',
      'Standards alignment',
      'Rigorous instruction',
      'Academic excellence',
      'Curriculum expertise'
    ],
    ARRAY[
      'Differentiating for diverse learners',
      'Balancing rigor with accessibility',
      'Connecting content to student interests'
    ],
    ARRAY[
      'Subject-specific focus',
      'Standards-based curriculum',
      'Academic rigor expectations',
      'Professional development in content area'
    ],
    'Content-focused, rigorous, standards-aligned, academic, knowledge-driven'
  ),
  (
    'The Leader',
    'You are a natural organizer who takes charge and establishes clear expectations. You excel at creating structure, managing classrooms, and leading initiatives.',
    ARRAY[
      'Organization and structure',
      'Clear expectations',
      'Leadership',
      'Classroom management',
      'Strategic planning'
    ],
    ARRAY[
      'Flexibility and spontaneity',
      'Individual student needs',
      'Collaborative decision-making'
    ],
    ARRAY[
      'Structured school environments',
      'Leadership opportunities',
      'Clear systems and processes',
      'Support for initiatives'
    ],
    'Structured, organized, leadership-focused, clear, directive'
  )
ON CONFLICT (archetype_name) DO UPDATE SET
  archetype_description = EXCLUDED.archetype_description,
  strengths = EXCLUDED.strengths,
  growth_areas = EXCLUDED.growth_areas,
  ideal_environments = EXCLUDED.ideal_environments,
  teaching_style = EXCLUDED.teaching_style;

-- 6. Verify the data
SELECT 
  archetype_name,
  array_length(strengths, 1) as strengths_count,
  array_length(growth_areas, 1) as growth_areas_count,
  array_length(ideal_environments, 1) as environments_count
FROM public.user_archetypes
ORDER BY archetype_name;

