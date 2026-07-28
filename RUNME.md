# FraudShield — Complete Execution & Operating Guide

> **Tamper-Evident Fraud Prevention Platform for UK Banking Payment Flows**

---

## ⚡ Quick Start (One-Click Launch Command)

To boot up the **entire FraudShield platform** (MongoDB, Isolation Forest ML Service, Spring Boot Backend, and Vite Frontend) in a single command, open a terminal in the root directory and run:

```cmd
.\runme.cmd
```

*Or via PowerShell:*

```powershell
powershell -ExecutionPolicy Bypass -File .\run_all.ps1
```

---

## 🌐 Active Services & Access URLs

Once launched, all microservices and interfaces are accessible at:

| Component | Port | Base URL | Health Check URL |
|-----------|------|----------|------------------|
| **Frontend UI (Vite + React)** | `5173` | [http://localhost:5173](http://localhost:5173) | [http://localhost:5173](http://localhost:5173) |
| **Backend API (Spring Boot Java 17)** | `8080` | [http://localhost:8080](http://localhost:8080) | [http://localhost:8080/health](http://localhost:8080/health) |
| **ML Microservice (Isolation Forest)** | `5001` | [http://localhost:5001](http://localhost:5001) | [http://localhost:5001/health](http://localhost:5001/health) |
| **Database (MongoDB 8.3)** | `27017` | `mongodb://localhost:27017` | `netstart MongoDB` |

---

## 🧪 Retested Scenarios & Test Suite

All critical system scenarios have been retested and verified end-to-end:

### Scenario 1: ML Microservice Anomaly Scoring
- **Endpoint:** `POST http://localhost:5001/score`
- **Low Risk Test:** £120.00 daytime transfer to known payee.
  - Result: `isAnomaly: false`, `points: 0`, `anomalyScore: 0.0`
- **High Risk Fraud Test:** £85,000.00 3 AM transfer with high velocity (8 txns/10m) to unverified payee.
  - Result: `isAnomaly: true`, `points: 8-12`, multi-dimensional feature vector breakdown returned.
- **Model Retrain Test:** `POST http://localhost:5001/train` -> Retrained on 400 baseline transactions.

### Scenario 2: End-to-End Transaction Routing & Fraud Prevention Engine
- **Endpoint:** `POST http://localhost:8080/api/txn/initiate`
- **Auto-Approve Test (`U001` Alice -> `U002` Bob, £250.00):**
  - Result: `status: "APPROVED"`, `routingDecision: "AUTO_APPROVE"`, `riskScore: 0`.
- **Fraud Escalation Test (`U001` Alice -> `U006` Frank, £35,000.00):**
  - Result: `status: "PENDING_BANK_APPROVAL"`, `routingDecision: "CONSENT_REQUIRED"`, `riskScore: 72`.
  - Triggered rules: `LARGE_AMOUNT` (+20 pts), `NEW_PAYEE` (+15 pts), `RAPID_DRAIN` (+25 pts), `ISOLATION_FOREST` (+12 pts).

### Scenario 3: User Accounts & Mempool Status
- **Get All Users:** `GET http://localhost:8080/api/users/all` (Returns seeded accounts `U001` - `U007` & `ADMIN`).
- **Mempool Status:** `GET http://localhost:8080/api/mempool/status`.

---

## 🛠️ Manual Step-by-Step Launch Instructions

If you prefer to start each service individually in separate terminals:

### Terminal 1: Start MongoDB
```powershell
net start MongoDB
```

### Terminal 2: Start Isolation Forest ML Service
```powershell
cd ml-service
python app.py
```

### Terminal 3: Build & Start Spring Boot Backend
```powershell
# Environment variables setup (if needed)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:PATH = "C:\tools\apache-maven-3.9.16\bin;$env:JAVA_HOME\bin;$env:PATH"

# Build JAR
mvn clean package -DskipTests -f Backend/pom.xml

# Run Backend
java -jar Backend/target/fraudshield-backend-1.0.0.jar
```

### Terminal 4: Start Frontend UI
```powershell
cd FrontEnd
npm run dev
```

---

## 📋 Docker Compose Option

If Docker Desktop is available on your machine, you can alternative launch all containers using:

```bash
docker-compose up --build
```
*(Port mapping fixed in `docker-compose.yml`: Frontend maps `5173:80`).*

---

## 📚 Documentation & Deep Dives

- **Exhaustive 500 Q&A Test Suite Report:** [`EXHAUSTIVE_500_QA_REPORT.md`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/EXHAUSTIVE_500_QA_REPORT.md)
- **Exhaustive 100 Q&A Test Suite Report:** [`EXHAUSTIVE_100_QA_REPORT.md`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/EXHAUSTIVE_100_QA_REPORT.md)
- **Master Demo Knowledge Base & Top 25 Q&As:** [`DEMO_KNOWLEDGE_BASE.md`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/DEMO_KNOWLEDGE_BASE.md)
- **ML Service Technical Deep Dive:** [`mlservice.md`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/mlservice.md)
- **Canton Ledger Architecture:** [`CANTON_ARCHITECTURE.md`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/CANTON_ARCHITECTURE.md)
- **Canton Commands & Setup:** [`CANTON_COMMANDS.md`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/CANTON_COMMANDS.md)
- **Master Index & Overview:** [`README.md`](file:///c:/Users/newab/OneDrive/Desktop/antigravityhackathon/reboot_murali/README.md)




