import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  BookOpen,
  Calendar,
  Megaphone,
  CheckSquare,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../lib/auth';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citation?: string;
  timestamp: string;
}

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIAssistantModal({ isOpen, onClose }: AIAssistantModalProps) {
  const { user } = useAuth();
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your Class Academic AI, grounded in USAR AR-1 B2's verified timetables, syllabus units, announcements, and assignments. Ask me anything about your schedule, exams, or coursework!",
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const quickPrompts = [
    'What is my next class?',
    'What assignments are due?',
    'Show Math-I syllabus units',
    'Did the timetable change?',
  ];

  const handleSend = async (queryText?: string) => {
    const query = queryText || inputQuery;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      const state = dataService.getState();
      const lower = query.toLowerCase();
      let reply = '';
      let citation = '';

      if (lower.includes('next class') || lower.includes('what class') || lower.includes('schedule today')) {
        const todayNum = new Date().getDay() === 0 ? 1 : new Date().getDay();
        const todayClasses = state.timetable.filter((t) => t.dayOfWeek === todayNum);
        if (todayClasses.length > 0) {
          const nextCls = todayClasses[0];
          reply = `Your next scheduled class for USAR AR-1 B2 is ${nextCls.subjectName} (${nextCls.type.toUpperCase()}) from ${nextCls.startTime} to ${nextCls.endTime} in Room ${nextCls.room} taught by ${nextCls.faculty}.`;
          citation = `Smart Timetable v${state.timetableVersion} • Today's Schedule`;
        } else {
          reply = "You don't have any classes scheduled for today.";
          citation = 'Smart Timetable Registry';
        }
      } else if (lower.includes('assignment') || lower.includes('homework') || lower.includes('due')) {
        const pending = state.assignments.filter((a) => a.status !== 'completed');
        if (pending.length > 0) {
          const list = pending.map((a) => `• ${a.title} (${a.subjectName}) - Due: ${new Date(a.dueDate).toLocaleDateString()}`).join('\n');
          reply = `Here are your pending coursework tasks:\n\n${list}`;
          citation = 'Assignment Submission Engine';
        } else {
          reply = 'Great job! You have no pending assignments right now.';
          citation = 'Assignment Registry';
        }
      } else {
        reply = `Based on your live class records for USAR AR-1 B2:\n• Active Timetable: Version ${state.timetableVersion}\n• Active Announcements: ${state.announcements.length} circulars\n• Coursework: ${state.assignments.filter((a) => a.status !== 'completed').length} pending assignments.`;
        citation = 'Class Academic OS Intelligence';
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        citation,
        timestamp: 'Just now',
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-2xl h-[600px] flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl z-10 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">USAR Academic Assistant</h3>
              <p className="text-[11px] text-zinc-400 font-mono">AR-1 B2 Knowledge Grounding</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="h-6 w-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={`p-3 rounded-lg max-w-[85%] space-y-1.5 ${
                  m.sender === 'user'
                    ? 'bg-zinc-100 text-zinc-950 font-medium'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                {m.citation && (
                  <div className="text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-800">
                    Source: {m.citation}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-2 items-center text-xs text-zinc-400">
              <div className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse" />
              <span>Analyzing class records...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="p-2.5 border-t border-zinc-800 bg-zinc-900/50 flex items-center gap-1.5 overflow-x-auto">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp)}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] whitespace-nowrap cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-zinc-800 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask about timetable, teachers, attendance rules..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-700"
          />
          <button
            type="submit"
            className="h-9 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center gap-1"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
