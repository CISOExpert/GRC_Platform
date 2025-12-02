#!/usr/bin/env python3
"""
Fix HIPAA parent hierarchy.

HIPAA has complex nested patterns like:
164.306(d)(3)(ii)(B)(2) → 164.306(d)(3)(ii)(B) → 164.306(d)(3)(ii) → 164.306(d)(3) → 164.306(d) → 164.306

We need to:
1. Create section groups (164.306, 164.308, etc.)
2. Build full parent chain
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import re

DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


def get_all_parent_refs(ref_code):
    """
    Get the full chain of parent refs for a HIPAA control.
    Returns list from immediate parent to root.
    """
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
    """Get immediate parent ref for HIPAA control."""
    # Pattern: ends with (N) where N is a number - strip it
    # e.g., 164.306(d)(3)(ii)(B)(2) → 164.306(d)(3)(ii)(B)
    match = re.match(r'^(.+)\(\d+\)$', ref_code)
    if match:
        return match.group(1)

    # Pattern: ends with (X) where X is uppercase letter - strip it
    # e.g., 164.306(d)(3)(ii)(B) → 164.306(d)(3)(ii)
    match = re.match(r'^(.+)\([A-Z]\)$', ref_code)
    if match:
        return match.group(1)

    # Pattern: ends with (roman) - strip it
    # e.g., 164.306(d)(3)(ii) → 164.306(d)(3)
    match = re.match(r'^(.+)\([ivx]+\)$', ref_code)
    if match:
        return match.group(1)

    # Pattern: ends with (letter) where letter is lowercase - strip it
    # e.g., 164.306(d) → 164.306
    match = re.match(r'^(\d+\.\d+)\([a-z]\)$', ref_code)
    if match:
        return match.group(1)

    # No more parents
    return None


def main():
    print("=" * 60)
    print("HIPAA Parent Hierarchy Fix")
    print("=" * 60)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get HIPAA framework
    cur.execute("SELECT id FROM frameworks WHERE code = 'HIPAA'")
    fw = cur.fetchone()
    if not fw:
        print("ERROR: HIPAA framework not found")
        return

    fw_id = fw['id']

    # Get all HIPAA controls
    cur.execute(
        "SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s",
        (fw_id,)
    )
    controls = cur.fetchall()
    control_map = {c['ref_code']: c['id'] for c in controls}

    print(f"Found {len(controls)} existing controls")

    # Collect all parent refs needed
    all_parents_needed = set()
    for c in controls:
        parents = get_all_parent_refs(c['ref_code'])
        all_parents_needed.update(parents)

    # Find which parents need to be created
    parents_to_create = all_parents_needed - set(control_map.keys())

    if parents_to_create:
        print(f"Creating {len(parents_to_create)} parent groups...")
        for parent_ref in sorted(parents_to_create):
            cur.execute("""
                INSERT INTO external_controls
                (framework_id, ref_code, description, is_group, hierarchy_level)
                VALUES (%s, %s, %s, true, 'section')
                ON CONFLICT (framework_id, ref_code) DO NOTHING
                RETURNING id
            """, (fw_id, parent_ref, f"HIPAA Section {parent_ref}"))
            result = cur.fetchone()
            if result:
                control_map[parent_ref] = result['id']
                print(f"  Created: {parent_ref}")

        conn.commit()

    # Re-fetch all controls
    cur.execute(
        "SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s",
        (fw_id,)
    )
    controls = cur.fetchall()
    control_map = {c['ref_code']: c['id'] for c in controls}

    print(f"\nTotal controls now: {len(controls)}")

    # Set parent IDs
    updates = []
    for c in controls:
        ref = c['ref_code']
        current_parent = c['parent_id']

        parent_ref = get_immediate_parent(ref)
        if parent_ref:
            parent_id = control_map.get(parent_ref)
            if parent_id and parent_id != current_parent:
                updates.append((parent_id, c['id']))

    if updates:
        print(f"Updating {len(updates)} parent references...")
        cur.executemany("""
            UPDATE external_controls
            SET parent_id = %s
            WHERE id = %s
        """, updates)
        conn.commit()
        print(f"✓ Updated {len(updates)} controls")
    else:
        print("No updates needed")

    # Set hierarchy levels
    cur.execute("""
        UPDATE external_controls ec
        SET is_group = true, hierarchy_level = 'section'
        WHERE framework_id = %s
        AND ec.id IN (
            SELECT DISTINCT parent_id
            FROM external_controls
            WHERE parent_id IS NOT NULL
            AND framework_id = %s
        )
    """, (fw_id, fw_id))

    cur.execute("""
        UPDATE external_controls ec
        SET is_group = false, hierarchy_level = 'control'
        WHERE framework_id = %s
        AND ec.id NOT IN (
            SELECT DISTINCT parent_id
            FROM external_controls
            WHERE parent_id IS NOT NULL
            AND framework_id = %s
        )
    """, (fw_id, fw_id))

    conn.commit()

    # Report results
    cur.execute("""
        SELECT COUNT(*) as total,
               COUNT(parent_id) as with_parent,
               COUNT(*) FILTER (WHERE is_group = true) as groups
        FROM external_controls
        WHERE framework_id = %s
    """, (fw_id,))
    stats = cur.fetchone()

    print(f"\nFinal statistics:")
    print(f"  Total controls: {stats['total']}")
    print(f"  With parent: {stats['with_parent']}")
    print(f"  Groups: {stats['groups']}")

    conn.close()
    print("\n✓ HIPAA parent hierarchy fix complete")


if __name__ == '__main__':
    main()
