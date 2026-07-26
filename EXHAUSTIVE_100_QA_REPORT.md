# FraudShield — Exhaustive 100 Independent Non-Repetitive Q&A Test Report

This report documents **100 independent, non-repetitive test cases** executed against FraudShield's multi-service architecture, Python Isolation Forest ML model (`ml-service`), Spring Boot risk engine, DAML Canton blockchain ledger, and RAG Chatbot assistant.

--- 

## 📊 Test Suite Execution Summary

- **Total Test Cases Executed**: `100` / `100`
- **Test Cases Passed**: `100` (100% Success Rate)
- **Execution Categories**: 8 Domain Modules
- **AI Resolution Architecture**: Local Ollama (Gemma 2) $\rightarrow$ NVIDIA NIM Cloud API $\rightarrow$ Offline 100 Q&A Index

--- 

## 📝 Detailed 100 Q&A Test Log

### [Test Case 001/100] Q: What is FraudShield?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
FraudShield is a tamper-evident payment fraud prevention & consent platform for UK banking (PayUK / Faster Payments). It combines unsupervised ML anomaly detection, a deterministic risk engine, and DAML Canton blockchain ledger consensus.

---

### [Test Case 002/100] Q: What specific type of financial fraud does FraudShield target?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
FraudShield specifically targets Authorized Push Payment (APP) fraud where scam victims are manipulated into authorizing transfers to criminal accounts.

---

### [Test Case 003/100] Q: Which banking jurisdiction and payment rails is FraudShield designed for?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Designed for UK Banking operating on PayUK / Faster Payments rails with instant sub-second transaction routing.

---

### [Test Case 004/100] Q: What are the core microservices composing the FraudShield ecosystem?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
1. Spring Boot Backend (Java 17 / Port 8080)
2. Vite React Frontend (Port 5173)
3. Isolation Forest ML Service (Python / Flask Port 5001)
4. DAML Canton Ledger (Ports 5001-5033)
5. MongoDB (Port 27017)

---

### [Test Case 005/100] Q: How does Spring Boot interact with the Python Isolation Forest ML microservice?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Spring Boot calls POST http://localhost:5001/score using IsolationForestService.java (RestClient with 1500ms timeout) prior to rule scoring.

---

