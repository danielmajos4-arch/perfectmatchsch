# Verification Guide - Complete Testing Checklist

## Pre-Flight Checks ✅

### 1. Environment Setup
- [x] `.env` file exists with Supabase credentials
- [x] `VITE_SUPABASE_URL` is set
- [x] `VITE_SUPABASE_ANON_KEY` is set
- [ ] Dev server can start without errors: `npm run dev`

### 2. Database Setup
- [ ] `supabase-schema-fixed.sql` has been run in Supabase SQL Editor
- [ ] All tables exist: `users`, `teachers`, `schools`, `jobs`, `applications`, `conversations`, `messages`
- [ ] RLS is enabled on all tables
- [ ] Trigger `on_auth_user_created` exists and is active
- [ ] Function `handle_new_user()` exists

## Phase 1: Connection & Authentication Testing

### Test 1.1: Supabase Connection
**Steps:**
1. Start dev server: `npm run dev`
2. Open browser console (F12)
3. Navigate to any page
4. Check for Supabase connection errors

**Expected Result:**
- ✅ No "Missing Supabase environment variables" error
- ✅ No connection errors in console
- ✅ App loads without crashing

**Verification:**
```javascript
// In browser console, test:
import { supabase } from './lib/supabaseClient';
console.log('Supabase client:', supabase);
// Should log the client object without errors
```

### Test 1.2: Registration Flow
**Steps:**
1. Navigate to `/register`
2. Fill in form:
   - Full Name: "Test Teacher"
   - Email: "teacher@test.com" (use unique email)
   - Password: "test123456"
   - Role: "Teacher"
3. Click "Create Account"
4. Check Supabase dashboard → Authentication → Users

**Expected Result:**
- ✅ Success toast appears
- ✅ Redirects to `/dashboard` or `/onboarding/teacher`
- ✅ User appears in `auth.users` table
- ✅ User profile appears in `users` table (auto-created by trigger)
- ✅ `user_metadata.role` is set to "teacher"
- ✅ `user_metadata.full_name` is set

**Verify in Supabase:**
```sql
-- Check user was created
SELECT * FROM auth.users WHERE email = 'teacher@test.com';

-- Check profile was auto-created
SELECT * FROM public.users WHERE email = 'teacher@test.com';
```

### Test 1.3: Login Flow
**Steps:**
1. Navigate to `/login`
2. Enter registered email and password
3. Click "Sign In"

**Expected Result:**
- ✅ Success toast appears
- ✅ Redirects to appropriate dashboard based on role
- ✅ Session persists on page refresh
- ✅ User data loads in AuthContext

**Verify:**
- Check browser console for auth state
- Check localStorage for Supabase session
- Refresh page - should stay logged in

### Test 1.4: Protected Routes
**Steps:**
1. While logged out, try to access:
   - `/dashboard`
   - `/teacher/dashboard`
   - `/school/dashboard`
   - `/messages`
   - `/profile`
2. While logged in as teacher, try:
   - `/school/dashboard` (should redirect)
3. While logged in as school, try:
   - `/teacher/dashboard` (should redirect)

**Expected Result:**
- ✅ Unauthenticated users redirected to `/login`
- ✅ Wrong role users redirected to their dashboard
- ✅ Correct role users can access their routes

## Phase 2: Job Posting & Browsing

### Test 2.1: School Job Posting
**Prerequisites:** Logged in as school user

**Steps:**
1. Navigate to `/school/dashboard`
2. Click "Post Job" button
3. Fill in job form:
   - Title: "Math Teacher"
   - School Name: "Test School"
   - Subject: "Mathematics"
   - Grade Level: "High School"
   - Job Type: "Full-time"
   - Location: "New York, NY"
   - Salary: "$50,000 - $70,000"
   - Description: "Looking for experienced math teacher"
   - Requirements: "Bachelor's degree required"
   - Benefits: "Health insurance, 401k"
4. Click "Post Job"

**Expected Result:**
- ✅ Success toast appears
- ✅ Job appears in school dashboard
- ✅ Job is in `jobs` table in Supabase
- ✅ `school_id` matches logged-in user
- ✅ `is_active` is `true` by default

