'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createHomeworkAssignmentAction } from '../actions';
import {
  ArrowLeft,
  BookOpen,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface NewAssignmentClientProps {
  academicYears: Array<{ id: string; name: string }>;
  classes: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string; classId: string }>;
  subjects: Array<{ id: string; name: string; code: string }>;
}

export function NewAssignmentClient({
  academicYears,
  classes,
  sections,
  subjects,
}: NewAssignmentClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id || '');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dueTime, setDueTime] = useState('23:59');
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(true);
  const [latePenaltyPercent, setLatePenaltyPercent] = useState(10);

  const filteredSections = sections.filter((s) => s.classId === classId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !academicYearId || !classId || !subjectId || !dueDate) {
      setError('Please fill all mandatory fields.');
      return;
    }

    startTransition(async () => {
      const res = await createHomeworkAssignmentAction({
        academicYearId,
        classId,
        sectionId: sectionId || undefined,
        subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        maxMarks,
        dueDate,
        dueTime: dueTime || undefined,
        allowLateSubmissions,
        latePenaltyPercent,
        status: 'published',
      });

      if (res.success) {
        router.push('/dashboard/assignments');
      } else {
        setError(res.error || 'Failed to create assignment');
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/assignments"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Assignment
          </h1>
          <p className="text-sm text-slate-500">
            Assign coursework, project rubrics, and submission deadlines
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Assignment Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 4: Quadratic Equations Problem Set"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Year *
            </label>
            <select
              required
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Class *
            </label>
            <select
              required
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId('');
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Section (Optional)
            </label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            >
              <option value="">All Sections</option>
              {filteredSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject *
            </label>
            <select
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Due Time
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Maximum Marks *
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              required
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief summary of homework topic"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Detailed Instructions
          </label>
          <textarea
            rows={5}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Step-by-step instructions or problems to solve..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white leading-relaxed"
          />
        </div>

        {/* Late submission settings */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900">Allow Late Submissions</div>
              <div className="text-[11px] text-slate-500">Students can submit after deadline with late marking</div>
            </div>
            <input
              type="checkbox"
              checked={allowLateSubmissions}
              onChange={(e) => setAllowLateSubmissions(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
          </div>

          {allowLateSubmissions && (
            <div className="pt-2 flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Late Submission Penalty (%):
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={latePenaltyPercent}
                onChange={(e) => setLatePenaltyPercent(Number(e.target.value))}
                className="w-24 px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
              />
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            href="/dashboard/assignments"
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            <span>Publish Assignment</span>
          </button>
        </div>
      </form>
    </div>
  );
}
