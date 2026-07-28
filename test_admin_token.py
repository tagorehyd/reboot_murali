import urllib.request
import json
import base64

h = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode().rstrip('=')
p = base64.urlsafe_b64encode(b'{"https://daml.com/jwt/1.0":{"admin":true,"ledgerId":"canton"}}').decode().rstrip('=')
tok = f"{h}.{p}."

req = urllib.request.Request('http://localhost:7575/v1/parties', headers={'Authorization': f'Bearer {tok}'})
try:
    resp = urllib.request.urlopen(req)
    print("SUCCESS:")
    print(resp.read().decode())
except Exception as e:
    print("ERROR:")
    print(e)
    if hasattr(e, 'read'):
        print(e.read().decode())
