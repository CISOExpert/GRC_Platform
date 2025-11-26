#!/usr/bin/env python3
"""
Import Authoritative Sources (259 frameworks) from SCF Excel
Updates existing frameworks and inserts new ones with geography and source metadata
"""

import openpyxl
import psycopg2
from psycopg2.extras import execute_values
import sys
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EXCEL_PATH = "/Users/doneil/SynologyDrive/GRC_Unified_Platform/reference_material/secure-controls-framework-scf-2025-3-1 (1).xlsx"

def clean_text(text):
    """Clean and normalize text"""
    if text is None:
        return None
    text = str(text).strip()
    # Remove extra newlines
    text = re.sub(r'\n+', ' ', text)
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text)
    return text if text else None

def normalize_framework_name(header_text):
    """
    Extract framework name and version from column header
    Returns: (code, name, version)
    """
    if not header_text:
        return None, None, None
    
    header = clean_text(header_text)
    
    # Common patterns
    patterns = [
        # ISO 27001 v2022 -> ISO-27001, ISO 27001, 2022
        (r'ISO\s*(\d+)(?:[:\-]\d+)?\s*(?:v?(\d{4}))?', lambda m: ('ISO-' + m.group(1), 'ISO ' + m.group(1), m.group(2))),
        # NIST CSF 2.0 -> NIST-CSF, NIST CSF, 2.0
        (r'NIST\s+CSF\s+(?:v?)([\d.]+)', lambda m: ('NIST-CSF', 'NIST CSF', m.group(1))),
        # CIS CSC v8.1 -> CIS-CSC, CIS Controls, v8.1
        (r'CIS\s+CSC\s+v([\d.]+)', lambda m: ('CIS-CSC', 'CIS Controls', 'v' + m.group(1))),
        # GDPR (just GDPR, or EU GDPR) -> GDPR, GDPR, 2018
        (r'(?:EU\s+)?GDPR', lambda m: ('GDPR', 'GDPR', '2018')),
        # PCI DSS v4.0.1 -> PCI-DSS, PCI DSS, v4.0.1
        (r'PCI\s+DSS\s+v([\d.]+)', lambda m: ('PCI-DSS', 'PCI DSS', 'v' + m.group(1))),
        # SOC 2 (AICPA TSC) -> SOC-2, SOC 2, 2017:2022
        (r'AICPA\s+TSC\s+([\d:]+)\s*\(used for SOC 2\)', lambda m: ('SOC-2', 'SOC 2', m.group(1))),
        # Generic: "Framework vX.Y" -> FRAMEWORK, Framework, vX.Y
        (r'([A-Z][A-Za-z0-9\s]+?)\s+v?([\d.]+)', lambda m: (m.group(1).replace(' ', '-').upper(), m.group(1), m.group(2))),
    ]
    
    for pattern, extractor in patterns:
        match = re.search(pattern, header, re.IGNORECASE)
        if match:
            try:
                code, name, version = extractor(match)
                return code, name, version
            except:
                pass
    
    # Fallback: use first word/acronym as code
    words = header.split()
    if words:
        code = words[0].upper()
        return code, header, None
    
    return None, header, None

def main():
    print("=" * 80)
    print("SCF AUTHORITATIVE SOURCES IMPORT")
    print("=" * 80)
    
    # Connect to database
    print("\n1. Connecting to database...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # Load Excel
    print("2. Loading Excel workbook...")
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
    ws = wb['Authoritative Sources']
    
    # Extract frameworks
    print("3. Extracting frameworks...")
    frameworks = []
    row_count = 0
    
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row[0] and not row[1]:  # Skip empty rows
            continue
        
        row_count += 1
        geography = clean_text(row[0])
        mapping_header = clean_text(row[1])
        source = clean_text(row[2]) if len(row) > 2 else None
        
        if not mapping_header:
            continue
        
        # Try to normalize name
        code, name, version = normalize_framework_name(mapping_header)
        
        if not code or not name:
            # Fallback: use mapping header directly
            code = re.sub(r'[^\w\-]', '', mapping_header[:50]).upper()
            name = mapping_header[:100]
        
        frameworks.append({
            'geography': geography,
            'mapping_column_header': mapping_header,
            'source_organization': source,
            'code': code,
            'name': name,
            'version': version
        })
    
    print(f"   Extracted {len(frameworks)} frameworks from {row_count} rows")
    
    # Insert/Update frameworks
    print("4. Inserting/updating frameworks...")
    insert_count = 0
    update_count = 0
    
    for fw in frameworks:
        # Check if framework exists
        cur.execute(
            "SELECT id FROM frameworks WHERE code = %s AND (version = %s OR (version IS NULL AND %s IS NULL))",
            (fw['code'], fw['version'], fw['version'])
        )
        existing = cur.fetchone()
        
        if existing:
            # Update existing
            cur.execute("""
                UPDATE frameworks
                SET geography = %s,
                    source_organization = %s,
                    mapping_column_header = %s,
                    name = COALESCE(name, %s)
                WHERE id = %s
            """, (
                fw['geography'],
                fw['source_organization'],
                fw['mapping_column_header'],
                fw['name'],
                existing[0]
            ))
            update_count += 1
        else:
            # Insert new
            cur.execute("""
                INSERT INTO frameworks (code, name, version, geography, source_organization, mapping_column_header)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (code, version) DO UPDATE
                SET geography = EXCLUDED.geography,
                    source_organization = EXCLUDED.source_organization,
                    mapping_column_header = EXCLUDED.mapping_column_header
            """, (
                fw['code'],
                fw['name'],
                fw['version'],
                fw['geography'],
                fw['source_organization'],
                fw['mapping_column_header']
            ))
            insert_count += 1
    
    conn.commit()
    
    # Report
    print("\n" + "=" * 80)
    print("IMPORT COMPLETE")
    print("=" * 80)
    print(f"Total frameworks processed: {len(frameworks)}")
    print(f"New frameworks inserted:    {insert_count}")
    print(f"Existing frameworks updated: {update_count}")
    
    # Verify
    cur.execute("SELECT COUNT(*) FROM frameworks")
    total = cur.fetchone()[0]
    print(f"Total frameworks in database: {total}")
    
    cur.close()
    conn.close()
    
    print("\n✓ Authoritative Sources import successful!")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n✗ ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
