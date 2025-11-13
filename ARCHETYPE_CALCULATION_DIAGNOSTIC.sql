-- =====================================================
-- ARCHETYPE CALCULATION DIAGNOSTIC & TESTING SQL
-- =====================================================
-- Run this in Supabase SQL Editor to diagnose why everyone gets "The Guide"
-- =====================================================

-- 1. CHECK CURRENT ARCHETYPE DISTRIBUTION
-- See what archetypes teachers currently have
SELECT 
  archetype,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.teachers
WHERE archetype IS NOT NULL
GROUP BY archetype
ORDER BY count DESC;

-- 2. CHECK QUIZ OPTIONS AND THEIR SCORES
-- Verify that quiz options have diverse scores (not all favoring "mentor")
SELECT 
  q.question_id,
  q.question,
  o.id as option_id,
  o.text as option_text,
  o.scores->>'mentor' as mentor_score,
  o.scores->>'leader' as leader_score,
  o.scores->>'innovator' as innovator_score,
  o.scores->>'advocate' as advocate_score,
  o.scores->>'collaborator' as collaborator_score,
  o.scores->>'specialist' as specialist_score,
  o.scores
FROM public.archetype_quiz_questions q
JOIN public.archetype_quiz_options o ON q.question_id = o.question_id
ORDER BY q.question_order, o.id;

-- 3. CALCULATE AVERAGE SCORES PER ARCHETYPE ACROSS ALL OPTIONS
-- This shows if one archetype is getting too many points
SELECT 
  'mentor' as archetype,
  AVG((scores->>'mentor')::numeric) as avg_score,
  SUM((scores->>'mentor')::numeric) as total_score,
  COUNT(*) FILTER (WHERE (scores->>'mentor')::numeric > 0) as options_with_points
FROM public.archetype_quiz_options
UNION ALL
SELECT 
  'leader' as archetype,
  AVG((scores->>'leader')::numeric) as avg_score,
  SUM((scores->>'leader')::numeric) as total_score,
  COUNT(*) FILTER (WHERE (scores->>'leader')::numeric > 0) as options_with_points
FROM public.archetype_quiz_options
UNION ALL
SELECT 
  'innovator' as archetype,
  AVG((scores->>'innovator')::numeric) as avg_score,
  SUM((scores->>'innovator')::numeric) as total_score,
  COUNT(*) FILTER (WHERE (scores->>'innovator')::numeric > 0) as options_with_points
FROM public.archetype_quiz_options
UNION ALL
SELECT 
  'advocate' as archetype,
  AVG((scores->>'advocate')::numeric) as avg_score,
  SUM((scores->>'advocate')::numeric) as total_score,
  COUNT(*) FILTER (WHERE (scores->>'advocate')::numeric > 0) as options_with_points
FROM public.archetype_quiz_options
UNION ALL
SELECT 
  'collaborator' as archetype,
  AVG((scores->>'collaborator')::numeric) as avg_score,
  SUM((scores->>'collaborator')::numeric) as total_score,
  COUNT(*) FILTER (WHERE (scores->>'collaborator')::numeric > 0) as options_with_points
FROM public.archetype_quiz_options
UNION ALL
SELECT 
  'specialist' as archetype,
  AVG((scores->>'specialist')::numeric) as avg_score,
  SUM((scores->>'specialist')::numeric) as total_score,
  COUNT(*) FILTER (WHERE (scores->>'specialist')::numeric > 0) as options_with_points
FROM public.archetype_quiz_options
ORDER BY avg_score DESC;

-- 4. TEST CALCULATION WITH DIFFERENT ANSWER COMBINATIONS
-- Simulate different answer patterns to see what archetypes they produce

