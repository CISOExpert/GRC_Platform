import os
from typing import List, Dict, Any

import psycopg2
import openpyxl


EXCEL_PATH = os.path.join(os.path.dirname(__file__), "..", "reference_material", "secure-controls-framework-scf-2025-3-1 (1).xlsx")
SCF_SHEET_NAME = "SCF 2025.3.1"


def normalize_header(value: Any) -> str:
    """Normalize an Excel header to match frameworks.mapping_column_header style.

    - Convert None to empty string.
    - Replace newlines and tabs with spaces.
    - Collapse multiple spaces.
    - Trim leading/trailing whitespace.
    """
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    # Replace newlines/tabs with spaces
    value = value.replace("\n", " ").replace("\r", " ").replace("\t", " ")
    # Collapse multiple spaces
    value = " ".join(value.split())
    return value.strip()


def load_excel_mapping_headers() -> List[str]:
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    sheet = wb[SCF_SHEET_NAME]
    # Columns AC (29) through NJ (273) are the framework mapping columns in the SCF sheet
    headers: List[str] = []
    for col_idx in range(29, 274):
        cell = sheet.cell(row=1, column=col_idx)
        raw_value = cell.value
        norm = normalize_header(raw_value)
        if norm:
            headers.append(norm)
    wb.close()
    return headers


def get_db_connection():
    # Uses Supabase local defaults; adjust via env vars if needed.
    # Note: Supabase local exposes Postgres on 54322 by default.
    return psycopg2.connect(
        dbname=os.getenv("SUPABASE_DB_NAME", "postgres"),
        user=os.getenv("SUPABASE_DB_USER", "postgres"),
        password=os.getenv("SUPABASE_DB_PASSWORD", "postgres"),
        host=os.getenv("SUPABASE_DB_HOST", "127.0.0.1"),
        port=int(os.getenv("SUPABASE_DB_PORT", "54322")),
    )


def load_frameworks_with_counts(conn) -> List[Dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM get_frameworks_with_counts();")
        cols = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
    return [dict(zip(cols, row)) for row in rows]


def load_frameworks_by_header(conn) -> Dict[str, Dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, code, name, version, mapping_column_header
            FROM frameworks
            WHERE mapping_column_header IS NOT NULL
            """
        )
        rows = cur.fetchall()
    result: Dict[str, Dict[str, Any]] = {}
    for framework_id, code, name, version, header in rows:
        if header is None:
            continue
        key = normalize_header(header)
        result[key] = {
            "id": framework_id,
            "code": code,
            "name": name,
            "version": version,
            "mapping_column_header": key,
        }
    return result


def main() -> None:
    print("Loading Excel mapping headers...")
    excel_headers = load_excel_mapping_headers()
    print(f"Excel mapping columns (non-empty headers): {len(excel_headers)}")

    conn = get_db_connection()
    try:
        print("Loading frameworks with counts from database...")
        fw_counts = load_frameworks_with_counts(conn)
        by_code = {row["code"]: row for row in fw_counts}

        print("Loading frameworks by mapping_column_header from database...")
        fw_by_header = load_frameworks_by_header(conn)

        excel_set = set(excel_headers)
        db_header_set = set(fw_by_header.keys())

        missing_in_db = sorted(excel_set - db_header_set)
        extra_in_db = sorted(db_header_set - excel_set)
        matched = sorted(excel_set & db_header_set)

        print("\n=== Summary ===")
        print(f"Excel headers: {len(excel_headers)}")
        print(f"Frameworks with mapping_column_header in DB: {len(db_header_set)}")
        print(f"Matched headers: {len(matched)}")
        print(f"Missing in DB (Excel column has no framework row): {len(missing_in_db)}")
        print(f"Extra in DB (framework has header not present as Excel column): {len(extra_in_db)}")

        print("\n=== Frameworks with mappings vs without (for matched headers) ===")
        no_mappings: List[str] = []
        for header in matched:
            fw = fw_by_header[header]
            code = fw["code"]
            counts = by_code.get(code)
            mapping_count = counts.get("mapping_count", 0) if counts else 0
            control_count = counts.get("external_control_count", 0) if counts else 0
            status = "OK" if mapping_count > 0 else "NO_MAPPINGS"
            if mapping_count == 0:
                no_mappings.append(header)
            print(
                f"{code:20s} | {header[:40]:40s} | controls={control_count:5d} | mappings={mapping_count:5d} | {status}"
            )

        print("\n=== Excel headers missing a DB framework (first 50) ===")
        for h in missing_in_db[:50]:
            print(f"MISSING_DB_HEADER | {h}")

        print("\n=== DB frameworks with headers not found in Excel (first 50) ===")
        for h in extra_in_db[:50]:
            fw = fw_by_header[h]
            print(f"EXTRA_DB_HEADER   | {fw['code']:20s} | {h}")

        print("\n=== Matched headers with NO mappings (first 50) ===")
        for h in no_mappings[:50]:
            fw = fw_by_header[h]
            code = fw["code"]
            counts = by_code.get(code)
            mapping_count = counts.get("mapping_count", 0) if counts else 0
            print(f"NO_MAPPINGS      | {code:20s} | {h} | mappings={mapping_count}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
