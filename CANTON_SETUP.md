# Canton Installation & Setup Guide for FraudShield

## Overview
This guide sets up a local Canton network for the FraudShield fraud-prevention platform with DAML smart contracts.

**Target Architecture**:
- 3 Bank Participants: BankA, BankB, BankC
- 1 Global Synchronizer Participant
- 1 Domain (ledger/blockchain)
- SQLite storage (development)

---

## Prerequisites

### System Requirements
- **OS**: Windows, macOS, or Linux
- **Java**: Version 17+ (your project requirement)
- **Disk Space**: ~2GB
- **RAM**: 4GB minimum (8GB recommended)
- **Network Ports**: 4011-4013 (domain), 5001-5033 (participants)

### Check Java Installation
```bash
java -version
# Should show Java 17 or later
```

---

## Installation Steps

### Step 1: Install Daml SDK
The Daml SDK includes Canton, DAML compiler, and tools.

#### Windows (PowerShell as Admin)
```powershell
# Using get.daml.com (recommended)
Invoke-WebRequest -Uri https://get.daml.com -OutFile DamlInstaller.exe
.\DamlInstaller.exe

# Or install Chocolatey first, then:
choco install daml
```

#### macOS / Linux
```bash
curl -sSL https://get.daml.com | bash
source ~/.daml/env
```

### Step 2: Verify Installation
```bash
daml version
canton --version
```

### Step 3: Set Up FraudShield Canton Network

```bash
cd path/to/reboot_murali

# Run setup script
# On Windows (PowerShell):
.\setup-canton.ps1

# On macOS/Linux:
bash setup-canton.ps1
```

This creates:
```
~/canton-fraudshield/
├── bin/              # Canton binaries (after download)
├── config/           # Network configuration files
├── scripts/          # Startup and management scripts
└── data/             # Ledger storage (SQLite databases)
```

---

## Configuration Files

### Main Configuration: `canton.conf`
Defines:
- **Domain**: `fraudshield-domain` (4011-4013)
- **Participants**:
  - `banka` (5001-5003)
  - `bankb` (5011-5013)
  - `bankc` (5021-5023)
  - `synchronizer` (5031-5033)

All participants connect to the single domain.

---

## Starting the Network

### Option A: Automatic Start (macOS/Linux)
```bash
./start-canton-network.sh
```

### Option B: Manual Start
```bash
# Set data directory
export CANTON_DATA_DIR="./canton-data"

# Start Canton with config
canton -c canton.conf
```

### Option C: Interactive Console
```bash
canton -c canton.conf
# Wait for "Canton ready" message
# Type 'help' for commands
# Type 'exit' to stop
```

---

## Verifying Network Health

### Check Participant Connectivity (in Canton Console)
```canton
// List all participants
participants.list()

// Initialize domain connection for each participant
val domain = "fraudshield-domain"

// BankA
participants.banka.domains.connect(domain, "http://localhost:4011")
// BankB
participants.bankb.domains.connect(domain, "http://localhost:4011")
// BankC
participants.bankc.domains.connect(domain, "http://localhost:4011")
// Synchronizer
participants.synchronizer.domains.connect(domain, "http://localhost:4011")

// Verify all connected
participants.banka.domains.list_connected()
```

### Test Ledger API Connection
```bash
# From Java backend, test connectivity to each participant

# BankA
curl http://localhost:5001/v1/healthy

# BankB
curl http://localhost:5011/v1/healthy

# BankC
curl http://localhost:5021/v1/healthy

# Synchronizer
curl http://localhost:5031/v1/healthy

# Expected response: 200 OK
```

---

## Port Mapping Reference

### Domain (fraudshield-domain)
| Port | Service |
|------|---------|
| 4011 | Public API (participants connect here) |
| 4012 | Admin API |
| 4013 | Metrics (Prometheus) |

### BankA Participant
| Port | Service |
|------|---------|
| 5001 | Ledger API (Java client connects) |
| 5002 | Admin API |
| 5003 | Metrics |

### BankB Participant
| Port | Service |
|------|---------|
| 5011 | Ledger API |
| 5012 | Admin API |
| 5013 | Metrics |

### BankC Participant
| Port | Service |
|------|---------|
| 5021 | Ledger API |
| 5022 | Admin API |
| 5023 | Metrics |

### Synchronizer Participant
| Port | Service |
|------|---------|
| 5031 | Ledger API |
| 5032 | Admin API |
| 5033 | Metrics |

---

## Stopping the Network

### In Canton Console
```canton
exit
```

### Via PowerShell (Windows)
```powershell
Stop-Process -Name "java" -Force
```

### Via Command Line (macOS/Linux)
```bash
pkill -f "canton"
```

---

## Troubleshooting

### Issue: Port Already in Use
```
Error: Address already in use
```
**Solution**: 
- Check what's using the port: `lsof -i :5001` (macOS/Linux)
- Change ports in `canton.conf`
- Stop existing Canton instance

### Issue: Java Version Error
**Solution**: 
- Install Java 17+: `java -version` should show 17+
- Update JAVA_HOME if needed

### Issue: Canton Binary Not Found
**Solution**:
```bash
# Reinstall Daml SDK
daml install

# Or download manually
daml install --version latest
```

### Issue: Database Locked
**Solution**:
```bash
# Remove corrupted SQLite database
rm -rf canton-data/
# Restart Canton
```

---

## Next Steps

1. ✓ Canton network running locally
2. Create DAML project structure (Phase 2)
3. Deploy DAML contracts to network
4. Connect Java Spring Boot backend to participants
5. Implement fraud routing bridge

---

## Quick Test: Submit a Command

Once network is running and participants are connected:

```bash
# Connect to BankA participant's admin API
curl -X POST http://localhost:5002/v1/admin/health
```

Expected response: `200 OK`

---

## Documentation References

- **Canton Documentation**: https://docs.daml.com/canton/
- **Local Deployment**: https://docs.daml.com/canton/usermanual/local_deployment.html
- **Daml Smart Contracts**: https://docs.daml.com/daml/intro/
- **Ledger API**: https://docs.daml.com/app-dev/ledger-api/

---

## Support

For issues during setup:
1. Check Canton logs: `./canton-data/*.log`
2. Review configuration: `canton.conf`
3. Verify Java version and ports
4. Check official documentation links above

---

**Status**: Phase 1 - Canton Network Bootstrap
**Last Updated**: 2026-07-20
**Version**: 1.0.0
