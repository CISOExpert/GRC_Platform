#!/usr/bin/env python3
"""
Seed a test user and organization for development
USES SUPABASE AUTH API - DOES NOT DIRECTLY INSERT INTO auth.users
"""
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid

# Supabase Auth Admin API endpoint
AUTH_URL = 'http://127.0.0.1:54321/auth/v1/admin/users'
SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

print("\n" + "="*70)
print("SEEDING TEST USER AND ORGANIZATION")
print("="*70 + "\n")

# Create user via Auth API (proper way)
email = "test@example.com"
password = "password123"

headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

data = {
    'email': email,
    'password': password,
    'email_confirm': True,
    'user_metadata': {
        'display_name': 'Test User'
    }
}

# Check if user exists first
get_response = requests.get(
    AUTH_URL,
    headers=headers,
    params={'email': email}
)

if get_response.status_code == 200 and len(get_response.json().get('users', [])) > 0:
    user_id = get_response.json()['users'][0]['id']
    print(f"✓ User already exists: {email}")
    print(f"  User ID: {user_id}")
else:
    response = requests.post(AUTH_URL, headers=headers, json=data)
    
    if response.status_code in [200, 201]:
        user_id = response.json()['id']
        print(f"✓ Created user via Auth API: {email}")
        print(f"  User ID: {user_id}")
    else:
        print(f"✗ Failed to create user: {response.status_code}")
        print(response.text)
        exit(1)

# Now add to public schema tables
conn = psycopg2.connect(
    host="127.0.0.1",
    port="54322",
    database="postgres",
    user="postgres",
    password="postgres"
)

conn.autocommit = True

try:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Add to public.users
        cur.execute("""
            INSERT INTO users (id, email, display_name, created_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (id) DO NOTHING;
        """, (user_id, email, "Test User"))
        print(f"✓ Added to public.users")
        
        # Create organization
        org_name = "Test Organization"
        cur.execute("SELECT id FROM organizations WHERE name = %s;", (org_name,))
        existing_org = cur.fetchone()
        
        if existing_org:
            org_id = existing_org['id']
            print(f"✓ Organization already exists: {org_name}")
        else:
            org_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO organizations (
                    id,
                    name,
                    org_type,
                    metadata,
                    created_at
                ) VALUES (
                    %s,
                    %s,
                    'enterprise',
                    '{"description": "Default test organization for development"}',
                    NOW()
                );
            """, (org_id, org_name))
            print(f"✓ Created organization: {org_name}")
        
        # Link user to organization
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM organization_members 
            WHERE user_id = %s AND org_id = %s;
        """, (user_id, org_id))
        
        if cur.fetchone()['count'] == 0:
            cur.execute("""
                INSERT INTO organization_members (
                    org_id,
                    user_id,
                    role
                ) VALUES (
                    %s,
                    %s,
                    'admin'
                );
            """, (org_id, user_id))
            print(f"✓ Linked user to organization with admin role")
        else:
            print(f"✓ User already linked to organization")
        
        print("\n" + "="*70)
        print("SEED COMPLETE")
        print("="*70)
        print(f"\nLogin credentials:")
        print(f"  Email:    {email}")
        print(f"  Password: password123")
        print(f"\nOrganization: {org_name}")
        print()

except Exception as e:
    print(f"\n❌ Error: {e}")
    raise
finally:
    conn.close()
