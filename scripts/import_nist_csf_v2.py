#!/usr/bin/env python3
"""
Import NIST CSF v2.0 mappings from SCF Excel to the unified model.
Creates external_controls for CSF v2.0 and framework_crosswalks from SCF.
"""

import openpyxl
import psycopg2
import json
import sys
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EXCEL_PATH = "/app/reference_material/secure-controls-framework-scf-2025-3-1 (1).xlsx"

# NIST CSF v2.0 is in column 93 (0-indexed) = column CR
COL_NIST_CSF_V2 = 92
COL_CONTROL_ID = 2  # SCF #

# NIST CSF v2.0 Functions with descriptions
CSF_V2_FUNCTIONS = {
    'GV': ('Govern', 'The organization\'s cybersecurity risk management strategy, expectations, and policy are established, communicated, and monitored.'),
    'ID': ('Identify', 'The organization\'s current cybersecurity risks are understood.'),
    'PR': ('Protect', 'Safeguards to manage the organization\'s cybersecurity risks are used.'),
    'DE': ('Detect', 'Possible cybersecurity attacks and compromises are found and analyzed.'),
    'RS': ('Respond', 'Actions regarding a detected cybersecurity incident are taken.'),
    'RC': ('Recover', 'Assets and operations affected by a cybersecurity incident are restored.')
}

# NIST CSF v2.0 Categories
CSF_V2_CATEGORIES = {
    'GV.OC': 'Organizational Context',
    'GV.RM': 'Risk Management Strategy',
    'GV.RR': 'Roles, Responsibilities, and Authorities',
    'GV.PO': 'Policy',
    'GV.OV': 'Oversight',
    'GV.SC': 'Cybersecurity Supply Chain Risk Management',
    'ID.AM': 'Asset Management',
    'ID.RA': 'Risk Assessment',
    'ID.IM': 'Improvement',
    'PR.AA': 'Identity Management, Authentication and Access Control',
    'PR.AT': 'Awareness and Training',
    'PR.DS': 'Data Security',
    'PR.PS': 'Platform Security',
    'PR.IR': 'Technology Infrastructure Resilience',
    'DE.AE': 'Anomalies and Events',
    'DE.CM': 'Continuous Monitoring',
    'RS.MA': 'Incident Management',
    'RS.AN': 'Incident Analysis',
    'RS.RP': 'Incident Response Reporting and Communication',
    'RS.MI': 'Incident Mitigation',
    'RC.RP': 'Recovery Planning',
    'RC.CO': 'Recovery Communications'
}

def clean_text(text):
    if text is None:
        return None
    text = str(text).strip()
    return text if text else None

def parse_csf_refs(text):
    """Parse newline-separated CSF references (e.g., 'GV.OC-01\nGV.RM-02')"""
    if not text:
        return []
    refs = []
    for item in str(text).split('\n'):
        item = item.strip()
        if item and re.match(r'^[A-Z]{2}\.[A-Z]{2,}-\d+$', item):
            refs.append(item)
    return refs

def get_hierarchy_info(ref_code):
    """Parse CSF reference to determine hierarchy level."""
    if re.match(r'^[A-Z]{2}$', ref_code):
        return 'function', None, ref_code
    if re.match(r'^[A-Z]{2}\.[A-Z]{2,}$', ref_code):
        func = ref_code.split('.')[0]
        return 'category', func, ref_code
    if re.match(r'^[A-Z]{2}\.[A-Z]{2,}-\d+$', ref_code):
        parts = ref_code.split('.')
        func = parts[0]
        cat = f"{func}.{parts[1].split('-')[0]}"
        return 'subcategory', cat, ref_code
    return 'unknown', None, ref_code

