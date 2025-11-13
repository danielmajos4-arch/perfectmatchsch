# Quick Start Guide - PerfectMatchSchools MVP

## Step 1: Environment Setup (✅ Complete)

The `.env` file has been configured with your Supabase credentials:
- `VITE_SUPABASE_URL`: https://potoqeqztxztlnbdkdaf.supabase.co
- `VITE_SUPABASE_ANON_KEY`: [configured]

## Step 2: Database Setup (⏳ Required)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: potoqeqztxztlnbdkdaf
3. **Open SQL Editor** (left sidebar)
4. **Copy entire contents of `supabase-schema-fixed.sql`**
   - ⚠️ **Important**: Use `supabase-schema-fixed.sql` (not the original)
   - This version handles existing tables safely and fixes the "user_id does not exist" error
5. **Paste and click "Run"**

This will create:
- `users` table (extends auth.users)
- `teachers` table (teacher profiles)
- `schools` table (school profiles)
- `jobs` table (job postings)
- `applications` table (job applications)
- `conversations` table (for messaging - optional)
- `messages` table (for messaging - optional)
- All RLS policies
- Triggers for auto-creating user profiles

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Start Development Server

```bash
npm run dev
```

The app will start at: http://127.0.0.1:5000

## Step 5: Test the MVP

### Test Registration
1. Go to http://127.0.0.1:5000/register
2. Create a teacher account:
   - Name: Test Teacher
   - Email: teacher@test.com
   - Password: test123456
   - Role: Teacher
3. Create a school account:
   - Name: Test School
   - Email: school@test.com
   - Password: test123456
   - Role: School

### Test Job Posting (School)
1. Login as school
2. Go to School Dashboard
3. Click "Post Job"
4. Fill in job details and submit
5. Verify job appears in dashboard

### Test Job Browsing (Teacher)
1. Login as teacher (or stay logged out)
2. Go to `/jobs`
3. Browse available jobs
4. Click on a job to see details

### Test Application (Teacher)
1. Login as teacher
2. Go to `/jobs`
3. Click on a job
4. Click "Apply for this Position"
5. Write cover letter and submit
6. Go to Teacher Dashboard to see application

### Test Application Viewing (School)
1. Login as school
2. Go to School Dashboard
3. See application count for posted jobs
4. (Note: Full application management UI to be added)

## Troubleshooting

### "Missing Supabase environment variables" error
- Restart the dev server after updating `.env`
- Verify `.env` file is in project root
- Check that variables start with `VITE_`

### "relation does not exist" errors
- Run `supabase-schema.sql` in Supabase SQL Editor
- Verify tables exist in Supabase Table Editor

### Authentication not working
- Check Supabase project URL and anon key are correct
- Verify email provider is enabled in Supabase Auth settings
- Check browser console for specific errors

### RLS policy errors
- Verify RLS is enabled on all tables
- Check policies exist in Supabase Dashboard → Authentication → Policies
- Ensure user is authenticated when testing

## Next Steps

Once MVP is working:
1. Implement real-time messaging
2. Add application status management UI for schools
3. Add file upload functionality
4. Implement quiz system (requires additional tables)

## Support

- Check `TESTING_CHECKLIST.md` for detailed testing steps
- Check `DATABASE_SETUP.md` for database verification
- Check `ARCHITECTURE_ANALYSIS.md` for system overview

