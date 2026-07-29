# 🏆 FraudShield — 5-Member Hackathon Pitch & Presentation Script

> **Target Audience**: Hackathon Judges / Executive Panel  
> **Total Time**: 5–7 Minutes  
> **Team Size**: 5 Presenters (UI Specialist, AI/ML Specialist, Java Backend Architect, Canton DAML Specialist, Cryptography & Consensus Specialist)

---

## 👥 Team Role Breakdown & Speaker Assignments

| Member | Speaker Role | Domain Expertise | Primary Topic Covered in Pitch |
| :--- | :--- | :--- | :--- |
| **Member 1** | **Presenter 1** | Frontend / UI Specialist | Problem Statement, UI Showcase, Customer Profiles, Real-Time Telemetry |
| **Member 2** | **Presenter 2** | AI & ML Expert | 8D Isolation Forest Engine, Anomaly Math, NVIDIA NIM RAG Assistant |
| **Member 3** | **Presenter 3** | Java Backend & Orchestration | Spring Boot 3.2 Microservice, 4 Payment Tiers, Routing Logic |
| **Member 4** | **Presenter 4** | Canton & DAML Ledger Specialist | Canton Distributed Ledger, DAML Smart Contracts & Choices (`Consent`, `Escrow`) |
| **Member 5** | **Presenter 5** | Cryptography & BFT Consensus | Merkle Tree Hashing, 3-Node Quorum ($\alpha, \beta, \gamma$), BFT Formula & Conclusion |

---

## 🎭 Step-by-Step Presentation Flow & Script

### 🎬 **SLIDE 1: Introduction & UI Experience**
**Speaker**: **Member 1 (UI / Frontend Specialist)**  
**Duration**: 60 Seconds  
**Screen / Action**: Open Live App at `http://localhost:3000` (Home Dashboard & User Cards)

#### 🎙️ Speaker Script:
> *"Good morning judges! Today, interbank payment fraud costs financial institutions over 30 billion dollars annually. Traditional centralized anti-fraud systems are slow, vulnerable to single-point tampering, and lack cross-bank real-time transparency.*
>
> *Welcome to **FraudShield** — a decentralized, tamper-evident interbank fraud defense platform built for modern banking networks like Lloyds Tech Centre.*
>
> *As you see on our live UI, FraudShield provides real-time telemetrics across 6 containerized microservices. Our system manages 7 customer accounts across institutions like Stellar Bank, Nova Finance, and Prime Banking.*
>
> *Our interface dynamically adapts between Light Mode and a sleek dark slate theme. We categorize every transaction into a 3-Tier Risk Model, ranging from instant low-risk transfers to multi-sig compliance holds and escrow settlements. Now, I’ll hand over to our AI Expert to explain how we evaluate risk in under 15 milliseconds."*

---

### 🧠 **SLIDE 2: 8D Isolation Forest & AI Engine**
**Speaker**: **Member 2 (AI & ML Specialist)**  
**Duration**: 75 Seconds  
**Screen / Action**: Point to the 3-Tier Risk Donut Chart and NVIDIA NIM Chatbot in UI

#### 🎙️ Speaker Script:
> *"Thank you! To detect sophisticated fraud without adding friction to legitimate users, we engineered an **8-Dimensional Isolation Forest Machine Learning Engine**.*
>
> *Every incoming payment is vectorized into an **8D Feature Space**:
> 1. `amount` — Transaction value in GBP
> 2. `hourOfDay` — Time-of-day behavioral pattern
> 3. `velocity10m` — Rapid transaction count in 10-minute sliding window
> 4. `historicalAvg` — Customer's mean baseline spending
> 5. `historicalStd` — Standard deviation of user spending
> 6. `isNewPayee` — Binary flag for unverified recipient
> 7. `trustTierDiscount` — Beneficiary trust discount
> 8. `interbankCode` — Cross-bank routing complexity*
>
> *Our Isolation Forest isolates anomalies by randomly partitioning feature space. Anomaly scores above `0.65` trigger immediate high-risk holds.*
>
> *Additionally, we integrated **NVIDIA NIM LLM with RAG** (Retrieval-Augmented Generation), allowing compliance officers to query ledger consensus rules in natural language. Next, our Backend Architect will show how Java orchestrates these decisions."*

---

### ⚙️ **SLIDE 3: Java Backend & 4-Tier Orchestration**
**Speaker**: **Member 3 (Java Backend Architect)**  
**Duration**: 75 Seconds  
**Screen / Action**: Switch to User Portal (`💸 Quick Pay`) & Admin Console

#### 🎙️ Speaker Script:
> *"Thanks! At the core of FraudShield is a **Spring Boot 3.2 Java Microservice** orchestrating payments, MongoDB persistence, and Canton ledger drivers over REST and WebSocket channels.*
>
> *We handle **4 distinct payment tiers**:
> - **Level 1 (£35 - Auto-Approve)**: Low risk ($Score < 20$). Passed instantly into the mempool and settled in under 50ms.
> - **Level 2 (£2,200 - Customer Consent)**: Medium risk ($20 \le Score < 50$). Triggers a customer 2FA choice before proceeding.
> - **Level 3 (£9,800 - Multi-Sig Compliance Hold)**: High risk ($Score \ge 50$). Paused in a compliance queue requiring bank multi-sig clearance.
> - **Level 4 (£3,500 - Escrow Lock)**: High-value transfers where funds are locked in an escrow hold until atomic settlement is confirmed.*
>
> *Now, let’s look at how Canton and DAML guarantee that these state transitions are mathematically immutable."*

