import React from 'react';

export default function RiskBreakdownCard({
  riskScore,
  riskBreakdown,
  beneficiaryTrustTier,
  beneficiaryTrustDiscount,
}) {
  const getRiskColor = () => {
    if (riskScore <= 39) return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/50';
    if (riskScore <= 69) return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/50';
    return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50';
  };

  const getRiskBadgeColor = () => {
    if (riskScore <= 39) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400';
    if (riskScore <= 69) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400';
  };

  const getProgressBarColor = () => {
    if (riskScore <= 39) return 'bg-green-500 dark:bg-green-400';
    if (riskScore <= 69) return 'bg-yellow-500 dark:bg-yellow-400';
    return 'bg-red-500 dark:bg-red-400';
  };

  const getProgressWidth = () => {
    return Math.min((riskScore / 100) * 100, 100);
  };

  const getTrustTierLabel = () => {
    switch (beneficiaryTrustTier) {
      case 'NEW': return 'New Trust';
      case 'GROWING': return 'Growing Trust';
      case 'ESTABLISHED': return 'Established Trust';
      case 'LONG_TERM': return 'Long-term Trust';
      case 'PENDING': return 'Beneficiary Pending';
      default: return null;
    }
  };

  const trustTierLabel = getTrustTierLabel();

  const RULE_LABELS = {
    LARGE_AMOUNT: 'Large Amount',
    NEW_PAYEE: 'New Payee',
    VELOCITY: 'Transaction Velocity',
    ROUND_AMOUNT: 'Round Amount',
    OFF_HOURS: 'Off-Hours Activity',
    RAPID_DRAIN: 'Rapid Balance Drain',
    CORTEX_AI: 'Cortex AI Anomaly',
    ISOLATION_FOREST: 'Isolation Forest ML',
    BENEFICIARY_GLOBAL_LIMIT_REVIEW: 'Global Beneficiary Limit Review',
    BENEFICIARY_LIMIT_REVIEW: 'Beneficiary Limit Review',
    BENEFICIARY_TRUST_DISCOUNT: 'Beneficiary Trust Discount',
  };

  const ruleLabel = (rule) => RULE_LABELS[rule] || rule;

  return (
    <div className={`rounded-xl border ${getRiskColor()} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Risk Analysis</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-black ${getRiskBadgeColor()}`}>
          {riskScore} points
        </span>
      </div>

      {trustTierLabel && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-2">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">Beneficiary Trust</span>
          <span className="text-sm font-extrabold text-cyan-900 dark:text-cyan-300">
            {trustTierLabel}
            {Number.isInteger(beneficiaryTrustDiscount) && beneficiaryTrustDiscount > 0 ? ` (-${beneficiaryTrustDiscount})` : ''}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressBarColor()} transition-all duration-300`}
            style={{ width: `${getProgressWidth()}%` }}
          />
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
          {riskScore <= 39 && 'Low Risk — Auto-Approved'}
          {riskScore > 39 && riskScore <= 69 && 'Medium Risk — Admin Review Required'}
          {riskScore > 69 && 'High Risk — Priority Handling Required'}
        </div>
      </div>

      {/* Breakdown items — every risk point with its reason, AI & ML included */}
      {riskBreakdown && riskBreakdown.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Risk Factors</p>
          <div className="space-y-2">
            {riskBreakdown.map((item, idx) => {
              const isDiscount = item.points < 0;
              const isAi = item.rule === 'CORTEX_AI';
              const isIf = item.rule === 'ISOLATION_FOREST';
              return (
                <div
                  key={idx}
                  className={`rounded-lg p-3 border ${
                    isAi
                      ? 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800/50'
                      : isIf
                      ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50'
                      : isDiscount
                      ? 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800/50'
                      : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {isAi && <span>🧠</span>}
                      {isIf && <span>🌲</span>}
                      {ruleLabel(item.rule)}
                    </span>
                    <span className={`text-sm font-bold ${isIf ? 'text-emerald-800 dark:text-emerald-400' : isDiscount ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {item.points > 0 ? `+${item.points}` : item.points}
                    </span>
                  </div>
                  {item.reason && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">{item.reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400 italic">No risk factors detected</p>
      )}
    </div>
  );
}
