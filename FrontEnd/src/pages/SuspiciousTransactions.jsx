import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function SuspiciousTransactions() {
  const [suspiciousItems, setSuspiciousItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'tamper' | 'consensus' | 'alerts'
  const [actionNotice, setActionNotice] = useState(null);

  const loadData = async () => {
    setError('');
    try {
      const [suspiciousRes, alertsRes] = await Promise.all([
        axios.get('/api/admin/suspicious'),
        axios.get('/api/admin/alerts?resolved=false'),
      ]);
      setSuspiciousItems(suspiciousRes.data || []);
      setAlerts(alertsRes.data || []);
    } catch (err) {
      setError('Failed to load suspicious transactions or alerts.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, []);

  // Quick Action to repair/resolve a tampered transaction directly
  const handleRepairTxn = async (txnId) => {
    setActionNotice(null);
    try {
      const res = await axios.post(`/api/chain/verify/${txnId}`);
      setActionNotice({
        type: 'success',
        message: `✅ Transaction ${txnId} verified & auto-repaired back to DAML contract state (£${res.data.verifiedAmount || res.data.originalAmount})!`,
      });
      loadData();
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: `Failed to repair transaction ${txnId}.`,
      });
    }
  };

  // Quick Action to auto-repair all tampered data
  const handleResetAllTamper = async () => {
    setActionNotice(null);
    try {
      const res = await axios.post('/api/chain/reset-tamper');
      setActionNotice({
        type: 'success',
        message: res.data.message || '✅ All tampered transaction records reset to signed DAML state!',
      });
      loadData();
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: 'Failed to reset tampered transactions.',
      });
    }
  };

  // Filtered items
  const tamperItems = suspiciousItems.filter(s => s.reason === 'TAMPER_ATTEMPT_DETECTED' || s.reason?.includes('TAMPER'));
  const consensusItems = suspiciousItems.filter(s => s.reason === 'CONSENSUS_FAILURE' || s.reason?.includes('CONSENSUS'));

  const filteredSuspicious = suspiciousItems.filter(item => {
    if (activeTab === 'tamper') return item.reason === 'TAMPER_ATTEMPT_DETECTED' || item.reason?.includes('TAMPER');
    if (activeTab === 'consensus') return item.reason === 'CONSENSUS_FAILURE' || item.reason?.includes('CONSENSUS');
    return true;
  });

  return (
    <div className="w-full bg-[#ECEEEF] dark:bg-slate-950 text-[#111827] dark:text-slate-100 space-y-6 font-sans select-none transition-colors duration-200">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#111827] dark:text-slate-100 font-heading flex items-center gap-2">
            <span>⚠️</span> Suspicious Transactions & Security Audit Center
          </h1>
          <p className="text-sm text-[#111827]/70 dark:text-slate-400 mt-0.5">
            Real-time Canton ledger tamper alerts, consensus failure queues, and high-risk compliance flags.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetAllTamper}
            className="px-4 py-2.5 bg-[#00A865] dark:bg-emerald-600 hover:bg-[#008f53] dark:hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            🛡️ Auto-Repair All Tamper Flags
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-xl text-sm font-bold border ${
          actionNotice.type === 'success' 
            ? 'bg-[#A3E3AB]/40 dark:bg-emerald-950/60 border-[#00A865] dark:border-emerald-800 text-[#031D0E] dark:text-emerald-300' 
            : 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          {actionNotice.message}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* Metric Cards Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-[#111827]/70 dark:text-slate-400">Total Tamper Attempts</span>
            <span className="text-lg">🛡️</span>
          </div>
          <p className="text-3xl font-black text-[#111827] dark:text-slate-100 mt-2 font-mono">{tamperItems.length}</p>
          <p className="text-xs text-[#111827]/60 dark:text-slate-500 mt-1">Database vs DAML Hash Mismatches</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-[#111827]/70 dark:text-slate-400">Consensus Mismatches</span>
            <span className="text-lg">⚙️</span>
          </div>
          <p className="text-3xl font-black text-[#111827] dark:text-slate-100 mt-2 font-mono">{consensusItems.length}</p>
          <p className="text-xs text-[#111827]/60 dark:text-slate-500 mt-1">Multi-Bank Ledger Divergences</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-[#111827]/70 dark:text-slate-400">Active Security Alerts</span>
            <span className="text-lg">🔔</span>
          </div>
          <p className="text-3xl font-black text-[#111827] dark:text-slate-100 mt-2 font-mono">{alerts.length}</p>
          <p className="text-xs text-[#111827]/60 dark:text-slate-500 mt-1">Unresolved Compliance Alerts</p>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-[#CBD5E1] dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#00A865] dark:bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-300 border border-[#CBD5E1] dark:border-slate-800 hover:bg-[#ECEEEF] dark:hover:bg-slate-800'
          }`}
        >
          All Items ({suspiciousItems.length + alerts.length})
        </button>

        <button
          onClick={() => setActiveTab('tamper')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'tamper'
              ? 'bg-[#00A865] dark:bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-300 border border-[#CBD5E1] dark:border-slate-800 hover:bg-[#ECEEEF] dark:hover:bg-slate-800'
          }`}
        >
          Tamper Attempts ({tamperItems.length})
        </button>

        <button
          onClick={() => setActiveTab('consensus')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'consensus'
              ? 'bg-[#00A865] dark:bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-300 border border-[#CBD5E1] dark:border-slate-800 hover:bg-[#ECEEEF] dark:hover:bg-slate-800'
          }`}
        >
          Consensus Failures ({consensusItems.length})
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'alerts'
              ? 'bg-[#00A865] dark:bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-300 border border-[#CBD5E1] dark:border-slate-800 hover:bg-[#ECEEEF] dark:hover:bg-slate-800'
          }`}
        >
          Security Alerts ({alerts.length})
        </button>
      </div>

      {/* Main List */}
      <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm font-bold text-[#111827]/60 dark:text-slate-400">
            ⏳ Loading live security audit logs...
          </div>
        ) : activeTab === 'alerts' ? (
          /* Render Alerts List */
          alerts.length === 0 ? (
            <div className="p-12 text-center text-sm font-bold text-[#111827]/60 dark:text-slate-400">
              ✅ No unresolved security alerts.
            </div>
          ) : (
            <div className="divide-y divide-[#CBD5E1] dark:divide-slate-800">
              {alerts.map((a) => (
                <div key={a.id || a.alertId} className="p-5 hover:bg-[#ECEEEF]/50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold rounded border border-amber-300 dark:border-amber-800 uppercase">
                        {a.type || 'SECURITY_ALERT'}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#111827]/70 dark:text-slate-400">{a.id}</span>
                    </div>
                    <p className="text-sm font-black text-[#111827] dark:text-slate-100">{a.message || a.details}</p>
                    <p className="text-xs text-[#111827]/60 dark:text-slate-400 font-mono">{a.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Render Suspicious Items List */
          filteredSuspicious.length === 0 ? (
            <div className="p-12 text-center text-sm font-bold text-[#111827]/60 dark:text-slate-400">
              ✅ No suspicious transactions detected in the Canton audit trail.
            </div>
          ) : (
            <div className="divide-y divide-[#CBD5E1] dark:divide-slate-800">
              {filteredSuspicious.map((item, idx) => {
                const isTamper = item.reason === 'TAMPER_ATTEMPT_DETECTED' || item.reason?.includes('TAMPER');
                return (
                  <div key={item.txnId || idx} className="p-5 hover:bg-[#ECEEEF]/50 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold border ${
                          isTamper 
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800' 
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        }`}>
                          {item.reason}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#111827]/70 dark:text-slate-400">{item.txnId}</span>
                      </div>

                      <div className="flex items-center gap-6 text-sm font-bold text-[#111827] dark:text-slate-200">
                        <span>From: <strong className="font-mono text-[#00A865] dark:text-emerald-400">{item.fromUserId}</strong></span>
                        <span>To: <strong className="font-mono text-[#00A865] dark:text-emerald-400">{item.toUserId}</strong></span>
                        <span className="font-mono text-base font-black">£{Number(item.amount || 0).toLocaleString()}</span>
                      </div>

                      {item.details && (
                        <p className="text-xs text-[#111827]/70 dark:text-slate-400 font-mono bg-[#ECEEEF] dark:bg-slate-800 p-2 rounded-lg border border-[#CBD5E1] dark:border-slate-700">
                          {item.details}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRepairTxn(item.txnId)}
                        className="px-3.5 py-1.5 bg-[#00A865] dark:bg-emerald-600 hover:bg-[#008f53] dark:hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        🛠️ Auto-Repair & Sync
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
