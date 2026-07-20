# Canton Quick Start for FraudShield

## 5-Minute Setup

### 1. Install Daml SDK (if not installed)
```bash
# Windows (PowerShell Admin)
Invoke-WebRequest -Uri https://get.daml.com -OutFile DamlInstaller.exe
.\DamlInstaller.exe

# macOS/Linux
curl -sSL https://get.daml.com | bash
```

### 2. Verify Installation
```bash
daml version
# Should show version 3.0+
```

### 3. Start Canton Network
```bash
cd reboot_murali

# Set environment variable
export CANTON_DATA_DIR="./canton-data"  # Linux/macOS
set CANTON_DATA_DIR=./canton-data       # Windows CMD

# Start network
canton -c canton.conf
```

### 4. Verify All Participants Running
```bash
# In another terminal, test health endpoints
curl http://localhost:5001/v1/healthy  # BankA
curl http://localhost:5011/v1/healthy  # BankB
curl http://localhost:5021/v1/healthy  # BankC
curl http://localhost:5031/v1/healthy  # Synchronizer

# All should return 200 OK
```

---

## Next: Create DAML Project (Phase 2)

```bash
# Create DAML project for smart contracts
daml new fraudshield-contracts --template=empty

cd fraudshield-contracts

# Add DAML modules:
# - Common.daml (shared types)
# - HoldRequest.daml (hold contracts)
# - EscrowAgreement.daml (escrow contracts)
# - MultiSigApproval.daml (approval contracts)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | Change ports in `canton.conf`, or kill existing process |
| Java not found | Install Java 17+: `java -version` |
| Canton command not found | Run `daml install`, then add to PATH |
| Participants not connecting | Check config file, wait 10-15 seconds for startup |

---

## Architecture Recap

```
┌─────────────────────────────────────────────────┐
│         FraudShield Canton Network              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │  fraudshield-domain (4011)             │   │
│  │  - Synchronizer                        │   │
│  └────────────────────────────────────────┘   │
│                     ↑                           │
│     ┌───────────────┼───────────────┬────────┐ │
│     ↓               ↓               ↓        ↓ │
│  BankA          BankB           BankC    Sync │
│  (5001)         (5011)          (5021)   (5031)│
│                                                 │
│  3 Bank Participants + 1 Synchronizer         │
└─────────────────────────────────────────────────┘
```

---

## API Endpoints

### BankA Ledger API
- **Host**: localhost:5001
- **Admin**: localhost:5002
- **Metrics**: localhost:5003

### BankB Ledger API
- **Host**: localhost:5011
- **Admin**: localhost:5012
- **Metrics**: localhost:5013

### BankC Ledger API
- **Host**: localhost:5021
- **Admin**: localhost:5022
- **Metrics**: localhost:5023

### Synchronizer Ledger API
- **Host**: localhost:5031
- **Admin**: localhost:5032
- **Metrics**: localhost:5033

---

## Files Created

```
reboot_murali/
├── canton.conf                    # Network configuration
├── CANTON_ARCHITECTURE.md         # Detailed architecture
├── CANTON_SETUP.md                # Full setup guide
├── CANTON_DEPENDENCIES.xml        # Maven dependencies
├── CANTON_QUICK_START.md          # This file
├── setup-canton.ps1               # Windows setup script
└── start-canton-network.sh        # Unix startup script
```

---

## Status: Phase 1 ✓ Complete

- [x] Architecture frozen (Phase 0)
- [x] Canton network configuration ready
- [x] Setup guides created
- [x] Maven dependencies documented

### Next: Phase 2 - DAML Project Skeleton
- Create DAML project structure
- Define shared types (Party, Status, IDs)
- Deploy to network

---

**Documentation**: See `CANTON_SETUP.md` for detailed instructions
**Architecture**: See `CANTON_ARCHITECTURE.md` for design details
