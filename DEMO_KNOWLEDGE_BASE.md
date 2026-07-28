# FraudShield — Master Demo Knowledge Base (RAG Source of Truth)

**Purpose:** Canonical knowledge base for the FraudShield AI Assistant (RAG bot) and live demo Q&A. Every fact below is verified against the source code in this repository.
**Last verified:** 2026-07-28 against `Backend/`, `ml-service/`, `FrontEnd/`, `daml-contracts/`, `docker-compose.yml`.

**RAG usage notes (performance vs quality):**
- Each `##` section is a self-contained retrieval chunk with a stable ID like `[KB-05]`. Chunk on `##` headings.
- Facts are stated once, in the most specific section; the Quick Facts section duplicates only high-frequency lookup values.
- Q&A entries at the end are keyword-dense and mirror the offline precision index in `NvidiaNimChatService.java`.
- Plain-text math is used (no LaTeX) so small local models (Gemma 2 2B) and the chat renderer handle it correctly.

---

## [KB-01] Quick Facts (one-line answers)

Keywords: overview, summary, quick facts, ports, versions, thresholds

- Project: **FraudShield** — tamper-evident, multi-bank payment fraud prevention & consent platform for UK banking (Faster Payments / PayUK), targeting **Authorized Push Payment (APP) fraud**.
- Composite risk score: **0–100** = fraud rule points + Cortex AI points + Isolation Forest ML points − beneficiary trust discount, clamped to 0–100.
- Risk tiers: **0–39 LOW → AUTO_APPROVE**, **40–69 MEDIUM → ADMIN_REVIEW**, **70–100 HIGH → CONSENT_REQUIRED**.
- Backend: Spring Boot **3.2.5**, Java **17**, port **8080**. Frontend: React **18.3** + Vite **5.3** + Tailwind, dev port **5173** (Docker nginx port **3000**).
- ML service: Python **Flask** + scikit-learn **IsolationForest**, port **5001**, endpoints `/health`, `/score`, `/train`.
- ML contribution: **0–30 points** of the 100-point score; call timeout **5000 ms**; on failure the backend degrades to rules-only scoring.
- Database: **MongoDB** `mongodb://localhost:27017/fraudshield` (Docker image `mongo:7`).
- Internal ledger: **3 replicated chains** (alpha, beta, gamma) with **2-of-3 hash consensus**, blocks of **5 txns** or a **30-second timer**.
- Canton/DAML: 3 bank participants (BankA/BankB/BankC) + GlobalSynchronizer; Canton **2.7.6 open-source**; DAML templates `FraudShield:HoldRequest`, `MultiSigApproval`, `EscrowAgreement`, `SettlementAuthorization`.
- Canton is **disabled by default locally** (`canton.enabled=false` → simulated contract refs); Docker Compose runs it for real (`CANTON_ENABLED=true`).
- AI chatbot fallback chain: **1) local Ollama (gemma2:2b) → 2) NVIDIA NIM cloud (nvidia/nemotron-3-nano-omni-30b-a3b-reasoning) → 3) offline 100-entry keyword precision index** built from this file.
- Demo users: U001 Alice Walker … U007 Grace Okonkwo, plus ADMIN. Seeded by `SeedRunner.java`.
- Hold TTL: **60 minutes**. User-approval contract timeout: **15 minutes**. UI consent prompt countdown: **15 seconds**. Beneficiary cool-off: **1 hour**.
- Self-limit defaults: daily **£15,000**, weekly **£50,000**, max single beneficiary amount **£10,000**.

---

## [KB-02] What is FraudShield?

Keywords: what is fraudshield, problem, APP fraud, UK banking, overview, innovation

FraudShield is a tamper-evident, multi-bank payment fraud prevention and consent platform for UK banking payment flows (Faster Payments / PayUK). It targets **Authorized Push Payment (APP) fraud** — where victims are tricked into authorizing transfers to scammers — by scoring every transfer in real time and holding risky payments *before* money leaves the bank.

Three complementary engines produce one unified risk score:
1. **Deterministic fraud rules engine** (`FraudRulesEngine.java`, Spring Boot) — explainable, per-rule point contributions.
2. **Unsupervised ML anomaly detection** (`ml-service/`, Python Isolation Forest) — catches novel multi-dimensional fraud patterns without labeled data.
3. **Cortex AI anomaly review** (`CortexAiService.java`) — an LLM (gemini-2.5-flash via an OpenAI-compatible API) compares the transaction against the sender's history.

Enforcement and auditability come from two ledgers: an internal 3-chain consensus blockchain (alpha/beta/gamma in MongoDB) for settlement and tamper detection, and a **DAML/Canton** multi-party ledger for hold, approval, escrow and settlement smart contracts across three banks.

The single biggest innovation: combining real-time 8-dimensional ML anomaly scoring with ledger-enforced holds — suspicious transfers are stopped pre-settlement while every state change stays cryptographically auditable across banks.

---

## [KB-03] System Topology & Ports

Keywords: architecture, topology, microservices, ports, services, diagram

```
React + Vite Frontend (5173 dev / 3000 nginx)
        │ REST + WebSocket (/ws)
        ▼
Spring Boot Backend (8080)
   ├─→ Isolation Forest ML Service (Flask, 5001)  ── reads MongoDB for /train
   ├─→ Cortex AI API (cloud, gemini-2.5-flash)
   ├─→ NVIDIA NIM / Ollama (chatbot)
   ├─→ MongoDB (27017)  ← operational store + 3-chain ledger + Canton projections
   └─→ Canton network (when enabled) via DAML JSON API
        BankA 7575 · BankB 7585 · BankC 7595
```

| Service | Port(s) | Notes |
|---|---|---|
| Spring Boot backend | 8080 | REST API + WebSocket `/ws` |
| Vite frontend (dev) | 5173 | Docker nginx serves on 3000 |
| Isolation Forest ML | 5001 | Flask; Docker service `ml-service` |
| MongoDB | 27017 | DB name `fraudshield`; Docker `mongo:7` |
| Ollama (optional local LLM) | 11434 | model `gemma2:2b` |
| Canton BankA | 5001 ledger / 5002 admin | in Docker, BankA 5001 is NOT published on the host (avoids clash with ML service) |
| Canton BankB | 5011 ledger / 5012 admin | |
| Canton BankC | 5021 ledger / 5022 admin | |
| Canton GlobalSynchronizer | 5031 ledger / 5032 admin | domain/synchronizer public API 4011, admin 4012 |
| DAML JSON API | 7575 (BankA), 7585 (BankB), 7595 (BankC) | `daml json-api` containers |

