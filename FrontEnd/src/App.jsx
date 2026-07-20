import { useEffect, useState } from 'react'
import axios from 'axios'
import Layout from './components/Layout'
import UserPortal from './pages/UserPortal'
import AdminConsole from './pages/AdminConsole'
import ChainExplorer from './pages/ChainExplorer'
import SuspiciousTransactions from './pages/SuspiciousTransactions'

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

  useEffect(() => {
    axios.get('/health')
      .then(res => setHealth(res.data))
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    axios.get('/api/users/all')
      .then((res) => {
        const balanceMap = {}
        ;(res.data || []).forEach((u) => {
          if (u?.id) {
            balanceMap[u.id] = Number(u.balance || 0)
          }
        })
        setUserBalances(balanceMap)
      })
      .catch((err) => {
        console.error('Failed to load user balances:', err)
      })
  }, [])

  const renderContent = () => {
    if (view === 'user-portal' && selectedUser) {
      return <UserPortal userId={selectedUser} />
    }

    if (view === 'admin') {
      return <AdminConsole />
    }

    if (view === 'explorer') {
      return <ChainExplorer />
    }

    if (view === 'suspicious') {
      return <SuspiciousTransactions />
    }

    if (view === 'user-select') {
      return (
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Select Your Account</h1>
            <p className="text-slate-600">Choose a banking account to access FraudShield</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {DEMO_USERS.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  setSelectedUser(user.id)
                  setView('user-portal')
                }}
                className="group text-left transition-all transform hover:scale-105 hover:shadow-2xl focus:outline-none"
              >
                {/* Card Container */}
                <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-100 hover:border-slate-300 transition-all">
                  
                  {/* Colored Top Section */}
                  <div className={`bg-gradient-to-br ${user.color} h-24 relative overflow-hidden`}>
                    <div className="absolute top-2 right-2 text-white text-2xl font-bold opacity-20">♦</div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 space-y-4">
                    
                    {/* User Avatar & Name */}
                    <div className="flex items-center gap-3 -mt-10 relative z-10">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${user.color} flex items-center justify-center text-white font-black text-2xl border-4 border-white shadow-md`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">{user.id}</p>
                        <p className="text-lg font-bold text-slate-900">{user.name}</p>
                      </div>
                    </div>

                    {/* Bank Name */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Bank</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{user.bank}</p>
                    </div>

                    {/* Balance */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Available Balance</p>
                      <p className="text-2xl font-black text-slate-900 mt-2">
                        £{Number(userBalances[user.id] ?? 0).toLocaleString()}
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between text-slate-500 group-hover:text-indigo-600 transition-colors">
                      <span className="text-xs font-semibold uppercase tracking-wide">Access Account</span>
                      <span className="text-lg">→</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tight text-slate-900">Welcome to FraudShield</h1>
          <p className="text-xl text-slate-500 mt-2">Tamper-evident fraud prevention · Consensus-validated audit trail</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">System Status</h2>
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-semibold">Backend Unreachable</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          ) : health ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="font-semibold text-green-600">Backend Connected</span>
              </div>
              <div className="text-sm text-slate-600 font-mono bg-slate-50 rounded p-3 space-y-1">
                <p><span className="text-slate-500">status:</span> {health.status}</p>
                <p><span className="text-slate-500">app:</span> {health.application}</p>
                <p><span className="text-slate-500">time:</span> {health.timestamp}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <span className="animate-pulse w-2 h-2 rounded-full bg-slate-400"></span>
              Connecting to backend…
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-600 mb-2">Use the sidebar navigation to:</p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>💳 <strong>User Portal</strong> — Send payments and view transaction history</li>
            <li>👮‍♂️ <strong>Admin Console</strong> — Review and approve pending transactions</li>
            <li>🔎 <strong>Chain Explorer</strong> — View consensus-validated blockchain audit trail</li>
            <li>⚠️ <strong>Suspicious Txns</strong> — Monitor unresolved alerts and investigate</li>
          </ul>
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