-- Test 1: All "mentor-heavy" answers (should produce "The Guide")
WITH test_answers_1 AS (
  SELECT 
    'q1' as question_id, 'q1_o3' as option_id UNION ALL -- mentor: 3
    SELECT 'q2', 'q2_o3' UNION ALL -- mentor: 3
    SELECT 'q3', 'q3_o3' UNION ALL -- mentor: 3
    SELECT 'q4', 'q4_o3' UNION ALL -- mentor: 3
    SELECT 'q5', 'q5_o3' UNION ALL -- mentor: 3
    SELECT 'q6', 'q6_o3' UNION ALL -- mentor: 3
    SELECT 'q7', 'q7_o3' UNION ALL -- mentor: 3
    SELECT 'q8', 'q8_o3' -- mentor: 3
),
scores_1 AS (
  SELECT 
    'mentor' as archetype, SUM((o.scores->>'mentor')::numeric) as total_score FROM test_answers_1 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'leader', SUM((o.scores->>'leader')::numeric) FROM test_answers_1 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'innovator', SUM((o.scores->>'innovator')::numeric) FROM test_answers_1 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'advocate', SUM((o.scores->>'advocate')::numeric) FROM test_answers_1 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'collaborator', SUM((o.scores->>'collaborator')::numeric) FROM test_answers_1 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'specialist', SUM((o.scores->>'specialist')::numeric) FROM test_answers_1 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
)
SELECT 
  'Test 1: All mentor answers' as test_name,
  archetype,
  total_score,
  CASE 
    WHEN archetype = 'mentor' THEN 'The Guide'
    WHEN archetype = 'innovator' THEN 'The Trailblazer'
    WHEN archetype = 'advocate' THEN 'The Changemaker'
    WHEN archetype = 'collaborator' THEN 'The Connector'
    WHEN archetype = 'specialist' THEN 'The Explorer'
    WHEN archetype = 'leader' THEN 'The Leader'
  END as mapped_name
FROM scores_1
ORDER BY total_score DESC;

-- Test 2: All "leader" answers (should produce "The Leader")
WITH test_answers_2 AS (
  SELECT 
    'q1' as question_id, 'q1_o1' as option_id UNION ALL -- leader: 3
    SELECT 'q2', 'q2_o1' UNION ALL -- leader: 3
    SELECT 'q3', 'q3_o1' UNION ALL -- leader: 2
    SELECT 'q4', 'q4_o1' UNION ALL -- leader: 3
    SELECT 'q5', 'q5_o1' UNION ALL -- leader: 3
    SELECT 'q6', 'q6_o1' UNION ALL -- leader: 3
    SELECT 'q7', 'q7_o1' UNION ALL -- leader: 3
    SELECT 'q8', 'q8_o1' -- leader: 3
),
scores_2 AS (
  SELECT 
    'mentor' as archetype, SUM((o.scores->>'mentor')::numeric) as total_score FROM test_answers_2 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'leader', SUM((o.scores->>'leader')::numeric) FROM test_answers_2 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'innovator', SUM((o.scores->>'innovator')::numeric) FROM test_answers_2 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'advocate', SUM((o.scores->>'advocate')::numeric) FROM test_answers_2 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'collaborator', SUM((o.scores->>'collaborator')::numeric) FROM test_answers_2 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'specialist', SUM((o.scores->>'specialist')::numeric) FROM test_answers_2 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
)
SELECT 
  'Test 2: All leader answers' as test_name,
  archetype,
  total_score,
  CASE 
    WHEN archetype = 'mentor' THEN 'The Guide'
    WHEN archetype = 'innovator' THEN 'The Trailblazer'
    WHEN archetype = 'advocate' THEN 'The Changemaker'
    WHEN archetype = 'collaborator' THEN 'The Connector'
    WHEN archetype = 'specialist' THEN 'The Explorer'
    WHEN archetype = 'leader' THEN 'The Leader'
  END as mapped_name
FROM scores_2
ORDER BY total_score DESC;

