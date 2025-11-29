#!/usr/bin/env python3
"""
Import Assessment Objectives (AOs) from SCF Excel into database.
Enhanced version that captures all columns including framework mappings.

Excel Columns:
  A: SCF # (links to scf_controls.control_id)
  B: SCF AO # (unique AO identifier, e.g., AAT-01_A01)
  C: SCF Assessment Objective (the statement)
  D: SCF Assessment Objective Origin(s)
  E: Notes / Errata
  F: SCF Baseline AOs (x if applicable)
  G: CMMC Level 1 AOs (x if applicable)
  H: DHS ZTCF AOs (x if applicable)
  I: NIST 800-53 R5 AOs (x if applicable)
  J: NIST 800-171 R2 AOs (x if applicable)
  K: NIST 800-171 R3 AOs (x if applicable)
  L: NIST 800-172 AOs (x if applicable)
  M: Asset Type (examine/interview/test)
  N: Assessment Procedure
  O: Expected Result(s)
"""

import openpyxl
import psycopg2
from psycopg2.extras import execute_values
import json
import sys

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EXCEL_PATH = "reference_material/secure-controls-framework-scf-2025-3-1 (1).xlsx"

# Column indices (0-based)
COL_SCF_ID = 0           # A: SCF #
COL_AO_ID = 1            # B: SCF AO #
COL_STATEMENT = 2        # C: Assessment Objective statement
COL_ORIGIN = 3           # D: Origin(s)
COL_NOTES = 4            # E: Notes / Errata
COL_SCF_BASELINE = 5     # F: SCF Baseline AOs
COL_CMMC_L1 = 6          # G: CMMC Level 1 AOs
COL_DHS_ZTCF = 7         # H: DHS ZTCF AOs
COL_NIST_800_53_R5 = 8   # I: NIST 800-53 R5 AOs
COL_NIST_800_171_R2 = 9  # J: NIST 800-171 R2 AOs
COL_NIST_800_171_R3 = 10 # K: NIST 800-171 R3 AOs
COL_NIST_800_172 = 11    # L: NIST 800-172 AOs
COL_ASSET_TYPE = 12      # M: Asset Type
COL_PROCEDURE = 13       # N: Assessment Procedure
COL_EXPECTED = 14        # O: Expected Result(s)

# Framework codes for metadata
FRAMEWORK_COLUMNS = {
    COL_SCF_BASELINE: 'SCF_BASELINE',
    COL_CMMC_L1: 'CMMC_L1',
    COL_DHS_ZTCF: 'DHS_ZTCF',
    COL_NIST_800_53_R5: 'NIST_800_53_R5',
    COL_NIST_800_171_R2: 'NIST_800_171_R2',
    COL_NIST_800_171_R3: 'NIST_800_171_R3',
    COL_NIST_800_172: 'NIST_800_172',
}


def clean_text(text):
    """Clean and normalize text"""
    if text is None:
        return None
    text = str(text).strip()
    # Normalize multiple newlines
    while '\n\n' in text:
        text = text.replace('\n\n', '\n')
    return text if text else None


def is_marked(value):
    """Check if a cell is marked with 'x' or 'X'"""
    if value is None:
        return False
    return str(value).strip().lower() == 'x'


def extract_assessment_objectives(excel_path):
    """Extract AOs from Excel file with all columns"""
    print(f"Loading Excel file: {excel_path}")
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb['Assessment Objectives 2025.3.1']

    aos = []

    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        scf_id = clean_text(row[COL_SCF_ID])
        ao_id = clean_text(row[COL_AO_ID])
        statement = clean_text(row[COL_STATEMENT])

        # Skip rows without required fields
        if not scf_id or not ao_id or not statement:
            continue

        # Collect applicable frameworks
        frameworks = []
        for col_idx, framework_code in FRAMEWORK_COLUMNS.items():
            if is_marked(row[col_idx]):
                frameworks.append(framework_code)

        aos.append({
            'scf_control_id': scf_id,
            'ao_id': ao_id,
            'statement': statement,
            'origin': clean_text(row[COL_ORIGIN]),
            'notes': clean_text(row[COL_NOTES]),
            'asset_type': clean_text(row[COL_ASSET_TYPE]),
            'assessment_procedure': clean_text(row[COL_PROCEDURE]),
            'evidence_expected': clean_text(row[COL_EXPECTED]),
            'frameworks': frameworks,
        })

    print(f"Extracted {len(aos)} assessment objectives")

    # Print framework distribution
    print("\nFramework distribution:")
    for framework_code in FRAMEWORK_COLUMNS.values():
        count = sum(1 for ao in aos if framework_code in ao['frameworks'])
        print(f"  {framework_code}: {count}")

    return aos


