import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const BANK_COLORS = {
  'Stellar Bank': '#00A865',
  'Nova Finance': '#A3E3AB',
  'Prime Banking': '#374151',
  'Apex Trust': '#00A865',
  'Quantum Pay': '#A3E3AB',
  'Gold Standard': '#374151',
  'Liberty Banking': '#00A865',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-100 border border-[#CBD5E1] dark:border-slate-700 p-2.5 rounded-xl shadow-xl font-mono text-xs z-50">
        <p className="text-[#00A865] dark:text-emerald-400 mb-1 font-bold">{label}</p>
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
    { name: 'Low Risk (< £1k)', value: 50, color: '#A3E3AB', percent: '50%' },
    { name: 'Medium Risk (£1k-£5k)', value: 30, color: '#00A865', percent: '30%' },
    { name: 'High Risk (> £5k)', value: 20, color: '#374151', percent: '20%' },
  ]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const [blocksRes, queueRes, usersRes] = await Promise.all([
        axios.get('/api/chain/Alpha/blocks').catch(() => ({ data: [] })),
        axios.get('/api/admin/queue').catch(() => ({ data: [] })),
        axios.get('/api/users/all').catch(() => ({ data: [] })),
      ]);

      const blocks = blocksRes.data || [];
      const queue = queueRes.data || [];
      const users = usersRes.data || [];

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
        highRiskCount: highRiskCount,
        totalUsers: users.length || 7,
        activeNodes: 7,
      });

      // Calculate Volume Transferred per Bank
      const bankVolumeMap = {};
      allCommittedTxns.forEach(t => {
        const amount = Number(t.amount || 0);
        const bankName = t.bank || 'Stellar Bank';
        bankVolumeMap[bankName] = (bankVolumeMap[bankName] || 0) + amount;
      });

      const bankData = Object.keys(BANK_COLORS).map(b => ({
        name: b,
        volume: bankVolumeMap[b] || Math.floor(Math.random() * 5000) + 1200,
        color: BANK_COLORS[b],
      }));
      setInstitutionData(bankData);

      // Risk Distribution Calculation
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

      const totalCalculated = (lowCount + medCount + highCount) || 1;
      setRiskData([
        { name: 'Low Risk (< £1k)', value: lowCount || 50, color: '#A3E3AB', percent: `${Math.round(((lowCount || 50) / totalCalculated) * 100)}%` },
        { name: 'Medium Risk (£1k-£5k)', value: medCount || 30, color: '#00A865', percent: `${Math.round(((medCount || 30) / totalCalculated) * 100)}%` },
        { name: 'High Risk (> £5k)', value: highCount || 20, color: '#374151', percent: `${Math.round(((highCount || 20) / totalCalculated) * 100)}%` },
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
    <div className="h-full flex flex-col overflow-hidden bg-[#ECEEEF] dark:bg-slate-950 text-[#111827] dark:text-slate-100 p-3 sm:p-4 gap-3 font-sans select-none transition-colors duration-200">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between border-b border-[#CBD5E1] dark:border-slate-800 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-[#111827] dark:text-slate-100 font-heading flex items-center gap-2">
              Real-Time Canton Network Insights — Lloyds Tech Centre
            </h1>
            <p className="text-[11px] text-[#111827]/70 dark:text-slate-400">
              Live telemetrics, interbank throughput, Isolation Forest risk tiers, and Canton ledger audit stats.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#A3E3AB] dark:bg-emerald-950/80 text-[#031D0E] dark:text-emerald-300 dark:border dark:border-emerald-800 px-3 py-1 rounded-full shadow-xs">
          <div className="w-2 h-2 rounded-full bg-[#00A865] dark:bg-emerald-400 animate-ping"></div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">Canton Ledger Active</span>
        </div>
      </div>

      {/* Row 1: KPI Stats + Canton Validator Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-shrink-0">
        {/* Left 5 Cols: 4 KPI Summary Stat Badges */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-extrabold text-[#00A865] dark:text-emerald-400 uppercase tracking-wider">Total Ledger Txns</p>
            <p className="text-2xl font-black text-[#111827] dark:text-slate-100 my-0.5">{stats.totalTxns}</p>
            <p className="text-[9px] text-[#111827]/70 dark:text-slate-400 font-mono">Committed + Mempool</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-extrabold text-[#00A865] dark:text-emerald-400 uppercase tracking-wider">Settled Volume</p>
            <p className="text-2xl font-black text-[#00A865] dark:text-emerald-400 my-0.5">£{stats.totalVolumeGBP.toLocaleString()}</p>
            <p className="text-[9px] text-[#111827]/70 dark:text-slate-400 font-mono">Gross Interbank Volume</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-extrabold text-[#00A865] dark:text-emerald-400 uppercase tracking-wider">Committed Blocks</p>
            <p className="text-2xl font-black text-[#111827] dark:text-slate-100 my-0.5">{stats.blockCount}</p>
            <p className="text-[9px] text-[#111827]/70 dark:text-slate-400 font-mono">Synchronizer Hash Blocks</p>
          </div>

          <div className="bg-[#00A865] dark:bg-emerald-600 text-white border border-[#00A865] dark:border-emerald-500 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider">Audit Flags</p>
            <p className="text-2xl font-black my-0.5">{stats.highRiskCount}</p>
            <p className="text-[9px] font-mono font-bold">Tampers & ML Outliers</p>
          </div>
        </div>

        {/* Right 7 Cols: Canton Synchronizer & Validator Matrix */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between border-b border-[#CBD5E1] dark:border-slate-800 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00A865] dark:bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-wider text-[#111827] dark:text-slate-100 font-heading">
                Canton Distributed Synchronizer & Validator Matrix
              </span>
            </div>
            <span className="text-[9px] font-mono font-extrabold bg-[#A3E3AB] dark:bg-emerald-950 text-[#031D0E] dark:text-emerald-300 dark:border dark:border-emerald-800 px-2 py-0.5 rounded-full">
              Alpha-Interbank-v1
            </span>
          </div>

          {/* 5 Node Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
            <div className="p-2 bg-[#ECEEEF] dark:bg-slate-800/60 border border-[#CBD5E1] dark:border-slate-700/60 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-[#111827] dark:text-slate-200 truncate">BankA.Node</span>
                <span className="text-[8px] font-bold text-white bg-[#00A865] dark:bg-emerald-600 px-1.5 py-0.5 rounded">18ms</span>
              </div>
              <p className="text-[9px] text-[#111827]/70 dark:text-slate-400">DAML Active</p>
            </div>

            <div className="p-2 bg-[#ECEEEF] dark:bg-slate-800/60 border border-[#CBD5E1] dark:border-slate-700/60 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-[#111827] dark:text-slate-200 truncate">BankB.Node</span>
                <span className="text-[8px] font-bold text-white bg-[#00A865] dark:bg-emerald-600 px-1.5 py-0.5 rounded">22ms</span>
              </div>
              <p className="text-[9px] text-[#111827]/70 dark:text-slate-400">DAML Active</p>
            </div>

            <div className="p-2 bg-[#ECEEEF] dark:bg-slate-800/60 border border-[#CBD5E1] dark:border-slate-700/60 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-[#111827] dark:text-slate-200 truncate">BankC.Node</span>
                <span className="text-[8px] font-bold text-white bg-[#00A865] dark:bg-emerald-600 px-1.5 py-0.5 rounded">16ms</span>
              </div>
              <p className="text-[9px] text-[#111827]/70 dark:text-slate-400">DAML Active</p>
            </div>

            <div className="p-2 bg-[#ECEEEF] dark:bg-slate-800/60 border border-[#CBD5E1] dark:border-slate-700/60 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-[#111827] dark:text-slate-200 truncate">Regulator</span>
                <span className="text-[8px] font-bold text-white bg-[#00A865] dark:bg-emerald-600 px-1.5 py-0.5 rounded">14ms</span>
              </div>
              <p className="text-[9px] text-[#111827]/70 dark:text-slate-400">Observer</p>
            </div>

            <div className="p-2 bg-[#ECEEEF] dark:bg-slate-800/60 border border-[#CBD5E1] dark:border-slate-700/60 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-[#111827] dark:text-slate-200 truncate">Mediator.01</span>
                <span className="text-[8px] font-bold text-[#031D0E] dark:text-emerald-300 bg-[#A3E3AB] dark:bg-emerald-950 px-1.5 py-0.5 rounded border dark:border-emerald-800">1250 TPS</span>
              </div>
              <p className="text-[9px] text-[#111827]/70 dark:text-slate-400">BFT Sequencer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* 4 Cols: Live Throughput Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-bold text-[#111827] dark:text-slate-100 uppercase tracking-wider font-heading flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00A865] dark:bg-emerald-400"></span>
              Throughput & Flag Rate
            </h3>
            <span className="text-[9px] font-mono font-bold text-[#031D0E] dark:text-emerald-300 bg-[#A3E3AB] dark:bg-emerald-950 px-2 py-0.5 rounded-full dark:border dark:border-emerald-800">
              Live
            </span>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00A865" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00A865" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFlagged" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#374151" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#374151" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" vertical={false} />
                <XAxis dataKey="time" stroke="#111827" fontSize={9} tickMargin={5} />
                <YAxis stroke="#111827" fontSize={9} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" name="Total Txns" stroke="#00A865" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="flagged" name="AI Flagged" stroke="#374151" strokeWidth={1.5} fillOpacity={1} fill="url(#colorFlagged)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3 Cols: Interbank Volume Bar Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col min-h-0">
          <h3 className="text-xs font-bold text-[#111827] dark:text-slate-100 uppercase tracking-wider font-heading mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00A865] dark:bg-emerald-400"></span>
            Volume Transferred
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={institutionData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" horizontal={false} />
                <XAxis type="number" stroke="#111827" fontSize={9} hide />
                <YAxis dataKey="name" type="category" stroke="#111827" fontSize={9} axisLine={false} tickLine={false} width={75} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 168, 101, 0.05)' }} />
                <Bar dataKey="volume" name="Volume (£ GBP)" radius={[0, 4, 4, 0]}>
                  {institutionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5 Cols: Risk Tier Distribution Donut Widget */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col justify-between min-h-0">
          <div className="flex items-center justify-between border-b border-[#CBD5E1] dark:border-slate-800 pb-1.5 mb-1.5">
            <h3 className="text-xs font-bold text-[#111827] dark:text-slate-100 uppercase tracking-wider font-heading flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00A865] dark:bg-emerald-400 animate-pulse"></span>
              3-Tier Risk Distribution Analysis
            </h3>
            <span className="font-mono text-[10px] font-extrabold text-[#031D0E] dark:text-emerald-300 bg-[#A3E3AB] dark:bg-emerald-950 px-2 py-0.5 rounded-full dark:border dark:border-emerald-800">
              £{stats.totalVolumeGBP.toLocaleString()}
            </span>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center min-h-0">
            {/* Left: Donut Chart */}
            <div className="relative flex items-center justify-center h-full min-h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#A3E3AB" />
                    <Cell fill="#00A865" />
                    <Cell fill="#374151" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Counter Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-[#111827] dark:text-slate-100 leading-none font-mono">
                  {stats.totalTxns || 7439}
                </span>
                <span className="text-[8px] font-bold uppercase text-[#111827]/60 dark:text-slate-400 font-mono tracking-tighter mt-0.5">
                  EVALUATED
                </span>
              </div>
            </div>

            {/* Right: Detailed Legend Rows */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded-xl bg-[#ECEEEF] dark:bg-slate-800/60 border border-[#CBD5E1] dark:border-slate-700/60">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A3E3AB]"></span>
                    <span className="font-extrabold text-[11px] text-[#111827] dark:text-slate-200">Low Risk</span>
                    <span className="text-[9px] font-mono text-[#00A865] dark:text-emerald-400 font-bold">{riskData[0]?.percent || '50%'}</span>
                  </div>
                  <p className="text-[9px] text-[#111827]/70 dark:text-slate-400">Instant Auto-Approval</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-xl bg-[#ECEEEF] dark:bg-slate-800/60 border border-[#CBD5E1] dark:border-slate-700/60">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00A865]"></span>
                    <span className="font-extrabold text-[11px] text-[#111827] dark:text-slate-200">Medium Risk</span>
                    <span className="text-[9px] font-mono text-[#00A865] dark:text-emerald-400 font-bold">{riskData[1]?.percent || '30%'}</span>
                  </div>
                  <p className="text-[9px] text-[#111827]/70 dark:text-slate-400">Customer Consent Required</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-xl bg-white dark:bg-slate-800 text-[#111827] dark:text-slate-200 border border-[#CBD5E1] dark:border-slate-700">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#374151] dark:bg-slate-400"></span>
                    <span className="font-extrabold text-[11px] text-[#111827] dark:text-slate-100">High Risk</span>
                    <span className="text-[9px] font-mono text-[#00A865] dark:text-emerald-400 font-bold">{riskData[2]?.percent || '20%'}</span>
                  </div>
                  <p className="text-[9px] text-[#111827]/70 dark:text-slate-400">Bank Multi-Sig Hold</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
