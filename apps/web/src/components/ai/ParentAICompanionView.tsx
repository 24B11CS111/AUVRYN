'use client';

import React, { useState, useEffect } from 'react';
import {
  getParentLinkedStudentsAction,
  askParentCompanionAction,
  explainAcademicReportAction,
  explainTimetableAndEventsAction,
} from '@/app/actions/aiActions';
import {
  Heart,
  Send,
  Loader2,
  CalendarCheck,
  Award,
  CalendarDays,
  User,
} from 'lucide-react';

interface ChildItem {
  id: string;
  name: string;
  className: string;
  sectionName: string;
}

interface Message {
  id: string;
  sender: 'parent' | 'companion';
  text: string;
  timestamp: string;
}

export function ParentAICompanionView({ initialStudentId }: { initialStudentId?: string }) {
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>(initialStudentId || '');

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      sender: 'companion',
      text: 'Hello! I am your Parent AI Companion. I am here to help you understand your child\'s school journey, explain report cards and attendance, and give you practical, positive tips for supporting them at home. How can I help today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadChildren() {
      const res = await getParentLinkedStudentsAction();
      if (res.success && res.data && res.data.length > 0) {
        setChildren(res.data);
        const first = res.data[0];
        if (first && (!selectedChildId || !res.data.some((c) => c.id === selectedChildId))) {
          setSelectedChildId(first.id);
        }
      }
    }
    loadChildren();
  }, [initialStudentId]);

  const activeChild = children.find((c) => c.id === selectedChildId);

  const handleSendMessage = async (promptText?: string) => {
    const textToSend = promptText || inputText.trim();
    if (!textToSend || !selectedChildId || isSending) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'parent',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInputText('');
    setErrorMessage(null);
    setIsSending(true);

    const res = await askParentCompanionAction({
      studentId: selectedChildId,
      prompt: textToSend,
    });

    setIsSending(false);
    if (res.success && res.data) {
      const compMsg: Message = {
        id: `comp-${Date.now()}`,
        sender: 'companion',
        text: res.data.content || 'I have reviewed your child\'s school progress.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, compMsg]);
    } else {
      setErrorMessage(res.error || 'Failed to receive companion response.');
    }
  };

  const handleExplainReport = async () => {
    if (!selectedChildId || isSending) return;
    setIsSending(true);
    setErrorMessage(null);

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'parent',
      text: 'Please explain my child\'s latest published examination report card in simple terms.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    const res = await explainAcademicReportAction({ studentId: selectedChildId });
    setIsSending(false);

    if (res.success && res.data) {
      const compMsg: Message = {
        id: `comp-${Date.now()}`,
        sender: 'companion',
        text: res.data.content || 'Report card explanation complete.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, compMsg]);
    } else {
      setErrorMessage(res.error || 'Unable to explain report card at this time.');
    }
  };

  const handleExplainTimetable = async () => {
    if (!selectedChildId || isSending) return;
    setIsSending(true);
    setErrorMessage(null);

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'parent',
      text: 'Please summarize our upcoming schedule and school announcements.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    const res = await explainTimetableAndEventsAction({ studentId: selectedChildId });
    setIsSending(false);

    if (res.success && res.data) {
      const compMsg: Message = {
        id: `comp-${Date.now()}`,
        sender: 'companion',
        text: res.data.content || 'Schedule explanation complete.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, compMsg]);
    } else {
      setErrorMessage(res.error || 'Unable to explain schedule at this time.');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Parent AI Companion</h2>
            <p className="text-xs text-slate-400">Empathetic explanations & home support guidance</p>
          </div>
        </div>

        {/* Child Selector */}
        {children.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-300 font-medium">Child:</span>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.className})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Child Context Pill & Quick Actions */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Discussing: {activeChild ? `${activeChild.name} (${activeChild.className} - ${activeChild.sectionName})` : 'Child Profile'}
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Private & Confidential • No peer comparisons
          </span>
        </div>

        {/* Quick Question Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleExplainReport}
            disabled={isSending || !selectedChildId}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            <Award className="w-3.5 h-3.5 text-indigo-600" />
            <span>Explain Latest Marks</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendMessage('How is my child\'s attendance and habit consistency looking?')}
            disabled={isSending || !selectedChildId}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Attendance Guidance</span>
          </button>

          <button
            type="button"
            onClick={handleExplainTimetable}
            disabled={isSending || !selectedChildId}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
          >
            <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
            <span>Timetable & Events</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="font-bold text-red-600">✕</button>
        </div>
      )}

      {/* Conversation Thread */}
      <div className="flex flex-col h-[460px]">
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'parent' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.sender === 'parent'
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {m.sender === 'parent' ? 'You' : 'Parent Companion'} • {m.timestamp}
              </span>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-600" />
              Looking into your child's records with care and guidance...
            </div>
          )}
        </div>

        {/* Chat Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about your child's progress (e.g. 'How can I encourage better study habits?')..."
            disabled={isSending || !selectedChildId}
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim() || !selectedChildId}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition"
          >
            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
