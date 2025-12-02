-- Evidence Request List from SCF 2025.3.1
-- 265 evidence requests across 28 areas of focus

-- Main evidence requests table
CREATE TABLE IF NOT EXISTS evidence_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL,
  erl_id text NOT NULL UNIQUE,  -- E-GOV-01, E-AST-01, etc.
  area_of_focus text NOT NULL,
  documentation_artifact text NOT NULL,
  artifact_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_evidence_requests_erl_id ON evidence_requests(erl_id);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_area_of_focus ON evidence_requests(area_of_focus);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_sort_order ON evidence_requests(sort_order);

-- Mapping table linking evidence requests to SCF controls
CREATE TABLE IF NOT EXISTS evidence_request_control_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_request_id uuid NOT NULL REFERENCES evidence_requests(id) ON DELETE CASCADE,
  control_id uuid NOT NULL REFERENCES external_controls(id) ON DELETE CASCADE,
  control_ref text NOT NULL,  -- Store ref_code for display (GOV-01, etc.)
  created_at timestamptz DEFAULT now(),
  UNIQUE(evidence_request_id, control_id)
);

-- Indexes for the mapping table
CREATE INDEX IF NOT EXISTS idx_erl_mappings_evidence_request ON evidence_request_control_mappings(evidence_request_id);
CREATE INDEX IF NOT EXISTS idx_erl_mappings_control ON evidence_request_control_mappings(control_id);

-- Add count column to external_controls for evidence requests
ALTER TABLE external_controls ADD COLUMN IF NOT EXISTS evidence_request_count integer DEFAULT 0;

-- Enable RLS
ALTER TABLE evidence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_request_control_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for read access
CREATE POLICY "Allow read access to evidence_requests" ON evidence_requests
  FOR SELECT USING (true);

CREATE POLICY "Allow read access to evidence_request_control_mappings" ON evidence_request_control_mappings
  FOR SELECT USING (true);

-- Function to get evidence requests for a specific control
CREATE OR REPLACE FUNCTION get_evidence_requests_for_control(control_uuid uuid)
RETURNS TABLE (
  id uuid,
  erl_id text,
  area_of_focus text,
  documentation_artifact text,
  artifact_description text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    er.id,
    er.erl_id,
    er.area_of_focus,
    er.documentation_artifact,
    er.artifact_description
  FROM evidence_requests er
  JOIN evidence_request_control_mappings erm ON erm.evidence_request_id = er.id
  WHERE erm.control_id = control_uuid
  ORDER BY er.sort_order;
$$;

-- Function to get all controls for an evidence request
CREATE OR REPLACE FUNCTION get_controls_for_evidence_request(erl_uuid uuid)
RETURNS TABLE (
  id uuid,
  ref_code text,
  description text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ec.id,
    ec.ref_code,
    ec.description
  FROM external_controls ec
  JOIN evidence_request_control_mappings erm ON erm.control_id = ec.id
  WHERE erm.evidence_request_id = erl_uuid
  ORDER BY ec.ref_code;
$$;

-- Grant permissions
GRANT SELECT ON evidence_requests TO authenticated, anon;
GRANT SELECT ON evidence_request_control_mappings TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_evidence_requests_for_control(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_controls_for_evidence_request(uuid) TO authenticated, anon;

COMMENT ON TABLE evidence_requests IS 'Evidence Request List from SCF 2025.3.1 - documentation artifacts needed to demonstrate compliance';
COMMENT ON TABLE evidence_request_control_mappings IS 'Mappings between evidence requests and SCF controls';
