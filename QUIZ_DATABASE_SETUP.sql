-- Archetype Quiz Database Setup
-- Run this in your Supabase SQL Editor to create quiz tables and view

-- 1. Create quiz questions table (drop first if exists to ensure clean structure)
DROP TABLE IF EXISTS public.archetype_quiz_options CASCADE;
DROP TABLE IF EXISTS public.archetype_quiz_questions CASCADE;
DROP VIEW IF EXISTS public.quiz_with_options CASCADE;

CREATE TABLE public.archetype_quiz_questions (
  question_id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  question_order INTEGER NOT NULL UNIQUE
);

-- 2. Create quiz options table
CREATE TABLE public.archetype_quiz_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES public.archetype_quiz_questions(question_id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  scores JSONB NOT NULL
);

-- 3. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id ON public.archetype_quiz_options(question_id);

-- 4. Create view that joins questions and options
CREATE VIEW public.quiz_with_options AS
SELECT 
  q.question_id,
  q.question,
  q.question_order,
  o.id AS option_id,
  o.text AS option_text,
  o.scores
FROM public.archetype_quiz_questions q
LEFT JOIN public.archetype_quiz_options o ON q.question_id = o.question_id
ORDER BY q.question_order, o.id;

-- 5. Enable RLS (Row Level Security)
ALTER TABLE public.archetype_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archetype_quiz_options ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies - Allow everyone to read quiz data
CREATE POLICY "Anyone can view quiz questions" ON public.archetype_quiz_questions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view quiz options" ON public.archetype_quiz_options
  FOR SELECT USING (true);

-- 7. Grant access to the view
GRANT SELECT ON public.quiz_with_options TO authenticated;
GRANT SELECT ON public.quiz_with_options TO anon;

-- 8. Sample quiz data (8 questions, 4 options each)
-- Question 1
INSERT INTO public.archetype_quiz_questions (question_id, question, question_order) VALUES
  ('q1', 'When planning a new unit, what excites you most?', 1)
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO public.archetype_quiz_options (id, question_id, text, scores) VALUES
  ('q1_o1', 'q1', 'Creating a detailed, step-by-step lesson plan with clear objectives', '{"leader": 3, "specialist": 2, "mentor": 1, "advocate": 0, "collaborator": 0, "innovator": 0}'),
  ('q1_o2', 'q1', 'Experimenting with new technology or teaching methods', '{"innovator": 3, "collaborator": 1, "leader": 0, "specialist": 0, "mentor": 0, "advocate": 0}'),
  ('q1_o3', 'q1', 'Thinking about how to support each individual student''s needs', '{"mentor": 3, "advocate": 2, "collaborator": 1, "leader": 0, "specialist": 0, "innovator": 0}'),
  ('q1_o4', 'q1', 'Considering how this unit addresses equity and systemic issues', '{"advocate": 3, "collaborator": 1, "mentor": 1, "leader": 0, "specialist": 0, "innovator": 0}')
ON CONFLICT (id) DO NOTHING;

-- Question 2
INSERT INTO public.archetype_quiz_questions (question_id, question, question_order) VALUES
  ('q2', 'How do you prefer to work with colleagues?', 2)
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO public.archetype_quiz_options (id, question_id, text, scores) VALUES
  ('q2_o1', 'q2', 'I take the lead and organize team meetings and projects', '{"leader": 3, "collaborator": 1, "specialist": 0, "mentor": 0, "advocate": 0, "innovator": 0}'),
  ('q2_o2', 'q2', 'I share innovative ideas and encourage experimentation', '{"innovator": 3, "collaborator": 2, "leader": 0, "specialist": 0, "mentor": 0, "advocate": 0}'),
  ('q2_o3', 'q2', 'I focus on one-on-one support and mentoring', '{"mentor": 3, "collaborator": 1, "advocate": 1, "leader": 0, "specialist": 0, "innovator": 0}'),
  ('q2_o4', 'q2', 'I work collaboratively, sharing ideas and building consensus', '{"collaborator": 3, "advocate": 1, "leader": 1, "specialist": 0, "mentor": 0, "innovator": 0}')
ON CONFLICT (id) DO NOTHING;

-- Question 3
INSERT INTO public.archetype_quiz_questions (question_id, question, question_order) VALUES
  ('q3', 'What motivates you most in your teaching?', 3)
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO public.archetype_quiz_options (id, question_id, text, scores) VALUES
  ('q3_o1', 'q3', 'Seeing students achieve clear, measurable learning goals', '{"specialist": 3, "leader": 2, "mentor": 0, "advocate": 0, "collaborator": 0, "innovator": 0}'),
  ('q3_o2', 'q3', 'Discovering new ways to engage and inspire students', '{"innovator": 3, "collaborator": 1, "mentor": 1, "leader": 0, "specialist": 0, "advocate": 0}'),
  ('q3_o3', 'q3', 'Watching individual students grow and overcome challenges', '{"mentor": 3, "advocate": 2, "collaborator": 1, "leader": 0, "specialist": 0, "innovator": 0}'),
  ('q3_o4', 'q3', 'Creating a more equitable and inclusive learning environment', '{"advocate": 3, "collaborator": 1, "mentor": 1, "leader": 0, "specialist": 0, "innovator": 0}')
ON CONFLICT (id) DO NOTHING;

