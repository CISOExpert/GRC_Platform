#!/usr/bin/env python3
"""
Import Assessment Objectives (AOs) from SCF Excel into database
"""

import openpyxl
import psycopg2
from psycopg2.extras import execute_values
import sys

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EXCEL_PATH = "/reference_material/secure-controls-framework-scf-2025-3-1 (1).xlsx"

def clean_text(text):
    """Clean and normalize text"""
    if text is None:
        return None
    text = str(text).strip()
    while '\n\n' in text:
        text = text.replace('\n\n', '\n')
    return text if text else None

def extract_assessment_objectives(excel_path):
    """Extract AOs from Excel file"""
    print(f"Loading Excel file: {excel_path}")
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb['Assessment Objectives 2025.3.1']
    
    aos = []
    
    # Column indices (0-based)
    COL_SCF_ID = 0       # SCF #
    COL_AO_ID = 1        # SCF AO #
    COL_STATEMENT = 2    # SCF Assessment Objective
    
    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        scf_id = clean_text(row[COL_SCF_ID])
        ao_id = clean_text(row[COL_AO_ID])
        statement = clean_text(row[COL_STATEMENT])
        
        if not scf_id or not ao_id or not statement:
            continue
            
        aos.append({
            'scf_control_id': scf_id,
            'ao_id': ao_id,
            'statement': statement
        })
    
    print(f"Extracted {len(aos)} assessment objectives")
    return aos

def insert_aos(conn, aos):
    """Insert AOs into database"""
    
    # First, create a mapping of control_id to UUID
    print("Building control ID mapping...")
    with conn.cursor() as cur:
        cur.execute("SELECT id, control_id FROM scf_controls")
        control_map = {control_id: uuid for uuid, control_id in cur.fetchall()}
    
    print(f"Found {len(control_map)} controls in database")
    
    # Add metadata column if needed for AO ID
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'assessment_objectives' 
            AND column_name = 'ao_id'
        """)
        if not cur.fetchone():
            print("Adding ao_id column...")
            cur.execute("ALTER TABLE assessment_objectives ADD COLUMN IF NOT EXISTS ao_id text")
            conn.commit()
    
    # Prepare data with UUID lookups
    valid_aos = []
    skipped = 0
    
    for ao in aos:
        scf_id = ao['scf_control_id']
        if scf_id not in control_map:
            skipped += 1
            continue
            
        valid_aos.append((
            control_map[scf_id],  # control_id (UUID)
            ao['statement'],       # statement
            None,                  # evidence_expected
            psycopg2.extras.Json({'ao_id': ao['ao_id']}) # metadata with AO ID
        ))
    
    print(f"Inserting {len(valid_aos)} AOs ({skipped} skipped - no matching control)...")
    
    insert_sql = """
        INSERT INTO assessment_objectives (control_id, statement, evidence_expected, metadata)
        VALUES %s
        ON CONFLICT DO NOTHING
    """
    
    with conn.cursor() as cur:
        execute_values(cur, insert_sql, valid_aos)
        conn.commit()
    
    print("✅ Assessment objectives imported successfully!")

def main():
    try:
        aos = extract_assessment_objectives(EXCEL_PATH)
        
        if not aos:
            print("❌ No assessment objectives found")
            return 1
        
        print("\nConnecting to database...")
        conn = psycopg2.connect(DB_URL)
        
        insert_aos(conn, aos)
        
        # Verify
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM assessment_objectives")
            count = cur.fetchone()[0]
            print(f"\n✅ Import complete! Database now has {count} assessment objectives")
            
            # Show sample
            cur.execute("""
                SELECT ao.metadata->>'ao_id' as ao_id, 
                       sc.control_id,
                       LEFT(ao.statement, 80) as statement
                FROM assessment_objectives ao
                JOIN scf_controls sc ON ao.control_id = sc.id
                ORDER BY sc.control_id
                LIMIT 5
            """)
            print("\nSample assessment objectives:")
            for row in cur.fetchall():
                print(f"  {row[0]} ({row[1]}): {row[2]}...")
        
        conn.close()
        return 0
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
