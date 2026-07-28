import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import NvidiaNimChatbot from './NvidiaNimChatbot';

// Ultra-premium Day/Night Theme Toggle Switch matching user reference image exactly
function DayNightThemeToggleSwitch({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-20 h-10 rounded-full p-1 transition-all duration-500 cursor-pointer shadow-inner border border-slate-300/40 dark:border-slate-700/60 overflow-hidden focus:outline-none ${
        isDark
          ? 'bg-gradient-to-r from-indigo-700 via-purple-700 to-slate-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'
          : 'bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]'
      }`}
      aria-label="Toggle Light and Dark Mode"
    >
      {/* Background Icons Layer */}
      <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none select-none">
        {/* Left Side: Crescent Moon & Sparkle Stars (Visible in Dark Mode) */}
        <div className={`flex items-center gap-0.5 transition-opacity duration-300 ${isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="#fde047" />
            <path d="M19 5l.5 1.5L21 7l-1.5.5L19 9l-.5-1.5L17 7l1.5-.5z" fill="#ffffff" />
            <path d="M12 18l.3.9L13 19l-.9.3L12 20l-.3-.9L11 19l.9-.3z" fill="#ffffff" />
          </svg>
        </div>

        {/* Right Side: Sun & Fluffy White Cloud (Visible in Light Mode) */}
        <div className={`flex items-center transition-opacity duration-300 ${!isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <svg width="26" height="18" viewBox="0 0 32 24" fill="none">
            {/* Bright Yellow Sun */}
            <circle cx="20" cy="9" r="6" fill="#facc15" />
            <path d="M20 1v2M20 15v2M12 9h2M26 9h2M14.34 3.34l1.42 1.42M24.24 13.24l1.42 1.42M14.34 14.66l1.42-1.42M24.24 4.76l1.42-1.42" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
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
        { id: 'portal', icon: '💳', label: 'Users', view: 'user-select' },
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
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Left Sidebar Navigation */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full hidden lg:flex lg:w-0 lg:overflow-hidden'} 
        w-64 bg-slate-900 dark:bg-slate-900 shadow-2xl flex flex-col transition-all duration-300 z-50 fixed lg:relative h-full
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-mono font-bold text-lg text-white">
              FS
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">FraudShield</h1>
              <p className="text-xs text-slate-400">Tamper-Evident</p>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx} className={section.title === '' ? '-mt-4' : ''}>
              {section.title && (
                <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.view);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${currentView === item.view
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800">
          <p className="text-xs text-slate-400 text-center">Phase 12 — Frontend Core</p>
          <p className="text-xs text-slate-500 text-center mt-1">Portal & Explorer</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-40 transition-colors duration-200">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
            >
              <Menu size={24} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {/* Animated Day/Night Theme Toggle Switch */}
            <DayNightThemeToggleSwitch
              isDark={isDarkMode}
              onToggle={() => setIsDarkMode(!isDarkMode)}
            />
          </div>
        </header>

        <main className={`flex-1 flex flex-col ${(currentView === 'user-portal' || currentView === 'user-history') ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`flex-1 flex flex-col min-h-0 ${(currentView === 'user-portal' || currentView === 'user-history') ? 'p-3 sm:p-4' : 'p-4 sm:p-6 lg:p-8'}`}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* NVIDIA NIM Floating AI Advisor Chatbot Widget */}
      <NvidiaNimChatbot />
    </div>
  );
}
