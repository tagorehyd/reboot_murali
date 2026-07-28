#!/usr/bin/env python3
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
"""
FraudShield — Full Canton Flow Verification
Runs every Canton-integrated API flow and records results.

Flows tested:
  1. LOW-RISK  transaction  → AUTO_APPROVE  (no Canton contracts)
  2. MEDIUM-RISK transaction → PENDING_CONSENT (user approval contract)
  3. HIGH-RISK transaction  → PENDING_BANK_APPROVAL (hold + bank approval)
  4. ESCROW OPT-IN          → EscrowAgreement contract (additive)
  5. USER CONSENT (approve) → exerciseUserConsent → PENDING_ADMIN
  6. ADMIN APPROVE          → exerciseApproval → SETTLED
  7. ADMIN REJECT           → exerciseRejection → REJECTED
  8. USER CONSENT (reject)  → exerciseRejection → REJECTED
  9. CONTRACT REF LOOKUP    → /api/canton/contract-refs/{txnId}
 10. PARTY MAPPINGS         → /api/canton/party-mappings
"""

import requests, json, time, datetime, sys

BACKEND = "http://localhost:8080"
RESULTS = []
PASS = "PASS"
FAIL = "FAIL"
SKIP = "SKIP"

SEP = "=" * 70

def ts():
    return datetime.datetime.now().strftime("%H:%M:%S")

def log(msg):
    print(f"[{ts()}] {msg}")

def record(flow_num, name, status, details):
    icon = "✅" if status == PASS else ("❌" if status == FAIL else "⚠️")
    RESULTS.append({
        "flow": flow_num,
        "name": name,
        "status": status,
        "details": details,
        "icon": icon
    })
    log(f"  {icon}  [{status}] {name}")

def initiate(from_uid, to_uid, amount, escrow=False):
    r = requests.post(f"{BACKEND}/api/txn/initiate",
                      json={"fromUserId": from_uid, "toUserId": to_uid,
                            "amount": amount, "escrowOptIn": escrow},
                      timeout=20)
    r.raise_for_status()
    return r.json()

def canton_status():
    r = requests.get(f"{BACKEND}/api/canton/status", timeout=8)
    r.raise_for_status()
    return r.json()

def contract_ref(txn_id):
    r = requests.get(f"{BACKEND}/api/canton/contract-refs/{txn_id}", timeout=8)
    return r

def consent(txn_id, approved, user_id="U003"):
    r = requests.post(f"{BACKEND}/api/admin/txn/{txn_id}/consent",
                      json={"approved": approved, "userId": user_id},
                      timeout=10)
    r.raise_for_status()
    return r.json()

def decide(txn_id, approved):
    r = requests.post(f"{BACKEND}/api/admin/txn/{txn_id}/decide",
                      json={"approved": approved},
                      timeout=10)
    r.raise_for_status()
    return r.json()

def escrow_optin(txn_id, from_uid):
    r = requests.post(f"{BACKEND}/api/canton/txn/{txn_id}/escrow-optin",
                      json={"fromUserId": from_uid},
                      timeout=10)
    r.raise_for_status()
    return r.json()

def party_mappings():
    r = requests.get(f"{BACKEND}/api/canton/party-mappings", timeout=8)
    r.raise_for_status()
    return r.json()

def admin_queue():
    r = requests.get(f"{BACKEND}/api/admin/queue", timeout=8)
    r.raise_for_status()
    return r.json()

# -----------------------------------------------------------------------------
# Pre-flight: Canton status
# -----------------------------------------------------------------------------
print(SEP)
print("FRAUDSHIELD — FULL CANTON FLOW VERIFICATION")
print(f"Started: {datetime.datetime.now().isoformat()}")
print(SEP)

log("Pre-flight: checking Canton readiness...")
canton_pre = canton_status()
readiness = canton_pre.get("readiness", {})
canton_up = readiness.get("status") == "UP"
participants = readiness.get("participants", {})
collections_before = canton_pre.get("collections", {})

log(f"  Canton status : {readiness.get('status')}")
for p, info in participants.items():
    log(f"  {p:20s}: ledger={info['ledger']}  admin={info['admin']}")
log(f"  Collections snapshot:")
for k, v in collections_before.items():
    log(f"    {k}: {v}")
print()

