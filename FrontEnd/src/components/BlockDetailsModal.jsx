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
        return { bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-800' };
      case 'Beta':
        return { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' };
      case 'Gamma':
        return { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', badge: 'bg-fuchsia-100 text-fuchsia-800' };
      default:
        return { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-800' };
    }
  };

  const colors = getChainColor(chainName);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <p className="text-slate-600">Loading block details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className={`${colors.bg} border-b ${colors.border} px-8 py-6 sticky top-0`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Block #{block.blockNumber}
              </h1>
              <p className="text-slate-600 mt-1">
                {chainName} Chain — {block.transactions?.length || 0} transactions
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-3xl font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">

          {/* Block Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Block Hash</h2>
              <p className="font-mono text-xs text-slate-600 break-all bg-white p-3 rounded border border-slate-200">
                {block.blockHash}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Previous Hash</h2>
              <p className="font-mono text-xs text-slate-600 break-all bg-white p-3 rounded border border-slate-200">
                {block.previousHash}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Merkle Root</h2>
              <p className="font-mono text-xs text-slate-600 break-all bg-white p-3 rounded border border-slate-200">
                {block.merkleRoot}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Block Nonce</h2>
              <p className="font-mono text-xs text-slate-600 break-all bg-white p-3 rounded border border-slate-200">
                {block.nonce}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Trigger Type</h2>
              <p className={`text-sm font-bold px-3 py-2 rounded ${colors.badge} w-fit`}>
                {block.triggerType}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Timestamp</h2>
              <p className="text-sm text-slate-700">
                {new Date(block.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Consensus Info */}
          {block.consensusVerified !== undefined && (
            <div className={`border rounded-xl p-6 ${block.consensusVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <h2 className="text-lg font-bold mb-3">Consensus Status</h2>
              <div className="flex items-center gap-3">
                <span className={`text-3xl ${block.consensusVerified ? 'text-emerald-600' : 'text-red-600'}`}>
                  {block.consensusVerified ? '✓' : '✕'}
                </span>
                <div>
                  <p className={`text-sm font-bold ${block.consensusVerified ? 'text-emerald-700' : 'text-red-700'}`}>
                    {block.consensusVerified ? 'Consensus Verified' : 'Consensus Failed'}
                  </p>
                  {block.signatures && (
                    <p className="text-xs text-slate-600 mt-1">
                      Signatures: {Object.keys(block.signatures).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Merkle Tree Visualization */}
          {merkleTree && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Merkle Tree Structure</h2>
              
              <div className="space-y-4">
                {/* Root */}
                <div className="bg-white border-2 border-indigo-500 rounded-lg p-4">
                  <p className="text-xs text-indigo-700 font-bold uppercase tracking-wider mb-2">Merkle Root</p>
                  <p className="font-mono text-xs text-slate-600 break-all">{merkleTree.root}</p>
                </div>

                {/* Divider */}
                <div className="flex items-center justify-center">
                  <div className="w-1 h-8 bg-slate-300"></div>
                </div>

                {/* Leaves */}
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Transaction Hashes ({merkleTree.leafCount})
                  </p>
                  <div className="space-y-2">
                    {merkleTree.leaves.map((leaf, index) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-cyan-300 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-bold text-slate-700">TX #{index}</p>
                          <span className="text-xs px-2 py-1 rounded bg-cyan-100 text-cyan-700 font-semibold">
                            {leaf.txnId.substring(0, 8)}...
                          </span>
                        </div>
                        
                        <div className="bg-slate-50 rounded p-3 mb-2">
                          <p className="font-mono text-xs text-slate-600 break-all">
                            <span className="font-bold">Hash:</span> {leaf.hash}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-slate-500 font-semibold">From</p>
                            <p className="font-bold text-slate-700">{leaf.from}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-semibold">To</p>
                            <p className="font-bold text-slate-700">{leaf.to}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-semibold">Amount</p>
                            <p className="font-bold text-indigo-600">£{leaf.amount}</p>
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
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Transaction Details</h2>
              <div className="space-y-3">
                {block.transactions.map((tx, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Transaction ID</p>
                        <p className="font-mono text-xs text-slate-700 break-all mt-1">{tx.txnId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Status</p>
                        <p className="text-sm font-bold text-emerald-600 mt-1">{tx.status || 'COMMITTED'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">From → To</p>
                        <p className="text-sm font-bold text-slate-700 mt-1">{tx.fromUserId} → {tx.toUserId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Amount</p>
                        <p className="text-lg font-bold text-indigo-600 mt-1">£{tx.amount}</p>
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
  );
}
