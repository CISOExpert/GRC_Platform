#!/usr/bin/env python3
"""
Fix parent_id hierarchy for ALL frameworks based on ref_code patterns.

Does NOT delete any data. Only updates parent_id fields.

Supported patterns:
- NIST-800-53/FedRAMP/CMMC: AC-16(1) → AC-16
- NIST-800-171 rev3: 03.01.01.c.01 → 03.01.01.c → 03.01.01
- NIST-800-171 rev2: 3.1.1 → 3.1 (if exists)
- CIS-CSC: 1.1 → 1
- PCI-DSS: 1.2.1 → 1.2
- HIPAA: 164.306(b)(2)(i) → 164.306(b)(2) → 164.306(b)
- GDPR: 12.5(b) → 12.5
- SOC2-TSC: A1.1-POF1 → A1.1
- NIST-CSF v1.1: DE.AE-1 → DE.AE (if exists)
- NIST-PF: Similar to CSF
- ISO frameworks: Already handled by fix_iso_parent_hierarchy.py
- COBIT: APO01.01 → APO01 (if domain group exists)
- CSA-CCM: A&A-01 → A&A (if domain group exists)
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


def get_parent_ref_nist_800_53(ref_code):
    """NIST 800-53/FedRAMP/CMMC pattern: AC-16(1) → AC-16"""
    # Pattern: XX-N(N) where XX is family, N is control, (N) is enhancement
    match = re.match(r'^([A-Z]{2}-\d+)\(\d+\)$', ref_code)
    if match:
        return match.group(1)
    return None


def get_parent_ref_nist_800_171_rev3(ref_code):
    """NIST 800-171 rev3 pattern: 03.01.01.c.01 → 03.01.01.c → 03.01.01"""
    # Pattern with sub-number: NN.NN.NN.x.NN → NN.NN.NN.x
    match = re.match(r'^(\d{2}\.\d{2}\.\d{2}\.[a-z])\.\d{2}$', ref_code)
    if match:
        return match.group(1)

    # Pattern with letter: NN.NN.NN.x → NN.NN.NN
    match = re.match(r'^(\d{2}\.\d{2}\.\d{2})\.[a-z]$', ref_code)
    if match:
        return match.group(1)

    return None


def get_parent_ref_nist_800_171_rev2(ref_code):
    """NIST 800-171 rev2 pattern: 3.1.1 → 3.1 (only if X.Y exists as group)"""
    # Pattern: N.N.N → N.N
    match = re.match(r'^(\d+\.\d+)\.\d+$', ref_code)
    if match:
        return match.group(1)
    return None


def get_parent_ref_cis_csc(ref_code):
    """CIS CSC pattern: 1.1 → 1"""
    # Pattern: N.N → N
    match = re.match(r'^(\d+)\.\d+$', ref_code)
    if match:
        return match.group(1)
    return None


def get_parent_ref_pci_dss(ref_code):
    """PCI-DSS pattern: 1.2.1 → 1.2"""
    # Pattern: N.N.N → N.N
    match = re.match(r'^(\d+\.\d+)\.\d+$', ref_code)
    if match:
        return match.group(1)
    return None


def get_parent_ref_hipaa(ref_code):
    """HIPAA pattern: 164.306(b)(2)(i) → 164.306(b)(2) → 164.306(b) → 164.306"""
    # Pattern with roman numeral in parens: (i), (ii), (A), (B)
    # 164.306(d)(3)(ii)(B)(2) → 164.306(d)(3)(ii)(B)
    match = re.match(r'^(.+)\(\d+\)$', ref_code)
    if match:
        return match.group(1)

    # 164.306(d)(3)(ii)(B) → 164.306(d)(3)(ii)
    match = re.match(r'^(.+)\([A-Z]\)$', ref_code)
    if match:
        return match.group(1)

    # 164.306(d)(3)(ii) → 164.306(d)(3)
    match = re.match(r'^(.+)\([ivx]+\)$', ref_code)
    if match:
        return match.group(1)

    # 164.306(b)(2) → 164.306(b)
    match = re.match(r'^(.+\([a-z]\))\(\d+\)$', ref_code)
    if match:
        return match.group(1)

    # 164.306(b) → 164.306
    match = re.match(r'^(\d+\.\d+)\([a-z]\)$', ref_code)
    if match:
        return match.group(1)

    return None


def get_parent_ref_gdpr(ref_code):
    """GDPR pattern: 12.5(b) → 12.5, 13.2(a) → 13.2"""
    # Pattern: NN.N(x) → NN.N
    match = re.match(r'^(\d+\.\d+)\([a-z]\)$', ref_code)
    if match:
        return match.group(1)
    return None


def get_parent_ref_soc2(ref_code):
    """SOC2-TSC pattern: A1.1-POF1 → A1.1"""
    # Pattern: XX.N-POFN → XX.N
    match = re.match(r'^([A-Z]\d+\.\d+)-POF\d+$', ref_code)
    if match:
        return match.group(1)
    return None


def get_parent_ref_nist_csf_v1(ref_code):
    """NIST CSF v1.1 pattern: DE.AE-1 → DE.AE → DE"""
    # Pattern: XX.YY-N → XX.YY
    match = re.match(r'^([A-Z]{2}\.[A-Z]{2})-\d+$', ref_code)
    if match:
        return match.group(1)

    # Pattern: XX.YY → XX (function level)
    match = re.match(r'^([A-Z]{2})\.[A-Z]{2}$', ref_code)
    if match:
        return match.group(1)

    return None


def get_parent_ref_nist_pf(ref_code):
    """NIST Privacy Framework pattern: Similar to CSF"""
    return get_parent_ref_nist_csf_v1(ref_code)


def get_parent_ref_cobit(ref_code):
    """COBIT pattern: APO01.01 → APO01 (domain group)"""
    # Pattern: XXXNN.NN → XXXNN
    match = re.match(r'^([A-Z]{3}\d{2})\.\d{2}$', ref_code)
    if match:
        return match.group(1)
    return None


def get_parent_ref_csa_ccm(ref_code):
    """CSA CCM pattern: A&A-01 → A&A (domain group)"""
    # Pattern: XXX-NN → XXX
    match = re.match(r'^([A-Z&]+)-\d{2}$', ref_code)
    if match:
        return match.group(1)
    return None


def get_parent_ref_nydfs(ref_code):
    """NYDFS pattern: 500.02(a) → 500.02"""
    # Pattern: NNN.NN(x) → NNN.NN
    match = re.match(r'^(\d+\.\d+)\([a-z]\)$', ref_code)
    if match:
        return match.group(1)

    # Pattern: NNN.NN(x)(N) → NNN.NN(x)
    match = re.match(r'^(.+)\(\d+\)$', ref_code)
    if match:
        return match.group(1)

    return None


def get_parent_ref_ccpa(ref_code):
    """CCPA pattern: 1798.XXX(x) → 1798.XXX"""
    # Pattern: NNNN.NNN(x) → NNNN.NNN
    match = re.match(r'^(\d+\.\d+)\([a-z]\)$', ref_code)
    if match:
        return match.group(1)

    # Nested patterns
    match = re.match(r'^(.+)\(\d+\)$', ref_code)
    if match:
        return match.group(1)

    return None


# Framework configurations: (code, version_filter, parent_function, needs_domain_groups)
FRAMEWORK_CONFIGS = [
    # NIST 800-53 variants (enhancement pattern)
    ('NIST-800-53', 'rev5', get_parent_ref_nist_800_53, False),
    ('NIST-800-53', 'rev4', get_parent_ref_nist_800_53, False),

    # FedRAMP baselines (same pattern as 800-53)
    ('FedRAMP', 'R5-High', get_parent_ref_nist_800_53, False),
    ('FedRAMP', 'R5-Moderate', get_parent_ref_nist_800_53, False),
    ('FedRAMP', 'R5-Low', get_parent_ref_nist_800_53, False),

    # CMMC (similar to 800-53)
    ('CMMC', '2.0', get_parent_ref_nist_800_53, False),

    # NIST 800-171 versions
    ('NIST-800-171', 'rev3', get_parent_ref_nist_800_171_rev3, False),
    ('NIST-800-171', 'rev2', get_parent_ref_nist_800_171_rev2, True),  # Needs groups

    # CIS Controls
    ('CIS-CSC', 'v8.1', get_parent_ref_cis_csc, True),  # Needs groups for controls 1-18
    ('CIS-CSC-IG1', 'v8.1', get_parent_ref_cis_csc, True),
    ('CIS-CSC-IG2', 'v8.1', get_parent_ref_cis_csc, True),
    ('CIS-CSC-IG3', 'v8.1', get_parent_ref_cis_csc, True),

    # PCI-DSS
    ('PCI-DSS', 'v4.0.1', get_parent_ref_pci_dss, False),
    ('PCI-DSS', 'v3.2', get_parent_ref_pci_dss, False),

    # HIPAA
    ('HIPAA', '2013', get_parent_ref_hipaa, False),

    # GDPR
    ('GDPR', '2016', get_parent_ref_gdpr, False),

    # SOC2
    ('SOC2-TSC', '2017-2022', get_parent_ref_soc2, False),

    # NIST CSF v1.1
    ('NIST-CSF', 'v1.1', get_parent_ref_nist_csf_v1, True),  # Needs function groups

    # NIST Privacy Framework
    ('NIST-PF', 'v1.0', get_parent_ref_nist_pf, True),

    # COBIT (needs domain groups)
    ('COBIT', '2019', get_parent_ref_cobit, True),

    # CSA CCM (needs domain groups)
    ('CSA-CCM', 'v4', get_parent_ref_csa_ccm, True),

    # NYDFS
    ('NYDFS', '2023', get_parent_ref_nydfs, False),

    # CCPA
    ('CCPA', '2022', get_parent_ref_ccpa, False),
]


def create_domain_groups(conn, framework_id, controls, framework_code):
    """Create domain/category groups if they don't exist."""
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get existing control map
    control_map = {c['ref_code']: c['id'] for c in controls}

    # Determine which groups to create based on framework
    groups_to_create = set()

    for c in controls:
        ref = c['ref_code']

        if framework_code in ['CIS-CSC', 'CIS-CSC-IG1', 'CIS-CSC-IG2', 'CIS-CSC-IG3']:
            # Extract control number (e.g., "1" from "1.1")
            match = re.match(r'^(\d+)\.\d+$', ref)
            if match:
                groups_to_create.add(match.group(1))

        elif framework_code == 'NIST-800-171' and '.' in ref and ref.count('.') == 2:
            # e.g., "3.1" from "3.1.1"
            match = re.match(r'^(\d+\.\d+)\.\d+$', ref)
            if match:
                groups_to_create.add(match.group(1))

        elif framework_code == 'NIST-CSF':
            # Create function groups (ID, PR, DE, RS, RC)
            match = re.match(r'^([A-Z]{2})\.[A-Z]{2}', ref)
            if match:
                groups_to_create.add(match.group(1))
            # Create category groups
            match = re.match(r'^([A-Z]{2}\.[A-Z]{2})-\d+$', ref)
            if match:
                groups_to_create.add(match.group(1))

        elif framework_code == 'NIST-PF':
            # Similar to CSF
            match = re.match(r'^([A-Z]{2})\.[A-Z]{2}', ref)
            if match:
                groups_to_create.add(match.group(1))
            match = re.match(r'^([A-Z]{2}\.[A-Z]{2})-\d+$', ref)
            if match:
                groups_to_create.add(match.group(1))

        elif framework_code == 'COBIT':
            # Create domain groups like APO01, BAI01, etc.
            match = re.match(r'^([A-Z]{3}\d{2})\.\d{2}$', ref)
            if match:
                groups_to_create.add(match.group(1))

        elif framework_code == 'CSA-CCM':
            # Create domain groups like A&A, AIS, BCR
            match = re.match(r'^([A-Z&]+)-\d{2}$', ref)
            if match:
                groups_to_create.add(match.group(1))

    # Filter out groups that already exist
    groups_to_create = groups_to_create - set(control_map.keys())

    if groups_to_create:
        print(f"    Creating {len(groups_to_create)} domain groups...")
        for group_ref in sorted(groups_to_create):
            try:
                cur.execute("""
                    INSERT INTO external_controls
                    (framework_id, ref_code, description, is_group, hierarchy_level)
                    VALUES (%s, %s, %s, true, 'domain')
                    ON CONFLICT (framework_id, ref_code) DO NOTHING
                    RETURNING id
                """, (framework_id, group_ref, f"Group: {group_ref}"))
                result = cur.fetchone()
                if result:
                    control_map[group_ref] = result['id']
            except Exception as e:
                print(f"      Warning: Could not create group {group_ref}: {e}")

        conn.commit()

    return control_map