def main():
    print("=" * 70)
    print("NIST CSF v2.0 IMPORT")
    print("=" * 70)

    print("\nLoading Excel workbook...")
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    ws = wb['SCF 2025.3.1']

    print("Connecting to database...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Get or verify NIST CSF v2.0 framework
    cur.execute("SELECT id FROM frameworks WHERE code = 'NIST-CSF' AND version = '2.0'")
    result = cur.fetchone()

    if result:
        framework_id = result[0]
        print(f"Found existing NIST CSF v2.0 framework: {framework_id}")
        cur.execute("SELECT COUNT(*) FROM external_controls WHERE framework_id = %s", (framework_id,))
        existing = cur.fetchone()[0]
        if existing > 0:
            print(f"Clearing {existing} existing controls for reimport...")
            cur.execute("DELETE FROM framework_crosswalks WHERE target_framework_id = %s", (framework_id,))
            cur.execute("DELETE FROM external_controls WHERE framework_id = %s", (framework_id,))
            conn.commit()
    else:
        cur.execute("""
            INSERT INTO frameworks (code, name, version, description)
            VALUES ('NIST-CSF', 'NIST Cybersecurity Framework', '2.0',
                    'NIST Cybersecurity Framework Version 2.0 - Published February 2024')
            RETURNING id
        """)
        framework_id = cur.fetchone()[0]
        print(f"Created NIST CSF v2.0 framework: {framework_id}")
    conn.commit()

    # Get SCF framework ID
    cur.execute("SELECT id FROM frameworks WHERE code = 'SCF'")
    scf_framework_id = cur.fetchone()[0]
    print(f"SCF Framework ID: {scf_framework_id}")

    # Build SCF control mapping
    cur.execute("""
        SELECT ref_code, id FROM external_controls
        WHERE framework_id = %s AND hierarchy_level = 'control'
    """, (scf_framework_id,))
    scf_control_map = {row[0]: row[1] for row in cur.fetchall()}
    print(f"Found {len(scf_control_map)} SCF controls")

    # Collect all unique CSF v2.0 references
    print("\nScanning Excel for NIST CSF v2.0 references...")
    all_refs = set()
    scf_to_csf_mappings = []

    for row in ws.iter_rows(min_row=2, values_only=True):
        scf_id = clean_text(row[COL_CONTROL_ID])
        csf_value = clean_text(row[COL_NIST_CSF_V2]) if len(row) > COL_NIST_CSF_V2 else None
        if not scf_id or not csf_value:
            continue
        csf_refs = parse_csf_refs(csf_value)
        for ref in csf_refs:
            all_refs.add(ref)
            if scf_id in scf_control_map:
                scf_to_csf_mappings.append((scf_control_map[scf_id], scf_id, ref))

    print(f"Found {len(all_refs)} unique CSF v2.0 subcategories")
    print(f"Found {len(scf_to_csf_mappings)} SCF->CSF mappings")

    # Extract functions and categories
    functions_needed = set()
    categories_needed = set()
    for ref in all_refs:
        level, parent, _ = get_hierarchy_info(ref)
        if level == 'subcategory':
            func = ref.split('.')[0]
            cat = f"{func}.{ref.split('.')[1].split('-')[0]}"
            functions_needed.add(func)
            categories_needed.add(cat)

    print(f"Functions: {len(functions_needed)}, Categories: {len(categories_needed)}")

    # Create hierarchy
    print("\nCreating CSF v2.0 hierarchy...")
    function_ids = {}
    category_ids = {}
    subcategory_ids = {}
    display_order = 0

    for func_code in sorted(functions_needed):
        if func_code in CSF_V2_FUNCTIONS:
            name, desc = CSF_V2_FUNCTIONS[func_code]
        else:
            name, desc = func_code, f"Function: {func_code}"
        cur.execute("""
            INSERT INTO external_controls
            (framework_id, ref_code, title, description, is_group, hierarchy_level, display_order)
            VALUES (%s, %s, %s, %s, true, 'function', %s)
            RETURNING id
        """, (framework_id, func_code, name, desc, display_order))
        function_ids[func_code] = cur.fetchone()[0]
        display_order += 1
    print(f"  Created {len(function_ids)} functions")

    for cat_code in sorted(categories_needed):
        func_code = cat_code.split('.')[0]
        parent_id = function_ids.get(func_code)
        name = CSF_V2_CATEGORIES.get(cat_code, cat_code)
        cur.execute("""
            INSERT INTO external_controls
            (framework_id, ref_code, title, description, parent_id, is_group, hierarchy_level, display_order)
            VALUES (%s, %s, %s, %s, %s, true, 'category', %s)
            RETURNING id
        """, (framework_id, cat_code, name, f"Category: {name}", parent_id, display_order))
        category_ids[cat_code] = cur.fetchone()[0]
        display_order += 1
    print(f"  Created {len(category_ids)} categories")

    for ref in sorted(all_refs):
        level, parent_code, _ = get_hierarchy_info(ref)
        if level != 'subcategory':
            continue
        parent_id = category_ids.get(parent_code)
        cur.execute("""
            INSERT INTO external_controls
            (framework_id, ref_code, title, description, parent_id, hierarchy_level, display_order)
            VALUES (%s, %s, %s, %s, %s, 'subcategory', %s)
            RETURNING id
        """, (framework_id, ref, ref, f"Subcategory: {ref}", parent_id, display_order))
        subcategory_ids[ref] = cur.fetchone()[0]
        display_order += 1
    print(f"  Created {len(subcategory_ids)} subcategories")
    conn.commit()

    # Create crosswalks
    print("\nCreating framework crosswalks...")
    inserted = 0
    for scf_control_id, scf_ref, csf_ref in scf_to_csf_mappings:
        target_id = subcategory_ids.get(csf_ref)
        if not target_id:
            continue
        try:
            cur.execute("""
                INSERT INTO framework_crosswalks
                (source_framework_id, source_ref, source_control_id,
                 target_framework_id, target_ref, target_control_id,
                 mapping_strength, confidence, mapping_origin)
                VALUES (%s, %s, %s, %s, %s, %s, 'exact', 95, 'SCF')
                ON CONFLICT (source_framework_id, source_ref, target_framework_id, target_ref)
                DO NOTHING
            """, (scf_framework_id, scf_ref, scf_control_id,
                  framework_id, csf_ref, target_id))
            inserted += 1
        except Exception as e:
            print(f"  Error: {e}")
        if inserted % 1000 == 0:
            conn.commit()
            print(f"  Inserted {inserted} crosswalks...")
    conn.commit()
    print(f"Created {inserted} SCF->CSF crosswalks")

    cur.execute("SELECT COUNT(*) FROM external_controls WHERE framework_id = %s", (framework_id,))
    total_controls = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM framework_crosswalks WHERE target_framework_id = %s", (framework_id,))
    total_mappings = cur.fetchone()[0]
    conn.close()

    print("\n" + "=" * 70)
    print("IMPORT COMPLETE")
    print("=" * 70)
    print(f"NIST CSF v2.0 controls:  {total_controls}")
    print(f"SCF->CSF mappings:       {total_mappings}")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
