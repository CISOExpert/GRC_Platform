-- Migration: Add unique constraint for ON CONFLICT support
-- Ensures scf_control_mappings can be rebuilt idempotently

ALTER TABLE scf_control_mappings
ADD CONSTRAINT scf_control_mappings_unique
UNIQUE (scf_control_id, external_control_id, framework_id);
