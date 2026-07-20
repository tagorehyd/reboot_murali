# FraudShield Canton Integration - Implementation Checklist

## Phase 0: Architecture Freeze ✓ COMPLETE
- [x] Party mapping documented (3 banks, 12 users, 1 synchronizer)
- [x] Contract responsibility matrix defined
- [x] Risk routing state machines (LOW/MEDIUM/HIGH)
- [x] Java ↔ DAML mapping defined
- [x] Event consumer projection logic drafted
- [x] Proof payload schema approved
- [x] Authorization boundaries clarified

**Deliverables**:
- `CANTON_ARCHITECTURE.md` - Complete architecture guide
- Responsibility matrix in architecture doc
- 3 state machine diagrams for risk routes

---

## Phase 1: Canton Network Bootstrap ✓ COMPLETE
- [x] Canton configuration created (`canton.conf`)
- [x] Network topology: 3 banks + synchronizer + domain
- [x] SQLite storage configured for dev
- [x] Port mapping documented (4011-5033)
- [x] Startup scripts created (Windows + Unix)
- [x] Health check endpoints documented
- [x] Troubleshooting guide created
- [x] Quick start guide created

**Deliverables**:
- `canton.conf` - Network configuration
- `CANTON_SETUP.md` - Comprehensive setup guide
- `CANTON_QUICK_START.md` - Quick reference
- `setup-canton.ps1` - Windows setup
- `start-canton-network.sh` - Unix startup

**Validation**:
- [ ] Run: `daml version` → shows 3.1.0+
- [ ] Run: `canton -c canton.conf` → participants connect
- [ ] Test: `curl http://localhost:5001/v1/healthy` → 200 OK
- [ ] Test: All 5 endpoints respond (domain, 4 participants)

---

## Phase 2: DAML Project Skeleton (NEXT)
**Prerequisites**: Phase 1 complete, Canton running

### Tasks:
- [ ] Create DAML project: `daml new fraudshield-contracts`
- [ ] Structure modules:
  - Common.daml (shared types, parties, enums)
  - HoldRequest.daml (hold service)
  - EscrowAgreement.daml (escrow service)
  - MultiSigApproval.daml (approval service)
  - Party.daml (party definitions)
- [ ] Compile DAML package
- [ ] Deploy to Canton network

### Deliverables:
- DAML project structure in `fraudshield-contracts/`
- Compiled DAR file
- Deployment script
- Party onboarding script

### Validation:
- [ ] `daml build` completes without errors
- [ ] DAR file generated
- [ ] Deploy to Canton sandbox
- [ ] Verify in participant admin APIs

---

## Phase 3: Party Onboarding and Identity Model (AFTER Phase 2)
### Tasks:
- [ ] Create BankProfile contract template
- [ ] Create CustomerProfile contract template
- [ ] Seed 3 banks: BankA, BankB, BankC
- [ ] Seed 12 customers (4 per bank): A1-A4, B1-B4, C1-C4
- [ ] Create mapping: MongoDB user ID → DAML party
- [ ] Create GlobalSynchronizer party role

### Deliverables:
- `BankProfile.daml` contract
- `CustomerProfile.daml` contract
- `PartySetup.daml` seed data
- Mongo ↔ DAML party mapping table

### Validation:
- [ ] 3 BankProfile contracts active
- [ ] 12 CustomerProfile contracts active
- [ ] All parties have correct visibility
- [ ] Party mapping queryable from Java backend

---

## Phase 4-6: Smart Contract Templates (AFTER Phase 3)
### Phase 4: Hold Service Contract
- [ ] HoldRequest template with PlaceHold/ReleaseHold/ExpireHold
- [ ] Expiry logic (1 hour for HIGH-risk)
- [ ] Java adapter methods

### Phase 5: Escrow Agreement Contract
- [ ] EscrowAgreement template with lifecycle
- [ ] OpenEscrow/FundEscrow/SettleEscrow/CancelEscrow
- [ ] Settlement authorization model

### Phase 6: MultiSig Approval Contract
- [ ] MultiSigApproval with configurable thresholds
- [ ] User-tier vs Bank-tier policies
- [ ] Approve/Reject/ExpireApproval/FinalizeIfThresholdMet

**Deliverables (All Phases 4-6)**:
- 3 core DAML contract modules
- Java adapter classes for each
- Test scenarios for each contract type

---

## Phase 7: Java Canton Adapter Layer (AFTER Phase 6)
### Tasks:
- [ ] Create Canton client integration package
  - `CantonLedgerClient.java` - gRPC connection
  - `CommandSubmitter.java` - command handling
  - `EventConsumer.java` - event stream reader
  - `PartyMapper.java` - user → party mapping
  - `ContractIdCache.java` - contract tracking
- [ ] Add to Backend `pom.xml`:
  - daml-java-codegen-runtime (3.1.0)
  - ledger-client-javaapi (3.1.0)
  - grpc-netty-shaded (1.56.1)
  - reactor-core (for async)
- [ ] Idempotency key management
- [ ] Error handling (retryable vs permanent)
- [ ] Correlation ID tracking (REST → Ledger)

### Deliverables:
- `com.fraudshield.canton.*` package
- Maven dependency updates
- Idempotency helper utilities
- Error handling strategy doc

### Validation:
- [ ] Backend connects to BankA ledger (5001)
- [ ] Can submit basic command
- [ ] Event stream readable
- [ ] No orphaned states on duplicate submission

---

