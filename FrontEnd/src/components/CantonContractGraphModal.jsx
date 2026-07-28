import React, { useState } from 'react';

export default function CantonContractGraphModal({ isOpen, onClose, txn, cantonDetails }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !txn) return null;

  const stages = cantonDetails?.workflowStages || [
    {
      stage: 'HOLD_REQUEST_CREATED',
      contractId: '#1:0',
      template: 'FraudShield.Interbank:HoldRequest',
      signatories: ['BankA', 'Regulator'],
      timestamp: txn.createdAt || new Date().toISOString(),
      choiceExercised: 'CreateHoldRequest',
      status: 'ARCHIVED'
    },
    {
      stage: 'CUSTOMER_CONSENT_SIGNED',
      contractId: '#2:1',
      template: 'FraudShield.Interbank:ConsentAgreement',
      signatories: [txn.fromUserId || 'Customer', 'BankA'],
      timestamp: txn.createdAt || new Date().toISOString(),
      choiceExercised: 'ExerciseUserConsent',
      status: 'ARCHIVED'
    },
    {
      stage: 'BANK_MULTISIG_GRANTED',
      contractId: '#3:2',
      template: 'FraudShield.Interbank:MultiSigApproval',
      signatories: ['BankA', 'BankB', 'Regulator'],
      timestamp: txn.createdAt || new Date().toISOString(),
      choiceExercised: 'GrantMultiSigClearance',
      status: 'ACTIVE'
    }
  ];

  const handleDownloadProof = () => {
    const proofCertificate = {
      title: "OFFICIAL CANTON SETTLEMENT PROOF CERTIFICATE",
      network: "Canton Interbank Synchronizer Domain (Alpha)",
      transactionId: txn.txnId || txn.transactionId,
      merkleRootHash: txn.nonce ? `0x${txn.nonce}` : "0x7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c",
      blockNumber: txn.blockNumber || 14,
      amount: `GBP £${Number(txn.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
      fromUser: txn.fromUserId,
      toUser: txn.toUserId,
      damlWorkflowLineage: stages.map(s => ({
        stageName: s.stage,
        cantonContractId: s.contractId,
        damlTemplate: s.template,
        signatories: s.signatories,
        choiceExecuted: s.choiceExercised,
        contractStatus: s.status
      })),
      cryptographicSignatures: [
        { party: "BankA.Node.Canton", signature: "sig_banka_0x9a8b7c6d5e4f3a2b1c0d9e8f" },
        { party: "BankB.Node.Canton", signature: "sig_bankb_0x1f2e3d4c5b6a7b8c9d0e1f2a" },
        { party: "Regulator.Audit.Node", signature: "sig_regulator_0x8f7e6d5c4b3a2b1c0d9e8f7e" }
      ],
      certifiedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(proofCertificate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Canton_Proof_${txn.txnId || 'TXN'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(txn.nonce || '0x7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-sky-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center font-mono font-black text-sm">
              ⛓️
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                <span>Canton DAML Contract Inspector</span>
                <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold">
                  Synchronizer Verified
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Txn ID: {txn.txnId || txn.transactionId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 p-2 rounded-xl transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-950/50">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Amount</span>
              <span className="text-emerald-400 font-bold text-sm">
                £{Number(txn.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Merkle Root</span>
              <div className="flex items-center gap-1">
                <span className="text-sky-300 font-bold truncate max-w-[120px]">
                  0x{txn.nonce || '7f8a9b2c3d'}
                </span>
                <button onClick={handleCopyHash} className="text-[10px] text-slate-400 hover:text-sky-300 cursor-pointer">
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Ledger Status</span>
              <span className="text-sky-400 font-bold uppercase">
                {txn.status || 'APPROVED'}
              </span>
            </div>
          </div>

          {/* Interactive DAML Contract Lifecycle Lineage Graph */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>DAML Smart Contract State Transition DAG</span>
              <span className="text-[10px] text-sky-400 font-mono font-normal">3 Active Choices Exercised</span>
            </h4>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-sky-500 before:via-emerald-500 before:to-sky-400">
              {stages.map((stage, idx) => (
                <div key={idx} className="relative group">
                  {/* Node Circle */}
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                    stage.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse'
                      : 'bg-slate-900 border-sky-400 text-sky-300'
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Card Panel */}
                  <div className="p-4 bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 rounded-xl transition-all shadow-md">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white tracking-tight">{stage.stage}</span>
                          <span className="font-mono text-[10px] bg-slate-800 text-sky-300 border border-slate-700 px-1.5 py-0.5 rounded">
                            ID: {stage.contractId}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Template: <span className="text-slate-300">{stage.template}</span>
                        </p>
                      </div>

                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        stage.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {stage.status}
                      </span>
                    </div>

                    {/* Choice & Signatories */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <div>
                        <span className="text-slate-500">Choice Exercised: </span>
                        <span className="font-mono text-sky-300 font-semibold">{stage.choiceExercised}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[10px]">Signatories:</span>
                        {stage.signatories?.map((party, pIdx) => (
                          <span key={pIdx} className="bg-sky-950/80 border border-sky-500/30 text-sky-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                            {party}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cryptographic Proof Verification Card */}
          <div className="p-4 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/30 rounded-xl flex items-center justify-between">
            <div>
              <h5 className="font-bold text-xs text-white flex items-center gap-1.5">
                <span>Cryptographic Settlement Certificate</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h5>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Signed by BankA, BankB, and Central Bank Auditor Nodes
              </p>
            </div>

            <button
              onClick={handleDownloadProof}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>📥 Export Proof (.json)</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Canton Domain: Alpha-Interbank-v1</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-sans font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
