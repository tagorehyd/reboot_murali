import React, { useEffect, useState } from 'react';
import axios from 'axios';

const DEMO_USERS = [
  { id: 'U001', name: 'Alice Walker', bank: 'Stellar Bank', color: 'from-emerald-400 to-emerald-500' },
  { id: 'U002', name: 'Bob Taylor', bank: 'Nova Finance', color: 'from-blue-400 to-blue-500' },
  { id: 'U003', name: 'Carlos Rivera', bank: 'Prime Banking', color: 'from-purple-400 to-purple-500' },
  { id: 'U004', name: 'Diana Prince', bank: 'Apex Trust', color: 'from-cyan-400 to-cyan-500' },
  { id: 'U005', name: 'Eve Chen', bank: 'Quantum Pay', color: 'from-pink-400 to-pink-500' },
  { id: 'U006', name: 'Frank Okafor', bank: 'Gold Standard', color: 'from-amber-400 to-amber-500' },
  { id: 'U007', name: 'Grace Okonkwo', bank: 'Liberty Banking', color: 'from-red-400 to-red-500' },
];

export default function UserHistory({ selectedUserId, onSelectUser }) {
  const [activeUser, setActiveUser] = useState(selectedUserId || 'U001');
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('WORKFLOW'); // 'WORKFLOW' | 'GRID' | 'TABLE'
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [cantonDetailsMap, setCantonDetailsMap] = useState({});

  // Fetch transaction history for activeUser
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/users/${activeUser}/history`);
      const items = res.data || [];
      setHistoryItems(items);
      if (items.length > 0) {
        setSelectedTxn(items[0]);
      } else {
        setSelectedTxn(null);
      }
    } catch (err) {
      console.error('Failed to load user history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [activeUser]);

  // Fetch Canton details when selectedTxn changes
  useEffect(() => {
    if (!selectedTxn) return;
    const txnId = selectedTxn.txnId || selectedTxn.id;
    if (!txnId || cantonDetailsMap[txnId]) return;

    axios.get(`/api/chain/txn/${txnId}/canton-details`)
      .then(res => {
        setCantonDetailsMap(prev => ({ ...prev, [txnId]: res.data }));
      })
      .catch(err => console.error('Failed to load Canton details for txn', txnId, err));
  }, [selectedTxn]);

  const activeUserInfo = DEMO_USERS.find(u => u.id === activeUser) || DEMO_USERS[0];
  const activeCantonData = selectedTxn ? cantonDetailsMap[selectedTxn.txnId || selectedTxn.id] : null;

  // Construct Git Workflow Commits for selectedTxn
  const gitCommits = (activeCantonData?.ledgerStates && activeCantonData.ledgerStates.length > 0)
    ? activeCantonData.ledgerStates.map((st, idx) => ({
        sha: `commit ${(selectedTxn?.txnId || selectedTxn?.id || 'hash').replace(/[^a-f0-9]/gi, '').substring(0, 5) || '0a1f'}${idx}f`,
        branch: idx === 0 ? 'main' : idx === activeCantonData.ledgerStates.length - 1 ? 'main (merged)' : `feature/consent-step-${idx}`,
        title: st.state || `DAML Event ${idx + 1}`,
        desc: st.remarks || st.details || 'DAML Contract Choice Executed',
        author: st.actorRole || 'Party_User',
        bank: st.originatingBank || activeCantonData.originatingBank || 'BankA',
        contractRef: st.damlContractRef || `FraudShield:${st.state || 'Contract'}`,
        timestamp: st.timestamp ? new Date(st.timestamp).toLocaleString() : 'Recent',
        status: 'VERIFIED_COMMIT ✓',
      }))
    : [
        { sha: 'commit 0a1f8c2', branch: 'main', title: 'TXN_CREATED', desc: 'Hold request created on ledger', author: selectedTxn?.fromUserId || 'Sender', bank: 'BankA', contractRef: 'FraudShield:HoldRequest', status: 'VERIFIED_COMMIT ✓' },
        { sha: 'commit 1b3d9e4', branch: 'feature/user-consent', title: 'USER_CONSENT_RECEIVED', desc: 'Explicit customer consent signature attached', author: (selectedTxn?.fromUserId || 'Sender') + '_Party', bank: 'BankA', contractRef: 'FraudShield:HoldRequestChoice', status: 'VERIFIED_COMMIT ✓' },
        { sha: 'commit 2c5a1f6', branch: 'feature/admin-approval', title: 'ADMIN_APPROVAL_GRANTED', desc: 'Originating bank multi-sig clearance granted', author: 'BankA_Admin', bank: 'BankA', contractRef: 'FraudShield:MultiSigApproval', status: 'VERIFIED_COMMIT ✓' },
        { sha: 'commit 3d7b2c8', branch: 'feature/escrow-hold', title: 'ESCROW_HOLD_CREATED', desc: 'Recipient bank escrow agreement established', author: 'BankB_Clearing', bank: 'BankB', contractRef: 'FraudShield:EscrowAgreement', status: 'VERIFIED_COMMIT ✓' },
        { sha: 'commit 4e9f3a0', branch: 'main (HEAD)', title: 'SETTLEMENT_COMPLETED', desc: 'Atomic interbank settlement committed', author: 'GlobalSynchronizer', bank: 'CantonNetwork', contractRef: 'FraudShield:SettlementAuthorization', status: 'COMMITTED_HEAD ✓' },
      ];

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 space-y-6">
      {/* Top Header & User Selector Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📜</span> User Payment History & Git DAML Workflow Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Dedicated audit trail for customer transactions with interactive Git-style DAML contract DAG branch workflows.
          </p>
        </div>

        {/* User Switcher Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {DEMO_USERS.map(u => (
            <button
              key={u.id}
              onClick={() => {
                setActiveUser(u.id);
                if (onSelectUser) onSelectUser(u.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeUser === u.id
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {u.name} ({u.id})
            </button>
          ))}
        </div>
      </div>

      {/* User Overview Bar & Layout Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeUserInfo.color} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
            {activeUserInfo.name[0]}
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{activeUserInfo.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{activeUserInfo.bank} · Account ID: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{activeUserInfo.id}</strong></p>
          </div>
        </div>

        {/* Layout Mode Selector */}
        <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          {[
            { id: 'WORKFLOW', label: '🌿 Git DAG Workflow', icon: '🌿' },
            { id: 'GRID', label: '📇 Card Grid', icon: '📇' },
            { id: 'TABLE', label: '📊 Data Table', icon: '📊' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === m.id
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          Loading user history and DAML contract ledger states...
        </div>
      ) : historyItems.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2">
          <p className="text-3xl">📜</p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">No payment history found for {activeUserInfo.name}.</p>
          <p className="text-xs text-slate-400">Transactions submitted by this user will appear here with Git DAG contract workflows.</p>
        </div>
      ) : (
        <div>
          {/* MODE 1: DEDICATED GIT DAG WORKFLOW CENTER */}
          {viewMode === 'WORKFLOW' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: User Transaction List Selector */}
              <div className="lg:col-span-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Transactions ({historyItems.length})</span>
                  <span className="text-[10px] text-indigo-500 font-semibold">Select to view DAG</span>
                </h3>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {historyItems.map((item) => {
                    const isSelected = selectedTxn?.id === item.id || selectedTxn?.txnId === item.txnId;
                    const isOut = item.direction === 'OUT';

                    return (
                      <div
                        key={item.id || item.txnId}
                        onClick={() => setSelectedTxn(item)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/30 border-indigo-400 dark:border-indigo-700 ring-2 ring-indigo-500/20 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOut ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {isOut ? '📤 Payment Out' : '📥 Payment In'}
                          </span>
                          <span className={`text-sm font-black ${isOut ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isOut ? '-' : '+'}£{Number(item.amount).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200">To: {item.counterpartyName || item.counterparty}</span>
                          <span className="font-mono text-[10px] text-slate-400">{item.txnId || item.id}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Dedicated Interactive Git DAG Workflow Graph Inspector */}
              <div className="lg:col-span-8 space-y-6">
                {selectedTxn ? (
                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
                    {/* Header Spec Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🌿</span>
                          <h3 className="text-base font-black text-white">Git Workflow DAG: <span className="font-mono text-cyan-300">{selectedTxn.txnId || selectedTxn.id}</span></h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">DAML Smart Contract & Consent step-by-step commit history</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">Amount</span>
                          <span className="font-bold text-emerald-400 text-sm">£{selectedTxn.amount}</span>
                        </div>
                        <div className="border-l border-slate-800 pl-4">
                          <span className="text-[10px] text-slate-500 uppercase block">Ledger Status</span>
                          <span className="font-bold text-indigo-400 text-sm">{selectedTxn.status || 'COMMITTED'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Commit Graph Nodes */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span>🔀</span> Commit DAG Branch History ({gitCommits.length} Commits)
                      </h4>

                      <div className="relative pl-8 space-y-4 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-1 before:bg-gradient-to-b before:from-indigo-500 before:via-cyan-500 before:to-emerald-500">
                        {gitCommits.map((commit, cIdx) => (
                          <div
                            key={cIdx}
                            className="relative p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2"
                          >
                            {/* Dot */}
                            <div className="absolute -left-8 top-5 w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-900 ring-4 ring-cyan-500/20"></div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-cyan-300">{commit.sha}</span>
                                <span className="text-[10px] font-mono bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                                  {commit.branch}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                                {commit.status}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs font-bold text-white">{commit.title}</p>
                              <p className="text-xs text-slate-300">{commit.desc}</p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-700/40 font-mono">
                              <span>DAML Contract: <strong className="text-indigo-300">{commit.contractRef}</strong></span>
                              <span>Author: <strong className="text-slate-200">{commit.author} ({commit.bank})</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 text-slate-400 rounded-2xl p-12 text-center border border-slate-800 text-xs">
                    Select a transaction from the left queue to view its Git DAML workflow graph.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: CARD GRID VIEW */}
          {viewMode === 'GRID' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {historyItems.map((item) => {
                const isOut = item.direction === 'OUT';
                return (
                  <div key={item.id || item.txnId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isOut ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {isOut ? '📤' : '📥'}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{isOut ? 'Payment Out' : 'Payment In'}</p>
                          <p className="text-[10px] text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}</p>
                        </div>
                      </div>
                      <span className={`text-base font-extrabold ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isOut ? '-' : '+'}£{Number(item.amount).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
                      <span className="text-slate-400">Counterparty:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.counterpartyName || item.counterparty}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-400">
                      <span>Txn: {item.txnId || item.id}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.status || 'COMMITTED'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE 3: DATA TABLE VIEW */}
          {viewMode === 'TABLE' && (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Date / Time</th>
                    <th className="px-4 py-3">Txn ID</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Counterparty</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyItems.map((item) => (
                    <tr key={item.id || item.txnId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono">{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.txnId || item.id}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          item.direction === 'OUT' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {item.direction === 'OUT' ? 'OUT' : 'IN'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold">{item.counterpartyName || item.counterparty}</td>
                      <td className="px-4 py-3 font-bold">£{Number(item.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{item.status || 'COMMITTED'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
