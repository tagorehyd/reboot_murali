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
      ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
      : riskLevel === 'MEDIUM'
        ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
        : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50';

  const hasEscrow = Boolean(
    transaction.escrowOptIn || transaction.escrowContractRef || transaction.status === 'ESCROW_ACTIVE'
  );
  const escrowStatus = transaction.status === 'SETTLED' ? 'Released' : transaction.status === 'ESCROW_ACTIVE' ? 'Active' : 'Pending opt-in';

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
    <div className={`border rounded-xl p-4 shadow-sm transition-shadow flex flex-col h-full ${
      hasEscrow
        ? 'bg-purple-50/40 border-purple-300 dark:bg-purple-900/20 dark:border-purple-600/50 dark:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
        : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Transaction ID</p>
          <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 break-all mt-0.5">{txnId}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Created</p>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-medium">
            {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : '—'}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{transaction.fromUserDisplayName || transaction.fromUserId}</span>
          <span className="text-slate-500"> ({transaction.fromUserId})</span>
          <span className="mx-1.5 text-slate-400">→</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{transaction.toUserDisplayName || transaction.toUserId}</span>
          <span className="text-slate-500"> ({transaction.toUserId})</span>
        </p>
      </div>

      {compact && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mb-3 inline-flex items-center rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${riskChipClass}`}>
          {riskLevel} RISK · {riskScore}
        </span>
        <span className="px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold">
          {transaction.status || 'PENDING_ADMIN'}
        </span>
        <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
          £{Number(transaction.amount || 0).toLocaleString()}
        </span>
        {hasEscrow && (
          <span className="px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold flex items-center gap-1">
            <span className="text-[10px]">🔏</span> Escrow {escrowStatus}
          </span>
        )}
      </div>

      <div className={`mb-3 rounded border px-2.5 py-1.5 text-[11px] ${
        hasEscrow 
          ? 'border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-300'
          : 'border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-300'
      }`}>
        {hasEscrow 
          ? 'Escrow is enabled. Automatic release will occur upon admin approval via Canton.'
          : 'Standard transaction. Manual admin approval required to release funds.'}
      </div>

      {expanded && (
        <div className="space-y-3 mb-3">
          {/* Transaction Details */}
          <div className="grid grid-cols-1 gap-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg p-3 border border-slate-200 dark:border-slate-700 sm:grid-cols-2">
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">From</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5">{transaction.fromUserDisplayName || transaction.fromUserId} <span className="text-slate-500 font-normal">({transaction.fromUserId})</span></p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">To</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5">{transaction.toUserDisplayName || transaction.toUserId} <span className="text-slate-500 font-normal">({transaction.toUserId})</span></p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Amount</p>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5">£{Number(transaction.amount || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Routing</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{transaction.routingDecision || 'ADMIN_REVIEW'}</p>
            </div>
          </div>

          {/* Escrow Release */}
          {hasEscrow && (
            <div className="rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">Escrow Configuration</p>
                </div>
                <span className="rounded border border-purple-200 dark:border-purple-700/50 bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-400">
                  {escrowStatus}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded bg-white/80 dark:bg-slate-900/50 border border-purple-100 dark:border-purple-800/30 p-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Opt-in</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {transaction.escrowOptIn ? 'Enabled' : 'Not enabled'}
                  </p>
                </div>
                <div className="rounded bg-white/80 dark:bg-slate-900/50 border border-purple-100 dark:border-purple-800/30 p-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contract Ref</p>
                  <p className="mt-0.5 break-all text-[11px] font-mono text-slate-800 dark:text-slate-300">
                    {transaction.escrowContractRef || 'Pending creation'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Risk Breakdown */}
          {transaction.riskScore !== undefined && (
            <RiskBreakdownCard
              riskScore={transaction.riskScore}
              riskBreakdown={transaction.riskBreakdown || []}
            />
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto pt-2">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="px-3 py-2 text-sm bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="px-3 py-2 text-sm bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Reject'}
        </button>
      </div>

      {error && <p className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-lg mt-2 p-2 text-xs font-semibold">{error}</p>}
    </div>
  );
}
