-- =====================================================
-- RECALCULATE ARCHETYPES FOR EXISTING TEACHERS
-- =====================================================
-- This SQL recalculates archetypes based on actual quiz answers
-- and shows what the correct archetype should be
-- =====================================================

-- Function to calculate archetype from quiz_result JSONB
CREATE OR REPLACE FUNCTION calculate_archetype_from_quiz(quiz_result JSONB)
RETURNS TEXT AS $$
DECLARE
  archetype_scores JSONB := '{"mentor": 0, "leader": 0, "innovator": 0, "advocate": 0, "collaborator": 0, "specialist": 0}'::JSONB;
  question_key TEXT;
  option_id TEXT;
  option_scores JSONB;
  archetype_key TEXT;
  max_score NUMERIC := 0;
  top_archetype TEXT := 'mentor';
  archetype_mapping JSONB := '{"mentor": "The Guide", "innovator": "The Trailblazer", "advocate": "The Changemaker", "collaborator": "The Connector", "specialist": "The Explorer", "leader": "The Leader"}'::JSONB;
BEGIN
  -- Loop through each question in quiz_result
  FOR question_key, option_id IN SELECT * FROM jsonb_each_text(quiz_result)
  LOOP
    -- Get scores for this option
    SELECT scores INTO option_scores
    FROM public.archetype_quiz_options
    WHERE id = option_id;
    
    -- If option found, add scores to totals
    IF option_scores IS NOT NULL THEN
      FOR archetype_key IN SELECT jsonb_object_keys(option_scores)
      LOOP
        archetype_scores := jsonb_set(
          archetype_scores,
          ARRAY[archetype_key],
          to_jsonb((archetype_scores->>archetype_key)::numeric + (option_scores->>archetype_key)::numeric)
        );
      END LOOP;
    END IF;
  END LOOP;
  
  -- Find archetype with highest score (with tiebreaker: alphabetical order)
  FOR archetype_key IN SELECT jsonb_object_keys(archetype_scores) ORDER BY archetype_key
  LOOP
    IF (archetype_scores->>archetype_key)::numeric > max_score THEN
      max_score := (archetype_scores->>archetype_key)::numeric;
      top_archetype := archetype_key;
    ELSIF (archetype_scores->>archetype_key)::numeric = max_score THEN
      -- Tiebreaker: use alphabetical order (advocate comes before mentor)
      IF archetype_key < top_archetype THEN
        top_archetype := archetype_key;
      END IF;
    END IF;
  END LOOP;
  
  -- Return mapped archetype name
  RETURN archetype_mapping->>top_archetype;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Test the function with the provided quiz results
-- User 1: 50b7d751-7403-455b-a1f7-d4116fc5a2b1
SELECT 
  'User 1' as test_user,
  calculate_archetype_from_quiz('{"q1": "q1_o1", "q2": "q2_o3", "q3": "q3_o2", "q4": "q4_o4", "q5": "q5_o2", "q6": "q6_o3", "q7": "q7_o2", "q8": "q8_o3"}'::JSONB) as calculated_archetype,
  'The Guide' as current_archetype;

-- User 2: 393e3fd6-d963-4f99-b026-0aaefdef12da
SELECT 
  'User 2' as test_user,
  calculate_archetype_from_quiz('{"q1": "q1_o4", "q2": "q2_o2", "q3": "q3_o1", "q4": "q4_o3", "q5": "q5_o2", "q6": "q6_o3", "q7": "q7_o1", "q8": "q8_o3"}'::JSONB) as calculated_archetype,
  'The Guide' as current_archetype;

-- Detailed breakdown for User 1
WITH user1_answers AS (
  SELECT 
    'q1' as question_id, 'q1_o1' as option_id UNION ALL
    SELECT 'q2', 'q2_o3' UNION ALL
    SELECT 'q3', 'q3_o2' UNION ALL
    SELECT 'q4', 'q4_o4' UNION ALL
    SELECT 'q5', 'q5_o2' UNION ALL
    SELECT 'q6', 'q6_o3' UNION ALL
    SELECT 'q7', 'q7_o2' UNION ALL
    SELECT 'q8', 'q8_o3'
),
user1_scores AS (
  SELECT 
    'mentor' as archetype, 
    COALESCE(SUM((o.scores->>'mentor')::numeric), 0) as total_score 
  FROM user1_answers t
  LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'leader', COALESCE(SUM((o.scores->>'leader')::numeric), 0) FROM user1_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'innovator', COALESCE(SUM((o.scores->>'innovator')::numeric), 0) FROM user1_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'advocate', COALESCE(SUM((o.scores->>'advocate')::numeric), 0) FROM user1_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'collaborator', COALESCE(SUM((o.scores->>'collaborator')::numeric), 0) FROM user1_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'specialist', COALESCE(SUM((o.scores->>'specialist')::numeric), 0) FROM user1_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
)
SELECT 
  'User 1 Detailed Scores' as label,
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
FROM user1_scores
ORDER BY total_score DESC;

-- Detailed breakdown for User 2
WITH user2_answers AS (
  SELECT 
    'q1' as question_id, 'q1_o4' as option_id UNION ALL
    SELECT 'q2', 'q2_o2' UNION ALL
    SELECT 'q3', 'q3_o1' UNION ALL
    SELECT 'q4', 'q4_o3' UNION ALL
    SELECT 'q5', 'q5_o2' UNION ALL
    SELECT 'q6', 'q6_o3' UNION ALL
    SELECT 'q7', 'q7_o1' UNION ALL
    SELECT 'q8', 'q8_o3'
),
user2_scores AS (
  SELECT 
    'mentor' as archetype, 
    COALESCE(SUM((o.scores->>'mentor')::numeric), 0) as total_score 
  FROM user2_answers t
  LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'leader', COALESCE(SUM((o.scores->>'leader')::numeric), 0) FROM user2_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'innovator', COALESCE(SUM((o.scores->>'innovator')::numeric), 0) FROM user2_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'advocate', COALESCE(SUM((o.scores->>'advocate')::numeric), 0) FROM user2_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'collaborator', COALESCE(SUM((o.scores->>'collaborator')::numeric), 0) FROM user2_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
  UNION ALL
  SELECT 'specialist', COALESCE(SUM((o.scores->>'specialist')::numeric), 0) FROM user2_answers t
    LEFT JOIN public.archetype_quiz_options o ON t.option_id = o.id
)
SELECT 
  'User 2 Detailed Scores' as label,
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
FROM user2_scores
ORDER BY total_score DESC;

-- Update all teachers with correct archetypes
UPDATE public.teachers
SET archetype = calculate_archetype_from_quiz(quiz_result)
WHERE quiz_result IS NOT NULL
  AND quiz_result != '{}'::JSONB;

-- Show before/after comparison
SELECT 
  user_id,
  full_name,
  archetype as old_archetype,
  calculate_archetype_from_quiz(quiz_result) as new_archetype,
  CASE 
    WHEN archetype = calculate_archetype_from_quiz(quiz_result) THEN '✓ Correct'
    ELSE '✗ Needs Update'
  END as status
FROM public.teachers
WHERE quiz_result IS NOT NULL
  AND quiz_result != '{}'::JSONB
ORDER BY status, full_name;

