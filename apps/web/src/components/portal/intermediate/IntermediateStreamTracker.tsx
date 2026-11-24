'use client';

import React, { useState } from 'react';
import {
  Target,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

export interface IntermediateStreamTrackerProps {
  currentStream?: 'MPC' | 'BiPC' | 'MEC' | 'CEC';
}

interface StreamConfig {
  name: string;
  fullName: string;
  subjects: string[];
  competitiveExams: string[];
  mockStats: {
    examName: string;
    score: number;
    maxScore: number;
    percentile: number;
    projectedRank: string;
    subjects: Array<{ name: string; score: number; accuracy: number; totalQuestions: number }>;
  };
}

const STREAM_DATA: Record<string, StreamConfig> = {
  MPC: {
    name: 'MPC',
    fullName: 'Mathematics, Physics & Chemistry',
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'English', 'Sanskrit'],
    competitiveExams: ['JEE Main', 'JEE Advanced', 'EAMCET', 'BITSAT'],
    mockStats: {
      examName: 'All India JEE Main Full Mock 04',
      score: 242,
      maxScore: 300,
      percentile: 98.74,
      projectedRank: 'AIR 4,120 – 5,200',
      subjects: [
        { name: 'Mathematics', score: 78, accuracy: 82, totalQuestions: 25 },
        { name: 'Physics', score: 82, accuracy: 88, totalQuestions: 25 },
        { name: 'Chemistry', score: 82, accuracy: 92, totalQuestions: 25 },
      ],
    },
  },
  BiPC: {
    name: 'BiPC',
    fullName: 'Biology, Physics & Chemistry',
    subjects: ['Botany', 'Zoology', 'Physics', 'Chemistry', 'English'],
    competitiveExams: ['NEET UG', 'EAMCET (Agri & Med)', 'AIIMS Nursing'],
    mockStats: {
      examName: 'National NEET Grand Mock 03',
      score: 648,
      maxScore: 720,
      percentile: 99.12,
      projectedRank: 'AIR 1,850 – 2,400',
      subjects: [
        { name: 'Biology (Botany + Zoology)', score: 340, accuracy: 95, totalQuestions: 90 },
        { name: 'Physics', score: 146, accuracy: 82, totalQuestions: 45 },
        { name: 'Chemistry', score: 162, accuracy: 90, totalQuestions: 45 },
      ],
    },
  },
  MEC: {
    name: 'MEC',
    fullName: 'Mathematics, Economics & Commerce',
    subjects: ['Mathematics', 'Economics', 'Commerce', 'Accountancy'],
    competitiveExams: ['CA Foundation', 'CUET (Commerce)', 'IPMAT', 'CLAT'],
    mockStats: {
      examName: 'CA Foundation Diagnostic Test 02',
      score: 334,
      maxScore: 400,
      percentile: 97.5,
      projectedRank: 'Top 2.5% Distinction',
      subjects: [
        { name: 'Accounting Principles', score: 88, accuracy: 91, totalQuestions: 25 },
        { name: 'Business Mathematics', score: 82, accuracy: 85, totalQuestions: 25 },
        { name: 'Economics & Commercial Knowledge', score: 84, accuracy: 89, totalQuestions: 25 },
        { name: 'Business Laws', score: 80, accuracy: 84, totalQuestions: 25 },
      ],
    },
  },
  CEC: {
    name: 'CEC',
    fullName: 'Civics, Economics & Commerce',
    subjects: ['Civics / Political Science', 'Economics', 'Commerce', 'Accountancy'],
    competitiveExams: ['CLAT', 'CUET (Arts/Commerce)', 'State Civil Foundations'],
    mockStats: {
      examName: 'Law & Commerce Integrated Mock 01',
      score: 118,
      maxScore: 150,
      percentile: 96.8,
      projectedRank: 'Top 3.2% Qualifier',
      subjects: [
        { name: 'Legal Reasoning', score: 32, accuracy: 88, totalQuestions: 35 },
        { name: 'Current Affairs & GK', score: 28, accuracy: 85, totalQuestions: 30 },
        { name: 'Logical Reasoning', score: 30, accuracy: 90, totalQuestions: 30 },
        { name: 'English Comprehension', score: 28, accuracy: 86, totalQuestions: 30 },
      ],
    },
  },
};

export function IntermediateStreamTracker({
  currentStream = 'MPC',
}: IntermediateStreamTrackerProps) {
  const [selectedStream, setSelectedStream] = useState<string>(currentStream);
  const streamInfo: StreamConfig = STREAM_DATA[selectedStream] ?? STREAM_DATA.MPC!;

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/30 p-5 shadow-xs space-y-5">
      {/* Header & Stream Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Junior College Stream & Competitive Analytics</span>
            </h3>
            <p className="text-xs text-slate-500">{streamInfo.fullName}</p>
          </div>
        </div>

        {/* Stream Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-indigo-100/70 rounded-xl">
          {(['MPC', 'BiPC', 'MEC', 'CEC'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedStream(s)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedStream === s
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-800 hover:bg-indigo-200/60'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Target Entrance Exams Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500">Target Portfolios:</span>
        {streamInfo.competitiveExams.map((exam) => (
          <span
            key={exam}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80"
          >
            {exam}
          </span>
        ))}
      </div>

      {/* Mock Performance Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Latest Mock Score
          </span>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {streamInfo.mockStats.score}{' '}
            <span className="text-xs font-normal text-slate-400">/ {streamInfo.mockStats.maxScore}</span>
          </div>
          <span className="text-[10px] text-slate-500 block truncate mt-1">
            {streamInfo.mockStats.examName}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            National Percentile
          </span>
          <div className="text-xl font-black text-indigo-600 mt-0.5">
            {streamInfo.mockStats.percentile}%
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> Top Decile Qualifier
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Projected Competitive Rank
          </span>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {streamInfo.mockStats.projectedRank}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Based on nationwide benchmarking</span>
        </div>
      </div>

      {/* Subject-Wise Accuracy Matrix */}
      <div className="p-4 rounded-xl bg-white border border-indigo-100 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Subject Accuracy & Problem-Solving Speed
          </span>
          <span className="text-[11px] font-normal text-slate-400">Target Accuracy: &gt;80%</span>
        </h4>

        <div className="space-y-2.5">
          {streamInfo.mockStats.subjects.map((sub) => (
            <div key={sub.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{sub.name}</span>
                <span className="font-bold text-slate-900">
                  {sub.accuracy}% accuracy &bull; {sub.score} marks
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    sub.accuracy >= 90
                      ? 'bg-emerald-500'
                      : sub.accuracy >= 80
                      ? 'bg-indigo-600'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${sub.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
