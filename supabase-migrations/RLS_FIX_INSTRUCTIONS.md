# Steps to Apply RLS Fix

## 1. Open Supabase SQL Editor
1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**

## 2. Copy and Run the SQL Script
1. Copy the entire contents of `supabase-migrations/fix_teacher_onboarding_rls.sql`
2. Paste it into the SQL Editor
3. Click **Run** (or press Ctrl/Cmd + Enter)

## 3. Verify Success
You should see:
- A table showing all the RLS policies that were created
- Success messages in the output

## 4. Test in Browser
1. **Clear browser data**:
   - Open DevTools (F12)
   - Go to Application → Storage → Local Storage
   - Right-click → Clear
2. **Refresh the page** (Ctrl/Cmd + Shift + R for hard refresh)
3. **Log in again** at http://127.0.0.1:5000
4. **Navigate to** `/onboarding/teacher`
5. **Fill out the profile form** and click "Continue to Quiz"
6. **Check the console** - there should be NO 401 errors

## Expected Result
✅ Quiz should load with 8 questions
✅ Each question should have 4 options
✅ No 401 errors in the browser console
✅ Teacher can complete onboarding and see archetype results