Stack versions: Spring Boot 3.2.5, Java 17, Lombok; React 18.3.1, Vite 5.3.1, Tailwind 3.4.4, axios; Flask ≥3, scikit-learn ≥1.3, pymongo, joblib; Canton open-source 2.7.6, DAML SDK 2.7.6.

---

## [KB-04] End-to-End Transaction Lifecycle

Keywords: transaction flow, initiate, lifecycle, pipeline, POST /api/txn/initiate

`POST /api/txn/initiate` (`TransactionService.initiateTransaction`) runs this pipeline:

1. **Validation** — sender/recipient must exist, sender role must be USER, amount > 0, sender ≠ recipient, sender balance must cover the amount.
2. **Self-limit enforcement** (skipped when `bypassSelfLimits=true`): max beneficiary amount, domestic/international toggle, daily limit, weekly limit. A violation **blocks** the transaction with HTTP 400 before any scoring.
3. **Pre-step 1 — Cortex AI** (`CortexAiService.scoreNewTransaction`): LLM classifies the txn vs. the sender's history → weighted 0–35 points. Degrades gracefully (0 points, `evaluated=false`) when disabled or failing.
4. **Pre-step 2 — Isolation Forest ML** (`IsolationForestService.scoreTransaction`): backend builds the feature payload (amount, senderBalance, isNewPayee, hourOfDay, velocity10m) and calls `POST http://localhost:5001/score` (5000 ms timeout) → 0–30 points. On failure: 0 points, rules-only.
5. **Unified scoring** (`FraudRulesEngine.scoreTransaction`): 6 deterministic rules + AI points + ML points − beneficiary trust discount, clamped 0–100, each contribution recorded as a `riskBreakdown` item.
6. **Global beneficiary limit check**: if the amount exceeds the admin-set global limit, a 0-point `BENEFICIARY_GLOBAL_LIMIT_REVIEW` breakdown item is added and routing is forced to `ADMIN_REVIEW`.
7. **Routing → initial status**: `AUTO_APPROVE→APPROVED`, `ADMIN_REVIEW→PENDING_ADMIN`, `CONSENT_REQUIRED→PENDING_CONSENT`. Transaction saved to the **mempool** with a unique `TXN-<uuid>` id and a 16-byte SecureRandom hex nonce.
8. **Canton contract creation** (failures never block the mempool write):
   - Score ≥ 70 (or status PENDING_ADMIN): `createHoldContract` (60-min TTL, status → HOLD_ACTIVE) then `createBankApprovalContract` (status → PENDING_BANK_APPROVAL).
   - Score 40–69: same hold + bank-approval path in the current build (initial status PENDING_ADMIN triggers it).
   - Score 0–39: `createLowRiskSettlement` — settlement contract ref + `TXN_CREATED` and `SETTLEMENT_COMPLETED` ledger states.
   - `escrowOptIn=true` (any tier): additive `createEscrowContract`; a low-risk APPROVED txn becomes ESCROW_ACTIVE.
9. **Response** re-reads the transaction so the client sees the Canton-updated status, and returns txnId, nonce, riskScore, riskBreakdown, routingDecision, beneficiaryTrustTier/Discount.
10. **Block commit (async)**: the block builder later includes APPROVED txns in a consensus block, marks them COMMITTED, moves balances, and writes dual `txn_history` records (see [KB-10]).

`InitiateRequest` fields: `fromUserId`, `toUserId`, `amount`, `transactionType` (DOMESTIC / INTERNATIONAL), `bypassSelfLimits`, `escrowOptIn`.

---

## [KB-05] Deterministic Fraud Rules (exact points)

Keywords: rules engine, points, LARGE_AMOUNT, NEW_PAYEE, VELOCITY, ROUND_AMOUNT, OFF_HOURS, RAPID_DRAIN, breakdown

`FraudRulesEngine.java` — every triggered rule adds a `riskBreakdown` item with rule name, points, and a human-readable reason. Each rule can be toggled per user (see [KB-13]).

| Rule | Trigger | Points |
|---|---|---|
| `LARGE_AMOUNT` | amount > £25,000 | +20 |
| `LARGE_AMOUNT` (high band) | amount > £100,000 | +35 |
| `NEW_PAYEE` | recipient not in sender's `trustedPayees` list | +15 |
| `VELOCITY` | ≥ 3 non-rejected txns from sender in last 10 minutes | +15 |
| `VELOCITY` (high band) | ≥ 5 non-rejected txns in last 10 minutes | +25 |
| `ROUND_AMOUNT` | amount ≥ £10,000 AND divisible by £10,000 (mule pattern) | +5 |
| `OFF_HOURS` | Europe/London hour < 6 or ≥ 23 (11 PM–6 AM) | +10 |
| `RAPID_DRAIN` | amount > 70% of sender's available balance | +25 |
| `CORTEX_AI` | AI classification (see [KB-06]) | 0 to +35 |
| `ISOLATION_FOREST` | ML anomaly points (see [KB-07]) | 0 to +30 |
| `BENEFICIARY_TRUST_DISCOUNT` | active beneficiary relationship | −5 to −20 |

**Beneficiary trust discount** (only for beneficiaries with status ACTIVE; tier by relationship age):
NEW < 24h → −5 · GROWING ≥ 24h → −10 · ESTABLISHED ≥ 7 days → −15 · LONG_TERM ≥ 30 days → −20.
If the cool-off was bypassed when adding the beneficiary, the discount is capped at 12. The discount never takes the score below 0.

Final score = min(100, max(0, sum of all contributions)). The single highest-point deterministic rule is `LARGE_AMOUNT` at +35 (> £100k); among "standard" triggers, `RAPID_DRAIN` and 5+ `VELOCITY` are +25.

---

## [KB-06] Cortex AI Anomaly Pre-Step

Keywords: cortex, gemini, LLM scoring, classification, HIGHLY_ANOMALOUS, SUSPICIOUS, dummy mode

