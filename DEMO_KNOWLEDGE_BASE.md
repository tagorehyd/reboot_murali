# FraudShield — Master Demo Knowledge Base & Live Presentation Q&A Guide

Welcome to the **FraudShield Master Demo Knowledge Base**. This document contains comprehensive technical specifications, mathematical feature derivations, blockchain architecture details, and an exhaustive list of **25 live demo Q&A responses** designed for judges, technical evaluators, and project presentations.

---

## 🏛️ Section 1: System Core & High-Level Architecture

### What is FraudShield?
FraudShield is a **tamper-evident, multi-bank payment fraud prevention and consent platform** tailored for UK banking payment flows (Faster Payments / PayUK). It addresses Authorized Push Payment (APP) fraud using a hybrid scoring architecture:
1. **Unsupervised ML Anomaly Detection** (Isolation Forest microservice in Python).
2. **Rule-Based Deterministic Risk Engine** (Spring Boot Java 17 backend).
3. **Cryptographic Multi-Party Ledger** (DAML smart contracts on Canton distributed ledger).

### System Topology & Microservices

```
                                  ┌────────────────────────────────┐
                                  │      Vite + React Frontend     │
                                  │          (Port 5173)           │
                                  └───────────────┬────────────────┘
                                                  │ HTTP REST / WS
                                                  ▼
                                  ┌────────────────────────────────┐
                                  │       Spring Boot Backend      │
                                  │          (Port 8080)           │
                                  └───────┬───────────────┬────────┘
                                          │               │
                     ┌────────────────────┘               └────────────────────┐
                     │ HTTP POST /score                                        │ HTTP gRPC / JSON API
                     ▼                                                         ▼
    ┌─────────────────────────────────┐                       ┌─────────────────────────────────┐
    │     Isolation Forest ML Service │                       │   DAML Canton Ledger Network    │
    │       (Python/Flask Port 5001)  │                       │   (3 Banks + Synchronizer)      │
    └────────────────┬────────────────┘                       └─────────────────────────────────┘
                     │ Historical Query
                     ▼
    ┌─────────────────────────────────┐
    │        MongoDB 8.3              │
    │ (mempool & txn_history)         │
    └─────────────────────────────────┘
```

---

## 🧠 Section 2: Isolation Forest Machine Learning Microservice (`ml-service`)

### Why Unsupervised Learning?
Traditional supervised fraud models require millions of labeled fraud cases, which are heavily imbalanced (e.g. 99.9% legitimate vs 0.1% fraud) and fail against novel, unseen scam techniques. FraudShield uses **Isolation Forest**, an unsupervised anomaly detection algorithm that identifies anomalous transfers without needing target labels.

### How Isolation Forest Works
Isolation Forest builds an ensemble of $N=100$ randomized decision trees (`n_estimators=100`). Data points that are anomalous require significantly fewer random splits to isolate in feature space, resulting in much shorter path lengths $h(x)$ from the root of decision trees.

### 8-Dimensional Feature Vector ($X$)
Every incoming transaction payload is converted into an **8-dimensional normalized numerical vector**:

| Vector Index | Feature Symbol | Formula / Transformation | Engineering Purpose |
| :---: | :--- | :--- | :--- |
| `X[0]` | `log_amount` | $\ln(1 + \text{amount})$ | Logarithmic scaling to compress high monetary variance without distorting relative magnitudes. |
| `X[1]` | `drain_ratio` | $\frac{\text{amount}}{\text{senderBalance} + 1.0}$ | Measures account depletion percentage (e.g. $0.85 = 85\%$ balance drained). |
| `X[2]` | `is_new_payee` | $1$ if unverified, else $0$ | Binary flag indicating recipient is not in sender's trusted payees list. |
| `X[3]` | `hour_sin` | $\sin\left(\frac{2\pi \cdot \text{hour}}{24}\right)$ | Cyclical temporal encoding for daily 24-hour cycle. |
| `X[4]` | `hour_cos` | $\cos\left(\frac{2\pi \cdot \text{hour}}{24}\right)$ | Cyclical temporal encoding handling midnight (23:59 to 00:01) smooth continuity. |
| `X[5]` | `velocity_10m` | Count of txns in last 10 min | Sliding window transaction frequency for rapid drain / bot activity. |
| `X[6]` | `is_round_amount`| $1$ if $\ge 10000 \text{ and } (\text{amount} \pmod{10000} == 0)$, else $0$ | Detects round-sum money mule transfers. |
| `X[7]` | `is_large` | $1$ if $\text{amount} > 25000$, else $0$ | High-value threshold indicator. |

### Score Normalization & FraudShield Point Mapping
1. **Raw Decision Score**: $d = \text{decision\_function}(X) \in [-0.5, 0.5]$ (lower means more anomalous).
2. **Normalized Anomaly Score**:
   $$S = \text{clamp}\left(\frac{0.15 - d}{0.35}, 0.0, 1.0\right)$$
