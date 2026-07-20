import React, { useState } from 'react';
import axios from 'axios';

const DEMO_USERS = [
  { id: 'U001', name: 'Alice Walker' },
  { id: 'U002', name: 'Bob Taylor' },
  { id: 'U003', name: 'Carlos Rivera' },
  { id: 'U004', name: 'Diana Prince' },
  { id: 'U005', name: 'Eve Chen' },
  { id: 'U006', name: 'Frank Okafor' },
  { id: 'U007', name: 'Grace Okonkwo' },
];

const VERDICT_STYLES = {
  RED_FLAG: { badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', label: '🚩 Red Flag' },
  REVIEW: { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: '🔍 Needs Review' },
  CLEAR: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: '✅ Clear' },
};

const SEVERITY_STYLES = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-slate-100 text-slate-600',
};

export default function AIAnomalyReview() {
  const [selectedUser, setSelectedUser] = useState('U001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);

  const runReview = async () => {
    setLoading(true);
    setError('');
    setReview(null);
    try {
      const res = await axios.get(`/api/cortex/review/user/${selectedUser}`);
      setReview(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Review failed');
    } finally {
      setLoading(false);
    }
  };

  const verdictStyle = review ? (VERDICT_STYLES[review.verdict] || VERDICT_STYLES.REVIEW) : null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
          <span className="text-3xl">🧠</span> Cortex AI Anomaly Review
        </h1>
        <p className="text-slate-600 mt-2">
          AI-assisted review of a user's payment history. Cortex weighs the rules-engine risk
          scores to decide whether a pattern is a red flag.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
          Account to review
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {DEMO_USERS.map((u) => (
              <option key={u.id} value={u.id}>{u.id} — {u.name}</option>
            ))}
          </select>
          <button
            onClick={runReview}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
          >
            {loading ? 'Analyzing…' : 'Run AI Review'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 font-semibold">Review failed</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="inline-flex items-center gap-3 text-slate-500">
            <span className="animate-pulse w-3 h-3 rounded-full bg-cyan-500"></span>
            Cortex AI is analyzing payment history…
          </div>
        </div>
      )}

      {review && !loading && (
        <div className="space-y-6">
          {/* Verdict header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${verdictStyle.dot}`}></span>
                <span className={`px-3 py-1.5 rounded-full border font-bold text-sm ${verdictStyle.badge}`}>
                  {verdictStyle.label}
                </span>
                <span className="text-sm text-slate-500">Risk level: <strong className="text-slate-700">{review.riskLevel}</strong></span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {review.transactionsAnalyzed} txns · {review.model}
              </span>
            </div>
            <div className="p-6">
              <p className="text-slate-800 leading-relaxed">{review.summary}</p>
              {review.recommendation && (
                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Recommendation</p>
                  <p className="text-sm text-slate-700">{review.recommendation}</p>
                </div>
              )}
            </div>
          </div>

          {/* Anomalies */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                Flagged transactions ({review.anomalies?.length || 0})
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {(!review.anomalies || review.anomalies.length === 0) ? (
                <p className="text-sm text-slate-500 text-center py-8">No anomalies detected.</p>
              ) : (
                review.anomalies.map((a, i) => (
                  <div key={a.txnId || i} className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-500 break-all">{a.txnId || '—'}</span>
                      <div className="flex items-center gap-2">
                        {a.riskScore != null && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                            score {a.riskScore}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.LOW}`}>
                          {a.severity}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{a.reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
