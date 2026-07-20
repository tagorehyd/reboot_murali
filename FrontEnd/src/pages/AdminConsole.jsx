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
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load admin queue on mount and when refreshKey changes
  useEffect(() => {
    loadQueue();
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
      const consentCount = transactions.filter((txn) => txn.status === 'PENDING_CONSENT').length;

      setStats({
        pendingCount,
        totalRiskScore,
        avgRiskScore,
        highRiskCount,
        consentCount,
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
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-black transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
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
        </p>
      </div>
    </div>
  );
}
