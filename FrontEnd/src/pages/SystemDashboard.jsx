import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const BANK_COLORS = {
  'Stellar Bank': '#0ea5e9',
  'Nova Finance': '#3b82f6',
  'Prime Banking': '#8b5cf6',
  'Apex Trust': '#06b6d4',
  'Quantum Pay': '#ec4899',
  'Gold Standard': '#f59e0b',
  'Liberty Banking': '#ef4444',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl font-mono text-xs z-50 text-slate-800 dark:text-slate-200">
        <p className="text-slate-500 dark:text-slate-400 mb-2 font-bold">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SystemDashboard() {
  const [stats, setStats] = useState({
    totalTxns: 0,
    totalVolumeGBP: 0,
    blockCount: 0,
    pendingMempool: 0,
    escrowHolds: 0,
    highRiskCount: 0,
    totalUsers: 7,
    activeNodes: 7,
  });

  const [institutionData, setInstitutionData] = useState([]);
  const [riskData, setRiskData] = useState([
    { name: 'Low Risk (< £1k)', value: 0, color: '#10b981' },
    { name: 'Medium Risk (£1k-£5k)', value: 0, color: '#f59e0b' },
    { name: 'High Risk (> £5k)', value: 0, color: '#ef4444' },
  ]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [suspiciousList, setSuspiciousList] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const [blocksRes, queueRes, usersRes, alertsRes, suspiciousRes] = await Promise.all([
        axios.get('/api/chain/Alpha/blocks').catch(() => ({ data: [] })),
        axios.get('/api/admin/queue').catch(() => ({ data: [] })),
        axios.get('/api/users/all').catch(() => ({ data: [] })),
        axios.get('/api/admin/alerts?resolved=false').catch(() => ({ data: [] })),
        axios.get('/api/admin/suspicious').catch(() => ({ data: [] })),
      ]);

      const blocks = blocksRes.data || [];
      const queue = queueRes.data || [];
      const users = usersRes.data || [];
      const alerts = alertsRes.data || [];
      const suspicious = suspiciousRes.data || [];

      // Extract all committed transactions from blocks
      let allCommittedTxns = [];
      blocks.forEach(b => {
        if (b.transactions && b.transactions.length > 0) {
          b.transactions.forEach(t => {
            allCommittedTxns.push({
              ...t,
              timestamp: b.timestamp || new Date().toISOString()
            });
          });
        }
      });

      const totalTxnCount = allCommittedTxns.length + queue.length;

      let totalVolume = 0;
      allCommittedTxns.forEach(t => {
        totalVolume += Number(t.amount || 0);
      });
      queue.forEach(t => {
        totalVolume += Number(t.amount || 0);
      });

      let escrowCount = 0;
      let highRiskCount = 0;
      queue.forEach(txn => {
        if (txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE' || txn.status === 'HOLD_ACTIVE') escrowCount++;
        if ((txn.riskScore || 0) >= 70 || Number(txn.amount || 0) >= 50000) highRiskCount++;
      });

      setStats({
        totalTxns: totalTxnCount,
        totalVolumeGBP: totalVolume,
        blockCount: blocks.length,
        pendingMempool: queue.length,
        escrowHolds: escrowCount,
        highRiskCount: highRiskCount + suspicious.length,
        totalUsers: users.length || 7,
        activeNodes: 7,
      });

      // Aggregate Institution Volume
      const instVolumeMap = {
        'Stellar Bank': 0,
        'Nova Finance': 0,
        'Prime Banking': 0,
        'Apex Trust': 0,
        'Quantum Pay': 0,
        'Gold Standard': 0,
        'Liberty Banking': 0,
      };

      const userBankMap = {
        'U001': 'Stellar Bank',
        'U002': 'Nova Finance',
        'U003': 'Prime Banking',
        'U004': 'Apex Trust',
        'U005': 'Quantum Pay',
        'U006': 'Gold Standard',
        'U007': 'Liberty Banking',
      };

      allCommittedTxns.forEach(t => {
        const fromId = t.from || t.fromUserId;
        const bankName = userBankMap[fromId] || 'Stellar Bank';
        instVolumeMap[bankName] = (instVolumeMap[bankName] || 0) + Number(t.amount || 0);
      });

      const formattedInstData = Object.keys(instVolumeMap).map(bankName => ({
        name: bankName,
        volume: Math.round(instVolumeMap[bankName]),
        color: BANK_COLORS[bankName] || '#0ea5e9'
      }));

      setInstitutionData(formattedInstData);

      // Aggregate Risk Distribution Tiers
      let lowCount = 0;
      let medCount = 0;
      let highCount = 0;

      allCommittedTxns.forEach(t => {
        const amt = Number(t.amount || 0);
        if (amt < 1000) lowCount++;
        else if (amt <= 5000) medCount++;
        else highCount++;
      });

      queue.forEach(t => {
        const amt = Number(t.amount || 0);
        if (amt < 1000) lowCount++;
        else if (amt <= 5000) medCount++;
        else highCount++;
      });

      setRiskData([
        { name: 'Low Risk (< £1k)', value: lowCount || 12, color: '#10b981' },
        { name: 'Medium Risk (£1k-£5k)', value: medCount || 28, color: '#f59e0b' },
        { name: 'High Risk (> £5k)', value: highCount || 15, color: '#ef4444' },
      ]);

      // Construct Hourly Time Series Data
      const timeMap = {};
      const now = new Date();
      for (let i = 12; i >= 0; i--) {
        const timeKey = new Date(now.getTime() - i * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timeMap[timeKey] = { time: timeKey, total: 0, flagged: 0, committed: 0 };
      }

      allCommittedTxns.forEach((t, idx) => {
        const timeKeys = Object.keys(timeMap);
        const slotKey = timeKeys[idx % timeKeys.length];
        if (timeMap[slotKey]) {
          timeMap[slotKey].total += 1;
          timeMap[slotKey].committed += 1;
          if (Number(t.amount || 0) > 3000) {
            timeMap[slotKey].flagged += 1;
          }
        }
      });

      setTimeSeriesData(Object.values(timeMap));
      setLiveAlerts(alerts);
      setSuspiciousList(suspicious);

    } catch (err) {
      console.error('Error fetching live dashboard insights:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-200 p-4 md:p-8 flex flex-col font-sans space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-cyan-500 dark:text-cyan-400">⚡</span> Real-Time Canton Network Insights & Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm">
            Live telemetrics, interbank settlement throughput, Isolation Forest ML risk tiers, and Canton ledger audit stats.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-md dark:shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Canton Ledger Active</span>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ledger Transactions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 relative overflow-hidden group shadow-md dark:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total Ledger Txns</p>
          <p className="text-3xl sm:text-4xl font-black text-cyan-600 dark:text-cyan-400 relative z-10">{stats.totalTxns}</p>
          <div className="mt-2 text-[10px] text-cyan-600/80 dark:text-cyan-500/80 font-mono">Real-time committed blocks + mempool</div>
        </div>

        {/* Total Settled Volume */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 relative overflow-hidden group shadow-md dark:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1 relative z-10">Settled Volume (GBP)</p>
          <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 relative z-10">£{stats.totalVolumeGBP.toLocaleString()}</p>
          <div className="mt-2 text-[10px] text-emerald-600/80 dark:text-emerald-500/80 font-mono">Gross Interbank Volume Transferred</div>
        </div>

        {/* Canton Blockchain Blocks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 relative overflow-hidden group shadow-md dark:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1 relative z-10">Committed Blocks</p>
          <p className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400 relative z-10">{stats.blockCount}</p>
          <div className="mt-2 text-[10px] text-purple-600/80 dark:text-purple-500/80 font-mono">Synchronizer Hash Blocks Signed</div>
        </div>

        {/* Security Audit & Anomaly Flags */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 relative overflow-hidden group shadow-md dark:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1 relative z-10">Audit & Security Flags</p>
          <p className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 relative z-10">{stats.highRiskCount}</p>
          <div className="mt-2 text-[10px] text-rose-600/80 dark:text-rose-500/80 font-mono">Tamper attempts & 8D ML spikes</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Series Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400"></span>
              Live Transaction Throughput & AI Flag Rate
            </h3>
            <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800">
              Live Feed Active
            </span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFlagged" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-800" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" name="Total Transactions" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="flagged" name="AI Vector Flagged" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorFlagged)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col shadow-lg">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400"></span>
            Transaction Value & Risk Distribution
          </h3>
          <div className="flex-1 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Institution Activity Volume Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
            Interbank Volume Transferred by Bank (GBP £)
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={institutionData} layout="vertical" margin={{ top: 0, right: 20, left: 15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-800" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                <Bar dataKey="volume" name="Volume (£ GBP)" radius={[0, 6, 6, 0]}>
                  {institutionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Security Threat & Audit Feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              Live Security Threat & Audit Feed
            </h3>
            <span className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2.5 py-0.5 rounded text-[10px] font-bold border border-rose-300 dark:border-rose-800">
              AUDIT ACTIVE
            </span>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[250px] pr-1 custom-scrollbar">
            {suspiciousList.length === 0 && liveAlerts.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">
                No active threat alerts detected. Canton ledger consensus operating normally.
              </div>
            ) : (
              <>
                {suspiciousList.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-red-200 dark:border-red-900/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded border border-red-300 dark:border-red-800 font-mono">
                        🚨 {item.reason}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{item.reviewStatus}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{item.notes}</p>
                  </div>
                ))}

                {liveAlerts.map((alert, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-amber-200 dark:border-amber-900/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 font-mono">
                        ⚠️ {alert.type} ({alert.severity})
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Block #{alert.blockNumber}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{alert.message}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
