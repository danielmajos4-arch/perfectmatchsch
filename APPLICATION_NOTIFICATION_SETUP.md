# Application Notification Setup

## Overview
Schools now receive in-app notifications when teachers apply for their job postings. The notification appears in the notification center (bell icon in the header) with a badge showing unread count.

## Changes Made

### 1. Database Schema Update
- **File**: `supabase-migrations/add_new_application_notification_type.sql`
- **Action**: Added `'new_application'` as a new notification type to the `in_app_notifications` table
- **Run this SQL in Supabase SQL Editor** to update the schema

### 2. Notification Service Update
- **File**: `client/src/lib/notificationService.ts`
- **Changes**:
  - Added `'new_application'` to the notification type union
  - Updated `notifyNewApplication()` to use the new type with a more prominent title: "New Application Received! 🎉"
  - Enhanced metadata to include teacher name

### 3. Application Submission Updates
- **Files**: 
  - `client/src/components/ApplicationWizard.tsx`
  - `client/src/components/ApplicationModal.tsx`
- **Changes**:
  - Fixed duplicate notification issue in ApplicationWizard
  - Ensured teacher name is fetched before sending notification
  - Notification is sent non-blocking (fire-and-forget) to prevent blocking application submission

## How It Works

1. **When a teacher applies**:
   - Application is created in the database
   - Teacher name is fetched from the `teachers` table
   - Notification is created for the school's user (using `job.school_id` which is the school's `user_id`)

2. **Notification Display**:
   - Notification appears in the notification center (bell icon in header)
   - Badge shows unread count
   - Real-time updates via Supabase subscriptions
   - Clicking the notification takes the school to `/school/dashboard#applications`

3. **Notification Details**:
   - **Type**: `new_application`
   - **Title**: "New Application Received! 🎉"
   - **Message**: "{Teacher Name} applied for \"{Job Title}\""
   - **Icon**: 📨
   - **Link**: `/school/dashboard#applications`
   - **Metadata**: Includes `application_id`, `job_title`, and `teacher_name`

## Setup Instructions

1. **Run the database migration**:
   ```sql
   -- Run this in Supabase SQL Editor
   -- File: supabase-migrations/add_new_application_notification_type.sql
   ```

2. **Verify the notification type is added**:
   ```sql
   SELECT constraint_name, check_clause 
   FROM information_schema.check_constraints 
   WHERE constraint_name = 'in_app_notifications_type_check';
   ```

3. **Test the notification**:
   - Log in as a teacher
   - Apply to a job posted by a school
   - Log in as that school
   - Check the notification center (bell icon) - you should see the notification

## Notification Center

The notification center is already integrated into the `AuthenticatedLayout` component:
- Bell icon in the header shows unread count badge
- Clicking the bell opens the notification dropdown
- Notifications are grouped by read/unread status
- Real-time updates every 30 seconds
- Supabase real-time subscriptions for instant updates

## Troubleshooting

If notifications aren't appearing:

1. **Check database migration**: Ensure the `'new_application'` type is in the CHECK constraint
2. **Check notification creation**: Look for errors in browser console when application is submitted
3. **Verify school_id**: Ensure `job.school_id` matches the school's `user_id` in the `users` table
4. **Check RLS policies**: Ensure the school user can read their own notifications
5. **Check real-time subscriptions**: Verify Supabase real-time is enabled for the `in_app_notifications` table

## Future Enhancements

- Add email notifications for new applications (optional)
- Add push notifications for mobile apps
- Add notification preferences (email, in-app, etc.)
- Add notification grouping (multiple applications from same teacher)

