#!/usr/bin/env python3
"""
Import SCF Controls from Excel into Supabase Database
Extracts controls with PPTDF flags and framework mappings
"""

import openpyxl
import psycopg2
from psycopg2.extras import execute_values
import sys

# Database connection
DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Excel file path
EXCEL_PATH = "/Users/doneil/SynologyDrive/GRC_Unified_Platform/reference_material/secure-controls-framework-scf-2025-3-1 (1).xlsx"

# Column mappings (0-indexed)
COLUMNS = {
    'domain': 0,           # SCF Domain
    'title': 1,            # SCF Control
    'control_id': 2,       # SCF #
    'description': 3,      # Control Description
    'weight': 12,          # Relative Control Weighting
    'people': 13,          # PPTDF People
    'process': 14,         # PPTDF Process
    'technology': 15,      # PPTDF Technology
    'data': 16,            # PPTDF Data
    'facility': 17,        # PPTDF Facility
    # Framework mappings
    'nist_csf': 18,        # NIST CSF Function Grouping
    'cis_controls': 31,    # CIS CSC v8.1
    'cobit': 35,           # COBIT 2019
    'ccm': 37,             # CSA CCM v4
    'iso_27001_2013': 45,  # ISO 27001 v2013
    'iso_27001_2022': 46,  # ISO 27001 v2022
    'iso_27002_2013': 47,  # ISO 27002 v2013
    'iso_27002_2022': 48,  # ISO 27002 v2022
    'nist_800_53_r4': 64,  # NIST 800-53 rev4
    'nist_800_53_r5': 68,  # NIST 800-53 rev5
    'pci_dss': 96,         # PCI DSS v4.0.1
    'hipaa': 153,          # HIPAA Security Rule
    'sox': 164,            # SOX
    'gdpr': 199,           # GDPR
}

def has_x(cell_value):
    """Check if cell contains 'x' marking"""
    if cell_value is None:
        return False
    return 'x' in str(cell_value).lower().strip()

def clean_text(text):
    """Clean and normalize text"""
    if text is None:
        return None
    text = str(text).strip()
    # Remove multiple newlines
    while '\n\n' in text:
        text = text.replace('\n\n', '\n')
    return text if text else None

def parse_weight(weight_str):
    """Parse weight value"""
    if weight_str is None:
        return 1.0
    try:
        return float(weight_str)
    except:
        return 1.0

def extract_controls(excel_path):
    """Extract controls from Excel file"""
    print(f"Loading Excel file: {excel_path}")
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb['SCF 2025.3.1']
    
    controls = []
    
    # Skip header row, process data rows
    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not row[COLUMNS['control_id']]:  # Skip rows without control ID
            continue
            
        control_id = clean_text(row[COLUMNS['control_id']])
        if not control_id:
            continue
            
        control = {
            'control_id': control_id,
            'title': clean_text(row[COLUMNS['title']]),
            'description': clean_text(row[COLUMNS['description']]),
            'domain': clean_text(row[COLUMNS['domain']]),
            'weight': parse_weight(row[COLUMNS['weight']]),
            'scf_version': '2025.3.1',
            
            # PPTDF flags
            'applicability_people': has_x(row[COLUMNS['people']]),
            'applicability_processes': has_x(row[COLUMNS['process']]),
            'applicability_technology': has_x(row[COLUMNS['technology']]),
            'applicability_data': has_x(row[COLUMNS['data']]),
            'applicability_facilities': has_x(row[COLUMNS['facility']]),
            
            # Framework mappings (text columns for now)
            'nist_csf': clean_text(row[COLUMNS['nist_csf']]),
            'nist_800_53': clean_text(row[COLUMNS['nist_800_53_r5']]) or clean_text(row[COLUMNS['nist_800_53_r4']]),
            'iso_27001': clean_text(row[COLUMNS['iso_27001_2022']]) or clean_text(row[COLUMNS['iso_27001_2013']]),
            'iso_27002': clean_text(row[COLUMNS['iso_27002_2022']]) or clean_text(row[COLUMNS['iso_27002_2013']]),
            'pci_dss': clean_text(row[COLUMNS['pci_dss']]),
            'hipaa': clean_text(row[COLUMNS['hipaa']]),
            'gdpr': clean_text(row[COLUMNS['gdpr']]),
            'sox': clean_text(row[COLUMNS['sox']]),
            'cobit': clean_text(row[COLUMNS['cobit']]),
            'cis_controls': clean_text(row[COLUMNS['cis_controls']]),
            'ccm': clean_text(row[COLUMNS['ccm']]),
        }
        
        # Validate required fields
        if not all([control['control_id'], control['title'], control['description'], control['domain']]):
            print(f"Warning: Skipping row {row_num} - missing required fields")
            continue
            
        controls.append(control)
    
    print(f"Extracted {len(controls)} controls")
    return controls

