# 🚀 How to Setup Canton - Complete Guide

**Pick Your Level**:

---

## 🟢 BEGINNER (Visual Guide)
**Read**: `CANTON_SETUP_VISUAL.md`
- Visual diagrams
- 5-step overview
- Simple explanations
- Common troubleshooting

**Time**: 15 minutes

---

## 🟡 INTERMEDIATE (Step-by-Step)
**Read**: `CANTON_SETUP_SIMPLE.md`
- Detailed step-by-step
- Code examples for each step
- What happens at each stage
- Full verification checklist

**Time**: 20 minutes

---

## 🟠 ADVANCED (Copy-Paste Commands)
**Read**: `CANTON_COMMANDS.md`
- All commands ready to copy-paste
- Windows, macOS, Linux versions
- Troubleshooting commands
- Reference guide

**Time**: 10 minutes (execution)

---

## 🔴 EXPERT (Complete Reference)
**Read**: `CANTON_SETUP.md`
- Comprehensive documentation
- All options explained
- Advanced configuration
- Full troubleshooting

**Time**: 30 minutes

---

## ⚡ Quick Summary (1 Minute)

```bash
# Windows PowerShell (Admin)
Invoke-WebRequest -Uri https://get.daml.com -OutFile DamlInstaller.exe
.\DamlInstaller.exe
# Restart PowerShell

# macOS/Linux Bash
curl -sSL https://get.daml.com | bash
source ~/.daml/env

# Then for all:
cd reboot_murali
mkdir canton-data
export CANTON_DATA_DIR="./canton-data"
canton -c canton.conf

# In new terminal:
curl http://localhost:5001/v1/healthy  # Should return 200 OK
```

---

## 📚 Which File Should I Read?

| Your Situation | Read This | Time |
|---|---|---|
| New to Canton | `CANTON_SETUP_VISUAL.md` | 15 min |
| Want step-by-step | `CANTON_SETUP_SIMPLE.md` | 20 min |
| Just want commands | `CANTON_COMMANDS.md` | 10 min |
| Need everything | `CANTON_SETUP.md` | 30 min |
| In a hurry | This file + `CANTON_COMMANDS.md` | 10 min |

---

## 5-MINUTE SETUP PATH

1. **Install Daml** (5 min)
   - Windows: Download & run installer from https://get.daml.com
   - macOS/Linux: `curl -sSL https://get.daml.com | bash`

2. **Start Canton** (5 min)
   - `cd reboot_murali`
   - `mkdir canton-data`
   - `export CANTON_DATA_DIR="./canton-data"`
   - `canton -c canton.conf`

3. **Verify** (2 min)
   - New terminal: `curl http://localhost:5001/v1/healthy`
   - Should return `{}` with 200 OK

✅ **Done!** Canton is running.

---

## 🎯 What Gets Set Up

```
After running "canton -c canton.conf":

Your Computer
├─ Daml SDK (3.1.0+)
├─ Canton Network
│  ├─ Domain (fraudshield-domain)
│  ├─ BankA (port 5001)
│  ├─ BankB (port 5011)
│  ├─ BankC (port 5021)
│  └─ Synchronizer (port 5031)
└─ SQLite Databases
   └─ ./canton-data/
      ├─ domain/db
      ├─ banka/db
      ├─ bankb/db
      ├─ bankc/db
      └─ synchronizer/db
```

All running on your machine, fully offline.

---

## ✅ Success Criteria

After setup, you should have:

- ✓ Daml SDK installed
- ✓ Canton network running (all 4 participants online)
- ✓ SQLite databases created
- ✓ All 4 health endpoints responding (200 OK)
- ✓ Ready to deploy DAML contracts

---

## 🔄 Common Operations

### Start Canton
```bash
canton -c canton.conf
```

### Stop Canton
```bash
Ctrl+C  (in Canton terminal)
# or
exit    (in Canton console)
```

### Restart (keeps data)
```bash
canton -c canton.conf
```

### Reset (delete all data)
```bash
rm -rf ./canton-data/
canton -c canton.conf
```

### Check Status
```bash
curl http://localhost:5001/v1/healthy  # Each participant
```

---

## 🐛 Issues?

| Problem | Solution |
|---------|----------|
| `daml: command not found` | Restart terminal or run: `source ~/.daml/env` |
| `Port already in use` | Wait 10s and retry, or kill existing: `pkill -f canton` |
| `Permission denied` | `chmod -R 755 ./canton-data/` |
| `curl: (7) Failed to connect` | Wait 15s for startup, check Canton console |

See `CANTON_SETUP.md` § Troubleshooting for more.

---

## 📖 Next Steps After Setup

### Option 1: Create DAML Contracts
```bash
daml new fraudshield-contracts --template=empty
cd fraudshield-contracts
daml build
```
→ See `NEXT_STEPS.md` § Phase 2

### Option 2: Read Documentation
```bash
Read: NEXT_STEPS.md
Or:   START_HERE_NEXT_STEPS.md
```

### Option 3: Verify Network
```bash
# In Canton console
> participants.list()
```

---

## 🎓 Learning Resources

- **Official Docs**: https://docs.daml.com/canton/
- **Local Setup**: https://docs.daml.com/canton/usermanual/local_deployment.html
- **This Project**: `README.md` (master index)

---

## 📋 Files Available

### Setup Guides
- `CANTON_SETUP_VISUAL.md` - Visual diagrams (beginner)
- `CANTON_SETUP_SIMPLE.md` - Detailed steps (intermediate)
- `CANTON_COMMANDS.md` - Copy-paste commands (quick)
- `CANTON_SETUP.md` - Complete reference (expert)

### This File
- `CANTON_HOW_TO_SETUP.md` - Overview & quick links

### Other Guides
- `CANTON_QUICK_START.md` - 5-minute reference
- `CANTON_ARCHITECTURE.md` - Design & architecture
- `NEXT_STEPS.md` - What to do after setup
- `README.md` - Master index of all docs

---

## 🚀 Ready?

**Pick one**:

1. **Just want it running?**
   → `CANTON_COMMANDS.md` (10 min)

2. **Want to understand it?**
   → `CANTON_SETUP_SIMPLE.md` (20 min)

3. **Visual learner?**
   → `CANTON_SETUP_VISUAL.md` (15 min)

4. **Need all details?**
   → `CANTON_SETUP.md` (30 min)

---

## 📞 Quick Links

| What | Where |
|------|-------|
| **Setup commands** | `CANTON_COMMANDS.md` |
| **Visual guide** | `CANTON_SETUP_VISUAL.md` |
| **Step-by-step** | `CANTON_SETUP_SIMPLE.md` |
| **Troubleshooting** | `CANTON_SETUP.md` § Troubleshooting |
| **After setup** | `NEXT_STEPS.md` |
| **All files** | `README.md` |

---

**Status**: Ready to Setup ✓  
**Time Required**: 30 minutes  
**Difficulty**: ⭐ Very Easy  

Go read your chosen guide and get started! 🎉
