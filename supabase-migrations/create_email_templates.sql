-- Email Templates Table
-- Allows schools to create, save, and reuse email templates for communicating with applicants

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(50), -- 'rejection', 'interview', 'offer', 'general', 'request_info'
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_templates_school ON email_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Schools can view their own templates"
  ON email_templates FOR SELECT
  USING (school_id = auth.uid());

CREATE POLICY "Schools can create their own templates"
  ON email_templates FOR INSERT
  WITH CHECK (school_id = auth.uid());

CREATE POLICY "Schools can update their own templates"
  ON email_templates FOR UPDATE
  USING (school_id = auth.uid());

CREATE POLICY "Schools can delete their own templates"
  ON email_templates FOR DELETE
  USING (school_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();
