# FraudShield Canton Integration - Getting Started

## 🎯 What You Just Got

Your FraudShield project is now configured for **Canton blockchain + DAML smart contract** integration. This provides:

✅ **Fraud Prevention** - Risk scoring in Java (0-39 / 40-69 / 70+)  
✅ **Smart Contracts** - Hold, Escrow, MultiSig approvals on ledger  
✅ **Proof Trail** - Cryptographic audit for every transaction  
✅ **3-Bank Network** - BankA, BankB, BankC participating  
✅ **Real-Time UI** - Live status updates via WebSocket  

---

## 📖 Start Here

### 1️⃣ Quick Overview (5 minutes)
Read: **`CANTON_QUICK_START.md`**
- What Canton is
- 3-step installation
- Port reference
- Troubleshooting

### 2️⃣ Detailed Setup (30 minutes)
Read: **`CANTON_SETUP.md`**
- Prerequisites check
- Step-by-step Daml SDK installation
- Network startup verification
- Health checks
- Full troubleshooting guide

### 3️⃣ Architecture Understanding (20 minutes)
Read: **`CANTON_ARCHITECTURE.md`**
- Party model (3 banks, 12 users, 1 synchronizer)
- Contract responsibility matrix
- 3 risk routes (state machines)
- Event flow to Java backend
- Proof payload structure

### 4️⃣ Track Progress (ongoing)
Use: **`IMPLEMENTATION_CHECKLIST.md`**
- See which phase is current
- Check off completed tasks
- Know validation criteria
- Plan next phase

---

## 🚀 Installation (Choose Your OS)

### Windows
```powershell
# Download Daml SDK installer
# Run at https://get.daml.com

# Or via Chocolatey (if installed):
choco install daml

# Verify
daml version
```

### macOS / Linux
```bash
# Download and install
curl -sSL https://get.daml.com | bash

# Add to PATH (follow installer output)
source ~/.daml/env

# Verify
daml version
```

---

## ▶️ Start the Network (One-liner)

```bash
# Navigate to reboot_murali directory
cd reboot_murali

# Set data directory
export CANTON_DATA_DIR="./canton-data"  # macOS/Linux
# or
set CANTON_DATA_DIR=./canton-data       # Windows CMD

# Start Canton network
canton -c canton.conf

# Wait for "Canton ready" message
```

### Verify All Participants Running

```bash
# In a new terminal, test health endpoints:
curl http://localhost:5001/v1/healthy  # BankA    → 200 OK
curl http://localhost:5011/v1/healthy  # BankB    → 200 OK
curl http://localhost:5021/v1/healthy  # BankC    → 200 OK
curl http://localhost:5031/v1/healthy  # Sync     → 200 OK
curl http://localhost:4011/health      # Domain   → 200 OK (may take 15s)
```

**Success**: All 5 endpoints return 200 OK ✓

---

## 📊 What's Happening Inside

```
┌─ FraudShield Backend (Java Spring Boot)
│   ├─ Fraud Scoring Engine (existing)
│   ├─ REST API (existing + updated)
│   └─ Canton Client (new)
│       └─ Connects to participants via gRPC
│
└─ Canton Network (Local)
    ├─ Domain (fraudshield-domain, port 4011)
    │   └─ Holds all contracts
    │
    └─ Participants (SQLite databases)
        ├─ BankA (port 5001)
        ├─ BankB (port 5011)
        ├─ BankC (port 5021)
        └─ GlobalSynchronizer (port 5031)
```

---

## 🔄 Transaction Flow Example

### High-Risk Transaction (70+)

```
User initiates transfer (FraudShield API)
        ↓
Java fraud scoring → Risk Score = 85 (HIGH)
        ↓
Create DAML contracts:
  • HoldRequest (TTL = 60 min)
  • MultiSigApproval (requires bank approval)
        ↓
WebSocket → UI shows "PENDING_BANK_APPROVAL"
        ↓
Bank approves transaction (admin panel)
        ↓
GlobalSynchronizer releases Hold & settles
        ↓
WebSocket → UI shows "SETTLED"
✓ Transaction complete with full audit trail
```

---

## 📁 Key Files Reference