-- Question 4
INSERT INTO public.archetype_quiz_questions (question_id, question, question_order) VALUES
  ('q4', 'How do you handle classroom management?', 4)
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO public.archetype_quiz_options (id, question_id, text, scores) VALUES
  ('q4_o1', 'q4', 'I establish clear rules and expectations from day one', '{"leader": 3, "specialist": 1, "mentor": 0, "advocate": 0, "collaborator": 0, "innovator": 0}'),
  ('q4_o2', 'q4', 'I use innovative tools and strategies to keep students engaged', '{"innovator": 3, "collaborator": 1, "leader": 0, "specialist": 0, "mentor": 0, "advocate": 0}'),
  ('q4_o3', 'q4', 'I build relationships and understand each student''s individual needs', '{"mentor": 3, "advocate": 2, "collaborator": 1, "leader": 0, "specialist": 0, "innovator": 0}'),
  ('q4_o4', 'q4', 'I involve students in creating classroom norms and expectations', '{"collaborator": 3, "advocate": 2, "leader": 1, "specialist": 0, "mentor": 0, "innovator": 0}')
ON CONFLICT (id) DO NOTHING;

-- Question 5
INSERT INTO public.archetype_quiz_questions (question_id, question, question_order) VALUES
  ('q5', 'What is your approach to student assessment?', 5)
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO public.archetype_quiz_options (id, question_id, text, scores) VALUES
  ('q5_o1', 'q5', 'I use standardized tests and clear rubrics', '{"specialist": 3, "leader": 2, "mentor": 0, "advocate": 0, "collaborator": 0, "innovator": 0}'),
  ('q5_o2', 'q5', 'I experiment with alternative assessment methods', '{"innovator": 3, "collaborator": 1, "advocate": 1, "leader": 0, "specialist": 0, "mentor": 0}'),
  ('q5_o3', 'q5', 'I focus on individual growth and progress over time', '{"mentor": 3, "advocate": 1, "collaborator": 1, "leader": 0, "specialist": 0, "innovator": 0}'),
  ('q5_o4', 'q5', 'I ensure assessments are fair and accessible to all students', '{"advocate": 3, "collaborator": 1, "mentor": 1, "leader": 0, "specialist": 0, "innovator": 0}')
ON CONFLICT (id) DO NOTHING;

-- Question 6
INSERT INTO public.archetype_quiz_questions (question_id, question, question_order) VALUES
  ('q6', 'How do you respond to a struggling student?', 6)
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO public.archetype_quiz_options (id, question_id, text, scores) VALUES
  ('q6_o1', 'q6', 'I create a structured plan with clear steps to improvement', '{"leader": 3, "specialist": 2, "mentor": 1, "advocate": 0, "collaborator": 0, "innovator": 0}'),
  ('q6_o2', 'q6', 'I try new teaching strategies or technology to help them', '{"innovator": 3, "collaborator": 1, "mentor": 1, "leader": 0, "specialist": 0, "advocate": 0}'),
  ('q6_o3', 'q6', 'I spend one-on-one time understanding their specific challenges', '{"mentor": 3, "advocate": 2, "collaborator": 0, "leader": 0, "specialist": 0, "innovator": 0}'),
  ('q6_o4', 'q6', 'I consider systemic barriers and work to address root causes', '{"advocate": 3, "collaborator": 1, "mentor": 1, "leader": 0, "specialist": 0, "innovator": 0}')
ON CONFLICT (id) DO NOTHING;

-- Question 7
INSERT INTO public.archetype_quiz_questions (question_id, question, question_order) VALUES
  ('q7', 'What is your ideal professional development experience?', 7)
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO public.archetype_quiz_options (id, question_id, text, scores) VALUES
  ('q7_o1', 'q7', 'Workshops on curriculum design and standards alignment', '{"specialist": 3, "leader": 2, "mentor": 0, "advocate": 0, "collaborator": 0, "innovator": 0}'),
  ('q7_o2', 'q7', 'Hands-on training with new technology and tools', '{"innovator": 3, "collaborator": 1, "leader": 0, "specialist": 0, "mentor": 0, "advocate": 0}'),
  ('q7_o3', 'q7', 'Sessions on differentiated instruction and student support', '{"mentor": 3, "advocate": 1, "collaborator": 1, "leader": 0, "specialist": 0, "innovator": 0}'),
  ('q7_o4', 'q7', 'Training on equity, inclusion, and social justice in education', '{"advocate": 3, "collaborator": 1, "mentor": 1, "leader": 0, "specialist": 0, "innovator": 0}')
ON CONFLICT (id) DO NOTHING;

-- Question 8
INSERT INTO public.archetype_quiz_questions (question_id, question, question_order) VALUES
  ('q8', 'What is your teaching philosophy?', 8)
ON CONFLICT (question_id) DO NOTHING;

INSERT INTO public.archetype_quiz_options (id, question_id, text, scores) VALUES
  ('q8_o1', 'q8', 'Clear structure and high expectations lead to student success', '{"leader": 3, "specialist": 2, "mentor": 0, "advocate": 0, "collaborator": 0, "innovator": 0}'),
  ('q8_o2', 'q8', 'Innovation and creativity make learning engaging and meaningful', '{"innovator": 3, "collaborator": 1, "mentor": 0, "advocate": 0, "leader": 0, "specialist": 0}'),
  ('q8_o3', 'q8', 'Every student is unique and deserves personalized support', '{"mentor": 3, "advocate": 2, "collaborator": 1, "leader": 0, "specialist": 0, "innovator": 0}'),
  ('q8_o4', 'q8', 'Education should address systemic inequities and empower all students', '{"advocate": 3, "collaborator": 1, "mentor": 1, "leader": 0, "specialist": 0, "innovator": 0}')
ON CONFLICT (id) DO NOTHING;

-- Verify the data
SELECT 
  'Questions' as type,
  COUNT(*) as count
FROM public.archetype_quiz_questions
UNION ALL
SELECT 
  'Options' as type,
  COUNT(*) as count
FROM public.archetype_quiz_options
UNION ALL
SELECT 
  'View Rows' as type,
  COUNT(*) as count
FROM public.quiz_with_options;

