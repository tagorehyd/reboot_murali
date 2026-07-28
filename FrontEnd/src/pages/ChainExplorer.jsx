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

  return (
    <div className="mx-auto w-full max-w-7xl bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 lg:p-5 shadow-xl ring-1 ring-slate-200">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">🔎 Chain Explorer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-0.5">Consensus-validated audit trail across Alpha, Beta, Gamma.</p>
        </div>
        <button
          onClick={loadExplorerData}
          className="w-full rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 sm:w-auto"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      )}

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
