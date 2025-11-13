-- =====================================================
-- VERIFY ALL TEACHER ARCHETYPES
-- =====================================================
-- Run this to see all teachers and their archetypes
-- =====================================================

-- Show all teachers with their calculated archetypes
SELECT 
  t.user_id,
  t.full_name,
  t.archetype as current_archetype,
  calculate_archetype_from_quiz(t.quiz_result) as calculated_archetype,
  CASE 
    WHEN t.archetype = calculate_archetype_from_quiz(t.quiz_result) THEN '✓ Correct'
    ELSE '✗ Needs Update'
  END as status,
  t.quiz_result
FROM public.teachers t
WHERE t.quiz_result IS NOT NULL
  AND t.quiz_result != '{}'::JSONB
ORDER BY 
  CASE 
    WHEN t.archetype = calculate_archetype_from_quiz(t.quiz_result) THEN 1
    ELSE 0
  END,
  t.full_name;

-- Count by archetype
SELECT 
  archetype,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.teachers
WHERE archetype IS NOT NULL
GROUP BY archetype
ORDER BY count DESC;

-- Show any teachers that need updating
SELECT 
  t.user_id,
  t.full_name,
  t.archetype as old_archetype,
  calculate_archetype_from_quiz(t.quiz_result) as new_archetype
FROM public.teachers t
WHERE t.quiz_result IS NOT NULL
  AND t.quiz_result != '{}'::JSONB
  AND t.archetype != calculate_archetype_from_quiz(t.quiz_result)
ORDER BY t.full_name;

