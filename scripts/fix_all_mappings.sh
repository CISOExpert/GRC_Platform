#!/bin/bash
set -e

echo "=========================================="
echo "FIXING ALL FRAMEWORK MAPPING HEADERS"
echo "=========================================="
echo ""

cd /Users/doneil/SynologyDrive/GRC_Unified_Platform

echo "Step 1: Analyzing and fixing framework headers..."
python3 scripts/fix_framework_headers.py

echo ""
echo "Step 2: Re-importing framework mappings with corrected headers..."
python3 << 'PYTHON_SCRIPT'
#!/usr/bin/env python3
"""
Re-import framework mappings with corrected headers
"""

import openpyxl
import psycopg2
from psycopg2.extras import execute_values

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EXCEL_PATH = "/Users/doneil/SynologyDrive/GRC_Unified_Platform/reference_material/secure-controls-framework-scf-2025-3-1 (1).xlsx"

COL_CONTROL_ID = 2
FRAMEWORK_MAPPING_START = 28
FRAMEWORK_MAPPING_END = 269

def clean_text(text):
    if text is None:
        return None
    text = str(text).strip()
    return text if text else None

print("=" * 80)
print("RE-IMPORTING ALL FRAMEWORK MAPPINGS")
print("=" * 80)

print("\nLoading Excel workbook...")
wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
ws = wb['SCF 2025.3.1']

# Get headers (keep newlines - don't clean them!)
headers = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))

print("Connecting to database...")
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# Get control mapping
cur.execute("SELECT control_id, id FROM scf_controls")
control_map = {row[0]: row[1] for row in cur.fetchall()}

# Get framework mapping by column header (DON'T clean the header - keep newlines)
cur.execute("SELECT id, mapping_column_header FROM frameworks WHERE mapping_column_header IS NOT NULL")
framework_by_header = {row[1]: row[0] for row in cur.fetchall()}

print(f"Found {len(framework_by_header)} frameworks with column headers")

# First pass: collect all unique external controls and create them
print("\nPass 1: Creating external controls...")
external_controls_to_create = {}

for row in ws.iter_rows(min_row=2, values_only=True):
    control_id = clean_text(row[COL_CONTROL_ID])
    if not control_id or control_id not in control_map:
        continue
    
    # Check each framework column
    for col_idx in range(FRAMEWORK_MAPPING_START, min(FRAMEWORK_MAPPING_END + 1, len(row))):
        cell_value = clean_text(row[col_idx])
        if not cell_value:
            continue
        
        # Get column header (DON'T clean it - keep newlines!)
        if col_idx < len(headers):
            header = headers[col_idx]
            if header in framework_by_header:
                framework_id = framework_by_header[header]
                key = (framework_id, cell_value)
                if key not in external_controls_to_create:
                    external_controls_to_create[key] = cell_value

print(f"Creating {len(external_controls_to_create)} external controls...")

# Create external controls
for (framework_id, ref_code), description in external_controls_to_create.items():
    cur.execute("""
        INSERT INTO external_controls (framework_id, ref_code, description)
        VALUES (%s, %s, %s)
        ON CONFLICT (framework_id, ref_code) DO NOTHING
    """, (framework_id, ref_code, description))

conn.commit()

# Second pass: get external control UUIDs and create mappings
print("Pass 2: Creating control mappings...")
cur.execute("SELECT framework_id, ref_code, id FROM external_controls")
external_control_map = {(row[0], row[1]): row[2] for row in cur.fetchall()}

mappings = []

for row in ws.iter_rows(min_row=2, values_only=True):
    control_id = clean_text(row[COL_CONTROL_ID])
    if not control_id or control_id not in control_map:
        continue
    
    control_uuid = control_map[control_id]
    
    # Check each framework column
    for col_idx in range(FRAMEWORK_MAPPING_START, min(FRAMEWORK_MAPPING_END + 1, len(row))):
        cell_value = clean_text(row[col_idx])
        if not cell_value:
            continue
        
        # Get column header (DON'T clean it)
        if col_idx < len(headers):
            header = headers[col_idx]
            if header in framework_by_header:
                framework_id = framework_by_header[header]
                key = (framework_id, cell_value)
                if key in external_control_map:
                    external_control_id = external_control_map[key]
                    mappings.append((control_uuid, external_control_id, framework_id))

print(f"Inserting {len(mappings)} framework mappings...")

# Clear existing mappings
cur.execute("DELETE FROM scf_control_mappings")

# Insert new mappings
execute_values(cur, """
    INSERT INTO scf_control_mappings (scf_control_id, external_control_id, framework_id)
    VALUES %s
    ON CONFLICT (scf_control_id, external_control_id) DO NOTHING
""", mappings)

conn.commit()

# Verify - show top frameworks
cur.execute("""
    SELECT 
      f.code, 
      f.version,
      COUNT(DISTINCT scm.id) as mapping_count,
      COUNT(DISTINCT scm.scf_control_id) as unique_scf_controls
    FROM frameworks f
    LEFT JOIN external_controls ec ON ec.framework_id = f.id
    LEFT JOIN scf_control_mappings scm ON scm.external_control_id = ec.id
    WHERE scm.id IS NOT NULL
    GROUP BY f.id, f.code, f.version
    ORDER BY mapping_count DESC
    LIMIT 20;
""")

print("\n" + "=" * 80)
print("TOP 20 FRAMEWORKS BY MAPPING COUNT")
print("=" * 80)
print(f"{'Code':<30} {'Version':<15} {'Mappings':<12} {'SCF Controls'}")
print("-" * 80)
for row in cur.fetchall():
    code, version, mapping_count, scf_count = row
    version_str = version if version else "N/A"
    print(f"{code:<30} {version_str:<15} {mapping_count:<12} {scf_count}")

print(f"\n✓ Imported {len(external_controls_to_create)} external controls and {len(mappings)} total mappings")

cur.close()
conn.close()
wb.close()
PYTHON_SCRIPT

echo ""
echo "=========================================="
echo "ALL DONE!"
echo "=========================================="
