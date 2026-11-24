'use client';

import React from 'react';
import { Landmark } from 'lucide-react';

export interface UniversityCreditRegistryProps {
  degreeName?: string;
  departmentName?: string;
  totalCreditsRequired?: number;
  creditsEarned?: number;
  currentCgpa?: number;
  studentName?: string;
}

export function UniversityCreditRegistry({
  degreeName = 'B.Tech in Computer Science & Engineering',
  departmentName = 'Faculty of Engineering & Applied Sciences',
  totalCreditsRequired = 160,
  creditsEarned = 118,
  currentCgpa = 8.76,
  studentName = 'Scholar',
}: UniversityCreditRegistryProps) {
  const completionPct = Math.min(100, Math.round((creditsEarned / totalCreditsRequired) * 100));

  const semesters = [
    { sem: 'Semester I', credits: 21, sgpa: 8.4, status: 'Completed', term: 'Fall 2023' },
    { sem: 'Semester II', credits: 22, sgpa: 8.6, status: 'Completed', term: 'Spring 2024' },
    { sem: 'Semester III', credits: 24, sgpa: 8.8, status: 'Completed', term: 'Fall 2024' },
    { sem: 'Semester IV', credits: 25, sgpa: 9.0, status: 'Completed', term: 'Spring 2025' },
    { sem: 'Semester V', credits: 26, sgpa: 8.9, status: 'Completed', term: 'Fall 2025' },
    { sem: 'Semester VI', credits: 22, sgpa: null, status: 'In Progress', term: 'Spring 2026' },
    { sem: 'Semester VII', credits: 12, sgpa: null, status: 'Scheduled', term: 'Fall 2026' },
    { sem: 'Semester VIII', credits: 8, sgpa: null, status: 'Capstone', term: 'Spring 2027' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
      {/* Registry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B1E3F] text-white flex items-center justify-center shadow-xs">
            <Landmark className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Academic Degree Registry & Credit Audit</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                UGC / ABET Compliant
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {degreeName} &bull; {departmentName}{studentName ? ` &bull; ${studentName}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Cumulative GPA
            </span>
            <span className="text-xl font-black text-blue-600 leading-none">
              {currentCgpa} <span className="text-xs font-normal text-slate-400">/ 10.0</span>
            </span>
          </div>
        </div>
      </div>

      {/* Credit Completion Progress Bar */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Degree Credits Progress: <strong>{creditsEarned}</strong> of {totalCreditsRequired} Credits Earned
          </span>
          <span className="font-bold text-blue-600">{completionPct}% Complete</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-700"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>Major Core: 78/80</span>
          <span>Department Electives: 18/24</span>
          <span>Open Electives: 12/16</span>
          <span>Research / Capstone: 10/40</span>
        </div>
      </div>

      {/* Semester Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px]">
              <th className="py-2.5 px-3">Semester</th>
              <th className="py-2.5 px-3">Term</th>
              <th className="py-2.5 px-3">Credits</th>
              <th className="py-2.5 px-3">SGPA</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {semesters.map((s) => (
              <tr key={s.sem} className="hover:bg-slate-50 transition">
                <td className="py-2.5 px-3 font-semibold text-slate-800">{s.sem}</td>
                <td className="py-2.5 px-3 text-slate-500">{s.term}</td>
                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{s.credits} Credits</td>
                <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                  {s.sgpa ? s.sgpa.toFixed(2) : '—'}
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : s.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
