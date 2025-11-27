#!/usr/bin/env python3
"""
Auto-map parent_id for external_controls based on ref_code patterns.
Does NOT delete any data. Only updates parent_id and parent_id_source fields.
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
FRAMEWORK_CODE = "NIST-CSF"
FRAMEWORK_VERSION = "2.0"

# Connect to DB
conn = psycopg2.connect(DB_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

# Get framework ID
cur.execute("SELECT id FROM frameworks WHERE code = %s AND version = %s", (FRAMEWORK_CODE, FRAMEWORK_VERSION))
framework = cur.fetchone()
if not framework:
    print("ERROR: Framework not found!")
    exit(1)
fw_id = framework['id']

# Get all controls for this framework
cur.execute("SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s", (fw_id,))
controls = cur.fetchall()
control_map = {c['ref_code']: c['id'] for c in controls}

updates = []
for c in controls:
    ref = c['ref_code']
    parent_id = None
    source = None
    # Function level (GV, ID, etc.)
    if re.match(r'^[A-Z]{2}$', ref):
        parent_id = None
        source = 'auto'
    # Category level (GV.RM, GV.RR, etc.)
    elif re.match(r'^[A-Z]{2}\.[A-Z]{2,}$', ref):
        func = ref.split('.')[0]
        parent_id = control_map.get(func)
        source = 'auto' if parent_id else None
    # Control level (GV.RM-01, etc.)
    elif re.match(r'^[A-Z]{2}\.[A-Z]{2,}-\d+$', ref):
        cat = ref.split('-')[0]
        parent_id = control_map.get(cat)
        source = 'auto' if parent_id else None
    # Otherwise, leave as is
    else:
        parent_id = c['parent_id']
        source = None
    # Only update if parent_id is different or source is not set
    if parent_id != c['parent_id'] or source:
        updates.append((parent_id, source, c['id']))

if updates:
    print(f"Updating {len(updates)} controls with inferred parent_id...")
    cur.executemany("""
        UPDATE external_controls
        SET parent_id = %s,
            parent_id_source = %s
        WHERE id = %s
    """, updates)
    conn.commit()
    print("✓ Parent IDs updated.")
else:
    print("No updates needed.")

cur.close()
conn.close()
