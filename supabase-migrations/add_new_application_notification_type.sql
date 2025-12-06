-- Add 'new_application' notification type to in_app_notifications table
-- This allows schools to receive notifications when teachers apply for jobs

-- First, drop the existing CHECK constraint
ALTER TABLE public.in_app_notifications 
DROP CONSTRAINT IF EXISTS in_app_notifications_type_check;

-- Add the new CHECK constraint with 'new_application' type
ALTER TABLE public.in_app_notifications 
ADD CONSTRAINT in_app_notifications_type_check 
CHECK (type IN (
  'new_job_match',
  'new_candidate_match',
  'new_application',
  'application_status',
  'message',
  'profile_viewed',
  'achievement_unlocked',
  'job_posted',
  'candidate_contacted'
));

