import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminApprovalCard from '../components/AdminApprovalCard';
import RiskBreakdownCard from '../components/RiskBreakdownCard';

const getAdminWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname || 'localhost';
  return `${protocol}://${host}:8080/ws?userId=ADMIN`;
};

const getUserColor = (userId) => {
  const mapping = {
    'U001': 'from-blue-500 to-indigo-600',
    'U002': 'from-emerald-500 to-teal-600',
    'U003': 'from-amber-500 to-orange-600',
    'U004': 'from-rose-500 to-pink-600',
    'U005': 'from-purple-500 to-violet-600',
    'U006': 'from-cyan-500 to-blue-600',
    'U007': 'from-fuchsia-500 to-rose-600',
  };
  return mapping[userId] || 'from-slate-500 to-slate-600';
};

const getUserDisplayName = (userId) => {
  const mapping = {
    'U001': 'Alice Walker',
    'U002': 'Bob Taylor',
    'U003': 'Carlos Rivera',
    'U004': 'Diana Prince',
    'U005': 'Eve Chen',
    'U006': 'Frank Okafor',
    'U007': 'Grace Okonkwo',
  };
  return mapping[userId] || userId || 'Customer';
};

export default function AdminConsole({ onBalanceUpdate, userBalances, showOnlyUsers = false }) {
  const [queueTransactions, setQueueTransactions] = useState([]);
  const [usersDashboardData, setUsersDashboardData] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [selectedTxnId, setSelectedTxnId] = useState(null);
  const [activeUsersViewMode, setActiveUsersViewMode] = useState('grid');
  const [stats, setStats] = useState({
    pendingCount: 0,
    totalRiskScore: 0,
    avgRiskScore: 0,
    highRiskCount: 0,
    consentCount: 0,
    holdActiveCount: 0,
    escrowCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [cantonEnabled, setCantonEnabled] = useState(false);
  const [cantonNetworkStatus, setCantonNetworkStatus] = useState('DISABLED');
  const [cantonToggling, setCantonToggling] = useState(false);
  const [cantonToggleAllowed, setCantonToggleAllowed] = useState(false);
  const [cantonRealSubmissionEnabled, setCantonRealSubmissionEnabled] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [filterMode, setFilterMode] = useState('ALL');
  const [toast, setToast] = useState(null);
  const [auditRiskFilter, setAuditRiskFilter] = useState('ALL'); // ALL | LOW | MEDIUM | HIGH
  const [auditTimeSort, setAuditTimeSort] = useState('NEWEST');   // NEWEST | OLDEST

  // Load admin queue on mount and when refreshKey changes
  useEffect(() => {
    loadQueue();
    loadCantonConfig();
    loadUsersDashboard();
  }, [refreshKey]);

  // Auto-select the first transaction by default when entering Account Audit or changing filters
  useEffect(() => {
    if (expandedUserId && usersDashboardData) {
      const activeUsers = usersDashboardData.filter(u => u && u.totalTransfers > 0);
      const expandedUser = activeUsers.find(u => u.id === expandedUserId);
      if (expandedUser && expandedUser.allTxns && expandedUser.allTxns.length > 0) {
        let processed = [...expandedUser.allTxns];
        if (auditRiskFilter === 'LOW') {
          processed = processed.filter(t => (t.riskScore || 0) < 40);
        } else if (auditRiskFilter === 'MEDIUM') {
          processed = processed.filter(t => (t.riskScore || 0) >= 40 && (t.riskScore || 0) < 70);
        } else if (auditRiskFilter === 'HIGH') {
          processed = processed.filter(t => (t.riskScore || 0) >= 70);
        }
        processed.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
          const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
          return auditTimeSort === 'OLDEST' ? timeA - timeB : timeB - timeA;
        });

        if (processed.length > 0) {
          const firstTxnId = processed[0].txnId || processed[0].id || processed[0]._id;
          if (!selectedTxnId || !processed.some(t => (t.txnId || t.id || t._id) === selectedTxnId)) {
            setSelectedTxnId(firstTxnId);
          }
        } else {
          setSelectedTxnId(null);
        }
      }
    }
  }, [expandedUserId, auditRiskFilter, auditTimeSort, usersDashboardData]);

  // Set up WebSocket for real-time updates
  useEffect(() => {
    let socket;
    let reconnectTimer;
    let stopped = false;

    const connect = () => {
      socket = new WebSocket(getAdminWebSocketUrl());
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'admin:queue' || data.type === 'txn_status_update') {
            // Trigger queue refresh when new transaction or status update
            loadQueue();
          }
        } catch (err) {
          console.error('Invalid websocket payload:', err);
        }
      };

      socket.onclose = () => {
        if (stopped) {
          return;
        }
        reconnectTimer = setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  const loadQueue = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/admin/queue');
      const transactions = response.data || [];
      setQueueTransactions(transactions);

      // Calculate stats
      const pendingCount = transactions.length;
      const totalRiskScore = transactions.reduce(
        (sum, txn) => sum + (txn.riskScore || 0),
        0
      );
      const avgRiskScore = pendingCount > 0 ? Math.round(totalRiskScore / pendingCount) : 0;
      const highRiskCount = transactions.filter((txn) => (txn.riskScore || 0) >= 70).length;
      const consentCount = transactions.filter((txn) => txn.status === 'PENDING_CONSENT' || txn.status === 'PENDING_USER_APPROVAL').length;
      const holdActiveCount = transactions.filter((txn) => txn.status === 'HOLD_ACTIVE' || txn.status === 'PENDING_BANK_APPROVAL').length;
      const escrowCount = transactions.filter((txn) => txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE').length;

      setStats({
        pendingCount,
        totalRiskScore,
        avgRiskScore,
        highRiskCount,
        consentCount,
        holdActiveCount,
        escrowCount,
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load admin queue. Please refresh the page.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const loadCantonConfig = async () => {
    try {
      const res = await axios.get('/api/canton/config');
      setCantonEnabled(!!res.data.enabled);
      setCantonNetworkStatus(res.data.networkStatus || 'DISABLED');
      setCantonToggleAllowed(!!res.data.toggleAllowed);
      setCantonRealSubmissionEnabled(!!res.data.realSubmissionEnabled);
    } catch (err) {
      console.error('Failed to load Canton config:', err);
    }
  };

  const loadUsersDashboard = async () => {
    setIsUsersLoading(true);
    try {
      const usersRes = await axios.get('/api/users/all');
      const users = usersRes.data || [];
      
      const enrichedUsers = await Promise.all(
        users.filter(u => u && u.id).map(async (user) => {
          try {
            const historyRes = await axios.get(`/api/txn/user/${user.id}/history`);
            const history = historyRes.data || [];
            
            const pendingRes = await axios.get(`/api/txn/user/${user.id}/pending`);
            const pending = pendingRes.data || [];
            
            const allTxns = [...pending, ...history];
            const totalTransfers = allTxns.length;
            const totalAmountTransferred = allTxns.reduce((sum, tx) => sum + (Number(tx?.amount) || 0), 0);
            
            return {
              ...user,
              totalTransfers,
              totalAmountTransferred,
              hasTransfers: totalTransfers > 0,
              allTxns,
              recentTx: history[0] || pending[0] || null,
            };
          } catch (e) {
            return {
              ...user,
              totalTransfers: 0,
              totalAmountTransferred: 0,
              hasTransfers: false,
              allTxns: [],
              recentTx: null,
            };
          }
        })
      );
      
      setUsersDashboardData(enrichedUsers.filter(Boolean));
    } catch (err) {
      console.error('Failed to load user dashboard data:', err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const toggleCanton = async () => {
    if (!cantonToggleAllowed) {
      return;
    }
    setCantonToggling(true);
    try {
      const res = await axios.post('/api/canton/config', { enabled: !cantonEnabled });
      setCantonEnabled(!!res.data.enabled);
      setCantonNetworkStatus(res.data.networkStatus || 'DISABLED');
      setCantonToggleAllowed(!!res.data.toggleAllowed);
      setCantonRealSubmissionEnabled(!!res.data.realSubmissionEnabled);
    } catch (err) {
      console.error('Failed to toggle Canton:', err);
    } finally {
      setCantonToggling(false);
    }
  };

  const prioritizedTransactions = [...queueTransactions].sort(
    (a, b) => (b.riskScore || 0) - (a.riskScore || 0)
  );

  const filteredTransactions = prioritizedTransactions.filter((txn) => {
    if (filterMode === 'ALL') return true;
    const isEscrow = Boolean(txn.escrowOptIn || txn.escrowContractRef || txn.status === 'ESCROW_ACTIVE');
    if (filterMode === 'ESCROW') return isEscrow;
    if (filterMode === 'STANDARD') return !isEscrow;
    return true;
  });

  if (isLoading && queueTransactions.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl ring-1 ring-slate-200 p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-600 dark:text-slate-400 text-lg">⏳ Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (showOnlyUsers) {
    const activeUsers = usersDashboardData.filter(u => u && u.totalTransfers > 0);
    const expandedUser = activeUsers.find(u => u.id === expandedUserId);

    return (
      <div className={`w-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-xl ring-1 ring-slate-200 px-6 py-4 ${
        expandedUserId && expandedUser ? 'h-[calc(100vh-8rem)]' : 'min-h-full'
      }`}>
        {/* Further Screen: Transaction Investigator for Expanded User */}
        {expandedUserId && expandedUser ? (
          <div className="animate-fadeIn flex-1 flex flex-col min-h-0">
            {/* Header with Back Button */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setExpandedUserId(null);
                    setSelectedTxnId(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700 cursor-pointer"
                >
                  <span>←</span> Back to Directory
                </button>
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700"></div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="text-xl">👤</span> Account Audit: <span className="text-[#00A865]">{getUserDisplayName(expandedUser.id)}</span>
                  </h1>
                  <p className="text-[11px] font-bold text-slate-500 font-mono tracking-tight mt-0.5">
                    User Profile ID: {expandedUser.id} | Bank Association: {expandedUser.bank}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={isUsersLoading}
                className="px-4 py-2 bg-slate-850 text-white font-bold rounded-lg hover:bg-black transition-colors disabled:bg-slate-400 cursor-pointer"
              >
                {isUsersLoading ? 'Refreshing...' : 'Refresh Activity'}
              </button>
            </div>

            {isUsersLoading ? (
              <div className="flex justify-center py-12 my-auto">
                <span className="text-sm font-bold text-slate-500 animate-pulse">⏳ Re-syncing ledger data...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Outgoing Transaction Cards list */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 flex flex-col min-h-0">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-[#00A865] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Outgoing Ledger History
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Completed and pending payment transactions.
                      </p>
                    </div>
                    <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                      {expandedUser.allTxns?.length || 0} Transfers
                    </span>
                  </div>

                  {/* Filter & Sorting Bar */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1.5">Risk:</span>
                      {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setAuditRiskFilter(level)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            auditRiskFilter === level
                              ? level === 'HIGH' ? 'bg-red-500 text-white shadow-xs'
                                : level === 'MEDIUM' ? 'bg-amber-500 text-white shadow-xs'
                                : level === 'LOW' ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1.5">Sort:</span>
                      {['NEWEST', 'OLDEST'].map((sort) => (
                        <button
                          key={sort}
                          onClick={() => setAuditTimeSort(sort)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            auditTimeSort === sort
                              ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {sort === 'NEWEST' ? '⏱️ Newest' : '⏳ Oldest'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 overflow-y-auto pr-2 flex-1 min-h-0">
                    {(() => {
                      let processed = [...(expandedUser.allTxns || [])];

                      // Risk Filter
                      if (auditRiskFilter === 'LOW') {
                        processed = processed.filter(t => (t.riskScore || 0) < 40);
                      } else if (auditRiskFilter === 'MEDIUM') {
                        processed = processed.filter(t => (t.riskScore || 0) >= 40 && (t.riskScore || 0) < 70);
                      } else if (auditRiskFilter === 'HIGH') {
                        processed = processed.filter(t => (t.riskScore || 0) >= 70);
                      }

                      // Time Sorting
                      processed.sort((a, b) => {
                        const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
                        const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
                        return auditTimeSort === 'OLDEST' ? timeA - timeB : timeB - timeA;
                      });

                      if (processed.length === 0) {
                        return (
                          <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-800 p-8 text-center my-auto">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No transactions matching filter.</p>
                          </div>
                        );
                      }

                      return processed.map((txn) => {
                        const txId = txn.txnId || txn.id || txn._id;
                        const isSelected = selectedTxnId === txId;
                        const score = txn.riskScore || 0;
                        const scoreColor = score >= 70 ? 'text-red-600 bg-red-50 dark:bg-red-950/20' : score >= 40 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';

                        return (
                          <div
                            key={txId}
                            onClick={() => setSelectedTxnId(isSelected ? null : txId)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/10 shadow-md ring-1 ring-emerald-400/30'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">£{Number(txn.amount || 0).toLocaleString()}</p>
                                <p className="text-[9px] text-slate-500 font-mono mt-0.5 tracking-tight">ID: {txId.substring(0, 18)}...</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${scoreColor}`}>
                                  {score} Risk
                                </span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                  txn.status === 'COMMITTED' || txn.status === 'SETTLED'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                    : txn.status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                                    : 'bg-amber-100 text-amber-800 animate-pulse'
                                }`}>
                                  {txn.status || 'PENDING'}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                              <span>Recipient: {txn.receiverName || txn.toUserDisplayName || txn.toUserId || 'Merchant'}</span>
                              <span>{txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : '—'}</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Premium Side Details Drawer: Receipt + Risk Breakdown Card */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-5 flex flex-col min-h-0 overflow-hidden">
                  <div className="mb-4">
                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      🔎 Settlement Investigator
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Audit ledger logs and Cortex AI metrics.
                    </p>
                  </div>

                  {selectedTxnId ? (
                    (() => {
                      const selectedTxn = expandedUser.allTxns.find(t => (t.txnId || t.id || t._id) === selectedTxnId);
                      if (!selectedTxn) return <p className="text-xs text-slate-500 text-center py-8 font-bold">Select a payment record to inspect.</p>;

                      return (
                        <div className="space-y-4 animate-fadeIn overflow-y-auto pr-1 flex-1 min-h-0">
                          {/* Canton Hold Notice */}
                          {(selectedTxn.status === 'HOLD_ACTIVE' || selectedTxn.status === 'PENDING_BANK_APPROVAL') && (
                            <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-xl mt-0.5">🔒</span>
                                <div>
                                  <p className="text-sm font-bold text-red-900 dark:text-red-400">Canton Hold Active</p>
                                  <p className="text-[10px] font-semibold text-red-700 dark:text-red-300 mt-0.5 leading-relaxed">
                                    A HoldRequest contract has been created on the Canton ledger. The hold expires in 60 minutes.
                                    A bank approver must approve before expiry, or the transaction will be automatically rejected.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Canton User Approval Notice */}
                          {selectedTxn.status === 'PENDING_USER_APPROVAL' && (
                            <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="text-xl mt-0.5">👤</span>
                                <div>
                                  <p className="text-sm font-bold text-blue-900 dark:text-blue-400">Canton User Approval Required</p>
                                  <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 mt-0.5 leading-relaxed">
                                    A user-approval contract has been created on Canton. You have 15 minutes to approve.
                                    The transaction will automatically expire if no action is taken.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Recreated Left Column: Receipt Settlement Card */}
                          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-white dark:bg-slate-900 shadow-xs">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs mb-3">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center font-bold text-[10px]">✓</span>
                              <span>Consolidated Ledger Receipt</span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                                <span className="text-slate-500 font-medium">Amount Transferred:</span>
                                <span className="font-extrabold text-slate-900 dark:text-slate-100">£{Number(selectedTxn.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                                <span className="text-slate-500 font-medium">Sender:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{getUserDisplayName(expandedUser.id)}</span>
                              </div>
                              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                                <span className="text-slate-500 font-medium">Recipient:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTxn.receiverName || selectedTxn.toUserDisplayName || selectedTxn.toUserId || 'Merchant'}</span>
                              </div>
                              <div className="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-1.5">
                                <span className="text-slate-500 font-medium">Transaction ID:</span>
                                <span className="font-mono text-[9px] text-slate-500 break-all">{selectedTxnId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Canton Contract Status:</span>
                                <span className="font-black uppercase text-indigo-700 dark:text-indigo-400">{selectedTxn.status || 'COMMITTED'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Recreated Right Column: Risk Factors Progress & Metrics */}
                          <RiskBreakdownCard
                            riskScore={selectedTxn.riskScore || 0}
                            riskBreakdown={selectedTxn.riskBreakdown || []}
                            beneficiaryTrustTier={selectedTxn.beneficiaryTrustTier}
                            beneficiaryTrustDiscount={selectedTxn.beneficiaryTrustDiscount}
                          />
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 my-auto shadow-xs">
                      <span className="text-3xl mb-2">🔎</span>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Transaction Investigator</p>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Click any payment card on the left to pull live settlement receipt details and Cortex AI risk scores.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Main Directory Screen: Active Senders Grid or Table Mode */
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>👤</span> Active Users List
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">
                  Real-time directory of customers who have initiated outbound transaction volumes.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Grid (Cards) vs Table Toggle */}
                <div className="flex items-center bg-slate-200/60 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold shadow-xs">
                  <button
                    onClick={() => setActiveUsersViewMode('grid')}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      activeUsersViewMode === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    🔲 Card View
                  </button>
                  <button
                    onClick={() => setActiveUsersViewMode('table')}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      activeUsersViewMode === 'table'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    📋 Table View
                  </button>
                </div>

                <button
                  onClick={handleRefresh}
                  disabled={isUsersLoading}
                  className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-black transition-colors disabled:bg-slate-400 cursor-pointer"
                >
                  {isUsersLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {isUsersLoading ? (
              <div className="flex justify-center py-12 my-auto">
                <span className="text-sm font-bold text-slate-500 animate-pulse">⏳ Syncing user ledger activity...</span>
              </div>
            ) : activeUsers.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-10 text-center my-auto">
                <p className="text-slate-600 dark:text-slate-400 text-lg font-bold">No active outgoing transactions found.</p>
                <p className="text-slate-500 mt-2 text-xs">Initiate a payment in the customer portal to populate this active ledger directory.</p>
              </div>
            ) : activeUsersViewMode === 'grid' ? (
              /* CARD / GRID VIEW DIRECTORY */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {activeUsers.map((user) => {
                  const userGrad = getUserColor(user.id);
                  return (
                    <div
                      key={user.id}
                      className={`p-[2px] rounded-2xl bg-gradient-to-br ${userGrad} shadow-lg dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col justify-between transform hover:-translate-y-1 hover:shadow-xl transition-all duration-200`}
                    >
                      <div className="bg-white dark:bg-slate-900 rounded-[14px] p-5 flex flex-col justify-between h-full">
                        <div>
                          {/* Card Header */}
                          <div className="flex items-center gap-4 mb-5">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${userGrad} flex items-center justify-center text-white font-black text-lg shadow-sm`}>
                              {getUserDisplayName(user.id).charAt(0)}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase">{user.id}</p>
                              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">{getUserDisplayName(user.id)}</p>
                            </div>
                          </div>

                          {/* Institution field */}
                          <div className="mb-4">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider mb-0.5">Banking Institution</p>
                            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{user.bank}</p>
                          </div>

                          {/* Transferred Volume Metric Row */}
                          <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/60 pt-3 mb-4">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Total Outgoing Volume</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                              £{Number(user.totalAmountTransferred).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>

                          {/* Sub-metrics */}
                          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4 font-semibold">
                            <span>Outgoing Transfers</span>
                            <span className="font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              {user.totalTransfers}
                            </span>
                          </div>
                        </div>

                        {/* Proceed Action Button */}
                        <button
                          onClick={() => {
                            setExpandedUserId(user.id);
                            setSelectedTxnId(null);
                          }}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-lg text-xs tracking-wide transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Proceed to Investigator</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW DIRECTORY */
              <div className="overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Customer</th>
                      <th className="px-5 py-3.5">Institution</th>
                      <th className="px-5 py-3.5 text-right">Transfers</th>
                      <th className="px-5 py-3.5 text-right">Total Transferred</th>
                      <th className="px-5 py-3.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {activeUsers.map((user) => {
                      const userGrad = getUserColor(user.id);
                      return (
                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${userGrad} text-white flex items-center justify-center font-black text-xs shadow-xs`}>
                                {getUserDisplayName(user.id).charAt(0)}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{getUserDisplayName(user.id)}</p>
                                <p className="text-[9px] font-bold text-slate-500 font-mono tracking-tight">{user.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">
                            {user.bank}
                          </td>
                          <td className="px-5 py-4 text-right font-black text-slate-900 dark:text-slate-100 text-sm">
                            {user.totalTransfers}
                          </td>
                          <td className="px-5 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            £{Number(user.totalAmountTransferred).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => {
                                setExpandedUserId(user.id);
                                setSelectedTxnId(null);
                              }}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wide transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <span>Proceed</span>
                              <span>→</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-xl ring-1 ring-slate-200 px-6 py-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Review, decide, and clear high-risk transactions first.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Canton Integration Toggle */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${cantonEnabled
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}>
              <div className="text-right leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">Canton</p>
                <p className={`text-xs font-black ${cantonEnabled ? 'text-emerald-700' : 'text-slate-500 dark:text-slate-500'}`}>
                  {cantonEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <button
                onClick={toggleCanton}
                disabled={cantonToggling || !cantonToggleAllowed}
                title={!cantonToggleAllowed
                  ? 'Canton switch becomes available when the Canton server is reachable'
                  : cantonEnabled
                    ? 'Disable Canton – commands will be skipped'
                    : 'Enable Canton – commands will be submitted to the Canton network (or simulated if network is down)'}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cantonEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-900 shadow transition-transform ${cantonEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cantonNetworkStatus === 'UP'
                  ? 'bg-emerald-100 text-emerald-700'
                  : cantonNetworkStatus === 'DOWN'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-500 dark:text-slate-500'
                }`}>
                {cantonNetworkStatus}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cantonToggleAllowed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600 dark:text-slate-400'
                }`}>
                {cantonToggleAllowed ? 'READY' : 'WAITING'}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cantonRealSubmissionEnabled ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'
                }`}>
                {cantonRealSubmissionEnabled ? 'REAL' : 'SIMULATED'}
              </span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-black transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">Live Queue</span>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">High Risk Prioritized</span>
          {lastUpdated && (
            <span className="text-slate-500 dark:text-slate-500 font-medium">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
        <div className="bg-gradient-to-br from-sky-50 to-cyan-100 dark:from-sky-950/40 dark:to-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 rounded-xl p-3">
          <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Pending</p>
          <p className="text-2xl font-black text-cyan-700 dark:text-cyan-400 mt-0.5">{stats.pendingCount}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 border border-orange-200 dark:border-orange-800/50 rounded-xl p-3">
          <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Risk Score</p>
          <p className="text-2xl font-black text-orange-700 dark:text-orange-400 mt-0.5">{stats.totalRiskScore}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950/40 dark:to-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl p-3">
          <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">High Risk</p>
          <p className="text-2xl font-black text-red-700 dark:text-red-400 mt-0.5">{stats.highRiskCount}</p>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-3">
          <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Needs Consent</p>
          <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-0.5">{stats.consentCount}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950/40 dark:to-rose-950/40 border border-rose-300 dark:border-rose-800/50 rounded-xl p-3">
          <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Canton Holds</p>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-0.5">{stats.holdActiveCount}</p>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-950/40 dark:to-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded-xl p-3">
          <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Escrow Active</p>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-0.5">{stats.escrowCount}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      )}

      {/* Queue Display */}
      <div className="flex-1 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 md:p-6 overflow-hidden">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Pending Transactions {stats.pendingCount > 0 && `(${stats.pendingCount})`}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-slate-200/50 dark:bg-slate-800 p-1 rounded-lg shadow-inner text-xs font-bold">
                <button
                  onClick={() => setFilterMode('ALL')}
                  className={`px-3 py-1.5 rounded-md transition-all ${filterMode === 'ALL' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterMode('STANDARD')}
                  className={`px-3 py-1.5 rounded-md transition-all ${filterMode === 'STANDARD' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setFilterMode('ESCROW')}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${filterMode === 'ESCROW' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-700 dark:text-purple-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  <span className="text-[10px]">🔏</span> Escrow
                </button>
              </div>

              <div className="flex items-center bg-slate-200/50 dark:bg-slate-800 p-1 rounded-lg shadow-inner hidden sm:flex">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  title="Card View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  title="Table View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">
              High: {stats.highRiskCount}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
              Avg Risk: {stats.avgRiskScore}
            </span>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-indigo-700">
              Consent: {stats.consentCount}
            </span>
            {stats.holdActiveCount > 0 && (
              <span className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-rose-700">
                🔒 Holds: {stats.holdActiveCount}
              </span>
            )}
            {stats.escrowCount > 0 && (
              <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-purple-700">
                🔏 Escrow: {stats.escrowCount}
              </span>
            )}
          </div>
        </div>

        {queueTransactions.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-10 text-center">
            <p className="text-emerald-700 text-lg font-bold">Queue clear. No pending approvals.</p>
            <p className="text-emerald-600 mt-2">All flagged transactions are currently resolved.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="flex-1 overflow-y-auto pr-2 min-w-0 w-full">
            <div className="grid w-full grid-cols-3 gap-4 items-stretch content-start min-w-0">
              {prioritizedTransactions.filter((txn) => {
                if (filterMode === 'ALL') return true;
                const isEscrow = Boolean(txn.escrowOptIn || txn.escrowContractRef || txn.status === 'ESCROW_ACTIVE');
                return filterMode === 'ESCROW' ? isEscrow : !isEscrow;
              }).map((txn) => {
                const txId = txn.txnId || txn.id || txn._id;
                return (
                  <AdminApprovalCard
                    key={txId}
                    txnId={txId}
                    transaction={txn}
                    compact
                    onApprove={() => {
                      setToast({ type: 'approve', txId });
                      setTimeout(() => setToast(null), 3500);
                      handleRefresh();
                    }}
                    onReject={() => {
                      setToast({ type: 'reject', txId });
                      setTimeout(() => setToast(null), 3500);
                      handleRefresh();
                    }}
                    onRefresh={handleRefresh}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-4">Transaction ID</th>
                    <th className="px-5 py-4">Risk & Routing</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {prioritizedTransactions.filter((txn) => {
                    if (filterMode === 'ALL') return true;
                    const isEscrow = Boolean(txn.escrowOptIn || txn.escrowContractRef || txn.status === 'ESCROW_ACTIVE');
                    return filterMode === 'ESCROW' ? isEscrow : !isEscrow;
                  }).map((txn) => {
                    const txId = txn.txnId || txn.id || txn._id;
                    const isEscrow = Boolean(txn.escrowOptIn || txn.escrowContractRef || txn.status === 'ESCROW_ACTIVE');
                    return (
                      <tr key={txId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-5 py-4 align-top">
                          <p className="font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100 break-all">{txId}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{new Date(txn.createdAt).toLocaleString()}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className="px-2 py-0.5 rounded border text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50">
                              SCORE: {txn.riskScore || 0}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">{txn.routingDecision || 'ADMIN_REVIEW'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100">£{Number(txn.amount || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            {txn.fromUserDisplayName || txn.fromUserId} ({txn.fromUserId}) → {txn.toUserDisplayName || txn.toUserId} ({txn.toUserId})
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold">
                                {txn.status || 'PENDING_ADMIN'}
                              </span>
                              {isEscrow && (
                                <span className="px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold flex items-center gap-1">
                                  <span className="text-[10px]">🔏</span> Escrow
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                onClick={async () => {
                                  try {
                                    await axios.post(`/api/admin/txn/${txId}/decide`, { approved: true });
                                    setToast({ type: 'approve', txId });
                                    setTimeout(() => setToast(null), 3500);
                                    handleRefresh();
                                  } catch (e) { console.error(e); }
                                }}
                                className="px-3 py-1.5 text-[10px] bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await axios.post(`/api/admin/txn/${txId}/decide`, { approved: false });
                                    setToast({ type: 'reject', txId });
                                    setTimeout(() => setToast(null), 3500);
                                    handleRefresh();
                                  } catch (e) { console.error(e); }
                                }}
                                className="px-3 py-1.5 text-[10px] bg-rose-600 text-white font-bold rounded hover:bg-rose-700 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl border flex items-start gap-3 transform transition-all duration-300 z-50 ${toast.type === 'approve'
            ? 'bg-emerald-800 text-white border-emerald-900 shadow-emerald-900/20'
            : 'bg-rose-800 text-white border-rose-900 shadow-rose-900/20'
          }`}>
          <span className="text-xl mt-0.5">{toast.type === 'approve' ? '✅' : '🚫'}</span>
          <div>
            <p className="font-bold">{toast.type === 'approve' ? 'Transaction Approved' : 'Transaction Rejected'}</p>
            <p className="text-sm opacity-90 mt-1">
              {toast.type === 'approve' ? 'Successfully approved' : 'Successfully rejected'} transaction <span className="font-mono text-[11px] bg-black/20 px-1 py-0.5 rounded">{toast.txId}</span>.
            </p>
          </div>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 ml-2 mt-1 transition-opacity" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-auto pt-4 pb-0">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Decision flow: prioritize highest risk scores first, then clear consent-required items.
            Canton-held transactions (🔒 HOLD_ACTIVE / PENDING_BANK_APPROVAL) must be approved before the 60-minute hold expiry.
            Escrow-backed transactions (🔏) are released automatically during admin approval when a Canton escrow contract exists.
          </p>
        </div>
      </div>
    </div>
  );
}
