import React from 'react';

export default function Layout({ children, currentView, onNavigate }) {
  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home', view: 'home' },
    { id: 'portal', icon: '💳', label: 'User Portal', view: 'user-select' },
    { id: 'admin', icon: '👮‍♂️', label: 'Admin Console', view: 'admin' },
    { id: 'explorer', icon: '🔎', label: 'Chain Explorer', view: 'explorer' },
    { id: 'suspicious', icon: '⚠️', label: 'Suspicious Txns', view: 'suspicious' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Left Sidebar Navigation */}
      <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 shadow-lg flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-mono font-bold text-lg text-white">
              FS
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">FraudShield</h1>
              <p className="text-xs text-slate-400">Tamper-Evident</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                currentView === item.view
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700">
          <p className="text-xs text-slate-400 text-center">Phase 12 — Frontend Core</p>
          <p className="text-xs text-slate-500 text-center mt-1">Portal & Explorer</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
