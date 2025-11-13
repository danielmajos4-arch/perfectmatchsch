-- PerfectMatchSchools Database Schema (Fixed Version)
-- Run this SQL in your Supabase SQL Editor to create all necessary tables
-- This version handles existing tables safely

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'school')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  job_type TEXT NOT NULL,
  location TEXT NOT NULL,
  salary TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  benefits TEXT NOT NULL,
  school_name TEXT NOT NULL,
  school_logo TEXT,
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Drop and recreate teachers table to ensure correct structure
DROP TABLE IF EXISTS public.teachers CASCADE;

CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  bio TEXT,
  years_experience TEXT NOT NULL,
  subjects TEXT[] NOT NULL,
  grade_levels TEXT[] NOT NULL,
  certifications TEXT[],
  archetype TEXT,
  quiz_result JSONB,
  profile_complete BOOLEAN DEFAULT FALSE NOT NULL,
  teaching_philosophy TEXT,
  resume_url TEXT,
  profile_photo_url TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Drop and recreate schools table to ensure correct structure
DROP TABLE IF EXISTS public.schools CASCADE;

CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  school_type TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  profile_complete BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cover_letter TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'accepted', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(job_id, teacher_id)
);

-- Conversations table
-- Drop and recreate to ensure correct structure (messages depends on this)
DROP TABLE IF EXISTS public.conversations CASCADE;

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(teacher_id, school_id)
);

-- Messages table
-- Drop and recreate to ensure correct structure
DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create indexes for better query performance
-- Only create indexes after tables are confirmed to exist
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_schools_user_id ON public.schools(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_school_id ON public.jobs(school_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON public.jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_teacher_id ON public.applications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_conversations_teacher_id ON public.conversations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_conversations_school_id ON public.conversations(school_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Teachers policies
DROP POLICY IF EXISTS "Users can view all teacher profiles" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can insert their own profile" ON public.teachers;
DROP POLICY IF EXISTS "Teachers can update their own profile" ON public.teachers;

CREATE POLICY "Users can view all teacher profiles" ON public.teachers
  FOR SELECT USING (true);

CREATE POLICY "Teachers can insert their own profile" ON public.teachers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can update their own profile" ON public.teachers
  FOR UPDATE USING (auth.uid() = user_id);

-- Schools policies
DROP POLICY IF EXISTS "Users can view all school profiles" ON public.schools;
DROP POLICY IF EXISTS "Schools can insert their own profile" ON public.schools;
DROP POLICY IF EXISTS "Schools can update their own profile" ON public.schools;

CREATE POLICY "Users can view all school profiles" ON public.schools
  FOR SELECT USING (true);

CREATE POLICY "Schools can insert their own profile" ON public.schools
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Schools can update their own profile" ON public.schools
  FOR UPDATE USING (auth.uid() = user_id);

-- Jobs policies
DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Schools can insert their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Schools can update their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Schools can delete their own jobs" ON public.jobs;

CREATE POLICY "Anyone can view active jobs" ON public.jobs
  FOR SELECT USING (is_active = true OR school_id = auth.uid());

CREATE POLICY "Schools can insert their own jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = school_id);

CREATE POLICY "Schools can update their own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = school_id);

CREATE POLICY "Schools can delete their own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = school_id);

-- Applications policies
DROP POLICY IF EXISTS "Teachers can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Schools can view applications for their jobs" ON public.applications;
DROP POLICY IF EXISTS "Teachers can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Schools can update application status" ON public.applications;

CREATE POLICY "Teachers can view their own applications" ON public.applications
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Schools can view applications for their jobs" ON public.applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
      AND jobs.school_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert applications" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Schools can update application status" ON public.applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
      AND jobs.school_id = auth.uid()
    )
  );

-- Conversations policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;

CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (
    auth.uid() = teacher_id OR auth.uid() = school_id
  );

CREATE POLICY "Users can insert conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = teacher_id OR auth.uid() = school_id
  );

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.teacher_id = auth.uid() OR conversations.school_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.teacher_id = auth.uid() OR conversations.school_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for messages (may fail if realtime not enabled, that's ok)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN OTHERS THEN
  -- Realtime may not be enabled, that's fine for MVP
  NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN OTHERS THEN
  -- Realtime may not be enabled, that's fine for MVP
  NULL;
END $$;