3. **FraudShield Points (0 – 30 Scale)**:
   - $S < 0.40 \implies 0$ points
   - $0.40 \le S < 0.65 \implies 5 + \lfloor (S - 0.40) \times 40 \rfloor$ (5 to 15 points)
   - $0.65 \le S < 0.85 \implies 15 + \lfloor (S - 0.65) \times 50 \rfloor$ (15 to 25 points)
   - $S \ge 0.85 \implies 25 + \lfloor (S - 0.85) \times 33 \rfloor$ (25 to 30 points)

---

## ⚙️ Section 3: Risk Evaluation Engine & 3-Tier Risk Routing

The Spring Boot backend combines deterministic rule points + ML Isolation Forest points to produce a composite **Risk Score ($0 - 100$)**:

$$\text{Total Risk Score} = \text{Min}\left(100, \sum \text{Rule Points} + \text{ML Points}\right)$$

### 3 Risk Routing Tiers

```
                          ┌─────────────────────────┐
                          │  Total Risk Score (0-100)│
                          └────────────┬────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │ (0 - 39)                    │ (40 - 69)                   │ (70 - 100)
         ▼                             ▼                             ▼
  ┌──────────────┐              ┌──────────────┐              ┌──────────────┐
  │  LOW RISK    │              │ MEDIUM RISK  │              │  HIGH RISK   │
  │ AUTO_APPROVE │              │ CONSENT_REQ  │              │  BANK_HOLD   │
  └──────┬───────┘              └──────┬───────┘              └──────┬───────┘
         │                             │                             │
  Direct Settlement             User Verification             Canton Hold Request
  Immediate Release             Pending User Approval         Bank Admin Sign-Off
```

### Deterministic Rule Point Breakdown
- **`LARGE_AMOUNT` (+20 pts)**: Amount $> \text{£}10,000$.
- **`NEW_PAYEE` (+15 pts)**: Payee not in verified trusted list.
- **`RAPID_DRAIN` (+25 pts)**: Amount $> 70\%$ of available balance.
- **`HIGH_VELOCITY` (+15 pts)**: $\ge 3$ transactions in 10-minute sliding window.
- **`OFF_HOURS` (+10 pts)**: Transaction between 11:00 PM and 6:00 AM.
- **`ISOLATION_FOREST` (+5 to +30 pts)**: Multi-dimensional ML anomaly contribution.

---

## ⛓️ Section 4: DAML Canton Blockchain Ledger Architecture

### Canton Multi-Participant Topology
- **3 Bank Participants**: `BankA_Party` (Stellar Bank), `BankB_Party` (Nova Finance), `BankC_Party` (Prime Banking).
- **1 Global Synchronizer**: `GlobalSynchronizer_Party` handling global domain ordering and settlement.

### Core DAML Smart Contracts
1. **`HoldRequest`**: Created automatically when a transaction hits HIGH RISK ($\ge 70$). Locks funds with a Time-To-Live (TTL) and requires Bank Admin approval.
2. **`EscrowAgreement`**: Customer protection agreement for high-value transactions.
3. **`MultiSigApproval`**: Requires dual-authorization from both originating bank officer and beneficiary bank officer before funds release.
4. **`SettlementAuthorization`**: Immutable proof of final settlement recorded on the ledger.

---

## ❓ Section 5: Top 25 Expected Live Demo Q&A Reference

### General Project Questions
1. **Q: What problem does FraudShield solve?**
   *A:* FraudShield solves Authorized Push Payment (APP) fraud in UK banking. When victims are tricked into authorizing transfers to scammers, traditional systems process the payment instantly. FraudShield detects multi-dimensional anomalies in real-time and holds suspicious transfers on an immutable ledger before funds leave the bank.

2. **Q: Why combine Machine Learning with Blockchain?**
   *A:* ML provides real-time pattern detection for unknown fraud vectors, while Blockchain (Canton/DAML) provides tamper-evident, multi-party consensus and immutable smart contract enforcement so no single bank can unilaterally alter audit records.

3. **Q: How does the system handle high transaction throughput?**
   *A:* Low-risk transactions ($0-39$ score) bypass heavy manual approval queues and achieve sub-second direct settlement. High-risk transactions are offloaded to asynchronous ledger holds, preserving core banking throughput.

### Machine Learning Service (`ml-service`) Questions
4. **Q: Why use Isolation Forest instead of Neural Networks or XGBoost?**
   *A:* Isolation Forest is an unsupervised algorithm specifically optimized for anomaly detection. It does not require historical labeled fraud targets (which are rare and constantly changing) and has linear time complexity $O(n)$ with ultra-low inference latency (~15ms).

5. **Q: What features are fed into the Isolation Forest model?**
   *A:* An 8-dimensional vector: `log_amount`, `drain_ratio`, `is_new_payee`, `hour_sin`, `hour_cos`, `velocity_10m`, `is_round_amount`, and `is_large`.

6. **Q: Why convert the hour of day into sine and cosine components?**
   *A:* Linear numbers (0 to 23) create a false discontinuity between 23:00 (11 PM) and 00:00 (midnight). $\sin(2\pi h/24)$ and $\cos(2\pi h/24)$ place time on a continuous unit circle so 23:59 and 00:01 are mathematically adjacent.

