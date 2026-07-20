# FraudShield Canton/DAML Integration Architecture

## Document Version
- Date: 2026-07-20
- Status: PHASE 0 - Approved Responsibility Matrix
- Target Deployment: Hackathon Demo

---

## 1. Party and Role Model

### Banks (3 Participants)
| Bank | Party ID | Ledger Role | Responsibility |
|------|----------|-------------|-----------------|
| BankA | `BankA` | Participant | Initiator & responder for transactions; user account holder |
| BankB | `BankB` | Participant | Responder & settlement validator for incoming transfers |
| BankC | `BankC` | Participant | Responder & settlement validator for incoming transfers |

### Users (12 Total, 4 per Bank)
| Bank | User IDs | Ledger Mapping | Role |
|------|----------|---|------|
| BankA | A1, A2, A3, A4 | Party suffix `_A1`, `_A2`, etc. (owned by BankA) | Customer; initiates transfers |
| BankB | B1, B2, B3, B4 | Party suffix `_B1`, `_B2`, etc. (owned by BankB) | Customer; initiates transfers |
| BankC | C1, C2, C3, C4 | Party suffix `_C1`, `_C2`, etc. (owned by BankC) | Customer; initiates transfers |

### Global Synchronizer (1 Participant)
| Role | Party ID | Ledger Role | Responsibility |
|------|----------|-------------|-----------------|
| Synchronizer | `GlobalSynchronizer` | Participant + Observer of all | Final settlement executor; cash-flow authority |

### Authorization Model
```
Initiating Bank (payer's bank) → 
  can exercise HoldRequest, EscrowAgreement choices on own transactions
  can reject on timeout/policy violation

Receiving Bank (payee's bank) → 
  receives read-only event visibility
  can approve/reject bank-tier multisig

GlobalSynchronizer → 
  exercises final SettleEscrow/ExpireHold/FinalizeMultiSig choices
  has read visibility to all active contracts
  triggers settlement only after all controls satisfied
```

---

## 2. Contract Responsibility Matrix

### Fraud Scoring & Routing (Java Spring Boot)
**Owner**: Backend fraud-rules engine
**Input**: Transaction details (payer, payee, amount, channel)
**Output**: Risk tier (LOW=0-39, MEDIUM=40-69, HIGH=70+)
**Trigger**: Route to appropriate DAML contract workflow

**Risk Tier Mapping**:
- **LOW (0-39)**: Direct escrow path (if opt-in) → settlement
- **MEDIUM (40-69)**: Hold + User MultiSig approval → settlement
- **HIGH (70+)**: Hold (mandatory 1h) + Bank MultiSig approval → settlement

---

### HoldRequest Contract (DAML)
**Owner**: Initiating Bank
**Purpose**: Ledger-enforced time-based hold on transaction settlement
**Lifecycle**:
1. `PlaceHold`: Create hold (triggered by Java on MEDIUM/HIGH-risk)
2. `ReleaseHold`: Remove hold early (triggered by approval completion)
3. `ExpireHold`: Auto-transition on TTL expiry (1 hour for HIGH-risk)

**Contract Fields**:
```daml
template HoldRequest
  payer : Party
  payee : Party
  payingBank : Party
  receivingBank : Party
  synchronizer : Party
  amount : Decimal
  reason : Text  -- "fraud_review", "compliance_check", "manual_review"
  placedAt : Time
  expiresAt : Time
  holdId : Text  -- correlation to Java transaction ID
  transactionId : Text  -- Java txn ID reference
```

**Choices**:
- `ReleaseHold`: Available to initiating bank, GlobalSynchronizer
- `ExpireHold`: Available to GlobalSynchronizer (after expiresAt elapsed)

---

### EscrowAgreement Contract (DAML)
**Owner**: Initiating Bank
**Purpose**: Optional customer protection; ledger-backed settlement authority
**Lifecycle**:
1. `OpenEscrow`: Create escrow (triggered by Java if escrowOptIn=true)
2. `FundEscrow`: Lock funds (automatic or manual)
3. `SettleEscrow`: Release to payee after all approvals
4. `CancelEscrow`: Return to payer on rejection

**Contract Fields**:
```daml
template EscrowAgreement
  payer : Party
  payee : Party
  payingBank : Party
  receivingBank : Party
  synchronizer : Party
  amount : Decimal
  createdAt : Time
  expiresAt : Time
  escrowId : Text
  transactionId : Text
  status : Text  -- "OPEN", "FUNDED", "SETTLED", "CANCELLED"
```

