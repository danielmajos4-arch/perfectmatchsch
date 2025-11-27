# Email Notifications Setup Guide

## Overview
This guide will help you activate email notifications by running the required database schemas in Supabase.

## Prerequisites
Before running the email notification schemas, ensure you have:
1. ✅ Base schema (`supabase-schema-fixed.sql`) already run
2. ✅ Matching system schema (`sprint6-matching-schema.sql`) already run
3. ✅ Supabase project access
4. ✅ Resend API key configured in `.env`

## Execution Order

The schemas must be run in this specific order:

### Step 1: Email Preferences Schema
**File**: `EMAIL_PREFERENCES_SCHEMA.sql`

This creates the `user_email_preferences` table and functions for managing email preferences.

**How to Run:**
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `EMAIL_PREFERENCES_SCHEMA.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify success - you should see "Success. No rows returned"

### Step 2: Email Notifications Schema
**File**: `EMAIL_NOTIFICATIONS_SCHEMA.sql`

This creates the `email_notifications` queue table and triggers for automatic email notifications.

**How to Run:**
1. In the same SQL Editor (or new query)
2. Copy the entire contents of `EMAIL_NOTIFICATIONS_SCHEMA.sql`
3. Paste into the SQL Editor
4. Click **Run**
5. Verify success - you should see "Success. No rows returned"

## Verification

After running both schemas, verify they were created successfully:

### Check Tables
Run this query in SQL Editor:
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('email_notifications', 'user_email_preferences');
```

You should see both tables listed.

### Check Triggers
Run this query:
```sql
-- Check if triggers exist
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%email%' OR trigger_name LIKE '%notify%';
```

You should see:
- `trigger_notify_school_new_candidates`
- `trigger_notify_teacher_new_jobs`
- `trigger_create_default_email_preferences`

### Check Functions
Run this query:
```sql
-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%email%' OR routine_name LIKE '%notify%';
```

You should see multiple functions including:
- `notify_school_new_candidates()`
- `notify_teacher_new_jobs()`
- `should_send_email_notification()`
- `get_pending_email_notifications()`
- `update_email_notification_status()`

## Testing Email Notifications

### Test 1: Verify Email Processor
1. Start your development server: `npm run dev`
2. Check browser console - you should see: `[Email Notifications] Processor disabled in development mode`
3. In production mode, the processor will start automatically

### Test 2: Create Test Notification
Run this in SQL Editor to create a test notification:
```sql
-- Create a test notification
INSERT INTO public.email_notifications (
  type,
  recipient_email,
  recipient_name,
  subject,
  template_data
) VALUES (
  'new_candidate_match',
  'your-email@example.com',
  'Test User',
  'Test Notification',
  '{"test": true}'::jsonb
);

-- Check if it was created
SELECT * FROM public.email_notifications WHERE recipient_email = 'your-email@example.com';
```

### Test 3: Test Trigger (New Candidate Match)
1. Ensure you have:
   - A school user with a posted job
   - A teacher user with a profile
   - The matching system has created a match in `job_candidates`
2. Insert a new candidate match:
```sql
-- This should trigger an email notification automatically
-- (Assuming you have matching data)
SELECT * FROM public.email_notifications 
WHERE type = 'new_candidate_match' 
ORDER BY created_at DESC 
LIMIT 5;
```

## Environment Variables

Ensure your `.env` file has:
```bash
RESEND_API_KEY=your-resend-api-key
VITE_RESEND_API_KEY=your-resend-api-key
VITE_FROM_EMAIL=noreply@perfectmatchschools.com
VITE_SUPPORT_EMAIL=support@perfectmatchschools.com
```

## Troubleshooting

### Error: "relation does not exist"
**Solution**: Run the prerequisite schemas first:
1. `supabase-schema-fixed.sql`
2. `sprint6-matching-schema.sql`

### Error: "function does not exist"
**Solution**: Make sure you ran `EMAIL_PREFERENCES_SCHEMA.sql` before `EMAIL_NOTIFICATIONS_SCHEMA.sql`

### Triggers not firing
**Solution**: 
1. Verify triggers exist (use verification queries above)
2. Check that RLS policies allow the operations
3. Verify the matching tables (`job_candidates`, `teacher_job_matches`) have data

### Email processor not running
**Solution**:
1. Check that you're in production mode (`NODE_ENV=production`)
2. Verify `startEmailNotificationProcessor` is called in `main.tsx`
3. Check browser console for errors

## Next Steps

After setup:
1. ✅ Test email delivery with Resend API
2. ✅ Verify triggers fire when matches are created
3. ✅ Test email preferences UI
4. ✅ Monitor email notification queue

## Support

If you encounter issues:
1. Check the Supabase logs in the dashboard
2. Review the error messages in SQL Editor
3. Verify all prerequisite schemas are run
4. Check that your Resend API key is valid

---

**Status**: Ready to run
**Last Updated**: Setup guide created
**Files**: 
- `EMAIL_PREFERENCES_SCHEMA.sql` ✅
- `EMAIL_NOTIFICATIONS_SCHEMA.sql` ✅

