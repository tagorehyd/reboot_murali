# Canton Setup - Quick Visual Guide

## 🎯 Overview

```
What is Canton?
└─ Local blockchain network for testing smart contracts

What will we have?
├─ 1 Domain (ledger blockchain)
├─ 4 Participants (BankA, BankB, BankC, Synchronizer)
├─ SQLite storage (local files)
└─ Ready to deploy DAML contracts

How long?
└─ 30 minutes total
```

---

## 5 STEPS

### STEP 1️⃣ Install Daml SDK
```
Windows:
  1. Go to https://get.daml.com
  2. Download DamlInstaller.exe
  3. Run installer
  4. Complete installation

macOS/Linux:
  $ curl -sSL https://get.daml.com | bash

Verify:
  $ daml version
  → Shows "3.1.0" or similar ✓
```

**Time**: 10 min

---

### STEP 2️⃣ Prepare Files
```
Check these files exist in reboot_murali/:
  ✓ canton.conf (2.7 KB)
  ✓ canton-data/ directory

If not:
  $ mkdir canton-data
```

**Time**: 2 min

---

### STEP 3️⃣ Set Environment Variable
```
Windows (PowerShell):
  $env:CANTON_DATA_DIR="./canton-data"

macOS/Linux (Bash):
  export CANTON_DATA_DIR="./canton-data"

Verify:
  $ echo $CANTON_DATA_DIR
  → Shows "./canton-data" ✓
```

**Time**: 1 min

---

### STEP 4️⃣ Start Canton Network
```
Terminal 1 (Keep this open):

  $ cd reboot_murali
  $ canton -c canton.conf

Wait for:
  > Canton ready
  > [INFO] All participants online

This starts:
  ├─ BankA (port 5001)
  ├─ BankB (port 5011)
  ├─ BankC (port 5021)
  └─ Synchronizer (port 5031)
```

**Time**: 5 min

---

### STEP 5️⃣ Verify It Works
```
Terminal 2 (New terminal):

Test BankA:
  $ curl http://localhost:5001/v1/healthy
  → Returns {} with 200 OK ✓

Test BankB:
  $ curl http://localhost:5011/v1/healthy
  → Returns {} with 200 OK ✓

Test BankC:
  $ curl http://localhost:5021/v1/healthy
  → Returns {} with 200 OK ✓

Test Synchronizer:
  $ curl http://localhost:5031/v1/healthy
  → Returns {} with 200 OK ✓

All 4 working?
  → Setup Complete! ✓✓✓
```

**Time**: 5 min

---

## 📊 What's Running Now

```
          Canton Network (Local)
                    ↓
        ┌───────────────────────┐
        │ Domain (Ledger)       │
        │ Port: 4011-4013       │
        └───────────────────────┘
                    ↑
       ┌────┬────┬─────┬────────┐
       ↓    ↓    ↓     ↓        ↓
     BankA BankB BankC Sync    Others
     5001  5011  5021  5031    (ports)
      │     │     │     │
      └─────┴─────┴─────┘
           (connected)

Storage:
  ./canton-data/
  ├─ domain/db (ledger state)
  ├─ banka/db (BankA's view)
  ├─ bankb/db (BankB's view)
  ├─ bankc/db (BankC's view)
  └─ synchronizer/db (settlement authority)
```

---

## ✅ Success Checklist

After Setup:

- [ ] `daml version` works
- [ ] `canton.conf` exists
- [ ] `canton-data/` folder created
- [ ] Canton starts without errors
- [ ] Sees "Canton ready" message
- [ ] All 4 participants show "online"
- [ ] All 4 health endpoints return 200 OK
- [ ] SQLite files created in `canton-data/`

✅ **All checked?** → Setup is complete!

---

## 🎯 Ports Cheat Sheet

```
BankA:        BankB:        BankC:          Synchronizer:
├─ 5001 API   ├─ 5011 API   ├─ 5021 API    ├─ 5031 API
├─ 5002 Admin ├─ 5012 Admin ├─ 5022 Admin  ├─ 5032 Admin
└─ 5003 Metrics
└─ 5013 Metrics
└─ 5023 Metrics
└─ 5033 Metrics

Domain:
├─ 4011 Public API (participants connect here)
├─ 4012 Admin
└─ 4013 Metrics
```

