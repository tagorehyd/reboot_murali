import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function BlockDetailsModal({ block, chainName, onClose }) {
  const [merkleTree, setMerkleTree] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Build simple merkle tree visualization from transactions
    if (block && block.transactions) {
      const txns = block.transactions;

      // Create merkle tree structure
      const tree = {
        root: block.merkleRoot,
        leaves: txns.map((tx, index) => ({
          index,
          hash: tx.hash,
          txnId: tx.txnId,
          from: tx.fromUserId,
          to: tx.toUserId,
          amount: tx.amount,
        })),
        leafCount: txns.length,
      };

      setMerkleTree(tree);
    }
    setLoading(false);
  }, [block]);

  const getChainColor = (chain) => {
    switch (chain) {
      case 'Alpha':
        return { bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800/50', badge: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300' };
      case 'Beta':
        return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/50', badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' };
      case 'Gamma':
        return { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', border: 'border-fuchsia-200 dark:border-fuchsia-800/50', badge: 'bg-fuchsia-100 dark:bg-fuchsia-900/60 text-fuchsia-800 dark:text-fuchsia-300' };
      default:
        return { bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300' };
    }
  };

  const colors = getChainColor(chainName);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <p className="text-slate-600 dark:text-slate-400">Loading block details...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className={`${colors.bg} border-b ${colors.border} px-6 py-3 shrink-0`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Block #{block.blockNumber}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5 text-xs">
                {chainName} Chain — {block.transactions?.length || 0} transactions
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-xl font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* LEFT COLUMN */}
            <div className="space-y-6">

              {/* Block Metadata */}
              <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-full md:w-1/3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 md:mb-0">Block Hash</div>
                  <div className="w-full md:w-2/3 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{block.blockHash}</div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-full md:w-1/3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 md:mb-0">Previous Hash</div>
                  <div className="w-full md:w-2/3 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{block.previousHash}</div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-full md:w-1/3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 md:mb-0">Merkle Root</div>
                  <div className="w-full md:w-2/3 font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{block.merkleRoot}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">
                  <div className="p-3 sm:p-4">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Block Nonce</div>
                    <div className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{block.nonce}</div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Trigger Type</div>
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${colors.badge}`}>{block.triggerType}</span>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Timestamp</div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{new Date(block.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Consensus Info */}
              {block.consensusVerified !== undefined && (
                <div className={`border rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${block.consensusVerified ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50'}`}>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Consensus Status</h2>
                  <div className="flex items-center gap-3">
                    <span className={`text-xl ${block.consensusVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {block.consensusVerified ? '✓' : '✕'}
                    </span>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                      <p className={`text-sm font-bold ${block.consensusVerified ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                        {block.consensusVerified ? 'Consensus Verified' : 'Consensus Failed'}
                      </p>
                      {block.signatures && (
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-600 pl-3">
                          Signatures: {Object.keys(block.signatures).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Merkle Tree Visualization */}
              {merkleTree && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Merkle Tree Structure</h2>

                  <div className="space-y-2">
                    {/* Root */}
                    <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 dark:border-indigo-600 rounded-lg p-2.5">
                      <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold uppercase tracking-wider mb-0.5">Merkle Root</p>
                      <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">{merkleTree.root}</p>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center justify-center">
                      <div className="w-1 h-3 bg-slate-300 dark:bg-slate-700"></div>
                    </div>

                    {/* Leaves */}
                    <div>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Transaction Hashes ({merkleTree.leafCount})
                      </p>
                      <div className="space-y-1.5">
                        {merkleTree.leaves.map((leaf, index) => (
                          <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">TX #{index}</p>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 font-semibold">
                                {leaf.txnId.substring(0, 8)}...
                              </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded p-2 mb-2">
                              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                                <span className="font-bold">Hash:</span> {leaf.hash}
                              </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <p className="text-slate-500 dark:text-slate-400 font-semibold text-[10px] uppercase">From</p>
                                <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{leaf.from}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 dark:text-slate-400 font-semibold text-[10px] uppercase">To</p>
                                <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{leaf.to}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 dark:text-slate-400 font-semibold text-[10px] uppercase">Amount</p>
                                <p className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">£{leaf.amount}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Details */}
              {block.transactions && block.transactions.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Transaction Details</h2>
                  <div className="space-y-2">
                    {block.transactions.map((tx, index) => (
                      <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Transaction ID</p>
                            <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all mt-0.5">{tx.txnId}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Status</p>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{tx.status || 'COMMITTED'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">From → To</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{tx.fromUserId} → {tx.toUserId}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Amount</p>
                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">£{tx.amount}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
