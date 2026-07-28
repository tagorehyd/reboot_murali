import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PRESET_QUESTIONS = [
  { label: '🛡️ 3-Tier Risk Routing', query: 'Explain how FraudShield routes transactions across the LOW, MEDIUM, and HIGH risk tiers.' },
  { label: '🧠 Isolation Forest 8D Vector', query: 'How does the Isolation Forest ML service extract features and score transactions?' },
  { label: '⛓️ Canton Blockchain Consensus', query: 'What DAML smart contracts are used on the Canton ledger and how do they enforce security?' },
  { label: '📊 Live System Status', query: 'What is the current status of users, mempool transactions, and ML service in FraudShield?' },
];

export default function NvidiaNimChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 **Welcome to FraudShield AI Advisor!** Powered by **NVIDIA NIM** (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`).\n\nAsk me anything about FraudShield architecture, 3-tier risk routing, Isolation Forest ML vectors, DAML Canton smart contracts, or live system metrics.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const messagesEndRef = useRef(null);

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
      // Build conversation history format for API payload
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
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 text-white rounded-full shadow-2xl border border-emerald-400/40 hover:scale-105 transition-all duration-300 focus:outline-none"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-sm border border-emerald-400/50">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30"></span>
            NV
          </div>
          <div className="text-left">
            <p className="text-xs font-black tracking-wider uppercase text-emerald-300 flex items-center gap-1.5">
              <span>NVIDIA AI Advisor</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </p>
            <p className="text-[10px] text-slate-300">Live Demo Assistant</p>
          </div>
        </button>
      )}

      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="w-[420px] max-w-[92vw] h-[600px] max-h-[85vh] bg-slate-950 rounded-2xl shadow-2xl border border-emerald-500/30 flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-sm shadow-md border border-emerald-400/30">
                NV
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white tracking-tight">FraudShield AI Advisor</h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase">
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
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
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
                className="whitespace-nowrap bg-slate-800/90 hover:bg-emerald-900/50 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-200 border border-slate-700 text-[10px] font-medium px-2.5 py-1 rounded-full transition-all flex-shrink-0"
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
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center min-w-[50px]"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
