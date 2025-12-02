#!/usr/bin/env python3
"""
Fix ISO frameworks:
1. Create clause-level parent groups (4, 5, 6, 7, 8, 9, 10)
2. Set parent relationships (5.1 → 5, 5.1(a) → 5.1)
3. Set display_order for natural numeric sorting
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# ISO frameworks to process
ISO_FRAMEWORKS = [
    ('ISO-27001', 'ISO/IEC 27001:2022'),
    ('ISO-27001', 'ISO/IEC 27001:2013'),
    ('ISO-27002', 'ISO/IEC 27002:2022'),
    ('ISO-27002', 'ISO/IEC 27002:2013'),
    ('ISO-27017', None),
    ('ISO-27018', None),
    ('ISO-27701', None),
    ('ISO-42001', None),
]


def natural_sort_key(ref_code):
    """
    Generate a sort key for natural ordering.
    '5.1' -> (5, 1, 0, '', 0)
    '5.1(a)' -> (5, 1, 0, 'a', 0)
    '5.1(a)(1)' -> (5, 1, 0, 'a', 1)
    '10.2' -> (10, 2, 0, '', 0)
    """
    # Extract main number parts
    parts = re.split(r'[.\(\)]', ref_code)
    parts = [p for p in parts if p]  # Remove empty strings

    result = []
    for p in parts:
        if p.isdigit():
            result.append((0, int(p)))  # Numeric sort
        else:
            result.append((1, p))  # Alpha sort (after numbers)

    # Pad to consistent length
    while len(result) < 6:
        result.append((0, 0))

    return tuple(result)


def get_clause_number(ref_code):
    """Extract the main clause number from a ref_code."""
    # Pattern: X.Y... -> X
    match = re.match(r'^(\d+)\.', ref_code)
    if match:
        return match.group(1)
    # Pattern: A.X.Y -> A.X (for ISO 27018)
    match = re.match(r'^(A\.\d+)\.', ref_code)
    if match:
        return match.group(1)
    # Pattern: just a number like "10"
    if re.match(r'^\d+$', ref_code):
        return ref_code
    return None


def get_immediate_parent(ref_code):
    """Get the immediate parent ref for an ISO control."""
    # Pattern: X.Y.Z(a)(1) -> X.Y.Z(a)
    match = re.match(r'^(.+)\(\d+\)$', ref_code)
    if match:
        return match.group(1)

    # Pattern: X.Y.Z(a) -> X.Y.Z
    match = re.match(r'^(.+)\([a-z]\)$', ref_code)
    if match:
        return match.group(1)

    # Pattern: X.Y.Z -> X.Y (for sub-clauses)
    match = re.match(r'^(\d+\.\d+)\.\d+$', ref_code)
    if match:
        return match.group(1)

    # Pattern: X.Y -> X (clause to main clause)
    match = re.match(r'^(\d+)\.\d+$', ref_code)
    if match:
        return match.group(1)

    # Pattern for ISO 27018: A.X.Y -> A.X
    match = re.match(r'^(A\.\d+)\.\d+$', ref_code)
    if match:
        return match.group(1)

    # Pattern: A.X -> A (for ISO 27018)
    match = re.match(r'^(A)\.\d+$', ref_code)
    if match:
        return match.group(1)

    return None


def process_framework(conn, framework_code, framework_name=None):
    """Process a single ISO framework."""
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get framework
    if framework_name:
        cur.execute(
            "SELECT id, code, name FROM frameworks WHERE code = %s AND name = %s",
            (framework_code, framework_name)
        )
    else:
        cur.execute(
            "SELECT id, code, name FROM frameworks WHERE code = %s",
            (framework_code,)
        )

    frameworks = cur.fetchall()
    if not frameworks:
        print(f"  WARNING: Framework {framework_code} not found")
        return 0

    total_updates = 0

    for fw in frameworks:
        fw_id = fw['id']
        fw_name = fw['name']
        print(f"\n  Processing {fw_name}...")

        # Get all controls
        cur.execute(
            "SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s",
            (fw_id,)
        )
        controls = cur.fetchall()
        control_map = {c['ref_code']: c['id'] for c in controls}

        print(f"    Found {len(controls)} controls")

        # Find all clause numbers needed
        clauses_needed = set()
        for c in controls:
            clause = get_clause_number(c['ref_code'])
            if clause and clause != c['ref_code']:
                clauses_needed.add(clause)

        # Create missing clause groups
        clauses_to_create = clauses_needed - set(control_map.keys())
        if clauses_to_create:
            print(f"    Creating {len(clauses_to_create)} clause groups...")
            for clause in sorted(clauses_to_create, key=natural_sort_key):
                cur.execute("""
                    INSERT INTO external_controls
                    (framework_id, ref_code, description, is_group, hierarchy_level)
                    VALUES (%s, %s, %s, true, 'clause')
                    ON CONFLICT (framework_id, ref_code) DO NOTHING
                    RETURNING id
                """, (fw_id, clause, f"Clause {clause}"))
                result = cur.fetchone()
                if result:
                    control_map[clause] = result['id']
            conn.commit()

        # Re-fetch controls
        cur.execute(
            "SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s",
            (fw_id,)
        )
        controls = cur.fetchall()
        control_map = {c['ref_code']: c['id'] for c in controls}

        # Update parent relationships
        parent_updates = []
        for c in controls:
            ref = c['ref_code']
            parent_ref = get_immediate_parent(ref)

            if parent_ref and parent_ref in control_map:
                parent_id = control_map[parent_ref]
                if parent_id != c['parent_id']:
                    parent_updates.append((parent_id, c['id']))

        if parent_updates:
            print(f"    Updating {len(parent_updates)} parent references...")
            cur.executemany(
                "UPDATE external_controls SET parent_id = %s WHERE id = %s",
                parent_updates
            )
            conn.commit()
            total_updates += len(parent_updates)

        # Set display_order based on natural sort
        sorted_controls = sorted(controls, key=lambda c: natural_sort_key(c['ref_code']))
        order_updates = []
        for i, c in enumerate(sorted_controls):
            order_updates.append((i, c['id']))

        print(f"    Setting display_order for {len(order_updates)} controls...")
        cur.executemany(
            "UPDATE external_controls SET display_order = %s WHERE id = %s",
            order_updates
        )
        conn.commit()

        # Update hierarchy levels
        cur.execute("""
            UPDATE external_controls ec
            SET is_group = true, hierarchy_level = 'clause'
            WHERE framework_id = %s
            AND ref_code ~ '^\d+$'
        """, (fw_id,))

        cur.execute("""
            UPDATE external_controls ec
            SET is_group = true, hierarchy_level = 'section'
            WHERE framework_id = %s
            AND ec.id IN (
                SELECT DISTINCT parent_id FROM external_controls
                WHERE parent_id IS NOT NULL AND framework_id = %s
            )
            AND ref_code !~ '^\d+$'
        """, (fw_id, fw_id))

        cur.execute("""
            UPDATE external_controls ec
            SET is_group = false, hierarchy_level = 'control'
            WHERE framework_id = %s
            AND ec.id NOT IN (
                SELECT DISTINCT parent_id FROM external_controls
                WHERE parent_id IS NOT NULL AND framework_id = %s
            )
        """, (fw_id, fw_id))

        conn.commit()

    return total_updates


def main():
    print("=" * 60)
    print("ISO Framework Clause Hierarchy & Ordering Fix")
    print("=" * 60)

    conn = psycopg2.connect(DB_URL)

    total_updates = 0

    for framework_code, framework_name in ISO_FRAMEWORKS:
        updates = process_framework(conn, framework_code, framework_name)
        total_updates += updates

    conn.close()

    print("\n" + "=" * 60)
    print(f"COMPLETE: Updated {total_updates} parent references")
    print("Display order set for all ISO controls")
    print("=" * 60)


if __name__ == '__main__':
    main()
