import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function SuspiciousTransactions() {
  const [suspiciousItems, setSuspiciousItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 p-8 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">⚠️ Suspicious Transactions</h1>
          <p className="text-slate-500 mt-1">Investigate non-verified batches and unresolved security alerts.</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-500">Loading suspicious data...</div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-extrabold text-slate-900 mb-3">Unresolved Alerts ({alerts.length})</h2>
            {alerts.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-700 font-semibold">
                No unresolved alerts.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div key={alert.id || alert._id || idx} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="font-bold text-amber-800">{alert.type || 'ALERT'} · {alert.severity || 'MEDIUM'}</p>
                    <p className="text-sm text-amber-700 mt-1">{alert.message || 'No message'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-3">Suspicious Queue ({suspiciousItems.length})</h2>
            {suspiciousItems.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-700">
                No suspicious transactions pending review.
              </div>
            ) : (
              <div className="space-y-3">
                {suspiciousItems.map((item, idx) => {
                  const txnIds = item.txnIds || item.transactions || [];
                  return (
                    <div key={item.id || item._id || idx} className="bg-white border border-slate-200 rounded-lg p-4">
                      <p className="text-sm text-slate-500 uppercase tracking-wider">Reason</p>
                      <p className="font-bold text-slate-900">{item.reason || 'CONSENSUS_FAILURE'}</p>
                      <p className="text-sm text-slate-500 uppercase tracking-wider mt-3">Transaction IDs</p>
                      {Array.isArray(txnIds) && txnIds.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {txnIds.map((id) => (
                            <span key={id} className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono text-xs">
                              {id}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600 mt-1">No txn list available.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
