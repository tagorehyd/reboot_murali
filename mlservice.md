# FraudShield ML Service — Machine Learning Anomaly Detection Microservice

The **FraudShield ML Service** is a dedicated Python microservice for real-time transaction anomaly detection built with **scikit-learn Isolation Forest**, **Flask**, and **MongoDB**. It serves as an intelligent Machine Learning scoring engine integrated into the FraudShield hybrid risk evaluation pipeline.

---

## 🎯 Overview & Architecture

FraudShield combines deterministic rules (velocity, payee verification, amount thresholds) with an **unsupervised Machine Learning model** to detect complex, multi-dimensional fraud patterns that traditional rules might miss.

```
                  ┌──────────────────────────────────────────────┐
                  │          Spring Boot Backend                 │
                  │       (Fraud Evaluation Engine)              │
                  └──────────────────────┬───────────────────────┘
                                         │ HTTP REST (JSON)
                                         │ POST /score
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │          FraudShield ML Service              │
                  │             (Python / Flask)                 │
                  ├──────────────────────────────────────────────┤
                  │  • Feature Extractor (8D Transformed Vector) │
                  │  • scikit-learn IsolationForest Model        │
                  │  • Model Storage (isolation_forest.joblib)   │
                  └──────────────────────┬───────────────────────┘
                                         │ Read Historical Txns
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │                 MongoDB                      │
                  │    (mempool & txn_history Collections)       │
                  └──────────────────────────────────────────────┘
```

- **Service Location:** `ml-service/`
- **Default Port:** `5001`
- **Base Endpoint:** `http://localhost:5001` (or `http://ml-service:5001` in Docker/Kubernetes)
- **Model Storage:** `isolation_forest.joblib`

---

## 🧠 Why Isolation Forest?

Isolation Forest is an unsupervised machine learning algorithm specifically engineered for anomaly detection:

1. **No Labelled Fraud Data Required:** Real-world financial systems often lack labeled fraud samples. Isolation Forest builds trees without requiring target labels.
2. **Exploits Anomaly Characteristics:** Anomalies are "few and different". In an Isolation Forest, anomalous vectors are isolated much closer to the root of decision trees (requiring fewer random partition splits).
3. **Linear Time Complexity:** Efficient $O(n)$ inference time makes it suitable for real-time transaction scoring.

### Model Hyperparameters
- `n_estimators`: `100` decision trees
- `contamination`: `0.1` (expected 10% base anomaly contamination rate)
- `random_state`: `42` for reproducible results
- `n_jobs`: `-1` (parallelized multi-core execution)

---

## 📐 Feature Engineering (8-Dimensional Feature Vector)

Raw transaction payloads are transformed into a normalized **8-dimensional feature vector** (`X`) prior to model scoring:

| Feature Name | Type | Description & Mathematical Transformation |
| :--- | :--- | :--- |
| `log_amount` | `float` | Logarithmically scaled transaction amount: $\ln(1 + \text{amount})$. Dampens large outlier variance. |
| `drain_ratio` | `float` | Sender account drain ratio: $\frac{\text{amount}}{\text{senderBalance} + 1.0}$. Measures relative depletion of balance. |
| `is_new_payee` | `int (0/1)` | `1` if recipient is not in sender's verified payees list, `0` otherwise. |
| `hour_sin` | `float` | Cyclical time component: $\sin\left(\frac{2\pi \cdot \text{hour}}{24}\right)$. Encodes 24-hour daily cycle smoothly. |
| `hour_cos` | `float` | Cyclical time component: $\cos\left(\frac{2\pi \cdot \text{hour}}{24}\right)$. Handles midnight wrap-around cleanly. |
| `velocity_10m` | `int` | Count of transactions initiated by the sender in the preceding 10-minute window. |
| `is_round_amount` | `int (0/1)` | `1` for large round currency amounts ($\ge 10,000$ and divisible by $10,000$), common in mule transfers. |
| `is_large` | `int (0/1)` | `1` if transfer amount exceeds £25,000 high-risk threshold. |

---

## 📊 Anomaly Scoring & FraudShield Point Mapping

### 1. Decision Score & Anomaly Normalization
The scikit-learn `decision_function(X)` returns raw scores where positive values represent normal data points and negative values represent anomalies.

The ML service normalizes this raw score into an **Anomaly Score** $S \in [0.0, 1.0]$:
$$\text{anomalyScore} = \min\left(1.0, \max\left(0.0, \frac{0.15 - \text{decisionScore}}{0.35}\right)\right)$$

### 2. FraudShield Points Mapping (0 – 30 Scale)
FraudShield allocates up to **30 points** from the ML service toward its total 100-point risk evaluation:

$$\text{Points} = \begin{cases} 
0 & \text{if } \text{anomalyScore} < 0.40 \\
5 + \lfloor (\text{anomalyScore} - 0.40) \times 40 \rfloor & \text{if } 0.40 \le \text{anomalyScore} < 0.65 \text{ (5 to 15 pts)} \\
15 + \lfloor (\text{anomalyScore} - 0.65) \times 50 \rfloor & \text{if } 0.65 \le \text{anomalyScore} < 0.85 \text{ (15 to 25 pts)} \\
25 + \lfloor (\text{anomalyScore} - 0.85) \times 33 \rfloor & \text{if } \text{anomalyScore} \ge 0.85 \text{ (25 to 30 pts)}
\end{cases}$$

