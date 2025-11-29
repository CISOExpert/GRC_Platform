#!/usr/bin/env python3
"""
Migrate SCF data to unified framework model.

This script:
1. Copies SCF controls from scf_controls to external_controls
2. Migrates mappings from scf_control_mappings to framework_crosswalks
3. Optionally imports NIST CSF v2.0 mappings
"""

import psycopg2
import json
import sys
from datetime import datetime
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal objects."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 54322,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

def connect_db():
    """Create database connection."""
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False  # Use transactions
    return conn

def step1_migrate_scf_to_external_controls(conn):
    """Copy SCF controls from scf_controls to external_controls."""
    print("\n" + "=" * 70)
    print("STEP 1: Migrating SCF controls to external_controls")
    print("=" * 70)

    cur = conn.cursor()

    # Get SCF framework ID
    cur.execute("SELECT id FROM frameworks WHERE code = 'SCF'")
    result = cur.fetchone()
    if not result:
        print("ERROR: SCF framework not found")
        return False
    scf_framework_id = result[0]
    print(f"SCF Framework ID: {scf_framework_id}")

    # Check existing SCF controls in external_controls
    cur.execute("""
        SELECT COUNT(*) FROM external_controls WHERE framework_id = %s
    """, (scf_framework_id,))
    existing_count = cur.fetchone()[0]

    if existing_count > 0:
        print(f"Found {existing_count} existing SCF controls in external_controls")
        print("Skipping - already migrated")
        return True

    # Get all SCF controls from scf_controls table
    cur.execute("""
        SELECT id, control_id, title, description, domain, weight,
               applicability_people, applicability_processes, applicability_technology,
               applicability_data, applicability_facilities,
               nist_csf, nist_800_53, iso_27001, iso_27002, pci_dss,
               hipaa, gdpr, sox, cobit, cis_controls, ccm,
               scrm_tier1, scrm_tier2, scrm_tier3, errata_notes
        FROM scf_controls
        ORDER BY control_id
    """)
    scf_controls = cur.fetchall()
    print(f"Found {len(scf_controls)} SCF controls to migrate")

    # Group controls by domain for parent hierarchy
    domains = {}
    controls_by_parent = {}

    for row in scf_controls:
        (id, control_id, title, description, domain, weight,
         people, processes, technology, data, facilities,
         nist_csf, nist_800_53, iso_27001, iso_27002, pci_dss,
         hipaa, gdpr, sox, cobit, cis_controls, ccm,
         scrm_tier1, scrm_tier2, scrm_tier3, errata_notes) = row

        if domain not in domains:
            domains[domain] = []
        domains[domain].append(row)

        # Check if this is a sub-control (e.g., AST-01.1)
        if '.' in control_id:
            parent_id = control_id.rsplit('.', 1)[0]
            if parent_id not in controls_by_parent:
                controls_by_parent[parent_id] = []
            controls_by_parent[parent_id].append(row)

    print(f"Found {len(domains)} domains")

    # Create domain parent entries first
    domain_ids = {}
    display_order = 0

    for domain_name in sorted(domains.keys()):
        cur.execute("""
            INSERT INTO external_controls
            (framework_id, ref_code, title, description, metadata, is_group, hierarchy_level, display_order)
            VALUES (%s, %s, %s, %s, %s::jsonb, true, 'domain', %s)
            RETURNING id
        """, (
            scf_framework_id,
            domain_name,
            domain_name,
            f"SCF Domain: {domain_name}",
            json.dumps({'type': 'domain'}),
            display_order
        ))
        domain_ids[domain_name] = cur.fetchone()[0]
        display_order += 1

    print(f"Created {len(domain_ids)} domain entries")

    # Insert all controls with their domain parent
    inserted = 0
    control_id_map = {}  # Maps scf_controls.id -> external_controls.id

    for row in scf_controls:
        (id, control_id, title, description, domain, weight,
         people, processes, technology, data, facilities,
         nist_csf, nist_800_53, iso_27001, iso_27002, pci_dss,
         hipaa, gdpr, sox, cobit, cis_controls, ccm,
         scrm_tier1, scrm_tier2, scrm_tier3, errata_notes) = row

        # Build metadata
        metadata = {
            'domain': domain,
            'weight': weight,
            'applicability': {
                'people': people,
                'processes': processes,
                'technology': technology,
                'data': data,
                'facilities': facilities
            },
            'scrm': {
                'tier1': scrm_tier1 or False,
                'tier2': scrm_tier2 or False,
                'tier3': scrm_tier3 or False
            }
        }
        if errata_notes:
            metadata['errata'] = errata_notes

        # Determine parent - domain for now, could add parent control logic
        parent_id = domain_ids.get(domain)

        # Calculate display order within domain
        domain_controls = domains.get(domain, [])
        order_in_domain = next((i for i, c in enumerate(domain_controls) if c[1] == control_id), 0)

        cur.execute("""
            INSERT INTO external_controls
            (framework_id, ref_code, title, description, metadata, parent_id, hierarchy_level, display_order)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s, 'control', %s)
            RETURNING id
        """, (
            scf_framework_id,
            control_id,
            title,
            description,
            json.dumps(metadata, cls=DecimalEncoder),
            parent_id,
            display_order + order_in_domain
        ))

        new_id = cur.fetchone()[0]
        control_id_map[str(id)] = new_id
        inserted += 1

        if inserted % 200 == 0:
            print(f"  Inserted {inserted} controls...")

    conn.commit()
    print(f"✓ Migrated {inserted} SCF controls to external_controls")

    # Store mapping for step 2
    return control_id_map

