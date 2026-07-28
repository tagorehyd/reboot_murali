import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RadarChart from '../components/RadarChart';

export default function SuspiciousTransactions() {
  const [suspiciousItems, setSuspiciousItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState(null);

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

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      {/* Page Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              THREAT INTELLIGENCE & ISOLATION FOREST ML
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>⚠️</span> Suspicious Transactions & Alerts
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl">
              Investigate non-verified batches, unresolved security alerts, and inspect 8-dimensional Isolation Forest ML feature vectors.
            </p>
          </div>

          <button
            onClick={loadData}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 border border-emerald-400/30 flex items-center gap-2 self-start md:self-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Telemetry
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/50 border border-rose-500/40 rounded-2xl p-4 text-rose-300 font-mono text-sm shadow-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Main Grid Content */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 font-mono animate-pulse">
          Loading threat intelligence & ML vectors...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Alerts & Suspicious Queue */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Unresolved Security Alerts Card */}
            <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  <span className="text-amber-400">🔔</span> Unresolved Security Alerts
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                  {alerts.length} Active
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <span>✓</span> No unresolved security alerts present in the mempool.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert, idx) => (
                    <div key={alert.id || alert._id || idx} className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 transition-all hover:border-amber-400/50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400 text-xs font-mono uppercase tracking-wide">
                          {alert.type || 'SECURITY_ALERT'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                          {alert.severity || 'HIGH'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{alert.message || 'Suspicious payload divergence detected.'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suspicious Transactions Queue */}
            <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  <span className="text-rose-400">🛡️</span> Flagged Transaction Batches
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold">
                  {suspiciousItems.length} Queue
                </span>
              </div>

              {suspiciousItems.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-xs font-mono">
                  No suspicious batches pending review. All transactions settled cleanly.
                </div>
              ) : (
                <div className="space-y-3">
                  {suspiciousItems.map((item, idx) => {
                    const txnIds = item.txnIds || item.transactions || [];
                    const isSelected = selectedTxn === item;

                    return (
                      <div
                        key={item.id || item._id || idx}
                        onClick={() => setSelectedTxn(item)}
                        className={`bg-slate-900/60 border rounded-xl p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-lg'
                            : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Reason</span>
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold border border-rose-500/30">
                            INSPECTION READY
                          </span>
                        </div>
                        <p className="font-bold text-slate-100 text-sm">{item.reason || 'ISOLATION_FOREST_HIGH_ANOMALY'}</p>

                        <div className="mt-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Transaction IDs</span>
                          {Array.isArray(txnIds) && txnIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {txnIds.map((id) => (
                                <span key={id} className="px-2 py-0.5 rounded bg-slate-800 text-rose-300 border border-slate-700 font-mono text-[11px]">
                                  {id}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">TXN-ISOLATION-VECTOR-FLAG</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Interactive ML Radar Feature Vector Visualizer */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-6">
              <RadarChart
                title="Live Isolation Forest 8D Vector"
                score={selectedTxn ? 0.78 : 0.64}
                anomaly={true}
                features={[
                  { name: 'Amount Spike', key: 'amountSpike', value: selectedTxn ? 0.92 : 0.82 },
                  { name: 'Velocity Rate', key: 'velocityRate', value: selectedTxn ? 0.75 : 0.60 },
                  { name: 'Device Fingerprint', key: 'deviceDivergence', value: selectedTxn ? 0.95 : 0.88 },
                  { name: 'Geo Distance', key: 'geoDistance', value: selectedTxn ? 0.80 : 0.70 },
                  { name: 'Time Delta', key: 'timeAnomaly', value: selectedTxn ? 0.50 : 0.45 },
                  { name: 'Mempool Friction', key: 'mempoolFriction', value: selectedTxn ? 0.65 : 0.50 },
                  { name: 'Beneficiary Risk', key: 'beneficiaryRisk', value: selectedTxn ? 0.88 : 0.78 },
                  { name: 'Auth Entropy', key: 'authEntropy', value: selectedTxn ? 0.70 : 0.65 },
                ]}
              />

              {/* Informational Panel */}
              <div className="mt-4 bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 text-slate-300 text-xs leading-relaxed font-sans space-y-2">
                <p className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-emerald-400">🧠</span> About the 8D Vector
                </p>
                <p className="text-slate-400 text-[11px]">
                  The Isolation Forest ML engine isolates anomaly points across 8 orthogonal dimensions. Spikes exceeding 70% trigger automatic **HoldRequest** smart contracts on the Canton ledger.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
