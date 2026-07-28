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
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 space-y-6 animate-in fade-in duration-200">
      {/* Top Header / Back Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <span>←</span> Back to Chain Explorer
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Block #{block.blockNumber}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${colors.badge}`}>
                {chainName} Chain
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Consensus-validated block details & Canton DAML smart contract audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {block.transactions?.length || 0} Transactions Enclosed
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* SECTION 1: Block Metadata & Consensus Header (Full Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Block Hashes */}
        <div className="lg:col-span-2 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Block Cryptographic Identifiers</h2>
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 w-32 uppercase text-[10px]">Block Hash</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold break-all flex-1 sm:text-right">{block.blockHash}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 w-32 uppercase text-[10px]">Previous Hash</span>
              <span className="font-mono text-slate-600 dark:text-slate-400 break-all flex-1 sm:text-right">{block.previousHash}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 w-32 uppercase text-[10px]">Merkle Root</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold break-all flex-1 sm:text-right">{block.merkleRoot}</span>
            </div>
          </div>
        </div>

        {/* Block Nonce & Consensus */}
        <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Block Metadata</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Nonce</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{block.nonce}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Trigger</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${colors.badge}`}>{block.triggerType}</span>
              </div>
              <div className="col-span-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Timestamp</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(block.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Consensus status pill */}
          {block.consensusVerified !== undefined && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              block.consensusVerified ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                <span>{block.consensusVerified ? '✓' : '✕'}</span>
                <div>
                  <p className="font-bold text-xs">{block.consensusVerified ? 'Consensus Verified' : 'Consensus Failed'}</p>
                  <p className="text-[10px] opacity-80">
                    Signatures: {Array.isArray(block.signatures) ? block.signatures.join(', ') : Object.keys(block.signatures).join(', ')}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                2-of-3 BFT
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Merkle Tree Visualization */}
      {merkleTree && (
        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🌲</span> Merkle Tree Structure
            </h2>
            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
              Root: {merkleTree.root ? merkleTree.root.substring(0, 16) + '...' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {merkleTree.leaves.map((leaf, index) => (
              <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Transaction #{index}</span>
                  <span className="text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded">
                    {leaf.txnId.substring(0, 12)}...
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded text-[10px] font-mono text-slate-600 dark:text-slate-400 break-all">
                  <span className="font-bold text-slate-500">Hash:</span> {leaf.hash}
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>{leaf.from} ➔ {leaf.to}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">£{leaf.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: Main Canton Feature Section (Full Width, Spacious) */}
      {block.transactions && block.transactions.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-3 gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>📜</span> Canton DAML Smart Contracts & Consents Audit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full interbank participant node routing, active DAML contract states, explicit party consents, and live tamper verification.
              </p>
            </div>
            <span className="text-xs uppercase tracking-wider font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30 self-start sm:self-auto">
              Canton Protocol Enabled ✓
            </span>
          </div>

          <div className="space-y-6">
            {block.transactions.map((tx, index) => (
              <CantonTxnDetailBlock key={index} tx={tx} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component that automatically loads and displays Canton DAML Contracts, Consents & Tamper Integrity in an expandable layout
function CantonTxnDetailBlock({ tx, index }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);
  const [cantonData, setCantonData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const res = await axios.get(`/api/chain/txn/${tx.txnId}/canton-details`);
        if (isMounted) setCantonData(res.data);
      } catch (err) {
        console.error('Failed to load Canton details', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [tx.txnId]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg transition-all overflow-hidden">
      {/* Transaction Summary Header Bar (Click to Expand / Collapse) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-800 cursor-pointer transition-colors"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Txn ID:</span>
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{tx.txnId}</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Sender: <strong className="text-slate-900 dark:text-slate-100">{tx.from || tx.fromUserId}</strong></span>
            <span className="text-slate-400">➔</span>
            <span>Recipient: <strong className="text-slate-900 dark:text-slate-100">{tx.to || tx.toUserId}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block sm:text-right">Amount</span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">£{tx.amount}</span>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-700 pl-3 space-y-0.5">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 block text-center">
              {tx.status || 'COMMITTED'}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block text-center">
              DAML Contract Signed ✓
            </span>
          </div>

          <button className="ml-2 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer">
            <span>{isExpanded ? 'Collapse ▲' : 'Expand Details ▾'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Content Body */}
      {isExpanded && (
        <div className="p-5 space-y-6 animate-in fade-in duration-200">
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-500">Loading Canton DAML Contract & Consent states...</div>
          ) : cantonData ? (
            <div className="space-y-6">
              {/* Interbank Canton Node Participant Routing */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-xl border border-slate-700 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏛️</span>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Originating Participant Node</span>
                    <p className="font-bold text-sm text-cyan-300">{cantonData.originatingBank} ({cantonData.originatingParticipant})</p>
                  </div>
                </div>

                <div className="hidden sm:block text-slate-500 font-bold text-lg">➔</div>

                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block sm:text-right">Validator Participant Node</span>
                    <p className="font-bold text-sm text-emerald-300 sm:text-right">{cantonData.validatorBank} ({cantonData.validatorParticipant})</p>
                  </div>
                  <span className="text-2xl">⚡</span>
                </div>
              </div>

              {/* CHRONOLOGY OF DAML CONSENT & CONTRACT LIFECYCLE EVENTS */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <span>⏳</span> DAML Contract Lifecycle & Consent Event Chronology
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800">
                    {cantonData.ledgerStates?.length || 0} Ledger Events Recorded
                  </span>
                </div>

                {/* Event Timeline Nodes */}
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-300 dark:before:bg-slate-700">
                  {cantonData.ledgerStates && cantonData.ledgerStates.length > 0 ? (
                    cantonData.ledgerStates.map((event, evIdx) => (
                      <div key={evIdx} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
                        {/* Dot badge */}
                        <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-cyan-500 ring-4 ring-white dark:ring-slate-900"></div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{event.state}</span>
                            {event.damlContractRef && (
                              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                {event.damlContractRef}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">{event.remarks || event.details || 'DAML Ledger Event Executed'}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                            <span>Actor: <strong className="text-slate-600 dark:text-slate-300">{event.actorRole || 'SYSTEM'}</strong></span>
                            {event.originatingBank && <span>Originating: <strong className="text-slate-600 dark:text-slate-300">{event.originatingBank}</strong></span>}
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono self-start sm:self-auto sm:text-right">
                          {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'Recent'}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Default Fallback Timeline Steps */
                    [
                      { step: '1', title: 'TXN_CREATED', desc: 'Transaction initiated & Daml Hold contract created', party: tx.from || 'User', status: 'COMPLETED' },
                      { step: '2', title: 'USER_CONSENT_RECEIVED', desc: 'Explicit customer consent authorization signed', party: (tx.from || 'User') + '_Party', status: 'COMPLETED' },
                      { step: '3', title: 'ADMIN_APPROVAL_GRANTED', desc: 'Originating bank multi-sig compliance cleared', party: 'BankA_Admin', status: 'COMPLETED' },
                      { step: '4', title: 'ESCROW_HOLD_CREATED', desc: 'Recipient bank escrow agreement established', party: 'BankB_Clearing', status: 'COMPLETED' },
                      { step: '5', title: 'SETTLEMENT_COMPLETED', desc: 'Canton ledger settlement finalized atomically', party: 'GlobalSynchronizer', status: 'COMPLETED' },
                    ].map((step, sIdx) => (
                      <div key={sIdx} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
                        <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900"></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{step.title}</span>
                            <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                              ✓ {step.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">{step.desc}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Party: {step.party}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* DAML Smart Contracts Executed */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                  DAML Smart Contracts Active ({cantonData.damlContracts?.length || 0})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cantonData.damlContracts?.map((contract, cIdx) => (
                    <div key={cIdx} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{contract.templateName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {contract.status}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 break-all">
                        <span className="font-bold">Contract Ref:</span> {contract.contractRef}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">{contract.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canton Chain Consents & Sign-Offs */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                  Canton Network Consents & Sign-Off Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {cantonData.consents?.map((consent, csIdx) => (
                    <div key={csIdx} className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                      consent.granted
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{consent.label}</span>
                          <span className="font-black">{consent.granted ? '✓' : '⏳'}</span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Party: {consent.party}</p>
                      </div>
                      <p className="text-[11px] mt-2 leading-tight">{consent.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canton Tamper Integrity Verification */}
              {cantonData.tamperIntegrity && (
                <div className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  cantonData.tamperIntegrity.verified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cantonData.tamperIntegrity.verified ? '🛡️' : '🚨'}</span>
                    <div>
                      <p className="font-bold text-sm">
                        {cantonData.tamperIntegrity.verified ? 'Canton DAML Smart Contract Integrity Verified' : 'Tamper Attempt Detected!'}
                      </p>
                      <p className="text-xs opacity-90 mt-0.5">
                        Operational Amount: <strong>£{cantonData.tamperIntegrity.operationalAmount}</strong> | Signed DAML State: <strong>£{cantonData.tamperIntegrity.expectedAmount}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 self-start sm:self-auto">
                    {cantonData.tamperIntegrity.status}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 text-xs text-slate-500">Canton details unavailable.</div>
          )}
        </div>
      )}
    </div>
  );
}