`CortexAiService.java` calls an OpenAI-compatible chat-completions API (`cortex.api.base-url`, model **gemini-2.5-flash**, temperature 0.2, timeout 30 s). Before scoring, it builds a context with the current transaction, the sender's balance, trusted payees, average/max historical amounts, and up to 10 recent mempool + 10 history records, then requires **strict JSON**: `{classification, risk_score (0–100), reasons[]}`.

Weighting onto the unified 0–100 scale (`weightAiScore`):
- `HIGHLY_ANOMALOUS` → clamp(rawScore × 0.4, 20, 35) points
- `SUSPICIOUS` → clamp(rawScore × 0.3, 8, 20) points
- `NORMAL` → 0 points

Runtime controls via `GET/POST /api/cortex/config`: `enabled` (kill switch) and `dummyMode`. **Dummy mode** synthesizes a deterministic verdict without any API call: base 10, +60 if amount ≥ £100k / +35 if ≥ £25k / +15 if ≥ £5k, +20 if recipient not trusted, +20 if amount > 70% of balance, then the same weighting. Whole-history and single-transaction reviews are exposed at `GET /api/cortex/review/user/{userId}` and `GET /api/cortex/review/txn/{txnId}` returning verdict RED_FLAG / REVIEW / CLEAR with per-anomaly reasons.

---

## [KB-07] Isolation Forest ML Microservice

Keywords: isolation forest, ml-service, 8-dimensional, features, anomaly score, model.py, app.py, scikit-learn, train, joblib

**Why unsupervised?** Supervised fraud models need huge labeled datasets that are extremely imbalanced and go stale against novel scams. Isolation Forest isolates anomalies with random splits — anomalous points need fewer splits (shorter tree paths) — no labels required, with linear time complexity and millisecond-level inference.

**Hyperparameters** (`model.py`): `n_estimators=100`, `contamination=0.1`, `random_state=42`, `n_jobs=-1` (scikit-learn `IsolationForest`).

**8-dimensional feature vector** extracted per transaction:

| Index | Feature | Formula | Purpose |
|---|---|---|---|
| X[0] | log_amount | ln(1 + amount) (`math.log1p`) | compress extreme monetary variance |
| X[1] | drain_ratio | amount / (senderBalance + 1.0) | fraction of balance being emptied |
| X[2] | is_new_payee | 1 if recipient unverified else 0 | untrusted recipient flag |
| X[3] | hour_sin | sin(2π · hour / 24) | cyclical time encoding |
| X[4] | hour_cos | cos(2π · hour / 24) | makes 23:59 and 00:01 adjacent |
| X[5] | velocity_10m | count of sender txns in last 10 min | burst / bot activity |
| X[6] | is_round_amount | 1 if amount ≥ 10,000 and amount mod 10,000 == 0 | mule-style round transfers |
| X[7] | is_large | 1 if amount > 25,000 | high-value flag |

Why sin/cos for hour: plain integers 0–23 put a false cliff between 23:00 and 00:00; the sine/cosine pair places time on a continuous unit circle.

**Scoring** (`predict_anomaly` + `/score` in `app.py`):
1. Raw decision score d = `model.decision_function(X)` (≈ −0.5 to 0.5; lower = more anomalous).
2. Normalized anomaly score S = clamp((0.15 − d) / 0.35, 0.0, 1.0).
3. `isAnomaly` = (prediction == −1) or S > 0.6.
4. Points mapping to FraudShield's 0–30 band:
   - S < 0.40 → 0 points
   - 0.40 ≤ S < 0.65 → 5 + (S − 0.40) × 40 → 5–15 points
   - 0.65 ≤ S < 0.85 → 15 + (S − 0.65) × 50 → 15–25 points
   - S ≥ 0.85 → 25 + (S − 0.85) × 33 → 25–30 points (capped at 30)
5. Human-readable `reasons[]` when anomalous: unusual magnitude (> £25k), unverified payee pattern, velocity cluster (≥3 in 10 min), off-hours vector (hour < 6 or ≥ 23), high drain ratio (> 70% of balance).

**Training**: `POST /train` fits on supplied samples, else on transactions read from MongoDB `mempool` + `txn_history`; if fewer than 10 records, it generates a **400-sample synthetic UK baseline** (90% normal: ~£10–£500 daytime, Poisson velocity; 10% anomalous: £30k–£150k, off-hours, new payee, velocity 4–9). Model persisted with joblib to `isolation_forest.joblib`; auto-loads on startup and auto-trains if missing.

**Spring Boot integration** (`IsolationForestService.java`): builds the payload from live data (sender balance, trustedPayees check, Europe/London hour, 10-minute mempool velocity), 5000 ms connect/read timeout, runtime toggle at `GET/POST /api/isolation-forest/config`, retrain proxy `POST /api/isolation-forest/train`, health proxy `GET /api/isolation-forest/health`. **Circuit-breaker behavior:** any error → `evaluated=false`, 0 points, reason "Isolation Forest service unavailable — rules scoring only"; the transaction still completes.

---

## [KB-08] Risk Tiers, Routing Decisions & Statuses

Keywords: risk tiers, thresholds, routing, AUTO_APPROVE, ADMIN_REVIEW, CONSENT_REQUIRED, statuses, PENDING_ADMIN, PENDING_CONSENT, HOLD_ACTIVE

Score → routing (`FraudRulesEngine.determineRouting`) → initial mempool status (`TransactionService.mapRoutingToStatus`):

| Score | Tier | routingDecision | Initial status | What happens |
|---|---|---|---|---|
| 0–39 | LOW | `AUTO_APPROVE` | `APPROVED` | Low-risk settlement contract; committed to a consensus block within ~30 s; balances move at commit |
| 40–69 | MEDIUM | `ADMIN_REVIEW` | `PENDING_ADMIN` | Canton hold (60 min) + bank-approval contract; lands in the Admin Console queue |
| 70–100 | HIGH | `CONSENT_REQUIRED` | `PENDING_CONSENT` | 15-second user consent prompt path; Canton hold + bank-approval contracts are also raised, so it surfaces as HOLD_ACTIVE / PENDING_BANK_APPROVAL awaiting the bank |

