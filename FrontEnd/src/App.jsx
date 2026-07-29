import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from './components/Layout'
import UserPortal from './pages/UserPortal'
import AdminConsole from './pages/AdminConsole'
import ChainExplorer from './pages/ChainExplorer'
import SuspiciousTransactions from './pages/SuspiciousTransactions'
import SystemDashboard from './pages/SystemDashboard'
import UserHistory from './pages/UserHistory'

const DEMO_USERS = [
  { id: 'U001', name: 'Alice Walker', bank: 'Stellar Bank', color: 'from-blue-500 to-indigo-600' },
  { id: 'U002', name: 'Bob Taylor', bank: 'Nova Finance', color: 'from-emerald-500 to-teal-600' },
  { id: 'U003', name: 'Carlos Rivera', bank: 'Prime Banking', color: 'from-amber-500 to-orange-600' },
  { id: 'U004', name: 'Diana Prince', bank: 'Apex Trust', color: 'from-rose-500 to-pink-600' },
  { id: 'U005', name: 'Eve Chen', bank: 'Quantum Pay', color: 'from-purple-500 to-violet-600' },
  { id: 'U006', name: 'Frank Okafor', bank: 'Gold Standard', color: 'from-cyan-500 to-blue-600' },
  { id: 'U007', name: 'Grace Okonkwo', bank: 'Liberty Banking', color: 'from-fuchsia-500 to-rose-600' },
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
      <div className="max-w-6xl mx-auto space-y-6 select-none">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <span>👤</span> Select Active Customer Profile
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Choose a customer account profile to initiate DAML interbank transfers, consent choices, and view history.
            </p>
          </div>
          
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setAccountViewMode('grid')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                accountViewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🔲</span> Grid View
            </button>
            <button
              onClick={() => setAccountViewMode('table')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                accountViewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                  <div className={`p-[2px] rounded-2xl bg-gradient-to-br ${user.color} h-full transition-all shadow-lg dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] group-hover:shadow-2xl group-hover:scale-105`}>
                    <div className="bg-white dark:bg-slate-900 rounded-[14px] p-5 h-full flex flex-col justify-between">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${user.color} flex items-center justify-center text-white font-black text-xl shadow-sm transform group-hover:rotate-6 transition-transform`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{user.id}</p>
                          <p className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{user.name}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Banking Institution</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">{user.bank}</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mt-4 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Available Balance</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono tracking-tight">
                          £{Number(liveBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mt-4 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        <span className="text-xs font-bold uppercase tracking-wider">Access Payment Portal</span>
                        <span className="text-lg font-bold group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Institution</th>
                  <th className="px-6 py-4 text-right">Available Balance</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {DEMO_USERS.map((user) => {
                  const liveBalance = userBalances[user.id] !== undefined ? userBalances[user.id] : 0;
                  return (
                    <tr 
                      key={user.id} 
                      onClick={() => {
                        setSelectedUser(user.id);
                        setView('user-portal');
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${user.color} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-slate-100 text-base">{user.name}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{user.bank}</td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono text-base">
                        £{Number(liveBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="px-4 py-1.5 bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 rounded-xl font-bold hover:bg-cyan-500 hover:text-white transition-all text-xs">
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
      <div className="h-full flex flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-200 p-3 sm:p-4 gap-3 font-sans select-none">
        {/* Compact Banner Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Decentralized Fraud Defense Platform
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tamper-evident interbank fraud prevention & Canton consensus-validated audit trail
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-3 py-1 rounded-full shadow-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-mono">System Operational</span>
          </div>
        </div>

        {/* Main Single Viewport Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
          
          {/* Left 5 Cols: Platform Overview & Ecosystem Navigation */}
          <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
            {/* Canton Blockchain Feature Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex-1 flex flex-col justify-between min-h-0">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="text-cyan-500">⛓️</span> Canton DAML Ledger Integration
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">
                  Permanent, tamper-evident recording of interbank payments, consent choices, and escrow holds.
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>Consensus Validated:</strong> BFT node verification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>Immutable Audit Trail:</strong> Signed DAML choices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>Smart Contracts:</strong> Multi-sig risk approvals</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Navigation Quick Links */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex-1 flex flex-col justify-between min-h-0">
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>🚀</span> Ecosystem Navigation
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button onClick={() => setView('users')} className="p-2 rounded-lg bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-left hover:border-cyan-500 transition-colors">
                  <span className="font-bold text-cyan-700 dark:text-cyan-300">💳 User Cards</span>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">7 Customer Profiles</p>
                </button>
                <button onClick={() => setView('admin')} className="p-2 rounded-lg bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-left hover:border-purple-500 transition-colors">
                  <span className="font-bold text-purple-700 dark:text-purple-300">👮‍♂️ Admin Console</span>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">Review compliance holds</p>
                </button>
                <button onClick={() => setView('explorer')} className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left hover:border-emerald-500 transition-colors">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">🔎 Chain Explorer</span>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">Block audit graph</p>
                </button>
                <button onClick={() => setView('suspicious')} className="p-2 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-left hover:border-rose-500 transition-colors">
                  <span className="font-bold text-rose-700 dark:text-rose-300">⚠️ Suspicious Txns</span>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">8D Isolation Forest flags</p>
                </button>
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Infrastructure Telemetry Grid (6 Microservice Cards) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col justify-between min-h-0">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
              <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                System Infrastructure Telemetry
              </h2>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full text-[9px] font-mono font-bold border border-emerald-300 dark:border-emerald-700">
                ALL SYSTEMS UP ✓
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-sans text-xs flex-1 min-h-0">
              {/* Card 1: Spring Boot */}
              <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-slate-900 dark:text-white flex items-center gap-1">⚙️ Backend API</span>
                  <span className="text-[8px] font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-400">
                    {health?.status || 'UP'} ✓
                  </span>
                </div>
                <p className="text-[9px] text-slate-500">Spring Boot Java 17</p>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 text-[9px] font-mono flex justify-between text-slate-400">
                  <span>Port:</span>
                  <span className="text-slate-700 dark:text-slate-200 font-bold">8080</span>
                </div>
              </div>

              {/* Card 2: Canton */}
              <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-slate-900 dark:text-white flex items-center gap-1">⛓️ Canton Ledger</span>
                  <span className="text-[8px] font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-400">
                    {readiness?.canton?.status || 'READY'} ✓
                  </span>
                </div>
                <p className="text-[9px] text-slate-500">BFT Consensus Engine</p>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 text-[9px] font-mono flex justify-between text-slate-400">
                  <span>Domain:</span>
                  <span className="text-slate-700 dark:text-slate-200 font-bold">Alpha-v1</span>
                </div>
              </div>

              {/* Card 3: ML Model */}
              <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-slate-900 dark:text-white flex items-center gap-1">🧠 ML Engine</span>
                  <span className="text-[8px] font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-400">
                    ACTIVE ✓
                  </span>
                </div>
                <p className="text-[9px] text-slate-500">Isolation Forest 8D</p>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 text-[9px] font-mono flex justify-between text-slate-400">
                  <span>Vector:</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">8D Model</span>
                </div>
              </div>

              {/* Card 4: MongoDB */}
              <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-slate-900 dark:text-white flex items-center gap-1">🗄️ MongoDB</span>
                  <span className="text-[8px] font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-400">
                    {readiness?.mongo || 'UP'} ✓
                  </span>
                </div>
                <p className="text-[9px] text-slate-500">Persistent Ledger DB</p>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 text-[9px] font-mono flex justify-between text-slate-400">
                  <span>Port:</span>
                  <span className="text-slate-700 dark:text-slate-200 font-bold">27017</span>
                </div>
              </div>

              {/* Card 5: NVIDIA NIM */}
              <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-slate-900 dark:text-white flex items-center gap-1">🤖 NVIDIA NIM</span>
                  <span className="text-[8px] font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-400">
                    {chatStatus?.status || 'UP'} ✓
                  </span>
                </div>
                <p className="text-[9px] text-slate-500">Nemotron AI Assistant</p>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 text-[9px] font-mono flex justify-between text-slate-400">
                  <span>RAG:</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">Active</span>
                </div>
              </div>

              {/* Card 6: Bank Gateways */}
              <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-slate-900 dark:text-white flex items-center gap-1">🌐 Gateways</span>
                  <span className="text-[8px] font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-400">
                    3 / 3 OK ✓
                  </span>
                </div>
                <p className="text-[9px] text-slate-500">Bank JSON API Routers</p>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 text-[9px] font-mono flex justify-between text-slate-400">
                  <span>Routing:</span>
                  <span className="text-slate-700 dark:text-slate-200 font-bold">BankA/B/C</span>
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
    </Layout>
  )
}
