-- Add organization_frameworks table to track which frameworks each org uses
CREATE TABLE IF NOT EXISTS organization_frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    compliance_status TEXT CHECK (compliance_status IN ('not_started', 'in_progress', 'compliant', 'non_compliant')),
    target_completion_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, framework_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_frameworks_org_id ON organization_frameworks(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_frameworks_framework_id ON organization_frameworks(framework_id);

-- Add control mappings view for easy querying
CREATE OR REPLACE VIEW v_control_mappings AS
SELECT 
    scm.id,
    sc.control_id AS scf_control_id,
    sc.title AS scf_title,
    sc.domain AS scf_domain,
    ec.ref_code AS external_control_id,
    ec.description AS external_title,
    ec.metadata->>'function_category' AS function_category,
    ec.metadata->>'subcategory' AS subcategory,
    f.code AS framework_code,
    f.name AS framework_name,
    f.version AS framework_version,
    scm.mapping_strength,
    scm.confidence,
    scm.notes
FROM scf_control_mappings scm
JOIN scf_controls sc ON scm.scf_control_id = sc.id
JOIN external_controls ec ON scm.external_control_id = ec.id
JOIN frameworks f ON scm.framework_id = f.id;

-- Disable RLS on new tables for local development
ALTER TABLE organization_frameworks DISABLE ROW LEVEL SECURITY;
ALTER TABLE external_controls DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE organization_frameworks IS 'Tracks which compliance frameworks each organization is using';
COMMENT ON TABLE external_controls IS 'Stores control details from external frameworks (NIST CSF, CIS, etc.)';
COMMENT ON VIEW v_control_mappings IS 'Convenient view for querying SCF-to-framework control mappings';
