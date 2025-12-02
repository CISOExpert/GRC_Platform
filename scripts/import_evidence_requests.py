#!/usr/bin/env python3
"""
Import Evidence Request List from SCF Excel file into GRC Platform database.
265 evidence requests across 28 areas of focus with SCF control mappings.
"""

import openpyxl
import psycopg2
from psycopg2.extras import execute_values
import sys

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 54322,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}

EXCEL_PATH = '/app/reference_material/secure-controls-framework-scf-2025-3-1 (1).xlsx'
SHEET_NAME = 'Evidence Request List 2025.3.1'


def get_scf_controls(cursor):
    """Get all SCF controls as a dict mapping ref_code -> id"""
    cursor.execute("""
        SELECT ec.id, ec.ref_code
        FROM external_controls ec
        JOIN frameworks f ON ec.framework_id = f.id
        WHERE f.code = 'SCF'
    """)
    return {row[1]: row[0] for row in cursor.fetchall()}


def parse_control_mappings(mappings_cell):
    """Parse the SCF Control Mappings cell (newline-separated control IDs)"""
    if not mappings_cell:
        return []

    mappings = []
    for line in str(mappings_cell).split('\n'):
        ref = line.strip()
        if ref:
            mappings.append(ref)
    return mappings


def import_evidence_requests():
    print("Loading Excel workbook...")
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True)
    ws = wb[SHEET_NAME]

    print("Connecting to database...")
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    try:
        # Get SCF control mapping
        print("Loading SCF controls...")
        scf_controls = get_scf_controls(cursor)
        print(f"  Found {len(scf_controls)} SCF controls")

        # Clear existing data
        print("Clearing existing evidence request data...")
        cursor.execute("DELETE FROM evidence_request_control_mappings")
        cursor.execute("DELETE FROM evidence_requests")

        # Parse Excel data
        evidence_requests = []
        mappings = []
        missing_controls = set()

        print("Parsing Evidence Request List...")
        for row in ws.iter_rows(min_row=2, values_only=True):
            sort_order = row[0]  # #
            erl_id = row[1]       # ERL #
            area = row[2]         # Area of Focus
            artifact = row[3]     # Documentation Artifact
            description = row[4]  # Artifact Description
            control_refs = row[5] # SCF Control Mappings

            if not erl_id:
                continue

            evidence_requests.append({
                'sort_order': int(sort_order) if sort_order else 0,
                'erl_id': str(erl_id).strip(),
                'area_of_focus': str(area).strip() if area else '',
                'documentation_artifact': str(artifact).strip() if artifact else '',
                'artifact_description': str(description).strip() if description else ''
            })

            # Parse control mappings
            control_list = parse_control_mappings(control_refs)
            for ref in control_list:
                if ref in scf_controls:
                    mappings.append({
                        'erl_id': str(erl_id).strip(),
                        'control_id': scf_controls[ref],
                        'control_ref': ref
                    })
                else:
                    missing_controls.add(ref)

        print(f"  Parsed {len(evidence_requests)} evidence requests")
        print(f"  Found {len(mappings)} control mappings")
        if missing_controls:
            print(f"  Warning: {len(missing_controls)} control refs not found: {sorted(missing_controls)[:10]}...")

        # Insert evidence requests
        print("Inserting evidence requests...")
        insert_sql = """
            INSERT INTO evidence_requests (sort_order, erl_id, area_of_focus, documentation_artifact, artifact_description)
            VALUES %s
            RETURNING id, erl_id
        """
        values = [(
            er['sort_order'],
            er['erl_id'],
            er['area_of_focus'],
            er['documentation_artifact'],
            er['artifact_description']
        ) for er in evidence_requests]

        result = execute_values(cursor, insert_sql, values, fetch=True)
        erl_id_to_uuid = {row[1]: row[0] for row in result}
        print(f"  Inserted {len(erl_id_to_uuid)} evidence requests")

        # Insert mappings
        print("Inserting control mappings...")
        mapping_values = []
        for m in mappings:
            if m['erl_id'] in erl_id_to_uuid:
                mapping_values.append((
                    erl_id_to_uuid[m['erl_id']],
                    m['control_id'],
                    m['control_ref']
                ))

        if mapping_values:
            execute_values(
                cursor,
                """INSERT INTO evidence_request_control_mappings
                   (evidence_request_id, control_id, control_ref) VALUES %s""",
                mapping_values
            )
            print(f"  Inserted {len(mapping_values)} control mappings")

        # Update evidence_request_count on external_controls
        print("Updating evidence request counts on controls...")
        cursor.execute("""
            UPDATE external_controls ec
            SET evidence_request_count = (
                SELECT COUNT(*)
                FROM evidence_request_control_mappings erm
                WHERE erm.control_id = ec.id
            )
            WHERE ec.framework_id = (SELECT id FROM frameworks WHERE code = 'SCF')
        """)

        conn.commit()
        print("Import completed successfully!")

        # Print summary
        cursor.execute("SELECT COUNT(*) FROM evidence_requests")
        total_requests = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM evidence_request_control_mappings")
        total_mappings = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(DISTINCT area_of_focus) FROM evidence_requests")
        total_areas = cursor.fetchone()[0]

        print(f"\nSummary:")
        print(f"  Evidence Requests: {total_requests}")
        print(f"  Control Mappings: {total_mappings}")
        print(f"  Areas of Focus: {total_areas}")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    import_evidence_requests()
