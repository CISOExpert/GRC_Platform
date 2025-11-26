-- Add RLS policies for saved_views table
-- This allows authenticated users to create and manage their own saved views

-- Enable RLS if not already enabled
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own saved views
CREATE POLICY "Users can read their own saved views"
  ON saved_views
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to create saved views
CREATE POLICY "Users can create saved views"
  ON saved_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own saved views
CREATE POLICY "Users can update their own saved views"
  ON saved_views
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own saved views
CREATE POLICY "Users can delete their own saved views"
  ON saved_views
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