def step2_migrate_mappings_to_crosswalks(conn, scf_control_map):
    """Migrate scf_control_mappings to framework_crosswalks."""
    print("\n" + "=" * 70)
    print("STEP 2: Migrating mappings to framework_crosswalks")
    print("=" * 70)

    cur = conn.cursor()

    # Check existing crosswalks
    cur.execute("SELECT COUNT(*) FROM framework_crosswalks")
    existing_count = cur.fetchone()[0]

    if existing_count > 0:
        print(f"Found {existing_count} existing crosswalks")
        print("Skipping - already migrated")
        return True

    # Get SCF framework ID
    cur.execute("SELECT id FROM frameworks WHERE code = 'SCF'")
    scf_framework_id = cur.fetchone()[0]

    # Get all existing mappings from scf_control_mappings
    cur.execute("""
        SELECT
            m.id,
            m.scf_control_id,
            m.external_control_id,
            m.framework_id,
            m.mapping_strength,
            m.confidence,
            m.notes,
            s.control_id as scf_ref,
            e.ref_code as ext_ref
        FROM scf_control_mappings m
        JOIN scf_controls s ON m.scf_control_id = s.id
        JOIN external_controls e ON m.external_control_id = e.id
    """)
    mappings = cur.fetchall()
    print(f"Found {len(mappings)} mappings to migrate")

    if not mappings:
        print("No mappings to migrate")
        return True

    # Insert into framework_crosswalks
    inserted = 0
    errors = 0

    for row in mappings:
        (id, scf_control_id, ext_control_id, framework_id,
         mapping_strength, confidence, notes, scf_ref, ext_ref) = row

        # Get the new SCF control ID from external_controls
        source_control_id = scf_control_map.get(str(scf_control_id))

        if not source_control_id:
            # Try to find by ref_code
            cur.execute("""
                SELECT id FROM external_controls
                WHERE framework_id = %s AND ref_code = %s
            """, (scf_framework_id, scf_ref))
            result = cur.fetchone()
            if result:
                source_control_id = result[0]

        if not source_control_id:
            errors += 1
            if errors <= 5:
                print(f"  WARNING: Could not find SCF control {scf_ref}")
            continue

        try:
            cur.execute("""
                INSERT INTO framework_crosswalks
                (source_framework_id, source_ref, source_control_id,
                 target_framework_id, target_ref, target_control_id,
                 mapping_strength, confidence, notes, mapping_origin)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'SCF')
                ON CONFLICT (source_framework_id, source_ref, target_framework_id, target_ref)
                DO NOTHING
            """, (
                scf_framework_id,
                scf_ref,
                source_control_id,
                framework_id,
                ext_ref,
                ext_control_id,
                mapping_strength or 'exact',
                confidence or 95,
                notes
            ))
            inserted += 1

            if inserted % 2000 == 0:
                print(f"  Inserted {inserted} crosswalks...")
                conn.commit()
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  ERROR inserting crosswalk: {e}")

    conn.commit()
    print(f"✓ Migrated {inserted} mappings to framework_crosswalks")
    if errors > 0:
        print(f"  Skipped {errors} mappings due to errors")

    return True

