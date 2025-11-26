#!/usr/bin/env python3
"""
Import NIST CSF v2.0 framework controls into the database
"""

import csv
import psycopg2
import psycopg2.extras
from datetime import datetime

# Database connection
conn = psycopg2.connect(
    host='127.0.0.1',
    port=54322,
    user='postgres',
    password='postgres',
    database='postgres'
)
conn.autocommit = False
cur = conn.cursor()

try:
    # First, insert or get the NIST CSF v2.0 framework
    cur.execute("""
        INSERT INTO frameworks (code, name, version, description, created_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (code, version) DO UPDATE 
        SET name = EXCLUDED.name, description = EXCLUDED.description
        RETURNING id
    """, (
        'NIST-CSF',
        'NIST Cybersecurity Framework',
        '2.0',
        'The NIST Cybersecurity Framework provides guidance on managing and reducing cybersecurity risk.',
        datetime.now()
    ))
    
    framework_id = cur.fetchone()[0]
    print(f"✓ Framework ID: {framework_id}")
    
    # Read the CSV file
    controls_added = 0
    with open('reference_material/NIST_CSF_V2.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        
        for row in reader:
            # Skip empty rows
            if not row or len(row) < 5:
                continue
            
            level = row[0]
            col2 = row[1]
            col3 = row[2]
            col4 = row[3]
            col5 = row[4]
            
            # Level 3 rows contain the actual controls
            if level == '3':
                # Extract function/category from col2
                function_desc = col2
                function = function_desc.split('(')[1].split(')')[0] if '(' in function_desc else ''
                
                # Extract subcategory from col3
                subcategory_desc = col3
                subcategory_code = subcategory_desc.split('(')[1].split(')')[0] if '(' in subcategory_desc else ''
                subcategory_name = subcategory_desc.split(':')[0].strip() if ':' in subcategory_desc else subcategory_desc
                
                # col4 is the control ID (e.g., "GV.OC-01")
                control_id = col4
                
                # col5 is the full control text
                control_text = col5
                title = control_text.split(':')[0] if ':' in control_text else control_text
                description = control_text.split(':', 1)[1].strip() if ':' in control_text else ''
                
                # Insert the control
                try:
                    cur.execute("""
                        INSERT INTO external_controls 
                        (framework_id, ref_code, description, metadata, created_at)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (framework_id, ref_code) 
                        DO UPDATE SET 
                            description = EXCLUDED.description,
                            metadata = EXCLUDED.metadata
                    """, (
                        framework_id,
                        control_id,
                        control_text,
                        psycopg2.extras.Json({
                            'title': title,
                            'function': function,
                            'function_description': function_desc,
                            'subcategory': subcategory_name,
                            'subcategory_code': subcategory_code,
                            'subcategory_description': subcategory_desc
                        }),
                        datetime.now()
                    ))
                    controls_added += 1
                    if controls_added % 10 == 0:
                        print(f"  Processed {controls_added} controls...")
                except Exception as e:
                    print(f"Error inserting {control_id}: {e}")
                    raise
    
    conn.commit()
    print(f"\n✓ Successfully imported {controls_added} NIST CSF v2.0 controls")
    
    # Verify
    cur.execute("SELECT COUNT(*) FROM external_controls WHERE framework_id = %s", (framework_id,))
    total = cur.fetchone()[0]
    print(f"✓ Total controls in database: {total}")
    
except Exception as e:
    conn.rollback()
    print(f"✗ Error: {e}")
    raise
finally:
    cur.close()
    conn.close()
