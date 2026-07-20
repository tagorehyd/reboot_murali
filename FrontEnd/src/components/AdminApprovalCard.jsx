import React, { useState } from 'react';
import axios from 'axios';
import RiskBreakdownCard from './RiskBreakdownCard';

export default function AdminApprovalCard({ txnId, transaction, onApprove, onReject, onRefresh, compact = false }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(!compact);

  const riskScore = transaction.riskScore || 0;
  const riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';

  const riskChipClass =
    riskLevel === 'HIGH'
      ? 'bg-red-100 text-red-700 border-red-200'
      : riskLevel === 'MEDIUM'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  const handleApprove = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`/api/admin/txn/${txnId}/decide`, {
        approved: true,
      });
      if (onApprove) onApprove(response.data);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError('Failed to approve transaction');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`/api/admin/txn/${txnId}/decide`, {
        approved: false,
      });
      if (onReject) onReject(response.data);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError('Failed to reject transaction');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Transaction ID</p>
          <p className="font-mono text-xs md:text-sm font-bold text-slate-900 break-all mt-1">{txnId}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Created</p>
          <p className="text-sm text-slate-700 mt-1">
            {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {compact && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mb-4 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${riskChipClass}`}>
          {riskLevel} RISK · {riskScore}
        </span>
        <span className="px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold">
          {transaction.status || 'PENDING_ADMIN'}
        </span>
        <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold">
          £{Number(transaction.amount || 0).toLocaleString()}
        </span>
      </div>

      {expanded && (
        <>
          {/* Transaction Details */}
          <div className="grid grid-cols-1 gap-4 mb-4 bg-slate-50 rounded-xl p-4 border border-slate-200 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">From</p>
              <p className="font-bold text-slate-900 mt-1">{transaction.fromUserId}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">To</p>
              <p className="font-bold text-slate-900 mt-1">{transaction.toUserId}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Amount</p>
              <p className="text-xl font-black text-slate-900 mt-1">£{Number(transaction.amount || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Routing</p>
              <p className="text-sm font-bold text-slate-700 mt-1">{transaction.routingDecision || 'ADMIN_REVIEW'}</p>
            </div>
          </div>

          {/* Risk Breakdown */}
          {transaction.riskScore !== undefined && (
            <RiskBreakdownCard
              riskScore={transaction.riskScore}
              riskBreakdown={transaction.riskBreakdown || []}
            />
          )}
        </>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="px-4 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="px-4 py-3 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Reject'}
        </button>
      </div>

      {error && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg mt-3 p-2.5 text-sm font-semibold">{error}</p>}
    </div>
  );
}
