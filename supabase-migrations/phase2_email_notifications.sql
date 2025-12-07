-- Phase 2: Email Notifications & Public Teacher Profiles
-- Database Schema Updates

-- ============================================
-- 1. Create notification preferences table
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_application_updates BOOLEAN DEFAULT true,
  email_new_matches BOOLEAN DEFAULT true,
  email_messages BOOLEAN DEFAULT true,
  email_profile_views BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  email_weekly_digest BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users manage their notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage their notification preferences"
ON public.notification_preferences FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Auto-create preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_notifications()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_notification_preferences ON auth.users;
CREATE TRIGGER create_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_notifications();

-- ============================================
-- 2. Create email queue table (for reliability)
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_template_name ON public.email_queue(template_name);

-- Enable RLS (system only - no user access)
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy: System manages email queue (no user access)
DROP POLICY IF EXISTS "System manages email queue" ON public.email_queue;
CREATE POLICY "System manages email queue"
ON public.email_queue FOR ALL
TO authenticated
USING (false);

-- ============================================
-- 3. Helper function to check notification preferences
-- ============================================

CREATE OR REPLACE FUNCTION public.should_send_email_notification(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
BEGIN
  -- Get user's notification preferences
  SELECT * INTO v_prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences exist, default to true (opt-in by default)
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Check preference based on notification type
  CASE p_notification_type
    WHEN 'application_status_changed' THEN
      RETURN COALESCE(v_prefs.email_application_updates, true);
    WHEN 'new_matching_job' THEN
      RETURN COALESCE(v_prefs.email_new_matches, true);
    WHEN 'new_message' THEN
      RETURN COALESCE(v_prefs.email_messages, true);
    WHEN 'profile_viewed' THEN
      RETURN COALESCE(v_prefs.email_profile_views, true);
    WHEN 'weekly_digest' THEN
      RETURN COALESCE(v_prefs.email_weekly_digest, true);
    ELSE
      -- For unknown types, default to true
      RETURN true;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Function to queue email
-- ============================================

CREATE OR REPLACE FUNCTION public.queue_email(
  p_recipient_email TEXT,
  p_recipient_name TEXT,
  p_subject TEXT,
  p_template_name TEXT,
  p_template_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_email_id UUID;
BEGIN
  INSERT INTO public.email_queue (
    recipient_email,
    recipient_name,
    subject,
    template_name,
    template_data,
    status
  )
  VALUES (
    p_recipient_email,
    p_recipient_name,
    p_subject,
    p_template_name,
    p_template_data,
    'pending'
  )
  RETURNING id INTO v_email_id;

  RETURN v_email_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.should_send_email_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_email TO authenticated;
