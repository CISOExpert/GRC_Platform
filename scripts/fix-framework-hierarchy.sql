-- Framework Hierarchy Fix Script
-- Purpose: Add proper parent_id relationships and hierarchy_level to flat framework controls
-- Run this ONCE to fix the hierarchy structure

-- ============================================================================
-- SOC-2 Framework
-- Pattern: CC1.1-POF1 (Domain: CC1, Subdomain: CC1.1, Control: CC1.1-POF1)
-- ============================================================================

-- First, identify the unique domains in SOC-2 and create them if missing
WITH soc2_fw AS (
  SELECT id FROM frameworks WHERE code = 'SOC-2'
),
-- Extract domain prefixes (CC, A, C, P, PI)
domain_patterns AS (
  SELECT DISTINCT
    regexp_replace(ref_code, '([A-Z]+)[0-9].*', '\1') AS domain_prefix
  FROM external_controls ec
  JOIN soc2_fw ON ec.framework_id = soc2_fw.id
  WHERE ref_code ~ '^[A-Z]+[0-9]'
)
SELECT * FROM domain_patterns;

-- SOC-2: Set hierarchy_level for controls
UPDATE external_controls ec
SET hierarchy_level = CASE
  -- Domain level: CC1, A1, C1, P1, PI1 (letter(s) + single number, no dot)
  WHEN ec.ref_code ~ '^[A-Z]+[0-9]+$' THEN 'domain'
  -- Subdomain level: CC1.1, A1.2 (has dot but no dash)
  WHEN ec.ref_code ~ '^[A-Z]+[0-9]+\.[0-9]+$' THEN 'subdomain'
  -- Control level: CC1.1-POF1 (has dash)
  WHEN ec.ref_code ~ '-' THEN 'control'
  ELSE 'control'
END
FROM frameworks f
WHERE ec.framework_id = f.id AND f.code = 'SOC-2';

-- SOC-2: Create domain entries if they don't exist
INSERT INTO external_controls (id, framework_id, ref_code, description, hierarchy_level, display_order)
SELECT
  gen_random_uuid(),
  f.id,
  domain_code,
  'SOC 2 ' || domain_code || ' Domain',
  'domain',
  ROW_NUMBER() OVER (ORDER BY domain_code) * 1000
FROM (
  SELECT DISTINCT regexp_replace(ref_code, '^([A-Z]+[0-9]+).*', '\1') AS domain_code
  FROM external_controls ec
  JOIN frameworks f ON ec.framework_id = f.id
  WHERE f.code = 'SOC-2'
    AND ref_code ~ '^[A-Z]+[0-9]+\.'
) domains
CROSS JOIN frameworks f
WHERE f.code = 'SOC-2'
AND NOT EXISTS (
  SELECT 1 FROM external_controls ec2
  WHERE ec2.framework_id = f.id AND ec2.ref_code = domains.domain_code
)
ON CONFLICT DO NOTHING;

-- SOC-2: Set parent_id for subdomains (parent is domain)
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'SOC-2'
  AND child.ref_code ~ '^[A-Z]+[0-9]+\.[0-9]+$'  -- subdomain pattern
  AND parent.ref_code = regexp_replace(child.ref_code, '^([A-Z]+[0-9]+)\.[0-9]+$', '\1')
  AND child.parent_id IS NULL;

-- SOC-2: Set parent_id for controls (parent is subdomain)
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'SOC-2'
  AND child.ref_code ~ '-'  -- control pattern (has dash)
  AND parent.ref_code = regexp_replace(child.ref_code, '^([A-Z]+[0-9]+\.[0-9]+)-.*$', '\1')
  AND child.parent_id IS NULL;


-- ============================================================================
-- NIST-CSF Framework
-- Pattern: GV, GV.OC, GV.OC-01
-- Function (GV) → Category (GV.OC) → Subcategory (GV.OC-01)
-- ============================================================================

