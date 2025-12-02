#!/usr/bin/env python3
"""
Fix parent_id hierarchy for ISO frameworks (27001, 27002, 42001).

Does NOT delete any data. Only updates parent_id fields based on ref_code patterns.

Patterns handled:
- X.Y -> parent is clause X (if exists)
- X.Y.Z -> parent is X.Y
- X.Y(a) -> parent is X.Y
- X.Y(a)(1) -> parent is X.Y(a)
- X.Y.Z(a) -> parent is X.Y.Z
- X.Y.Z(a)(1) -> parent is X.Y.Z(a)
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
    ('ISO-27017', None),  # All versions
    ('ISO-27018', None),
    ('ISO-27701', None),
    ('ISO-42001', None),
]


def get_parent_ref(ref_code):
    """
    Determine the parent ref_code for a given ISO control reference.
    Returns None if this is a top-level item.
    """
    # Pattern: X.Y.Z(a)(1) -> parent is X.Y.Z(a)
    match = re.match(r'^(\d+\.\d+(?:\.\d+)?(?:\([a-z]\))?)\(\d+\)$', ref_code)
    if match:
        return match.group(1)

    # Pattern: X.Y.Z(a) -> parent is X.Y.Z
    # Pattern: X.Y(a) -> parent is X.Y
    match = re.match(r'^(\d+\.\d+(?:\.\d+)?)\([a-z]\)$', ref_code)
    if match:
        return match.group(1)

    # Pattern: X.Y.Z -> parent is X.Y
    match = re.match(r'^(\d+\.\d+)\.\d+$', ref_code)
    if match:
        return match.group(1)

    # Pattern: X.Y -> parent is X (clause number)
    # But clauses like 4.1, 5.2 etc usually don't have a parent "4" or "5"
    # in the SCF data, so we return None here
    match = re.match(r'^(\d+)\.\d+$', ref_code)
    if match:
        # Check if single-digit clause exists (e.g., "4" or "5")
        # In most ISO frameworks these don't exist as separate entries
        return None

    return None


def process_framework(conn, framework_code, framework_name=None):
    """Process a single ISO framework to set parent_ids."""
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get framework ID(s)
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

        # Get all controls for this framework
        cur.execute(
            "SELECT id, ref_code, parent_id FROM external_controls WHERE framework_id = %s",
            (fw_id,)
        )
        controls = cur.fetchall()
        control_map = {c['ref_code']: c['id'] for c in controls}

        print(f"    Found {len(controls)} controls")

        updates = []
        for c in controls:
            ref = c['ref_code']
            current_parent = c['parent_id']

            # Get expected parent ref
            parent_ref = get_parent_ref(ref)

            if parent_ref:
                # Look up parent ID
                parent_id = control_map.get(parent_ref)
                if parent_id and parent_id != current_parent:
                    updates.append((parent_id, c['id']))
            elif current_parent:
                # This should be a top-level item but has a parent - leave it alone
                pass

        if updates:
            print(f"    Updating {len(updates)} parent references...")
            cur.executemany("""
                UPDATE external_controls
                SET parent_id = %s
                WHERE id = %s
            """, updates)
            conn.commit()
            total_updates += len(updates)
            print(f"    ✓ Updated {len(updates)} controls")
        else:
            print(f"    No updates needed")

    return total_updates


def set_hierarchy_levels(conn):
    """Set hierarchy_level and is_group based on parent relationships."""
    cur = conn.cursor()

    print("\nSetting hierarchy levels...")

    # Controls with children are groups
    cur.execute("""
        UPDATE external_controls ec
        SET is_group = true, hierarchy_level = 'section'
        WHERE ec.id IN (
            SELECT DISTINCT parent_id
            FROM external_controls
            WHERE parent_id IS NOT NULL
        )
        AND framework_id IN (
            SELECT id FROM frameworks WHERE code LIKE 'ISO-%'
        )
    """)
    groups_updated = cur.rowcount

    # Controls without children are controls
    cur.execute("""
        UPDATE external_controls ec
        SET is_group = false, hierarchy_level = 'control'
        WHERE ec.id NOT IN (
            SELECT DISTINCT parent_id
            FROM external_controls
            WHERE parent_id IS NOT NULL
        )
        AND framework_id IN (
            SELECT id FROM frameworks WHERE code LIKE 'ISO-%'
        )
    """)
    controls_updated = cur.rowcount

    conn.commit()
    print(f"  ✓ Set {groups_updated} groups, {controls_updated} leaf controls")


def main():
    print("=" * 60)
    print("ISO Framework Parent Hierarchy Fix")
    print("=" * 60)

    conn = psycopg2.connect(DB_URL)

    total_updates = 0

    for framework_code, framework_name in ISO_FRAMEWORKS:
        print(f"\nProcessing {framework_code}...")
        updates = process_framework(conn, framework_code, framework_name)
        total_updates += updates

    set_hierarchy_levels(conn)

    conn.close()

    print("\n" + "=" * 60)
    print(f"COMPLETE: Updated {total_updates} parent references")
    print("=" * 60)


if __name__ == '__main__':
    main()
