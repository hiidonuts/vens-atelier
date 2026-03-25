-- Create visitor_stats table for tracking unique visitors
CREATE TABLE IF NOT EXISTS visitor_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  count INTEGER DEFAULT 0 NOT NULL,
  unique_sessions TEXT[] DEFAULT '{}' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_visitor_stats_id ON visitor_stats(id);

-- Set up RLS (Row Level Security) - disable for API access
ALTER TABLE visitor_stats DISABLE ROW LEVEL SECURITY;

-- Insert initial record if table is empty
INSERT INTO visitor_stats (count, unique_sessions)
SELECT 0, '{}'::TEXT[]
WHERE NOT EXISTS (SELECT 1 FROM visitor_stats);

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_visitor_stats_updated_at 
    BEFORE UPDATE ON visitor_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
