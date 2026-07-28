import { useEffect, useState } from 'react'
import axios from 'axios'
import Layout from './components/Layout'
import UserPortal from './pages/UserPortal'
import AdminConsole from './pages/AdminConsole'
import ChainExplorer from './pages/ChainExplorer'
import SuspiciousTransactions from './pages/SuspiciousTransactions'
import AIAnomalyReview from './pages/AIAnomalyReview'
import SystemDashboard from './pages/SystemDashboard'
import UserHistory from './pages/UserHistory'

const DEMO_USERS = [
  { id: 'U001', name: 'Alice Walker', bank: 'Stellar Bank', color: 'from-emerald-400 to-emerald-500' },
  { id: 'U002', name: 'Bob Taylor', bank: 'Nova Finance', color: 'from-blue-400 to-blue-500' },
  { id: 'U003', name: 'Carlos Rivera', bank: 'Prime Banking', color: 'from-purple-400 to-purple-500' },
  { id: 'U004', name: 'Diana Prince', bank: 'Apex Trust', color: 'from-cyan-400 to-cyan-500' },
  { id: 'U005', name: 'Eve Chen', bank: 'Quantum Pay', color: 'from-pink-400 to-pink-500' },
  { id: 'U006', name: 'Frank Okafor', bank: 'Gold Standard', color: 'from-amber-400 to-amber-500' },
  { id: 'U007', name: 'Grace Okonkwo', bank: 'Liberty Banking', color: 'from-red-400 to-red-500' },
]

export default function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [view, setView] = useState('home')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userBalances, setUserBalances] = useState({})
  const [accountViewMode, setAccountViewMode] = useState('grid')

  useEffect(() => {
    axios.get('/health')
      .then(res => setHealth(res.data))
      .catch(err => setError(err.message))
  }, [])

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
            // Fallback to local DB balance if ledger query fails
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
    // Poll balances every 3 seconds to keep them fresh after admin approvals
    const interval = setInterval(fetchBalances, 3000)
    return () => clearInterval(interval)
  }, [])

  const renderContent = () => {
    if (view === 'user-history') {
      return <UserHistory selectedUserId={selectedUser} onSelectUser={setSelectedUser} />
    }

    if (view === 'user-portal' && selectedUser) {
      return <UserPortal userId={selectedUser} />
    }

    if (view === 'admin') {
      return <AdminConsole />
    }

    if (view === 'dashboard') {
      return <SystemDashboard />
    }

    if (view === 'explorer') {
      return <ChainExplorer />
    }

    if (view === 'suspicious') {
      return <SuspiciousTransactions />
    }

    if (view === 'analytics') {
      return <AIAnomalyReview />
    }

    if (view === 'user-select' || view === 'user-portal') {
      return (
        <div className="w-full">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10">
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">Select Your Account</h1>
              <p className="text-slate-600 dark:text-slate-400">Choose a banking account to access FraudShield</p>
            </div>
            <div className="mt-6 md:mt-0 flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
              <button
                onClick={() => setAccountViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all ${accountViewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                title="Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
              </button>
              <button
                onClick={() => setAccountViewMode('table')}
                className={`p-2.5 rounded-lg transition-all ${accountViewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                title="Table View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
              </button>
            </div>
          </div>

          {accountViewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user.id)
                    setView('user-portal')
                  }}
                  className="group text-left transition-all transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none"
                >
                  {/* Card Container with Gradient Border */}
                  <div className={`p-[2px] rounded-2xl bg-gradient-to-br ${user.color} h-full transition-all shadow-lg dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] group-hover:shadow-2xl group-hover:scale-105`}>
                    <div className="bg-white dark:bg-slate-900 rounded-[14px] p-5 h-full flex flex-col">

                      {/* User Avatar & Name */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${user.color} flex items-center justify-center text-white font-black text-xl shadow-sm transform group-hover:rotate-6 transition-transform`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{user.id}</p>
                          <p className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{user.name}</p>
                        </div>
                      </div>

                      {/* Bank Name */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Bank Institution</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">{user.bank}</p>
                      </div>

                      <div className="flex-1"></div>

                      {/* Balance */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mt-4 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Available Balance</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tracking-tight">
                          £{Number(userBalances[user.id] ?? 0).toLocaleString()}
                        </p>
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mt-4 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        <span className="text-xs font-bold uppercase tracking-wider">Access Portal</span>
                        <span className="text-lg font-bold group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
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
                    {DEMO_USERS.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
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
                        <td className="px-6 py-4 text-right font-black text-lg text-slate-900 dark:text-slate-100 font-mono">
                          £{Number(userBalances[user.id] ?? 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedUser(user.id)
                              setView('user-portal')
                            }}
                            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg group-hover:bg-cyan-50 dark:group-hover:bg-cyan-500/10 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-all hover:scale-105"
                          >
                            Access Portal
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">Decentralized Fraud Defense</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 mt-2">Tamper-evident fraud prevention · Consensus-validated audit trail</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-50 to-cyan-50 dark:from-indigo-950/30 dark:to-cyan-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <span className="text-cyan-500">⛓️</span> Blockchain Integration
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
              FraudShield leverages a decentralized ledger to ensure every transaction is permanently recorded and immune to tampering.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span><strong>Consensus Validated:</strong> Distributed nodes verify all payments.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span><strong>Immutable Audit Trail:</strong> Historical records cannot be altered.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span><strong>Smart Contracts:</strong> Automated multi-sig approvals for high-risk flags.</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Use the sidebar navigation to:</p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>💳 <strong className="dark:text-slate-200">User Portal</strong> — Send payments and view transaction history</li>
              <li>👮‍♂️ <strong className="dark:text-slate-200">Admin Console</strong> — Review and approve pending transactions</li>
              <li>🔎 <strong className="dark:text-slate-200">Chain Explorer</strong> — View consensus-validated blockchain audit trail</li>
              <li>⚠️ <strong className="dark:text-slate-200">Suspicious Txns</strong> — Monitor unresolved alerts and investigate</li>
            </ul>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">System Status</h2>
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-semibold">Backend Unreachable</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          ) : health ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="font-semibold text-green-600 dark:text-green-400">Backend Connected</span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-950 rounded p-3 space-y-1">
                <p><span className="text-slate-500 dark:text-slate-500">status:</span> {health.status}</p>
                <p><span className="text-slate-500 dark:text-slate-500">app:</span> {health.application}</p>
                <p><span className="text-slate-500 dark:text-slate-500">time:</span> {health.timestamp}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <span className="animate-pulse w-2 h-2 rounded-full bg-slate-400"></span>
              Connecting to backend…
            </div>
          )}
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

