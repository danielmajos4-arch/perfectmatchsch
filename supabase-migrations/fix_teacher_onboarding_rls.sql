-- Fix Teacher Onboarding RLS Policies
-- This script resolves 401 Unauthorized errors by ensuring proper RLS policies
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================================================
-- STEP 1: Drop all existing policies to avoid conflicts
-- ============================================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Teachers table policies
DROP POLICY IF EXISTS "Users can view all teacher profiles" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can insert their own profile" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update their own profile" ON public.teachers;

-- Quiz table policies
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.archetype_quiz_questions;
DROP POLICY IF EXISTS "Anyone can view quiz options" ON public.archetype_quiz_options;

-- ============================================================================
-- STEP 2: Ensure RLS is enabled on all tables
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archetype_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archetype_quiz_options ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create comprehensive RLS policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Allow all authenticated users to view user records
-- Needed for: role checking, profile lookups, matching system
CREATE POLICY "Authenticated users can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own profile during registration
-- The handle_new_user() trigger creates this automatically, but users need permission
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- TEACHERS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Allow all users (authenticated + anon) to view teacher profiles
-- Needed for: school search, matching, job applications
CREATE POLICY "Anyone can view teacher profiles"
ON public.teachers
FOR SELECT
USING (true);

-- Allow teachers to insert their own profile during onboarding
CREATE POLICY "Teachers can insert their own profile"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow teachers to update their own profile
CREATE POLICY "Teachers can update their own profile"
ON public.teachers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- QUIZ TABLES POLICIES
-- ----------------------------------------------------------------------------

-- Allow everyone to view quiz questions (public data)
CREATE POLICY "Anyone can view quiz questions"
ON public.archetype_quiz_questions
FOR SELECT
USING (true);

-- Allow everyone to view quiz options (public data)
CREATE POLICY "Anyone can view quiz options"  
ON public.archetype_quiz_options
FOR SELECT
USING (true);

-- ============================================================================

-- Ensure both authenticated and anonymous users can read from the view
GRANT SELECT ON public.quiz_with_options TO authenticated;
GRANT SELECT ON public.quiz_with_options TO anon;

-- ============================================================================
-- STEP 5: Verify policies were created
-- ============================================================================

-- Display all policies for verification
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('users', 'teachers', 'archetype_quiz_questions', 'archetype_quiz_options')
ORDER BY tablename, policyname;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies successfully updated!';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Refresh your browser';
  RAISE NOTICE '   2. Clear local storage (DevTools → Application → Local Storage → Clear)';
  RAISE NOTICE '   3. Log in again and test teacher onboarding';
END $$;