def check_existing_controls(conn):
    """Check if controls already exist"""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM scf_controls")
        count = cur.fetchone()[0]
        return count

def insert_controls(conn, controls):
    """Insert controls into database"""
    # First check if we need to add framework mapping columns
    with conn.cursor() as cur:
        # Check if framework columns exist
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'scf_controls' 
            AND column_name IN ('nist_csf', 'nist_800_53', 'iso_27001', 'iso_27002', 
                                'pci_dss', 'hipaa', 'gdpr', 'sox', 'cobit', 
                                'cis_controls', 'ccm')
        """)
        existing_cols = [row[0] for row in cur.fetchall()]
        
        # Add missing columns
        framework_cols = ['nist_csf', 'nist_800_53', 'iso_27001', 'iso_27002', 
                         'pci_dss', 'hipaa', 'gdpr', 'sox', 'cobit', 
                         'cis_controls', 'ccm']
        
        for col in framework_cols:
            if col not in existing_cols:
                print(f"Adding column: {col}")
                cur.execute(f"ALTER TABLE scf_controls ADD COLUMN IF NOT EXISTS {col} text")
        
        conn.commit()
    
    # Prepare insert statement
    insert_sql = """
        INSERT INTO scf_controls (
            control_id, title, description, domain, weight, scf_version,
            applicability_people, applicability_processes, applicability_technology,
            applicability_data, applicability_facilities,
            nist_csf, nist_800_53, iso_27001, iso_27002, pci_dss,
            hipaa, gdpr, sox, cobit, cis_controls, ccm
        ) VALUES %s
        ON CONFLICT (control_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            domain = EXCLUDED.domain,
            weight = EXCLUDED.weight,
            scf_version = EXCLUDED.scf_version,
            applicability_people = EXCLUDED.applicability_people,
            applicability_processes = EXCLUDED.applicability_processes,
            applicability_technology = EXCLUDED.applicability_technology,
            applicability_data = EXCLUDED.applicability_data,
            applicability_facilities = EXCLUDED.applicability_facilities,
            nist_csf = EXCLUDED.nist_csf,
            nist_800_53 = EXCLUDED.nist_800_53,
            iso_27001 = EXCLUDED.iso_27001,
            iso_27002 = EXCLUDED.iso_27002,
            pci_dss = EXCLUDED.pci_dss,
            hipaa = EXCLUDED.hipaa,
            gdpr = EXCLUDED.gdpr,
            sox = EXCLUDED.sox,
            cobit = EXCLUDED.cobit,
            cis_controls = EXCLUDED.cis_controls,
            ccm = EXCLUDED.ccm,
            updated_at = now()
    """
    
    # Prepare values
    values = [
        (
            c['control_id'], c['title'], c['description'], c['domain'], 
            c['weight'], c['scf_version'],
            c['applicability_people'], c['applicability_processes'], 
            c['applicability_technology'], c['applicability_data'], 
            c['applicability_facilities'],
            c['nist_csf'], c['nist_800_53'], c['iso_27001'], c['iso_27002'],
            c['pci_dss'], c['hipaa'], c['gdpr'], c['sox'], c['cobit'],
            c['cis_controls'], c['ccm']
        )
        for c in controls
    ]
    
    print(f"Inserting {len(values)} controls...")
    with conn.cursor() as cur:
        execute_values(cur, insert_sql, values)
        conn.commit()
    
    print("✅ Controls imported successfully!")

def main():
    try:
        # Extract controls from Excel
        controls = extract_controls(EXCEL_PATH)
        
        if not controls:
            print("❌ No controls found in Excel file")
            return 1
        
        # Connect to database
        print("\nConnecting to database...")
        conn = psycopg2.connect(DB_URL)
        
        # Check existing data
        existing_count = check_existing_controls(conn)
        if existing_count > 0:
            response = input(f"\n⚠️  Database already has {existing_count} controls. Overwrite? (yes/no): ")
            if response.lower() != 'yes':
                print("Import cancelled")
                return 0
        
        # Insert controls
        insert_controls(conn, controls)
        
        # Verify
        new_count = check_existing_controls(conn)
        print(f"\n✅ Import complete! Database now has {new_count} controls")
        
        # Show sample
        with conn.cursor() as cur:
            cur.execute("""
                SELECT control_id, title, domain, 
                       applicability_people, applicability_processes,
                       applicability_technology, applicability_data,
                       applicability_facilities
                FROM scf_controls 
                ORDER BY control_id 
                LIMIT 5
            """)
            print("\nSample controls:")
            for row in cur.fetchall():
                pptdf = []
                if row[3]: pptdf.append('P')
                if row[4]: pptdf.append('P')
                if row[5]: pptdf.append('T')
                if row[6]: pptdf.append('D')
                if row[7]: pptdf.append('F')
                print(f"  {row[0]}: {row[1][:50]}... [{row[2]}] PPTDF: {'/'.join(pptdf)}")
        
        conn.close()
        return 0
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