---

## 🛑 Stop & Restart

### Stop Canton
```
In Canton terminal:
  > exit

Or press:
  Ctrl+C
```

### Restart (keeps data)
```
$ canton -c canton.conf
# All previous data persists
```

### Fresh Start (delete all data)
```
$ rm -rf ./canton-data/
$ canton -c canton.conf
# Starts with empty ledger
```

---

## 🐛 Common Issues

### Issue: Port Already in Use
```
Error: Address already in use: 5001

Fix:
  1. Ctrl+C to stop Canton
  2. Wait 10 seconds
  3. Start again
```

### Issue: Daml Not Found
```
Error: command not found: daml

Fix:
  1. Restart terminal after Daml install
  2. Or: export PATH="$HOME/.daml/bin:$PATH"
  3. Test: daml version
```

### Issue: Health Check Fails
```
Error: curl: (7) Failed to connect

Fix:
  1. Wait 15 seconds (startup takes time)
  2. Check Canton console for errors
  3. Is Canton still running? (Look for "Canton ready")
```

### Issue: Permission Denied
```
Error: Permission denied ./canton-data

Fix:
  chmod -R 755 ./canton-data/
```

---

## 📈 What Happens After Setup

```
Step 1: Canton Setup ✓ (You are here)
         ↓
Step 2: Create DAML Contracts (Phase 2)
         daml new fraudshield-contracts
         └─ Code 4 contract modules
         ↓
Step 3: Deploy to Network (Phase 3)
         daml build
         └─ Upload to Canton
         ↓
Step 4: Java Integration (Phase 7)
         └─ Connect backend
         ↓
Step 5: Fraud Routing (Phase 8)
         └─ Route to contracts
         ↓
Step 6: Settlement (Phase 9)
         └─ Finalize transactions
         ↓
Step 7: UI Integration (Phase 11)
         └─ Show real-time status
```

---

## 📖 Files Related to Setup

```
reboot_murali/
├── canton.conf                    ← Network config
├── canton-data/                   ← Ledger storage (created)
├── CANTON_SETUP_SIMPLE.md         ← You are reading this
├── CANTON_SETUP.md                ← Detailed version
├── CANTON_QUICK_START.md          ← 5-min reference
└── README.md                       ← Master index
```

---

## 🚀 Next Steps After Setup

### Option 1: Verify Network
```
In Canton console:
  > participants.list()
  # See all 4 participants
```

### Option 2: Create DAML Contracts
```
$ daml new fraudshield-contracts --template=empty
$ cd fraudshield-contracts
$ daml build
```

### Option 3: Read Next Docs
```
Read: NEXT_STEPS.md (detailed roadmap)
Or:   START_HERE_NEXT_STEPS.md (quick decision)
```

---

## 💡 Understanding the Setup

### Canton = Blockchain for Smart Contracts
- Stores contracts (immutable)
- Executes transactions
- Maintains ledger state
- 4 participants see their authorized contracts

### SQLite = Local Storage
- Development-grade database
- Stores blockchain data locally
- Easy to backup/reset
- Production would use PostgreSQL

### Participants = Banks + Authority
- Each participant has own ledger view
- Can see authorized contracts only
- Synchronizer controls settlement
- Communication via domain

### Daml = Smart Contract Language
- Like Solidity (but safer)
- Define contracts (Hold, Escrow, MultiSig)
- Deploy to Canton
- Execute with type safety

---

## ⏱️ Timeline

```
Right now (30 min):
  └─ Setup Canton ← You are here

This week (2-3 days):
  └─ Phase 2: Create DAML contracts

Next week (1 week):
  └─ Phase 3-6: Deploy & connect

Week 3 (1 week):
  └─ Phase 7-9: Java integration

Week 4 (1 week):
  └─ Phase 10-15: UI + demo ready

Result: Full integration ready!
```

---

## ✨ You're Ready!

Canton setup is straightforward:
1. Install Daml
2. Create data directory
3. Set environment variable
4. Start Canton
5. Verify health

That's it! 🎉

**Next**: `NEXT_STEPS.md` for what to do after setup.

---

**Status**: Ready to Setup ✓  
**Time**: ~30 minutes  
**Difficulty**: ⭐ Very Easy  
**Prerequisites**: Java 17+ installed
