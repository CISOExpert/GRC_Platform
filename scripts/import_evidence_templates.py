#!/usr/bin/env python3
"""
Import Evidence Request List (ERL) from SCF Excel into database
"""

import openpyxl
import psycopg2
from psycopg2.extras import execute_values
import sys
import os

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Get the project root directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(PROJECT_ROOT, "reference_material", "secure-controls-framework-scf-2025-3-1 (1).xlsx")

def clean_text(text):
    """Clean and normalize text"""
    if text is None:
        return None
    text = str(text).strip()
    while '\n\n' in text:
        text = text.replace('\n\n', '\n')
    return text if text else None

def extract_erl_items(excel_path):
    """Extract ERL items from Excel file"""
    print(f"Loading Excel file: {excel_path}")
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb['Evidence Request List 2025.3.1']
    
    erl_items = []
    
    # Column indices (0-based)
    COL_ERL_ID = 1           # ERL #
    COL_AREA = 2             # Area of Focus
    COL_ARTIFACT = 3         # Documentation Artifact
    COL_DESCRIPTION = 4      # Artifact Description
    COL_MAPPINGS = 5         # SCF Control Mappings
    
    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        erl_id = clean_text(row[COL_ERL_ID])
        area = clean_text(row[COL_AREA])
        artifact = clean_text(row[COL_ARTIFACT])
        description = clean_text(row[COL_DESCRIPTION])
        mappings = clean_text(row[COL_MAPPINGS])
        
        if not erl_id or not artifact:
            continue
            
        erl_items.append({
            'erl_id': erl_id,
            'area_of_focus': area,
            'artifact_name': artifact,
            'description': description,
            'control_mappings': mappings
        })
    
    print(f"Extracted {len(erl_items)} ERL items")
    return erl_items

def create_erl_reference_table(conn):
    """Create a reference table for ERL templates"""
    print("Creating ERL reference table...")
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS evidence_templates (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                erl_id text UNIQUE NOT NULL,
                area_of_focus text,
                artifact_name text NOT NULL,
                description text,
                control_mappings text,
                metadata jsonb DEFAULT '{}'::jsonb,
                created_at timestamptz DEFAULT now()
            )
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_evidence_templates_area 
            ON evidence_templates(area_of_focus)
        """)
        
        cur.execute("""
            COMMENT ON TABLE evidence_templates IS 
            'Evidence Request List (ERL) templates from SCF for common documentation artifacts'
        """)
        
        conn.commit()
    print("✅ Evidence templates table ready")

def insert_erl_items(conn, erl_items):
    """Insert ERL items into database"""
    
    insert_sql = """
        INSERT INTO evidence_templates (
            erl_id, area_of_focus, artifact_name, description, control_mappings
        ) VALUES %s
        ON CONFLICT (erl_id) DO UPDATE SET
            area_of_focus = EXCLUDED.area_of_focus,
            artifact_name = EXCLUDED.artifact_name,
            description = EXCLUDED.description,
            control_mappings = EXCLUDED.control_mappings
    """
    
    values = [
        (
            item['erl_id'],
            item['area_of_focus'],
            item['artifact_name'],
            item['description'],
            item['control_mappings']
        )
        for item in erl_items
    ]
    
    print(f"Inserting {len(values)} ERL items...")
    with conn.cursor() as cur:
        execute_values(cur, insert_sql, values)
        conn.commit()
    
    print("✅ Evidence templates imported successfully!")

def main():
    try:
        erl_items = extract_erl_items(EXCEL_PATH)
        
        if not erl_items:
            print("❌ No ERL items found")
            return 1
        
        print("\nConnecting to database...")
        conn = psycopg2.connect(DB_URL)
        
        create_erl_reference_table(conn)
        insert_erl_items(conn, erl_items)
        
        # Verify
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM evidence_templates")
            count = cur.fetchone()[0]
            print(f"\n✅ Import complete! Database now has {count} evidence templates")
            
            # Show sample
            cur.execute("""
                SELECT erl_id, area_of_focus, artifact_name, LEFT(description, 60) as desc
                FROM evidence_templates
                ORDER BY erl_id
                LIMIT 5
            """)
            print("\nSample evidence templates:")
            for row in cur.fetchall():
                print(f"  {row[0]} [{row[1]}]: {row[2]}")
                print(f"    {row[3]}...")
        
        conn.close()
        return 0
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
