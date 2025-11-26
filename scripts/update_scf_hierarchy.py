#!/usr/bin/env python3
"""
Update SCF controls with hierarchy information
Sets parent_id, hierarchy_level, display_order for proper tree structure
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

def update_scf_hierarchy(conn):
    """Update SCF controls with hierarchy fields"""
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    print("\n" + "="*80)
    print("UPDATING SCF CONTROL HIERARCHY")
    print("="*80)
    
    # Get all controls
    cur.execute("SELECT id, control_id, domain FROM scf_controls ORDER BY control_id")
    controls = cur.fetchall()
    
    print(f"\nProcessing {len(controls)} controls...")
    
    # Build hierarchy
    updates = []
    control_map = {c['control_id']: c['id'] for c in controls}
    
    for control in controls:
        control_id = control['control_id']
        
        # Determine hierarchy level and parent
        if re.match(r'^[A-Z]+-\d+\.\d+', control_id):
            # Sub-control (e.g., AAT-01.1)
            parent_id_str = re.match(r'^[A-Z]+-\d+', control_id).group()
            parent_id = control_map.get(parent_id_str)
            hierarchy_level = 'subcontrol'
            is_group = False
        elif re.match(r'^[A-Z]+-\d+$', control_id):
            # Parent control (e.g., AAT-01)
            parent_id = None  # Top-level within domain
            hierarchy_level = 'control'
            is_group = False
        else:
            # Unknown pattern
            parent_id = None
            hierarchy_level = 'control'
            is_group = False
        
        # Extract sort order from control ID
        match = re.search(r'(\d+)(?:\.(\d+))?$', control_id)
        if match:
            major = int(match.group(1))
            minor = int(match.group(2)) if match.group(2) else 0
            display_order = major * 1000 + minor
        else:
            display_order = 0
        
        updates.append((parent_id, hierarchy_level, display_order, is_group, control['id']))
    
    # Execute updates
    print(f"Updating {len(updates)} control hierarchy records...")
    cur.executemany("""
        UPDATE scf_controls
        SET parent_id = %s,
            hierarchy_level = %s,
            display_order = %s,
            is_group = %s
        WHERE id = %s
    """, updates)
    
    conn.commit()
    
    # Show stats
    cur.execute("""
        SELECT hierarchy_level, COUNT(*) as count
        FROM scf_controls
        GROUP BY hierarchy_level
        ORDER BY hierarchy_level
    """)
    stats = cur.fetchall()
    
    print("\n✓ Hierarchy updated!")
    print("\nHierarchy breakdown:")
    for stat in stats:
        print(f"  {stat['hierarchy_level']}: {stat['count']}")
    
    # Show sample hierarchy
    cur.execute("""
        SELECT 
            c.control_id,
            c.title,
            c.hierarchy_level,
            c.display_order,
            p.control_id as parent_control_id
        FROM scf_controls c
        LEFT JOIN scf_controls p ON c.parent_id = p.id
        WHERE c.control_id LIKE 'AAT-%'
        ORDER BY c.display_order
        LIMIT 10
    """)
    samples = cur.fetchall()
    
    print("\nSample hierarchy (AAT domain):")
    for s in samples:
        indent = "  " if s['hierarchy_level'] == 'subcontrol' else ""
        parent = f" (parent: {s['parent_control_id']})" if s['parent_control_id'] else ""
        print(f"  {indent}{s['control_id']}: {s['title'][:50]}... [{s['hierarchy_level']}]{parent}")
    
    cur.close()

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    
    try:
        update_scf_hierarchy(conn)
        print("\n✓ SCF hierarchy update complete!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    main()
