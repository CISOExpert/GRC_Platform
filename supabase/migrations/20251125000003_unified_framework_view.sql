-- Migration: Unified Framework View Type
-- This consolidates 'scf' and 'framework' view types into a single 'framework-comparison' type
-- The display mode (compact vs expanded) is now stored in the configuration JSON

-- Update the check constraint to allow the new unified view type
ALTER TABLE saved_views 
  DROP CONSTRAINT IF EXISTS saved_views_view_type_check;

ALTER TABLE saved_views
  ADD CONSTRAINT saved_views_view_type_check 
  CHECK (view_type IN ('scf', 'framework', 'framework-comparison'));

-- Migrate existing views to new structure (optional - allows backwards compatibility)
-- Existing 'scf' and 'framework' views will continue to work
-- New views will use 'framework-comparison'

COMMENT ON COLUMN saved_views.view_type IS 'View type: legacy values (scf, framework) supported for backwards compatibility, new views use framework-comparison';
COMMENT ON COLUMN saved_views.configuration IS 'View configuration JSON. New schema: {primaryFramework, displayMode, compareToFramework, additionalFrameworks, searchQuery, showFilterPanel, filterPanelWidth}. Legacy schema: {viewMode, selectedFramework, compareToFramework, selectedFrameworks, ...} still supported.';
