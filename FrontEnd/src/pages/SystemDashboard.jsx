import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

// --- Mock Data ---
const generateTimeSeriesData = () => {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      total: Math.floor(Math.random() * 50) + 10,
      flagged: Math.floor(Math.random() * 15),
      blocked: Math.floor(Math.random() * 5),
    });
  }
  return data;
};

const RISK_DATA = [
  { name: 'Low Risk', value: 85, color: '#10b981' }, // Emerald
  { name: 'Medium Risk', value: 10, color: '#f59e0b' }, // Amber
  { name: 'High Risk', value: 5, color: '#ef4444' }, // Red
];

const INSTITUTION_DATA = [
  { name: 'Stellar Bank', volume: 450, color: '#0ea5e9' },
  { name: 'Nova Finance', volume: 380, color: '#3b82f6' },
  { name: 'Prime Banking', volume: 310, color: '#8b5cf6' },
  { name: 'Apex Trust', volume: 290, color: '#06b6d4' },
  { name: 'Quantum Pay', volume: 210, color: '#ec4899' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl font-mono text-xs">
        <p className="text-slate-400 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SystemDashboard() {
  const [stats, setStats] = useState({
    pending: 0,
    escrow: 0,
    highRisk: 0,
    totalUsers: 0
  });
  const [timeSeriesData] = useState(generateTimeSeriesData());

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const [queueRes, usersRes] = await Promise.all([
          axios.get('/api/admin/queue').catch(() => ({ data: [] })),
          axios.get('/api/users/all').catch(() => ({ data: [] }))
        ]);
        
        const queue = queueRes.data || [];
        const users = usersRes.data || [];
        
        let escrowCount = 0;
        let highRiskCount = 0;
        
        queue.forEach(txn => {
          if (txn.escrowOptIn || txn.status === 'ESCROW_ACTIVE') escrowCount++;
          if ((txn.riskScore || 0) >= 70) highRiskCount++;
        });

        setStats({
          pending: queue.length,
          escrow: escrowCount,
          highRisk: highRiskCount,
          totalUsers: users.length
        });
      } catch (err) {
        console.error("Error fetching live stats for dashboard:", err);
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-full bg-slate-950 text-slate-200 p-4 md:p-8 flex flex-col font-sans">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span className="text-cyan-400">⚡</span> System Dashboard
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Real-time network telemetrics and fraud detection monitoring.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 shadow-inner">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Network Active</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Total Active Nodes</p>
          <p className="text-4xl font-black text-cyan-400 relative z-10">42</p>
          <div className="mt-2 text-[10px] text-cyan-500/60 font-mono">Consensus forming · 99.9% Uptime</div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Active Escrows</p>
          <p className="text-4xl font-black text-purple-400 relative z-10">{stats.escrow}</p>
          <div className="mt-2 text-[10px] text-purple-500/60 font-mono">Canton Smart Contracts live</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">High Risk Queued</p>
          <p className="text-4xl font-black text-red-400 relative z-10">{stats.highRisk}</p>
          <div className="mt-2 text-[10px] text-red-500/60 font-mono">Requires immediate review</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Global Ledger Txns</p>
          <p className="text-4xl font-black text-emerald-400 relative z-10">8.4M</p>
          <div className="mt-2 text-[10px] text-emerald-500/60 font-mono">+12.3% in last 24h</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Time Series Area Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Transaction Throughput (24H)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFlagged" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickMargin={10} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" name="Total Processed" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="flagged" name="AI Flagged" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorFlagged)" />
                <Area type="monotone" dataKey="blocked" name="Hard Blocked" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorBlocked)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Risk Distribution
          </h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={RISK_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {RISK_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Institution Activity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Node Activity by Institution (24H Vol)
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={INSTITUTION_DATA} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#475569" fontSize={10} hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                <Bar dataKey="volume" name="Txns (Thousands)" radius={[0, 4, 4, 0]}>
                  {INSTITUTION_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Audit Log / Recent Alerts (Mocked for dashboard feel) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Live Threat Intel
            </h3>
            <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-500/30">MONITORING</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {[
              { time: 'Just now', type: 'Velocity Anomaly', node: 'Node-04 (Apex)', risk: 'CRITICAL', color: 'text-red-400' },
              { time: '2m ago', type: 'Unusual Geo-IP', node: 'Node-12 (Nova)', risk: 'WARN', color: 'text-amber-400' },
              { time: '15m ago', type: 'Escrow Initiated', node: 'Node-02 (Stellar)', risk: 'INFO', color: 'text-cyan-400' },
              { time: '1h ago', type: 'Admin Hold Lifted', node: 'Global Console', risk: 'RESOLVED', color: 'text-emerald-400' },
            ].map((alert, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
                <div className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${alert.color}`}>{alert.risk}</div>
                <div>
                  <p className="text-xs font-bold text-slate-300">{alert.type}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{alert.node} · {alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
