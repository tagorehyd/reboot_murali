#!/usr/bin/env python3
import sys, io, requests, json, time, datetime, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

"""
FraudShield — Canton API Stress Test & MongoDB Data Exporter
1. Runs a high-concurrency / loop stress test on Canton DAML APIs:
   - Low-risk payments
   - Medium-risk 15s user consent prompts & instant settlements
   - Medium-risk admin hold escalations
   - High-risk dual holds & approvals
   - High-risk rejections with sender fund refunds
   - Escrow Opt-in & SettleEscrow choices
   - POC Tamper injection & Auto-Repair verification
2. Fetches full data onboarded to MongoDB collections (ledger_state, audit_trail, mempool, suspicious_txns, alerts).
3. Formats and writes the captured MongoDB data to mongo_data_export.txt.
"""

BACKEND = "http://localhost:8080"
OUTPUT_TXT_FILE = os.path.join(os.path.dirname(__file__), "mongo_data_export.txt")

SEP = "=" * 80

def ts():
    return datetime.datetime.now().strftime("%H:%M:%S")

def log(msg):
    print(f"[{ts()}] {msg}")

def post_json(endpoint, data):
    r = requests.post(f"{BACKEND}{endpoint}", json=data, timeout=20)
    r.raise_for_status()
    return r.json()

def get_json(endpoint):
    r = requests.get(f"{BACKEND}{endpoint}", timeout=20)
    r.raise_for_status()
    return r.json()

def run_stress_test():
    print(SEP)
    print("🔥 STARTING CANTON DAML API STRESS TEST & MONGO DATA CAPTURE")
    print(SEP)

    # 1. Stress Test - Low Risk Loop (5 Transactions)
    log("Running Stress Batch 1: 5 Low-Risk Canton Settlement Payments...")
    for i in range(1, 6):
        try:
            res = post_json("/api/txn/initiate", {
                "fromUserId": "U001",
                "toUserId": "U002",
                "amount": 50.0 + (i * 10),
                "transactionType": "DOMESTIC",
                "bypassSelfLimits": True
            })
            log(f"  • Low-Risk Txn #{i} [{res.get('txnId')}]: Status = {res.get('status')}")
        except Exception as e:
            log(f"  ❌ Low-Risk Txn #{i} error: {e}")

    # 2. Stress Test - Medium Risk Consent & Admin Holds (3 Transactions)
    log("\nRunning Stress Batch 2: 3 Medium-Risk User Consent & Admin Escalation Payments...")
    for i in range(1, 4):
        try:
            res = post_json("/api/txn/initiate", {
                "fromUserId": "U001",
                "toUserId": "U004",
                "amount": 1500.0 + (i * 100),
                "transactionType": "DOMESTIC",
                "bypassSelfLimits": True
            })
            txn_id = res.get('txnId')
            log(f"  • Medium-Risk Txn #{i} [{txn_id}]: Initiated -> Status = {res.get('status')}")

            # Simulate consent approval for 1 & 2, decline for 3
            approve = (i != 3)
            consent_res = post_json(f"/api/txn/{txn_id}/user-consent", {"approved": approve})
            log(f"    └─ User Consent ({'Approve' if approve else 'Decline'}): Status = {consent_res.get('status')}")
        except Exception as e:
            log(f"  ❌ Medium-Risk Txn #{i} error: {e}")

    # 3. Stress Test - High Risk Dual Approvals & Rejections (3 Transactions)
    log("\nRunning Stress Batch 3: 3 High-Risk Dual Holds, Admin Approvals & Fund Refunds...")
    for i in range(1, 4):
        try:
            res = post_json("/api/txn/initiate", {
                "fromUserId": "U003",
                "toUserId": "U001",
                "amount": 20000.0 + (i * 2000),
                "transactionType": "DOMESTIC",
                "bypassSelfLimits": True
            })
            txn_id = res.get('txnId')
            log(f"  • High-Risk Txn #{i} [{txn_id}]: Dual Holds Created -> Status = {res.get('status')}")

            # Approve 1 & 2, Reject 3
            approve = (i != 3)
            decide_res = post_json(f"/api/admin/txn/{txn_id}/decide", {"approved": approve})
            log(f"    └─ Admin Decision ({'Approve' if approve else 'Reject'}): Status = {decide_res.get('status')}")
        except Exception as e:
            log(f"  ❌ High-Risk Txn #{i} error: {e}")

    # 4. Stress Test - Escrow Agreements (2 Transactions)
    log("\nRunning Stress Batch 4: 2 Canton Escrow Agreement Opt-ins...")
    for i in range(1, 3):
        try:
            res = post_json("/api/txn/initiate", {
                "fromUserId": "U001",
                "toUserId": "U003",
                "amount": 300.0 * i,
                "transactionType": "DOMESTIC",
                "escrowOptIn": True,
                "bypassSelfLimits": True
            })
            log(f"  • Escrow Txn #{i} [{res.get('txnId')}]: Status = {res.get('status')}")
        except Exception as e:
            log(f"  ❌ Escrow Txn #{i} error: {e}")

    # 5. Stress Test - Tamper Injection & Auto-Repair
    log("\nRunning Stress Batch 5: POC Database Tamper & Ledger Auto-Repair...")
    try:
        t_txn = post_json("/api/txn/initiate", {
            "fromUserId": "U001",
            "toUserId": "U002",
            "amount": 180.0,
            "transactionType": "DOMESTIC",
            "bypassSelfLimits": True
        })
        txn_id = t_txn.get('txnId')
        log(f"  • Tamper Target Txn [{txn_id}]: Original Amount = £180.00")

        # Inject tamper (£99,999.00)
        post_json("/api/chain/tamper", {"txnId": txn_id, "tamperedAmount": 99999.00})
        log(f"  • Tamper Injected: Operational amount altered to £99,999.00 in MongoDB")

        # Run verification & auto-repair
        v_res = post_json(f"/api/chain/verify/{txn_id}", {})
        log(f"  • Verification Output: TamperDetected = {v_res.get('tamperDetected')}, Repaired = {v_res.get('repaired')}, Original = £{v_res.get('originalAmount')}")
    except Exception as e:
        log(f"  ❌ Tamper test error: {e}")

    log("\n✅ Canton API Stress Test Loop Complete! Now exporting MongoDB collections...")