def step3_import_nist_csf_v2(conn):
    """Import NIST CSF v2.0 if not present."""
    print("\n" + "=" * 70)
    print("STEP 3: Checking NIST CSF v2.0")
    print("=" * 70)

    cur = conn.cursor()

    # Check if NIST CSF v2.0 exists
    cur.execute("""
        SELECT id FROM frameworks
        WHERE code = 'NIST-CSF' AND version = '2.0'
    """)
    result = cur.fetchone()

    if result:
        print(f"NIST CSF v2.0 already exists: {result[0]}")
        return True

    # Create NIST CSF v2.0 framework
    print("Creating NIST CSF v2.0 framework...")
    cur.execute("""
        INSERT INTO frameworks (code, name, version, description)
        VALUES ('NIST-CSF', 'NIST Cybersecurity Framework', '2.0',
                'NIST Cybersecurity Framework Version 2.0 - Published February 2024')
        RETURNING id
    """)
    framework_id = cur.fetchone()[0]
    print(f"Created NIST CSF v2.0 with ID: {framework_id}")

    # Create the basic CSF v2.0 structure (Functions, Categories, Subcategories)
    # This is the core structure - mappings would need to be imported separately

    csf_v2_functions = {
        'GV': ('Govern', 'The organization\'s cybersecurity risk management strategy, expectations, and policy are established, communicated, and monitored.'),
        'ID': ('Identify', 'The organization\'s current cybersecurity risks are understood.'),
        'PR': ('Protect', 'Safeguards to manage the organization\'s cybersecurity risks are used.'),
        'DE': ('Detect', 'Possible cybersecurity attacks and compromises are found and analyzed.'),
        'RS': ('Respond', 'Actions regarding a detected cybersecurity incident are taken.'),
        'RC': ('Recover', 'Assets and operations affected by a cybersecurity incident are restored.')
    }

    function_ids = {}
    display_order = 0

    for code, (name, desc) in csf_v2_functions.items():
        cur.execute("""
            INSERT INTO external_controls
            (framework_id, ref_code, title, description, is_group, hierarchy_level, display_order)
            VALUES (%s, %s, %s, %s, true, 'function', %s)
            RETURNING id
        """, (framework_id, code, name, desc, display_order))
        function_ids[code] = cur.fetchone()[0]
        display_order += 1

    print(f"Created {len(function_ids)} NIST CSF v2.0 functions")

    conn.commit()
    print("✓ NIST CSF v2.0 framework created (basic structure)")
    print("  Note: Full control mappings need to be imported from Excel")

    return True

