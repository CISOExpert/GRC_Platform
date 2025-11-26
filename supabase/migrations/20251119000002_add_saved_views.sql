-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create saved_views table to store user view configurations
CREATE TABLE saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  view_name TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('scf', 'framework')),
  configuration JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_saved_views_user_org ON saved_views(user_id, organization_id);
CREATE INDEX idx_saved_views_user_default ON saved_views(user_id, is_default) WHERE is_default = true;

-- Add RLS policies (disabled for now as per existing setup)
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- Function to ensure only one default view per user per view_type
CREATE OR REPLACE FUNCTION ensure_single_default_view()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE saved_views 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND view_type = NEW.view_type 
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_view
  AFTER INSERT OR UPDATE OF is_default ON saved_views
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_view();

-- Add updated_at trigger
CREATE TRIGGER set_saved_views_updated_at
  BEFORE UPDATE ON saved_views
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
