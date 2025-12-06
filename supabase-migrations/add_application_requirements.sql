-- Add Application Requirements and Desired Salary
-- This migration adds support for configurable application requirements per job
-- and allows teachers to specify their desired salary when applying

-- Add application_requirements JSONB column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS application_requirements JSONB DEFAULT '{"resume": true, "cover_letter": false, "desired_salary": false, "linkedin_url": false, "date_available": false, "website_portfolio": false}'::jsonb;

-- Add desired_salary TEXT column to applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS desired_salary TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.application_requirements IS 'JSONB object defining which application fields are required/optional. Keys: resume (always true), cover_letter, desired_salary, linkedin_url, date_available, website_portfolio. Values: true (required) or false (optional).';
COMMENT ON COLUMN public.applications.desired_salary IS 'Teacher''s desired salary as specified in their application';

