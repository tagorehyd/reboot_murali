import React from 'react';

export default function RiskBreakdownCard({
  riskScore,
  riskBreakdown,
  beneficiaryTrustTier,
  beneficiaryTrustDiscount,
}) {
  const getRiskColor = () => {
    if (riskScore <= 39) return 'bg-green-50 border-green-200';
    if (riskScore <= 69) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getRiskBadgeColor = () => {
    if (riskScore <= 39) return 'bg-green-100 text-green-800';
    if (riskScore <= 69) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getProgressBarColor = () => {
    if (riskScore <= 39) return 'bg-green-500';
    if (riskScore <= 69) return 'bg-yellow-500';
    return 'bg-red-500';
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
    BENEFICIARY_GLOBAL_LIMIT_REVIEW: 'Global Beneficiary Limit Review',
    BENEFICIARY_LIMIT_REVIEW: 'Beneficiary Limit Review',
    BENEFICIARY_TRUST_DISCOUNT: 'Beneficiary Trust Discount',
  };

  const ruleLabel = (rule) => RULE_LABELS[rule] || rule;

  return (
    <div className={`rounded-xl border ${getRiskColor()} p-4 mt-6`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900">Risk Analysis</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-black ${getRiskBadgeColor()}`}>
          {riskScore} points
        </span>
      </div>

      {trustTierLabel && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Beneficiary Trust</span>
          <span className="text-sm font-extrabold text-cyan-900">
            {trustTierLabel}
            {Number.isInteger(beneficiaryTrustDiscount) && beneficiaryTrustDiscount > 0 ? ` (-${beneficiaryTrustDiscount})` : ''}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressBarColor()} transition-all duration-300`}
            style={{ width: `${getProgressWidth()}%` }}
          />
        </div>
        <div className="text-xs text-slate-600 mt-1 font-medium">
          {riskScore <= 39 && 'Low Risk — Auto-Approved'}
          {riskScore > 39 && riskScore <= 69 && 'Medium Risk — Admin Review Required'}
          {riskScore > 69 && 'High Risk — Priority Handling Required'}
        </div>
      </div>

      {/* Breakdown items — every risk point with its reason, AI included */}
      {riskBreakdown && riskBreakdown.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Risk Factors</p>
          <div className="space-y-2">
            {riskBreakdown.map((item, idx) => {
              const isDiscount = item.points < 0;
              const isAi = item.rule === 'CORTEX_AI';
              return (
                <div
                  key={idx}
                  className={`rounded-lg p-3 border ${
                    isAi
                      ? 'bg-violet-50 border-violet-200'
                      : isDiscount
                      ? 'bg-cyan-50 border-cyan-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      {isAi && <span>🧠</span>}
                      {ruleLabel(item.rule)}
                    </span>
                    <span className={`text-sm font-bold ${isDiscount ? 'text-cyan-700' : 'text-slate-900'}`}>
                      {item.points > 0 ? `+${item.points}` : item.points}
                    </span>
                  </div>
                  {item.reason && (
                    <p className="text-xs text-slate-600 mt-1 leading-snug">{item.reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600 italic">No risk factors detected</p>
      )}
    </div>
  );
}
