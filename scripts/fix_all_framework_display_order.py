#!/usr/bin/env python3
"""
Set display_order for ALL frameworks based on natural numeric/alphanumeric sorting.
This ensures controls are displayed in logical order (1, 2, 3... not 1, 10, 11, 2, 3...).
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


def natural_sort_key(ref_code):
    """
    Generate a sort key for natural ordering.
    Handles patterns like:
    - AC-1, AC-2, AC-10 (NIST 800-53)
    - 1.1, 1.2, 1.10 (CIS)
    - GV.RM-01, GV.RM-02 (CSF)
    - APO01.01, APO01.10 (COBIT)
    """
    result = []

    # Split on boundaries between numbers and non-numbers
    parts = re.split(r'(\d+)', ref_code)

    for part in parts:
        if part.isdigit():
            # Numeric parts - sort as integers
            result.append((0, int(part), ''))
        elif part:
            # Alpha/symbol parts - sort as strings
            result.append((1, 0, part.lower()))

    # Pad to ensure consistent comparison
    while len(result) < 10:
        result.append((2, 0, ''))

    return tuple(result)


def process_framework(conn, fw_id, fw_name):
    """Set display_order for all controls in a framework."""
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get all controls
    cur.execute(
        "SELECT id, ref_code FROM external_controls WHERE framework_id = %s",
        (fw_id,)
    )
    controls = cur.fetchall()

    if not controls:
        return 0

    # Sort by natural order
    sorted_controls = sorted(controls, key=lambda c: natural_sort_key(c['ref_code']))

    # Update display_order
    updates = [(i, c['id']) for i, c in enumerate(sorted_controls)]

    cur.executemany(
        "UPDATE external_controls SET display_order = %s WHERE id = %s",
        updates
    )
    conn.commit()

    return len(updates)


def main():
    print("=" * 60)
    print("Set Display Order for ALL Frameworks")
    print("=" * 60)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get all frameworks
    cur.execute("SELECT id, code, name, version FROM frameworks ORDER BY code, version")
    frameworks = cur.fetchall()

    print(f"Processing {len(frameworks)} frameworks...\n")

    total_updated = 0
    for fw in frameworks:
        count = process_framework(conn, fw['id'], fw['name'])
        if count > 0:
            print(f"  ✓ {fw['code']} ({fw['version']}): {count} controls")
            total_updated += count

    conn.close()

    print(f"\n" + "=" * 60)
    print(f"COMPLETE: Set display_order for {total_updated} controls")
    print("=" * 60)


if __name__ == '__main__':
    main()
