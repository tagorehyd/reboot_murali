import urllib.request
import json
import base64

header = {"alg": "none", "typ": "JWT"}
p_admin = base64.urlsafe_b64encode(b'{"https://daml.com/jwt/1.0":{"admin":true,"ledgerId":"canton"}}').decode().rstrip('=')
tok_admin = f"{base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')}.{p_admin}."

req = urllib.request.Request('http://localhost:7575/v1/parties', headers={'Authorization': f'Bearer {tok_admin}'})
resp = urllib.request.urlopen(req)
parties = json.loads(resp.read().decode())['result']

party = [p['identifier'] for p in parties if p['identifier'].startswith("BankA_Party::")][0]
print(f"Testing with Party: {party}")

# Test custom v1 token
payload_v1 = {
    "https://daml.com/jwt/1.0": {
        "actAs": [party],
        "readAs": [party],
        "ledgerId": "canton"
    }
}

for name, payload in [("v1 Token", payload_v1)]:
    h = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
    p = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    tok = f"{h}.{p}."
    req = urllib.request.Request('http://localhost:7575/v1/query', headers={'Authorization': f'Bearer {tok}'})
    try:
        resp = urllib.request.urlopen(req)
        print(f"{name}: SUCCESS")
    except Exception as e:
        print(f"{name}: ERROR {e}")
