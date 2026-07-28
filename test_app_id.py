import urllib.request
import json
import base64

header = {"alg": "none", "typ": "JWT"}
p_admin = base64.urlsafe_b64encode(b'{"https://daml.com/jwt/1.0":{"admin":true,"ledgerId":"banka"}}').decode().rstrip('=')
tok_admin = f"{base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')}.{p_admin}."

req = urllib.request.Request('http://localhost:7575/v1/parties', headers={'Authorization': f'Bearer {tok_admin}'})
resp = urllib.request.urlopen(req)
parties = json.loads(resp.read().decode())['result']
party = [p['identifier'] for p in parties if p['identifier'].startswith("BankA_Party::")][0]
print(f"Testing with Party: {party}")

payload_v2 = {
    "actAs": [party],
    "readAs": [party],
    "ledgerId": "banka",
    "applicationId": "FraudShield"
}

h = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
p = base64.urlsafe_b64encode(json.dumps(payload_v2).encode()).decode().rstrip('=')
tok = f"{h}.{p}."

data = json.dumps({"templateIds": ["FraudShield:HoldRequest"]}).encode()
req = urllib.request.Request('http://localhost:7575/v1/query', data=data, headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req)
    print(f"v2 Token POST with banka: SUCCESS. Response: {resp.read().decode()}")
except urllib.error.HTTPError as e:
    print(f"v2 Token POST with banka: ERROR {e.code} {e.reason} - {e.read().decode()}")
