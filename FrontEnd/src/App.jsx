import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from './components/Layout'
import UserPortal from './pages/UserPortal'
import AdminConsole from './pages/AdminConsole'
import ChainExplorer from './pages/ChainExplorer'
import SuspiciousTransactions from './pages/SuspiciousTransactions'
import NvidiaNimChatbot from './components/NvidiaNimChatbot'
import SystemDashboard from './pages/SystemDashboard'
import UserHistory from './pages/UserHistory'

const DEMO_USERS = [
  { id: 'U001', name: 'Alice Walker', bank: 'Stellar Bank', color: 'from-[#00A865] to-teal-600' },
  { id: 'U002', name: 'Bob Taylor', bank: 'Nova Finance', color: 'from-[#A3E3AB] to-[#00A865]' },
  { id: 'U003', name: 'Carlos Rivera', bank: 'Prime Banking', color: 'from-[#00A865] to-emerald-700' },
  { id: 'U004', name: 'Diana Prince', bank: 'Apex Trust', color: 'from-[#A3E3AB] to-teal-500' },
  { id: 'U005', name: 'Eve Chen', bank: 'Quantum Pay', color: 'from-[#00A865] to-teal-800' },
  { id: 'U006', name: 'Frank Okafor', bank: 'Gold Standard', color: 'from-[#A3E3AB] to-emerald-600' },
  { id: 'U007', name: 'Grace Okonkwo', bank: 'Liberty Banking', color: 'from-[#00A865] to-emerald-800' },
]

