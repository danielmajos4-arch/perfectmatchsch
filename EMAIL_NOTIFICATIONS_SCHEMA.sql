-- Email Notifications Schema and Triggers
-- 
-- ⚠️ EXECUTION ORDER REQUIRED:
-- 1. supabase-schema-fixed.sql (base tables)
-- 2. sprint6-matching-schema.sql (job_candidates, teacher_job_matches tables) ← REQUIRED
-- 3. EMAIL_PREFERENCES_SCHEMA.sql (user_email_preferences table) ← REQUIRED
-- 4. THIS FILE (EMAIL_NOTIFICATIONS_SCHEMA.sql)
--
-- This adds email notification queue and triggers for match notifications
-- 
-- If you get "relation does not exist" errors, run the dependencies above first!

-- Create email_notifications queue table
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('new_candidate_match', 'new_job_match', 'application_status', 'digest')),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for email queue
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON public.email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON public.email_notifications(type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_scheduled_at ON public.email_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient_email ON public.email_notifications(recipient_email);

-- Enable RLS on email_notifications
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view all notifications
-- Users can only view their own notifications (if we add user_id later)
CREATE POLICY "Admins can view all email notifications"
  ON public.email_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to notify school when new candidates are matched to a job
CREATE OR REPLACE FUNCTION public.notify_school_new_candidates()
RETURNS TRIGGER AS $$
DECLARE
  school_record RECORD;
  job_record RECORD;
  candidate_count INTEGER;
  existing_notification_id UUID;
  should_send BOOLEAN;
BEGIN
  -- Only process if this is a new candidate (INSERT, not UPDATE)
  IF TG_OP = 'INSERT' THEN
    -- Get job and school information
    SELECT 
      j.id,
      j.title,
      j.school_id,
      s.name as school_name,
      s.email as school_email,
      u.name as school_contact_name,
      u.id as school_user_id
    INTO job_record
    FROM public.jobs j
    JOIN public.schools s ON s.id = j.school_id
    JOIN public.users u ON u.id = s.user_id
    WHERE j.id = NEW.job_id;
    
    -- Check if school should receive this notification
    SELECT public.should_send_email_notification(
      job_record.school_user_id,
      'new_candidate_match'
    ) INTO should_send;
    
    -- Skip if user has disabled this notification type
    IF NOT should_send THEN
      RETURN NEW;
    END IF;
    
    -- Count new candidates for this job (created in last hour to batch notifications)
    SELECT COUNT(*) INTO candidate_count
    FROM public.job_candidates
    WHERE job_id = NEW.job_id
    AND status = 'new'
    AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Check if we already have a pending notification for this job in the last hour
    SELECT id INTO existing_notification_id
    FROM public.email_notifications
    WHERE type = 'new_candidate_match'
    AND status = 'pending'
    AND template_data->>'job_id' = job_record.id::text
    AND created_at > NOW() - INTERVAL '1 hour'
    LIMIT 1;
    
    -- If no existing notification and we have candidates, create one
    IF existing_notification_id IS NULL AND candidate_count > 0 AND job_record.school_email IS NOT NULL THEN
      INSERT INTO public.email_notifications (
        type,
        recipient_email,
        recipient_name,
        subject,
        template_data,
        scheduled_at
      ) VALUES (
        'new_candidate_match',
        job_record.school_email,
        COALESCE(job_record.school_contact_name, job_record.school_name),
        candidate_count || ' New Candidate' || CASE WHEN candidate_count > 1 THEN 's' ELSE '' END || ' Matched to Your Job',
        jsonb_build_object(
          'job_id', job_record.id,
          'job_title', job_record.title,
          'candidate_count', candidate_count,
          'school_name', job_record.school_name
        ),
        NOW() -- Send immediately
      );
    ELSIF existing_notification_id IS NOT NULL THEN
      -- Update existing notification with new count
      UPDATE public.email_notifications
      SET 
        template_data = jsonb_set(
          template_data,
          '{candidate_count}',
          to_jsonb(candidate_count)
        ),
        subject = candidate_count || ' New Candidate' || CASE WHEN candidate_count > 1 THEN 's' ELSE '' END || ' Matched to Your Job',
        updated_at = NOW()
      WHERE id = existing_notification_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify school when new candidates are added
DROP TRIGGER IF EXISTS trigger_notify_school_new_candidates ON public.job_candidates;
CREATE TRIGGER trigger_notify_school_new_candidates
  AFTER INSERT ON public.job_candidates
  FOR EACH ROW
  WHEN (NEW.status = 'new')
  EXECUTE FUNCTION public.notify_school_new_candidates();

-- Function to notify teacher when new jobs match their profile
CREATE OR REPLACE FUNCTION public.notify_teacher_new_jobs()
RETURNS TRIGGER AS $$
DECLARE
  teacher_record RECORD;
  job_record RECORD;
  match_count INTEGER;
  existing_notification_id UUID;
  should_send BOOLEAN;
BEGIN
  -- Only process if this is a new match (INSERT, not UPDATE)
  IF TG_OP = 'INSERT' THEN
    -- Get teacher information
    SELECT 
      t.user_id,
      u.email as teacher_email,
      u.name as teacher_name
    INTO teacher_record
    FROM public.teachers t
    JOIN public.users u ON u.id = t.user_id
    WHERE t.user_id = NEW.teacher_id;
    
    -- Check if teacher should receive this notification
    SELECT public.should_send_email_notification(
      teacher_record.user_id,
      'new_job_match'
    ) INTO should_send;
    
    -- Skip if user has disabled this notification type
    IF NOT should_send THEN
      RETURN NEW;
    END IF;
    
    -- Get job information
    SELECT 
      j.id,
      j.title,
      j.school_name,
      j.location
    INTO job_record
    FROM public.jobs j
    WHERE j.id = NEW.job_id;
    
    -- Count new matches for this teacher (created in last 24 hours for daily digest)
    SELECT COUNT(*) INTO match_count
    FROM public.teacher_job_matches
    WHERE teacher_id = NEW.teacher_id
    AND created_at > NOW() - INTERVAL '24 hours';
    
    -- Check if we already have a pending notification for this teacher in the last hour
    SELECT id INTO existing_notification_id
    FROM public.email_notifications
    WHERE type = 'new_job_match'
    AND status = 'pending'
    AND recipient_email = teacher_record.teacher_email
    AND created_at > NOW() - INTERVAL '1 hour'
    LIMIT 1;
    
    -- If no existing notification and we have matches, create one
    -- Note: For job matches, we'll batch them into daily digests
    -- So we only create a notification if it's been 24 hours since last digest
    IF existing_notification_id IS NULL 
       AND match_count > 0 
       AND teacher_record.teacher_email IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.email_notifications
         WHERE type = 'new_job_match'
         AND recipient_email = teacher_record.teacher_email
         AND status IN ('pending', 'sent')
         AND created_at > NOW() - INTERVAL '24 hours'
       ) THEN
      -- This will be processed as a digest with all matches
      -- The actual email sending will aggregate all matches
      INSERT INTO public.email_notifications (
        type,
        recipient_email,
        recipient_name,
        subject,
        template_data,
        scheduled_at
      ) VALUES (
        'new_job_match',
        teacher_record.teacher_email,
        teacher_record.teacher_name,
        match_count || ' New Job Match' || CASE WHEN match_count > 1 THEN 'es' ELSE '' END || ' for You',
        jsonb_build_object(
          'teacher_id', teacher_record.user_id,
          'match_count', match_count
        ),
        -- Schedule for next digest time (e.g., 9 AM daily)
        DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '9 hours'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify teacher when new jobs match
DROP TRIGGER IF EXISTS trigger_notify_teacher_new_jobs ON public.teacher_job_matches;
CREATE TRIGGER trigger_notify_teacher_new_jobs
  AFTER INSERT ON public.teacher_job_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_teacher_new_jobs();

-- Function to update notification status
CREATE OR REPLACE FUNCTION public.update_email_notification_status(
  notification_id UUID,
  new_status TEXT,
  error_msg TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.email_notifications
  SET 
    status = new_status,
    error_message = error_msg,
    sent_at = CASE WHEN new_status = 'sent' THEN NOW() ELSE sent_at END,
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending notifications (for processing)
CREATE OR REPLACE FUNCTION public.get_pending_email_notifications(
  batch_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  subject TEXT,
  template_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    en.id,
    en.type,
    en.recipient_email,
    en.recipient_name,
    en.subject,
    en.template_data
  FROM public.email_notifications en
  WHERE en.status = 'pending'
  AND en.scheduled_at <= NOW()
  AND en.attempts < en.max_attempts
  ORDER BY en.created_at ASC
  LIMIT batch_size
  FOR UPDATE SKIP LOCKED; -- Prevent concurrent processing
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.email_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_email_notification_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_email_notifications TO authenticated;

-- Create a view for email notification stats (for admin dashboard)
CREATE OR REPLACE VIEW public.email_notification_stats AS
SELECT 
  type,
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d
FROM public.email_notifications
GROUP BY type, status;

