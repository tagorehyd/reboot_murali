import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminApprovalCard from '../components/AdminApprovalCard';

const getAdminWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname || 'localhost';
  return `${protocol}://${host}:8080/ws?userId=ADMIN`;
};

export default function AdminConsole() {
  const [queueTransactions, setQueueTransactions] = useState([]);
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

  // Load admin queue on mount and when refreshKey changes
  useEffect(() => {
    loadQueue();
    loadCantonConfig();
  }, [refreshKey]);

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

  if (isLoading && queueTransactions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-600 text-lg">⏳ Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 p-8 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600 mt-1">Review, decide, and clear high-risk transactions first.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Canton Integration Toggle */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              cantonEnabled
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-right leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Canton</p>
                <p className={`text-xs font-black ${cantonEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  cantonEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  cantonEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                cantonNetworkStatus === 'UP'
                  ? 'bg-emerald-100 text-emerald-700'
                  : cantonNetworkStatus === 'DOWN'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-500'
              }`}>
                {cantonNetworkStatus}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                cantonToggleAllowed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {cantonToggleAllowed ? 'READY' : 'WAITING'}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                cantonRealSubmissionEnabled ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'
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
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">Live Queue</span>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">High Risk Prioritized</span>
          {lastUpdated && (
            <span className="text-slate-500 font-medium">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
        <div className="bg-gradient-to-br from-sky-50 to-cyan-100 border border-cyan-200 rounded-xl p-5">
          <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Pending Approvals</p>
          <p className="text-4xl font-black text-cyan-700 mt-2">{stats.pendingCount}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 border border-orange-200 rounded-xl p-5">
          <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Total Risk Score</p>
          <p className="text-4xl font-black text-orange-700 mt-2">{stats.totalRiskScore}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-red-100 border border-red-200 rounded-xl p-5">
          <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">High Risk (70+)</p>
          <p className="text-4xl font-black text-red-700 mt-2">{stats.highRiskCount}</p>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-indigo-100 border border-indigo-200 rounded-xl p-5">
          <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Needs Consent</p>
          <p className="text-4xl font-black text-indigo-700 mt-2">{stats.consentCount}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-100 border border-rose-300 rounded-xl p-5">
          <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">🔒 Canton Holds</p>
          <p className="text-4xl font-black text-rose-700 mt-2">{stats.holdActiveCount}</p>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-purple-100 border border-purple-200 rounded-xl p-5">
          <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">🔏 Escrow Active</p>
          <p className="text-4xl font-black text-purple-700 mt-2">{stats.escrowCount}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      )}

      {/* Queue Display */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Pending Transactions {stats.pendingCount > 0 && `(${stats.pendingCount})`}
          </h2>
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {prioritizedTransactions.map((txn) => {
              const txId = txn.txnId || txn.id || txn._id;
              return (
                <AdminApprovalCard
                  key={txId}
                  txnId={txId}
                  transaction={txn}
                  compact
                  onApprove={() => {
                    console.log('Transaction approved:', txId);
                    handleRefresh();
                  }}
                  onReject={() => {
                    console.log('Transaction rejected:', txId);
                    handleRefresh();
                  }}
                  onRefresh={handleRefresh}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-xs text-slate-600">
          Decision flow: prioritize highest risk scores first, then clear consent-required items.
          Canton-held transactions (🔒 HOLD_ACTIVE / PENDING_BANK_APPROVAL) must be approved before the 60-minute hold expiry.
          Escrow-backed transactions (🔏) are released automatically during admin approval when a Canton escrow contract exists.
        </p>
      </div>
    </div>
  );
}
