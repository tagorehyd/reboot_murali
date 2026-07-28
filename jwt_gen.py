import base64
import json

def generate_admin_jwt():
    header = {"alg": "none", "typ": "JWT"}
    payload = {
        "https://daml.com/jwt/1.0": {
            "admin": True,
            "ledgerId": "canton"
        }
    }
    h = base64.urlsafe_b64encode(json.dumps(header).encode('utf-8')).decode('utf-8').rstrip('=')
    p = base64.urlsafe_b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8').rstrip('=')
    return f"{h}.{p}."

print(f"ADMIN_TOKEN: {generate_admin_jwt()}")