export default function App() {
  const [health, setHealth] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [chatStatus, setChatStatus] = useState(null)
  const [view, setView] = useState('home')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userBalances, setUserBalances] = useState({})
  const [accountViewMode, setAccountViewMode] = useState('grid')

  const fetchServiceStatuses = async () => {
    try {
      const [healthRes, readyRes, chatRes] = await Promise.all([
        axios.get('/health').catch(() => ({ data: { status: 'DOWN', application: 'FraudShield' } })),
        axios.get('/ready').catch(() => ({ data: { status: 'DOWN', mongo: 'DOWN', canton: { status: 'DOWN' } } })),
        axios.get('/api/chat/status').catch(() => ({ data: { status: 'DOWN', configured: false } })),
      ]);

      setHealth(healthRes.data);
      setReadiness(readyRes.data);
      setChatStatus(chatRes.data);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    }
  };

  useEffect(() => {
    fetchServiceStatuses();
    const interval = setInterval(fetchServiceStatuses, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchBalances = async () => {
    try {
      const res = await axios.get('/api/users/all');
      const balanceMap = {};
      const users = res.data || [];
      
      await Promise.all(users.map(async (u) => {
        if (u?.id) {
          try {
            const balRes = await axios.get(`/api/admin/balance/${u.id}`);
            balanceMap[u.id] = Number(balRes.data.balance || 0);
          } catch (e) {
            balanceMap[u.id] = Number(u.balance || 0);
          }
        }
      }));
      
      setUserBalances(balanceMap);
    } catch (err) {
      console.error('Failed to load user balances:', err);
    }
  }

  useEffect(() => {
    fetchBalances()
    const interval = setInterval(fetchBalances, 3000)
    return () => clearInterval(interval)
  }, [])

  const renderUserCardsScreen = () => {
    return (
      <div className="max-w-6xl mx-auto space-y-6 select-none font-sans">
        <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-4">
          <div>
            <h1 className="text-3xl font-black text-[#111827] font-heading flex items-center gap-3">
              <span>👤</span> Select Active Customer Profile
            </h1>
            <p className="text-sm text-[#111827]/70 mt-1">
              Choose a customer account profile to initiate DAML interbank transfers, consent choices, and view history.
            </p>
          </div>
          
          <div className="flex items-center bg-white p-1 rounded-xl gap-1 border border-[#CBD5E1]">
            <button
              onClick={() => setAccountViewMode('grid')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                accountViewMode === 'grid'
                  ? 'bg-[#00A865] text-white shadow-sm'
                  : 'text-[#111827] hover:text-[#00A865]'
              }`}
            >
              <span>🔲</span> Grid View
            </button>
            <button
              onClick={() => setAccountViewMode('table')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                accountViewMode === 'table'
                  ? 'bg-[#00A865] text-white shadow-sm'
                  : 'text-[#111827] hover:text-[#00A865]'
              }`}
            >
              <span>📑</span> Table View
            </button>
          </div>
        </div>

        {accountViewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {DEMO_USERS.map((user) => {
              const liveBalance = userBalances[user.id] !== undefined ? userBalances[user.id] : 0;
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user.id);
                    setView('user-portal');
                  }}
                  className="group text-left transition-all transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none"
                >
                  <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 h-full flex flex-col justify-between shadow-sm group-hover:border-[#00A865] transition-all">
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#00A865] text-white flex items-center justify-center font-black text-xl shadow-sm transform group-hover:rotate-6 transition-transform">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-[#00A865] uppercase tracking-widest">{user.id}</p>
                          <p className="text-lg font-black text-[#111827] font-heading leading-tight">{user.name}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#CBD5E1]">
                        <p className="text-[10px] text-[#111827]/60 uppercase tracking-widest font-bold">Banking Institution</p>
                        <p className="text-sm font-bold text-[#111827] mt-0.5">{user.bank}</p>
                      </div>

                      <div className="bg-[#ECEEEF] rounded-xl p-4 mt-4 border border-[#CBD5E1]">
                        <p className="text-[10px] text-[#111827]/60 uppercase tracking-widest font-bold">Available Balance</p>
                        <p className="text-2xl font-black text-[#00A865] mt-1 font-mono tracking-tight">
                          £{Number(liveBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[#00A865] mt-4 font-bold transition-colors">
                      <span className="text-xs uppercase tracking-wider">Access Payment Portal</span>
                      <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white text-[#111827] rounded-2xl shadow-sm border border-[#CBD5E1] overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#ECEEEF] text-xs uppercase font-extrabold text-[#111827]/70 border-b border-[#CBD5E1]">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Institution</th>
                  <th className="px-6 py-4 text-right">Available Balance</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBD5E1]">
                {DEMO_USERS.map((user) => {
                  const liveBalance = userBalances[user.id] !== undefined ? userBalances[user.id] : 0;
                  return (
                    <tr 
                      key={user.id} 
                      onClick={() => {
                        setSelectedUser(user.id);
                        setView('user-portal');
                      }}
                      className="hover:bg-[#A3E3AB]/20 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#00A865] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-[#111827] font-heading text-base">{user.name}</p>
                            <p className="text-xs text-[#00A865] font-bold uppercase tracking-widest">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-[#111827]">{user.bank}</td>
                      <td className="px-6 py-4 text-right font-black text-[#00A865] font-mono text-base">
                        £{Number(liveBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="px-4 py-1.5 bg-[#00A865] text-white rounded-xl font-bold hover:bg-[#008f53] transition-all text-xs cursor-pointer">
                          Access Portal →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (view === 'users' || view === 'user-select' || view === 'select-account') {
      return renderUserCardsScreen();
    }

    if (view === 'user-portal' || view === 'portal') {
      return <UserPortal userId={selectedUser || 'U001'} userBalances={userBalances} onBalanceUpdate={fetchBalances} />;
    }

    if (view === 'user-history') {
      return <UserHistory selectedUserId={selectedUser} onSelectUser={setSelectedUser} userBalances={userBalances} />;
    }

    if (view === 'admin') {
      return <AdminConsole onBalanceUpdate={fetchBalances} />;
    }

    if (view === 'dashboard') {
      return <SystemDashboard />;
    }

    if (view === 'explorer' || view === 'chain') {
      return <ChainExplorer />;
    }

    if (view === 'suspicious') {
      return <SuspiciousTransactions />;
    }

    return renderHome();
  }

  const renderHome = () => {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#ECEEEF] text-[#111827] p-3 sm:p-4 gap-3 font-sans select-none">
        {/* Compact Banner Header */}
        <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[#111827] font-heading flex items-center gap-2">
                Lloyds Technology Centre — Fraud Defense Platform
              </h1>
              <p className="text-[11px] text-[#111827]/70">
                Tamper-evident interbank fraud prevention & Canton consensus-validated audit trail
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#A3E3AB] text-[#031D0E] px-3 py-1 rounded-full shadow-xs">
            <div className="w-2 h-2 rounded-full bg-[#00A865] animate-ping"></div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>

        {/* Main Single Viewport Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
          
          {/* Left 5 Cols: Platform Overview & Ecosystem Navigation */}
          <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
            {/* Canton Blockchain Feature Card - Crisp White / Mint */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm flex-1 flex flex-col justify-between min-h-0">
              <div>
                <h3 className="text-xs font-black text-[#111827] font-heading uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="text-[#00A865]">⛓️</span> Canton DAML Ledger Integration
                </h3>
                <p className="text-[11px] text-[#111827]/80 mb-3 leading-relaxed">
                  Permanent, tamper-evident recording of interbank payments, consent choices, and escrow holds.
                </p>
                <ul className="space-y-2 text-[11px] text-[#111827]">
                  <li className="flex items-center gap-2">
                    <span className="text-[#00A865] font-bold">✓</span>
                    <span><strong>Consensus Validated:</strong> BFT node verification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#00A865] font-bold">✓</span>
                    <span><strong>Immutable Audit Trail:</strong> Signed DAML choices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#00A865] font-bold">✓</span>
                    <span><strong>Smart Contracts:</strong> Multi-sig risk approvals</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Navigation Quick Links */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm flex-1 flex flex-col justify-between min-h-0">
              <h3 className="text-xs font-black text-[#111827] font-heading uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🚀</span> Ecosystem Navigation
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button onClick={() => setView('users')} className="p-2.5 rounded-xl bg-[#ECEEEF] border border-[#CBD5E1] text-left hover:border-[#00A865] transition-colors cursor-pointer">
                  <span className="font-extrabold text-[#00A865]">💳 User Cards</span>
                  <p className="text-[9px] text-[#111827]/70">7 Customer Profiles</p>
                </button>
                <button onClick={() => setView('admin')} className="p-2.5 rounded-xl bg-[#ECEEEF] border border-[#CBD5E1] text-left hover:border-[#00A865] transition-colors cursor-pointer">
                  <span className="font-extrabold text-[#00A865]">👮‍♂️ Admin Console</span>
                  <p className="text-[9px] text-[#111827]/70">Review compliance holds</p>
                </button>
                <button onClick={() => setView('explorer')} className="p-2.5 rounded-xl bg-[#ECEEEF] border border-[#CBD5E1] text-left hover:border-[#00A865] transition-colors cursor-pointer">
                  <span className="font-extrabold text-[#00A865]">🔎 Chain Explorer</span>
                  <p className="text-[9px] text-[#111827]/70">Block audit graph</p>
                </button>
                <button onClick={() => setView('suspicious')} className="p-2.5 rounded-xl bg-[#ECEEEF] border border-[#CBD5E1] text-left hover:border-[#00A865] transition-colors cursor-pointer">
                  <span className="font-extrabold text-[#00A865]">⚠️ Suspicious Txns</span>
                  <p className="text-[9px] text-[#111827]/70">8D Isolation Forest flags</p>
                </button>
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Infrastructure Telemetry Grid */}
          <div className="lg:col-span-7 bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-2 mb-2">
              <h2 className="text-xs font-black text-[#111827] font-heading uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00A865] animate-ping"></span>
                System Infrastructure Telemetry
              </h2>
              <span className="px-2.5 py-0.5 bg-[#A3E3AB] text-[#031D0E] rounded-full text-[9px] font-mono font-bold">
                ALL SYSTEMS UP ✓
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-sans text-xs flex-1 min-h-0">
              <div className="p-3 bg-[#ECEEEF] border border-[#CBD5E1] rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-[#111827] flex items-center gap-1">⚙️ Backend API</span>
                  <span className="text-[8px] font-bold font-mono text-white bg-[#00A865] px-1.5 py-0.5 rounded">
                    {health?.status || 'UP'} ✓
                  </span>
                </div>
                <p className="text-[9px] text-[#111827]/70 mt-1">Spring Boot Java 17</p>
                <div className="pt-1.5 border-t border-[#CBD5E1] text-[9px] font-mono flex justify-between text-[#111827]/60 mt-2">
                  <span>Port:</span>
                  <span className="text-[#111827] font-bold">8080</span>
                </div>
              </div>

              <div className="p-3 bg-[#ECEEEF] border border-[#CBD5E1] rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-[#111827] flex items-center gap-1">⛓️ Canton Ledger</span>
                  <span className="text-[8px] font-bold font-mono text-white bg-[#00A865] px-1.5 py-0.5 rounded">
                    {readiness?.canton?.status || 'READY'} ✓
                  </span>
                </div>
                <p className="text-[9px] text-[#111827]/70 mt-1">BFT Consensus Engine</p>
                <div className="pt-1.5 border-t border-[#CBD5E1] text-[9px] font-mono flex justify-between text-[#111827]/60 mt-2">
                  <span>Domain:</span>
                  <span className="text-[#111827] font-bold">Alpha-v1</span>
                </div>
              </div>

              <div className="p-3 bg-[#ECEEEF] border border-[#CBD5E1] rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-[#111827] flex items-center gap-1">🧠 ML Engine</span>
                  <span className="text-[8px] font-bold font-mono text-white bg-[#00A865] px-1.5 py-0.5 rounded">
                    ACTIVE ✓
                  </span>
                </div>
                <p className="text-[9px] text-[#111827]/70 mt-1">Isolation Forest 8D</p>
                <div className="pt-1.5 border-t border-[#CBD5E1] text-[9px] font-mono flex justify-between text-[#111827]/60 mt-2">
                  <span>Vector:</span>
                  <span className="text-[#111827] font-bold">8D Model</span>
                </div>
              </div>

              <div className="p-3 bg-[#ECEEEF] border border-[#CBD5E1] rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-[#111827] flex items-center gap-1">🗄️ MongoDB</span>
                  <span className="text-[8px] font-bold font-mono text-white bg-[#00A865] px-1.5 py-0.5 rounded">
                    {readiness?.mongo || 'UP'} ✓
                  </span>
                </div>
                <p className="text-[9px] text-[#111827]/70 mt-1">Persistent Ledger DB</p>
                <div className="pt-1.5 border-t border-[#CBD5E1] text-[9px] font-mono flex justify-between text-[#111827]/60 mt-2">
                  <span>Port:</span>
                  <span className="text-[#111827] font-bold">27017</span>
                </div>
              </div>

              <div className="p-3 bg-[#ECEEEF] border border-[#CBD5E1] rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-[#111827] flex items-center gap-1">🤖 NVIDIA NIM</span>
                  <span className="text-[8px] font-bold font-mono text-white bg-[#00A865] px-1.5 py-0.5 rounded">
                    {chatStatus?.status || 'UP'} ✓
                  </span>
                </div>
                <p className="text-[9px] text-[#111827]/70 mt-1">Nemotron AI Assistant</p>
                <div className="pt-1.5 border-t border-[#CBD5E1] text-[9px] font-mono flex justify-between text-[#111827]/60 mt-2">
                  <span>RAG:</span>
                  <span className="text-[#111827] font-bold">Active</span>
                </div>
              </div>

              <div className="p-3 bg-[#ECEEEF] border border-[#CBD5E1] rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-[#111827] flex items-center gap-1">🌐 Gateways</span>
                  <span className="text-[8px] font-bold font-mono text-white bg-[#00A865] px-1.5 py-0.5 rounded">
                    3 / 3 OK ✓
                  </span>
                </div>
                <p className="text-[9px] text-[#111827]/70 mt-1">Bank JSON API Routers</p>
                <div className="pt-1.5 border-t border-[#CBD5E1] text-[9px] font-mono flex justify-between text-[#111827]/60 mt-2">
                  <span>Routing:</span>
                  <span className="text-[#111827] font-bold">BankA/B/C</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout currentView={view} onNavigate={setView}>
      {renderContent()}
      <NvidiaNimChatbot />
    </Layout>
  )
}
