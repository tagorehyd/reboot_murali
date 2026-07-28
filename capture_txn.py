#!/usr/bin/env python3
"""
FraudShield - Post-Full-Restart Transaction Capture
Run AFTER: restart all + bootstrap canton
"""
import requests, json, datetime, time

BACKEND = 'http://localhost:8080'
BANKA   = 'http://localhost:7575'

def wait_for_backend(max_wait=60):
    print("Waiting for backend to be ready...")
    for i in range(max_wait):
        try:
            r = requests.get(f"{BACKEND}/api/canton/status", timeout=3)
            if r.status_code in (200, 500):
                print(f"  Backend up after {i+1}s")
                return True
        except Exception:
            pass
        time.sleep(1)
    return False

def reset_limits():
    import subprocess
    js = """
db.users.updateMany({}, {"$set":{"weeklyTransactionTotal":0,"weeklyTransactionLimit":5000000}});
db.users.updateOne({"_id":"U001"},{"$set":{"maxBeneficiaryAmount":500000,"dailyTransactionLimit":1000000}});
db.users.updateOne({"_id":"U002"},{"$set":{"maxBeneficiaryAmount":500000,"dailyTransactionLimit":1000000}});
db.users.updateOne({"_id":"U003"},{"$set":{"maxBeneficiaryAmount":500000,"dailyTransactionLimit":1000000}});
print("Limits reset");
"""
    with open("_tmp_reset.js", "w") as f:
        f.write(js)
    subprocess.run([
        r"C:\Users\newab\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe",
        "cp", "_tmp_reset.js", "fraudshield-mongodb:/tmp/_reset.js"
    ], capture_output=True)
    r = subprocess.run([
        r"C:\Users\newab\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe",
        "exec", "fraudshield-mongodb",
        "mongosh", "mongodb://fraudshield:fraudshield-local-password@localhost:27017/fraudshield?authSource=admin",
        "/tmp/_reset.js"
    ], capture_output=True, text=True)
    print("  Limits reset:", r.stdout.strip().split("\n")[-1])

ts = datetime.datetime.now().isoformat()
lines = []

def L(msg=""):
    print(msg)
    lines.append(msg)

if not wait_for_backend():
    print("Backend not ready!")
    exit(1)

print("Resetting transaction limits...")
reset_limits()
time.sleep(2)

L("=" * 70)
L(f"FRAUDSHIELD - POST-FULL-RESTART TRANSACTION CAPTURE")
L(f"Timestamp : {ts}")
L("=" * 70)

# --- Canton status first ---
try:
    cs = requests.get(f"{BACKEND}/api/canton/status", timeout=5).json()
    L(f"\nCanton Status (pre-txn):")
    L(f"  Enabled  : {cs['readiness']['enabled']}")
    L(f"  Status   : {cs['readiness']['status']}")
    for name, info in cs['readiness']['participants'].items():
        L(f"  {name:12s}: ledger={info['ledger']} admin={info['admin']}")
    L(f"  Mappings : {cs['collections']['cantonPartyMappings']} party records")
except Exception as e:
    L(f"  Canton status error: {e}")

# --- Fire transaction ---
L("\n" + "-" * 70)
L("TRANSACTION: U001 -> U005, GBP 27,500 (High-Risk)")
L("-" * 70)

txn_req = {"fromUserId": "U001", "toUserId": "U005", "amount": 27500.0}
r = requests.post(f"{BACKEND}/api/txn/initiate", json=txn_req, timeout=20)
d = r.json()

L(f"HTTP Status     : {r.status_code}")
L(f"txnId           : {d.get('txnId', 'ERROR')}")
L(f"nonce           : {d.get('nonce', 'N/A')}")
L(f"status          : {d.get('status', d.get('error', 'N/A'))}")
L(f"routingDecision : {d.get('routingDecision', 'N/A')}")
L(f"riskScore       : {d.get('riskScore', 'N/A')}")
L(f"escrowOptIn     : {d.get('escrowOptIn', False)}")
L(f"createdAt       : {d.get('createdAt', 'N/A')}")

if d.get('riskBreakdown'):
    L("\nRisk Breakdown:")
    for rb in d['riskBreakdown']:
        L(f"  [{rb['rule']:<18}] +{rb['points']:>2}pts  {rb['reason'][:65]}")

# --- Canton projections post-txn ---
try:
    cs2 = requests.get(f"{BACKEND}/api/canton/status", timeout=5).json()
    L("\nCanton Projections (post-txn):")
    for col, cnt in cs2['collections'].items():
        flag = " <-- UPDATED" if col in ['cantonHoldProjections','cantonApprovalProjections',
                                          'cantonContractRefs','cantonCommandAudit',
                                          'cantonTransactionLogs','cantonBankLedgerCopies'] and cnt > 0 else ""
        L(f"  {col:<32}: {cnt}{flag}")
except Exception as e:
    L(f"  Canton status error: {e}")

# --- Backend Canton logs check ---
L("\nBackend Canton Log (auto-refresh check):")
import subprocess
log_r = subprocess.run([
    r"C:\Users\newab\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe",
    "logs", "--since", "5m", "fraudshield-backend"
], capture_output=True, text=True)
all_logs = (log_r.stdout + log_r.stderr).splitlines()
canton_lines = [ln for ln in all_logs if "[Canton]" in ln or "Upserted" in ln or "DAML" in ln]
for cl in canton_lines[-15:]:
    L(f"  {cl.strip()[:100]}")

L("\n" + "=" * 70)
L("FULL JSON RESPONSE:")
L(json.dumps(d, indent=2, default=str))
L("=" * 70)

with open("txn_result.tx", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("\nSaved to txn_result.tx")
