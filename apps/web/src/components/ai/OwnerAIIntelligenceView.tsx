'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getInstitutionalMetricsAction,
  askOwnerIntelligenceAction,
  generateExecutiveReportAction,
} from '@/app/actions/aiActions';
import {
  Sparkles,
  Users,
  UserCheck,
  CalendarCheck,
  CreditCard,
  Send,
  Loader2,
  FileText,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface MetricData {
  institutionName: string;
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  attendanceRatePercent: number | null;
  totalAttendanceRecords: number;
  totalFeeAssigned: number;
  totalFeeCollected: number;
  feeCollectionRatePercent: number | null;
  pendingFeeAmount: number;
}

interface ChatMessage {
  id: string;
  sender: 'owner' | 'advisor';
  text: string;
  timestamp: string;
}

export function OwnerAIIntelligenceView() {
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'advisor',
      text: 'Welcome to Executive AI Intelligence. I have synthesized your institution\'s real-time operational, attendance, and fee collection telemetry. What executive insights or financial risks would you like to review today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Report State
  const [reportType, setReportType] = useState<'monthly_operations' | 'fee_collection_analysis' | 'attendance_retention_review' | 'term_performance'>('monthly_operations');
  const [reportingPeriod, setReportingPeriod] = useState('November 2026');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<{
    draftId?: string;
    title?: string;
    content?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadMetrics() {
      setLoadingMetrics(true);
      const res = await getInstitutionalMetricsAction();
      setLoadingMetrics(false);
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    }
    loadMetrics();
  }, []);

  const handleAskIntelligence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isAsking) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'owner',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setChatError(null);
    setIsAsking(true);

    const res = await askOwnerIntelligenceAction({ prompt: userMsg.text });
    setIsAsking(false);

    if (res.success && res.data) {
      const advisorMsg: ChatMessage = {
        id: `adv-${Date.now()}`,
        sender: 'advisor',
        text: res.data.content || 'Executive analysis complete.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, advisorMsg]);
    } else {
      setChatError(res.error || 'Failed to complete executive query.');
    }
  };

  const handleGenerateReport = async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    setChatError(null);

    const res = await generateExecutiveReportAction({
      reportType,
      reportingPeriod,
    });

    setIsGeneratingReport(false);
    if (res.success && res.data) {
      setGeneratedReport({
        draftId: res.data.draftId,
        title: res.data.reportTitle,
        content: res.data.reportContent,
      });
    } else {
      setChatError(res.error || 'Failed to generate institutional governance report.');
    }
  };

  const handleCopyReport = () => {
    if (generatedReport?.content) {
      navigator.clipboard.writeText(generatedReport.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#0B1E3F] text-white border border-[#142C4C] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold text-[#60A5FA] uppercase tracking-wider">
            AUVRYN Executive Intelligence &bull; Leadership Decision Support
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Institutional AI Intelligence</h1>
          <p className="text-xs text-slate-300 mt-1">
            Real-time telemetry, predictive analytics, and executive board reporting for leadership.
          </p>
        </div>

        <Link
          href="/dashboard/ai-drafts"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-white/20 self-start sm:self-auto"
        >
          <span>Audit Drafts</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI METRIC CARDS (Verified Institutional Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Enrollment</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {loadingMetrics ? '...' : metrics?.totalStudents ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {metrics?.totalClasses ?? 0} academic classes
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Faculty & Staff</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {loadingMetrics ? '...' : metrics?.totalStaff ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Active institutional staff members</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Attendance Rate</span>
            <CalendarCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {loadingMetrics ? '...' : metrics?.attendanceRatePercent !== null ? `${metrics?.attendanceRatePercent}%` : 'N/A'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Based on {metrics?.totalAttendanceRecords ?? 0} logged sessions
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Fee Realization</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {loadingMetrics ? '...' : metrics?.feeCollectionRatePercent !== null ? `${metrics?.feeCollectionRatePercent}%` : 'N/A'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Balance: ₹{metrics?.pendingFeeAmount?.toLocaleString() ?? 0}
          </div>
        </div>
      </div>

      {/* Two Column Grid: Executive Chat Advisor & Report Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Executive AI Advisor Chat */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[520px]">
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Natural-Language Strategic Analytics</span>
            </div>
            <span className="text-[10px] text-indigo-300 font-semibold px-2 py-0.5 rounded-full bg-slate-800">
              RLS-Scoped
            </span>
          </div>

          {chatError && (
            <div className="p-2.5 mx-3 mt-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center justify-between">
              <span>{chatError}</span>
              <button type="button" onClick={() => setChatError(null)} className="font-bold text-red-600">✕</button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'owner' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    m.sender === 'owner'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {m.sender === 'owner' ? 'You (Leadership)' : 'Executive AI'} • {m.timestamp}
                </span>
              </div>
            ))}

            {isAsking && (
              <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                Synthesizing institutional metrics and generating strategic insights...
              </div>
            )}
          </div>

          {/* Chat Form */}
          <form
            onSubmit={handleAskIntelligence}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question (e.g. 'What is our fee collection shortfall and attendance trend?')..."
              disabled={isAsking}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAsking || !inputText.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition"
            >
              {isAsking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Query</span>
            </button>
          </form>
        </div>

        {/* Right: Board Governance Report Generator */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Executive Report Generator</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate structured institutional review briefs for board meetings.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Report Template
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="monthly_operations">Monthly Operational & Leadership Review</option>
                <option value="fee_collection_analysis">Fee Collection & Revenue Health Report</option>
                <option value="attendance_retention_review">Attendance & Student Retention Review</option>
                <option value="term_performance">Term Academic Governance Review</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Reporting Period
              </label>
              <input
                type="text"
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                placeholder="e.g. November 2026, Term 1 FY26"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Compiling Board Governance Report...
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  Generate Executive Report
                </>
              )}
            </button>
          </div>

          {/* Generated Report Preview */}
          {generatedReport && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 line-clamp-1">
                  {generatedReport.title}
                </span>
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {generatedReport.content}
              </div>

              {generatedReport.draftId && (
                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                  Persisted as draft: {generatedReport.draftId}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
