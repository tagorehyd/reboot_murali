import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BlockDetailsModal from '../components/BlockDetailsModal';

function ChainColumn({ title, blocks, onSelectBlock }) {
  const theme = {
    Alpha: {
      card: 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800/50',
      heading: 'text-cyan-800 dark:text-cyan-400',
      block: 'bg-cyan-50/50 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-800/30',
      trigger: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300',
    },
    Beta: {
      card: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50',
      heading: 'text-emerald-800 dark:text-emerald-400',
      block: 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30',
      trigger: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300',
    },
    Gamma: {
      card: 'bg-fuchsia-50 dark:bg-fuchsia-950/20 border-fuchsia-200 dark:border-fuchsia-800/50',
      heading: 'text-fuchsia-800 dark:text-fuchsia-400',
      block: 'bg-fuchsia-50/50 dark:bg-fuchsia-900/10 border-fuchsia-200 dark:border-fuchsia-800/30',
      trigger: 'bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-800 dark:text-fuchsia-300',
    },
  }[title] || {
    card: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700',
    heading: 'text-slate-900 dark:text-slate-100',
    block: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    trigger: 'bg-slate-100 text-slate-700 dark:text-slate-300',
  };

  return (
    <div className={`border rounded-xl p-3 shadow-sm ${theme.card}`}>
      <h3 className={`text-base font-extrabold mb-2 ${theme.heading}`}>{title}</h3>
      {blocks.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-500">No blocks found.</p>
      ) : (
        <div className="space-y-2 max-h-[55vh] 2xl:max-h-[600px] overflow-y-auto pr-1">
          {blocks.map((block) => (
            <button
              key={`${title}-${block.blockNumber}`}
              onClick={() => onSelectBlock(block, title)}
              className={`w-full text-left border rounded-lg p-2 ${theme.block} hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">Block #{block.blockNumber}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${theme.trigger}`}>
                  {block.triggerType || 'UNKNOWN'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 break-all leading-tight">
                <span className="font-semibold">Hash:</span> {block.blockHash.substring(0, 20)}...
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 break-all leading-tight mt-0.5">
                <span className="font-semibold">Prev:</span> {block.previousHash.substring(0, 20)}...
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 break-all leading-tight mt-0.5">
                <span className="font-semibold">Merkle:</span> {block.merkleRoot.substring(0, 20)}...
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                  Txns: {block.transactions?.length || 0}
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Details →</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChainExplorer() {
  const [alphaBlocks, setAlphaBlocks] = useState([]);
  const [betaBlocks, setBetaBlocks] = useState([]);
  const [gammaBlocks, setGammaBlocks] = useState([]);
  const [mempoolStatus, setMempoolStatus] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedChain, setSelectedChain] = useState(null);

  // POC Tamper Simulation & Ledger Integrity State
  const [tamperTxnId, setTamperTxnId] = useState('');
  const [tamperAmount, setTamperAmount] = useState('99999.00');
  const [tamperStatusNotice, setTamperStatusNotice] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [ledgerStateHistory, setLedgerStateHistory] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);

  const loadExplorerData = async () => {
    setError('');
    try {
      const [alpha, beta, gamma, mempool] = await Promise.all([
        axios.get('/api/chain/alpha/blocks?limit=20'),
        axios.get('/api/chain/beta/blocks?limit=20'),
        axios.get('/api/chain/gamma/blocks?limit=20'),
        axios.get('/api/mempool/status'),
      ]);

      setAlphaBlocks(alpha.data || []);
      setBetaBlocks(beta.data || []);
      setGammaBlocks(gamma.data || []);
      setMempoolStatus(mempool.data || null);
    } catch (err) {
      setError('Failed to load chain explorer data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExplorerData();
    const timer = setInterval(loadExplorerData, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectBlock = (block, chainName) => {
    setSelectedBlock(block);
    setSelectedChain(chainName);
  };

  const handleCloseModal = () => {
    setSelectedBlock(null);
    setSelectedChain(null);
  };

  // POC Tamper Simulation Handler
  const handleSimulateTamper = async () => {
    if (!tamperTxnId) return;
    setTamperStatusNotice(null);
    setVerificationResult(null);
    try {
      const res = await axios.post('/api/chain/tamper', {
        txnId: tamperTxnId,
        tamperedAmount: parseFloat(tamperAmount) || 99999.00,
      });
      setTamperStatusNotice({
        type: 'warning',
        message: `⚠️ Simulated Tamper Success: Transaction ${tamperTxnId} operational amount altered to £${tamperAmount} in MongoDB. Click "Run Ledger Integrity Check" to verify DAML state comparison.`,
      });
    } catch (err) {
      setTamperStatusNotice({
        type: 'error',
        message: err.response?.data?.error || 'Failed to simulate tampering. Check Txn ID.',
      });
    }
  };

  // Run Ledger Integrity Check & Verification
  const handleVerifyLedger = async () => {
    if (!tamperTxnId) return;
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const [verifyRes, historyRes] = await Promise.all([
        axios.post(`/api/chain/verify/${tamperTxnId}`),
        axios.get(`/api/chain/ledger-states/${tamperTxnId}`),
      ]);
      setVerificationResult(verifyRes.data);
      setLedgerStateHistory(historyRes.data || []);
      loadExplorerData();
    } catch (err) {
      setError('Failed to verify ledger integrity.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 lg:p-5 shadow-xl ring-1 ring-slate-200 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">🔎 Chain Explorer & Ledger Verification</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Consensus-validated audit trail across Canton ledger, Alpha, Beta, and Gamma.</p>
        </div>
        <button
          onClick={loadExplorerData}
          className="w-full rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 sm:w-auto"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      )}

      {/* POC Tamper Simulation & Verification Interactive Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h2 className="text-lg font-bold text-slate-100">POC Ledger Integrity Verification & Tamper Detection</h2>
            <p className="text-xs text-slate-400">Simulate database tampering and verify how signed-off DAML ledger states detect and repair unauthorized changes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Transaction ID to Verify / Tamper</label>
            <input
              type="text"
              placeholder="e.g. TXN-123456"
              value={tamperTxnId}
              onChange={(e) => setTamperTxnId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">POC Tamper Amount (£)</label>
            <input
              type="number"
              placeholder="99999.00"
              value={tamperAmount}
              onChange={(e) => setTamperAmount(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSimulateTamper}
              disabled={!tamperTxnId}
              className="flex-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 font-semibold py-2 px-3 rounded-xl transition-all text-xs disabled:opacity-50"
            >
              ⚠️ 1. Inject Tampered Data
            </button>
            <button
              onClick={handleVerifyLedger}
              disabled={!tamperTxnId || isVerifying}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2 px-3 rounded-xl shadow-lg transition-all text-xs disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : '🔍 2. Verify Ledger'}
            </button>
          </div>
        </div>

        {tamperStatusNotice && (
          <div className={`p-3 rounded-xl text-xs font-medium border ${
            tamperStatusNotice.type === 'warning'
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              : 'bg-red-950/60 border-red-500/40 text-red-300'
          }`}>
            {tamperStatusNotice.message}
          </div>
        )}

        {/* Verification Result Display */}
        {verificationResult && (
          <div className={`p-4 rounded-xl border text-sm space-y-2 ${
            verificationResult.tamperDetected
              ? 'bg-red-950/80 border-red-500/60 text-red-200 shadow-red-900/40 shadow-xl'
              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{verificationResult.tamperDetected ? '🚨' : '✅'}</span>
                <span className="font-bold text-base">
                  {verificationResult.tamperDetected ? 'TAMPER ATTEMPT DETECTED & REPAIRED' : 'LEDGER INTEGRITY VERIFIED'}
                </span>
              </div>
              <span className={`text-xs font-mono px-2 py-1 rounded font-bold ${
                verificationResult.tamperDetected ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {verificationResult.status}
              </span>
            </div>

            <p className="text-xs leading-relaxed">{verificationResult.message}</p>

            {verificationResult.discrepancies?.length > 0 && (
              <div className="bg-red-900/40 border border-red-800/60 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-red-300 uppercase tracking-wider">Detected Mismatches:</p>
                {verificationResult.discrepancies.map((disc, idx) => (
                  <p key={idx} className="text-xs font-mono text-red-200">• {disc}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chronological Ledger State History Timeline */}
        {ledgerStateHistory.length > 0 && (
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chronological DAML Ledger State Timeline</h4>
            <div className="flex flex-wrap gap-2">
              {ledgerStateHistory.map((st, idx) => (
                <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="font-mono font-semibold text-cyan-300">{st.state}</span>
                  {st.damlContractRef && (
                    <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                      {st.damlContractRef.substring(0, 14)}...
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {mempoolStatus && (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-500">Pending</p>
            <p className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400 leading-none mt-1">{mempoolStatus.pendingCount}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-500">Approved</p>
            <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none mt-1">{mempoolStatus.approvedCount}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-500">Rejected</p>
            <p className="text-xl font-extrabold text-red-700 dark:text-red-400 leading-none mt-1">{mempoolStatus.rejectedCount}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5">
            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-500">Total</p>
            <p className="text-xl font-extrabold text-slate-700 dark:text-slate-300 leading-none mt-1">{mempoolStatus.totalCount}</p>
          </div>
          <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-800/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-500">Next Block (s)</p>
            <p className="text-xl font-extrabold text-cyan-700 dark:text-cyan-400 leading-none mt-1">{mempoolStatus.nextBlockInSeconds}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-56 flex items-center justify-center text-slate-500 dark:text-slate-500">Loading explorer...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ChainColumn title="Alpha" blocks={alphaBlocks} onSelectBlock={handleSelectBlock} />
          <ChainColumn title="Beta" blocks={betaBlocks} onSelectBlock={handleSelectBlock} />
          <ChainColumn title="Gamma" blocks={gammaBlocks} onSelectBlock={handleSelectBlock} />
        </div>
      )}

      {/* Block Details Modal */}
      {selectedBlock && (
        <BlockDetailsModal
          block={selectedBlock}
          chainName={selectedChain}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
