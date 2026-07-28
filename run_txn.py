#!/usr/bin/env python3
import requests, json, datetime, base64

BACKEND = 'http://localhost:8080'
BANKA   = 'http://localhost:7575'

def gen_jwt():
    hdr = {'alg':'none','typ':'JWT'}
    pay = {
        'actAs': ['BankA_Party::12202b691950eb69922944eedbf26cbe38cf4e10a6b809d5692c24417e92e9a243d7'],
        'readAs':['BankA_Party::12202b691950eb69922944eedbf26cbe38cf4e10a6b809d5692c24417e92e9a243d7'],
        'admin': True,
        'ledgerId': 'banka',
        'applicationId': 'FraudShield'
    }
    h = base64.urlsafe_b64encode(json.dumps(hdr, separators=(',',':')).encode()).rstrip(b'=').decode()
    p = base64.urlsafe_b64encode(json.dumps(pay, separators=(',',':')).encode()).rstrip(b'=').decode()
    return f"{h}.{p}."

ts = datetime.datetime.now().isoformat()

# ── 1. Fire the transaction ────────────────────────────────────────────────
txn_req = {'fromUserId': 'U002', 'toUserId': 'U006', 'amount': 32000.0}
txn_resp = requests.post(f'{BACKEND}/api/txn/initiate', json=txn_req, timeout=20)
txn = txn_resp.json()
txn_id = txn.get('txnId', 'N/A')

# ── 2. Canton projections state ───────────────────────────────────────────
canton = requests.get(f'{BACKEND}/api/canton/status', timeout=5).json()

# ── 3. Print summary ──────────────────────────────────────────────────────
lines = []
lines.append("=" * 64)
lines.append("FRAUDSHIELD LIVE TRANSACTION RESULT")
lines.append(f"Timestamp      : {ts}")
lines.append("=" * 64)
lines.append(f"Request        : U002 -> U006, GBP 32,000.00")
lines.append(f"HTTP Status    : {txn_resp.status_code}")
lines.append(f"txnId          : {txn_id}")
lines.append(f"nonce          : {txn.get('nonce', 'N/A')}")
lines.append(f"status         : {txn.get('status', 'N/A')}")
lines.append(f"routingDecision: {txn.get('routingDecision', 'N/A')}")
lines.append(f"riskScore      : {txn.get('riskScore', 'N/A')}")
lines.append(f"createdAt      : {txn.get('createdAt', 'N/A')}")
lines.append(f"escrowOptIn    : {txn.get('escrowOptIn', False)}")
lines.append("")
lines.append("Risk Breakdown:")
for r in txn.get('riskBreakdown', []):
    lines.append(f"  [{r['rule']}] +{r['points']}pts  {r['reason']}")
lines.append("")
lines.append("Canton Projections (post-txn):")
for k, v in canton.get('collections', {}).items():
    lines.append(f"  {k}: {v}")
lines.append("")
lines.append("Canton Participants:")
for name, info in canton.get('readiness', {}).get('participants', {}).items():
    lines.append(f"  {name}: ledger={info['ledger']} admin={info['admin']}")
lines.append("")
lines.append("Full JSON Response:")
lines.append(json.dumps(txn, indent=2, default=str))
lines.append("")
lines.append("Canton Status JSON:")
lines.append(json.dumps(canton, indent=2, default=str))
lines.append("=" * 64)

output = "\n".join(lines)
print(output)

# ── 4. Save to file ───────────────────────────────────────────────────────
with open("txn_result.tx", "w", encoding="utf-8") as f:
    f.write(output)
print("\nSaved to txn_result.tx")
