-- Verify User Information Saving Issues
-- Run this to check if triggers, functions, and RLS policies are set up correctly

-- 1. Check if handle_new_user function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
    ) THEN '✅ Function handle_new_user() exists'
    ELSE '❌ Function handle_new_user() is MISSING'
  END as function_status;

-- 2. Check if trigger exists and is active
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created'
    ) THEN '✅ Trigger on_auth_user_created exists'
    ELSE '❌ Trigger on_auth_user_created is MISSING'
  END as trigger_status;

-- 3. Check if trigger is enabled
SELECT 
  CASE 
    WHEN t.tgenabled = 'O' THEN '✅ Trigger is ENABLED'
    WHEN t.tgenabled = 'D' THEN '⚠️ Trigger is DISABLED'
    ELSE '❌ Trigger status unknown'
  END as trigger_enabled_status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created';

-- 4. Check RLS policies on users table
SELECT 
  CASE 
    WHEN relrowsecurity THEN '✅ RLS is ENABLED on users table'
    ELSE '⚠️ RLS is DISABLED on users table'
  END as rls_status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'users';

-- 5. List all RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- 6. Check RLS policies on teachers table
SELECT 
  CASE 
    WHEN relrowsecurity THEN '✅ RLS is ENABLED on teachers table'
    ELSE '⚠️ RLS is DISABLED on teachers table'
  END as rls_status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'teachers';

-- 7. List all RLS policies on teachers table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'teachers'
ORDER BY policyname;

-- 8. Check RLS policies on schools table
SELECT 
  CASE 
    WHEN relrowsecurity THEN '✅ RLS is ENABLED on schools table'
    ELSE '⚠️ RLS is DISABLED on schools table'
  END as rls_status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'schools';

-- 9. List all RLS policies on schools table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'schools'
ORDER BY policyname;

-- 10. Count users in auth.users vs public.users (to see if trigger is working)
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) > (SELECT COUNT(*) FROM public.users) 
    THEN '⚠️ Some users in auth.users are missing from public.users (trigger may not be working)'
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.users) 
    THEN '✅ User counts match (trigger appears to be working)'
    ELSE '⚠️ More users in public.users than auth.users (unexpected)'
  END as trigger_health;

-- 11. Show recent users (last 10) to check if they have records
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  pu.id as public_user_id,
  pu.role,
  pu.full_name,
  CASE 
    WHEN pu.id IS NULL THEN '❌ Missing from public.users'
    ELSE '✅ Exists in public.users'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;

