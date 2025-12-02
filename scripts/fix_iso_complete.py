#!/usr/bin/env python3
"""
Complete ISO framework fix:
1. Create ALL missing parent groups (clauses, sections, subsections)
2. Set all parent relationships
3. Set hierarchy levels
4. Set display_order (parents before children)
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

ISO_FRAMEWORKS = [
    ('ISO-27001', None),
    ('ISO-27002', None),
    ('ISO-27017', None),
    ('ISO-27018', None),
    ('ISO-27701', None),
    ('ISO-42001', None),
]


def natural_sort_key(ref_code):
    """Generate a sort key for natural ordering."""
    result = []
    parts = re.split(r'(\d+)', ref_code)
    for part in parts:
        if part.isdigit():
            result.append((0, int(part), ''))
        elif part:
            result.append((1, 0, part.lower()))
    while len(result) < 10:
        result.append((2, 0, ''))
    return tuple(result)


def get_all_parent_refs(ref_code):
    """Get all ancestor refs for a control (from immediate parent to root)."""
    parents = []
    current = ref_code

    while True:
        parent = get_immediate_parent(current)
        if parent is None:
            break
        parents.append(parent)
        current = parent

    return parents


def get_immediate_parent(ref_code):
    """Get immediate parent ref for an ISO control."""
    # X.Y.Z(a)(N) -> X.Y.Z(a)
    match = re.match(r'^(.+)\(\d+\)$', ref_code)
    if match:
        return match.group(1)

    # X.Y.Z(a) -> X.Y.Z
    match = re.match(r'^(.+)\([a-z]\)$', ref_code)
    if match:
        return match.group(1)

    # X.Y.Z -> X.Y (for 3+ level)
    match = re.match(r'^(\d+\.\d+(?:\.\d+)*)\.\d+$', ref_code)
    if match:
        return match.group(1)

    # X.Y -> X (section to clause)
    match = re.match(r'^(\d+)\.\d+$', ref_code)
    if match:
        return match.group(1)

    # For ISO 27018: A.X.Y -> A.X, A.X -> A
    match = re.match(r'^(A(?:\.\d+)*)\.\d+$', ref_code)
    if match:
        return match.group(1)

    return None


def process_framework(conn, fw_id, fw_name):
    """Process a single ISO framework."""
    cur = conn.cursor(cursor_factory=RealDictCursor)

    print(f"\n  Processing {fw_name}...")

    # Get all controls
    cur.execute(
        "SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s",
        (fw_id,)
    )
    controls = cur.fetchall()
    control_map = {c['ref_code']: c['id'] for c in controls}

    print(f"    Found {len(controls)} existing controls")

    # Find ALL missing parent groups
    all_needed_parents = set()
    for c in controls:
        ancestors = get_all_parent_refs(c['ref_code'])
        all_needed_parents.update(ancestors)

    missing_parents = all_needed_parents - set(control_map.keys())

    if missing_parents:
        print(f"    Creating {len(missing_parents)} missing groups...")
        for parent_ref in sorted(missing_parents, key=natural_sort_key):
            # Determine hierarchy level
            if re.match(r'^\d+$', parent_ref):
                level = 'clause'
            elif re.match(r'^A$', parent_ref):
                level = 'annex'
            elif re.match(r'^\d+\.\d+$', parent_ref) or re.match(r'^A\.\d+$', parent_ref):
                level = 'section'
            else:
                level = 'subsection'

            cur.execute("""
                INSERT INTO external_controls
                (framework_id, ref_code, description, is_group, hierarchy_level)
                VALUES (%s, %s, %s, true, %s)
                ON CONFLICT (framework_id, ref_code) DO NOTHING
                RETURNING id
            """, (fw_id, parent_ref, f"{level.title()} {parent_ref}", level))
            result = cur.fetchone()
            if result:
                control_map[parent_ref] = result['id']
        conn.commit()

    # Re-fetch all controls
    cur.execute(
        "SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s",
        (fw_id,)
    )
    controls = cur.fetchall()
    control_map = {c['ref_code']: c['id'] for c in controls}

    # Set parent relationships
    parent_updates = []
    for c in controls:
        parent_ref = get_immediate_parent(c['ref_code'])
        if parent_ref and parent_ref in control_map:
            parent_id = control_map[parent_ref]
            if parent_id != c['parent_id']:
                parent_updates.append((parent_id, c['id']))

    if parent_updates:
        print(f"    Setting {len(parent_updates)} parent references...")
        cur.executemany(
            "UPDATE external_controls SET parent_id = %s WHERE id = %s",
            parent_updates
        )
        conn.commit()

    # Set hierarchy levels
    # Groups are controls that have children
    cur.execute("""
        UPDATE external_controls ec
        SET is_group = true
        WHERE framework_id = %s
        AND ec.id IN (
            SELECT DISTINCT parent_id FROM external_controls
            WHERE parent_id IS NOT NULL AND framework_id = %s
        )
    """, (fw_id, fw_id))

    # Leaf controls
    cur.execute("""
        UPDATE external_controls ec
        SET is_group = false
        WHERE framework_id = %s
        AND ec.id NOT IN (
            SELECT DISTINCT parent_id FROM external_controls
            WHERE parent_id IS NOT NULL AND framework_id = %s
        )
    """, (fw_id, fw_id))

    conn.commit()

    # Set display_order using depth-first traversal
    cur.execute(
        "SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s",
        (fw_id,)
    )
    controls = cur.fetchall()

    # Build parent->children map
    children_map = {}
    roots = []
    for c in controls:
        if c['parent_id']:
            if c['parent_id'] not in children_map:
                children_map[c['parent_id']] = []
            children_map[c['parent_id']].append(c)
        else:
            roots.append(c)

    # Sort children at each level
    for parent_id in children_map:
        children_map[parent_id].sort(key=lambda c: natural_sort_key(c['ref_code']))
    roots.sort(key=lambda c: natural_sort_key(c['ref_code']))

    # Depth-first traversal
    order_counter = [0]
    order_updates = []

    def traverse(control):
        order_updates.append((order_counter[0], control['id']))
        order_counter[0] += 1
        if control['id'] in children_map:
            for child in children_map[control['id']]:
                traverse(child)

    for root in roots:
        traverse(root)

    print(f"    Setting display_order for {len(order_updates)} controls...")
    cur.executemany(
        "UPDATE external_controls SET display_order = %s WHERE id = %s",
        order_updates
    )
    conn.commit()

    return len(controls)


def main():
    print("=" * 60)
    print("Complete ISO Framework Fix")
    print("=" * 60)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    for framework_code, _ in ISO_FRAMEWORKS:
        cur.execute(
            "SELECT id, name FROM frameworks WHERE code = %s",
            (framework_code,)
        )
        frameworks = cur.fetchall()
        for fw in frameworks:
            process_framework(conn, fw['id'], fw['name'])

    conn.close()

    print("\n" + "=" * 60)
    print("COMPLETE")
    print("=" * 60)


if __name__ == '__main__':
    main()
