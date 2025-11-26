-- Add RLS policies for organizations and related tables
-- This allows authenticated users to create and manage organizations

-- Organizations: Allow authenticated users to create and read all organizations
-- In a production system, you'd want more restrictive policies based on org membership
CREATE POLICY "Allow authenticated users to read organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update their organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete organizations"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (true);

-- Organization Members: Allow authenticated users to manage memberships
CREATE POLICY "Allow authenticated users to read organization members"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create organization memberships"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update organization memberships"
  ON organization_members
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete organization memberships"
  ON organization_members
  FOR DELETE
  TO authenticated
  USING (true);

-- Users: Allow users to read all users and update their own profile
CREATE POLICY "Allow authenticated users to read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated users to insert their own user record"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies table: Allow authenticated users to manage policies
CREATE POLICY "Allow authenticated users to read policies"
  ON policies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create policies"
  ON policies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update policies"
  ON policies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete policies"
  ON policies
  FOR DELETE
  TO authenticated
  USING (true);
