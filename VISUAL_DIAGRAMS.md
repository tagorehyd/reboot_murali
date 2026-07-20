# FraudShield Canton Integration - Visual Overview

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    FraudShield Fraud Detection Platform                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ FraudShield Backend (Java Spring Boot)                                   │
│  │  ├─ Fraud Scoring Engine (existing)                                      │
│  │  │   └─ Inputs: payer, payee, amount, channel                           │
│  │  │   └─ Output: Risk Score (0-100) → Risk Tier (LOW/MEDIUM/HIGH)       │
│  │  │                                                                        │
│  │  ├─ REST API (updated for Canton)                                        │
│  │  │   └─ POST /api/txn/initiate → Returns contract IDs                   │
│  │  │   └─ POST /api/txn/{id}/approve → Exercise DAML choices             │
│  │  │   └─ WebSocket events for real-time status                           │
│  │  │                                                                        │
│  │  └─ Canton Client (new - Phase 7)                                        │
│  │      ├─ gRPC connection to participants                                  │
│  │      ├─ Command submission (create contracts)                            │
│  │      ├─ Event consumer (status updates)                                  │
│  │      └─ MongoDB projection (sync ledger state)                           │
│  │                                                                            │
│  └─ MongoDB (existing)                                                       │
│      └─ Projection of DAML contract state + transaction history             │
│                                                                              │
│                              ↓                                               │
│                        gRPC + Protobuf                                       │
│                              ↓                                               │
│  ┌─ Canton Network (Local Deployment)                                        │
│  │                                                                            │
│  │  ┌──────────────────────────────────────────────────────┐               │
│  │  │         fraudshield-domain (Synchronizer)            │               │
│  │  │         Port 4011: Public API                        │               │
│  │  │         Port 4012: Admin API                         │               │
│  │  │         Port 4013: Metrics                           │               │
│  │  │         ✓ Single source of truth for settlement      │               │
│  │  └──────────────────────────────────────────────────────┘               │
│  │           ↑              ↑              ↑              ↑                  │
│  │        Domain Connection to all 4 participants                            │
│  │           ↓              ↓              ↓              ↓                  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  │    BankA     │  │    BankB     │  │    BankC     │  │ Synchronizer │ │
│  │  │ (Port 5001)  │  │ (Port 5011)  │  │ (Port 5021)  │  │ (Port 5031)  │ │
│  │  │              │  │              │  │              │  │              │ │
│  │  │ Ledger API   │  │ Ledger API   │  │ Ledger API   │  │ Ledger API   │ │
│  │  │ (5001)       │  │ (5011)       │  │ (5021)       │  │ (5031)       │ │
│  │  │ Admin API    │  │ Admin API    │  │ Admin API    │  │ Admin API    │ │
│  │  │ (5002)       │  │ (5012)       │  │ (5022)       │  │ (5032)       │ │
│  │  │ Metrics      │  │ Metrics      │  │ Metrics      │  │ Metrics      │ │
│  │  │ (5003)       │  │ (5013)       │  │ (5023)       │  │ (5033)       │ │
│  │  │              │  │              │  │              │  │              │ │
│  │  │ Contracts:   │  │ Contracts:   │  │ Contracts:   │  │ Can read all │ │
│  │  │ - Hold       │  │ - Hold       │  │ - Hold       │  │ contracts    │ │
│  │  │ - Escrow     │  │ - Escrow     │  │ - Escrow     │  │ - Executes   │ │
│  │  │ - MultiSig   │  │ - MultiSig   │  │ - MultiSig   │  │   settlement │ │
│  │  │              │  │              │  │              │  │              │ │
│  │  │ SQLite DB    │  │ SQLite DB    │  │ SQLite DB    │  │ SQLite DB    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│  │                                                                            │
│  └─ Data: ./canton-data/domain, banka, bankb, bankc, synchronizer           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

                              ↓ Events
                        (via gRPC stream)
                              ↓
                    MongoDB Projection Update
                              ↓
                        WebSocket → UI
