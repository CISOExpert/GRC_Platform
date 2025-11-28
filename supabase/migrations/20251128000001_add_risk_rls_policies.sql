-- Add RLS policies for risks and risk_controls tables
-- These are needed for the framework-info page risk statistics

-- Enable RLS on risk_controls if not already enabled
ALTER TABLE risk_controls ENABLE ROW LEVEL SECURITY;

-- Risk Controls - Allow all authenticated users to read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'risk_controls'
    AND policyname = 'Allow authenticated users to read risk_controls'
  ) THEN
    CREATE POLICY "Allow authenticated users to read risk_controls"
      ON risk_controls
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Also allow anon to read risk_controls for public framework info pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'risk_controls'
    AND policyname = 'Allow anon to read risk_controls'
  ) THEN
    CREATE POLICY "Allow anon to read risk_controls"
      ON risk_controls
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Allow anon to read risks for public framework info pages
-- This enables risk statistics on the framework-info page without login
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'risks'
    AND policyname = 'Allow anon to read risks'
  ) THEN
    CREATE POLICY "Allow anon to read risks"
      ON risks
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Add comment explaining the policy
COMMENT ON POLICY "Allow anon to read risks" ON risks IS
'Allows public read access to risks for framework-info page statistics. Risk data is aggregated and not sensitive.';

COMMENT ON POLICY "Allow anon to read risk_controls" ON risk_controls IS
'Allows public read access to risk_controls linking table for framework-info page statistics.';