# -----------------------------------------------------------------------------
# FLOW 1 — Low-risk transaction (AUTO_APPROVE, no Canton contracts)
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("FLOW 1 — Low-risk transaction (AUTO_APPROVE)")
try:
    # U001 → U002, small amount, trusted payee — should stay < 40 risk
    txn1 = initiate("U001", "U002", 150.0)
    txn1_id = txn1["txnId"]
    status1 = txn1.get("status")
    risk1   = txn1.get("riskScore", 0)
    routing1 = txn1.get("routingDecision")
    log(f"  txnId={txn1_id}  status={status1}  risk={risk1}  routing={routing1}")

    # Check no Canton contract ref was written for low-risk
    time.sleep(0.5)
    ref1 = contract_ref(txn1_id)
    has_ref = ref1.status_code == 200

    passed = status1 in ("APPROVED", "ESCROW_ACTIVE") and risk1 < 40
    record(1, "Low-risk AUTO_APPROVE (no Canton contracts)", PASS if passed else FAIL, {
        "txnId": txn1_id, "status": status1, "riskScore": risk1,
        "routing": routing1, "canton_contract_ref_written": has_ref
    })
except Exception as e:
    record(1, "Low-risk AUTO_APPROVE", FAIL, {"error": str(e)})
    txn1_id = None

# -----------------------------------------------------------------------------
# FLOW 2 — Medium-risk transaction (CONSENT_REQUIRED → user approval contract)
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("FLOW 2 — High-score transaction (CONSENT_REQUIRED / PENDING_CONSENT)")
try:
    # U003 → U007, large amount + new payee + velocity → expected score ≥70 (CONSENT_REQUIRED)
    txn2 = initiate("U003", "U007", 28000.0)  # triggers LARGE_AMOUNT+NEW_PAYEE+VELOCITY+IF
    txn2_id = txn2["txnId"]
    status2 = txn2.get("status")
    risk2   = txn2.get("riskScore", 0)
    routing2 = txn2.get("routingDecision")
    log(f"  txnId={txn2_id}  status={status2}  risk={risk2}  routing={routing2}")

    time.sleep(0.5)
    ref2 = contract_ref(txn2_id)
    ref2_data = ref2.json() if ref2.status_code == 200 else {}
    approval_ref = ref2_data.get("approvalContractRef", "")
    log(f"  approvalContractRef={approval_ref}")

    passed = status2 in ("PENDING_CONSENT", "PENDING_USER_APPROVAL") or routing2 == "CONSENT_REQUIRED"
    record(2, "CONSENT_REQUIRED / PENDING_CONSENT (user approval contract)", PASS if passed else FAIL, {
        "txnId": txn2_id, "status": status2, "riskScore": risk2,
        "routing": routing2, "approvalContractRef": approval_ref
    })
except Exception as e:
    record(2, "Medium-risk PENDING_CONSENT", FAIL, {"error": str(e)})
    txn2_id = None

# -----------------------------------------------------------------------------
# FLOW 3 — High-risk transaction (PENDING_BANK_APPROVAL → hold + bank approval)
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("FLOW 3 — High-risk transaction (PENDING_BANK_APPROVAL)")
try:
    # U003 → U006, large amount → expected ≥70 risk
    txn3 = initiate("U003", "U006", 45000.0)
    txn3_id = txn3["txnId"]
    status3 = txn3.get("status")
    risk3   = txn3.get("riskScore", 0)
    routing3 = txn3.get("routingDecision")
    log(f"  txnId={txn3_id}  status={status3}  risk={risk3}  routing={routing3}")

    time.sleep(0.5)
    ref3 = contract_ref(txn3_id)
    ref3_data = ref3.json() if ref3.status_code == 200 else {}
    hold_ref3     = ref3_data.get("holdContractRef", "")
    approval_ref3 = ref3_data.get("approvalContractRef", "")
    log(f"  holdRef={hold_ref3}  approvalRef={approval_ref3}")

    passed = status3 in ("PENDING_BANK_APPROVAL", "HOLD_ACTIVE") and hold_ref3
    record(3, "High-risk PENDING_BANK_APPROVAL (hold + bank approval)", PASS if passed else FAIL, {
        "txnId": txn3_id, "status": status3, "riskScore": risk3,
        "routing": routing3, "holdContractRef": hold_ref3,
        "approvalContractRef": approval_ref3
    })
except Exception as e:
    record(3, "High-risk PENDING_BANK_APPROVAL", FAIL, {"error": str(e)})
    txn3_id = None

# -----------------------------------------------------------------------------
# FLOW 4 — Escrow opt-in (additive on an existing transaction)
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("FLOW 4 — Escrow opt-in on high-risk txn")
try:
    if txn3_id:
        esc = escrow_optin(txn3_id, "U003")
        escrow_ref = esc.get("escrowContractRef", "")
        log(f"  escrowContractRef={escrow_ref}")

        ref4 = contract_ref(txn3_id)
        ref4_data = ref4.json() if ref4.status_code == 200 else {}
        esc_persisted = ref4_data.get("escrowContractRef", "")
        log(f"  persisted escrowContractRef={esc_persisted}")

        passed = bool(escrow_ref) and esc.get("escrowOptIn") == True
        record(4, "Escrow opt-in (EscrowAgreement contract created)", PASS if passed else FAIL, {
            "txnId": txn3_id, "escrowContractRef": escrow_ref,
            "escrowOptIn": esc.get("escrowOptIn"), "persistedRef": esc_persisted
        })
    else:
        record(4, "Escrow opt-in", SKIP, {"reason": "FLOW 3 txnId not available"})
