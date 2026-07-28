#!/usr/bin/env python3
"""Update MongoDB cantonPartyMappings with fully-qualified Canton Party IDs"""
import requests, json, base64

BANKA_URL = "http://localhost:7575"

def gen_jwt(party="BankA_Party", ledger_id="banka", admin=False):
    header = {"alg": "none", "typ": "JWT"}
    payload = {"actAs": [party], "readAs": [party], "ledgerId": ledger_id, "applicationId": "FraudShield"}
    if admin:
        payload["admin"] = True
    h = base64.urlsafe_b64encode(json.dumps(header, separators=(',',':')).encode()).rstrip(b'=').decode()
    p = base64.urlsafe_b64encode(json.dumps(payload, separators=(',',':')).encode()).rstrip(b'=').decode()
    return f"{h}.{p}."

# Known full party IDs from bootstrap output
PARTY_MAP = {
    "U001": "U001_Party::12205f5e799f",
    "U002": "U002_Party::12205f5e799f",
    "U003": "U003_Party::1220d6313cdb",
    "U004": "U004_Party::1220d6313cdb",
    "U005": "U005_Party::122080d3a391",
    "U006": "U006_Party::122080d3a391",
    "U007": "U007_Party::122080d3a391",
    "ADMIN": "GlobalSynchronizer_Party::122003f7f6bb"
}

# Get actual full party IDs from JSON API
token = gen_jwt(admin=True)
print(f"Fetching parties from {BANKA_URL}...")
try:
    resp = requests.get(f"{BANKA_URL}/v1/parties", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    data = resp.json()
    parties = data.get("result", [])
    print(f"Found {len(parties)} parties:")
    for p in parties:
        print(f"  {p.get('identifier', 'N/A')}")
except Exception as e:
    print(f"Error fetching parties: {e}")
