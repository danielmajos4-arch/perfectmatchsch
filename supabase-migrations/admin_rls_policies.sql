-- Admin RLS Policies Migration
-- This script adds Row Level Security policies for admin users
-- Admins have full read access to all data for monitoring and management

-- Step 1: Create helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Step 2: Add admin policies for users table
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any user" ON public.users
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (public.is_admin());

-- Step 3: Add admin policies for teachers table
DROP POLICY IF EXISTS "Admins can view all teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can update any teacher" ON public.teachers;
DROP POLICY IF EXISTS "Admins can delete teachers" ON public.teachers;

CREATE POLICY "Admins can view all teachers" ON public.teachers
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any teacher" ON public.teachers
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete teachers" ON public.teachers
  FOR DELETE USING (public.is_admin());

-- Step 4: Add admin policies for schools table
DROP POLICY IF EXISTS "Admins can view all schools" ON public.schools;
DROP POLICY IF EXISTS "Admins can update any school" ON public.schools;
DROP POLICY IF EXISTS "Admins can delete schools" ON public.schools;

CREATE POLICY "Admins can view all schools" ON public.schools
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any school" ON public.schools
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete schools" ON public.schools
  FOR DELETE USING (public.is_admin());

-- Step 5: Add admin policies for jobs table
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can update any job" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete any job" ON public.jobs;

CREATE POLICY "Admins can view all jobs" ON public.jobs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any job" ON public.jobs
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any job" ON public.jobs
  FOR DELETE USING (public.is_admin());

-- Step 6: Add admin policies for applications table
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can update any application" ON public.applications;
DROP POLICY IF EXISTS "Admins can delete applications" ON public.applications;

CREATE POLICY "Admins can view all applications" ON public.applications
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any application" ON public.applications
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete applications" ON public.applications
  FOR DELETE USING (public.is_admin());

-- Step 7: Add admin policies for conversations table
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;

CREATE POLICY "Admins can view all conversations" ON public.conversations
  FOR SELECT USING (public.is_admin());

-- Step 8: Add admin policies for messages table
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;

CREATE POLICY "Admins can view all messages" ON public.messages
  FOR SELECT USING (public.is_admin());

-- Step 9: Add admin policies for notifications table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'in_app_notifications') THEN
    DROP POLICY IF EXISTS "Admins can view all notifications" ON public.in_app_notifications;
    CREATE POLICY "Admins can view all notifications" ON public.in_app_notifications
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;

-- Step 10: Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE policyname LIKE 'Admins can%';
  
  RAISE NOTICE 'Created % admin policies', policy_count;
  
  IF policy_count < 10 THEN
    RAISE WARNING 'Expected at least 10 admin policies, but only found %', policy_count;
  ELSE
    RAISE NOTICE '✅ Admin RLS policies successfully created!';
  END IF;
END $$;

-- IMPORTANT NOTES FOR PRODUCTION:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. The is_admin() function uses SECURITY DEFINER which bypasses RLS for the function itself
-- 3. Only users with role = 'admin' in the users table will have elevated permissions
-- 4. Admin users should be created manually or through a secure process
-- 5. Consider adding audit logging for admin actions in production