def insert_aos(conn, aos):
    """Insert AOs into database using new schema"""

    # Build control ID mapping (scf_control_id -> UUID)
    print("\nBuilding control ID mapping...")
    with conn.cursor() as cur:
        cur.execute("SELECT id, control_id FROM scf_controls")
        control_map = {control_id: uuid for uuid, control_id in cur.fetchall()}

    print(f"Found {len(control_map)} controls in database")

    # Clear existing AOs (fresh import)
    with conn.cursor() as cur:
        cur.execute("DELETE FROM assessment_objectives")
        print(f"Cleared existing assessment objectives")

    # Prepare data for batch insert
    valid_aos = []
    skipped = 0
    missing_controls = set()

    for ao in aos:
        scf_id = ao['scf_control_id']
        if scf_id not in control_map:
            skipped += 1
            missing_controls.add(scf_id)
            continue

        # Build metadata JSONB with frameworks
        metadata = {
            'frameworks': ao['frameworks']
        }

        valid_aos.append((
            control_map[scf_id],         # control_id (UUID)
            ao['ao_id'],                  # ao_id (TEXT)
            ao['statement'],              # statement (TEXT)
            ao['origin'],                 # origin (TEXT)
            ao['notes'],                  # notes (TEXT)
            ao['asset_type'],             # asset_type (TEXT)
            ao['assessment_procedure'],   # assessment_procedure (TEXT)
            ao['evidence_expected'],      # evidence_expected (TEXT)
            json.dumps(metadata),         # metadata (JSONB)
        ))

    if missing_controls:
        print(f"\nWarning: {len(missing_controls)} unique control IDs not found in database:")
        for ctrl in sorted(missing_controls)[:10]:
            print(f"  - {ctrl}")
        if len(missing_controls) > 10:
            print(f"  ... and {len(missing_controls) - 10} more")

    print(f"\nInserting {len(valid_aos)} assessment objectives ({skipped} skipped)...")

    insert_sql = """
        INSERT INTO assessment_objectives
        (control_id, ao_id, statement, origin, notes, asset_type, assessment_procedure, evidence_expected, metadata)
        VALUES %s
    """

    with conn.cursor() as cur:
        execute_values(cur, insert_sql, valid_aos, page_size=500)
        conn.commit()

    print("Done!")


def verify_import(conn):
    """Verify the import and show statistics"""
    with conn.cursor() as cur:
        # Total count
        cur.execute("SELECT COUNT(*) FROM assessment_objectives")
        total = cur.fetchone()[0]
        print(f"\n{'='*60}")
        print(f"IMPORT COMPLETE: {total} assessment objectives")
        print(f"{'='*60}")

        # Count by framework
        print("\nBy Framework:")
        for framework_code in FRAMEWORK_COLUMNS.values():
            cur.execute("""
                SELECT COUNT(*)
                FROM assessment_objectives
                WHERE metadata->'frameworks' ? %s
            """, (framework_code,))
            count = cur.fetchone()[0]
            print(f"  {framework_code}: {count}")

        # Count by origin type
        cur.execute("""
            SELECT
                CASE
                    WHEN origin LIKE 'SCF Created%' THEN 'SCF Created'
                    WHEN origin LIKE '53A_%' THEN 'NIST 800-53A'
                    WHEN origin LIKE '171A_%' THEN 'NIST 800-171A'
                    ELSE 'Other'
                END as origin_type,
                COUNT(*)
            FROM assessment_objectives
            GROUP BY 1
            ORDER BY 2 DESC
        """)
        print("\nBy Origin Type:")
        for origin_type, count in cur.fetchall():
            print(f"  {origin_type}: {count}")

        # Sample data
        cur.execute("""
            SELECT
                ao.ao_id,
                sc.control_id as scf_id,
                LEFT(ao.statement, 60) as statement,
                ao.origin,
                ao.metadata->'frameworks' as frameworks
            FROM assessment_objectives ao
            JOIN scf_controls sc ON ao.control_id = sc.id
            ORDER BY sc.control_id, ao.ao_id
            LIMIT 5
        """)
        print("\nSample Data:")
        for row in cur.fetchall():
            ao_id, scf_id, statement, origin, frameworks = row
            print(f"  {ao_id} ({scf_id})")
            print(f"    Statement: {statement}...")
            print(f"    Origin: {origin}")
            print(f"    Frameworks: {frameworks}")


def main():
    try:
        aos = extract_assessment_objectives(EXCEL_PATH)

        if not aos:
            print("No assessment objectives found")
            return 1

        print("\nConnecting to database...")
        conn = psycopg2.connect(DB_URL)

        insert_aos(conn, aos)
        verify_import(conn)

        conn.close()
        return 0

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