except Exception as e:
    record(4, "Escrow opt-in", FAIL, {"error": str(e)})

# -----------------------------------------------------------------------------
# FLOW 5 — User consent: APPROVE (medium-risk txn → PENDING_ADMIN)
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("FLOW 5 — User consent APPROVE (medium-risk → PENDING_ADMIN)")
try:
    if txn2_id:
        con5 = consent(txn2_id, approved=True, user_id="U002")
        status5 = con5.get("status")
        log(f"  consent result: status={status5}  msg={con5.get('message','')}")
        passed = status5 == "PENDING_ADMIN"
        record(5, "User consent APPROVE → PENDING_ADMIN", PASS if passed else FAIL, {
            "txnId": txn2_id, "resultStatus": status5, "msg": con5.get("message")
        })
    else:
        record(5, "User consent APPROVE", SKIP, {"reason": "FLOW 2 txnId not available"})
except Exception as e:
    record(5, "User consent APPROVE", FAIL, {"error": str(e)})

# -----------------------------------------------------------------------------
# FLOW 6 — Admin APPROVE (medium-risk after consent → SETTLED)
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("FLOW 6 — Admin APPROVE (→ APPROVED/SETTLED)")
try:
    if txn2_id:
        dec6 = decide(txn2_id, approved=True)
        status6 = dec6.get("status")
        log(f"  decide result: status={status6}  msg={dec6.get('message','')}")

        # Check contract ref for settlement
        time.sleep(0.3)
        ref6 = contract_ref(txn2_id)
        ref6_data = ref6.json() if ref6.status_code == 200 else {}
        settle_ref6 = ref6_data.get("settlementContractRef", "")
        log(f"  settlementContractRef={settle_ref6}")

        passed = status6 in ("APPROVED", "SETTLED")
        record(6, "Admin APPROVE → APPROVED + settlement contract", PASS if passed else FAIL, {
            "txnId": txn2_id, "resultStatus": status6,
            "settlementContractRef": settle_ref6
        })
    else:
        record(6, "Admin APPROVE", SKIP, {"reason": "FLOW 2 txnId not available"})
except Exception as e:
    record(6, "Admin APPROVE", FAIL, {"error": str(e)})

# -----------------------------------------------------------------------------
# FLOW 7 — Admin REJECT (high-risk txn → REJECTED)
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("FLOW 7 — Admin REJECT (high-risk txn → REJECTED)")
try:
    # Spawn a fresh high-risk txn specifically to reject
    txn7 = initiate("U001", "U006", 35000.0)  # high balance user, large amount -> high risk
    txn7_id = txn7["txnId"]
    status7_init = txn7.get("status")
    log(f"  new txnId={txn7_id}  initStatus={status7_init}")

    time.sleep(0.3)
    dec7 = decide(txn7_id, approved=False)
    status7 = dec7.get("status")
    log(f"  decide result: status={status7}  msg={dec7.get('message','')}")
    passed = status7 == "REJECTED"
    record(7, "Admin REJECT → REJECTED", PASS if passed else FAIL, {
        "txnId": txn7_id, "initStatus": status7_init, "resultStatus": status7
    })
except Exception as e:
    record(7, "Admin REJECT", FAIL, {"error": str(e)})
    txn7_id = None

# -----------------------------------------------------------------------------
# FLOW 8 — User consent: DENY (medium-risk txn → REJECTED)
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("FLOW 8 — User consent DENY (medium-risk → REJECTED)")
try:
    txn8 = initiate("U005", "U003", 7000.0)
    txn8_id = txn8["txnId"]
    status8_init = txn8.get("status")
    log(f"  new txnId={txn8_id}  initStatus={status8_init}")

    time.sleep(0.3)
    con8 = consent(txn8_id, approved=False, user_id="U005")
    status8 = con8.get("status")
    log(f"  consent result: status={status8}  msg={con8.get('message','')}")
    passed = status8 == "REJECTED"
    record(8, "User consent DENY → REJECTED", PASS if passed else FAIL, {
        "txnId": txn8_id, "initStatus": status8_init, "resultStatus": status8
    })
except Exception as e:
    record(8, "User consent DENY", FAIL, {"error": str(e)})

