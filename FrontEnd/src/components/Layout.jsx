import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import NvidiaNimChatbot from './NvidiaNimChatbot';

// Ultra-premium Day/Night Theme Toggle Switch matching LTC green aesthetics
function DayNightThemeToggleSwitch({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-20 h-10 rounded-full p-1 transition-all duration-500 cursor-pointer shadow-inner border border-[#CBD5E1] dark:border-[#072914] overflow-hidden focus:outline-none ${
        isDark
          ? 'bg-gradient-to-r from-[#0B3820] via-[#082914] to-slate-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'
          : 'bg-gradient-to-r from-[#A3E3AB] via-[#00A865] to-emerald-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]'
      }`}
      aria-label="Toggle Light and Dark Mode"
    >
      {/* Background Icons Layer */}
      <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none select-none">
        {/* Left Side: Crescent Moon & Sparkle Stars (Visible in Dark Mode) */}
        <div className={`flex items-center gap-0.5 transition-opacity duration-300 ${isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="#A3E3AB" />
            <path d="M19 5l.5 1.5L21 7l-1.5.5L19 9l-.5-1.5L17 7l1.5-.5z" fill="#E2F7E8" />
            <path d="M12 18l.3.9L13 19l-.9.3L12 20l-.3-.9L11 19l.9-.3z" fill="#E2F7E8" />
          </svg>
        </div>

        {/* Right Side: Sun & Fluffy White Cloud (Visible in Light Mode) */}
        <div className={`flex items-center transition-opacity duration-300 ${!isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <svg width="26" height="18" viewBox="0 0 32 24" fill="none">
            {/* Bright Emerald Sun */}
            <circle cx="20" cy="9" r="6" fill="#0B3820" />
            <path d="M20 1v2M20 15v2M12 9h2M26 9h2M14.34 3.34l1.42 1.42M24.24 13.24l1.42 1.42M14.34 14.66l1.42-1.42M24.24 4.76l1.42-1.42" stroke="#0B3820" strokeWidth="1.5" strokeLinecap="round" />
            {/* Soft White Cloud */}
            <path d="M8 18h13a4 4 0 00.5-7.97A5 5 0 0013.5 6.1a4.5 4.5 0 00-5.5 4.2A3.5 3.5 0 008 18z" fill="#ffffff" />
          </svg>
        </div>
      </div>

      {/* Floating 3D Sliding Circular Knob */}
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
      {/* Left Sidebar Navigation - Deep Forest Green (#0B3820) */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full hidden lg:flex lg:w-0 lg:overflow-hidden'} 
        w-64 bg-[#0B3820] text-[#E2F7E8] border-r border-[#072914] shadow-2xl flex flex-col transition-all duration-300 z-50 fixed lg:relative h-full
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#072914]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00A865] text-[#031D0E] flex items-center justify-center font-black text-base shadow-md">
              LTC
            </div>
            <div>
              <h2 className="font-black text-white text-base leading-tight tracking-tight font-heading">FraudShield</h2>
              <p className="text-[11px] text-[#A3E3AB] font-semibold">Lloyds Tech Centre</p>
            </div>
          </div>
          <button className="lg:hidden text-[#A3E3AB] hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx} className={section.title === '' ? '-mt-4' : ''}>
              {section.title && (
                <h3 className="px-4 text-[10px] font-extrabold text-[#A3E3AB] uppercase tracking-wider mb-2">
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
                          ? 'bg-[#00A865] text-[#031D0E] font-black shadow-md border border-[#A3E3AB]/40'
                          : 'text-[#D1EAD0] hover:bg-[#082914] hover:text-white font-medium'
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
        <div className="p-5 border-t border-[#072914] bg-[#082914]/60">
          <div className="flex items-center gap-2 text-xs text-[#A3E3AB] font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-[#00A865] animate-pulse" />
            <span>LTC PPT Design System</span>
          </div>
          <p className="text-[10px] text-[#D1EAD0] mt-1 font-sans">Tamper-Evident Canton Ledger</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-[#CBD5E1] dark:border-[#072914] bg-white dark:bg-[#0B3820] shadow-xs z-40 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-[#0B3820] dark:text-[#A3E3AB] hover:opacity-80 focus:outline-none p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#082914] transition-colors"
            >
              <Menu size={22} />
            </button>
            <span className="text-xs font-bold text-[#111827] dark:text-[#E2F7E8] font-heading uppercase tracking-wider hidden sm:inline-block">
              Lloyds Technology Centre & PPT Slide Aesthetics
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