### 3. Dynamic Human-Readable Reason Generation
When a transaction is classified as an anomaly (`isAnomaly: true`), the service extracts human-readable explanations based on feature weights:
- *“Isolation Forest flagged unusual transaction magnitude (£50,000.00)”*
- *“High velocity cluster (5 txns in 10m window) detected by ML”*
- *“Off-hours activity (02:00) coupled with anomalous transaction vector”*
- *“High-drain transaction ratio (85% of balance)”*
- *“Multi-dimensional feature vector isolated far from normal historical cluster”*

---

## 🔌 API Endpoints

### 1. Score Transaction
* **Endpoint:** `POST /score`
* **Content-Type:** `application/json`

**Request Payload:**
```json
{
  "fromUserId": "user_alice",
  "toUserId": "user_unknown_payee",
  "amount": 35000.00,
  "senderBalance": 40000.00,
  "isNewPayee": true,
  "hourOfDay": 2,
  "velocity10m": 4
}
```

**Response Payload (`200 OK`):**
```json
{
  "evaluated": true,
  "anomalyScore": 0.82,
  "decisionScore": -0.137,
  "isAnomaly": true,
  "points": 23,
  "reasons": [
    "Isolation Forest flagged unusual transaction magnitude (£35,000.00)",
    "Unusual multi-dimensional pattern with unverified payee",
    "High velocity cluster (4 txns in 10m window) detected by ML",
    "Off-hours activity (2:00) coupled with anomalous transaction vector",
    "High-drain transaction ratio (88% of balance)"
  ],
  "modelVersion": "v1.0.0-isolation-forest"
}
```

---

### 2. Retrain Model
* **Endpoint:** `POST /train`
* **Content-Type:** `application/json`

Retrains the Isolation Forest model using MongoDB historical transaction data (`mempool` + `txn_history`) or custom supplied samples. Fallback synthetic baseline generation (400 samples simulating UK banking transfers) is triggered if historical data is insufficient.

**Response Payload (`200 OK`):**
```json
{
  "message": "Successfully retrained Isolation Forest model on 400 samples",
  "samplesCount": 400,
  "status": "SUCCESS",
  "trainedAt": "2026-07-26T12:00:00Z"
}
```

---

### 3. Service Health Check
* **Endpoint:** `GET /health`

**Response Payload (`200 OK`):**
```json
{
  "status": "UP",
  "service": "FraudShield Isolation Forest ML Microservice",
  "isTrained": true,
  "lastTrainedAt": "2026-07-26T12:00:00Z",
  "modelType": "scikit-learn IsolationForest",
  "nEstimators": 100,
  "contamination": 0.1
}
```

---

## 🛡️ Spring Boot Backend Integration & Resilience

The Spring Boot backend interacts with the ML Service via [`IsolationForestService.java`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/Backend/src/main/java/com/fraudshield/service/IsolationForestService.java):

```properties
# Backend application.properties configuration
fraudshield.ml.isolation-forest.enabled=true
fraudshield.ml.isolation-forest.base-url=http://localhost:5001
fraudshield.ml.isolation-forest.timeout-ms=1500
```

### Circuit Break / Fallback Pattern
To guarantee **zero downtime** and low latency for transaction processing:
1. HTTP requests to `/score` have a **1500ms strict timeout**.
2. If the ML service is unreachable, offline, or times out, Spring Boot catches the exception gracefully.
3. The transaction evaluation proceeds using deterministic rules (`evaluated: false`, `points: 0`), logging a warning:
   `[IsolationForest] Call failed, continuing with rules-only: Connection refused`

---

## 🚀 How to Run & Test

### Option A: Local Python Environment
```bash
cd ml-service
pip install -r requirements.txt
python app.py
```

### Option B: Docker Container
```bash
docker build -t fraudshield-ml-service ./ml-service
docker run -d -p 5001:5001 --name fraudshield-ml fraudshield-ml-service
```

### Option C: Complete Stack Startup
Run using the main PowerShell startup script:
```powershell
.\run_all.ps1
```

### Testing with cURL
```bash
# Health Check
curl http://localhost:5001/health

# Test Scoring
curl -X POST http://localhost:5001/score \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "senderBalance": 52000, "isNewPayee": true, "hourOfDay": 3, "velocity10m": 5}'

# Retrain Model
curl -X POST http://localhost:5001/train
```

---

## 📁 Source File Reference
- **Flask App & Routes:** [`ml-service/app.py`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/ml-service/app.py)
- **Isolation Forest Model & Feature Engineering:** [`ml-service/model.py`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/ml-service/model.py)
- **Java Integration Service:** [`Backend/src/main/java/com/fraudshield/service/IsolationForestService.java`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/Backend/src/main/java/com/fraudshield/service/IsolationForestService.java)
- **Dependencies:** [`ml-service/requirements.txt`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/ml-service/requirements.txt)