**Full status vocabulary** (mempool `status` field): `APPROVED`, `PENDING_ADMIN`, `PENDING_CONSENT`, `HOLD_ACTIVE`, `PENDING_USER_APPROVAL`, `PENDING_BANK_APPROVAL`, `ESCROW_ACTIVE`, `SETTLED`, `COMMITTED`, `REJECTED`, `EXPIRED`.
- `COMMITTED` = included in a consensus block; balances applied; permanent `txn_history` records written.
- `SETTLED` = Canton settlement authorization completed (admin approval path).
- Admin queue (`GET /api/admin/queue`) lists: PENDING_ADMIN, PENDING_CONSENT, HOLD_ACTIVE, PENDING_BANK_APPROVAL, PENDING_USER_APPROVAL, ESCROW_ACTIVE.

**Naming note (for accurate demo answers):** in code, the 40–69 band routes to `ADMIN_REVIEW` (fraud-team queue) and the 70+ band routes to `CONSENT_REQUIRED` (explicit sender re-confirmation, escalating to the bank on decline/timeout). Some older docs describe 40–69 as "user consent" and 70+ as "bank hold" — when asked, prefer the code-accurate mapping above, or answer by score band and action rather than tier label.

---

## [KB-09] Consent & Admin Approval Flows

Keywords: user consent, 15 seconds, consent modal, admin console, approve, reject, refund, escalation

**User consent (15-second UI prompt)** — `POST /api/txn/{txnId}/user-consent` with `{approved: true|false}` (`TransactionService.processUserConsent`):
- The User Portal shows a modal with a **15-second countdown** (txnId, recipient, amount, risk score) when a txn returns a consent-pending status; the timer expiring auto-submits `approved=false`.
- **Approve** → low-risk settlement contract is created, ledger state `USER_CONSENT_RECEIVED`, status → `APPROVED` → settles via the next consensus block.
- **Decline / timeout** → ledger state `USER_CONSENT_DECLINED`, Canton hold + bank-approval contracts raised, status → `PENDING_ADMIN` (escalated to the fraud team).

**Admin consent relay** — `POST /api/admin/txn/{txnId}/consent`: approve → exercises the Canton user-approval choice, status `PENDING_ADMIN` (moves to admin review); reject → status `REJECTED` with routing `REJECTED_BY_USER`.

**Admin decision** — `POST /api/admin/txn/{txnId}/decide` with `{approved: true|false}`:
- **Approve** → `exerciseApproval`: exercises the DAML approval + ReleaseHold (+ SettleEscrow if present), writes `ADMIN_APPROVAL_GRANTED`, `HOLDS_RELEASED`, `SETTLEMENT_COMPLETED` ledger states, then final status `APPROVED` → block commit moves the money.
- **Reject** → `exerciseRejection`: status `REJECTED`, **sender is refunded** the amount, a `SuspiciousTransaction` record (`HIGH_RISK_REJECTION_REVERSED`) is created, ledger states `REJECTION_RECORDED` + `FRAUD_ALERT_CREATED` written.

The Admin Console UI (sidebar "Admin Console") shows the pending queue with full risk breakdowns (per-rule points, ML reasons, AI reasons) and Approve / Reject buttons; `GET /api/admin/alerts` and `GET /api/admin/suspicious` feed the alert and suspicious-transaction views.

---

## [KB-10] Internal 3-Chain Blockchain & 2-of-3 Consensus

Keywords: blockchain, alpha beta gamma, consensus, block builder, merkle root, SHA-256, block size, 30 seconds, tamper

`SingleChainBlockBuilderService.java` runs every **5 seconds** (`@Scheduled(fixedDelay=5000)`) and builds a block from APPROVED mempool txns when either trigger fires:
- **COUNT_TRIGGER**: 5 approved transactions ready (`BLOCK_SIZE = 5`), or
- **TIMER_TRIGGER**: 30 seconds elapsed since the last block window.

Block construction: transactions sorted by createdAt, **Merkle root** computed over them (`MerkleUtil`), a monotonic block nonce from the `BLOCK_NONCE_COUNTER` document, and the block hash = SHA-256 over the Merkle root + nonce (`HashUtil`). Three validators — **alpha, beta, gamma** — each produce a candidate hash; **2-of-3 majority agreement** commits the identical block to the three MongoDB chain collections with the agreeing validators recorded as `signatures`.

On commit: txns → `COMMITTED`, sender balance debited, recipient credited, dual `txn_history` records written (direction OUT and IN, with blockNumber), and WebSocket pushes sent (`balance_update`, `txn_status_update`, `admin:queue`) on endpoint `/ws`.