```

---

## Transaction Flow Diagram

### LOW RISK (Score 0-39)

```
┌─────────────┐
│ Transaction │ Payer: A1, Payee: B1, Amount: 100 GBP
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Java Fraud Scoring                  │
│ Score = 25 (LOW RISK)               │
└──────┬──────────────────────────────┘
       │
       ├─ Decision: escrowOptIn=true?
       │
       ├─YES: Create DAML EscrowAgreement
       │      ├─ payer: A1
       │      ├─ payee: B1
       │      ├─ amount: 100
       │      └─ Status: OPEN
       │
       ↓
┌──────────────────────────────────────┐
│ GlobalSynchronizer (DAML)            │
│ Executes SettleEscrow                │
│ → Ledger settlement finalized        │
└──────┬───────────────────────────────┘
       │
       ↓ Settlement Event
       │
┌──────────────────────────────────────┐
│ Event Consumer (Java)                │
│ ├─ Status: SETTLED                   │
│ ├─ Settlement Time: 2026-07-20T20:45 │
│ └─ Update MongoDB + emit WebSocket   │
└──────┬───────────────────────────────┘
       │
       ↓
    UI: "Transaction Settled"
    Payer: A1 (Bank A)
    Payee: B1 (Bank B)
    Amount: 100 GBP
    Status: ✓ SETTLED
    Proof: [Ledger ID, Merkle Root]
```

### MEDIUM RISK (Score 40-69)

```
┌─────────────┐
│ Transaction │ Payer: A2, Payee: C1, Amount: 500 GBP
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Java Fraud Scoring                  │
│ Score = 55 (MEDIUM RISK)            │
└──────┬──────────────────────────────┘
       │
       ├─ Create DAML HoldRequest
       │  ├─ Amount: 500
       │  ├─ Reason: fraud_review
       │  └─ Status: HOLD_ACTIVE
       │
       ├─ Create DAML MultiSigApproval
       │  ├─ policyTier: USER
       │  ├─ requiredApprovers: [A2]  (the user)
       │  ├─ approvalThreshold: 1
       │  ├─ expiresAt: now + 15 minutes
       │  └─ Status: PENDING_USER_APPROVAL
       │
       ↓
   [WebSocket → UI: "Awaiting Your Approval"]
   [User sees approval modal]
       │
       ├─ User clicks [✓ APPROVE]
       │
       ↓
┌──────────────────────────────────────┐
│ Exercise MultiSigApproval.Approve    │
│ ├─ Approver: A2                      │
│ ├─ Timestamp: 2026-07-20T20:46       │
│ └─ Signature: [cryptographic proof]  │
└──────┬───────────────────────────────┘
       │
       ├─ Threshold met (1/1 approvals)
       │
       ├─ Exercise HoldRequest.ReleaseHold
       │
       ↓
┌──────────────────────────────────────┐
│ GlobalSynchronizer (DAML)            │
│ Executes SettleEscrow                │
│ → Ledger settlement finalized        │
└──────┬───────────────────────────────┘
       │
       ↓ Settlement Event
       │
    UI: "Transaction Settled"
    Status: ✓ SETTLED
    Approvals: [A2 at 2026-07-20T20:46]
    Proof: [Hold ID, MultiSig ID, Settlement Root]