---

### ⛓️ **SLIDE 4: Canton Ledger & DAML Smart Contracts**
**Speaker**: **Member 4 (Canton & DAML Specialist)**  
**Duration**: 75 Seconds  
**Screen / Action**: Show Canton Chain Explorer & Suspicious Transactions Audit Center

#### 🎙️ Speaker Script:
> *"Thank you! Traditional databases allow rogue admins or DBAs to tamper with transaction records. FraudShield eliminates this risk using **Canton Distributed Ledger** and **DAML Smart Contracts**.*
>
> *In Canton, privacy is sub-ledger projected — Bank A and Bank B only see transactions they are party to, while the Regulator oversees compliance.*
>
> *We deployed four core DAML smart contract templates:
> 1. `ConsentAgreement`: Enforces customer 2FA choice before funds move.
> 2. `HoldRequest`: Locks flagged high-risk payments until compliance officers exercise `GrantMultiSigClearance`.
> 3. `EscrowAgreement`: Holds funds in escrow until `CommitAtomicSettlement` executes.
> 4. `SettlementAuthorization`: Executes atomic, dual-side ledger balance updates.*
>
> *If anyone attempts to alter a transaction directly in the database, our DAML projection updater catches the hash mismatch, flags it as a `TAMPER_ATTEMPT`, and auto-repairs it back to signed DAML state! Now over to our Cryptography lead for our consensus math."*

---

### 📐 **SLIDE 5: Merkle Tree Hashing, 2-of-3 BFT Consensus & Conclusion**
**Speaker**: **Member 5 (Cryptography & BFT Consensus Specialist)**  
**Duration**: 90 Seconds  
**Screen / Action**: Open Canton Chain Explorer Hash Blocks View (`Alpha-Interbank-v1`)

#### 🎙️ Speaker Script:
> *"Thank you! To ensure absolute trust across competing financial institutions, FraudShield implements a **3-Level Merkle Tree Hashing System** with **Byzantine Fault Tolerant (BFT) Quorum Consensus**.*
>
> *Every committed block undergoes 3 levels of cryptographic hashing:
> 1. **Level 1 (Transaction Hash)**: $H_{txn} = \text{SHA256}(from \| to \| amount \| nonce \| timestamp)$
> 2. **Level 2 (Merkle Root Hash)**: Binary Merkle Tree combination of all block transactions.
> 3. **Level 3 (Block Header Hash)**: $H_{block} = \text{SHA256}(BlockID \| MerkleRoot \| PrevBlockHash \| Timestamp)$*
>
> *For multi-bank block commitment, we run a **3-Node Synchronizer Cluster** comprising Node $\alpha$ (Bank A), Node $\beta$ (Bank B), and Node $\gamma$ (Bank C).*
>
> *Our BFT Consensus Quorum follows the $k$-of-$n$ Threshold Formula:*
>
> $$\text{Required Quorum } k = \left\lfloor \frac{2n}{3} \right\rfloor + 1$$
>
> *For $n = 3$ validator nodes:*
>
> $$k = \left\lfloor \frac{2 \times 3}{3} \right\rfloor + 1 = 2 + 1 = 2 \text{ out of } 3 \text{ signatures required}$$
>
> *This guarantees that even if 1 node experiences a network partition, hardware failure, or malicious compromise, the remaining 2 nodes ($\alpha$ and $\beta$) reach valid BFT consensus without halting the interbank settlement network.*
>
> *In summary, FraudShield combines **8D Isolation Forest AI**, **Canton DAML Smart Contracts**, and **2-of-3 BFT Merkle Consensus** to deliver a zero-trust, instant, and tamper-proof interbank payment network. Thank you, and we are ready for your questions!"*

---

## ❓ Anticipated Judges' Questions & Quick Answers

| Likely Judge Question | Recommended Speaker | Quick Technical Answer |
| :--- | :--- | :--- |
| **"How does the ML model prevent false positives?"** | **Member 2 (AI/ML)** | *"We incorporate customer historical spending averages and standard deviation into the 8D vector. Additionally, medium-risk scores trigger 2FA consent rather than blocking the payment."* |
| **"What happens if MongoDB goes down?"** | **Member 3 (Java Backend)** | *"MongoDB acts as a read projection cache. The source of truth resides on the Canton DAML ledger nodes, allowing full state reconstruction upon database recovery."* |
| **"How does Canton protect interbank privacy?"** | **Member 4 (Canton DAML)** | *"Canton uses sub-ledger privacy where transaction contracts are encrypted and projected strictly to the stakeholders (sender bank, receiver bank, regulator)."* |
| **"Why use 2-of-3 BFT instead of standard Raft?"** | **Member 5 (Cryptography)** | *"Raft only handles crash failures. BFT protects against Byzantine (malicious) failures and hash tampering using our $\lfloor 2n/3 \rfloor + 1$ threshold formula."* |
