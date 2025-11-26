-- Create evidence_templates table for Evidence Reference Library (ERL)
CREATE TABLE IF NOT EXISTS evidence_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    erl_id VARCHAR(50) NOT NULL UNIQUE,
    artifact_name TEXT NOT NULL,
    area_of_focus VARCHAR(255),
    description TEXT,
    control_mappings TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on area_of_focus for filtering
CREATE INDEX IF NOT EXISTS idx_evidence_templates_area 
ON evidence_templates(area_of_focus);

-- Add comments
COMMENT ON TABLE evidence_templates IS 
'Evidence Reference Library (ERL) templates for documenting compliance evidence';

COMMENT ON COLUMN evidence_templates.erl_id IS 
'Unique identifier from SCF ERL (e.g., ERL-001)';

COMMENT ON COLUMN evidence_templates.artifact_name IS 
'Name/title of the evidence artifact';

COMMENT ON COLUMN evidence_templates.area_of_focus IS 
'Category/domain of the evidence (e.g., Access Control, Data Protection)';

COMMENT ON COLUMN evidence_templates.description IS 
'Description and guidance for the evidence template';

COMMENT ON COLUMN evidence_templates.control_mappings IS 
'SCF control mappings for this evidence item';

-- Enable Row Level Security
ALTER TABLE evidence_templates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read evidence templates
CREATE POLICY "Allow authenticated users to read evidence templates"
ON evidence_templates
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow service role full access
CREATE POLICY "Allow service role full access to evidence templates"
ON evidence_templates
FOR ALL
TO service_role
USING (true);
