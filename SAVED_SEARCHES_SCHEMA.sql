/**
 * Saved Searches Schema
 * 
 * Allows users to save their job search criteria and get notified of new matches
 */

-- Saved Searches Table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  search_query TEXT,
  filters JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  notify_on_match BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON public.saved_searches(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_saved_searches_notify ON public.saved_searches(user_id, notify_on_match) WHERE notify_on_match = true;

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can view their own saved searches"
  ON public.saved_searches
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can create their own saved searches"
  ON public.saved_searches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can update their own saved searches"
  ON public.saved_searches
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can delete their own saved searches"
  ON public.saved_searches
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_saved_search_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_saved_search_updated_at ON public.saved_searches;
CREATE TRIGGER trigger_update_saved_search_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_saved_search_updated_at();

-- Function to check for new matches in saved searches
CREATE OR REPLACE FUNCTION public.check_saved_search_matches(search_id UUID)
RETURNS INTEGER AS $$
DECLARE
  search_record RECORD;
  match_count INTEGER := 0;
  filters_json JSONB;
  search_query_text TEXT;
BEGIN
  -- Get the saved search
  SELECT * INTO search_record
  FROM public.saved_searches
  WHERE id = search_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  filters_json := search_record.filters;
  search_query_text := search_record.search_query;
  
  -- This is a simplified version - in production, you'd want more sophisticated matching
  -- For now, we'll just update the last_checked_at timestamp
  -- The actual matching logic would be implemented in the application layer
  
  UPDATE public.saved_searches
  SET last_checked_at = NOW()
  WHERE id = search_id;
  
  RETURN match_count;
END;
$$ LANGUAGE plpgsql;

-- Search History Table (for recent searches)
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  search_query TEXT,
  filters JSONB DEFAULT '{}'::jsonb,
  result_count INTEGER DEFAULT 0,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for search history
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON public.search_history(user_id, searched_at DESC);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search history
DROP POLICY IF EXISTS "Users can view their own search history" ON public.search_history;
CREATE POLICY "Users can view their own search history"
  ON public.search_history
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own search history" ON public.search_history;
CREATE POLICY "Users can create their own search history"
  ON public.search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own search history" ON public.search_history;
CREATE POLICY "Users can delete their own search history"
  ON public.search_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to clean up old search history (keep last 50 per user)
CREATE OR REPLACE FUNCTION public.cleanup_old_search_history()
RETURNS void AS $$
BEGIN
  DELETE FROM public.search_history
  WHERE id NOT IN (
    SELECT id
    FROM public.search_history
    WHERE user_id = search_history.user_id
    ORDER BY searched_at DESC
    LIMIT 50
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.saved_searches IS 'Stores user saved job searches with filters and notification preferences';
COMMENT ON TABLE public.search_history IS 'Stores recent search history for quick access';

