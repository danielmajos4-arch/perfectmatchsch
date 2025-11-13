-- Email Preferences Schema
-- Run this AFTER EMAIL_NOTIFICATIONS_SCHEMA.sql
-- This adds user email preferences and unsubscribe functionality

-- Create user_email_preferences table
CREATE TABLE IF NOT EXISTS public.user_email_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_notifications_enabled BOOLEAN DEFAULT true,
  new_candidate_match BOOLEAN DEFAULT true,
  new_job_match BOOLEAN DEFAULT true,
  application_status_update BOOLEAN DEFAULT true,
  digest_enabled BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'weekly' CHECK (digest_frequency IN ('daily', 'weekly', 'never')),
  digest_time TIME DEFAULT '09:00:00',
  digest_day INTEGER DEFAULT 1 CHECK (digest_day BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
  unsubscribe_token UUID DEFAULT uuid_generate_v4() UNIQUE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

-- Create index for unsubscribe token lookups
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_unsubscribe_token ON public.user_email_preferences(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_user_id ON public.user_email_preferences(user_id);

-- Enable RLS on user_email_preferences
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view and update their own preferences
CREATE POLICY "Users can view their own email preferences"
  ON public.user_email_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email preferences"
  ON public.user_email_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences"
  ON public.user_email_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to get or create user email preferences
CREATE OR REPLACE FUNCTION public.get_or_create_email_preferences(p_user_id UUID)
RETURNS public.user_email_preferences AS $$
DECLARE
  preferences_record public.user_email_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO preferences_record
  FROM public.user_email_preferences
  WHERE user_id = p_user_id;
  
  -- If not found, create default preferences
  IF NOT FOUND THEN
    INSERT INTO public.user_email_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO preferences_record;
  END IF;
  
  RETURN preferences_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user should receive email notification
CREATE OR REPLACE FUNCTION public.should_send_email_notification(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  preferences_record public.user_email_preferences;
BEGIN
  -- Get user preferences
  SELECT * INTO preferences_record
  FROM public.user_email_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, default to true (opt-in by default)
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Check if user has unsubscribed
  IF preferences_record.unsubscribed_at IS NOT NULL THEN
    RETURN false;
  END IF;
  
  -- Check if email notifications are disabled
  IF NOT preferences_record.email_notifications_enabled THEN
    RETURN false;
  END IF;
  
  -- Check specific notification type
  CASE p_notification_type
    WHEN 'new_candidate_match' THEN
      RETURN preferences_record.new_candidate_match;
    WHEN 'new_job_match' THEN
      RETURN preferences_record.new_job_match;
    WHEN 'application_status' THEN
      RETURN preferences_record.application_status_update;
    WHEN 'digest' THEN
      RETURN preferences_record.digest_enabled;
    ELSE
      RETURN true; -- Default to true for unknown types
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsubscribe user by token
CREATE OR REPLACE FUNCTION public.unsubscribe_by_token(p_token UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.user_email_preferences
  SET 
    email_notifications_enabled = false,
    new_candidate_match = false,
    new_job_match = false,
    application_status_update = false,
    digest_enabled = false,
    unsubscribed_at = NOW(),
    updated_at = NOW()
  WHERE unsubscribe_token = p_token
  AND unsubscribed_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resubscribe user
CREATE OR REPLACE FUNCTION public.resubscribe_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_email_preferences
  SET 
    email_notifications_enabled = true,
    new_candidate_match = true,
    new_job_match = true,
    application_status_update = true,
    digest_enabled = true,
    unsubscribed_at = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, create them
  IF NOT FOUND THEN
    INSERT INTO public.user_email_preferences (user_id)
    VALUES (p_user_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default email preferences when user is created
CREATE OR REPLACE FUNCTION public.create_default_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create preferences for new users
DROP TRIGGER IF EXISTS trigger_create_default_email_preferences ON public.users;
CREATE TRIGGER trigger_create_default_email_preferences
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_email_preferences();

-- Update email_notifications trigger to check preferences
-- We'll modify the notify functions to check preferences before creating notifications

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.user_email_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_email_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_send_email_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_by_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.resubscribe_user TO authenticated;