-- NIST-CSF: Set hierarchy_level
UPDATE external_controls ec
SET hierarchy_level = CASE
  -- Function level: GV, ID, PR, DE, RS, RC (2 letters only)
  WHEN ec.ref_code ~ '^[A-Z]{2}$' THEN 'function'
  -- Category level: GV.OC, PR.AA (letter.letters, no dash)
  WHEN ec.ref_code ~ '^[A-Z]{2}\.[A-Z]+$' THEN 'category'
  -- Subcategory level: GV.OC-01 (has dash and number)
  WHEN ec.ref_code ~ '^[A-Z]{2}\.[A-Z]+-[0-9]+$' THEN 'subcategory'
  ELSE 'control'
END
FROM frameworks f
WHERE ec.framework_id = f.id AND f.code = 'NIST-CSF';

-- NIST-CSF: Set parent_id for categories (parent is function)
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'NIST-CSF'
  AND child.ref_code ~ '^[A-Z]{2}\.[A-Z]+$'  -- category
  AND parent.ref_code = substring(child.ref_code from 1 for 2)  -- function (first 2 chars)
  AND child.parent_id IS NULL;

-- NIST-CSF: Set parent_id for subcategories (parent is category)
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'NIST-CSF'
  AND child.ref_code ~ '^[A-Z]{2}\.[A-Z]+-[0-9]+$'  -- subcategory
  AND parent.ref_code = regexp_replace(child.ref_code, '^([A-Z]{2}\.[A-Z]+)-[0-9]+$', '\1')
  AND child.parent_id IS NULL;


-- ============================================================================
-- ISO-27002 Framework
-- Pattern: 5, 5.1, 5.1.1 or A.5, A.5.1
-- Clause → Sub-clause → Control
-- ============================================================================

-- ISO-27002: Set hierarchy_level
UPDATE external_controls ec
SET hierarchy_level = CASE
  -- Top clause: just a number like 5, 6, 7 or A.5
  WHEN ec.ref_code ~ '^A?\.[0-9]+$' OR ec.ref_code ~ '^[0-9]+$' THEN 'clause'
  -- Sub-clause: 5.1, A.5.1
  WHEN ec.ref_code ~ '^A?\.[0-9]+\.[0-9]+$' OR ec.ref_code ~ '^[0-9]+\.[0-9]+$' THEN 'subclause'
  -- Control: 5.1.1, A.5.1.1
  WHEN ec.ref_code ~ '^A?\.[0-9]+\.[0-9]+\.[0-9]+$' OR ec.ref_code ~ '^[0-9]+\.[0-9]+\.[0-9]+$' THEN 'control'
  ELSE 'control'
END
FROM frameworks f
WHERE ec.framework_id = f.id AND f.code = 'ISO-27002';

-- ISO-27002: Create clause entries if missing
INSERT INTO external_controls (id, framework_id, ref_code, description, hierarchy_level, display_order)
SELECT
  gen_random_uuid(),
  f.id,
  clause_code,
  'ISO 27002 Clause ' || clause_code,
  'clause',
  CAST(regexp_replace(clause_code, '[^0-9]', '', 'g') AS integer) * 1000
FROM (
  SELECT DISTINCT
    CASE
      WHEN ref_code ~ '^A\.' THEN 'A.' || split_part(substring(ref_code from 3), '.', 1)
      ELSE split_part(ref_code, '.', 1)
    END AS clause_code
  FROM external_controls ec
  JOIN frameworks f ON ec.framework_id = f.id
  WHERE f.code = 'ISO-27002'
    AND ref_code ~ '\.'
) clauses
CROSS JOIN frameworks f
WHERE f.code = 'ISO-27002'
AND NOT EXISTS (
  SELECT 1 FROM external_controls ec2
  WHERE ec2.framework_id = f.id AND ec2.ref_code = clauses.clause_code
)
ON CONFLICT DO NOTHING;

-- ISO-27002: Set parent_id for sub-clauses (parent is clause)
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'ISO-27002'
  AND child.hierarchy_level = 'subclause'
  AND parent.ref_code = split_part(child.ref_code, '.', 1) ||
      CASE WHEN child.ref_code ~ '^A\.' THEN '.' || split_part(child.ref_code, '.', 2) ELSE '' END
  AND child.parent_id IS NULL;

-- ISO-27002: Set parent_id for controls (parent is sub-clause)
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'ISO-27002'
  AND child.hierarchy_level = 'control'
  AND parent.ref_code = regexp_replace(child.ref_code, '\.[0-9]+$', '')
  AND child.parent_id IS NULL;


