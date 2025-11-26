#!/usr/bin/env python3
"""
Update NIST CSF 2.0 external controls with hierarchy information
Creates parent-child relationships: Function → Category → Control
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# NIST CSF 2.0 hierarchy labels
FUNCTIONS = {
    'GV': 'Govern',
    'ID': 'Identify',
    'PR': 'Protect',
    'DE': 'Detect',
    'RS': 'Respond',
    'RC': 'Recover'
}

CATEGORIES = {
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

def update_nist_csf_hierarchy(conn):
    """Update NIST CSF 2.0 controls with hierarchy"""
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    print("\n" + "="*80)
    print("UPDATING NIST CSF 2.0 HIERARCHY")
    print("="*80)
    
    # Get framework ID
    cur.execute("SELECT id FROM frameworks WHERE code = 'NIST-CSF' AND version = '2.0'")
    framework = cur.fetchone()
    if not framework:
        print("ERROR: NIST CSF 2.0 framework not found!")
        return
    
    fw_id = framework['id']
    print(f"\nFramework ID: {fw_id}")
    
    # Get all existing controls
    cur.execute("""
        SELECT id, ref_code, description
        FROM external_controls
        WHERE framework_id = %s
        ORDER BY ref_code
    """, (fw_id,))
    controls = cur.fetchall()
    
    print(f"Found {len(controls)} existing controls")
    
    # Build maps
    control_map = {c['ref_code']: c['id'] for c in controls}
    
    # Step 1: Create/update Function level nodes (GV, ID, etc.)
    functions_to_insert = []
    for func_code, func_name in FUNCTIONS.items():
        if func_code not in control_map:
            functions_to_insert.append((fw_id, func_code, func_name, None, 'function', ord(func_code[0]) * 100, True))
    
    if functions_to_insert:
        print(f"\nInserting {len(functions_to_insert)} function nodes...")
        for func_data in functions_to_insert:
            cur.execute("""
                INSERT INTO external_controls (framework_id, ref_code, description, parent_id, hierarchy_level, display_order, is_group)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, ref_code
            """, func_data)
            
            row = cur.fetchone()
            control_map[row['ref_code']] = row['id']
            print(f"  Created: {row['ref_code']}")
    
    # Step 2: Create/update Category level nodes (GV.OC, PR.AA, etc.)
    categories_to_insert = []
    for cat_code, cat_name in CATEGORIES.items():
        if cat_code not in control_map:
            func_code = cat_code.split('.')[0]
            parent_id = control_map.get(func_code)
            order = ord(cat_code.split('.')[1][0]) * 10 + ord(cat_code.split('.')[1][1] if len(cat_code.split('.')[1]) > 1 else 'A')
            categories_to_insert.append((fw_id, cat_code, cat_name, parent_id, 'category', order, True))
    
    if categories_to_insert:
        print(f"\nInserting {len(categories_to_insert)} category nodes...")
        for cat_data in categories_to_insert:
            cur.execute("""
                INSERT INTO external_controls (framework_id, ref_code, description, parent_id, hierarchy_level, display_order, is_group)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, ref_code
            """, cat_data)
            
            row = cur.fetchone()
            control_map[row['ref_code']] = row['id']
            print(f"  Created: {row['ref_code']}")
    
    # Step 3: Update existing controls with parent_id and hierarchy info
    updates = []
    for control in controls:
        ref_code = control['ref_code']
        
        # Parse pattern: GV.OC-01
        if re.match(r'^[A-Z]{2}\.[A-Z]{2,}-\d+$', ref_code):
            # This is a control - set parent to category
            category = '.'.join(ref_code.split('-')[0].split('.'))
            parent_id = control_map.get(category)
            hierarchy_level = 'control'
            # Extract number for sort order
            num = int(re.search(r'-(\d+)$', ref_code).group(1))
            display_order = num
            is_group = False
            
            updates.append((parent_id, hierarchy_level, display_order, is_group, control['id']))
    
    if updates:
        print(f"\nUpdating {len(updates)} control hierarchy records...")
        cur.executemany("""
            UPDATE external_controls
            SET parent_id = %s,
                hierarchy_level = %s,
                display_order = %s,
                is_group = %s
            WHERE id = %s
        """, updates)
    
    conn.commit()
    
    # Show stats
    cur.execute("""
        SELECT hierarchy_level, COUNT(*) as count, is_group
        FROM external_controls
        WHERE framework_id = %s
        GROUP BY hierarchy_level, is_group
        ORDER BY hierarchy_level, is_group DESC
    """, (fw_id,))
    stats = cur.fetchall()
    
    print("\n✓ Hierarchy updated!")
    print("\nHierarchy breakdown:")
    for stat in stats:
        group_label = " (grouping)" if stat['is_group'] else ""
        print(f"  {stat['hierarchy_level']}: {stat['count']}{group_label}")
    
    # Show sample
    cur.execute("""
        SELECT 
            c.ref_code,
            c.description,
            c.hierarchy_level,
            c.is_group,
            p.ref_code as parent_ref
        FROM external_controls c
        LEFT JOIN external_controls p ON c.parent_id = p.id
        WHERE c.framework_id = %s
        ORDER BY c.ref_code
        LIMIT 20
    """, (fw_id,))
    
    print("\nSample hierarchy:")
    for row in cur.fetchall():
        indent = "  " * ({'function': 0, 'category': 1, 'control': 2}.get(row['hierarchy_level'], 0))
        group = " [GROUP]" if row['is_group'] else ""
        parent = f" (parent: {row['parent_ref']})" if row['parent_ref'] else ""
        print(f"  {indent}{row['ref_code']}: {row['description'][:40]}...{group}{parent}")
    
    cur.close()

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    
    try:
        update_nist_csf_hierarchy(conn)
        print("\n✓ NIST CSF 2.0 hierarchy update complete!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    main()
