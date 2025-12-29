# Email Notifications Verification Guide

## Overview

This guide helps verify that email notifications are working correctly.

## Prerequisites

1. Resend API key is configured
2. Server endpoint `/api/send-email` exists
3. Database triggers are active
4. Email preferences table exists

## Step 1: Verify Database Schema

### Check email_notifications table exists:

```sql
-- Run in Supabase SQL Editor
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'email_notifications';
```

### Check triggers exist:

```sql
-- Run in Supabase SQL Editor
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%email%' OR trigger_name LIKE '%notify%');
```

**Expected triggers:**
- `trigger_notify_school_new_candidates` on `job_candidates`
- `trigger_notify_teacher_new_jobs` on `teacher_job_matches`
- `trigger_notify_application_status` on `applications` (if exists)

### If tables/triggers don't exist, run:

```sql
-- Run EMAIL_NOTIFICATIONS_SCHEMA.sql
-- Located at: /EMAIL_NOTIFICATIONS_SCHEMA.sql

-- Run EMAIL_PREFERENCES_SCHEMA.sql
-- Located at: /EMAIL_PREFERENCES_SCHEMA.sql
```

## Step 2: Verify Server Endpoint

### Check if `/api/send-email` endpoint exists:

The email service (`resendService.ts`) calls `/api/send-email`. This endpoint should:

1. Accept POST requests
2. Require authentication
3. Call Resend API
4. Return success/error response

### Expected Request Format:

```json
{
  "to": ["user@example.com"],
  "subject": "Test Email",
  "html": "<h1>Test</h1>",
  "text": "Test",
  "replyTo": "support@perfectmatchschools.com",
  "from": "noreply@perfectmatchschools.com",
  "tags": []
}
```

### Expected Response Format:

```json
{
  "success": true,
  "messageId": "resend-message-id"
}
```

## Step 3: Test Email Sending

### Manual Test:

1. Create a test email notification in database:
```sql
INSERT INTO email_notifications (
  type,
  recipient_email,
  recipient_name,
  subject,
  template_data,
  status
) VALUES (
  'new_job_match',
  'test@example.com',
  'Test User',
  'Test Email',
  '{}'::jsonb,
  'pending'
);
```

2. Process the notification (via API or manually):
```javascript
// In browser console or API endpoint
import { processEmailNotifications } from '@/lib/emailNotificationService';
await processEmailNotifications(1);
```

3. Verify:
   - [ ] Email appears in Resend dashboard
   - [ ] Email is delivered to recipient
   - [ ] Notification status changes to 'sent'

## Step 4: Test Application Status Email

1. As a school, update an application status:
   - Navigate to candidate dashboard
   - Change application status (e.g., to "under_review")
   
2. Verify:
   - [ ] Email notification is created in `email_notifications` table
   - [ ] Email is sent to teacher
   - [ ] Email contains correct job and status information

## Step 5: Test New Job Match Email

1. Create a new job that matches a teacher's archetype
2. Verify:
   - [ ] Trigger fires when `teacher_job_matches` record is created
   - [ ] Email notification is created
   - [ ] Email is sent (or queued for digest)

## Step 6: Test New Candidate Match Email

1. As a teacher, apply to a job
2. Verify:
   - [ ] Trigger fires when `job_candidates` record is created
   - [ ] Email notification is created for school
   - [ ] Email is sent to school

## Step 7: Verify Email Preferences

1. Navigate to `/settings?tab=email` as a teacher
2. Toggle email preferences
3. Verify:
   - [ ] Preferences save to `user_email_preferences` table
   - [ ] Emails respect preferences (disabled types don't send)
   - [ ] Unsubscribe works

### Check preferences in database:

```sql
SELECT * FROM user_email_preferences 
WHERE user_id = '<test-user-id>';
```

## Step 8: Test Email Templates

### Verify templates exist:

Check that email templates are defined in:
- `client/src/lib/emailTemplates.ts` (if exists)
- Or templates are rendered in `emailNotificationService.ts`

### Test template rendering:

1. Create a test notification
2. Process it
3. Verify:
   - [ ] HTML renders correctly
   - [ ] Variables are replaced
   - [ ] Links work
   - [ ] Unsubscribe link works

## Troubleshooting

### Issue: Emails not sending
**Solutions:**
1. Check Resend API key is set in environment variables
2. Verify server endpoint `/api/send-email` exists and works
3. Check Resend dashboard for errors
4. Verify email addresses are valid

### Issue: Triggers not firing
**Solutions:**
1. Check triggers are created in database
2. Verify trigger functions exist
3. Check RLS policies allow trigger execution
4. Test trigger manually with INSERT/UPDATE

### Issue: Email preferences not respected
**Solutions:**
1. Check `should_send_email_notification` function exists
2. Verify preferences are checked before sending
3. Check preferences table has correct data

### Issue: Email queue not processing
**Solutions:**
1. Check `processEmailNotifications` is being called
2. Verify email processor is running (cron job or scheduled task)
3. Check for errors in console/logs

## Files to Check

- `client/src/lib/resendService.ts` - Email sending service
- `client/src/lib/emailNotificationService.ts` - Notification processing
- `client/src/lib/emailTemplates.ts` - Email templates (if exists)
- `EMAIL_NOTIFICATIONS_SCHEMA.sql` - Database triggers
- `EMAIL_PREFERENCES_SCHEMA.sql` - Preferences schema
- Server endpoint `/api/send-email` - Email API endpoint

## Success Criteria

✅ Database triggers are active
✅ Email notifications are created when events occur
✅ Emails are sent successfully via Resend
✅ Email preferences are respected
✅ Unsubscribe works
✅ Email templates render correctly
✅ Error handling works for failed sends

## Environment Variables Required

```env
VITE_RESEND_API_KEY=re_xxxxx
VITE_RESEND_FROM_EMAIL=noreply@perfectmatchschools.com
VITE_SUPPORT_EMAIL=support@perfectmatchschools.com
```

## Next Steps

1. Set up server endpoint if it doesn't exist
2. Configure Resend API key
3. Test all email types
4. Set up email processor (cron job or scheduled task)
5. Monitor email delivery rates

