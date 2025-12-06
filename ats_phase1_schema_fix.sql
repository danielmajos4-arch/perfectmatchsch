-- ATS Phase 1: Core Tables (Fix)
-- Run this in Supabase SQL Editor

-- 1. Pipeline Stages
-- Drop existing table to ensure clean state (since we are introducing this feature)
DROP TABLE IF EXISTS pipeline_stages CASCADE;

CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE, -- If null, applies to whole school default
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'custom')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Policies for pipeline_stages
CREATE POLICY "Schools can view their own stages" ON pipeline_stages
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM schools WHERE id = pipeline_stages.school_id
  ));

CREATE POLICY "Schools can insert their own stages" ON pipeline_stages
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM schools WHERE id = pipeline_stages.school_id
  ));

CREATE POLICY "Schools can update their own stages" ON pipeline_stages
  FOR UPDATE USING (auth.uid() IN (
    SELECT user_id FROM schools WHERE id = pipeline_stages.school_id
  ));

CREATE POLICY "Schools can delete their own stages" ON pipeline_stages
  FOR DELETE USING (auth.uid() IN (
    SELECT user_id FROM schools WHERE id = pipeline_stages.school_id
  ));

-- 2. Hiring Team Members
DROP TABLE IF EXISTS hiring_team_members CASCADE;

CREATE TABLE hiring_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('hiring_manager', 'reviewer', 'observer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);

-- Enable RLS
ALTER TABLE hiring_team_members ENABLE ROW LEVEL SECURITY;

-- Policies for hiring_team_members
CREATE POLICY "School admins can view team members" ON hiring_team_members
  FOR SELECT USING (auth.uid() IN (
    SELECT school_id FROM jobs WHERE id = hiring_team_members.job_id
  ));

CREATE POLICY "Team members can view themselves" ON hiring_team_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "School admins can manage team members" ON hiring_team_members
  FOR ALL USING (auth.uid() IN (
    SELECT school_id FROM jobs WHERE id = hiring_team_members.job_id
  ));

-- 3. Application Comments
DROP TABLE IF EXISTS application_comments CASCADE;

CREATE TABLE application_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility TEXT DEFAULT 'team' CHECK (visibility IN ('team', 'private', 'admin_only')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE application_comments ENABLE ROW LEVEL SECURITY;

-- Policies for application_comments
CREATE POLICY "Team members can view comments" ON application_comments
  FOR SELECT USING (
    -- User is the author
    auth.uid() = user_id OR
    -- User is part of the hiring team (and visibility allows)
    (
      EXISTS (
        SELECT 1 FROM hiring_team_members htm
        JOIN applications a ON a.job_id = htm.job_id
        WHERE a.id = application_comments.application_id
        AND htm.user_id = auth.uid()
      )
      AND
      (
        visibility = 'team' OR
        (visibility = 'admin_only' AND EXISTS (
          SELECT 1 FROM hiring_team_members htm
          JOIN applications a ON a.job_id = htm.job_id
          WHERE a.id = application_comments.application_id
          AND htm.user_id = auth.uid()
          AND htm.role = 'hiring_manager'
        ))
      )
    ) OR
    -- User is the school admin (owner of the job)
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN applications a ON a.job_id = j.id
      WHERE a.id = application_comments.application_id
      AND j.school_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert comments" ON application_comments
  FOR INSERT WITH CHECK (
    -- User is part of the hiring team OR school admin
    EXISTS (
      SELECT 1 FROM hiring_team_members htm
      JOIN applications a ON a.job_id = htm.job_id
      WHERE a.id = application_comments.application_id
      AND htm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN applications a ON a.job_id = j.id
      WHERE a.id = application_comments.application_id
      AND j.school_id = auth.uid()
    )
  );

-- 4. Application Ratings
DROP TABLE IF EXISTS application_ratings CASCADE;

CREATE TABLE application_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('skills', 'culture', 'overall')),
  score INTEGER CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE application_ratings ENABLE ROW LEVEL SECURITY;

-- Policies for application_ratings
CREATE POLICY "Team members can view ratings" ON application_ratings
  FOR SELECT USING (
    -- Similar logic to comments
    EXISTS (
      SELECT 1 FROM hiring_team_members htm
      JOIN applications a ON a.job_id = htm.job_id
      WHERE a.id = application_ratings.application_id
      AND htm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN applications a ON a.job_id = j.id
      WHERE a.id = application_ratings.application_id
      AND j.school_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert ratings" ON application_ratings
  FOR INSERT WITH CHECK (
    -- Similar logic to comments
    EXISTS (
      SELECT 1 FROM hiring_team_members htm
      JOIN applications a ON a.job_id = htm.job_id
      WHERE a.id = application_ratings.application_id
      AND htm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN applications a ON a.job_id = j.id
      WHERE a.id = application_ratings.application_id
      AND j.school_id = auth.uid()
    )
  );

-- 5. Offers
DROP TABLE IF EXISTS offers CASCADE;

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'approval_pending', 'extended', 'accepted', 'declined')),
  salary_amount DECIMAL,
  start_date DATE,
  offer_letter_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Policies for offers
CREATE POLICY "School admins can manage offers" ON offers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN applications a ON a.job_id = j.id
      WHERE a.id = offers.application_id
      AND j.school_id = auth.uid()
    )
  );
