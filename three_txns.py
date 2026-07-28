import requests
import json
from datetime import datetime
import time

base_url = "http://localhost:8080"
headers = {"Content-Type": "application/json"}

# 0. We need unique transaction flows without daily limit restrictions.
# It is better to use new arbitrary users U900, U901, U902 which might not have history.
# Wait, let's just reset the limits using the PUT endpoint and also set balances to high amounts.
requests.put(f"{base_url}/api/users/U003/self-limits", json={"dailyTransactionLimit": 1000000.0, "weeklyTransactionLimit": 1000000.0, "maxBeneficiaryAmount": 1000000.0}, headers=headers)
requests.put(f"{base_url}/api/users/U004/self-limits", json={"dailyTransactionLimit": 1000000.0, "weeklyTransactionLimit": 1000000.0, "maxBeneficiaryAmount": 1000000.0}, headers=headers)
requests.post(f"{base_url}/api/admin/balance/U003/set?amount=500000.0")
requests.post(f"{base_url}/api/admin/balance/U004/set?amount=500000.0")

# Clear the mempool just in case (optional, but good practice)
requests.post(f"{base_url}/api/admin/reset") # this doesn't exist, we'll ignore it

# Give it a second
time.sleep(1)

transactions = [
    {
        "fromUserId": "U003",
        "toUserId": "U002",
        "amount": 150.0,
        "description": "Txn 1 - Low Risk"
    },
    {
        "fromUserId": "U004",
        "toUserId": "U005",
        "amount": 28000.0,
        "description": "Txn 2 - Medium Risk (Admin Approval)"
    },
    {
        "fromUserId": "U006",
        "toUserId": "U003",
        "amount": 120000.0,
        "description": "Txn 3 - High Risk (Consent/Approval/Canton Hold)"
    }
]

with open("txn_results.txt", "w") as f:
    f.write(f"=== FraudShield Transaction API Results ===\n")
    f.write(f"Executed at {datetime.now().isoformat()}\n\n")

    for i, txn in enumerate(transactions):
        desc = txn.pop("description")
        f.write(f"--- Transaction {i+1}: {desc} ---\n")
        
        # 1. Initiate Transaction (Backend API)
        f.write(f"1. [Frontend -> Java Backend] POST /api/txn/initiate\n")
        f.write(f"Payload: {json.dumps(txn)}\n")
        
        resp = requests.post(f"{base_url}/api/txn/initiate", json=txn, headers=headers)
        f.write(f"Response ({resp.status_code}):\n{json.dumps(resp.json(), indent=2)}\n\n")
        
        txnId = resp.json().get("txnId")
        routing = resp.json().get("routingDecision")
        
        if routing == "CONSENT_REQUIRED":
            f.write(f"2. [Frontend -> Java Backend] POST /api/txn/{txnId}/consent\n")
            c_resp = requests.post(f"{base_url}/api/txn/{txnId}/consent", headers=headers)
            f.write(f"Response ({c_resp.status_code}):\n{json.dumps(c_resp.json(), indent=2)}\n\n")
            
            f.write(f"3. [Frontend -> Java Backend -> Canton API] POST /api/admin/txn/{txnId}/decide\n")
            d_resp = requests.post(f"{base_url}/api/admin/txn/{txnId}/decide", json={"approved": True}, headers=headers)
            f.write(f"Response ({d_resp.status_code}):\n{json.dumps(d_resp.json(), indent=2)}\n\n")
            
        elif routing == "ADMIN_APPROVED":
            f.write(f"2. [Frontend -> Java Backend -> Canton API] POST /api/admin/txn/{txnId}/decide\n")
            d_resp = requests.post(f"{base_url}/api/admin/txn/{txnId}/decide", json={"approved": True}, headers=headers)
            f.write(f"Response ({d_resp.status_code}):\n{json.dumps(d_resp.json(), indent=2)}\n\n")

print("Done. Results saved to txn_results.txt")
