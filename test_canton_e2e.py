#!/usr/bin/env python3
"""
End-to-End Canton DAML Contract Test
Tests the full flow: Canton JSON API -> DAML contracts -> MongoDB projections
"""
import json, base64, requests, uuid, datetime

BANKA_URL = "http://localhost:7575"
BACKEND_URL = "http://localhost:8080"

def gen_jwt(party="BankA_Party", ledger_id="banka", admin=False):
    header = {"alg": "none", "typ": "JWT"}
    payload = {
        "actAs": [party],
        "readAs": [party],
        "ledgerId": ledger_id,
        "applicationId": "FraudShield"
    }
    if admin:
        payload["admin"] = True
    h = base64.urlsafe_b64encode(json.dumps(header, separators=(',',':')).encode()).rstrip(b'=').decode()
    p = base64.urlsafe_b64encode(json.dumps(payload, separators=(',',':')).encode()).rstrip(b'=').decode()
    return f"{h}.{p}."

def test_canton_direct():
    """Test DAML contract creation directly via Canton JSON API"""
    print("\n" + "="*60)
    print("TEST 1: Direct Canton JSON API - HoldRequest Contract")
    print("="*60)
    
    token = gen_jwt(admin=True)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    txn_id = f"TXN-{uuid.uuid4().hex[:8]}"
    payload = {
        "templateId": "FraudShield:HoldRequest",
        "payload": {
            "operator": "BankA_Party",
            "holdId": f"hold-{txn_id}",
            "txnId": txn_id,
            "fromUserId": "U001",
            "amount": "5000.0"
        },
        "meta": {"commandId": f"cmd-{uuid.uuid4().hex[:8]}"},
        "actAs": ["BankA_Party"]
    }
    
    try:
        resp = requests.post(f"{BANKA_URL}/v1/create", json=payload, headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        print(f"Response: {json.dumps(resp.json(), indent=2)}")
        return resp.json()
    except Exception as e:
        print(f"ERROR: {e}")
        return None

def test_three_transactions():
    """Test 3 transactions via the Java Backend API"""
    print("\n" + "="*60)
    print("TEST 2: Three Transactions via Backend API")
    print("="*60)
    
    transactions = [
        {"fromUserId": "U001", "toUserId": "U002", "amount": 150.0, "desc": "Low-Risk Auto-Approve"},
        {"fromUserId": "U003", "toUserId": "U004", "amount": 6500.0, "desc": "Medium-Risk Hold"},
        {"fromUserId": "U001", "toUserId": "U005", "amount": 75000.0, "desc": "High-Risk Escalated"},
    ]
    
    results = []
    for t in transactions:
        print(f"\n--- {t['desc']} ---")
        try:
            resp = requests.post(
                f"{BACKEND_URL}/api/txn/initiate",
                json={"fromUserId": t["fromUserId"], "toUserId": t["toUserId"], "amount": t["amount"]},
                timeout=15
            )
            result = resp.json()
            results.append({"desc": t["desc"], "status": resp.status_code, "response": result})
            print(f"Status: {resp.status_code}")
            print(f"TxnId: {result.get('txnId', 'N/A')}")
            print(f"Decision: {result.get('routingDecision', result.get('status', 'N/A'))}")
            print(f"RiskScore: {result.get('riskScore', 'N/A')}")
        except Exception as e:
            print(f"ERROR: {e}")
            results.append({"desc": t["desc"], "error": str(e)})
    
    return results

def test_canton_status():
    """Test Canton status endpoint"""
    print("\n" + "="*60)
    print("TEST 3: Canton Status & Readiness")
    print("="*60)
    try:
        resp = requests.get(f"{BACKEND_URL}/api/canton/status", timeout=5)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Canton Enabled: {data.get('readiness', {}).get('enabled', 'N/A')}")
        print(f"Canton Status: {data.get('readiness', {}).get('status', 'N/A')}")
        print(f"Canton Collections: {data.get('collections', {})}")
        return data
    except Exception as e:
        print(f"ERROR: {e}")
        return None

if __name__ == "__main__":
    print(f"Canton E2E Test - {datetime.datetime.now().isoformat()}")
    
    canton_direct = test_canton_direct()
    txn_results = test_three_transactions()
    canton_status = test_canton_status()
    
    print("\n\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Direct Canton API: {'SUCCESS' if canton_direct and canton_direct.get('status') == 200 else 'FAILED/ERROR'}")
    for r in txn_results:
        print(f"  {r['desc']}: HTTP {r.get('status', 'ERROR')}")