-- Test 3: All "innovator" answers (should produce "The Trailblazer")
WITH test_answers_3 AS (
  SELECT 
    'q1' as question_id, 'q1_o2' as option_id UNION ALL -- innovator: 3
    SELECT 'q2', 'q2_o2' UNION ALL -- innovator: 3
    SELECT 'q3', 'q3_o2' UNION ALL -- innovator: 3
    SELECT 'q4', 'q4_o2' UNION ALL -- innovator: 3
    SELECT 'q5', 'q5_o2' UNION ALL -- innovator: 3
    SELECT 'q6', 'q6_o2' UNION ALL -- innovator: 3
    SELECT 'q7', 'q7_o2' UNION ALL -- innovator: 3
    SELECT 'q8', 'q8_o2' -- innovator: 3
),
scores_3 AS (
  SELECT 
    'mentor' as archetype, SUM((o.scores->>'mentor')::numeric) as total_score FROM test_answers_3 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'leader', SUM((o.scores->>'leader')::numeric) FROM test_answers_3 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'innovator', SUM((o.scores->>'innovator')::numeric) FROM test_answers_3 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'advocate', SUM((o.scores->>'advocate')::numeric) FROM test_answers_3 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'collaborator', SUM((o.scores->>'collaborator')::numeric) FROM test_answers_3 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'specialist', SUM((o.scores->>'specialist')::numeric) FROM test_answers_3 t
    JOIN public.archetype_quiz_options o ON t.option_id = o.id
)
SELECT 
  'Test 3: All innovator answers' as test_name,
  archetype,
  total_score,
  CASE 
    WHEN archetype = 'mentor' THEN 'The Guide'
    WHEN archetype = 'innovator' THEN 'The Trailblazer'
    WHEN archetype = 'advocate' THEN 'The Changemaker'
    WHEN archetype = 'collaborator' THEN 'The Connector'
    WHEN archetype = 'specialist' THEN 'The Explorer'
    WHEN archetype = 'leader' THEN 'The Leader'
  END as mapped_name
FROM scores_3
ORDER BY total_score DESC;

-- 5. CHECK ACTUAL QUIZ RESULTS FROM TEACHERS
-- See what answers teachers are actually selecting
SELECT 
  t.user_id,
  t.archetype,
  t.quiz_result,
  jsonb_object_keys(t.quiz_result) as question_id,
  t.quiz_result->jsonb_object_keys(t.quiz_result) as selected_option_id
FROM public.teachers t
WHERE t.quiz_result IS NOT NULL
LIMIT 10;

-- 6. RECALCULATE ARCHETYPE FOR A SPECIFIC TEACHER
-- Replace 'USER_ID_HERE' with an actual user_id to test
/*
WITH teacher_answers AS (
  SELECT 
    jsonb_object_keys(quiz_result) as question_id,
    quiz_result->jsonb_object_keys(quiz_result) as option_id
  FROM public.teachers
  WHERE user_id = 'USER_ID_HERE' -- Replace with actual user_id
),
calculated_scores AS (
  SELECT 
    'mentor' as archetype, 
    COALESCE(SUM((o.scores->>'mentor')::numeric), 0) as total_score 
  FROM teacher_answers t
  LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'leader', COALESCE(SUM((o.scores->>'leader')::numeric), 0) FROM teacher_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'innovator', COALESCE(SUM((o.scores->>'innovator')::numeric), 0) FROM teacher_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'advocate', COALESCE(SUM((o.scores->>'advocate')::numeric), 0) FROM teacher_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'collaborator', COALESCE(SUM((o.scores->>'collaborator')::numeric), 0) FROM teacher_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'specialist', COALESCE(SUM((o.scores->>'specialist')::numeric), 0) FROM teacher_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
)
SELECT 
  archetype,
  total_score,
  CASE 
    WHEN archetype = 'mentor' THEN 'The Guide'
    WHEN archetype = 'innovator' THEN 'The Trailblazer'
    WHEN archetype = 'advocate' THEN 'The Changemaker'
    WHEN archetype = 'collaborator' THEN 'The Connector'
    WHEN archetype = 'specialist' THEN 'The Explorer'
    WHEN archetype = 'leader' THEN 'The Leader'
  END as mapped_name,
  (SELECT archetype FROM calculated_scores ORDER BY total_score DESC LIMIT 1) as should_be_archetype
FROM calculated_scores
ORDER BY total_score DESC;
*/