```

### HIGH RISK (Score 70+)

```
┌─────────────┐
│ Transaction │ Payer: B2, Payee: A3, Amount: 10000 GBP
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│ Java Fraud Scoring                  │
│ Score = 82 (HIGH RISK)              │
└──────┬──────────────────────────────┘
       │
       ├─ Create DAML HoldRequest (MANDATORY)
       │  ├─ Amount: 10000
       │  ├─ Reason: high_risk_fraud_review
       │  ├─ expiresAt: now + 60 minutes
       │  └─ Status: HOLD_ACTIVE
       │
       ├─ Create DAML MultiSigApproval
       │  ├─ policyTier: BANK
       │  ├─ requiredApprovers: [BankB_Approver]
       │  ├─ approvalThreshold: 1
       │  ├─ expiresAt: now + 60 minutes
       │  └─ Status: PENDING_BANK_APPROVAL
       │
       ↓
   [WebSocket → Admin Console: "HIGH RISK - Awaiting Bank Approval"]
   [Bank admin sees transaction review queue]
       │
       ├─ Scenario A: Bank approves (within 60 min)
       │  │
       │  ├─ Exercise MultiSigApproval.Approve
       │  │  ├─ Approver: BankB_Approver
       │  │  ├─ Timestamp: 2026-07-20T20:47
       │  │  └─ Signature: [cryptographic proof]
       │  │
       │  ├─ Exercise HoldRequest.ReleaseHold
       │  │
       │  ↓
       │  GlobalSynchronizer SettleEscrow → SETTLED ✓
       │
       ├─ Scenario B: No approval before 60 min expires
       │  │
       │  ├─ Exercise HoldRequest.ExpireHold
       │  │
       │  ├─ Exercise MultiSigApproval.ExpireApproval
       │  │
       │  ↓
       │  Transaction → EXPIRED/REJECTED ✗
       │
       ↓
    UI: Transaction Status
    Status: ✓ SETTLED or ✗ EXPIRED
    Hold Period: 2026-07-20T20:35 to 2026-07-20T21:35
    Bank Approval: [BankB_Approver at 2026-07-20T20:47]
    Proof: [Hold ID, MultiSig ID, Settlement Root]
```

---

## Data Flow: REST Request → DAML Contract → Event → UI

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend User Action                                         │
│ (React UI in FrontEnd/)                                      │
│ Sends: POST /api/txn/initiate                              │
│ Body: { payer: "A1", payee: "B1", amount: 100 }           │
└─────────┬───────────────────────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend REST API (Spring Boot)                              │
│ /api/txn/initiate handler                                   │
│ 1. Save to MongoDB                                          │
│ 2. Call fraudScore() → 25 (LOW)                             │
│ 3. Call routingOrchestrator()                               │
│    └─ Route to LOW path                                     │
└─────────┬───────────────────────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────────────────────┐
│ Routing Orchestrator (Java)                                 │
│ For LOW risk:                                               │
│ 1. Create DAML command:                                     │
│    cantonClient.submitCommand(                              │
│      "CreateEscrowAgreement",                               │
│      {payer, payee, amount, ...}                            │
│    )                                                         │
│ 2. Set correlation ID: txn-id-123                           │
│ 3. Get contract ID from response                            │
│ 4. Return to REST handler                                   │
└─────────┬───────────────────────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────────────────────┐
│ REST Response (HTTP 200)                                    │
│ {                                                           │
│   transactionId: "txn-123",                                 │
│   status: "RISK_SCORED",                                    │
│   riskTier: "LOW",                                          │
│   escrowContractId: "contract-456",                         │
│   requiredApprovals: [],                                    │
│   statusUrl: "/api/txn/txn-123/status"                      │
│ }                                                           │
└─────────┬───────────────────────────────────────────────────┘
          │
          ├─────────────────────────┐
          │                         │
          ↓                         ↓
    Frontend                   Event Stream
    Updates UI                (Async)
    "Loading..."
                    │
                    ↓
            ┌───────────────────────────────┐
            │ DAML Contracts Created        │
            │ On Canton Network             │
            │                               │
            │ EscrowAgreement.status        │
            │ = OPEN                        │
            └───────┬───────────────────────┘
                    │
                    ↓ Contract Event
                    │ (via Ledger API)
                    │
            ┌───────────────────────────────┐
            │ Event: ContractCreated        │
            │ ├─ contractId: contract-456   │
            │ ├─ template: EscrowAgreement  │
            │ ├─ timestamp: 2026-07-20T20:45│
            │ └─ correlationId: txn-id-123  │
            └───────┬───────────────────────┘
                    │
                    ↓ Java Event Consumer
                    │ (Async processor)
                    │
            ┌───────────────────────────────┐
            │ Match correlation ID          │
            │ Update MongoDB:               │
            │ txn.status = "APPROVED"       │
            │ txn.escrowId = contract-456   │
            └───────┬───────────────────────┘
                    │
                    ↓ WebSocket Emit
                    │
            ┌───────────────────────────────┐
            │ Message to Frontend           │
            │ {                             │
            │   event: "txn_approved",      │
            │   transactionId: "txn-123",   │
            │   status: "APPROVED",         │
            │   timestamp: 2026-07-20T20:45 │
            │ }                             │
            └───────┬───────────────────────┘
                    │
                    ↓
                Frontend
                WebSocket Handler
                Updates UI
                "Transaction Approved"
                (Real-time, no polling)
                    │
                    ↓
            ┌───────────────────────────────┐
            │ GlobalSynchronizer            │
            │ Executes SettleEscrow         │
            │ on Canton Network             │
            └───────┬───────────────────────┘
                    │
                    ↓ Settlement Event
                    │
            ┌───────────────────────────────┐
            │ Status: SETTLED               │
            │ Settlement Proof emitted      │
            │ Final Ledger State recorded   │
            └───────┬───────────────────────┘
                    │
                    ↓
                UI Shows Final Status
                "✓ Transaction Settled"
                Proof link included
```

