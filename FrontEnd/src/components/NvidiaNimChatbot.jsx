import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PRESET_QUESTIONS = [
  { label: '🛡️ How Payment Protection Works', query: 'How does FraudShield protect my interbank payments from fraud?' },
  { label: '⚡ 3-Tier Safety Checks', query: 'How are low, medium, and high-value transfers verified?' },
  { label: '📊 Check Account & Transfer Status', query: 'How do I review my recent transfer history and safety sign-offs?' },
  { label: '🚨 What Happens if a Payment is On Hold?', query: 'Why would a transfer go on security hold and how is it approved?' },
];

const DYNAMIC_HEAD_PROMPTS = [
  "👋 Hello! How can I help with your payments today?",
  "🛡️ Ask me how FraudShield protects your money!",
  "⚡ Curious about our 3-tier payment safety checks?",
  "📊 Need help reviewing your recent transfer history?",
  "🚨 Want to know how security holds are approved?",
  "💡 Ask me how to set up your personal transfer limits!"
];

// Cute Teal/Emerald Waving Robot Vector SVG Matching Reference Image Exactly
function TealCuteWavingBot({ size = 75 }) {
  return (
    <div className="relative flex items-center justify-center overflow-visible select-none pointer-events-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 110" fill="none" className="overflow-visible">
        <defs>
          <linearGradient id="tealBotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="botVisorDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <filter id="eyeGlowEffect" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Soft Drop Shadow Under Bot */}
        <ellipse cx="50" cy="104" rx="22" ry="5" fill="rgba(6, 182, 212, 0.25)" />

        {/* Center Vertical Antenna */}
        <line x1="50" y1="22" x2="50" y2="8" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="6" r="4.5" fill="#34d399" filter="url(#eyeGlowEffect)" className="animate-pulse" />

        {/* Waving Left Arm */}
        <g className="animate-[bounce_1.5s_infinite_ease-in-out] origin-[28px_65px]">
          <path d="M28 65 Q12 52 14 32 Q22 28 26 42 Q25 55 30 65 Z" fill="url(#tealBotGrad)" />
        </g>

        {/* Right Arm Resting */}
        <path d="M72 65 Q84 72 80 82 Q74 84 72 78 Q70 72 68 65 Z" fill="url(#tealBotGrad)" />

        {/* Main Body Shell */}
        <rect x="28" y="58" width="44" height="38" rx="20" fill="url(#tealBotGrad)" />

        {/* Cute Head Shell */}
        <rect x="20" y="20" width="60" height="42" rx="24" fill="url(#tealBotGrad)" />

        {/* Dark Glossy Visor Screen */}
        <rect x="26" y="28" width="48" height="20" rx="10" fill="url(#botVisorDark)" stroke="#38bdf8" strokeWidth="1" />

        {/* Big Cute Sparkling Eyes */}
        <circle cx="38" cy="38" r="6" fill="#ffffff" filter="url(#eyeGlowEffect)" />
        <circle cx="38" cy="38" r="4.5" fill="#0f172a" />
        <circle cx="36" cy="36" r="1.8" fill="#ffffff" />

        <circle cx="62" cy="38" r="6" fill="#ffffff" filter="url(#eyeGlowEffect)" />
        <circle cx="62" cy="38" r="4.5" fill="#0f172a" />
        <circle cx="60" cy="36" r="1.8" fill="#ffffff" />

        {/* Cute White Smile */}
        <path d="M42 52 Q50 57 58 52" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
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
      content: '👋 **Hello! Welcome to FraudShield AI Advisor!** Powered by **NVIDIA NIM** (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`).\n\nAsk me anything about FraudShield architecture, 3-tier risk routing, Isolation Forest ML vectors, DAML Canton smart contracts, or live system metrics.',
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
    <div className="fixed bottom-4 right-4 z-50 font-sans pointer-events-none">
      {/* Floating Action Launcher Button & Non-Obstructive Head Conversation Speech Bubble */}
      {!isOpen && (
        <div className="relative group flex flex-col items-end pointer-events-auto">
          {/* Compact Non-Obstructive Speech Bubble Positioned Above Bot */}
          <div className="mb-1.5 bg-slate-900/95 border-2 border-emerald-400 text-emerald-300 text-[11px] font-black px-3.5 py-1.5 rounded-2xl shadow-2xl backdrop-blur-md whitespace-nowrap animate-bounce flex items-center gap-1.5 transition-all duration-500 relative">
            <span>{DYNAMIC_HEAD_PROMPTS[promptIdx]}</span>
            {/* Pointer tail pointing down to bot head */}
            <div className="absolute -bottom-2 right-8 w-3 h-3 bg-slate-900 border-r-2 border-b-2 border-emerald-400 rotate-45"></div>
          </div>

          {/* Pure Floating Teal Waving Robot Body */}
          <button
            onClick={() => setIsOpen(true)}
            className="bg-transparent border-0 p-0 hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none cursor-pointer filter drop-shadow-[0_10px_20px_rgba(52,211,153,0.4)]"
            title="Click to talk to FraudShield AI Advisor"
          >
            <TealCuteWavingBot size={75} />
          </button>
        </div>
      )}

      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="w-[400px] max-w-[90vw] h-[580px] max-h-[82vh] bg-slate-950 rounded-2xl shadow-2xl border border-emerald-500/40 flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
          
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TealCuteWavingBot size={44} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white tracking-tight">FraudShield AI Advisor</h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase">
                    NVIDIA NIM
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
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
                className="whitespace-nowrap bg-slate-800/90 hover:bg-emerald-900/50 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-200 border border-slate-700 text-[10px] font-medium px-2.5 py-1 rounded-full transition-all flex-shrink-0 cursor-pointer"
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
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none'
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
                <div className="bg-slate-900/90 border border-emerald-500/30 p-3 rounded-2xl rounded-bl-none text-xs text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-emerald-400 font-mono text-[11px]">NVIDIA Nemotron is reasoning…</span>
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
              className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-emerald-500 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none placeholder-slate-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center min-w-[50px] cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
