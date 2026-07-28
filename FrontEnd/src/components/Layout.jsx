import React, { useState, useEffect } from 'react';
import { Menu, X, Moon, Sun } from 'lucide-react';

export default function Layout({ children, currentView, onNavigate }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return true; // default to dark
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home', view: 'home' },
    { id: 'portal', icon: '💳', label: 'User Portal', view: 'user-select' },
    { id: 'admin', icon: '👮‍♂️', label: 'Admin Console', view: 'admin' },
    { id: 'explorer', icon: '🔎', label: 'Chain Explorer', view: 'explorer' },
    { id: 'suspicious', icon: '⚠️', label: 'Suspicious Txns', view: 'suspicious' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 transition-colors duration-200 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Left Sidebar Navigation */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full hidden lg:flex lg:w-0 lg:overflow-hidden'} 
        w-64 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 shadow-2xl flex flex-col transition-all duration-300 z-50 fixed lg:relative h-full
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center font-mono font-black text-lg text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              FS
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                <span>FraudShield</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </h1>
              <p className="text-[10px] text-emerald-400/90 font-mono uppercase tracking-widest font-bold">Tamper-Evident Ledger</p>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.view);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-5 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Isolation Forest ML Active</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Canton Network Connected</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl shadow-md z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-400 hover:text-white focus:outline-none p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Menu size={22} />
            </button>
            <span className="hidden sm:inline-block text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest">
              Live Demo Environment
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center gap-2 text-xs font-mono"
            >
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-cyan-400" />}
              <span className="hidden md:inline">{isDarkMode ? 'Dark Glass' : 'Light Mode'}</span>
            </button>
          </div>
        </header>

        <main className={`flex-1 flex flex-col ${currentView === 'user-portal' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`flex-1 flex flex-col min-h-0 ${currentView === 'user-portal' ? '' : 'p-4 sm:p-6 lg:p-8'}`}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
