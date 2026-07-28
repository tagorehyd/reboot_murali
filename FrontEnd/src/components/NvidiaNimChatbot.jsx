import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PRESET_QUESTIONS = [
  { label: '🛡️ 3-Tier Risk Routing', query: 'Explain how FraudShield routes transactions across the LOW, MEDIUM, and HIGH risk tiers.' },
  { label: '🧠 Isolation Forest 8D Vector', query: 'How does the Isolation Forest ML service extract features and score transactions?' },
  { label: '⛓️ Canton Blockchain Consensus', query: 'What DAML smart contracts are used on the Canton ledger and how do they enforce security?' },
  { label: '📊 Live System Status', query: 'What is the current status of users, mempool transactions, and ML service in FraudShield?' },
];

const DYNAMIC_HEAD_PROMPTS = [
  "👋 Hi! I'm FraudShield AI Robo Advisor!",
  "🛡️ Ask me about Canton Smart Contracts!",
  "🧠 Curious about 8D ML Vector Radars?",
  "⚡ Want to see 3-Tier Risk Routing in action?",
  "📊 Need help with Interbank Volume Stats?",
  "🚨 Ask about Auto-Repairing Database Tampers!"
];

// Cute White & Cyan Waving Robot Character Matching Reference Image
function WhiteBlueCuteRobotCharacter({ size = 80, chestText = "HI!" }) {
  return (
    <div className="relative flex items-center justify-center overflow-visible" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 110" fill="none" className="overflow-visible">
        <defs>
          <linearGradient id="whiteShellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
          <linearGradient id="darkVisorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="cyanEyeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Shadow Oval Base */}
        <ellipse cx="50" cy="104" rx="22" ry="4" fill="rgba(15, 23, 42, 0.25)" />

        {/* Dual Diagonal Antennas */}
        <line x1="32" y1="20" x2="20" y2="8" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
        <circle cx="18" cy="6" r="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />

        <line x1="68" y1="20" x2="80" y2="8" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
        <circle cx="82" cy="6" r="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />

        {/* Waving Right Arm (Left in viewer's perspective) */}
        <g className="animate-[bounce_1.5s_infinite_ease-in-out] origin-[28px_58px]">
          <path d="M28 58 Q12 42 16 20 Q24 18 28 32 Q26 48 30 58 Z" fill="url(#whiteShellGrad)" stroke="#94a3b8" strokeWidth="2" />
        </g>

        {/* Left Arm Resting (Right in viewer's perspective) */}
        <path d="M72 58 Q84 66 80 80 Q74 82 72 74 Q70 66 68 58 Z" fill="url(#whiteShellGrad)" stroke="#94a3b8" strokeWidth="2" />

        {/* Body Base */}
        <rect x="28" y="52" width="44" height="42" rx="20" fill="url(#whiteShellGrad)" stroke="#94a3b8" strokeWidth="2" />

        {/* Chest Screen with HI! */}
        <rect x="34" y="60" width="32" height="24" rx="8" fill="url(#darkVisorGrad)" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="50" y="77" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="900" fontFamily="sans-serif" filter="url(#cyanEyeGlow)">
          {chestText}
        </text>

        {/* Cute Feet */}
        <rect x="35" y="92" width="12" height="8" rx="4" fill="#cbd5e1" />
        <rect x="53" y="92" width="12" height="8" rx="4" fill="#cbd5e1" />

        {/* Dome Head Shell */}
        <rect x="22" y="16" width="56" height="38" rx="22" fill="url(#whiteShellGrad)" stroke="#94a3b8" strokeWidth="2" />

        {/* Dark Visor Screen */}
        <rect x="28" y="24" width="44" height="18" rx="9" fill="url(#darkVisorGrad)" stroke="#0284c7" strokeWidth="1" />

        {/* Glowing Cyan Eye Rings */}
        <circle cx="39" cy="33" r="5" fill="#38bdf8" filter="url(#cyanEyeGlow)" />
        <circle cx="39" cy="33" r="2.5" fill="#0f172a" />

        <circle cx="61" cy="33" r="5" fill="#38bdf8" filter="url(#cyanEyeGlow)" />
        <circle cx="61" cy="33" r="2.5" fill="#0f172a" />

        {/* Curved Smile Mouth */}
        <path d="M42 45 Q50 50 58 45" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function NvidiaNimChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 **Welcome to FraudShield AI Robo Advisor!** Powered by **NVIDIA NIM** (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`).\n\nAsk me anything about FraudShield architecture, 3-tier risk routing, Isolation Forest ML vectors, DAML Canton smart contracts, or live system metrics.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const messagesEndRef = useRef(null);

  // Rotate Speech Bubble Head Conversation Prompts
  useEffect(() => {
    const timer = setInterval(() => {
      setPromptIdx(prev => (prev + 1) % DYNAMIC_HEAD_PROMPTS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    axios.get('/api/chat/status')
      .then(res => setStatus(res.data))
      .catch(err => console.warn('Could not load chatbot status:', err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isLoading) return;

    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await axios.post('/api/chat', {
        message: query,
        history: historyPayload
      });

      const assistantMsg = {
        role: 'assistant',
        content: res.data?.response || 'I have processed your query.',
        model: res.data?.model || 'NVIDIA NIM',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **API Notice:** ${err.response?.data?.error || err.message || 'Unable to connect to NVIDIA NIM endpoint.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="font-black text-emerald-300 text-base mt-2 mb-1">{line.replace('# ', '')}</h2>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="font-black text-emerald-300 text-sm mt-2 mb-1">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-emerald-400 text-xs mt-2 mb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
        const itemText = line.replace(/^[-•*]\s*/, '');
        return (
          <div key={idx} className="flex items-start gap-2 ml-2 my-0.5 text-slate-300 text-xs">
            <span className="text-emerald-400 font-bold">•</span>
            <span>{formatBoldAndCode(itemText)}</span>
          </div>
        );
      }
      const matchNum = line.match(/^(\d+)\.\s+(.*)/);
      if (matchNum) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-2 my-0.5 text-slate-300 text-xs">
            <span className="text-emerald-400 font-bold font-mono">{matchNum[1]}.</span>
            <span>{formatBoldAndCode(matchNum[2])}</span>
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="my-0.5 text-xs text-slate-200 leading-relaxed">
          {formatBoldAndCode(line)}
        </p>
      );
    });
  };

  const formatBoldAndCode = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-slate-800 text-emerald-300 px-1 py-0.5 rounded font-mono text-[11px] border border-slate-700">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Pure Robot Body Character & Dynamic Head Speech Bubble */}
      {!isOpen && (
        <div className="relative group flex flex-col items-center select-none">
          {/* Dynamic Floating Speech Bubble Positioned Directly Above Robot's Head */}
          <div className="mb-2 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/95 border-2 border-sky-400 text-sky-200 text-xs font-black px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md whitespace-nowrap animate-bounce flex items-center gap-1.5 transition-all duration-500 relative">
            <span>{DYNAMIC_HEAD_PROMPTS[promptIdx]}</span>
            {/* Pointer tail pointing down to robot head center */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-slate-900 border-r-2 border-b-2 border-sky-400 rotate-45"></div>
          </div>

          {/* Floating Robot Body Character (No box outline or container background) */}
          <button
            onClick={() => setIsOpen(true)}
            className="bg-transparent border-0 p-0 hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none cursor-pointer filter drop-shadow-[0_12px_24px_rgba(56,189,248,0.35)]"
            title="Click to talk to FraudShield AI Advisor"
          >
            <WhiteBlueCuteRobotCharacter size={100} chestText="HI!" />
          </button>
        </div>
      )}

      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="w-[420px] max-w-[92vw] h-[600px] max-h-[85vh] bg-slate-950 rounded-2xl shadow-2xl border border-sky-500/40 flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WhiteBlueCuteRobotCharacter size={50} chestText="NV" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white tracking-tight">FraudShield AI Advisor</h3>
                  <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase">
                    NVIDIA NIM
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {status?.model || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Minimize"
            >
              ✕
            </button>
          </div>

          {/* Quick Question Preset Chips */}
          <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            {PRESET_QUESTIONS.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(chip.query)}
                disabled={isLoading}
                className="whitespace-nowrap bg-slate-800/90 hover:bg-sky-900/50 hover:border-sky-500/50 text-slate-300 hover:text-sky-200 border border-slate-700 text-[10px] font-medium px-2.5 py-1 rounded-full transition-all flex-shrink-0 cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-2xl shadow-sm text-xs ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-br-none'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-inner'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    renderFormattedContent(msg.content)
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="bg-slate-900/90 border border-sky-500/30 p-3 rounded-2xl rounded-bl-none text-xs text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                  <span className="text-sky-400 font-mono text-[11px]">NVIDIA Nemotron is reasoning…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask NVIDIA AI about code, rules, Canton, ML..."
              disabled={isLoading}
              className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-sky-500 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none placeholder-slate-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center min-w-[50px] cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