def process_framework(conn, framework_code, version, get_parent_fn, needs_groups):
    """Process a single framework to set parent_ids."""
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get framework ID
    cur.execute(
        "SELECT id, code, name FROM frameworks WHERE code = %s AND version = %s",
        (framework_code, version)
    )
    framework = cur.fetchone()

    if not framework:
        print(f"  WARNING: Framework {framework_code} {version} not found")
        return 0

    fw_id = framework['id']
    fw_name = framework['name']
    print(f"\n  Processing {fw_name} ({version})...")

    # Get all controls for this framework
    cur.execute(
        "SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s",
        (fw_id,)
    )
    controls = cur.fetchall()
    print(f"    Found {len(controls)} controls")

    # Create domain groups if needed
    if needs_groups:
        control_map = create_domain_groups(conn, fw_id, controls, framework_code)
        # Re-fetch controls after creating groups
        cur.execute(
            "SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s",
            (fw_id,)
        )
        controls = cur.fetchall()
    else:
        control_map = {c['ref_code']: c['id'] for c in controls}

    updates = []
    for c in controls:
        ref = c['ref_code']
        current_parent = c['parent_id']

        # Get expected parent ref
        parent_ref = get_parent_fn(ref)

        if parent_ref:
            # Look up parent ID
            parent_id = control_map.get(parent_ref)
            if parent_id and parent_id != current_parent:
                updates.append((parent_id, c['id']))

    if updates:
        print(f"    Updating {len(updates)} parent references...")
        cur.executemany("""
            UPDATE external_controls
            SET parent_id = %s
            WHERE id = %s
        """, updates)
        conn.commit()
        print(f"    ✓ Updated {len(updates)} controls")
    else:
        print(f"    No updates needed")

    return len(updates)


