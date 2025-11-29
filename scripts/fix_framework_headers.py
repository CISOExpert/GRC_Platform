#!/usr/bin/env python3
"""
Analyze and Fix Framework Mapping Headers

Compares database mapping_column_header values against Excel headers (with newlines)
and generates SQL UPDATE statements to fix mismatches.
"""

import openpyxl
import psycopg2
import sys

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EXCEL_PATH = "/reference_material/secure-controls-framework-scf-2025-3-1 (1).xlsx"

FRAMEWORK_MAPPING_START = 28
FRAMEWORK_MAPPING_END = 269

def normalize_for_comparison(text):
    """Normalize text for comparison (collapse whitespace but preserve structure)"""
    if text is None:
        return None
    text = str(text).strip()
    # Normalize multiple spaces/newlines to single space for comparison
    import re
    normalized = re.sub(r'\s+', ' ', text)
    return normalized if normalized else None

def main():
    print("=" * 100)
    print("FRAMEWORK MAPPING HEADER ANALYSIS")
    print("=" * 100)
    
    # 1. Read Excel headers
    print("\n1. Reading Excel headers from SCF 2025.3.1 worksheet...")
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=False)
    ws = wb['SCF 2025.3.1']
    
    # Get first row (headers)
    header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
    
    excel_headers = {}
    for col_idx in range(FRAMEWORK_MAPPING_START, min(FRAMEWORK_MAPPING_END + 1, len(header_row))):
        header_value = header_row[col_idx]
        if header_value:
            # Keep original with newlines
            original = str(header_value).strip()
            if original:
                excel_headers[col_idx] = original
    
    print(f"   Found {len(excel_headers)} non-empty framework column headers")
    
    # 2. Query database
    print("\n2. Querying database frameworks...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, code, version, mapping_column_header
        FROM frameworks
        WHERE mapping_column_header IS NOT NULL
        ORDER BY code, version
    """)
    
    db_frameworks = cur.fetchall()
    print(f"   Found {len(db_frameworks)} frameworks with mapping_column_header set")
    
    # 3. Build lookup for Excel headers (both original and normalized)
    excel_normalized_to_original = {}
    for idx, header in excel_headers.items():
        normalized = normalize_for_comparison(header)
        if normalized:
            excel_normalized_to_original[normalized] = header
    
    # 4. Compare
    print("\n3. Comparing database headers against Excel headers...")
    results = []
    mismatches = []
    
    for fw_id, code, version, db_header in db_frameworks:
        db_normalized = normalize_for_comparison(db_header)
        
        # Check for exact match
        exact_match = db_header in excel_headers.values()
        
        if exact_match:
            status = "MATCH"
            excel_header = db_header
        elif db_normalized in excel_normalized_to_original:
            # Same content but different whitespace (newlines vs spaces)
            status = "MISMATCH"
            excel_header = excel_normalized_to_original[db_normalized]
            mismatches.append({
                'id': fw_id,
                'code': code,
                'version': version,
                'db_header': db_header,
                'excel_header': excel_header
            })
        else:
            # Not found at all
            status = "NOT_FOUND"
            excel_header = "N/A"
        
        version_str = version if version else "N/A"
        results.append({
            'code': code,
            'version': version_str,
            'status': status,
            'db_header': db_header,
            'excel_header': excel_header
        })
    
    # 5. Print summary
    match_count = sum(1 for r in results if r['status'] == "MATCH")
    mismatch_count = sum(1 for r in results if r['status'] == "MISMATCH")
    not_found_count = sum(1 for r in results if r['status'] == "NOT_FOUND")
    
    print("\n" + "=" * 100)
    print("STATISTICS")
    print("=" * 100)
    print(f"Total frameworks:     {len(results)}")
    print(f"Exact matches:        {match_count}")
    print(f"Mismatches (fixable): {mismatch_count}")
    print(f"Not found in Excel:   {not_found_count}")
    
    # 6. Apply fixes
    if mismatches:
        print("\n" + "=" * 100)
        print("APPLYING FIXES TO DATABASE")
        print("=" * 100)
        
        for m in mismatches:
            version_clause = "AND version = %s" if m['version'] else "AND version IS NULL"
            version_param = m['version'] if m['version'] else None
            
            if m['version']:
                cur.execute(
                    f"UPDATE frameworks SET mapping_column_header = %s WHERE code = %s AND version = %s",
                    (m['excel_header'], m['code'], m['version'])
                )
            else:
                cur.execute(
                    "UPDATE frameworks SET mapping_column_header = %s WHERE code = %s AND version IS NULL",
                    (m['excel_header'], m['code'])
                )
            
            print(f"  ✓ Fixed {m['code']} {m['version'] if m['version'] else 'N/A'}")
        
        conn.commit()
        print(f"\n✓ Successfully updated {len(mismatches)} frameworks")
    else:
        print("\n✓ No mismatches found - all headers match exactly!")
    
    # 7. Show sample of what was fixed
    if mismatches:
        print("\n" + "=" * 100)
        print("SAMPLE OF FIXES (first 5)")
        print("=" * 100)
        for m in mismatches[:5]:
            print(f"\n{m['code']} {m['version'] if m['version'] else 'N/A'}:")
            print(f"  Before: {repr(m['db_header'][:80])}")
            print(f"  After:  {repr(m['excel_header'][:80])}")
    
    cur.close()
    conn.close()
    
    print("\n" + "=" * 100)
    print("ANALYSIS COMPLETE")
    print("=" * 100)
    
    return len(mismatches)

if __name__ == '__main__':
    try:
        mismatches_fixed = main()
        sys.exit(0 if mismatches_fixed >= 0 else 1)
    except Exception as e:
        print(f"\n✗ ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
