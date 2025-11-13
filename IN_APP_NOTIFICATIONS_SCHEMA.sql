-- In-App Notifications Schema
-- Run this AFTER supabase-schema-fixed.sql
-- This adds in-app notification system

-- Create in_app_notifications table
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_job_match',
    'new_candidate_match',
    'application_status',
    'message',
    'profile_viewed',
    'achievement_unlocked',
    'job_posted',
    'candidate_contacted'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT, -- URL to navigate when clicked
  link_text TEXT, -- Text for the link button
  icon TEXT, -- Icon name or emoji
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb -- Additional data (job_id, application_id, etc.)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON public.in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_is_read ON public.in_app_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created_at ON public.in_app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_type ON public.in_app_notifications(type);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread ON public.in_app_notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS on in_app_notifications
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.in_app_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
  ON public.in_app_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: System can insert notifications (via service role or function)
-- Note: In production, use service role or database functions for inserts
CREATE POLICY "System can insert notifications"
  ON public.in_app_notifications
  FOR INSERT
  WITH CHECK (true); -- Will be restricted by service role in production

-- Drop existing functions if they exist (to avoid conflicts)
-- Note: If you get "function name is not unique" errors, there may be overloaded versions
-- This will drop the specific signatures we need
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Drop all overloads of create_notification
  FOR func_record IN 
    SELECT oid::regprocedure as func_name
    FROM pg_proc
    WHERE proname = 'create_notification'
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_name || ' CASCADE';
  END LOOP;
  
  -- Drop all overloads of mark_notification_read
  FOR func_record IN 
    SELECT oid::regprocedure as func_name
    FROM pg_proc
    WHERE proname = 'mark_notification_read'
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_name || ' CASCADE';
  END LOOP;
  
  -- Drop all overloads of mark_all_notifications_read
  FOR func_record IN 
    SELECT oid::regprocedure as func_name
    FROM pg_proc
    WHERE proname = 'mark_all_notifications_read'
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_name || ' CASCADE';
  END LOOP;
  
  -- Drop all overloads of get_unread_notification_count
  FOR func_record IN 
    SELECT oid::regprocedure as func_name
    FROM pg_proc
    WHERE proname = 'get_unread_notification_count'
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_name || ' CASCADE';
  END LOOP;
  
  -- Drop all overloads of cleanup_old_notifications
  FOR func_record IN 
    SELECT oid::regprocedure as func_name
    FROM pg_proc
    WHERE proname = 'cleanup_old_notifications'
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_name || ' CASCADE';
  END LOOP;
END $$;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT DEFAULT NULL,
  p_link_text TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.in_app_notifications (
    user_id,
    type,
    title,
    message,
    link_url,
    link_text,
    icon,
    metadata
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link_url,
    p_link_text,
    p_icon,
    p_metadata
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.in_app_notifications
  SET 
    is_read = true,
    read_at = NOW()
  WHERE id = p_notification_id
  AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.in_app_notifications
  SET 
    is_read = true,
    read_at = NOW()
  WHERE user_id = p_user_id
  AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM public.in_app_notifications
  WHERE user_id = p_user_id
  AND is_read = false;
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete old read notifications (cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(
  p_days_old INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.in_app_notifications
  WHERE is_read = true
  AND read_at < NOW() - (p_days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.in_app_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;

-- Create view for easy querying
CREATE OR REPLACE VIEW public.user_notifications_view AS
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.title,
  n.message,
  n.link_url,
  n.link_text,
  n.icon,
  n.is_read,
  n.read_at,
  n.created_at,
  n.metadata
FROM public.in_app_notifications n
ORDER BY n.created_at DESC;

