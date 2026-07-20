# Canton Setup - Copy-Paste Commands

**Total Time**: 30 minutes

---

## 🪟 WINDOWS (PowerShell as Administrator)

### Step 1: Install Daml SDK

```powershell
# Download installer
Invoke-WebRequest -Uri https://get.daml.com -OutFile DamlInstaller.exe

# Run installer
.\DamlInstaller.exe

# Follow on-screen prompts, then close PowerShell
```

**Then restart PowerShell and verify**:
```powershell
daml version
# Should show: "version 3.1.0" or similar
```

### Step 2: Navigate to Project

```powershell
cd C:\Users\tbollu\Downloads\reboot_murali
```

### Step 3: Create Data Directory

```powershell
mkdir canton-data
```

### Step 4: Set Environment Variable

```powershell
$env:CANTON_DATA_DIR="./canton-data"
```

### Step 5: Start Canton

```powershell
canton -c canton.conf
```

**Wait for**: `Canton ready` message (10-15 seconds)

### Step 6: Verify (New PowerShell Window)

```powershell
# Test all 4 endpoints
curl http://localhost:5001/v1/healthy
curl http://localhost:5011/v1/healthy
curl http://localhost:5021/v1/healthy
curl http://localhost:5031/v1/healthy

# All should return 200 OK
```

---

## 🍎 macOS (Bash/Zsh Terminal)

### Step 1: Install Daml SDK

```bash
curl -sSL https://get.daml.com | bash

# Add to PATH (follow installer output)
source ~/.daml/env

# Verify
daml version
# Should show: "version 3.1.0" or similar
```

### Step 2: Navigate to Project

```bash
cd ~/Downloads/reboot_murali
```

### Step 3: Create Data Directory

```bash
mkdir -p ./canton-data
```

### Step 4: Set Environment Variable

```bash
export CANTON_DATA_DIR="./canton-data"
```

### Step 5: Start Canton

```bash
canton -c canton.conf
```

**Wait for**: `Canton ready` message (10-15 seconds)

### Step 6: Verify (New Terminal)

```bash
# Test all 4 endpoints
curl http://localhost:5001/v1/healthy
curl http://localhost:5011/v1/healthy
curl http://localhost:5021/v1/healthy
curl http://localhost:5031/v1/healthy

# All should return 200 OK
```

---

## 🐧 Linux (Bash Terminal)

### Step 1: Install Daml SDK

```bash
curl -sSL https://get.daml.com | bash

# Add to PATH (follow installer output)
source ~/.daml/env

# Verify
daml version
# Should show: "version 3.1.0" or similar
```

### Step 2: Navigate to Project

```bash
cd ~/Downloads/reboot_murali
# Or wherever you extracted reboot_murali
```

### Step 3: Create Data Directory

```bash
mkdir -p ./canton-data
```

### Step 4: Set Environment Variable

```bash
export CANTON_DATA_DIR="./canton-data"
```

### Step 5: Start Canton

```bash
canton -c canton.conf
```

**Wait for**: `Canton ready` message (10-15 seconds)

### Step 6: Verify (New Terminal)

```bash
# Test all 4 endpoints
curl http://localhost:5001/v1/healthy
curl http://localhost:5011/v1/healthy
curl http://localhost:5021/v1/healthy
curl http://localhost:5031/v1/healthy

# All should return 200 OK
```

---

## ✅ Expected Output

### Canton Console (Terminal 1)

```
Welcome to the Canton Console
...
> [2026-07-20 20:50:00.123] Connected to localhost:5001
> [INFO] Participant 'banka' is online
> [INFO] Participant 'bankb' is online
> [INFO] Participant 'bankc' is online
> [INFO] Participant 'synchronizer' is online
> [INFO] Domain 'fraudshield-domain' is operational
> Canton ready
>
```

### Health Check (Terminal 2)

```
$ curl http://localhost:5001/v1/healthy
{}

$ curl http://localhost:5011/v1/healthy
{}

$ curl http://localhost:5021/v1/healthy
{}

$ curl http://localhost:5031/v1/healthy
{}
```

All 4 should return `{}` with status 200 OK

---

## 📋 Full Command Sequence (Copy-Paste All)

### Windows PowerShell (Admin)

