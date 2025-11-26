-- Add SCF (Secure Controls Framework) as a framework entry
-- This allows SCF to be selected as a primary framework in the unified view

-- Insert SCF framework if it doesn't exist
INSERT INTO frameworks (code, name, version, description)
VALUES (
  'SCF',
  'Secure Controls Framework',
  '2025.3.1',
  'A unified control catalog for cybersecurity and data privacy with comprehensive mappings to external standards'
)
ON CONFLICT (code, version) DO NOTHING;

-- Comment
COMMENT ON TABLE frameworks IS 'Catalog of compliance frameworks including SCF and external standards (NIST, ISO, CIS, etc.)';
