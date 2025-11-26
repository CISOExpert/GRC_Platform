#!/usr/bin/env python3
"""Test all Supabase REST endpoints used by the app"""
import requests
import json

BASE_URL = 'http://127.0.0.1:54321/rest/v1'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

headers = {
    'apikey': ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

print("\n" + "="*70)
print("TESTING ALL SUPABASE REST ENDPOINTS")
print("="*70 + "\n")

endpoints = [
    ('GET', '/organizations', {'select': 'id,name', 'order': 'name'}),
    ('GET', '/frameworks', {'select': 'id,code,name,version', 'limit': '5'}),
    ('GET', '/scf_controls', {'select': 'id,control_identifier,title', 'limit': '5'}),
    ('GET', '/external_controls', {'select': 'id,control_identifier', 'limit': '5'}),
    ('GET', '/scf_control_mappings', {'select': 'id', 'limit': '5'}),
    ('POST', '/rpc/get_frameworks_with_counts', {}),
]

failed = []

for method, endpoint, params in endpoints:
    try:
        url = f"{BASE_URL}{endpoint}"
        
        if method == 'GET':
            response = requests.get(url, headers=headers, params=params)
        else:
            response = requests.post(url, headers=headers, json=params)
        
        status = "✓" if response.status_code == 200 else "✗"
        
        if response.status_code == 200:
            if endpoint.startswith('/rpc'):
                count = len(response.json())
            else:
                count = len(response.json())
            print(f"{status} {method:4} {endpoint:40} [{response.status_code}] {count} results")
        else:
            print(f"{status} {method:4} {endpoint:40} [{response.status_code}] {response.text[:100]}")
            failed.append(endpoint)
            
    except Exception as e:
        print(f"✗ {method:4} {endpoint:40} ERROR: {str(e)[:50]}")
        failed.append(endpoint)

print("\n" + "="*70)
if failed:
    print(f"FAILED: {len(failed)} endpoint(s)")
    for ep in failed:
        print(f"  - {ep}")
else:
    print("SUCCESS: All endpoints working!")
print("="*70 + "\n")
