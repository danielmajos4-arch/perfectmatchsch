-- Fix User Information Saving Issues
-- This script will:
-- 1. Verify and recreate the trigger if needed
-- 2. Backfill missing user records
-- 3. Verify RLS policies

-- ============================================
-- PART 1: Verify and Fix Trigger
-- ============================================

-- 1.1 Check if function exists, recreate if needed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'teacher'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, public.users.role),
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.2 Drop and recreate trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PART 2: Backfill Missing User Records
-- ============================================

-- 2.1 Insert missing users from auth.users into public.users
INSERT INTO public.users (id, email, role, full_name, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'role', 'teacher')::text,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email)::text,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = COALESCE(EXCLUDED.role, public.users.role),
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);

-- ============================================
-- PART 3: Verify RLS Policies
-- ============================================

-- 3.1 Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3.2 Recreate users policies if they don't exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 3.3 Ensure RLS is enabled on teachers table
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- 3.4 Recreate teachers policies if they don't exist
DROP POLICY IF EXISTS "Users can view all teacher profiles" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can insert their own profile" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update their own profile" ON public.teachers;

CREATE POLICY "Users can view all teacher profiles" ON public.teachers
  FOR SELECT USING (true);

CREATE POLICY "Teachers can insert their own profile" ON public.teachers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can update their own profile" ON public.teachers
  FOR UPDATE USING (auth.uid() = user_id);

-- 3.5 Ensure RLS is enabled on schools table
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- 3.6 Recreate schools policies if they don't exist
DROP POLICY IF EXISTS "Users can view all school profiles" ON public.schools;
DROP POLICY IF EXISTS "Schools can insert their own profile" ON public.schools;
DROP POLICY IF EXISTS "Schools can update their own profile" ON public.schools;

CREATE POLICY "Users can view all school profiles" ON public.schools
  FOR SELECT USING (true);

CREATE POLICY "Schools can insert their own profile" ON public.schools
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Schools can update their own profile" ON public.schools
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- PART 4: Summary Report
-- ============================================

SELECT 
  '✅ User saving fix complete!' as status,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.users) 
    THEN '✅ All users synced'
    ELSE '⚠️ Some users may still be missing'
  END as sync_status;

-- Show any remaining missing users
SELECT 
  '⚠️ Users still missing from public.users:' as warning,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

