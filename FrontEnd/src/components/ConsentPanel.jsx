import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ConsentPanel({ txnId, transaction, onApprove, onReject }) {
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleReject(); // Auto-reject on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleApprove = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`/api/admin/txn/${txnId}/consent`, {
        approved: true,
      });
      if (onApprove) onApprove(response.data);
    } catch (err) {
      setError('Failed to approve consent');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`/api/admin/txn/${txnId}/consent`, {
        approved: false,
      });
      if (onReject) onReject(response.data);
    } catch (err) {
      setError('Failed to reject consent');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimerColor = () => {
    if (timeRemaining > 30) return 'text-slate-900';
    if (timeRemaining > 10) return 'text-orange-600';
    return 'text-red-600';
  };

  const RULE_LABELS = {
    LARGE_AMOUNT: 'Large Amount',
    NEW_PAYEE: 'New Payee',
    VELOCITY: 'Transaction Velocity',
    ROUND_AMOUNT: 'Round Amount',
    OFF_HOURS: 'Off-Hours Activity',
    RAPID_DRAIN: 'Rapid Balance Drain',
    CORTEX_AI: 'Cortex AI Anomaly',
    BENEFICIARY_GLOBAL_LIMIT_REVIEW: 'Global Beneficiary Limit Review',
    BENEFICIARY_LIMIT_REVIEW: 'Beneficiary Limit Review',
    BENEFICIARY_TRUST_DISCOUNT: 'Beneficiary Trust Discount',
  };
  const ruleLabel = (rule) => RULE_LABELS[rule] || rule;
  const breakdown = transaction.riskBreakdown || [];
  const breakdownTotal = breakdown.reduce((sum, item) => sum + (item.points || 0), 0);

  return (
    <>
      {/* Overlay Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        {/* Modal Container */}
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-8 py-5 text-center shrink-0">
            <div className="flex items-center justify-center gap-3">
              <div className="text-4xl">⚠️</div>
              <div className="text-left">
                <h2 className="text-2xl font-black text-white leading-tight">Unusual Activity Detected</h2>
                <p className="text-orange-100 text-sm">This transaction requires your approval</p>
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto flex-1">
            {/* Disclaimer Section */}
            <div className="px-8 py-3 bg-orange-50 border-b border-orange-200">
              <p className="text-sm text-orange-900 font-semibold">⚡ Alert: Uncommon Behavior</p>
              <p className="text-xs text-orange-800 leading-relaxed mt-1">
                Our fraud detection system flagged this transaction as unusual for your account. Please review the details below carefully before approving.
              </p>
            </div>

            {/* Two-column content */}
            <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left column: details + timer */}
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 font-semibold">From</span>
                    <span className="font-bold text-slate-900">{transaction.fromUserId}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                    <span className="text-sm text-slate-600 font-semibold">To</span>
                    <span className="font-bold text-slate-900">{transaction.toUserId}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                    <span className="text-sm text-slate-600 font-semibold">Amount</span>
                    <span className="font-bold text-lg text-slate-900">£{transaction.amount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Timer Section */}
                <div className="text-center py-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-2">Time to Respond</p>
                  <div className={`text-5xl font-black font-mono transition-colors ${getTimerColor()}`}>
                    {timeRemaining}s
                  </div>
                  {timeRemaining <= 10 && (
                    <p className="text-red-600 text-xs mt-2 font-bold animate-pulse">⏰ Expiring soon!</p>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700 text-sm font-semibold">{error}</p>
                  </div>
                )}
              </div>

              {/* Right column: risk breakdown */}
              <div>
                {breakdown.length > 0 ? (
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Risk Point Breakdown</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {breakdown.map((item, idx) => {
                        const isDiscount = (item.points || 0) < 0;
                        return (
                          <div key={idx} className="px-4 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                {item.rule === 'CORTEX_AI' && <span>🧠</span>}
                                {ruleLabel(item.rule)}
                              </span>
                              <span className={`text-sm font-black ${isDiscount ? 'text-cyan-700' : 'text-slate-900'}`}>
                                {(item.points || 0) > 0 ? `+${item.points}` : item.points}
                              </span>
                            </div>
                            {item.reason && (
                              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.reason}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">Total Risk Score</span>
                      <span className={`font-black text-base px-3 py-1 rounded-full ${
                        breakdownTotal > 50 ? 'bg-red-100 text-red-700' :
                        breakdownTotal > 25 ? 'bg-orange-100 text-orange-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {breakdownTotal} points
                      </span>
                    </div>
                  </div>
                ) : (
                  transaction.riskScore !== undefined && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 font-semibold">Risk Assessment</span>
                        <span className={`font-bold text-sm px-3 py-1 rounded-full ${
                          transaction.riskScore > 50 ? 'bg-red-100 text-red-700' :
                          transaction.riskScore > 25 ? 'bg-orange-100 text-orange-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {transaction.riskScore} points
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0">
            <button
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-300 text-slate-900 font-bold rounded-lg hover:bg-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '⏳ Processing...' : '❌ Reject'}
            </button>
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {isLoading ? '⏳ Processing...' : '✅ Approve'}
            </button>
          </div>

          {/* Footer Note */}
          <div className="px-8 py-2.5 bg-slate-100 text-center shrink-0">
            <p className="text-xs text-slate-600 italic">
              Auto-reject in {timeRemaining}s if no action taken
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
