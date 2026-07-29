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
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>⚠️</span> Suspicious Transactions & Security Audit Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time Canton ledger tamper alerts, consensus failure queues, and high-risk compliance flags.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetAllTamper}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            🛡️ Auto-Repair All Tamper Flags
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-4 py-2 rounded-xl shadow-lg hover:shadow-cyan-500/25 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Action Notice Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
          actionNotice.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          <span>{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="font-bold opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* KPI Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Suspicious Queue */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Suspicious Items</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{suspiciousItems.length}</p>
          </div>
          <span className="text-2xl bg-amber-500/10 p-2.5 rounded-xl text-amber-500 border border-amber-500/20">🕵️</span>
        </div>

        {/* Tamper Attempt Flags */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamper Attempt Flags</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{tamperItems.length}</p>
          </div>
          <span className="text-2xl bg-rose-500/10 p-2.5 rounded-xl text-rose-500 border border-rose-500/20">🚨</span>
        </div>

        {/* Consensus Failures */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consensus Failures</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{consensusItems.length}</p>
          </div>
          <span className="text-2xl bg-amber-500/10 p-2.5 rounded-xl text-amber-500 border border-amber-500/20">⚖️</span>
        </div>

        {/* Active System Alerts */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unresolved System Alerts</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{alerts.length}</p>
          </div>
          <span className="text-2xl bg-indigo-500/10 p-2.5 rounded-xl text-indigo-500 border border-indigo-500/20">📢</span>
        </div>
      </div>

      {/* Filter Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: 'all', label: `All Suspicious Queue (${suspiciousItems.length})` },
          { id: 'tamper', label: `🚨 Tamper Flags (${tamperItems.length})` },
          { id: 'consensus', label: `⚖️ Consensus Flags (${consensusItems.length})` },
          { id: 'alerts', label: `📢 System Alerts (${alerts.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white dark:bg-cyan-600 dark:text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-56 flex items-center justify-center text-slate-500 text-sm">
          Loading suspicious audit queue...
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION A: Unresolved System Alerts (when 'all' or 'alerts' tab active) */}
          {(activeTab === 'all' || activeTab === 'alerts') && alerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>📢</span> Active System Alerts ({alerts.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.map((alert, idx) => (
                  <div 
                    key={alert.id || alert._id || idx}
                    className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 shadow-sm space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                          {alert.type || 'TAMPER_ALERT'}
                        </span>
                        <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold">
                          {alert.severity || 'HIGH'} SEVERITY
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                        {alert.message || 'No alert description available.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/50 flex items-center justify-between text-[10px] text-amber-800/80 dark:text-amber-400/80">
                      <span>Detected: {alert.detectedAt ? new Date(alert.detectedAt).toLocaleTimeString() : 'Recent'}</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-300">Unresolved</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION B: Suspicious Transaction Items Queue */}
          {activeTab !== 'alerts' && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>🕵️</span> Suspicious Transaction Queue ({filteredSuspicious.length})
              </h2>

              {filteredSuspicious.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
                  <p className="text-2xl">✨</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No suspicious items match the selected filter.</p>
                  <p className="text-xs text-slate-400">All Canton ledger state checks and consensus validations are clean.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSuspicious.map((item, idx) => {
                    const txnIds = item.txnIds || item.transactions || [];
                    const isTamper = item.reason === 'TAMPER_ATTEMPT_DETECTED' || item.reason?.includes('TAMPER');

                    return (
                      <div
                        key={item.id || item._id || idx}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-lg space-y-4 transition-all ${
                          isTamper 
                            ? 'border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-500/20' 
                            : 'border-amber-300 dark:border-amber-800/80'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{isTamper ? '🚨' : '⚖️'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {item.id || `susp-${idx}`}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  isTamper 
                                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                }`}>
                                  {item.reason || 'SUSPICIOUS_ACTIVITY'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Source Trigger: <strong>{item.sourceTrigger || 'LEDGER_INTEGRITY_CHECK'}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-start sm:self-auto">
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent'}
                            </span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {item.reviewStatus || 'ESCALATED'}
                            </span>
                          </div>
                        </div>

                        {/* Notes / Mismatch Description */}
                        {item.notes && (
                          <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-300">
                            <span className="font-bold block mb-0.5">Compliance Notes:</span>
                            <span>{item.notes}</span>
                          </div>
                        )}

                        {/* Enclosed Transaction IDs & Action Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Enclosed Transaction IDs</span>
                            {Array.isArray(txnIds) && txnIds.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {txnIds.map(tId => (
                                  <div key={tId} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{tId}</span>
                                    <button
                                      onClick={() => handleRepairTxn(tId)}
                                      className="text-[10px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-0.5 rounded cursor-pointer transition-colors"
                                      title="Inspect & Auto-Repair transaction"
                                    >
                                      Repair 🛠️
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">No enclosed transaction list.</span>
                            )}
                          </div>

                          <button
                            onClick={handleResetAllTamper}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer self-start sm:self-auto"
                          >
                            Auto-Repair Ledger ✅
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