def set_hierarchy_levels(conn):
    """Set hierarchy_level and is_group based on parent relationships."""
    cur = conn.cursor()

    print("\nSetting hierarchy levels for all frameworks...")

    # Controls with children are groups
    cur.execute("""
        UPDATE external_controls ec
        SET is_group = true,
            hierarchy_level = COALESCE(hierarchy_level, 'section')
        WHERE ec.id IN (
            SELECT DISTINCT parent_id
            FROM external_controls
            WHERE parent_id IS NOT NULL
        )
        AND is_group IS NOT true
    """)
    groups_updated = cur.rowcount

    # Controls without children are leaf controls
    cur.execute("""
        UPDATE external_controls ec
        SET is_group = false,
            hierarchy_level = COALESCE(hierarchy_level, 'control')
        WHERE ec.id NOT IN (
            SELECT DISTINCT parent_id
            FROM external_controls
            WHERE parent_id IS NOT NULL
        )
        AND (is_group IS NULL OR is_group = false)
        AND hierarchy_level IS NULL
    """)
    controls_updated = cur.rowcount

    conn.commit()
    print(f"  ✓ Updated {groups_updated} groups, {controls_updated} leaf controls")


def main():
    print("=" * 70)
    print("ALL FRAMEWORKS - Parent Hierarchy Fix")
    print("=" * 70)
    print("\nThis script updates parent_id relationships for all frameworks.")
    print("It does NOT delete any data.\n")

    conn = psycopg2.connect(DB_URL)

    total_updates = 0

    for framework_code, version, get_parent_fn, needs_groups in FRAMEWORK_CONFIGS:
        updates = process_framework(conn, framework_code, version, get_parent_fn, needs_groups)
        total_updates += updates

    set_hierarchy_levels(conn)

    conn.close()

    print("\n" + "=" * 70)
    print(f"COMPLETE: Updated {total_updates} parent references")
    print("=" * 70)


if __name__ == '__main__':
    main()
