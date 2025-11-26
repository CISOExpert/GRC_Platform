#!/usr/bin/env python3
"""
Test the get_frameworks_with_counts RPC function
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
query = "SELECT * FROM get_frameworks_with_counts() LIMIT 10;"

with conn.cursor(cursor_factory=RealDictCursor) as cur:
    cur.execute(query)
    results = cur.fetchall()
    
    print(f"\nFirst 10 Frameworks with Counts:")
    print(f"{'Framework':<50} {'Controls':<10} {'Mappings':<10}")
    print("-" * 70)
    
    for row in results:
        name = row['name'][:47] + "..." if len(row['name']) > 50 else row['name']
        print(f"{name:<50} {row['external_control_count']:<10} {row['mapping_count']:<10}")

conn.close()
print("\n✅ RPC function works! Ready for frontend integration.")