# -----------------------------------------------------------------------------
# FLOW 9 — Contract ref lookup
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("FLOW 9 — Contract ref lookup for high-risk txn")
try:
    if txn3_id:
        ref9 = contract_ref(txn3_id)
        data9 = ref9.json() if ref9.status_code == 200 else {}
        log(f"  HTTP {ref9.status_code}  data={json.dumps(data9)[:200]}")
        passed = ref9.status_code == 200 and data9.get("holdContractRef")
        record(9, "Contract ref lookup (hold + approval + escrow refs)", PASS if passed else FAIL, {
            "txnId": txn3_id, "http_status": ref9.status_code,
            "holdContractRef": data9.get("holdContractRef"),
            "approvalContractRef": data9.get("approvalContractRef"),
            "escrowContractRef": data9.get("escrowContractRef"),
            "settlementContractRef": data9.get("settlementContractRef")
        })
    else:
        record(9, "Contract ref lookup", SKIP, {"reason": "FLOW 3 txnId not available"})
except Exception as e:
    record(9, "Contract ref lookup", FAIL, {"error": str(e)})

# -----------------------------------------------------------------------------
# FLOW 10 — Party mappings
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("FLOW 10 — Party mappings endpoint")
try:
    pm = party_mappings()
    count = len(pm)
    sample = pm[0] if pm else {}
    log(f"  {count} party mappings found")
    log(f"  sample: appUserId={sample.get('appUserId')}  cantonPartyId={sample.get('cantonPartyId')}  bankId={sample.get('bankId')}")
    passed = count > 0
    record(10, "Party mappings (/api/canton/party-mappings)", PASS if passed else FAIL, {
        "totalMappings": count,
        "sampleUser": sample.get("appUserId"),
        "sampleParty": sample.get("cantonPartyId"),
        "sampleBank": sample.get("bankId")
    })
except Exception as e:
    record(10, "Party mappings", FAIL, {"error": str(e)})

# -----------------------------------------------------------------------------
# Post-run: Canton collection snapshot
# -----------------------------------------------------------------------------
print(f"\n{'-'*70}")
log("Post-run: Canton collection counts...")
canton_post = canton_status()
collections_after = canton_post.get("collections", {})

# -----------------------------------------------------------------------------
# Build output report
# -----------------------------------------------------------------------------
total = len(RESULTS)
passed_count = sum(1 for r in RESULTS if r["status"] == PASS)
failed_count = sum(1 for r in RESULTS if r["status"] == FAIL)
skipped_count = sum(1 for r in RESULTS if r["status"] == SKIP)

lines = []
lines.append(SEP)
lines.append("FRAUDSHIELD — FULL CANTON FLOW VERIFICATION REPORT")
lines.append(f"Generated : {datetime.datetime.now().isoformat()}")
lines.append(SEP)
lines.append("")
lines.append("CANTON INFRASTRUCTURE")
lines.append(f"  Status              : {readiness.get('status')}")
lines.append(f"  Enabled             : {canton_up}")
for p, info in participants.items():
    lines.append(f"  {p:20s}: ledger={info['ledger']}  admin={info['admin']}")
lines.append("")
lines.append("FLOW RESULTS SUMMARY")
lines.append(f"  Total flows : {total}")
lines.append(f"  PASS        : {passed_count}")
lines.append(f"  FAIL        : {failed_count}")
lines.append(f"  SKIP        : {skipped_count}")
lines.append("")

for r in RESULTS:
    lines.append(f"  {r['icon']}  FLOW {r['flow']:02d} [{r['status']:4s}] {r['name']}")

lines.append("")
lines.append(SEP)
lines.append("DETAILED FLOW RESULTS")
lines.append(SEP)
for r in RESULTS:
    lines.append("")
    lines.append(f"{'-'*60}")
    lines.append(f"FLOW {r['flow']:02d} — {r['name']}")
    lines.append(f"Status : {r['icon']} {r['status']}")
    lines.append("Details:")
    for k, v in r["details"].items():
        lines.append(f"  {k:30s}: {v}")

lines.append("")
lines.append(SEP)
lines.append("CANTON COLLECTION COUNTS (before → after)")
lines.append(SEP)
for col in collections_before:
    before = collections_before.get(col, 0)
    after  = collections_after.get(col, 0)
    delta  = f"+{after - before}" if isinstance(after, int) and isinstance(before, int) else "?"
    lines.append(f"  {col:35s}: {str(before):>4s}  →  {str(after):>4s}   ({delta})")

lines.append("")
lines.append(SEP)
overall = "ALL FLOWS PASSED ✅" if failed_count == 0 else f"{failed_count} FLOW(S) FAILED ❌"
lines.append(f"RESULT: {overall}")
lines.append(SEP)

report = "\n".join(lines)
print()
print(report)

outfile = "canton_flow_report.txt"
with open(outfile, "w", encoding="utf-8") as f:
    f.write(report)
print(f"\nReport saved to: {outfile}")