-- ============================================================================
-- PCI-DSS Framework
-- Pattern: 1, 1.1, 1.1.1
-- Requirement → Sub-requirement → Control
-- ============================================================================

-- PCI-DSS: Set hierarchy_level
UPDATE external_controls ec
SET hierarchy_level = CASE
  -- Requirement: single number like 1, 2, 10
  WHEN ec.ref_code ~ '^[0-9]+$' THEN 'requirement'
  -- Sub-requirement: 1.1, 10.2
  WHEN ec.ref_code ~ '^[0-9]+\.[0-9]+$' THEN 'subrequirement'
  -- Control: 1.1.1, 10.2.3
  ELSE 'control'
END
FROM frameworks f
WHERE ec.framework_id = f.id AND f.code = 'PCIDSS';

-- PCI-DSS: Create requirement entries if missing
INSERT INTO external_controls (id, framework_id, ref_code, description, hierarchy_level, display_order)
SELECT
  gen_random_uuid(),
  f.id,
  req_code,
  'PCI-DSS Requirement ' || req_code,
  'requirement',
  CAST(req_code AS integer) * 1000
FROM (
  SELECT DISTINCT split_part(ref_code, '.', 1) AS req_code
  FROM external_controls ec
  JOIN frameworks f ON ec.framework_id = f.id
  WHERE f.code = 'PCIDSS'
    AND ref_code ~ '\.'
) reqs
CROSS JOIN frameworks f
WHERE f.code = 'PCIDSS'
AND NOT EXISTS (
  SELECT 1 FROM external_controls ec2
  WHERE ec2.framework_id = f.id AND ec2.ref_code = reqs.req_code
)
ON CONFLICT DO NOTHING;

-- PCI-DSS: Set parent_id for sub-requirements
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'PCIDSS'
  AND child.ref_code ~ '^[0-9]+\.[0-9]+$'
  AND parent.ref_code = split_part(child.ref_code, '.', 1)
  AND child.parent_id IS NULL;

-- PCI-DSS: Set parent_id for controls
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'PCIDSS'
  AND child.ref_code ~ '^[0-9]+\.[0-9]+\.[0-9]'
  AND parent.ref_code = split_part(child.ref_code, '.', 1) || '.' || split_part(child.ref_code, '.', 2)
  AND child.parent_id IS NULL;


-- ============================================================================
-- COBIT Framework
-- Pattern: APO01.01, BAI02.03
-- Domain (APO, BAI, DSS, EDM, MEA) → Process (APO01) → Control (APO01.01)
-- ============================================================================

-- COBIT: Set hierarchy_level
UPDATE external_controls ec
SET hierarchy_level = CASE
  -- Process level: APO01, BAI02 (letters + 2 digits, no dot)
  WHEN ec.ref_code ~ '^[A-Z]+[0-9]{2}$' THEN 'process'
  -- Control level: APO01.01 (has dot)
  ELSE 'control'
END
FROM frameworks f
WHERE ec.framework_id = f.id AND f.code = 'COBIT';

-- COBIT: Create domain entries
INSERT INTO external_controls (id, framework_id, ref_code, description, hierarchy_level, display_order)
SELECT
  gen_random_uuid(),
  f.id,
  domain_code,
  CASE domain_code
    WHEN 'APO' THEN 'Align, Plan and Organize'
    WHEN 'BAI' THEN 'Build, Acquire and Implement'
    WHEN 'DSS' THEN 'Deliver, Service and Support'
    WHEN 'EDM' THEN 'Evaluate, Direct and Monitor'
    WHEN 'MEA' THEN 'Monitor, Evaluate and Assess'
    ELSE domain_code
  END,
  'domain',
  CASE domain_code
    WHEN 'EDM' THEN 1000
    WHEN 'APO' THEN 2000
    WHEN 'BAI' THEN 3000
    WHEN 'DSS' THEN 4000
    WHEN 'MEA' THEN 5000
    ELSE 6000
  END
