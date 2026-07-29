import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import NvidiaNimChatbot from './NvidiaNimChatbot';

// Ultra-premium Day/Night Theme Toggle Switch
function DayNightThemeToggleSwitch({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-20 h-10 rounded-full p-1 transition-all duration-500 cursor-pointer shadow-inner border border-[#CBD5E1] dark:border-slate-700 overflow-hidden focus:outline-none ${
        isDark
          ? 'bg-gradient-to-r from-slate-800 via-slate-900 to-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'
          : 'bg-gradient-to-r from-[#A3E3AB] via-[#00A865] to-emerald-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]'
      }`}
      aria-label="Toggle Light and Dark Mode"
    >
      {/* Background Icons Layer */}
      <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none select-none">
        {/* Left Side: Moon */}
        <div className={`flex items-center gap-0.5 transition-opacity duration-300 ${isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="#A3E3AB" />
            <path d="M19 5l.5 1.5L21 7l-1.5.5L19 9l-.5-1.5L17 7l1.5-.5z" fill="#ffffff" />
          </svg>
        </div>

        {/* Right Side: Sun */}
        <div className={`flex items-center transition-opacity duration-300 ${!isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <svg width="26" height="18" viewBox="0 0 32 24" fill="none">
            <circle cx="20" cy="9" r="6" fill="#00A865" />
            <path d="M20 1v2M20 15v2M12 9h2M26 9h2M14.34 3.34l1.42 1.42M24.24 13.24l1.42 1.42M14.34 14.66l1.42-1.42M24.24 4.76l1.42-1.42" stroke="#00A865" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 18h13a4 4 0 00.5-7.97A5 5 0 0013.5 6.1a4.5 4.5 0 00-5.5 4.2A3.5 3.5 0 008 18z" fill="#ffffff" />
          </svg>
        </div>
      </div>

      {/* Floating Knob */}
      <div
        className={`w-8 h-8 rounded-full bg-gradient-to-b from-white via-slate-50 to-slate-200 shadow-md transform transition-transform duration-500 ease-out flex items-center justify-center border border-white/80 ${
          isDark ? 'translate-x-10 shadow-[0_2px_8px_rgba(0,0,0,0.6)]' : 'translate-x-0 shadow-[0_2px_6px_rgba(0,0,0,0.3)]'
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white/90 to-slate-100/50" />
      </div>
    </button>
  );
}

export default function Layout({ children, currentView, onNavigate }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false; // default to light mode
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

  const navSections = [
    {
      title: '',
      items: [
        { id: 'home', icon: '🏠', label: 'Home', view: 'home' },
        { id: 'dashboard', icon: '📊', label: 'Dashboard', view: 'dashboard' },
      ]
    },
    {
      title: 'Users',
      items: [
        { id: 'users', icon: '💳', label: 'Users', view: 'users' },
        { id: 'history', icon: '📜', label: 'User History', view: 'user-history' },
      ]
    },
    {
      title: 'Admin',
      items: [
        { id: 'admin', icon: '👮‍♂️', label: 'Admin Portal', view: 'admin' },
      ]
    },
    {
      title: 'Analytics',
      items: [
        { id: 'explorer', icon: '🔎', label: 'Chain Explorer', view: 'explorer' },
        { id: 'suspicious', icon: '⚠️', label: 'Suspicious Txns', view: 'suspicious' },
      ]
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#ECEEEF] text-[#111827] font-sans antialiased transition-colors duration-200">
      {/* Left Sidebar Navigation - Crisp White / Light Slate */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full hidden lg:flex lg:w-0 lg:overflow-hidden'} 
        w-64 bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-100 border-r border-[#CBD5E1] dark:border-slate-800 shadow-xl flex flex-col transition-all duration-300 z-50 fixed lg:relative h-full
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#CBD5E1] dark:border-slate-800">
          <div>
            <h2 className="font-black text-[#111827] dark:text-white text-lg leading-tight tracking-tight font-heading">FraudShield</h2>
            <p className="text-[10px] text-[#00A865] font-extrabold">Lloyds Tech Centre</p>
          </div>
          <button className="lg:hidden text-[#111827]/60 hover:text-[#111827]" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx} className={section.title === '' ? '-mt-4' : ''}>
              {section.title && (
                <h3 className="px-4 text-[10px] font-extrabold text-[#00A865] uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = currentView === item.view || (item.view === 'users' && currentView === 'user-portal');
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.view);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#00A865] text-white font-black shadow-md'
                          : 'text-[#111827] dark:text-slate-300 hover:bg-[#A3E3AB]/30 dark:hover:bg-slate-800 font-semibold'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#CBD5E1] dark:border-slate-800 bg-[#ECEEEF]/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 text-xs text-[#00A865] font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-[#00A865] animate-pulse" />
            <span>Tamper-Evident Canton Ledger</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-[#CBD5E1] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs z-40 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-[#111827] dark:text-slate-200 hover:opacity-80 focus:outline-none p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={22} />
            </button>
            <span className="text-xs font-bold text-[#111827] dark:text-slate-100 font-heading uppercase tracking-wider hidden sm:inline-block">
              FraudShield — Decentralized Fraud Defense Platform
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Animated Day/Night Theme Toggle Switch */}
            <DayNightThemeToggleSwitch
              isDark={isDarkMode}
              onToggle={() => setIsDarkMode(!isDarkMode)}
            />
          </div>
        </header>

        {/* Dynamic Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#ECEEEF] text-[#111827] dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
          {children}
        </main>

        {/* Cute Floating Vector AI Assistant Chatbot */}
        <NvidiaNimChatbot />
      </div>
    </div>
  );
}