**Verify in Supabase:**
```sql
SELECT * FROM jobs WHERE school_id = '<your-user-id>' ORDER BY posted_at DESC;
```

### Test 2.2: Teacher Job Browsing
**Steps:**
1. Navigate to `/jobs` (can be logged out or as teacher)
2. Verify jobs are displayed
3. Test search: Type "Math" in search box
4. Test filter: Select "Mathematics" from subject dropdown
5. Click on a job card

**Expected Result:**
- ✅ Active jobs are displayed
- ✅ Search filters results correctly
- ✅ Subject filter works
- ✅ Job detail page shows all information
- ✅ Only active jobs are visible to teachers

**Verify:**
- Check that inactive jobs (if any) don't appear
- Verify search matches title, school name, and location

### Test 2.3: Job Detail View
**Steps:**
1. Click on any job from `/jobs` page
2. Verify all sections display:
   - Job title and school name
   - Badges (subject, grade level, job type)
   - Location, salary, job type, posted date
   - Job description
   - Requirements
   - Benefits
   - School info card

**Expected Result:**
- ✅ All job information displays correctly
- ✅ "Apply for this Position" button visible (if logged in as teacher)
- ✅ Mobile responsive layout works

## Phase 3: Applications System

### Test 3.1: Teacher Application Submission
**Prerequisites:** Logged in as teacher, at least one job posted

**Steps:**
1. Navigate to `/jobs`
2. Click on a job
3. Click "Apply for this Position"
4. Fill in cover letter: "I am interested in this position..."
5. Click "Submit Application"

**Expected Result:**
- ✅ Success toast appears
- ✅ Modal closes
- ✅ Application appears in teacher dashboard
- ✅ Application is in `applications` table
- ✅ `teacher_id` matches logged-in user
- ✅ `status` is "pending" by default
- ✅ Cannot apply to same job twice (UNIQUE constraint)

**Verify in Supabase:**
```sql
SELECT * FROM applications WHERE teacher_id = '<your-user-id>';
```

### Test 3.2: Duplicate Application Prevention
**Steps:**
1. Try to apply to the same job again
2. Check error message

**Expected Result:**
- ✅ Error toast appears
- ✅ Error message indicates duplicate application
- ✅ Application is not created

### Test 3.3: Teacher Application Viewing
**Steps:**
1. Navigate to `/teacher/dashboard`
2. Check "Your Applications" section

**Expected Result:**
- ✅ Applications are listed
- ✅ Job title and school name display
- ✅ Status badge shows (pending, under_review, accepted, rejected)
- ✅ "Applied X time ago" timestamp displays
- ✅ Empty state shows if no applications

### Test 3.4: School Application Viewing
**Prerequisites:** Logged in as school, at least one application received

**Steps:**
1. Navigate to `/school/dashboard`
2. Check job cards show application count
3. Verify applications are accessible

**Expected Result:**
- ✅ Application count displays on job cards
- ✅ Schools can see applications for their jobs
- ✅ RLS policy allows access

**Verify in Supabase:**
```sql
-- As school user, should see applications for their jobs
SELECT a.*, j.title 
FROM applications a
JOIN jobs j ON j.id = a.job_id
WHERE j.school_id = '<school-user-id>';
```

## Phase 4: Onboarding (Optional for MVP)

### Test 4.1: Teacher Onboarding
**Prerequisites:** Newly registered teacher user

**Steps:**
1. After registration, should redirect to `/onboarding/teacher`
2. Fill in teacher profile:
   - Full name, email, phone, location
   - Years of experience
   - Subjects (select multiple)
   - Grade levels (select multiple)
   - Bio (optional)
   - Teaching philosophy (optional)
3. Submit profile
4. (Optional) Complete archetype quiz if tables exist

**Expected Result:**
- ✅ Profile saves to `teachers` table
- ✅ `user_id` matches auth user
- ✅ `profile_complete` is `false` initially
- ✅ Redirects to quiz or dashboard

**Verify in Supabase:**
```sql
SELECT * FROM teachers WHERE user_id = '<teacher-user-id>';
```