```powershell
# 1. Install
Invoke-WebRequest -Uri https://get.daml.com -OutFile DamlInstaller.exe
.\DamlInstaller.exe
# Wait for installation, then close and reopen PowerShell

# 2. Verify
daml version

# 3. Navigate
cd C:\Users\tbollu\Downloads\reboot_murali

# 4. Setup
mkdir canton-data
$env:CANTON_DATA_DIR="./canton-data"

# 5. Start
canton -c canton.conf
# Wait for "Canton ready"

# In new PowerShell window:
curl http://localhost:5001/v1/healthy
curl http://localhost:5011/v1/healthy
curl http://localhost:5021/v1/healthy
curl http://localhost:5031/v1/healthy
```

### macOS/Linux Bash

```bash
# 1. Install
curl -sSL https://get.daml.com | bash
source ~/.daml/env

# 2. Verify
daml version

# 3. Navigate
cd ~/Downloads/reboot_murali

# 4. Setup
mkdir -p ./canton-data
export CANTON_DATA_DIR="./canton-data"

# 5. Start
canton -c canton.conf
# Wait for "Canton ready"

# In new terminal:
curl http://localhost:5001/v1/healthy
curl http://localhost:5011/v1/healthy
curl http://localhost:5021/v1/healthy
curl http://localhost:5031/v1/healthy
```

---

## 🔧 Useful Commands During Setup

### Check Canton Version
```bash
canton --version
```

### Check Daml Version
```bash
daml version
```

### List Running Participants (in Canton console)
```
> participants.list()
```

### Exit Canton
```
> exit
```

Or press `Ctrl+C`

### Check if Ports Are In Use

**Windows**:
```powershell
netstat -ano | findstr :5001
```

**macOS/Linux**:
```bash
lsof -i :5001
```

### Kill Process on Port (if needed)

**macOS/Linux**:
```bash
pkill -f "canton"
```

**Windows**:
```powershell
Get-Process java | Stop-Process -Force
```

---

## 🆘 Troubleshooting Commands

### Issue: Port Already in Use
```bash
# Find what's using port 5001
lsof -i :5001  # macOS/Linux
netstat -ano | findstr :5001  # Windows

# Kill it
pkill -f canton  # macOS/Linux
# Windows: Use Task Manager to kill java.exe
```

### Issue: Daml Not Found
```bash
# Add to PATH
export PATH="$HOME/.daml/bin:$PATH"

# Or
source ~/.daml/env

# Verify
daml version
```

### Issue: Permission Denied
```bash
# Fix permissions
chmod -R 755 ./canton-data/
```

### Issue: Database Locked
```bash
# Delete and recreate
rm -rf ./canton-data/
mkdir ./canton-data/
canton -c canton.conf
```

---

## ✅ Verification Checklist

Run these to verify setup:

```bash
# 1. Daml installed?
daml version

# 2. Files present?
ls -la canton.conf
ls -la canton-data/

# 3. Canton running?
curl http://localhost:4011/health  # Domain
curl http://localhost:5001/v1/healthy  # BankA
curl http://localhost:5011/v1/healthy  # BankB
curl http://localhost:5021/v1/healthy  # BankC
curl http://localhost:5031/v1/healthy  # Sync

# All should return 200 OK
```

---

## 🎯 After Setup

### Check Canton Status (while running)

In Canton console (if still connected):
```
> participants.list()
```

### Next: Create DAML Project

```bash
# Exit Canton first: Ctrl+C

# Create project
daml new fraudshield-contracts --template=empty

cd fraudshield-contracts

# See what's inside
ls -la

# Open in editor
vim daml/Main.daml
```

### Start Over (Delete Everything)

```bash
# Stop Canton: Ctrl+C

# Delete ledger data
rm -rf ./canton-data/

# Start fresh
canton -c canton.conf
```

---

## 📞 Quick Reference

| Command | What It Does |
|---------|-------------|
| `daml version` | Check Daml installed |
| `daml new NAME` | Create DAML project |
| `daml build` | Build DAML contracts |
| `canton -c canton.conf` | Start Canton |
| `curl http://localhost:5001/v1/healthy` | Test BankA |
| `Ctrl+C` | Stop Canton |
| `pkill -f canton` | Kill Canton (macOS/Linux) |

---

**Total Setup Time**: 30 minutes  
**Next**: Read NEXT_STEPS.md  
**Status**: ✅ Ready to setup
