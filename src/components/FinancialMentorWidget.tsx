import React, { useState, useRef, useEffect } from 'react';
import {
  GraduationCap,
  X,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  BookOpen,
  ChevronDown,
  MessageSquare,
} from 'lucide-react';
import { askFinancialMentor } from '../services/mentorService';
import { StockContext } from '../utils/committeeOrchestrator';

export interface FinancialMentorWidgetProps {
  currentStock?: StockContext | null;
  className?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'mentor';
  text: string;
  timestamp: string;
}

const QUICK_SUGGESTION_CHIPS = [
  'Explain Graham Number',
  'What is Moat?',
  'What is D/E Ratio?',
  'Why PTJ Veto?',
  'What is Margin of Safety?',
  'How does GTT Stop-Loss work?',
  'What is P/E Ratio?',
];

function formatTime(): string {
  return new Date().toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderFormattedMessage(text: string) {
  const lines = text.split('\n');

  return lines.map((line, lIdx) => {
    // If empty line
    if (!line.trim()) {
      return <div key={lIdx} className="h-2" />;
    }

    // Split on **...** for bold highlights
    const parts = line.split(/(\*\*[^*]+\*\*)/g);

    return (
      <p key={lIdx} className="leading-relaxed">
        {parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-bold text-white tracking-tight">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return (
              <em key={pIdx} className="text-cyan-200/90 italic">
                {part.slice(1, -1)}
              </em>
            );
          }
          return part;
        })}
      </p>
    );
  });
}

export const FinancialMentorWidget: React.FC<FinancialMentorWidgetProps> = ({
  currentStock,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadHint, setHasUnreadHint] = useState(true);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'mentor',
      text:
        "Namaste! 👋 I'm your **FinSense Mentor**.\n\nAsk me about any financial word, formula, or committee debate metric from **Graham, Buffett, Munger, or Jones**—I explain everything in plain English with everyday analogies!",
      timestamp: formatTime(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setHasUnreadHint(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText ?? inputQuery).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: formatTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const answer = await askFinancialMentor(textToSend, {
        symbol: currentStock?.symbol,
      });

      const mentorMessage: ChatMessage = {
        id: `mentor-${Date.now()}`,
        sender: 'mentor',
        text: answer,
        timestamp: formatTime(),
      };

      setMessages((prev) => [...prev, mentorMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `mentor-err-${Date.now()}`,
          sender: 'mentor',
          text:
            "I apologize, I encountered a brief calculation glitch. Please ask about terms like **Graham Number**, **Moat**, or **Margin of Safety**!",
          timestamp: formatTime(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'mentor',
        text:
          "Chat reset! Ask me any financial or trading question in plain English.",
        timestamp: formatTime(),
      },
    ]);
  };

  return (
    <div className={`fixed bottom-6 left-6 z-50 ${className}`}>
      {/* Minimized Trigger Button */}
      {!isOpen && (
        <div className="relative group">
          {/* Subtle Notification Tooltip Callout */}
          {hasUnreadHint && (
            <div className="pointer-events-none absolute -top-10 left-0 whitespace-nowrap rounded-lg border border-cyan-400/40 bg-navy-950/95 px-3 py-1 text-[11px] font-semibold text-cyan-200 shadow-xl shadow-cyan-950/60 ring-1 ring-cyan-400/30 backdrop-blur-md animate-bounce">
              <span>Confused by debate terms? Click here ✨</span>
              <div className="absolute left-6 top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-navy-950" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 rounded-full border border-cyan-400/50 bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.25)] ring-2 ring-cyan-400/30 transition-all duration-300 hover:scale-105 hover:border-cyan-300 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] active:scale-95"
            aria-label="Open Financial Mentor Assistant"
          >
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 text-navy-950 shadow-md">
              <GraduationCap className="h-4 w-4 stroke-[2.5]" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>

            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                <span>Ask Mentor AI</span>
                <span className="rounded bg-cyan-500/20 px-1 py-0.2 text-[9px] font-mono text-cyan-300">
                  Beginner
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Term Explainer & Analogy Engine
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Expanded Chat Drawer Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[460px] bg-[#0b1329] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black/80 flex flex-col backdrop-blur-2xl animate-fadeIn overflow-hidden ring-1 ring-cyan-500/30">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-navy-950/80 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-emerald-500/20 ring-1 ring-cyan-400/40">
                <GraduationCap className="h-4 w-4 text-cyan-300" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white tracking-wide">
                    FinSense Mentor
                  </h3>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Demystifying committee jargon for retail beginners
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                title="Reset conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                title="Minimize Mentor window"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick-Tap Suggestion Chips Bar (Horizontally scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 border-b border-white/5 bg-navy-950/40 scrollbar-none shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 mr-0.5">
              Quick:
            </span>
            {QUICK_SUGGESTION_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200 transition hover:bg-cyan-500/20 hover:border-cyan-400/60 active:scale-95 whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Transcript Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fadeIn`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 shadow-md ${
                      isUser
                        ? 'rounded-tr-xs bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium'
                        : 'rounded-tl-xs border border-white/10 bg-navy-850/95 text-slate-200'
                    }`}
                  >
                    {!isUser && (
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                        <Bot className="h-3 w-3 text-cyan-400" />
                        <span>FinSense Teacher</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      {renderFormattedMessage(msg.text)}
                    </div>
                  </div>

                  <span className="mt-1 px-1 font-mono text-[9px] text-slate-500">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2 animate-pulse">
                <div className="rounded-2xl rounded-tl-xs border border-white/10 bg-navy-850/90 p-3 text-xs text-cyan-300 flex items-center gap-2">
                  <Bot className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
                  <span className="font-mono text-[11px] text-slate-300">
                    FinSense Mentor is formulating plain-English explanation...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-white/10 bg-navy-950/90 p-2.5 shrink-0">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any financial word or metric..."
                className="w-full rounded-xl border border-white/10 bg-navy-900 py-2 pl-3 pr-10 text-xs font-medium text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isLoading}
                className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500 text-navy-950 transition hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                title="Send query"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between px-1 text-[9px] text-slate-500">
              <span>Instant offline answers + real-world analogies</span>
              <span>Press Enter ↵</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialMentorWidget;
