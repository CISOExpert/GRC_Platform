#!/usr/bin/env python3
"""
Test script to verify framework count query
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

# Test the query
query = """
SELECT 
  f.id,
  f.code,
  f.name,
  f.version,
  COUNT(DISTINCT ec.id) as external_control_count,
  COUNT(DISTINCT scm.id) as mapping_count
FROM frameworks f
LEFT JOIN external_controls ec ON ec.framework_id = f.id
LEFT JOIN scf_control_mappings scm ON scm.external_control_id = ec.id
GROUP BY f.id, f.code, f.name, f.version
ORDER BY mapping_count DESC
LIMIT 10;
"""

with conn.cursor(cursor_factory=RealDictCursor) as cur:
    cur.execute(query)
    results = cur.fetchall()
    
    print(f"\nTop 10 Frameworks by Mapping Count:")
    print(f"{'Framework':<50} {'Controls':<10} {'Mappings':<10}")
    print("-" * 70)
    
    for row in results:
        name = row['name'][:47] + "..." if len(row['name']) > 50 else row['name']
        print(f"{name:<50} {row['external_control_count']:<10} {row['mapping_count']:<10}")

conn.close()
print("\n✅ Query works! Framework counts retrieved successfully.")