## Phase 8: Fraud Routing Bridge (AFTER Phase 7)
### Tasks:
- [ ] Connect fraud scoring engine → DAML workflows
- [ ] Map risk tiers to contract paths:
  - 0-39 (LOW): Create Escrow (if opt-in) → Settlement
  - 40-69 (MEDIUM): Create Hold + UserMultiSig (TTL=15min)
  - 70+ (HIGH): Create Hold + BankMultiSig (TTL=60min)
- [ ] Update API responses with contract IDs
- [ ] WebSocket event streaming for live updates

### Deliverables:
- `RoutingOrchestrator.java` - main orchestrator
- Enum for `RiskTier` and `WorkflowType`
- Updated REST endpoints with contract refs
- WebSocket schema for ledger lifecycle events

### Validation:
- [ ] Transaction flows through correct DAML path based on score
- [ ] API returns proper contract IDs
- [ ] WebSocket emits status updates in real-time

---

## Phase 9: Global Synchronizer Settlement (AFTER Phase 8)
### Tasks:
- [ ] Implement synchronizer-driven settlement
- [ ] Verify hold release / approval threshold
- [ ] Execute terminal choices on Hold/Escrow/MultiSig
- [ ] Emit settlement proof events
- [ ] Cash-flow reconciliation

### Deliverables:
- `SynchronizerSettlementService.java`
- Settlement proof payload schema
- Audit trail logging

### Validation:
- [ ] Settlement only after all controls satisfied
- [ ] Complete trace queryable end-to-end
- [ ] No duplicate settlements

---

## Phase 10: Coexistence with Existing Projection (AFTER Phase 9)
### Tasks:
- [ ] Hybrid evidence model (blocks + contracts)
- [ ] Add DAML contract timeline to explorer
- [ ] Cross-link blockchain records ↔ contract IDs
- [ ] Reconciliation job (detect mismatches)

### Deliverables:
- Projection consistency controls
- Reconciliation job + alerts
- Explorer UI updates

---

## Phase 11: Frontend Real-Time Integration (AFTER Phase 10)
### Tasks:
- [ ] Add hold status to user portal
- [ ] Add escrow status to user portal
- [ ] Add approval progress (medium/high-risk)
- [ ] Admin console for multisig pending approvals
- [ ] WebSocket payload extensions for contract events

### Deliverables:
- Frontend UI updates for contract statuses
- WebSocket event type extensions

### Validation:
- [ ] Status updates visible without refresh
- [ ] Users can trace approvals step-by-step

---

## Phase 12: Security, Operations, Resilience (AFTER Phase 11)
### Tasks:
- [ ] Participant key/secret management via .env
- [ ] Observability metrics:
  - Participant connectivity
  - Command success/failure rates
  - Event stream lag
- [ ] Health endpoint enhancements
- [ ] Runbooks for participant outage recovery
- [ ] Extended readiness checks

### Deliverables:
- Security + ops checklist
- Health monitoring dashboard
- Runbook for failure scenarios

---

## Phase 13: Test Matrix & Demo Rehearsal (AFTER Phase 12)
### Test Scenarios:
- [ ] Low-risk fast path (0-39)
- [ ] Medium-risk multisig path (40-69) with user approval
- [ ] Medium-risk multisig path with timeout/rejection
- [ ] High-risk path (70+) with bank approval
- [ ] High-risk hold expiry without approval
- [ ] Synchronizer final settlement
- [ ] Rejection/escalation paths
- [ ] Demo reset and repeatability

### Deliverables:
- E2E test matrix with expected outcomes
- 8-minute demo runbook
- Demo reset tooling

### Validation:
- [ ] 3 consecutive successful dry runs
- [ ] No manual DB patching required between runs
- [ ] All 7 scenario types pass

---

## Phase 14: Cutover & Legacy Decommission (AFTER Phase 13)
### Tasks:
- [ ] Feature flags for staged rollout
- [ ] Read-only mode for legacy approval paths
- [ ] Data migration + reconciliation
- [ ] Rollback strategy

### Deliverables:
- Cutover checklist
- Feature flag design
- Rollback runbook

---

## Phase 15: Documentation & Handover (FINAL)
### Deliverables:
- Implementation guide (architecture + setup)
- Team runbooks (operations, troubleshooting)
- Demo narrative (fraud prevention + proof)
- Judge Q&A prep

---

## Current Status Summary

| Phase | Status | Key Files |
|-------|--------|-----------|
| 0 | ✓ COMPLETE | CANTON_ARCHITECTURE.md |
| 1 | ✓ COMPLETE | canton.conf, CANTON_SETUP.md, CANTON_QUICK_START.md |
| 2 | ⏳ NEXT | To be created |
| 3-15 | ⏹️ PENDING | Track as completed |

---

## How to Use This Checklist

1. **Current Phase**: Phase 1 ✓, Ready for Phase 2
2. **Before starting a phase**: Check "Prerequisites" box
3. **During phase**: Check off tasks as completed
4. **After phase**: Verify all validation items
5. **Move to next phase**: Only when all validation items checked

---

## Quick Commands Reference

```bash
# Start Canton
canton -c canton.conf

# Verify health
curl http://localhost:5001/v1/healthy

# Create DAML project (Phase 2)
daml new fraudshield-contracts --template=empty

# Build DAML
cd fraudshield-contracts && daml build

# Run Java backend
cd Backend && mvn spring-boot:run

# Check participant connectivity
curl -X GET http://localhost:5002/v1/admin/health
```

---

## Phase Completion Criteria

**A phase is COMPLETE when**:
1. All tasks checked
2. All deliverables created
3. All validation items verified
4. Ready to proceed to next phase

**Current**: Phase 1 complete, ready for Phase 2 ✓

---

**Last Updated**: 2026-07-20
**Version**: 1.0.0
**Maintained By**: FraudShield Team
