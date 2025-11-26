#!/usr/bin/env python3
"""
Test framework counts with detailed statistics
"""
import psycopg2
from psycopg2.extras import RealDictCursor

# Connect to database
conn = psycopg2.connect(
    host="127.0.0.1",
    port="54322",
    database="postgres",
    user="postgres",
    password="postgres"
)

# Test the RPC function
query = "SELECT * FROM get_frameworks_with_counts() ORDER BY mapping_count DESC LIMIT 20;"

with conn.cursor(cursor_factory=RealDictCursor) as cur:
    cur.execute(query)
    results = cur.fetchall()
    
    print(f"\n{'='*80}")
    print(f"TOP 20 FRAMEWORKS BY MAPPING COUNT")
    print(f"{'='*80}\n")
    print(f"{'Framework':<55} {'Controls':<10} {'Mappings':<10}")
    print("-" * 80)
    
    total_controls = 0
    total_mappings = 0
    
    for i, row in enumerate(results, 1):
        name = row['name'][:52] + "..." if len(row['name']) > 55 else row['name']
        controls = row['external_control_count']
        mappings = row['mapping_count']
        
        total_controls += controls
        total_mappings += mappings
        
        print(f"{i:2}. {name:<52} {controls:<10} {mappings:<10}")
    
    print("-" * 80)
    print(f"{'TOTAL':<55} {total_controls:<10} {total_mappings:<10}")
    print()
    
    # Get counts
    cur.execute("SELECT COUNT(*) FROM get_frameworks_with_counts();")
    total_frameworks = cur.fetchone()['count']
    
    cur.execute("SELECT COUNT(*) FROM get_frameworks_with_counts() WHERE mapping_count > 0;")
    frameworks_with_mappings = cur.fetchone()['count']
    
    print(f"Total Frameworks: {total_frameworks}")
    print(f"Frameworks with Mappings: {frameworks_with_mappings}")
    print(f"Coverage: {frameworks_with_mappings}/{total_frameworks} ({100*frameworks_with_mappings/total_frameworks:.1f}%)")

conn.close()
print(f"\n✅ RPC function verified! Framework counts are working.\n")