def step4_update_risk_threat_links(conn):
    """Update risk and threat control links to use external_controls."""
    print("\n" + "=" * 70)
    print("STEP 4: Updating risk/threat control links")
    print("=" * 70)

    cur = conn.cursor()

    # Check if risk_controls uses external_controls.id
    cur.execute("""
        SELECT COUNT(*) FROM risk_controls rc
        JOIN external_controls ec ON rc.control_id = ec.id
    """)
    risk_ec_count = cur.fetchone()[0]

    # Check if risk_controls uses scf_controls.id
    cur.execute("""
        SELECT COUNT(*) FROM risk_controls rc
        JOIN scf_controls sc ON rc.control_id = sc.id
    """)
    risk_scf_count = cur.fetchone()[0]

    print(f"Risk controls linked to external_controls: {risk_ec_count}")
    print(f"Risk controls linked to scf_controls: {risk_scf_count}")

    # Similar for threat_controls
    cur.execute("""
        SELECT COUNT(*) FROM threat_controls tc
        JOIN external_controls ec ON tc.control_id = ec.id
    """)
    threat_ec_count = cur.fetchone()[0]

    cur.execute("""
        SELECT COUNT(*) FROM threat_controls tc
        JOIN scf_controls sc ON tc.control_id = sc.id
    """)
    threat_scf_count = cur.fetchone()[0]

    print(f"Threat controls linked to external_controls: {threat_ec_count}")
    print(f"Threat controls linked to scf_controls: {threat_scf_count}")

    # If links are to scf_controls, we need to update them
    if risk_scf_count > 0 or threat_scf_count > 0:
        print("Need to update control links...")

        # Get SCF framework ID
        cur.execute("SELECT id FROM frameworks WHERE code = 'SCF'")
        scf_framework_id = cur.fetchone()[0]

        # Build mapping from scf_controls.control_id to external_controls.id
        cur.execute("""
            SELECT sc.id as scf_uuid, ec.id as ec_uuid
            FROM scf_controls sc
            JOIN external_controls ec ON ec.ref_code = sc.control_id AND ec.framework_id = %s
        """, (scf_framework_id,))
        control_map = {str(row[0]): row[1] for row in cur.fetchall()}

        # Update risk_controls
        if risk_scf_count > 0:
            updated = 0
            cur.execute("SELECT id, control_id FROM risk_controls")
            for rc_id, ctrl_id in cur.fetchall():
                new_ctrl_id = control_map.get(str(ctrl_id))
                if new_ctrl_id:
                    cur.execute("""
                        UPDATE risk_controls SET control_id = %s WHERE id = %s
                    """, (new_ctrl_id, rc_id))
                    updated += 1
            print(f"  Updated {updated} risk_controls links")

        # Update threat_controls
        if threat_scf_count > 0:
            updated = 0
            cur.execute("SELECT id, control_id FROM threat_controls")
            for tc_id, ctrl_id in cur.fetchall():
                new_ctrl_id = control_map.get(str(ctrl_id))
                if new_ctrl_id:
                    cur.execute("""
                        UPDATE threat_controls SET control_id = %s WHERE id = %s
                    """, (new_ctrl_id, tc_id))
                    updated += 1
            print(f"  Updated {updated} threat_controls links")

        conn.commit()

    print("✓ Risk/threat control links verified")
    return True

def main():
    print("=" * 70)
    print("UNIFIED FRAMEWORK MODEL MIGRATION")
    print("=" * 70)
    print(f"Started: {datetime.now().isoformat()}")

    try:
        conn = connect_db()

        # Step 1: Migrate SCF controls
        scf_control_map = step1_migrate_scf_to_external_controls(conn)

        if isinstance(scf_control_map, bool):
            # Already migrated, need to rebuild map
            cur = conn.cursor()
            cur.execute("SELECT id FROM frameworks WHERE code = 'SCF'")
            scf_framework_id = cur.fetchone()[0]

            cur.execute("""
                SELECT sc.id, ec.id
                FROM scf_controls sc
                JOIN external_controls ec ON ec.ref_code = sc.control_id
                    AND ec.framework_id = %s
            """, (scf_framework_id,))
            scf_control_map = {str(row[0]): row[1] for row in cur.fetchall()}

        # Step 2: Migrate mappings
        step2_migrate_mappings_to_crosswalks(conn, scf_control_map)

        # Step 3: Create NIST CSF v2.0
        step3_import_nist_csf_v2(conn)

        # Step 4: Update risk/threat links
        step4_update_risk_threat_links(conn)

        conn.close()

        print("\n" + "=" * 70)
        print("MIGRATION COMPLETE")
        print("=" * 70)
        print(f"Finished: {datetime.now().isoformat()}")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
