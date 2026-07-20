import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BlockDetailsModal from '../components/BlockDetailsModal';

function ChainColumn({ title, blocks, onSelectBlock }) {
  const theme = {
    Alpha: {
      card: 'bg-cyan-50 border-cyan-200',
      heading: 'text-cyan-800',
      block: 'bg-cyan-50/50 border-cyan-200',
      trigger: 'bg-cyan-100 text-cyan-800',
    },
    Beta: {
      card: 'bg-emerald-50 border-emerald-200',
      heading: 'text-emerald-800',
      block: 'bg-emerald-50/50 border-emerald-200',
      trigger: 'bg-emerald-100 text-emerald-800',
    },
    Gamma: {
      card: 'bg-fuchsia-50 border-fuchsia-200',
      heading: 'text-fuchsia-800',
      block: 'bg-fuchsia-50/50 border-fuchsia-200',
      trigger: 'bg-fuchsia-100 text-fuchsia-800',
    },
  }[title] || {
    card: 'bg-white border-slate-200',
    heading: 'text-slate-900',
    block: 'bg-slate-50 border-slate-200',
    trigger: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className={`border rounded-xl p-4 shadow-sm ${theme.card}`}>
      <h3 className={`text-lg font-extrabold mb-3 ${theme.heading}`}>{title}</h3>
      {blocks.length === 0 ? (
        <p className="text-sm text-slate-500">No blocks found.</p>
      ) : (
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {blocks.map((block) => (
            <button
              key={`${title}-${block.blockNumber}`}
              onClick={() => onSelectBlock(block, title)}
              className={`w-full text-left border rounded-lg p-3 ${theme.block} hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-slate-500">Block #{block.blockNumber}</p>
                <span className={`text-xs font-bold px-2 py-1 rounded ${theme.trigger}`}>
                  {block.triggerType || 'UNKNOWN'}
                </span>
              </div>
              <p className="text-xs text-slate-600 break-all">
                <span className="font-semibold">Hash:</span> {block.blockHash.substring(0, 20)}...
              </p>
              <p className="text-xs text-slate-600 break-all mt-1">
                <span className="font-semibold">Prev:</span> {block.previousHash.substring(0, 20)}...
              </p>
              <p className="text-xs text-slate-600 break-all mt-1">
                <span className="font-semibold">Merkle:</span> {block.merkleRoot.substring(0, 20)}...
              </p>
              <p className="text-xs text-slate-700 mt-2 font-semibold">
                Txns: {block.transactions?.length || 0}
              </p>
              <p className="text-xs text-blue-600 mt-2 font-semibold">Click to view details →</p>
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
    <div className="mx-auto w-full max-w-7xl overflow-hidden bg-white rounded-2xl p-4 shadow-xl ring-1 ring-slate-200 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">🔎 Chain Explorer</h1>
          <p className="text-slate-500 mt-1">Consensus-validated audit trail across Alpha, Beta, Gamma.</p>
        </div>
        <button
          onClick={loadExplorerData}
          className="w-full rounded-lg bg-slate-800 px-4 py-2 font-bold text-white transition-colors hover:bg-slate-700 sm:w-auto"
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
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-2xl font-extrabold text-indigo-700">{mempoolStatus.pendingCount}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
            <p className="text-xs text-slate-500">Approved</p>
            <p className="text-2xl font-extrabold text-emerald-700">{mempoolStatus.approvedCount}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <p className="text-xs text-slate-500">Rejected</p>
            <p className="text-2xl font-extrabold text-red-700">{mempoolStatus.rejectedCount}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-extrabold text-slate-700">{mempoolStatus.totalCount}</p>
          </div>
          <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-3">
            <p className="text-xs text-slate-500">Next Block (s)</p>
            <p className="text-2xl font-extrabold text-cyan-700">{mempoolStatus.nextBlockInSeconds}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-56 flex items-center justify-center text-slate-500">Loading explorer...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
