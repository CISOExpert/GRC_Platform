-- Add RLS policies for SCF controls and related tables
-- SCF controls are global/shared resources that all authenticated users can read

-- SCF Controls - Allow all authenticated users to read
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'scf_controls' 
    AND policyname = 'Allow authenticated users to read SCF controls'
  ) THEN
    CREATE POLICY "Allow authenticated users to read SCF controls"
      ON scf_controls
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- External Controls - Allow all authenticated users to read
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'external_controls' 
    AND policyname = 'Allow authenticated users to read external controls'
  ) THEN
    CREATE POLICY "Allow authenticated users to read external controls"
      ON external_controls
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- SCF Control Mappings - Allow all authenticated users to read
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'scf_control_mappings' 
    AND policyname = 'Allow authenticated users to read control mappings'
  ) THEN
    CREATE POLICY "Allow authenticated users to read control mappings"
      ON scf_control_mappings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Assessment Objectives - Allow all authenticated users to read
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'assessment_objectives' 
    AND policyname = 'Allow authenticated users to read assessment objectives'
  ) THEN
    CREATE POLICY "Allow authenticated users to read assessment objectives"
      ON assessment_objectives
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Frameworks - Allow all authenticated users to read
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'frameworks' 
    AND policyname = 'Allow authenticated users to read frameworks'
  ) THEN
    CREATE POLICY "Allow authenticated users to read frameworks"
      ON frameworks
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Threats - Allow all authenticated users to read
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'threats' 
    AND policyname = 'Allow authenticated users to read threats'
  ) THEN
    CREATE POLICY "Allow authenticated users to read threats"
      ON threats
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Risks - Allow all authenticated users to read
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'risks' 
    AND policyname = 'Allow authenticated users to read risks'
  ) THEN
    CREATE POLICY "Allow authenticated users to read risks"
      ON risks
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
