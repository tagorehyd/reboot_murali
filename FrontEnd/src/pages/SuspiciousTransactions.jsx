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
    <div className="w-full bg-[#ECEEEF] text-[#111827] space-y-6 font-sans">
      {/* Top Header Bar */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#111827] font-heading flex items-center gap-2">
            <span>⚠️</span> Suspicious Transactions & Security Audit Center
          </h1>
          <p className="text-sm text-[#111827]/70 mt-0.5">
            Real-time Canton ledger tamper alerts, consensus failure queues, and high-risk compliance flags.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetAllTamper}
            className="px-4 py-2.5 bg-[#00A865] hover:bg-[#008f53] text-[#031D0E] font-black rounded-xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            🛡️ Auto-Repair All Tamper Flags
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-[#0B3820] hover:bg-[#082914] text-[#E2F7E8] font-bold px-4 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all text-xs cursor-pointer"
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
            ? 'bg-[#A3E3AB]/30 border-[#00A865] text-[#082914]'
            : 'bg-red-50 border-red-300 text-red-900'
        }`}>
          <span>{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="font-bold opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* KPI Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Suspicious Queue */}
        <div className="bg-[#0B3820] text-[#E2F7E8] border border-[#072914] p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-extrabold text-[#A3E3AB] uppercase tracking-wider">Total Suspicious Items</p>
            <p className="text-2xl font-black text-white mt-0.5">{suspiciousItems.length}</p>
          </div>
          <span className="text-2xl bg-[#082914] p-2.5 rounded-xl border border-[#072914]">🕵️</span>
        </div>

        {/* Tamper Attempt Flags */}
        <div className="bg-[#0B3820] text-[#E2F7E8] border border-[#072914] p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-extrabold text-[#A3E3AB] uppercase tracking-wider">Tamper Attempt Flags</p>
            <p className="text-2xl font-black text-[#A3E3AB] mt-0.5">{tamperItems.length}</p>
          </div>
          <span className="text-2xl bg-[#082914] p-2.5 rounded-xl border border-[#072914]">🚨</span>
        </div>

        {/* Consensus Failures */}
        <div className="bg-[#0B3820] text-[#E2F7E8] border border-[#072914] p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-extrabold text-[#A3E3AB] uppercase tracking-wider">Consensus Failures</p>
            <p className="text-2xl font-black text-[#E2F7E8] mt-0.5">{consensusItems.length}</p>
          </div>
          <span className="text-2xl bg-[#082914] p-2.5 rounded-xl border border-[#072914]">⚖️</span>
        </div>

        {/* Active System Alerts */}
        <div className="bg-[#00A865] text-[#031D0E] border border-[#00A865] p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider">Unresolved System Alerts</p>
            <p className="text-2xl font-black mt-0.5">{alerts.length}</p>
          </div>
          <span className="text-2xl bg-[#031D0E]/10 p-2.5 rounded-xl border border-[#031D0E]/20">📢</span>
        </div>
      </div>

      {/* Filter Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#CBD5E1] pb-3 overflow-x-auto">
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
                ? 'bg-[#0B3820] text-[#E2F7E8] shadow-sm'
                : 'bg-white text-[#111827] hover:bg-[#A3E3AB]/30 border border-[#CBD5E1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-56 flex items-center justify-center text-[#111827]/60 text-sm">
          Loading suspicious audit queue...
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION A: Unresolved System Alerts */}
          {(activeTab === 'all' || activeTab === 'alerts') && alerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-heading flex items-center gap-2">
                <span>📢</span> Active System Alerts ({alerts.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.map((alert, idx) => (
                  <div 
                    key={alert.id || alert._id || idx}
                    className="bg-[#0B3820] text-[#E2F7E8] border border-[#072914] rounded-2xl p-4 shadow-sm space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#A3E3AB] text-[#082914]">
                          {alert.type || 'TAMPER_ALERT'}
                        </span>
                        <span className="text-[10px] font-mono text-[#A3E3AB] font-bold">
                          {alert.severity || 'HIGH'} SEVERITY
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white leading-snug">
                        {alert.message || 'No alert description available.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#072914] flex items-center justify-between text-[10px] text-[#D1EAD0]">
                      <span>Detected: {alert.detectedAt ? new Date(alert.detectedAt).toLocaleTimeString() : 'Recent'}</span>
                      <span className="font-semibold text-[#A3E3AB]">Unresolved</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION B: Suspicious Transaction Items Queue */}
          {activeTab !== 'alerts' && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-heading flex items-center gap-2">
                <span>🕵️</span> Suspicious Transaction Queue ({filteredSuspicious.length})
              </h2>

              {filteredSuspicious.length === 0 ? (
                <div className="bg-white border border-[#CBD5E1] rounded-2xl p-8 text-center space-y-2">
                  <p className="text-2xl">✨</p>
                  <p className="text-sm font-bold text-[#111827]">No suspicious items match the selected filter.</p>
                  <p className="text-xs text-[#111827]/60">All Canton ledger state checks and consensus validations are clean.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSuspicious.map((item, idx) => {
                    const txnIds = item.txnIds || item.transactions || [];
                    const isTamper = item.reason === 'TAMPER_ATTEMPT_DETECTED' || item.reason?.includes('TAMPER');

                    return (
                      <div
                        key={item.id || item._id || idx}
                        className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-sm space-y-4 transition-all"
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#ECEEEF] p-3 rounded-xl border border-[#CBD5E1]">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{isTamper ? '🚨' : '⚖️'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#111827]">
                                  {item.id || `susp-${idx}`}
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#A3E3AB] text-[#082914]">
                                  {item.reason || 'SUSPICIOUS_ACTIVITY'}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#111827]/70 mt-0.5">
                                Source Trigger: <strong>{item.sourceTrigger || 'LEDGER_INTEGRITY_CHECK'}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-start sm:self-auto">
                            <span className="text-[10px] font-mono text-[#111827]/60">
                              {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent'}
                            </span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0B3820] text-[#E2F7E8]">
                              {item.reviewStatus || 'ESCALATED'}
                            </span>
                          </div>
                        </div>

                        {/* Notes / Mismatch Description */}
                        {item.notes && (
                          <div className="bg-[#0B3820] text-[#E2F7E8] p-3 rounded-xl border border-[#072914] text-xs">
                            <span className="font-bold block mb-0.5 text-[#A3E3AB]">Compliance Notes:</span>
                            <span>{item.notes}</span>
                          </div>
                        )}

                        {/* Enclosed Transaction IDs & Action Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#CBD5E1]">
                          <div>
                            <span className="text-[10px] font-bold text-[#111827]/70 uppercase block mb-1.5">Enclosed Transaction IDs</span>
                            {Array.isArray(txnIds) && txnIds.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {txnIds.map(tId => (
                                  <div key={tId} className="flex items-center gap-2 bg-[#ECEEEF] px-2.5 py-1 rounded-lg border border-[#CBD5E1]">
                                    <span className="font-mono text-xs font-bold text-[#111827]">{tId}</span>
                                    <button
                                      onClick={() => handleRepairTxn(tId)}
                                      className="text-[10px] font-bold bg-[#00A865] hover:bg-[#008f53] text-[#031D0E] px-2 py-0.5 rounded cursor-pointer transition-colors"
                                      title="Inspect & Auto-Repair transaction"
                                    >
                                      Repair 🛠️
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-[#111827]/60">No enclosed transaction list.</span>
                            )}
                          </div>

                          <button
                            onClick={handleResetAllTamper}
                            className="px-3.5 py-1.5 bg-[#00A865] hover:bg-[#008f53] text-[#031D0E] font-bold rounded-xl text-xs transition-all cursor-pointer self-start sm:self-auto"
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
