#!/usr/bin/env python3
"""
Fix display_order to respect hierarchy - parents before children.
Uses depth-first traversal to set display_order.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


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


def process_framework(conn, fw_id, fw_name):
    """Set display_order using depth-first hierarchy traversal."""
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get all controls with their relationships
    cur.execute("""
        SELECT id, ref_code, parent_id
        FROM external_controls
        WHERE framework_id = %s
    """, (fw_id,))
    controls = cur.fetchall()

    if not controls:
        return 0

    # Build parent->children map
    children_map = {}
    control_by_id = {}
    roots = []

    for c in controls:
        control_by_id[c['id']] = c
        if c['parent_id']:
            if c['parent_id'] not in children_map:
                children_map[c['parent_id']] = []
            children_map[c['parent_id']].append(c)
        else:
            roots.append(c)

    # Sort children by natural order at each level
    for parent_id in children_map:
        children_map[parent_id].sort(key=lambda c: natural_sort_key(c['ref_code']))

    # Sort roots
    roots.sort(key=lambda c: natural_sort_key(c['ref_code']))

    # Depth-first traversal to assign display_order
    order_counter = [0]
    updates = []

    def traverse(control):
        updates.append((order_counter[0], control['id']))
        order_counter[0] += 1

        # Process children
        if control['id'] in children_map:
            for child in children_map[control['id']]:
                traverse(child)

    for root in roots:
        traverse(root)

    # Update display_order
    cur.executemany(
        "UPDATE external_controls SET display_order = %s WHERE id = %s",
        updates
    )
    conn.commit()

    return len(updates)


def main():
    print("=" * 60)
    print("Fix Display Order with Hierarchy (Parents before Children)")
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
