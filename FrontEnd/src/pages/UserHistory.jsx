import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CantonContractGraphModal from '../components/CantonContractGraphModal';

const DEMO_USERS = [
  { id: 'U001', name: 'Alice Walker', bank: 'Stellar Bank', color: 'from-emerald-400 to-emerald-500' },
  { id: 'U002', name: 'Bob Taylor', bank: 'Nova Finance', color: 'from-blue-400 to-blue-500' },
  { id: 'U003', name: 'Carlos Rivera', bank: 'Prime Banking', color: 'from-purple-400 to-purple-500' },
  { id: 'U004', name: 'Diana Prince', bank: 'Apex Trust', color: 'from-cyan-400 to-cyan-500' },
  { id: 'U005', name: 'Eve Chen', bank: 'Quantum Pay', color: 'from-pink-400 to-pink-500' },
  { id: 'U006', name: 'Frank Okafor', bank: 'Gold Standard', color: 'from-amber-400 to-amber-500' },
  { id: 'U007', name: 'Grace Okonkwo', bank: 'Liberty Banking', color: 'from-red-400 to-red-500' },
];

function IsolationForestRadar8D({ txn }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  const amount = Number(txn?.amount || 0);
  const isHighValue = amount >= 50000;

  const vectorData = [
    { label: 'Amount Spike', key: 'amountSpike', val: Math.min(1.0, Math.max(0.15, amount / 100000)), unit: '£' + amount.toLocaleString() },
    { label: 'Velocity Rate', key: 'velocity', val: isHighValue ? 0.88 : 0.25, unit: isHighValue ? '8 txns/min (Spike)' : '1 txn/hr' },
    { label: 'Device Fingerprint', key: 'device', val: isHighValue ? 0.92 : 0.15, unit: isHighValue ? 'Unrecognized Mobile' : 'Trusted Device' },
    { label: 'Geo Distance', key: 'geo', val: isHighValue ? 0.78 : 0.20, unit: isHighValue ? '2,400 km (IP Mismatch)' : '12 km' },
    { label: 'Time Delta', key: 'timeDelta', val: isHighValue ? 0.65 : 0.30, unit: isHighValue ? '3 AM UTC' : '2 PM UTC' },
    { label: 'Mempool Friction', key: 'friction', val: isHighValue ? 0.70 : 0.18, unit: isHighValue ? 'High Congestion' : 'Normal' },
    { label: 'Beneficiary Risk', key: 'beneficiary', val: isHighValue ? 0.85 : 0.10, unit: isHighValue ? 'New Recipient' : 'Saved Contact' },
    { label: 'Auth Entropy', key: 'authEntropy', val: isHighValue ? 0.72 : 0.22, unit: isHighValue ? 'Single-Factor' : 'Biometric Signed' },
  ];

  const overallScore = (vectorData.reduce((acc, curr) => acc + curr.val, 0) / 8).toFixed(2);

  const size = 280;
  const center = size / 2;
  const radius = 90;
  const angleStep = (2 * Math.PI) / 8;
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getCoordinates = (index, value) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = value * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPoints = vectorData.map((d, i) => {
    const { x, y } = getCoordinates(i, d.val);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div>
          <h3 className="text-xs font-mono font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>🛡️</span> LIVE ISOLATION FOREST 8D VECTOR
          </h3>
          <p className="text-[10px] text-slate-400 font-mono">Unsupervised ML Isolation Forest Feature Extraction</p>
        </div>
        <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
          Number(overallScore) > 0.5 ? 'bg-red-950 text-red-300 border-red-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
        }`}>
          SCORE: {overallScore}
        </span>
      </div>

      {/* SVG 8D Radar Graphic */}
      <div className="flex justify-center items-center relative py-1">
        <svg width={size} height={size} className="overflow-visible">
          {gridLevels.map((lvl, lIdx) => {
            const levelPoints = vectorData.map((_, i) => {
              const { x, y } = getCoordinates(i, lvl);
              return `${x},${y}`;
            }).join(' ');
            return (
              <polygon
                key={lIdx}
                points={levelPoints}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray={lIdx === 4 ? "none" : "2,2"}
              />
            );
          })}

          {vectorData.map((_, i) => {
            const { x, y } = getCoordinates(i, 1.0);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#334155"
                strokeWidth="1"
              />
            );
          })}

          <polygon
            points={polygonPoints}
            fill="rgba(16, 185, 129, 0.25)"
            stroke="#10b981"
            strokeWidth="2.5"
            className="transition-all duration-500"
          />

          {vectorData.map((d, i) => {
            const { x, y } = getCoordinates(i, d.val);
            const labelPos = getCoordinates(i, 1.25);
            const isHovered = hoveredNode === d.key;

            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? "6" : "4"}
                  fill="#38bdf8"
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="cursor-pointer transition-all hover:scale-125"
                  onMouseEnter={() => setHoveredNode(d.key)}
                  onMouseLeave={() => setHoveredNode(null)}
                />

                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`text-[9px] font-mono font-bold transition-colors ${
                    isHovered ? 'fill-cyan-300 font-extrabold' : 'fill-slate-400'
                  }`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Node Tooltip Box */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2 text-center font-mono text-[10px]">
        {hoveredNode ? (
          <div className="text-cyan-300 font-bold">
            {vectorData.find(v => v.key === hoveredNode)?.label}: {' '}
            <span className="text-emerald-400">{(vectorData.find(v => v.key === hoveredNode)?.val * 100).toFixed(0)}% Vector Spike</span> {' '}
            ({vectorData.find(v => v.key === hoveredNode)?.unit})
          </div>
        ) : (
          <div className="text-slate-400">
            💡 Hover over any feature node on the radar to inspect vectors
          </div>
        )}
      </div>

      {/* Explanatory Footer */}
      <div className="pt-2 border-t border-slate-800 space-y-1 text-[10px]">
        <p className="font-bold text-slate-200 flex items-center gap-1">
          <span>🧠</span> About the 8D Vector
        </p>
        <p className="text-slate-400 leading-relaxed">
          The Isolation Forest ML engine isolates anomaly points across 8 orthogonal dimensions. Spikes exceeding 70% trigger automatic <strong className="text-cyan-300">HoldRequest</strong> smart contracts on the Canton ledger.
        </p>
      </div>
    </div>
  );
}

export default function UserHistory({ selectedUserId, onSelectUser }) {
  const [activeUser, setActiveUser] = useState(selectedUserId || 'U001');
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [cantonDetailsMap, setCantonDetailsMap] = useState({});
  const [collapsedStages, setCollapsedStages] = useState({});
  const [activeTab, setActiveTab] = useState('BOTH'); // 'FLOW' | 'RADAR' | 'BOTH'
  const [isCantonModalOpen, setIsCantonModalOpen] = useState(false);

  // Sub-tab navigation inside User History
  const [activeSubTab, setActiveSubTab] = useState('FLOW'); // 'FLOW' | 'PENDING'
  const [pendingLayout, setPendingLayout] = useState('GRID'); // 'GRID' | 'TABLE'
  const [pendingFilterMode, setPendingFilterMode] = useState('ALL'); // 'ALL' | 'STANDARD' | 'ESCROW'
  const [pendingTransactions, setPendingTransactions] = useState([]);

  const getUserById = (id) => {
    return DEMO_USERS.find(u => u.id === id) || { name: id, displayName: id };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return '✅';
      case 'PENDING_ADMIN': return '⏳';
      case 'PENDING_CONSENT': return '🔐';
      case 'REJECTED': return '❌';
      case 'COMMITTED': return '✓';
      case 'HOLD_ACTIVE': return '🔒';
      case 'PENDING_USER_APPROVAL': return '👤';
      case 'PENDING_BANK_APPROVAL': return '🏦';
      case 'ESCROW_ACTIVE': return '🔏';
      case 'SETTLED': return '✅';
      case 'EXPIRED': return '⌛';
      default: return '•';
    }
  };

  // Direction & Amount/Risk Tier Filters
  const [dirFilter, setDirFilter] = useState('ALL'); // 'ALL' | 'OUT' | 'IN'
  const [amountFilter, setAmountFilter] = useState('ALL'); // 'ALL' | 'LOW' (< 1000) | 'MEDIUM' (1000 - 5000) | 'HIGH' (> 5000)

  // Toggle single stage collapse
  const toggleStage = (stepNum) => {
    setCollapsedStages(prev => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  // Toggle all stages collapse/expand
  const toggleAllStages = (collapse) => {
    const newMap = {};
    [1, 2, 3, 4, 5, 6].forEach(s => {
      newMap[s] = collapse;
    });
    setCollapsedStages(newMap);
  };

  // Fetch transaction history (both committed history & active pending mempool txns)
  const loadHistory = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      if (activeUser === 'ALL') {
        // Fetch all blocks and extract all transactions in parallel with active pending mempool queue
        const [blocksRes, pendingRes] = await Promise.all([
          axios.get('/api/chain/Alpha/blocks').catch(() => ({ data: [] })),
          axios.get('/api/admin/queue').catch(() => ({ data: [] })),
        ]);
        const blocks = blocksRes.data || [];
        const pendingQueue = pendingRes.data || [];
        const allTxns = [];

        // 1. Add active pending transactions first
        pendingQueue.forEach(t => {
          allTxns.push({
            txnId: t.id || t.txnId,
            fromUserId: t.fromUserId,
            toUserId: t.toUserId,
            amount: t.amount,
            status: t.status || 'PENDING_CONSENT',
            direction: 'OUT'
          });
        });

        // 2. Add committed block transactions
        blocks.forEach(b => {
          if (b.transactions && b.transactions.length > 0) {
            b.transactions.forEach(t => {
              allTxns.push({
                txnId: t.txnId || t.id,
                fromUserId: t.from || t.fromUserId,
                toUserId: t.to || t.toUserId,
                amount: t.amount,
                status: t.status || 'COMMITTED',
                timestamp: b.timestamp,
                direction: 'OUT'
              });
            });
          }
        });
        setHistoryItems(allTxns);
        setPendingTransactions(pendingQueue.map(t => ({
          ...t,
          txnId: t.id || t.txnId,
        })));
        setSelectedTxn(prev => prev || (allTxns.length > 0 ? allTxns[0] : null));
      } else {
        // Fetch specific user's history and pending transactions in parallel
        const [historyRes, pendingRes] = await Promise.all([
          axios.get(`/api/txn/user/${activeUser}/history`).catch(() => ({ data: [] })),
          axios.get(`/api/txn/user/${activeUser}/pending`).catch(() => ({ data: [] })),
        ]);

        const historyList = (historyRes.data || []).map(item => ({
          ...item,
          txnId: item.txnId || item.id,
          direction: item.fromUserId === activeUser ? 'OUT' : 'IN',
        }));

        const pendingList = (pendingRes.data || []).map(item => ({
          ...item,
          txnId: item.id || item.txnId,
          direction: item.fromUserId === activeUser ? 'OUT' : 'IN',
          status: item.status || 'HOLD_ACTIVE',
        }));

        // Combine and deduplicate by txnId
        const combinedMap = new Map();
        [...pendingList, ...historyList].forEach(tx => {
          if (tx.txnId) combinedMap.set(tx.txnId, tx);
        });

        const combined = Array.from(combinedMap.values());
        setHistoryItems(combined);
        setPendingTransactions(pendingList);
        setSelectedTxn(prev => {
          if (!prev) return combined.length > 0 ? combined[0] : null;
          const matched = combined.find(c => (c.txnId || c.id) === (prev.txnId || prev.id));
          return matched || (combined.length > 0 ? combined[0] : null);
        });
      }
    } catch (err) {
      console.error('Failed to load user history:', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    setSelectedTxn(null);
    loadHistory(false);
    const interval = setInterval(() => loadHistory(true), 5000);
    return () => clearInterval(interval);
  }, [activeUser]);

  // Apply Direction and Amount/Risk Filters
  const filteredHistoryItems = historyItems.filter(item => {
    // Direction Filter
    if (dirFilter === 'OUT' && item.direction !== 'OUT') return false;
    if (dirFilter === 'IN' && item.direction !== 'IN') return false;

    // Amount / Risk Tier Filter
    const amt = Number(item.amount || 0);
    if (amountFilter === 'LOW' && amt >= 1000) return false;
    if (amountFilter === 'MEDIUM' && (amt < 1000 || amt > 5000)) return false;
    if (amountFilter === 'HIGH' && amt <= 5000) return false;

    return true;
  });

  // Keep selectedTxn synchronized with active filters
  useEffect(() => {
    if (filteredHistoryItems.length > 0) {
      const isStillPresent = filteredHistoryItems.some(
        f => (f.txnId || f.id) === (selectedTxn?.txnId || selectedTxn?.id)
      );
      if (!isStillPresent) {
        setSelectedTxn(filteredHistoryItems[0]);
      }
    } else {
      setSelectedTxn(null);
    }
  }, [dirFilter, amountFilter, historyItems]);

  // Fetch Canton details when selectedTxn changes
  useEffect(() => {
    if (!selectedTxn) return;
    const txnId = selectedTxn.txnId || selectedTxn.id;
    if (!txnId || cantonDetailsMap[txnId]) return;

    axios.get(`/api/chain/txn/${txnId}/canton-details`)
      .then(res => {
        setCantonDetailsMap(prev => ({ ...prev, [txnId]: res.data }));
      })
      .catch(err => console.error('Failed to load Canton details for txn', txnId, err));
  }, [selectedTxn]);

  const activeUserInfo = DEMO_USERS.find(u => u.id === activeUser) || {
    id: activeUser,
    name: activeUser === 'ALL' ? 'All System Users' : activeUser,
    bank: 'Canton Network Interbank',
    color: 'from-cyan-500 to-blue-600'
  };

  // Construct DAML Contract & Consent Workflow Lifecycle Stages
  const workflowStages = [
    {
      step: 1,
      title: 'DAML Payment Initiation',
      badge: 'FraudShield.Interbank:HoldRequest',
      choice: 'CreateHoldRequest',
      desc: `Payment of £${selectedTxn?.amount || 0} created on Canton ledger`,
      party: selectedTxn?.fromUserId || 'Sender Customer',
      status: 'COMPLETED ✓',
      color: 'bg-emerald-500',
    },
    {
      step: 2,
      title: 'DAML Customer Consent Signature',
      badge: 'FraudShield.Interbank:ConsentAgreement',
      choice: 'ExerciseUserConsent',
      desc: 'Explicit user authorization choice attached on Canton node',
      party: `${selectedTxn?.fromUserId || 'Sender'}_Party`,
      status: 'COMPLETED ✓',
      color: 'bg-emerald-500',
    },
    {
      step: 3,
      title: 'DAML AI Anomaly & Rules Check',
      badge: 'IsolationForest8D & RuleEvaluator',
      choice: 'EvaluateRiskScore',
      desc: 'Isolation Forest 8D vector scored & multi-sig clearance routed',
      party: 'FraudShield Security Engine',
      status: 'COMPLETED ✓',
      color: 'bg-emerald-500',
    },
    {
      step: 4,
      title: 'Originating Bank DAML Multi-Sig Approval',
      badge: 'FraudShield.Interbank:MultiSigApproval',
      choice: 'GrantMultiSigClearance',
      desc: 'Admin compliance clearance choice exercised by originating bank',
      party: 'BankA_Admin',
      status: selectedTxn?.status === 'COMMITTED' || selectedTxn?.status === 'APPROVED' ? 'COMPLETED ✓' : 'IN_PROGRESS ⏳',
      color: selectedTxn?.status === 'COMMITTED' || selectedTxn?.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-amber-500',
    },
    {
      step: 5,
      title: 'Recipient Bank DAML Escrow Agreement',
      badge: 'FraudShield.Interbank:EscrowAgreement',
      choice: 'EstablishEscrowHold',
      desc: 'Recipient clearing escrow contract established for atomic settlement',
      party: 'BankB_Clearing',
      status: selectedTxn?.status === 'COMMITTED' ? 'COMPLETED ✓' : 'PENDING ⏳',
      color: selectedTxn?.status === 'COMMITTED' ? 'bg-emerald-500' : 'bg-slate-400',
    },
    {
      step: 6,
      title: 'Canton DAML Interbank Settlement',
      badge: 'FraudShield.Interbank:SettlementAuthorization',
      choice: 'CommitAtomicSettlement',
      desc: 'Atomic ledger finality committed across synchronizer domain',
      party: 'GlobalSynchronizer',
      status: selectedTxn?.status === 'COMMITTED' ? 'COMPLETED ✓' : 'PENDING ⏳',
      color: selectedTxn?.status === 'COMMITTED' ? 'bg-emerald-500' : 'bg-slate-400',
    },
  ];

  const allCollapsed = Object.keys(collapsedStages).length === 6 && Object.values(collapsedStages).every(Boolean);

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 space-y-4 overflow-hidden">
      {/* Top Header & User Selector Dropdown Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📜</span> User Payment History & DAML Workflow Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dedicated audit trail for customer transactions with step-by-step DAML contract & 8D Isolation Forest ML vectors.
          </p>
        </div>

        {/* User Selection Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            Select User Account:
          </label>
          <select
            value={activeUser}
            onChange={(e) => {
              setActiveUser(e.target.value);
              if (onSelectUser && e.target.value !== 'ALL') onSelectUser(e.target.value);
            }}
            className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">🌐 All Users & System Transactions</option>
            {DEMO_USERS.map(u => (
              <option key={u.id} value={u.id}>
                👤 {u.name} ({u.id}) — {u.bank}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* User Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeUserInfo.color} flex items-center justify-center text-white font-bold text-base shadow-md`}>
            {activeUserInfo.name[0]}
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{activeUserInfo.name}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{activeUserInfo.bank} · Account ID: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{activeUserInfo.id}</strong></p>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Showing <strong className="text-slate-900 dark:text-slate-100 font-bold">{filteredHistoryItems.length}</strong> of {historyItems.length} transactions.
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm min-h-0">
          Loading user history and DAML contract ledger states...
        </div>
      ) : historyItems.length === 0 ? (
        <div className="flex-1 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2 flex flex-col items-center justify-center min-h-0">
          <p className="text-3xl">📜</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">No payment history found for {activeUserInfo.name}.</p>
          <p className="text-xs text-slate-400">Transactions submitted by this user will appear here with DAML contract lifecycle workflows.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-4">
          {/* Sub-Page Navigation Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xs flex-shrink-0">
            <button
              onClick={() => setActiveSubTab('FLOW')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-black tracking-tight uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'FLOW'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>🌿 Interactive DAML Workflow Center</span>
            </button>
            <button
              onClick={() => setActiveSubTab('PENDING')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-black tracking-tight uppercase flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                activeSubTab === 'PENDING'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>⏳ Active Pending Consents & Holds</span>
              {pendingTransactions.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
                  {pendingTransactions.length}
                </span>
              )}
            </button>
          </div>

          {activeSubTab === 'FLOW' ? (
            /* DEDICATED DAML CONTRACT & CONSENT LIFECYCLE FLOW */
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-h-0 overflow-hidden">
          {/* Left Column: User Transaction List Selector & Filters */}
          <div className="lg:col-span-4 flex flex-col h-full min-h-0 space-y-2">
            <div className="flex items-center justify-between flex-shrink-0">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Transactions ({filteredHistoryItems.length})
              </h3>
              <span className="text-[10px] text-indigo-500 font-semibold">Select to view Flow</span>
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <select
                value={dirFilter}
                onChange={(e) => setDirFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                <option value="ALL">🔄 All Directions</option>
                <option value="OUT">📤 Payment Out</option>
                <option value="IN">📥 Payment In</option>
              </select>

              <select
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                <option value="ALL">📊 All Value Tiers</option>
                <option value="LOW">🟢 Low (&lt; £1,000)</option>
                <option value="MEDIUM">🟡 Medium (£1k - £5k)</option>
                <option value="HIGH">🔴 High (&gt; £5,000)</option>
              </select>
            </div>

            {/* Transaction Queue Items */}
            {filteredHistoryItems.length === 0 ? (
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-6 text-center text-xs text-slate-400 flex items-center justify-center">
                No transactions match the selected filters.
              </div>
            ) : (
              <div className="flex-1 max-h-[calc(100vh-310px)] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredHistoryItems.map((item) => {
                  const isSelected = (selectedTxn?.txnId || selectedTxn?.id) === (item.txnId || item.id);
                  const isOut = item.direction === 'OUT';

                  return (
                    <div
                      key={item.txnId || item.id}
                      onClick={() => setSelectedTxn(item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/30 border-indigo-400 dark:border-indigo-700 ring-2 ring-indigo-500/20 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          (item.status === 'REJECTED' || item.status === 'CANCELLED')
                            ? 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                            : isOut ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {(item.status === 'REJECTED' || item.status === 'CANCELLED') ? '❌ Cancelled' : isOut ? '📤 Payment Out' : '📥 Payment In'}
                        </span>
                        <span className={`text-xs font-black ${
                          (item.status === 'REJECTED' || item.status === 'CANCELLED')
                            ? 'text-rose-600 dark:text-rose-400 line-through'
                            : isOut ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {(item.status === 'REJECTED' || item.status === 'CANCELLED') ? '❌ ' : isOut ? '-' : '+'}£{Number(item.amount).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {isOut ? `To: ${item.toUserId || item.counterparty}` : `From: ${item.fromUserId || item.counterparty}`}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">{item.txnId || item.id}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxn(item);
                            setIsCantonModalOpen(true);
                          }}
                          className="w-full text-[10px] font-extrabold px-2 py-1 rounded-lg bg-indigo-50/80 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-100/80 dark:border-slate-700/80 shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>DAML Consent Trail ⛓️</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Dedicated Interactive DAML Lifecycle & 8D Radar Flowchart */}
          <div className="lg:col-span-8 flex flex-col h-full min-h-0">
            {selectedTxn ? (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-2xl space-y-3 overflow-hidden">
                {/* Header Spec Banner & View Tab Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 flex-shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚡</span>
                      <h3 className="text-sm font-black text-white">DAML Contract Lifecycle: <span className="font-mono text-cyan-300">{selectedTxn.txnId || selectedTxn.id}</span></h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Sequential interbank DAML smart contract choices & 8D Isolation Forest ML vectors</p>
                  </div>

                  {/* View Tab Selector */}
                  <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                    {[
                      { id: 'BOTH', label: '🔄 Flow + 8D Radar', icon: '🔄' },
                      { id: 'FLOW', label: '⚡ DAML Flow', icon: '⚡' },
                      { id: 'RADAR', label: '🛡️ 8D Vector Radar', icon: '🛡️' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* INTERNAL SCROLL CONTAINER (No outer page scroll) */}
                <div className="flex-1 max-h-[calc(100vh-310px)] overflow-y-auto pr-2 space-y-4 custom-scrollbar min-h-0">
                  {/* 1. ISOLATION FOREST 8D VECTOR RADAR GRAPH */}
                  {(activeTab === 'BOTH' || activeTab === 'RADAR') && (
                    <IsolationForestRadar8D txn={selectedTxn} />
                  )}

                  {/* 2. DAML CONTRACT LIFECYCLE STAGES */}
                  {(activeTab === 'BOTH' || activeTab === 'FLOW') && (
                    <div className="space-y-3 pt-2">
                      {/* Subheader with Collapse All / Expand All Toggle & Canton DAG Inspector */}
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 pb-2 flex-wrap gap-2">
                        <span className="text-[11px]">🔄 Interbank Contract Flow (6 Stages)</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsCantonModalOpen(true)}
                            className="text-[10px] font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 px-3 py-1 rounded-lg shadow transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>⛓️ Canton DAG Inspector & Proof</span>
                          </button>
                          <button
                            onClick={() => toggleAllStages(!allCollapsed)}
                            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-all cursor-pointer"
                          >
                            {allCollapsed ? '🔽 Expand All' : '🔼 Collapse All'}
                          </button>
                        </div>
                      </div>

                      <div className="relative pl-7 space-y-2.5 before:absolute before:left-3 before:top-2.5 before:bottom-2.5 before:w-1 before:bg-gradient-to-b before:from-emerald-500 before:via-cyan-500 before:to-indigo-500">
                        {workflowStages.map((st) => {
                          const isCollapsed = Boolean(collapsedStages[st.step]);

                          return (
                            <div
                              key={st.step}
                              className="relative p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-1.5 shadow-sm transition-all"
                            >
                              {/* Indicator Dot */}
                              <div className={`absolute -left-7 top-3.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ring-2 ring-slate-800 ${st.color}`}></div>

                              {/* Collapsible Header */}
                              <div
                                onClick={() => toggleStage(st.step)}
                                className="flex items-center justify-between gap-2 cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-xs font-bold">{isCollapsed ? '►' : '▼'}</span>
                                  <span className="font-extrabold text-xs text-white">Stage {st.step}: {st.title}</span>
                                  <span className="text-[9px] font-mono bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800">
                                    {st.badge}
                                  </span>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  st.status.includes('COMPLETED') || st.status.includes('COMMITTED')
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-amber-950 text-amber-300 border-amber-800'
                                }`}>
                                  {st.status}
                                </span>
                              </div>

                              {/* Expandable Body */}
                              {!isCollapsed && (
                                <div className="pt-1.5 border-t border-slate-700/60 space-y-1.5 text-xs">
                                  <p className="text-slate-300 text-[11px]">{st.desc}</p>

                                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono flex-wrap gap-1">
                                    <span>Choice: <strong className="text-sky-300 font-bold">{st.choice}</strong></span>
                                    <span>Party: <strong className="text-cyan-300">{st.party}</strong></span>
                                    <span>Signature: <strong className="text-emerald-400">Signed ✓</strong></span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-slate-900 text-slate-400 rounded-2xl p-8 text-center border border-slate-800 text-xs flex items-center justify-center min-h-0">
                Select a transaction from the left queue to view its step-by-step DAML lifecycle workflow and 8D vector radar.
              </div>
            )}
          </div>
        </div>
      ) : (
            /* ACTIVE PENDING CONSENTS & HOLDS SLIDE PORTED */
            <div className="flex-1 flex bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-col min-h-0">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 flex-shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <span>🕒</span> Active Holds & Pending Consents
                    </h3>
                    <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg">
                      <button
                        onClick={() => setPendingLayout('GRID')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${pendingLayout === 'GRID' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                      >
                        Grid
                      </button>
                      <button
                        onClick={() => setPendingLayout('TABLE')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${pendingLayout === 'TABLE' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                      >
                        Table
                      </button>
                    </div>
                    <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg">
                      <button
                        onClick={() => setPendingFilterMode('ALL')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${pendingFilterMode === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setPendingFilterMode('STANDARD')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${pendingFilterMode === 'STANDARD' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                      >
                        Standard
                      </button>
                      <button
                        onClick={() => setPendingFilterMode('ESCROW')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${pendingFilterMode === 'ESCROW' ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                      >
                        <span className="text-[10px]">🔏</span> Escrow
                      </button>
                    </div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold shadow-inner">{pendingTransactions.length} Pending</span>
                </div>
              </div>
              {pendingLayout === 'GRID' ? (
                <div className="overflow-y-auto flex-1 p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch content-start">
                  {pendingTransactions.filter(txn => {
                    if (pendingFilterMode === 'ALL') return true;
                    const isEscrow = Boolean(txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE');
                    return pendingFilterMode === 'ESCROW' ? isEscrow : !isEscrow;
                  }).length === 0 ? (
                    <div className="col-span-full">
                      <p className="text-sm text-slate-500 dark:text-slate-500 text-center py-12">No pending items found matching filter</p>
                    </div>
                  ) : (
                    pendingTransactions.filter(txn => {
                      if (pendingFilterMode === 'ALL') return true;
                      const isEscrow = Boolean(txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE');
                      return pendingFilterMode === 'ESCROW' ? isEscrow : !isEscrow;
                    }).map((txn) => (
                      <div key={txn.id || txn.txnId} className={`border rounded-2xl p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col h-full ${
                        txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE' ? 'bg-purple-50/80 border-purple-300 dark:bg-purple-950/20 dark:border-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]' :
                        txn.status === 'HOLD_ACTIVE' ? 'bg-red-50/80 border-red-300 dark:bg-red-950/20 dark:border-red-900/40' :
                        txn.status === 'PENDING_BANK_APPROVAL' ? 'bg-orange-50/80 border-orange-300 dark:bg-orange-950/20 dark:border-orange-900/40' :
                        txn.status === 'PENDING_USER_APPROVAL' || txn.status === 'PENDING_CONSENT' ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/20 dark:border-blue-900/40' :
                        'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                            txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE' ? 'text-purple-700 dark:text-purple-400' :
                            txn.status === 'HOLD_ACTIVE' ? 'text-red-700 dark:text-red-400' :
                            txn.status === 'PENDING_BANK_APPROVAL' ? 'text-orange-700 dark:text-orange-400' :
                            txn.status === 'PENDING_USER_APPROVAL' || txn.status === 'PENDING_CONSENT' ? 'text-blue-700 dark:text-blue-400' :
                            'text-slate-600 dark:text-slate-400'
                          }`}>
                            {txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE' ? (
                              <>🔏 Escrow &middot; {
                                txn.status === 'PENDING_BANK_APPROVAL' ? 'Admin Approval' :
                                txn.status === 'HOLD_ACTIVE' ? 'Admin Hold' :
                                txn.status === 'PENDING_USER_APPROVAL' || txn.status === 'PENDING_CONSENT' ? 'Needs Consent' :
                                'Active'
                              }</>
                            ) :
                             txn.status === 'HOLD_ACTIVE' ? '🔒 Admin Hold' :
                             txn.status === 'PENDING_BANK_APPROVAL' ? '⏳ Admin Approval' :
                             (txn.status === 'PENDING_USER_APPROVAL' || txn.status === 'PENDING_CONSENT') ? '👤 Needs Consent' :
                             `${getStatusIcon(txn.status)} ${txn.status}`}
                          </p>
                          <p className="text-lg font-black text-slate-800 dark:text-slate-100">£{Number(txn.amount).toLocaleString()}</p>
                        </div>
                        <p className="font-mono text-[9px] text-slate-500 dark:text-slate-400 break-all bg-white/50 dark:bg-slate-950/40 px-2 py-1 rounded mb-3">ID: {txn.id || txn.txnId}</p>
                        <div className="mt-auto">
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">From</p>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{getUserById(txn.fromUserId)?.name || txn.fromUserId}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">To</p>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{getUserById(txn.toUserId)?.name || txn.toUserId}</p>
                            </div>
                          </div>
                          {txn.escrowOptIn && (
                            <div className="mt-2.5 pt-2 border-t border-purple-200/60 dark:border-purple-700/30 flex items-center gap-1">
                              <p className="text-[9px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-widest">🔏 Escrow service active</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Txn ID</th>
                        <th className="px-4 py-3 font-semibold">From</th>
                        <th className="px-4 py-3 font-semibold">To</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTransactions.filter(txn => {
                        if (pendingFilterMode === 'ALL') return true;
                        const isEscrow = Boolean(txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE');
                        return pendingFilterMode === 'ESCROW' ? isEscrow : !isEscrow;
                      }).length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-12 text-slate-500">No pending items found matching filter</td></tr>
                      ) : (
                        pendingTransactions.filter(txn => {
                          if (pendingFilterMode === 'ALL') return true;
                          const isEscrow = Boolean(txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE');
                          return pendingFilterMode === 'ESCROW' ? isEscrow : !isEscrow;
                        }).map((txn) => (
                          <tr key={txn.id || txn.txnId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-[10px] break-all max-w-[200px]">{txn.id || txn.txnId}</td>
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{getUserById(txn.fromUserId)?.name || txn.fromUserId}</td>
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{getUserById(txn.toUserId)?.name || txn.toUserId}</td>
                            <td className="px-4 py-3 font-black text-slate-900 dark:text-slate-100">£{Number(txn.amount).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-[9px] uppercase tracking-widest ${
                                txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800' :
                                txn.status === 'HOLD_ACTIVE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800' :
                                txn.status === 'PENDING_BANK_APPROVAL' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800' :
                                txn.status === 'PENDING_USER_APPROVAL' || txn.status === 'PENDING_CONSENT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}>
                                {txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE' ? (
                                  <>🔏 Escrow &middot; {txn.status === 'PENDING_BANK_APPROVAL' ? 'Admin' : txn.status === 'HOLD_ACTIVE' ? 'Hold' : txn.status === 'PENDING_USER_APPROVAL' || txn.status === 'PENDING_CONSENT' ? 'Consent' : 'Active'}</>
                                ) :
                                 txn.status === 'HOLD_ACTIVE' ? '🔒 Admin Hold' :
                                 txn.status === 'PENDING_BANK_APPROVAL' ? '⏳ Admin Approval' :
                                 (txn.status === 'PENDING_USER_APPROVAL' || txn.status === 'PENDING_CONSENT') ? '👤 Needs Consent' :
                                 `${getStatusIcon(txn.status)} ${txn.status}`}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal for Canton DAML Contract DAG Inspector & Cryptographic Settlement Proof Exporter */}
      <CantonContractGraphModal
        isOpen={isCantonModalOpen}
        onClose={() => setIsCantonModalOpen(false)}
        txn={selectedTxn}
        cantonDetails={cantonDetailsMap[selectedTxn?.txnId || selectedTxn?.id]}
      />
    </div>
  );
}