**Consensus failure** (demo-able via `POST /api/chain/force-consensus-failure`, which corrupts gamma's next candidate hash): no 2-of-3 agreement → batch txns marked `REJECTED`, a `SuspiciousTransaction` (reason `CONSENSUS_FAILURE`, review `PENDING_REVIEW`) and a WARNING `Alert` are created — visible on the Suspicious Txns page.

**Genesis block**: block 0, timestamp 2026-06-13T00:00:00Z, previous hash of 64 zeros, signatures [alpha, beta, gamma], trigger `GENESIS`, seeded identically to all three chains.

**Tamper-evidence demo** (`ChainController`):
- `POST /api/chain/tamper` `{txnId, tamperedAmount}` — deliberately corrupts the operational MongoDB amount.
- `GET|POST /api/chain/verify/{txnId}` — compares operational data against the signed-off DAML `ledger_state`; on mismatch it logs a CRITICAL `TAMPER_DETECTED` alert, records ledger state `TAMPER_ALERT_CREATED`, files a suspicious-transaction entry, and **auto-repairs** the operational amount back to the ledger-approved value.
- `POST /api/chain/sync` re-clones beta/gamma from alpha; `GET /api/chain/{alpha|beta|gamma}/blocks?limit=20` and `/block/{number}` feed the Chain Explorer.

---

## [KB-11] Canton / DAML Ledger Integration

Keywords: canton, DAML, smart contracts, HoldRequest, MultiSigApproval, EscrowAgreement, SettlementAuthorization, JSON API, participants, parties, simulation

**Topology:** 3 bank participants — `BankA_Party`, `BankB_Party`, `BankC_Party` — plus `GlobalSynchronizer_Party` (domain ordering/settlement authority). User→party mapping is seeded in `canton_party_mappings`: U001–U002 → BankA (participant `banka`), U003–U004 → BankB, U005–U007 → BankC, ADMIN → synchronizer/`GlobalSynchronizer_Party`; each user gets party id `<userId>_Party`.

**DAML templates** (`daml-contracts/src/FraudShield.daml`, configurable IDs `FraudShield:<Template>`):
- `HoldRequest {operator, holdId, txnId, fromUserId, amount}` — choice `ReleaseHold`. Created for high-risk holds; policy TTL **60 minutes**.
- `MultiSigApproval {operator, approvalId, txnId, initiatorUserId, policyTier, approvalThreshold, state}` — choices `Approve` / `Reject`. Used for user-approval (15-min timeout policy) and bank-approval workflows.
- `EscrowAgreement {operator, escrowId, txnId, payerUserId, amount}` — choice `SettleEscrow`. Additive customer protection; opt-in per transaction.
- `SettlementAuthorization {operator, settlementId, txnId, triggeredBy}` — choice `FinalizeSettlement`. Immutable settlement proof.
(A richer multi-party prototype with signatory/observer separation lives in `fraudshield-contracts/daml/`.)

**Two operating modes** (`CantonCommandService`):
- `canton.enabled=false` (local default): every command is **simulated** — deterministic refs like `#hold-…`, `#approval-user_approval-…`, `#escrow-…`, `#settlement-…` are generated, and all projections/audits/status updates still happen in MongoDB. The demo is fully functional offline.
- `canton.enabled=true` + `canton.real-submission-enabled=true` (Docker Compose default): commands go to the real ledger through the **DAML JSON API** (`CantonDamlJsonApiGateway`) at BankA 7575 / BankB 7585 / BankC 7595 with JWT tokens; on ledger failure it falls back to simulated refs so the flow never blocks.

**MongoDB projections** kept in sync for the UI and audits: `canton_party_mappings`, `canton_contract_refs` (hold/approval/escrow/settlement refs per txn), `canton_command_audit`, `canton_transaction_log`, `canton_bank_ledger_copies`, hold/approval/escrow/settlement projections, `canton_event_offsets`.

**Ledger state machine** (`ledger_state` collection, mirrored to `audit_trail`): `TXN_CREATED`, `SETTLEMENT_COMPLETED`, `USER_CONSENT_RECEIVED`, `USER_CONSENT_DECLINED`, `ADMIN_HOLD_CREATED`, `ADMIN_APPROVAL_GRANTED`, `HOLDS_RELEASED`, `ESCROW_HOLD_CREATED`, `ESCROW_RELEASED`, `REJECTION_RECORDED`, `FRAUD_ALERT_CREATED`, `TAMPER_ALERT_CREATED`. Full history per txn: `GET /api/chain/ledger-states/{txnId}`.

**Why Canton over Ethereum/Fabric:** Canton is built for regulated financial institutions — sub-transaction privacy (only stakeholders of a contract see it), strong multi-party authorization semantics in DAML (signatory/controller), and global consensus without exposing customer data on a public chain.

Canton REST surface: `GET /api/canton/status`, `GET/POST /api/canton/config` (runtime toggle, guarded by `canton.admin-toggle-enabled`), `GET /api/canton/party-mappings[/{appUserId}]`, `GET /api/canton/contract-refs/{txnId}`, `POST /api/canton/txn/{txnId}/escrow-optin`.

---

## [KB-12] Demo Users & Seed Data

Keywords: demo users, seed, U001, alice, balances, trusted payees, banks, admin

`SeedRunner.java` seeds once (idempotent — skips if users exist):

| ID | Name | Balance | Trusted payees | Canton bank | UI bank label |
|---|---|---|---|---|---|
| U001 | Alice Walker | £50,000 | U002, U003 | BankA | Stellar Bank |
| U002 | Bob Taylor | £75,000 | U001, U004 | BankA | Nova Finance |
| U003 | Carlos Rivera | £120,000 | U001 | BankB | Prime Banking |
| U004 | Diana Prince | £30,000 | U002, U005 | BankB | Apex Trust |
| U005 | Eve Chen | £200,000 | U006 | BankC | Quantum Pay |
| U006 | Frank Okafor | £15,000 | U005 | BankC | Gold Standard |
| U007 | Grace Okonkwo | £60,000 | U001, U002 | BankC | Liberty Banking |
| ADMIN | FraudShield Admin | £0 | — | Platform / synchronizer | — |

Account numbers 11220001–11220007. The Canton mapping (BankA/B/C) is the ledger-side grouping; the frontend account picker shows the marketing bank labels in the last column. Also seeded: genesis blocks on all 3 chains, `BLOCK_NONCE_COUNTER` = 0, and unlocked `MEMPOOL_LOCK` / `WRITE_LOCK` system locks.

Balances change live as blocks commit; admins can adjust via `POST /api/admin/balance/{userId}/add` and `/set`.

---

## [KB-13] User Controls: Self-Limits, Rule Toggles, Beneficiaries

Keywords: self limits, daily limit, weekly limit, max beneficiary, rule settings, toggles, beneficiaries, cool-off, trusted payees, global limit

**Self-imposed limits** (`SelfLimitService`, per user, London timezone): defaults daily **£15,000**, weekly **£50,000** (rolling 7 days), max single-beneficiary amount **£10,000**, domestic and international transfers enabled. Enforced pre-scoring; violations block with a clear reason. Spend counts committed OUT history plus active mempool txns. `bypassSelfLimits=true` on initiate skips these personal caps (fraud scoring still runs fully). Endpoints: `GET/PUT /api/users/{userId}/self-limits`, `POST .../self-limits/reset`. Risk indicator on settings: daily ≤ £10k LOW, ≤ £30k MEDIUM, else HIGH.

**Per-user rule toggles** (`UserRuleSettingsService`, stored in the user's `customRuleSettings` map, default all enabled): `LARGE_AMOUNT`, `NEW_PAYEE`, `VELOCITY`, `ROUND_AMOUNT`, `OFF_HOURS`, `RAPID_DRAIN`, `CORTEX_AI`, `ISOLATION_FOREST`. Disabled rules are skipped during scoring. Endpoints: `GET/PUT /api/users/{userId}/rule-settings`.

**Beneficiaries** (`BeneficiaryService`): adding a beneficiary starts a **1-hour cool-off** (`PENDING_ACTIVE` → `ACTIVE` when it elapses; `disableCoolOff=true` activates instantly but caps future trust discounts at 12). On activation the recipient is added to the sender's `trustedPayees` (clears the +15 NEW_PAYEE penalty) and starts earning the age-based trust discount ([KB-05]). Optional per-beneficiary `transactionLimit`. Endpoints: `GET/POST /api/users/{userId}/beneficiaries`, `DELETE .../{recipientUserId}`, `POST .../{recipientUserId}/activate`.

**Admin global beneficiary limit** (`GET/PUT /api/admin/beneficiary-limit`): a platform-wide amount ceiling; any transaction above it is force-routed to `ADMIN_REVIEW` with a `BENEFICIARY_GLOBAL_LIMIT_REVIEW` breakdown item (0 points — it changes routing, not score).

---

## [KB-14] AI Assistant Chatbot (RAG, 3-Tier Fallback)

Keywords: chatbot, AI assistant, NVIDIA NIM, nemotron, ollama, gemma, offline fallback, precision index, RAG, /api/chat

`NvidiaNimChatService.java` + floating widget `NvidiaNimChatbot.jsx` (mounted globally in `Layout.jsx`). Endpoint: `POST /api/chat` `{message, history[]}`; status: `GET /api/chat/status`.

**Fallback chain (in order):**
1. **Local Ollama** — `http://localhost:11434/v1/chat/completions`, model `gemma2:2b` (500 ms connect / 5 s read). 100% offline, no internet needed; a 16 GB laptop runs Gemma 2 2B in ~3 GB RAM.
2. **NVIDIA NIM cloud** — `https://integrate.api.nvidia.com/v1/chat/completions`, model `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`, max_tokens 16384, temperature 0.6, top_p 0.95 (2.5 s connect / 8 s read).
3. **Offline precision index** — a 100-entry keyword-matched Q&A index (id, title, keywords, answer) held in memory, derived from this file; scores entries by keyword hits in the prompt and returns the best answer in <10 ms, labeled "Offline Live Demo Mode — answered via DEMO_KNOWLEDGE_BASE.md precision index".

For tiers 1–2 the service injects a **live system context**: project summary, the 3 risk tiers, current London time, all user accounts with live balances, and mempool counts (total / pending consent / pending bank approval) — so answers blend static knowledge with runtime state.

Widget details: preset chips "🛡️ 3-Tier Risk Routing", "🧠 Isolation Forest 8D Vector", "⛓️ Canton Blockchain Consensus", "📊 Live System Status"; keeps the last 6 messages as conversation history; renders markdown-ish bold/code/lists via a custom parser.

---

## [KB-15] Frontend Pages & Live Updates

Keywords: frontend, pages, user portal, admin console, chain explorer, suspicious, websocket, UI

Single-page React app; sidebar views: **Home**, **User Portal** (account picker → per-user portal), **Admin Console**, **Chain Explorer**, **Suspicious Txns**; the AI Advisor chat widget floats on every view.

- **User Portal** (`UserPortal.jsx`): balance card, send-payment form (recipient, amount, DOMESTIC/INTERNATIONAL, escrow opt-in), client-side limit warnings, live risk-score breakdown after submit (RiskBreakdownCard + radar chart), pending consents (15-second consent modal), transaction history, self-limit sliders, per-rule toggle switches, beneficiary management, Cortex AI enable/dummy toggles.
- **Admin Console** (`AdminConsole.jsx`): pending queue with risk breakdowns and Approve/Reject; alerts; balance tools; global beneficiary limit.
- **Chain Explorer** (`ChainExplorer.jsx`): parallel block feeds for alpha/beta/gamma, block detail modal (block number/hash, previous hash, Merkle root, nonce, validator signatures, per-txn list, consensus status), DAML ledger-state timeline per txn, tamper/verify demo controls.
- **Suspicious Txns** (`SuspiciousTransactions.jsx`): consensus failures, tamper attempts, admin rejections with review status.
- **Live updates**: WebSocket at `/ws` pushes `balance_update`, `txn_status_update`, and `admin:queue` events; UI also polls REST.

Demo status messages: auto-approve → "Transaction auto-approved and accepted into mempool"; HOLD_ACTIVE → "High-risk transaction placed under Canton hold (60 min)"; PENDING_BANK_APPROVAL → "Awaiting bank approval via Canton contract"; PENDING_ADMIN → "Our fraud team is reviewing your request"; ESCROW_ACTIVE → "Canton escrow service active".

---

## [KB-16] Complete REST API Reference

Keywords: API, endpoints, REST, reference, routes

| Area | Method & Path | Purpose |
|---|---|---|
| Health | GET `/health` · `/ready` · `/metrics-lite` | liveness, readiness (Mongo + Canton), light counters |
| Transactions | POST `/api/txn/initiate` | score + route a payment |
| | GET `/api/mempool/status` | pending/approved/rejected counts, next block ETA (30 s) |
| | GET `/api/txn/user/{userId}/pending` · `/history` | user's active txns / committed history |
| | POST `/api/txn/{txnId}/user-consent` | 15-second consent approve/decline |
| Users | GET `/api/users/all` | all users with balances |
| | GET/PUT `/api/users/{id}/self-limits` · POST `.../reset` | self-limit settings |
| | GET/PUT `/api/users/{id}/rule-settings` | per-rule enable/disable |
| Beneficiaries | GET/POST `/api/users/{id}/beneficiaries` · DELETE `.../{rid}` · POST `.../{rid}/activate` | manage beneficiaries & cool-off |
| Admin | GET `/api/admin/queue` | pending review queue |
| | POST `/api/admin/txn/{txnId}/consent` · `/decide` | consent relay; final approve/reject (+refund on reject) |
| | GET `/api/admin/alerts` · `/api/admin/suspicious` | alerts, suspicious txns |
| | GET/PUT `/api/admin/beneficiary-limit` | global amount ceiling |
| | GET `/api/admin/balance/{id}` · POST `.../add` · `.../set` | balance admin |
| Chain | GET `/api/chain/{alpha\|beta\|gamma}/blocks?limit` · `/block/{n}` | explorer feeds |
| | POST `/api/chain/sync` · `/force-consensus-failure` · `/tamper` | replicas resync; consensus-failure demo; tamper demo |
| | GET/POST `/api/chain/verify/{txnId}` | integrity check + auto-repair |
| | GET `/api/chain/ledger-states/{txnId}` · `/api/chain/export-mongo-data` | DAML state history; full data export |
| Cortex AI | GET/POST `/api/cortex/config` · GET `/api/cortex/review/user/{id}` · `/review/txn/{id}` | toggles; anomaly reviews |
| Isolation Forest | GET/POST `/api/isolation-forest/config` · POST `/train` · GET `/health` | ML toggle, retrain, health (proxied) |
| Canton | GET `/api/canton/status` · GET/POST `/config` · GET `/party-mappings[/{id}]` · GET `/contract-refs/{txnId}` · POST `/txn/{txnId}/escrow-optin` | ledger status, mappings, refs, escrow opt-in |
| Chat | POST `/api/chat` · GET `/api/chat/status` | AI assistant |
| ML service (Flask, :5001) | GET `/health` · POST `/score` · POST `/train` | direct ML endpoints |
| WebSocket | `/ws` | balance/txn/admin-queue push events |

---

## [KB-17] MongoDB Collections

Keywords: mongodb, collections, mempool, txn_history, ledger_state, audit trail, schema

Core: `users` (balances, trustedPayees, self-limits, customRuleSettings, Canton mapping fields), `mempool` (active txns: status, riskScore, riskBreakdown[], nonce, contract refs, expiresAt), `txn_history` (permanent dual-entry records with direction IN/OUT and blockNumber), `beneficiaries`, `global config` (`GLOBAL_BENEFICIARY_LIMIT`).
Ledger: `chain_alpha` / `chain_beta` / `chain_gamma` (blocks), `block_nonce` (`BLOCK_NONCE_COUNTER`), `system_locks` (MEMPOOL_LOCK, WRITE_LOCK), `ledger_state` (DAML state transitions), `audit_trail` (event log mirror), `alerts`, `suspicious_txns`.
Canton projections: `canton_party_mappings`, `canton_contract_refs`, `canton_command_audit`, `canton_transaction_log`, `canton_bank_ledger_copies`, hold/approval/escrow/settlement projections, `canton_event_offsets`.

---

## [KB-18] Running the Stack & Demo Scripts

Keywords: run, start, runme, run_all.ps1, docker compose, kubernetes, demos, e2e, playwright

**Local (Windows):** double-click `runme.cmd` or run `powershell -ExecutionPolicy Bypass -File .\run_all.ps1`. The script checks/starts: MongoDB (27017) → Isolation Forest ML (`python ml-service/app.py`, 5001) → Spring Boot jar (8080, builds with `mvn clean package -DskipTests` if needed) → optional Ollama (11434) → Vite frontend (`npm run dev`, 5173). Without Ollama the chatbot uses NVIDIA NIM cloud, then the offline knowledge-base index.

**Docker:** `docker compose up` brings up mongodb (mongo:7), ml-service, canton (2.7.6) with the DAML build + DAR upload jobs, three `daml json-api` gateways (7575/7585/7595), the backend (with `CANTON_ENABLED=true` and real DAML submission), and the nginx frontend on port 3000.

**Kubernetes/GKE:** manifests in `k8s/` (namespace, mongodb, canton, daml, backend, frontend, kustomization); guides in `docs/GKE_DEPLOYMENT.md` and `docs/LOCAL_DOCKER_DEPLOYMENT.md`; a deployment skill exists at `.agents/skills/fraudshield_gcp_deployment/`.

**Scripted demos** (Playwright specs in `e2e/`, narration in `narration/`, audio in `audio/`):
1. **Instant settlement** — Alice (U001) → Bob (U002), **£150** → LOW risk, 0 points, auto-approve, committed by alpha/beta/gamma consensus within seconds.
2. **Isolation Forest hold** — Alice → Carlos (U003), **£4,500** → 8-D vector scored; magnitude + drain reasons escalate the score; transaction held for admin multi-sig approval in the Admin Console.
3. **AI RAG assistant** — chat widget answers Isolation Forest and 3-tier routing questions from the precision index / LLM tiers.
4. **Chain Explorer audit** — parallel alpha/beta/gamma feeds; block modal shows SHA-256 hash, previous-hash link, Merkle root, and verified consensus signatures.

---

## [KB-19] Resilience & Graceful Degradation

Keywords: resilience, fallback, circuit breaker, offline, degradation, failure

- **ML service down** → catch, `evaluated=false`, 0 ML points, scoring continues rules-only; reason string surfaces in the breakdown.
- **Cortex AI down/disabled** → 0 AI points, `evaluated=false`; optional dummy mode simulates verdicts with zero network calls.
- **Canton down/disabled** → simulated contract refs + full MongoDB projections; mempool write is never blocked by ledger errors; real-submission failures fall back to simulation per command.
- **Chatbot** → Ollama → NIM → offline keyword index; the demo can answer questions with all networks down.
- **Consensus failure** → batch quarantined to `suspicious_txns` + WARNING alert instead of committing.
- **Tampered data** → verify endpoint detects the mismatch against DAML ledger state, alerts, and auto-repairs the operational record.

---

## [KB-20] Live Demo Q&A Bank (25 canonical answers)

Keywords: questions, answers, judges, FAQ, demo

1. **What problem does FraudShield solve?** Authorized Push Payment (APP) fraud in UK banking. Traditional rails settle authorized payments instantly even when the victim was manipulated; FraudShield scores every transfer in real time (rules + ML + AI), routes risky ones into consent/hold flows, and keeps a tamper-evident multi-party audit trail — stopping fraud *before* settlement.

2. **Why combine ML with blockchain?** ML detects novel, multi-dimensional fraud patterns in real time; the ledger layer (3-chain consensus + Canton/DAML contracts) makes enforcement and audit immutable so no single bank or engineer can quietly alter or bypass a hold decision.

3. **What are the exact risk tiers?** 0–39 LOW → AUTO_APPROVE (instant settlement path); 40–69 MEDIUM → ADMIN_REVIEW (fraud-team queue, Canton hold raised); 70–100 HIGH → CONSENT_REQUIRED (15-second sender re-confirmation; decline or timeout escalates to bank admin with an active hold).

4. **What are the rule points?** LARGE_AMOUNT +20 over £25k / +35 over £100k; NEW_PAYEE +15; VELOCITY +15 at 3+ txns/10 min, +25 at 5+; ROUND_AMOUNT +5 (≥£10k and divisible by £10k); OFF_HOURS +10 (23:00–06:00 London); RAPID_DRAIN +25 (>70% of balance); plus Cortex AI 0–35, Isolation Forest 0–30, and a beneficiary trust discount of −5 to −20.

5. **Why Isolation Forest instead of a neural network or XGBoost?** It's unsupervised — no labeled fraud data needed, robust to the extreme class imbalance of fraud, effective against never-seen-before patterns, linear-time, and fast enough for inline scoring (milliseconds per transaction).

6. **What features feed the model?** An 8-D vector: log_amount = ln(1+amount); drain_ratio = amount/(balance+1); is_new_payee; hour_sin and hour_cos = sin/cos(2π·hour/24); velocity_10m; is_round_amount; is_large (> £25k).

7. **Why sine/cosine for the hour?** Integer hours put a false discontinuity between 23:00 and 00:00. The sin/cos pair maps time onto a continuous circle so 23:59 and 00:01 are mathematically adjacent — night-time fraud patterns aren't split in feature space.

8. **How does the raw score become points?** d = decision_function(X); S = clamp((0.15 − d)/0.35, 0, 1); then S<0.40→0 pts, 0.40–0.65→5–15, 0.65–0.85→15–25, ≥0.85→25–30 (max 30 of the 100-point score).

9. **What if the ML service dies mid-demo?** The Spring Boot call (5 s timeout) is wrapped: on any failure it returns evaluated=false with 0 points and the transaction completes on deterministic rules alone — graceful degradation, never an outage.

10. **How is the model trained?** `POST /train` fits on historical MongoDB transactions (mempool + txn_history); with under 10 records it generates a 400-sample synthetic UK baseline (90% normal daytime £10–£500, 10% anomalous £30k–£150k off-hours/new-payee/high-velocity). Persisted via joblib to `isolation_forest.joblib`; hyperparameters n_estimators=100, contamination=0.1, random_state=42.

11. **Why Canton/DAML instead of Ethereum or Fabric?** Canton is purpose-built for regulated finance: sub-transaction privacy (only stakeholders see a contract), DAML's signatory/controller authorization model, and global consensus without publishing customer data to a public chain.

12. **What contracts exist on the ledger?** `HoldRequest` (locks a risky txn, 60-min TTL, choice ReleaseHold), `MultiSigApproval` (Approve/Reject with policyTier and approvalThreshold — used for user- and bank-approval flows), `EscrowAgreement` (opt-in customer protection, SettleEscrow), `SettlementAuthorization` (immutable settlement proof).

13. **Can a bank officer tamper with records?** Try it: `POST /api/chain/tamper` corrupts an amount in MongoDB; `verify/{txnId}` then detects the mismatch against the signed-off DAML ledger state, raises a CRITICAL TAMPER_DETECTED alert, files a suspicious-transaction record, and auto-repairs the amount. Block hashes + Merkle roots on three replicated chains make silent edits detectable.

14. **What happens on user consent?** High-risk txns trigger a 15-second consent modal. Approve → settlement contract + USER_CONSENT_RECEIVED state → settles in the next block. Decline or timeout → USER_CONSENT_DECLINED, Canton hold + bank-approval contracts raised, escalated to the fraud team (PENDING_ADMIN).

15. **What happens when an admin approves or rejects?** Approve → DAML approval + ReleaseHold (+ escrow settle) exercised, HOLDS_RELEASED and SETTLEMENT_COMPLETED recorded, txn APPROVED → committed in the next block with balance movement. Reject → REJECTED, sender refunded, suspicious-transaction record created, FRAUD_ALERT_CREATED on the ledger.

16. **How are blocks built?** A scheduler (every 5 s) batches APPROVED txns: 5 txns (COUNT_TRIGGER) or a 30-second window (TIMER_TRIGGER) → Merkle root + SHA-256 block hash → alpha/beta/gamma validators must agree 2-of-3 → identical block committed to all three chains; disagreement quarantines the batch to Suspicious Txns.

17. **Where do judges see the audit trail?** Chain Explorer: live block feeds per chain, block modal (hash, previous hash, Merkle root, nonce, signatures, txn list), plus the per-transaction DAML ledger-state timeline (TXN_CREATED → holds/consents → SETTLEMENT_COMPLETED).

18. **What demo accounts exist?** U001 Alice Walker £50k, U002 Bob Taylor £75k, U003 Carlos Rivera £120k, U004 Diana Prince £30k, U005 Eve Chen £200k, U006 Frank Okafor £15k, U007 Grace Okonkwo £60k, plus a platform ADMIN. U001–U002 map to BankA, U003–U004 BankB, U005–U007 BankC on Canton.

19. **How do self-limits work?** Per-user caps enforced before scoring: daily £15k, weekly £50k, max single-payee £10k by default, plus domestic/international switches. Violations block immediately with the reason; `bypassSelfLimits` skips personal caps while full fraud scoring still applies.

20. **How does beneficiary trust reduce friction?** Added beneficiaries pass a 1-hour cool-off, join trustedPayees (removing the +15 NEW_PAYEE penalty), and earn an age-based discount: −5 (<24h), −10 (≥24h), −15 (≥7d), −20 (≥30d) — legitimate repeat payments glide through while first-time payees stay scrutinized.

21. **How does the chatbot work?** 3-tier fallback: local Ollama (gemma2:2b) → NVIDIA NIM cloud (nemotron-3-nano-omni-30b-a3b-reasoning) → offline 100-entry keyword precision index from DEMO_KNOWLEDGE_BASE.md. LLM tiers get a live system context (users, balances, mempool counts) so it can answer "what's the current status" questions.

22. **Can it run fully offline?** Yes. Canton commands simulate locally, Cortex has dummy mode, ML runs locally, and the chatbot's offline index answers in <10 ms. With Ollama installed, even free-form LLM chat is offline — Gemma 2 2B needs ~3 GB RAM on a 16 GB laptop.

23. **How do you start everything?** `runme.cmd` / `run_all.ps1` (MongoDB → ML 5001 → backend 8080 → Ollama 11434 → frontend 5173), or `docker compose up` for the full stack including the real Canton network, DAR upload, and JSON API gateways.

24. **What's the throughput story?** Low-risk payments (the vast majority) take the zero-touch path: scored inline (ML ~ms, 5 s worst-case timeout), auto-approved, and settled by the next consensus block (≤30 s). Risky payments are shunted to asynchronous consent/hold queues so fraud review never blocks the main flow.

25. **What's the single biggest innovation?** Real-time 8-dimensional ML anomaly scoring fused with deterministic explainable rules, enforced by ledger-held smart-contract holds — fraud is stopped pre-settlement, every decision is explainable per-rule, and the audit trail is tamper-evident across three banks.
