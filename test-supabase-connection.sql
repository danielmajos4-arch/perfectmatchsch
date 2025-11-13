-- Supabase Connection and Table Verification Queries
-- Run these queries in Supabase SQL Editor to verify your setup

-- 1. Verify all required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('users', 'teachers', 'schools', 'jobs', 'applications', 'conversations', 'messages') 
    THEN '✅ Required'
    ELSE 'Optional'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'teachers', 'schools', 'jobs', 'applications', 'conversations', 'messages')
ORDER BY table_name;

-- 2. Verify RLS is enabled on all tables
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'teachers', 'schools', 'jobs', 'applications', 'conversations', 'messages')
ORDER BY tablename;

-- 3. Verify trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  CASE 
    WHEN trigger_name = 'on_auth_user_created' THEN '✅ Found'
    ELSE '⚠️  Check'
  END as status
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 4. Verify function exists
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name = 'handle_new_user' THEN '✅ Found'
    ELSE '⚠️  Check'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- 5. Check table structures (verify user_id column exists)
SELECT 
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'user_id' THEN '✅ Found'
    ELSE ''
  END as user_id_check
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('teachers', 'schools')
AND column_name = 'user_id'
ORDER BY table_name, column_name;

-- 6. Verify indexes exist
SELECT 
  tablename,
  indexname,
  CASE 
    WHEN indexname LIKE 'idx_%' THEN '✅ Found'
    ELSE ''
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('teachers', 'schools', 'jobs', 'applications', 'messages')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 7. Count policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Has Policies'
    ELSE '❌ No Policies'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'teachers', 'schools', 'jobs', 'applications', 'conversations', 'messages')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 8. Test query (should work if RLS allows)
-- This will only work if you're authenticated, but it tests the connection
SELECT COUNT(*) as user_count FROM public.users;

-- Summary: If all queries return results with ✅, your database is set up correctly!