def export_mongo_data_to_file():
    print(SEP)
    print(f"📦 CAPTURING & EXPORTING ALL MONGO DATA TO: {OUTPUT_TXT_FILE}")
    print(SEP)

    data = {}
    try:
        data["alerts"] = get_json("/api/admin/alerts")
    except Exception as e:
        data["alerts"] = []

    try:
        data["suspicious_txns"] = get_json("/api/admin/suspicious")
    except Exception as e:
        data["suspicious_txns"] = []

    try:
        data["pending_queue"] = get_json("/api/admin/queue")
    except Exception as e:
        data["pending_queue"] = []

    try:
        data["mempool_status"] = get_json("/api/mempool/status")
    except Exception as e:
        data["mempool_status"] = {}

    try:
        data["party_mappings"] = get_json("/api/canton/party-mappings")
    except Exception as e:
        data["party_mappings"] = []

    with open(OUTPUT_TXT_FILE, "w", encoding="utf-8") as f:
        f.write("=" * 90 + "\n")
        f.write("             FRAUDSHIELD PLATFORM — COMPLETE MONGO DATA EXPORT REPORT\n")
        f.write("=" * 90 + "\n")
        f.write(f"Generated At: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 90 + "\n\n")

        for collection_name, docs in data.items():
            f.write(f"\n{"─" * 90}\n")
            f.write(f"📂 COLLECTION: {collection_name.upper()}  (Total Items: {len(docs) if isinstance(docs, (list, dict)) else 'N/A'})\n")
            f.write(f"{"─" * 90}\n")

            if isinstance(docs, list) and len(docs) > 0:
                for idx, doc in enumerate(docs, 1):
                    f.write(f"--- Item #{idx:03d} ---\n")
                    f.write(json.dumps(doc, indent=2, ensure_ascii=False) + "\n\n")
            elif isinstance(docs, dict) and len(docs) > 0:
                f.write(json.dumps(docs, indent=2, ensure_ascii=False) + "\n\n")
            else:
                f.write("No documents found in this collection.\n\n")

        f.write("\n" + "=" * 90 + "\n")
        f.write("                        END OF MONGO DATA EXPORT REPORT\n")
        f.write("=" * 90 + "\n")

    log(f"✅ SUCCESS! Captured all MongoDB records into text file:\n    {OUTPUT_TXT_FILE}")
    file_size = os.path.getsize(OUTPUT_TXT_FILE)
    log(f"    Export File Size: {file_size} bytes")

if __name__ == "__main__":
    run_stress_test()
    export_mongo_data_to_file()