7. **Q: How is the raw Isolation Forest score mapped to FraudShield points?**
   *A:* Sklearn's raw decision score is normalized into an Anomaly Score $S \in [0, 1]$. $S$ is then mapped to a 0–30 point scale that adds directly into FraudShield's 100-point risk score.

8. **Q: What happens if the ML microservice goes offline during a transaction?**
   *A:* FraudShield implements a circuit-breaker resilience fallback. If the ML service times out (1500ms), Spring Boot catches the exception, assigns 0 ML points, logs a warning, and completes the evaluation safely using deterministic rules.

9. **Q: How is the ML model retrained?**
   *A:* Via `POST /train`. The microservice queries historical transactions from MongoDB (`mempool` + `txn_history`) or falls back to generating a synthetic UK banking baseline dataset (400 samples).

### Blockchain & Canton Ledger Questions
10. **Q: Why Canton / DAML instead of Ethereum or Hyperledger Fabric?**
    *A:* Canton is specifically designed for privacy-sensitive financial institutions. It enforces sub-transaction privacy (participants only see transactions they are stakeholders to) while maintaining global consensus without exposing user data on a public chain.

11. **Q: What smart contract is created when a high-risk fraud transaction is flagged?**
    *A:* A `HoldRequest` DAML contract is instantiated on the Canton ledger, setting the status to `PENDING_BANK_APPROVAL` and locking the transfer until authorized by an admin.

12. **Q: What is MultiSigApproval in FraudShield?**
    *A:* For high-risk or cross-bank transfers, `MultiSigApproval` requires cryptographic signatures from both the sending bank participant and the receiving bank participant before funds are released.

13. **Q: Can a bank officer tamper with the transaction logs?**
    *A:* No. All state updates are recorded as immutable Canton ledger transactions with cryptographic signatures from the synchronizer and participant nodes.

### Risk Routing & Rules Engine Questions
14. **Q: What are the score thresholds for the 3 risk routing tiers?**
    *A:* LOW RISK: 0–39 (Auto-Approve), MEDIUM RISK: 40–69 (User Consent Required), HIGH RISK: 70–100 (Bank Hold & Admin Approval).

15. **Q: What is the highest point rule in FraudShield?**
    *A:* `RAPID_DRAIN` (+25 points), which triggers when a transfer attempts to empty more than 70% of the sender's available account balance.

16. **Q: How does user consent work for Medium Risk transactions?**
    *A:* The transaction status is set to `PENDING_USER_APPROVAL`. The sender receives a prompt in the User Portal detailing the payee and risk reasons, requiring explicit confirmation before settlement proceeds.

17. **Q: Can per-user custom rules be configured?**
    *A:* Yes. User documents in MongoDB store `customRuleSettings` allowing specific fraud rules (e.g. `LARGE_AMOUNT`) to be enabled or disabled per user account.

### System & Demo Operations Questions
18. **Q: How do you start the entire FraudShield stack?**
    *A:* Run `.\runme.cmd` or `powershell -ExecutionPolicy Bypass -File .\run_all.ps1`. This launches MongoDB, Isolation Forest ML Service (port 5001), Spring Boot Backend (port 8080), and Vite Frontend UI (port 5173).

19. **Q: What demo accounts are pre-seeded in the system?**
    *A:* `U001` (Alice Walker - Stellar Bank), `U002` (Bob Taylor - Nova Finance), `U003` (Carlos Rivera), `U004` (Diana Prince), `U005` (Eve Chen), `U006` (Frank Okafor), `U007` (Grace Okonkwo).

20. **Q: How does the AI Assistant Chatbot work in FraudShield?**
    *A:* The AI Assistant is accessible via a floating widget on the UI. It combines project knowledge with live runtime metrics (users, mempool pending alerts, ML state) using local or cloud AI models.

21. **Q: Can the chatbot run 100% offline without internet?**
    *A:* Yes! The chatbot can query a local model (e.g., Gemma 2 via Ollama on port 11434) or fallback to instant vector matching against `DEMO_KNOWLEDGE_BASE.md`.

22. **Q: What hardware is required to run the local chatbot?**
    *A:* Any standard 16GB RAM laptop. Quantized models like Gemma 2 (2B/9B) or Llama 3.2 (3B) run comfortably within 3GB–5GB of system memory.

23. **Q: Where are live pending transactions inspected by bank admins?**
    *A:* In the **Admin Console** page (`/admin` in the UI), where bank officers can review risk score breakdowns, Isolation Forest reasons, and click "Approve" or "Reject".

24. **Q: Where can judges see the blockchain audit trail?**
    *A:* In the **Chain Explorer** page (`/explorer` in the UI), which displays consensus blocks, contract IDs, participant signatures, and timestamped state transitions.

25. **Q: What is the single biggest innovation of FraudShield?**
    *A:* Combining real-time 8D ML anomaly scoring with Canton smart contract hold enforcement—stopping fraudulent transfers *before* settlement while maintaining immutable multi-bank consensus.