### Test 4.2: School Onboarding
**Prerequisites:** Newly registered school user

**Steps:**
1. After registration, should redirect to `/onboarding/school`
2. Fill in school profile:
   - School name
   - School type
   - Location
   - Description
   - Website (optional)
3. Submit profile

**Expected Result:**
- ✅ Profile saves to `schools` table
- ✅ `user_id` matches auth user
- ✅ `profile_complete` is `true`
- ✅ Redirects to school dashboard

**Verify in Supabase:**
```sql
SELECT * FROM schools WHERE user_id = '<school-user-id>';
```

## Phase 5: Security & RLS Testing

### Test 5.1: Data Isolation
**Steps:**
1. Create two school accounts (School A and School B)
2. School A posts a job
3. Login as School B
4. Try to view School A's jobs in dashboard

**Expected Result:**
- ✅ School B cannot see School A's jobs
- ✅ School B's dashboard only shows their own jobs
- ✅ RLS policy enforces isolation

### Test 5.2: Application Access Control
**Steps:**
1. Teacher A applies to School A's job
2. Login as Teacher B
3. Try to view Teacher A's applications

**Expected Result:**
- ✅ Teacher B cannot see Teacher A's applications
- ✅ Each teacher only sees their own applications
- ✅ RLS policy enforces access control

### Test 5.3: Job Modification
**Steps:**
1. School A posts a job
2. Login as School B
3. Try to update School A's job (via API if possible)

**Expected Result:**
- ✅ School B cannot modify School A's jobs
- ✅ RLS policy prevents unauthorized updates

## Phase 6: Error Handling

### Test 6.1: Network Errors
**Steps:**
1. Disconnect internet
2. Try to perform actions (login, post job, etc.)

**Expected Result:**
- ✅ Error messages are user-friendly
- ✅ App doesn't crash
- ✅ Loading states handle errors gracefully

### Test 6.2: Invalid Input
**Steps:**
1. Try to register with invalid email
2. Try to register with short password (< 6 chars)
3. Try to submit job form with missing fields

**Expected Result:**
- ✅ Validation errors display
- ✅ Forms don't submit with invalid data
- ✅ Error messages are clear

### Test 6.3: Unauthorized Actions
**Steps:**
1. Logout
2. Try to access protected routes
3. Try to post job while logged out

**Expected Result:**
- ✅ Redirects to login
- ✅ Error messages indicate authentication required
- ✅ No data corruption

## Phase 7: Performance & UX

### Test 7.1: Loading States
**Steps:**
1. Navigate through pages
2. Perform actions (post job, apply, etc.)

**Expected Result:**
- ✅ Loading skeletons/spinners show during data fetch
- ✅ Buttons show loading state during mutations
- ✅ No flickering or layout shifts

### Test 7.2: Mobile Responsiveness
**Steps:**
1. Open app on mobile device or resize browser
2. Test all pages and features

**Expected Result:**
- ✅ Mobile navigation works
- ✅ Forms are usable on mobile
- ✅ Job cards stack properly
- ✅ Text is readable

### Test 7.3: Browser Console
**Steps:**
1. Open browser console (F12)
2. Navigate through app
3. Perform various actions

**Expected Result:**
- ✅ No critical errors (red)
- ✅ Warnings are acceptable (yellow)
- ✅ No memory leaks
- ✅ Network requests are reasonable

## Success Criteria Summary

✅ **All MVP Features Working:**
- Authentication (register, login, logout)
- Job posting (schools)
- Job browsing (teachers/guests)
- Applications (submit, view)
- Dashboards (both roles)
- Onboarding (both roles)
- Protected routes
- RLS policies

✅ **No Critical Issues:**
- No console errors
- No data leaks
- Proper error handling
- Good UX/loading states

✅ **Production Ready:**
- Environment configured
- Database schema deployed
- Security policies active
- Code quality verified

## Quick Verification Commands

### Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'teachers', 'schools', 'jobs', 'applications', 'conversations', 'messages');
```

### Check RLS Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'teachers', 'schools', 'jobs', 'applications');
```

### Check Trigger Exists
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

### Check Function Exists
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';
```

