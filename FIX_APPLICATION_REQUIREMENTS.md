# Fix: Application Requirements Column Missing

## Problem
When posting a job as a school, you get this error:
```
Database schema error: Could not find the 'application_requirements' column of 'jobs' in the schema cache.
```

## Solution
Run the migration SQL in your Supabase dashboard to add the missing column.

## Steps to Fix

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: potoqeqztxztlnbdkdaf
3. **Open SQL Editor** (left sidebar)
4. **Copy the entire contents of**: `supabase-migrations/add_application_requirements.sql`
5. **Paste into SQL Editor and click "Run"**

The migration will:
- Add `application_requirements` JSONB column to `jobs` table
- Add `desired_salary` TEXT column to `applications` table
- Set default values for application requirements

## After Running the Migration

1. Refresh your browser
2. Try posting a job again
3. The error should be resolved

## Migration SQL (for reference)

```sql
-- Add Application Requirements and Desired Salary
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS application_requirements JSONB DEFAULT '{"resume": true, "cover_letter": false, "desired_salary": false, "linkedin_url": false, "date_available": false, "website_portfolio": false}'::jsonb;

ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS desired_salary TEXT;

COMMENT ON COLUMN public.jobs.application_requirements IS 'JSONB object defining which application fields are required/optional. Keys: resume (always true), cover_letter, desired_salary, linkedin_url, date_available, website_portfolio. Values: true (required) or false (optional).';
COMMENT ON COLUMN public.applications.desired_salary IS 'Teacher''s desired salary as specified in their application';
```