**Choices**:
- `FundEscrow`: Lock funds in escrow (initiating bank)
- `SettleEscrow`: Release to payee (GlobalSynchronizer, after approvals)
- `CancelEscrow`: Return to payer (initiating bank or GlobalSynchronizer on rejection)

---

### MultiSigApproval Contract (DAML)
**Owner**: Initiating Bank (creator)
**Purpose**: Approval threshold enforcement for medium/high-risk flows
**Lifecycle**:
1. Create MultiSigApproval with required approvers
2. Signers approve/reject via `Approve` or `Reject` choices
3. `FinalizeIfThresholdMet`: Settlement proceeds if threshold met
4. `ExpireApproval`: Auto-reject on TTL expiry

**Contract Fields**:
```daml
template MultiSigApproval
  initiatingBank : Party
  receivingBank : Party
  synchronizer : Party
  payer : Party
  payee : Party
  amount : Decimal
  approvalId : Text
  transactionId : Text
  requiredApprovers : List Party
  approvalThreshold : Int  -- e.g., 1 of 1 (user), 1 of 1 (bank)
  approvals : List (Party, Bool)  -- (approver, isApproved)
  createdAt : Time
  expiresAt : Time
  policyTier : Text  -- "USER" (medium-risk) or "BANK" (high-risk)
```

**Choices**:
- `Approve`: Signer approves (adds to approvals list)
- `Reject`: Signer rejects (blocks settlement)
- `ExpireApproval`: Auto-reject after expiresAt
- `FinalizeIfThresholdMet`: Settlement trigger (GlobalSynchronizer, idempotent)

---

### Global Synchronizer Settlement (DAML)
**Owner**: GlobalSynchronizer
**Purpose**: Final cash-flow movement after all controls satisfied
**Responsibility**:
- Verify all required holds are released or expired
- Verify all required approvals met or expired with rejection
- Execute terminal choices on Hold, Escrow, MultiSig contracts
- Emit settlement event to both banks
- Trigger Java event consumer to finalize transaction status

**Orchestration Flow**:
```
Java Transaction Status: INITIATED
    ↓
    Fraud scoring → RISK_SCORED
    ↓
    [Parallel] Create Hold + Create MultiSig (if required) + Create Escrow (if opt-in)
    ↓
    [Wait for approvals / hold release]
    ↓
    GlobalSynchronizer checks all contracts → ready for settlement?
    ↓
    YES: Execute SettleEscrow/ReleaseHold → Java event listener → SETTLED
    NO:  Await expiry or explicit rejection
    ↓
    Rejection → Java event listener → REJECTED/EXPIRED
```

---

## 3. Risk Route Workflows (State Machines)

### Low-Risk Route (0-39)
```
INITIATED
  ↓ [Fraud score < 40]
RISK_SCORED
  ↓
  [If escrowOptIn=true]
    Create EscrowAgreement
    FundEscrow
  [Else]
    Skip escrow
  ↓
APPROVED (ready for settlement)
  ↓
GlobalSynchronizer executes final settlement
  ↓
SETTLED
```

### Medium-Risk Route (40-69)
```
INITIATED
  ↓ [Fraud score 40-69]
RISK_SCORED
  ↓
  [Create HoldRequest] (optional, for friction control)
  [Create MultiSigApproval(policyTier="USER", expiresAt=+15min)]
  ↓
PENDING_USER_APPROVAL
  ↓
  [User approves OR timeout expires]
  ↓
  IF APPROVED:
    Release Hold
    ↓
    APPROVED (ready for settlement)
  IF TIMEOUT or REJECTED:
    ↓
    EXPIRED / REJECTED
    [Cancel Escrow if present]
    ↓
    END
  ↓
  [If APPROVED]
    GlobalSynchronizer executes SettleEscrow
    ↓
    SETTLED
```

### High-Risk Route (70+)
```
INITIATED
  ↓ [Fraud score ≥ 70]
RISK_SCORED
  ↓
  [Create HoldRequest(expiresAt=+60min)]  -- MANDATORY
  [Create MultiSigApproval(policyTier="BANK", expiresAt=+60min)]
  ↓
HOLD_ACTIVE
  ↓
PENDING_BANK_APPROVAL
  ↓
  [Bank approves OR 60min timeout expires]
  ↓
  IF APPROVED:
    GlobalSynchronizer releases Hold
    ↓
    APPROVED (ready for settlement)
  IF TIMEOUT or REJECTED:
    GlobalSynchronizer expires Hold
    ↓
    EXPIRED / REJECTED
    [Cancel Escrow if present]
    ↓
    END
  ↓
  [If APPROVED]
    GlobalSynchronizer executes SettleEscrow
    ↓
    SETTLED
```