FROM (
  SELECT DISTINCT regexp_replace(ref_code, '[0-9].*', '') AS domain_code
  FROM external_controls ec
  JOIN frameworks f ON ec.framework_id = f.id
  WHERE f.code = 'COBIT'
) domains
CROSS JOIN frameworks f
WHERE f.code = 'COBIT'
AND NOT EXISTS (
  SELECT 1 FROM external_controls ec2
  WHERE ec2.framework_id = f.id AND ec2.ref_code = domains.domain_code
)
ON CONFLICT DO NOTHING;

-- COBIT: Create process entries if missing
INSERT INTO external_controls (id, framework_id, ref_code, description, hierarchy_level, display_order)
SELECT
  gen_random_uuid(),
  f.id,
  process_code,
  'COBIT Process ' || process_code,
  'process',
  CAST(regexp_replace(process_code, '[^0-9]', '', 'g') AS integer) * 100
FROM (
  SELECT DISTINCT regexp_replace(ref_code, '\.[0-9]+$', '') AS process_code
  FROM external_controls ec
  JOIN frameworks f ON ec.framework_id = f.id
  WHERE f.code = 'COBIT'
    AND ref_code ~ '\.'
) processes
CROSS JOIN frameworks f
WHERE f.code = 'COBIT'
AND NOT EXISTS (
  SELECT 1 FROM external_controls ec2
  WHERE ec2.framework_id = f.id AND ec2.ref_code = processes.process_code
)
ON CONFLICT DO NOTHING;

-- COBIT: Set parent_id for processes (parent is domain)
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'COBIT'
  AND child.ref_code ~ '^[A-Z]+[0-9]{2}$'  -- process
  AND parent.ref_code = regexp_replace(child.ref_code, '[0-9]+', '')  -- domain
  AND child.parent_id IS NULL;

-- COBIT: Set parent_id for controls (parent is process)
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'COBIT'
  AND child.ref_code ~ '^[A-Z]+[0-9]{2}\.[0-9]+$'  -- control
  AND parent.ref_code = regexp_replace(child.ref_code, '\.[0-9]+$', '')  -- process
  AND child.parent_id IS NULL;


-- ============================================================================
-- MITRE ATT&CK (CK) Framework
-- Pattern: T1001, T1001.001
-- Technique → Sub-technique
-- ============================================================================

-- CK: Set hierarchy_level
UPDATE external_controls ec
SET hierarchy_level = CASE
  -- Technique: T1001 (no dot)
  WHEN ec.ref_code ~ '^T[0-9]+$' THEN 'technique'
  -- Sub-technique: T1001.001 (has dot)
  ELSE 'subtechnique'
END
FROM frameworks f
WHERE ec.framework_id = f.id AND f.code = 'CK';

-- CK: Set parent_id for sub-techniques
UPDATE external_controls child
SET parent_id = parent.id
FROM external_controls parent
JOIN frameworks f ON parent.framework_id = f.id
WHERE child.framework_id = f.id
  AND f.code = 'CK'
  AND child.ref_code ~ '^T[0-9]+\.[0-9]+$'  -- sub-technique
  AND parent.ref_code = split_part(child.ref_code, '.', 1)  -- technique
  AND child.parent_id IS NULL;


-- ============================================================================
-- Update display_order based on ref_code for all affected frameworks
-- ============================================================================

-- Generate display_order for frameworks
UPDATE external_controls ec
SET display_order = sub.row_num
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY framework_id ORDER BY ref_code) as row_num
  FROM external_controls
  WHERE framework_id IN (
    SELECT id FROM frameworks
    WHERE code IN ('SOC-2', 'NIST-CSF', 'ISO-27002', 'PCIDSS', 'COBIT', 'CK')
  )
) sub
WHERE ec.id = sub.id;


-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check hierarchy status after fix
SELECT
  f.code,
  f.name,
  COUNT(ec.id) as total_controls,
  COUNT(ec.parent_id) as has_parent,
  COUNT(*) FILTER (WHERE ec.parent_id IS NULL) as no_parent,
  COUNT(DISTINCT ec.hierarchy_level) as hierarchy_levels
FROM frameworks f
JOIN external_controls ec ON ec.framework_id = f.id
WHERE f.code IN ('SOC-2', 'NIST-CSF', 'ISO-27002', 'PCIDSS', 'COBIT', 'CK')
GROUP BY f.id, f.code, f.name
ORDER BY f.code;