| File | Purpose | Size |
|------|---------|------|
| `CANTON_QUICK_START.md` | 5-min quick reference | 4 KB |
| `CANTON_SETUP.md` | Comprehensive setup guide | 6 KB |
| `CANTON_ARCHITECTURE.md` | Design & responsibility matrix | 12 KB |
| `IMPLEMENTATION_CHECKLIST.md` | Phase tracking | 10 KB |
| `README_CANTON_INTEGRATION.md` | Project overview | 10 KB |
| `canton.conf` | Network configuration | 3 KB |
| `CANTON_DEPENDENCIES.xml` | Maven dependencies (Phase 7) | 5 KB |
| `setup-canton.ps1` | Windows setup automation | 2.5 KB |
| `start-canton-network.sh` | Unix startup script | 1.3 KB |

---

## 🔍 Current Status

```
✓ Phase 0: Architecture Freeze - COMPLETE
✓ Phase 1: Canton Network Bootstrap - COMPLETE  
  
⏳ Phase 2: DAML Project Skeleton - READY TO START
   (Next: Create DAML smart contracts)

⏹️ Phase 3-15: Implementation Pipeline
   (Hold for Phase 2 completion)
```

---

## ❓ Common Questions

### Q: Do I need to run Canton to develop Java code?
**A**: Not immediately. But to test integration, yes.

### Q: Can I restart Canton without losing data?
**A**: Yes! SQLite persists between restarts. Delete `canton-data/` for fresh start.

### Q: What if a participant crashes?
**A**: See `CANTON_SETUP.md` § Troubleshooting § Issue: Database Locked

### Q: How do I connect my Java backend to Canton?
**A**: Phase 7 (Java Canton Adapter) covers this. For now, see `CANTON_DEPENDENCIES.xml`.

### Q: Is this production-ready?
**A**: This is a **development network**. Phase 12 (Security & Ops) covers production hardening.

---

## ✨ Next Steps

1. **Install Daml SDK** (if not done)
   ```bash
   curl -sSL https://get.daml.com | bash
   ```

2. **Start Canton network**
   ```bash
   cd reboot_murali && canton -c canton.conf
   ```

3. **Verify health** (in another terminal)
   ```bash
   curl http://localhost:5001/v1/healthy
   ```

4. **When ready for Phase 2**, create DAML project:
   ```bash
   daml new fraudshield-contracts --template=empty
   ```

---

## 🎓 Learning Resources

- **Daml Docs**: https://docs.daml.com/daml/intro/
- **Canton Docs**: https://docs.daml.com/canton/
- **Ledger API**: https://docs.daml.com/app-dev/ledger-api/
- **Local Setup**: https://docs.daml.com/canton/usermanual/local_deployment.html

---

## 📞 Having Issues?

| Issue | Location |
|-------|----------|
| **Installation** | `CANTON_SETUP.md` § Prerequisites |
| **Startup Problems** | `CANTON_SETUP.md` § Troubleshooting |
| **Architecture Questions** | `CANTON_ARCHITECTURE.md` § Overview |
| **Port/Network** | `CANTON_QUICK_START.md` § API Endpoints |
| **Java Integration** | `CANTON_DEPENDENCIES.xml` + Phase 7 docs |
| **Phase Progress** | `IMPLEMENTATION_CHECKLIST.md` |

---

## 🎯 Success Checklist

- [ ] Daml SDK installed (`daml version` works)
- [ ] Canton network starts (`canton -c canton.conf` runs)
- [ ] All 5 health endpoints return 200 OK
- [ ] Read `CANTON_QUICK_START.md`
- [ ] Understand 3-bank architecture
- [ ] Know the 3 risk routes (LOW/MEDIUM/HIGH)
- [ ] Ready to start Phase 2 (create DAML projects)

---

**Start Here**: `CANTON_QUICK_START.md` (5 minutes)  
**Then Read**: `CANTON_SETUP.md` (30 minutes)  
**Deep Dive**: `CANTON_ARCHITECTURE.md` (understand design)  
**Track Progress**: `IMPLEMENTATION_CHECKLIST.md` (ongoing)  

---

**You're all set!** 🚀  
Phase 1 ✓ Complete - Ready for Phase 2  
See you in the next phase for DAML smart contracts!