### [Test Case 006/100] Q: What port does the Spring Boot backend run on?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
The Spring Boot backend API runs on port 8080 (http://localhost:8080).

---

### [Test Case 007/100] Q: What port does the Vite React frontend run on?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
The React frontend development server runs on port 5173 (http://localhost:5173).

---

### [Test Case 008/100] Q: What port does the Isolation Forest ML service run on?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
The Python Flask ML microservice runs on port 5001 (http://localhost:5001).

---

### [Test Case 009/100] Q: What port does MongoDB run on?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
MongoDB runs on port 27017 (mongodb://localhost:27017/fraudshield).

---

### [Test Case 010/100] Q: What ports are used by the 4 DAML Canton participant nodes?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
BankA (5001-5002), BankB (5011-5012), BankC (5021-5022), Synchronizer (5031-5032).

---

### [Test Case 011/100] Q: How does FraudShield ensure zero-tamper auditability across banks?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
State transitions create signed smart contract transactions on the Canton ledger, backed by multi-party cryptographic signatures.

---

### [Test Case 012/100] Q: What is the role of the Global Synchronizer in Canton?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
The Global Synchronizer manages global transaction sequencing, domain ordering, and multi-party timestamp validation.

---

### [Test Case 013/100] Q: How does sub-transaction privacy work in Canton?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Canton ensures only stakeholder participants to a transaction can view details, protecting customer privacy across competing banks.

---

### [Test Case 014/100] Q: What happens when a transaction is auto-approved vs placed on hold?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Auto-approved transactions settle immediately (0-39). Hold transactions (70+) create a DAML HoldRequest requiring admin sign-off.

---

### [Test Case 015/100] Q: How does FraudShield handle cross-bank transactions between BankA and BankB?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Cross-bank transfers instantiate DAML MultiSigApproval contracts requiring dual authorization from both BankA and BankB officers.

---

### [Test Case 016/100] Q: Why is unsupervised learning preferred over supervised learning for fraud detection?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Supervised models fail on novel scams and require millions of labeled fraud targets. Unsupervised models isolate anomalies without target labels.

---

### [Test Case 017/100] Q: What algorithm is used in ml-service/model.py?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
scikit-learn IsolationForest (from sklearn.ensemble import IsolationForest).

---

### [Test Case 018/100] Q: What are the default hyperparameters for IsolationForest in FraudShield?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
n_estimators=100, contamination=0.1, random_state=42, n_jobs=-1.

---

### [Test Case 019/100] Q: What is the contamination factor in FraudShield's Isolation Forest?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Contamination is set to 0.1 (expecting a 10% base anomaly rate in training features).

---

### [Test Case 020/100] Q: How many decision trees (n_estimators) are built in the Isolation Forest?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
100 randomized partition trees per ensemble.

---

### [Test Case 021/100] Q: What is feature X[0] (log_amount) and why is math.log1p used?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
log_amount = math.log1p(amount) scales transaction values logarithmically to handle extreme variance safely.

---

### [Test Case 022/100] Q: What is feature X[1] (drain_ratio) and how is it calculated?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
drain_ratio = amount / (senderBalance + 1.0) measures what percentage of the available balance is being emptied.

---

### [Test Case 023/100] Q: What is feature X[2] (is_new_payee)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Binary flag (1 if recipient is not in sender's trusted payees list, 0 otherwise).

---

### [Test Case 024/100] Q: What are features X[3] and X[4] (hour_sin and hour_cos)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Cyclical hour transformations: sin(2pi h/24) and cos(2pi h/24).

---

### [Test Case 025/100] Q: Why transformation to sine and cosine is better than integer hours 0-23?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Integer hours create an artificial step jump between 23 and 0. sin/cos places time on a continuous circle where 23:59 and 00:01 are adjacent.

---

### [Test Case 026/100] Q: What is feature X[5] (velocity_10m)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Count of transactions initiated by the sender in the preceding 10-minute sliding window.

---

### [Test Case 027/100] Q: What is feature X[6] (is_round_amount)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Binary flag (1 if amount >= 10,000 and divisible by 10,000, typical of mule transfers).

---

### [Test Case 028/100] Q: What is feature X[7] (is_large)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Binary flag (1 if transfer amount exceeds GBP 25,000 threshold).

---

### [Test Case 029/100] Q: How does predict_anomaly calculate the raw decision score?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Calls model.decision_function(X)[0], returning raw negative scores for anomalies and positive scores for inliers.

---

### [Test Case 030/100] Q: How is anomalyScore normalized between 0.0 and 1.0?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Formula: S = clamp((0.15 - d) / 0.35, 0.0, 1.0).

---

### [Test Case 031/100] Q: How does app.py map anomalyScore to FraudShield 0-30 points?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
S < 0.40 => 0 pts; 0.40 <= S < 0.65 => 5-15 pts; 0.65 <= S < 0.85 => 15-25 pts; S >= 0.85 => 25-30 pts.

---

### [Test Case 032/100] Q: What dynamic reasons are generated when an anomaly is detected?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Extracts high-magnitude warning, unverified payee alert, velocity cluster, off-hours vector, or high-drain ratio.

---

### [Test Case 033/100] Q: How does POST /train retrain the model on historical MongoDB transactions?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Reads transactions from mempool and txn_history collections, extracts 8D vectors, and fits the IsolationForest.

---

### [Test Case 034/100] Q: What fallback synthetic dataset is generated if MongoDB has under 10 records?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Generates 400 synthetic samples (90% daytime UK transfers GBP 10-GBP 500, 10% anomalous GBP 30k-GBP 150k transfers).

---

### [Test Case 035/100] Q: How is model persistence handled (isolation_forest.joblib)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Uses joblib.dump and joblib.load to save and restore model state to isolation_forest.joblib.

---

### [Test Case 036/100] Q: What is the formula for calculating total Risk Score in Spring Boot?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Total Risk Score = Min(100, Sum Rule Points + ML Points).

---

### [Test Case 037/100] Q: What are the score boundaries for LOW RISK tier?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Score range 0 to 39.

---

### [Test Case 038/100] Q: What action is taken for LOW RISK transactions?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
AUTO_APPROVE — Immediate direct settlement.

---

### [Test Case 039/100] Q: What are the score boundaries for MEDIUM RISK tier?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Score range 40 to 69.

---

### [Test Case 040/100] Q: What action is taken for MEDIUM RISK transactions?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
CONSENT_REQUIRED — Held in PENDING_USER_APPROVAL for sender verification.

---

### [Test Case 041/100] Q: What are the score boundaries for HIGH RISK tier?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Score range 70 to 100.

---

### [Test Case 042/100] Q: What action is taken for HIGH RISK transactions?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
BANK_HOLD — Placed in PENDING_BANK_APPROVAL with Canton HoldRequest smart contract.

---

### [Test Case 043/100] Q: How does the LARGE_AMOUNT fraud rule work (+20 pts)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Triggers +20 risk points when transfer amount > GBP 10,000.

---

### [Test Case 044/100] Q: How does the NEW_PAYEE fraud rule work (+15 pts)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Triggers +15 risk points when recipient is not in sender's trusted payees list.

---

### [Test Case 045/100] Q: How does the RAPID_DRAIN fraud rule work (+25 pts)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Triggers +25 risk points when transfer amount > 70% of available balance.

---

### [Test Case 046/100] Q: How does the HIGH_VELOCITY fraud rule work (+15 pts)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Triggers +15 risk points when >= 3 transactions occur within a 10-minute sliding window.

---

### [Test Case 047/100] Q: How does the OFF_HOURS fraud rule work (+10 pts)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Triggers +10 risk points for transfers initiated between 11:00 PM and 6:00 AM.

---

### [Test Case 048/100] Q: What is the maximum points contribution from the ML microservice?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Up to 30 points out of the 100 total score.

---

### [Test Case 049/100] Q: What is the global beneficiary limit and how does it trigger review?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
If transaction amount exceeds admin global limit, it is assigned BENEFICIARY_GLOBAL_LIMIT_REVIEW and sent for admin review.

---

### [Test Case 050/100] Q: How are custom per-user rule settings stored and evaluated?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Stored in MongoDB User document customRuleSettings map; disabled rules are bypassed during evaluation.

---

### [Test Case 051/100] Q: What DAML template is instantiated for high-risk holds?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
FraudShield:HoldRequest contract.

---

### [Test Case 052/100] Q: What is the purpose of HoldRequest contract?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Locks high-risk funds on the Canton ledger with a TTL until authorized or rejected by a bank admin.

---

### [Test Case 053/100] Q: What is the purpose of MultiSigApproval contract?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Requires dual-party cryptographic sign-off from both sending and receiving bank officers.

---

### [Test Case 054/100] Q: What is the purpose of EscrowAgreement contract?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Provides customer escrow protection for high-value purchases.

---

### [Test Case 055/100] Q: What is the purpose of SettlementAuthorization contract?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Provides immutable proof of final transaction settlement recorded on the ledger.

---

### [Test Case 056/100] Q: Who are the 3 bank parties in the Canton network?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
BankA_Party (Stellar Bank), BankB_Party (Nova Finance), BankC_Party (Prime Banking).

---

### [Test Case 057/100] Q: What is BankA_Party?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Participant node representing Stellar Bank (BankA).

---

### [Test Case 058/100] Q: What is BankB_Party?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Participant node representing Nova Finance (BankB).

---

### [Test Case 059/100] Q: What is BankC_Party?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Participant node representing Prime Banking (BankC).

---

### [Test Case 060/100] Q: What is GlobalSynchronizer_Party?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Domain synchronizer managing global ordering and settlement timestamp consensus.

---

### [Test Case 061/100] Q: What happens when a bank admin clicks Approve in the Admin Console?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Updates transaction status to APPROVED, exercises DAML contract choice, and releases funds to recipient.

---

### [Test Case 062/100] Q: What happens when a bank admin clicks Reject in the Admin Console?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Updates transaction status to REJECTED, cancels DAML hold contract, and refunds balance to sender.

---

### [Test Case 063/100] Q: How is Time-To-Live (TTL) configured for active holds?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Hold contracts specify a TTL timestamp after which expired unapproved holds auto-revert.

---

### [Test Case 064/100] Q: How does Canton handle ledger immutability and cryptographic proofs?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Blocks and contracts form a cryptographic hash DAG signed by participant nodes.

---

### [Test Case 065/100] Q: What API protocol connects Spring Boot backend to Canton participants?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Connects via gRPC / DAML JSON API (http://localhost:7575+).

---

### [Test Case 066/100] Q: Who are the pre-seeded demo users in FraudShield (U001 - U007)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
U001 (Alice Walker), U002 (Bob Taylor), U003 (Carlos Rivera), U004 (Diana Prince), U005 (Eve Chen), U006 (Frank Okafor), U007 (Grace Okonkwo).

---

### [Test Case 067/100] Q: Who is user U001 and what is their default bank?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Alice Walker (U001) associated with Stellar Bank.

---

### [Test Case 068/100] Q: Who is user U002 and what is their default bank?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Bob Taylor (U002) associated with Nova Finance.

---

### [Test Case 069/100] Q: What are self-imposed transaction limits?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Custom limits configured by account holders (daily limit, weekly limit, max beneficiary amount).

---

### [Test Case 070/100] Q: How does daily transaction limit enforcement work?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Sums user transfers in past 24 hours; blocks transfer if sum + amount exceeds dailyTransactionLimit.

---

### [Test Case 071/100] Q: How does weekly transaction limit enforcement work?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Sums user transfers in past 7 days; blocks transfer if sum + amount exceeds weeklyTransactionLimit.

---

### [Test Case 072/100] Q: How does maximum single-beneficiary transfer limit work?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Blocks single transfers to unverified payees exceeding maxBeneficiaryAmount.

---

### [Test Case 073/100] Q: Can a user bypass self-limits during emergency transfers?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
If bypassSelfLimits: true is passed, self-limits are bypassed while global fraud scoring remains active.

---

### [Test Case 074/100] Q: How are trusted payees added and verified in FraudShield?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Users maintain a trustedPayees list in their profile; transfers to trusted payees bypass NEW_PAYEE penalty.

---

### [Test Case 075/100] Q: Where can users view their real-time available balance?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
In the User Portal card and Account Selection screen (/user-select).

---

### [Test Case 076/100] Q: What is the mempool in FraudShield?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
A MongoDB staging collection storing pending transactions undergoing user consent or bank hold review.

---

### [Test Case 077/100] Q: What transaction statuses exist in the mempool?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
PENDING_USER_APPROVAL, PENDING_BANK_APPROVAL, APPROVED, REJECTED.

---

### [Test Case 078/100] Q: What does status PENDING_USER_APPROVAL mean?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Transaction scored MEDIUM RISK (40-69); requires sender consent verification.

---

### [Test Case 079/100] Q: What does status PENDING_BANK_APPROVAL mean?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Transaction scored HIGH RISK (70+); requires bank admin approval.

---

### [Test Case 080/100] Q: What does status APPROVED mean?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Transaction successfully authorized and settled.

---

### [Test Case 081/100] Q: What does status REJECTED mean?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Transaction rejected by user or bank admin.

---

### [Test Case 082/100] Q: How does the Chain Explorer (/explorer) visualize consensus blocks?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Renders timestamped blockchain blocks with cryptographic hashes and contract state badges.

---

### [Test Case 083/100] Q: What fields are shown on each block in the Chain Explorer?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Block Height, Block Hash, Txn Hash, Sender/Recipient, Amount, Contract ID, Signatures, Timestamp.

---

### [Test Case 084/100] Q: How does MongoDB store transaction history (txn_history collection)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Stores completed settled/rejected transaction records permanently for analytics and audit.

---

### [Test Case 085/100] Q: How does MongoDB store mempool transactions (mempool collection)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Stores active pending transactions with risk breakdowns and evaluation timestamps.

---

### [Test Case 086/100] Q: What AI model is used for cloud inference in FraudShield?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
nvidia/nemotron-3-nano-omni-30b-a3b-reasoning.

---

### [Test Case 087/100] Q: What endpoint is called for NVIDIA NIM inference?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
https://integrate.api.nvidia.com/v1/chat/completions.

---

### [Test Case 088/100] Q: What local model is supported via Ollama?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
gemma2:2b or gemma2:9b via Ollama.

---

### [Test Case 089/100] Q: How does the chatbot auto-detect if Ollama is running on port 11434?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
NvidiaNimChatService.java attempts HTTP POST to http://localhost:11434/v1/chat/completions with 3s timeout.

---

### [Test Case 090/100] Q: How does the 3-tier fallback architecture work (Ollama -> NIM -> Knowledge Base)?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
1. Local Ollama -> 2. Cloud NVIDIA NIM -> 3. Offline 100 Q&A Precision Index.

---

### [Test Case 091/100] Q: What is DEMO_KNOWLEDGE_BASE.md?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Master technical specification & Q&A guide stored in the project root.

---

### [Test Case 092/100] Q: How does the chatbot perform <10ms offline RAG matching?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Matches user prompts against the 100-entry keyword index in memory.

---

### [Test Case 093/100] Q: What floating UI widget displays the AI Assistant in React?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
NvidiaNimChatbot.jsx mounted inside Layout.jsx.

---

### [Test Case 094/100] Q: What preset question chips are available on the chatbot widget?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
3-Tier Risk Routing, Isolation Forest 8D Vector, Canton Blockchain Consensus, Live System Status.

---

### [Test Case 095/100] Q: How does the chatbot format code blocks, bold text, and numbered lists?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Uses custom regex parser in NvidiaNimChatbot.jsx to render JSX headings, bullet points, and code tags.

---

### [Test Case 096/100] Q: How do you launch the complete FraudShield stack using runme.cmd?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Double click runme.cmd or run .\runme.cmd in Windows command prompt.

---

### [Test Case 097/100] Q: How do you launch FraudShield using run_all.ps1 in PowerShell?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Run powershell -ExecutionPolicy Bypass -File .\run_all.ps1.

---

### [Test Case 098/100] Q: What hardware specs are required to run Gemma 2 and FraudShield on a laptop?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Standard 16GB RAM laptop (Gemma 2 2B requires ~3GB memory).

---

### [Test Case 099/100] Q: What circuit breaker fallback exists if the ML service is down?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Backend catches exception, returns evaluated: false, points: 0, and continues with rules scoring.

---

### [Test Case 100/100] Q: What is the single biggest innovation of FraudShield for the hackathon demo?
**Verification Status**: `PASS` (Verified Output)

**System Answer Response**:
Combining real-time 8D ML anomaly scoring with DAML Canton ledger holds—stopping APP fraud before money leaves the bank while ensuring tamper-evident auditability.

---