---

## 4. Java-to-DAML Mapping

### API Endpoints → Contract Actions

| REST Endpoint | Risk Tier | DAML Action | Ledger Effect |
|---------------|-----------|-------------|---------------|
| `POST /api/txn/initiate` | LOW | Create Escrow (if opt-in) | EscrowAgreement created |
| `POST /api/txn/initiate` | MEDIUM | Create Hold + MultiSig(USER) | HoldRequest + MultiSigApproval created |
| `POST /api/txn/initiate` | HIGH | Create Hold + MultiSig(BANK) | HoldRequest + MultiSigApproval created |
| `POST /api/txn/{txnId}/user-approve` | MEDIUM | Exercise Approve choice | MultiSigApproval.Approve |
| `POST /api/admin/txn/{txnId}/bank-approve` | HIGH | Exercise Approve choice | MultiSigApproval.Approve |
| `POST /api/txn/{txnId}/reject` | MEDIUM/HIGH | Exercise Reject choice | MultiSigApproval.Reject |
| [Internal] Settlement trigger | ALL | SettleEscrow + ReleaseHold (synchronizer) | Chain of terminal choices |

---

## 5. Event Flow: Java Event Consumer

### Ledger Event Types to Subscribe
- `HoldRequest` creation / `ReleaseHold` exercise / `ExpireHold` exercise
- `EscrowAgreement` creation / state transitions / `SettleEscrow` exercise
- `MultiSigApproval` creation / `Approve` exercise / `Reject` exercise / `ExpireApproval` exercise

### Event Consumer → MongoDB Projection
```
Event: MultiSigApproval.Approve exercised
  ↓ [Check contract state: threshold met?]
  ↓ [If YES: trigger GlobalSynchronizer settlement command]
  ↓ [Update MongoDB transaction.status = "APPROVED"]
  ↓ [Emit WebSocket update: "txn_approved"]

Event: HoldRequest.ReleaseHold exercised
  ↓ [Update MongoDB transaction.holdStatus = "RELEASED"]
  ↓ [Emit WebSocket update: "hold_released"]

Event: EscrowAgreement.SettleEscrow exercised
  ↓ [Update MongoDB transaction.status = "SETTLED"]
  ↓ [Record settlement timestamp]
  ↓ [Emit WebSocket update: "txn_settled"]
```

---

## 6. Deterministic Proof & Audit Trail

### Transaction Proof Payload (Ledger)
Each settlement transaction includes:
```json
{
  "transactionId": "txn_uuid",
  "timestamp": "ISO8601",
  "payerId": "A1",
  "payingBank": "BankA",
  "payeeId": "B2",
  "receivingBank": "BankB",
  "amount": 1000.00,
  "currency": "GBP",
  "riskTier": "HIGH",
  "holdContractId": "hold_uuid",
  "multiSigContractId": "multisig_uuid",
  "escrowContractId": "escrow_uuid (or null)",
  "approvals": [
    {"approver": "BankB", "timestamp": "ISO8601", "signature": "..."}
  ],
  "synchronizerApproval": "ISO8601",
  "settlementTimestamp": "ISO8601",
  "proof": "merkle_tree_root"
}
```

### Audit Trail
- Every contract choice exercise is immutable and timestamped
- Every approval/rejection is cryptographically signed
- Every settlement is authorized only by GlobalSynchronizer
- Complete timeline queryable via DAML API for regulator/audit

---

## 7. Success Criteria (Phase 0 Checklist)

- [ ] Party mapping documented and approved
- [ ] Contract responsibility matrix finalized
- [ ] State machine diagrams (3 risk routes) complete
- [ ] Java <-> DAML API mapping defined
- [ ] Event consumer projection logic drafted
- [ ] Proof payload schema agreed
- [ ] No ambiguity in authorization boundaries

**Approval Gate**: Proceed to Phase 1 only after all items checked.

---

## Next Phase: Phase 1 - Canton Network Bootstrap
- Deploy 3-bank + synchronizer network locally
- Verify participant connectivity
- Test basic command submission and event streaming
