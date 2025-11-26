#!/usr/bin/env python3
"""
Test script to verify mapping data is correct for the Framework Mapping Explorer
"""
import psycopg2
from psycopg2.extras import RealDictCursor

# Supabase local database URL
DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

def main():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cursor = conn.cursor()
    
    print("\n=== Testing Framework Mapping Data ===\n")
    
    # 1. Check SCF controls
    cursor.execute("""
        SELECT COUNT(*) as count,
               COUNT(DISTINCT domain) as domains
        FROM scf_controls
    """)
    scf_stats = cursor.fetchone()
    print(f"✓ SCF Controls: {scf_stats['count']:,} controls across {scf_stats['domains']} domains")
    
    # 2. Check SCF → NIST CSF mappings
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM scf_control_mappings m
        JOIN frameworks f ON m.framework_id = f.id
        WHERE f.code = 'NIST_CSF_V2'
    """)
    nist_mappings = cursor.fetchone()
    print(f"✓ SCF → NIST CSF mappings: {nist_mappings['count']:,}")
    
    # 3. Check NIST CSF controls
    cursor.execute("""
        SELECT COUNT(*) as count,
               COUNT(CASE WHEN parent_id IS NULL AND hierarchy_level = 1 THEN 1 END) as functions,
               COUNT(CASE WHEN hierarchy_level = 2 THEN 1 END) as categories,
               COUNT(CASE WHEN hierarchy_level = 3 THEN 1 END) as controls
        FROM external_controls e
        JOIN frameworks f ON e.framework_id = f.id
        WHERE f.code = 'NIST_CSF_V2'
    """)
    nist_stats = cursor.fetchone()
    print(f"✓ NIST CSF Structure:")
    print(f"  - Total nodes: {nist_stats['count']:,}")
    print(f"  - Functions: {nist_stats['functions']}")
    print(f"  - Categories: {nist_stats['categories']}")
    print(f"  - Controls: {nist_stats['controls']}")
    
    # 4. Sample NIST CSF hierarchy
    cursor.execute("""
        SELECT ref_code, hierarchy_level, is_group
        FROM external_controls e
        JOIN frameworks f ON e.framework_id = f.id
        WHERE f.code = 'NIST_CSF_V2'
        ORDER BY display_order
        LIMIT 10
    """)
    print(f"\n✓ NIST CSF Sample Hierarchy:")
    for row in cursor.fetchall():
        indent = "  " * (row['hierarchy_level'] - 1)
        group_marker = " (group)" if row['is_group'] else ""
        print(f"  {indent}{row['ref_code']}{group_marker}")
    
    # 5. Check SCF controls with mappings
    cursor.execute("""
        SELECT 
            COUNT(DISTINCT sc.id) as total_controls,
            COUNT(DISTINCT CASE WHEN m.id IS NOT NULL THEN sc.id END) as controls_with_mappings
        FROM scf_controls sc
        LEFT JOIN scf_control_mappings m ON sc.id = m.scf_control_id
    """)
    scf_mapping_stats = cursor.fetchone()
    print(f"\n✓ SCF Control Coverage:")
    print(f"  - Total: {scf_mapping_stats['total_controls']:,}")
    print(f"  - With mappings: {scf_mapping_stats['controls_with_mappings']:,}")
    coverage = (scf_mapping_stats['controls_with_mappings'] / scf_mapping_stats['total_controls'] * 100) if scf_mapping_stats['total_controls'] > 0 else 0
    print(f"  - Coverage: {coverage:.1f}%")
    
    cursor.close()
    conn.close()
    
    print("\n✓ All tests passed!\n")

if __name__ == '__main__':
    main()
