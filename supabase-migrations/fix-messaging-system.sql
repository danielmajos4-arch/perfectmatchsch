-- Fix messaging system: conversations/messages tables + RLS policies
-- Run this script in the Supabase SQL editor (or via supabase cli).

-- 1. Ensure conversations table exists with required columns/indexes
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_teacher ON public.conversations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_conversations_school ON public.conversations(school_id);
CREATE INDEX IF NOT EXISTS idx_conversations_job ON public.conversations(job_id);

-- 2. Ensure messages table indexes exist
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- 3. Enable RLS (safe to rerun)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Reset conversation policies
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  teacher_id = auth.uid() OR
  school_id = auth.uid()
);

CREATE POLICY "Users can insert conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id = auth.uid() OR
  school_id = auth.uid()
);

CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  teacher_id = auth.uid() OR
  school_id = auth.uid()
);

-- 5. Reset message policies
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;

CREATE POLICY "Users can view their messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE teacher_id = auth.uid() OR school_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND conversation_id IN (
    SELECT id FROM public.conversations
    WHERE teacher_id = auth.uid() OR school_id = auth.uid()
  )
);

CREATE POLICY "Users can mark messages as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE teacher_id = auth.uid() OR school_id = auth.uid()
  )
);