---

## Port & Service Mapping

```
┌─────────────────────────────────────────────────────────────────┐
│                    Port Allocation Reference                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Domain (fraudshield-domain)                                    │
│  ├─ 4011 → Public API (for participant connections)            │
│  ├─ 4012 → Admin API (metrics, management)                     │
│  └─ 4013 → Metrics (Prometheus format)                         │
│                                                                 │
│  BankA Participant                                              │
│  ├─ 5001 → Ledger API (gRPC, for Java client)                 │
│  ├─ 5002 → Admin API                                           │
│  └─ 5003 → Metrics                                             │
│                                                                 │
│  BankB Participant                                              │
│  ├─ 5011 → Ledger API                                          │
│  ├─ 5012 → Admin API                                           │
│  └─ 5013 → Metrics                                             │
│                                                                 │
│  BankC Participant                                              │
│  ├─ 5021 → Ledger API                                          │
│  ├─ 5022 → Admin API                                           │
│  └─ 5023 → Metrics                                             │
│                                                                 │
│  Synchronizer Participant                                       │
│  ├─ 5031 → Ledger API                                          │
│  ├─ 5032 → Admin API                                           │
│  └─ 5033 → Metrics                                             │
│                                                                 │
│  Backend Services (existing)                                    │
│  ├─ 8080 → Spring Boot REST API                                │
│  ├─ 8081 → MongoDB                                             │
│  └─ 3000 → React Frontend                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Party Authorization Matrix

```
┌──────────────────────────────────────────────────────┐
│           Who Can Do What On Ledger                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ BankA                                                │
│ ├─ Create contracts for A1, A2, A3, A4             │
│ ├─ Exercise choices on own contracts               │
│ ├─ Approve bank-tier multisigs (BankA approver)    │
│ └─ Read all contracts A1-A4, see own transactions  │
│                                                      │
│ BankB                                                │
│ ├─ Create contracts for B1, B2, B3, B4             │
│ ├─ Exercise choices on own contracts               │
│ ├─ Approve bank-tier multisigs (BankB approver)    │
│ └─ Read all contracts B1-B4, see own transactions  │
│                                                      │
│ BankC                                                │
│ ├─ Create contracts for C1, C2, C3, C4             │
│ ├─ Exercise choices on own contracts               │
│ ├─ Approve bank-tier multisigs (BankC approver)    │
│ └─ Read all contracts C1-C4, see own transactions  │
│                                                      │
│ GlobalSynchronizer                                   │
│ ├─ Read ALL active contracts                       │
│ ├─ Exercise SettleEscrow (final settlement)        │
│ ├─ Exercise ReleaseHold (after approval)           │
│ ├─ Exercise ExpireHold (on TTL)                    │
│ ├─ Exercise FinalizeMultiSig (after threshold)     │
│ └─ Emit settlement events to all parties           │
│                                                      │
│ Users (A1-A4, B1-B4, C1-C4)                        │
│ ├─ Approve medium-risk transactions                │
│ ├─ Read their own transactions                     │
│ └─ Cannot create contracts (bank does)             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

**Visual Reference Complete**  
See `CANTON_ARCHITECTURE.md` for detailed responsibility matrix.
