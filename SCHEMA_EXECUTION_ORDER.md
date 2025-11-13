# Database Schema Execution Order

## ⚠️ IMPORTANT: Execute schemas in this exact order!

The schemas have dependencies and must be run in the correct sequence.

---

## Execution Order

### 1. **supabase-schema-fixed.sql** (Base Schema)
**Run First** - Creates core tables and structure
- Creates: `users`, `teachers`, `schools`, `jobs`, `applications`, etc.
- Sets up: RLS policies, triggers, functions
- **Status**: ✅ Base foundation

### 2. **sprint6-matching-schema.sql** (Matching System)
**Run Second** - Adds matching functionality
- Creates: `job_candidates`, `teacher_job_matches` tables
- Adds: `archetype_tags` columns to `jobs` and `teachers`
- Creates: Matching functions and triggers
- **Dependencies**: Requires `supabase-schema-fixed.sql`
- **Status**: ⚠️ **REQUIRED** for email notifications

### 3. **EMAIL_PREFERENCES_SCHEMA.sql** (Email Preferences)
**Run Third** - Adds email preference management
- Creates: `user_email_preferences` table
- Creates: Preference management functions
- **Dependencies**: Requires `supabase-schema-fixed.sql` (users table)
- **Status**: Optional but recommended

### 4. **EMAIL_NOTIFICATIONS_SCHEMA.sql** (Email Notifications)
**Run Fourth** - Adds email notification system
- Creates: `email_notifications` queue table
- Creates: Notification triggers
- **Dependencies**: 
  - Requires `supabase-schema-fixed.sql` (users, jobs, schools, teachers)
  - Requires `sprint6-matching-schema.sql` (job_candidates, teacher_job_matches)
  - Requires `EMAIL_PREFERENCES_SCHEMA.sql` (user_email_preferences)
- **Status**: ⚠️ **WILL FAIL** if dependencies not met

---

## Quick Setup Commands

### Option 1: Run Individually in Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Run each file in order:
   ```sql
   -- 1. Base schema
   -- Copy/paste: supabase-schema-fixed.sql
   -- Click "Run"
   
   -- 2. Matching schema
   -- Copy/paste: sprint6-matching-schema.sql
   -- Click "Run"
   
   -- 3. Email preferences
   -- Copy/paste: EMAIL_PREFERENCES_SCHEMA.sql
   -- Click "Run"
   
   -- 4. Email notifications
   -- Copy/paste: EMAIL_NOTIFICATIONS_SCHEMA.sql
   -- Click "Run"
   ```

### Option 2: Combined Script (Recommended)

See `COMPLETE_SCHEMA_SETUP.sql` (if created) for a single file with all schemas in order.

---

## Verification Checklist

After running all schemas, verify these tables exist:

### Base Tables (from supabase-schema-fixed.sql)
- [ ] `users`
- [ ] `teachers`
- [ ] `schools`
- [ ] `jobs`
- [ ] `applications`

### Matching Tables (from sprint6-matching-schema.sql)
- [ ] `job_candidates` ⚠️ **REQUIRED for email notifications**
- [ ] `teacher_job_matches` ⚠️ **REQUIRED for email notifications**
- [ ] `jobs.archetype_tags` column exists
- [ ] `teachers.archetype_tags` column exists

### Email Tables (from EMAIL_*_SCHEMA.sql)
- [ ] `user_email_preferences`
- [ ] `email_notifications`

### Functions (verify in Database → Functions)
- [ ] `handle_new_user()`
- [ ] `calculate_match_score()`
- [ ] `auto_populate_job_candidates()`
- [ ] `auto_populate_teacher_matches()`
- [ ] `get_or_create_email_preferences()`
- [ ] `should_send_email_notification()`
- [ ] `notify_school_new_candidates()`
- [ ] `notify_teacher_new_jobs()`

---

## Common Errors & Solutions

### Error: `relation "public.job_candidates" does not exist`
**Cause**: `sprint6-matching-schema.sql` not run yet
**Solution**: Run `sprint6-matching-schema.sql` before `EMAIL_NOTIFICATIONS_SCHEMA.sql`

### Error: `relation "public.user_email_preferences" does not exist`
**Cause**: `EMAIL_PREFERENCES_SCHEMA.sql` not run yet
**Solution**: Run `EMAIL_PREFERENCES_SCHEMA.sql` before `EMAIL_NOTIFICATIONS_SCHEMA.sql`

### Error: `column "archetype_tags" does not exist`
**Cause**: `sprint6-matching-schema.sql` not run yet
**Solution**: Run `sprint6-matching-schema.sql` to add the column

### Error: `function "should_send_email_notification" does not exist`
**Cause**: `EMAIL_PREFERENCES_SCHEMA.sql` not run yet
**Solution**: Run `EMAIL_PREFERENCES_SCHEMA.sql` before `EMAIL_NOTIFICATIONS_SCHEMA.sql`

---

## Current Status

Based on your error, you need to run:
1. ✅ `supabase-schema-fixed.sql` (probably already done)
2. ❌ `sprint6-matching-schema.sql` ← **RUN THIS NEXT**
3. ❌ `EMAIL_PREFERENCES_SCHEMA.sql` ← **THEN THIS**
4. ❌ `EMAIL_NOTIFICATIONS_SCHEMA.sql` ← **FINALLY THIS**

---

## Need Help?

If you encounter errors:
1. Check the error message for the missing table/function
2. Verify the table exists in Supabase Table Editor
3. Check the execution order above
4. Run missing schemas in order

