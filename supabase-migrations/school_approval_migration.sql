-- School Approval System Migration
-- This migration adds approval workflow columns to the schools table
-- Run this in Supabase SQL Editor

-- Add approval status columns to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Create index for querying pending schools efficiently
CREATE INDEX IF NOT EXISTS idx_schools_approval_status ON schools(approval_status);

-- Add check constraint to ensure valid approval status values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'schools_approval_status_check'
  ) THEN
    ALTER TABLE schools 
    ADD CONSTRAINT schools_approval_status_check 
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Auto-approve schools with .edu domains
-- This updates existing schools that have educational email domains
UPDATE schools 
SET approval_status = 'approved', 
    approved_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%.edu' 
     OR email LIKE '%.edu.ng'
     OR email LIKE '%.ac.uk'
     OR email LIKE '%.edu.au'
     OR email LIKE '%.ac.za'
     OR email LIKE '%.edu.pk'
     OR email LIKE '%.ac.in'
)
AND approval_status = 'pending';

-- Log the migration
DO $$ 
BEGIN
  RAISE NOTICE 'School approval columns added successfully';
  RAISE NOTICE 'Check constraint created for approval_status';
  RAISE NOTICE 'Index created on approval_status';
  RAISE NOTICE 'Existing .edu schools auto-approved';
END $$;
