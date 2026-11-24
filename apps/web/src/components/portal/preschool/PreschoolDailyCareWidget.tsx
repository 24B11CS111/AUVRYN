'use client';

import React, { useState } from 'react';
import {
  Baby,
  Sun,
  Moon,
  Coffee,
  Heart,
  ShieldCheck,
  Thermometer,
  Sparkles,
  Edit3,
} from 'lucide-react';

export interface PreschoolDailyCareProps {
  childName: string;
  className?: string;
  isTeacherView?: boolean;
}

export function PreschoolDailyCareWidget({
  childName,
  className = 'Playgroup',
  isTeacherView = false,
}: PreschoolDailyCareProps) {
  const [mood, setMood] = useState<'happy' | 'playful' | 'sleepy' | 'curious'>('happy');
  const [temperature, setTemperature] = useState<string>('98.4°F');
  const [napMinutes, setNapMinutes] = useState<number>(90);
  const [caregiverNote, setCaregiverNote] = useState<string>(
    'Had a wonderful morning singing alphabet rhymes and enjoyed finger painting with bright watercolors!'
  );
  const [isEditingNote, setIsEditingNote] = useState(false);

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/40 p-5 shadow-xs space-y-5">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Early Learning & Daily Care Digest</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 uppercase">
                {className}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Live updates on health, meals, rest and milestones for <strong className="text-slate-800">{childName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 bg-sky-100/80 px-3 py-1 rounded-full w-fit">
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Caregiver Verified</span>
        </div>
      </div>

      {/* Grid of Key Care Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Morning Health & Temperature */}
        <div className="p-3.5 rounded-xl bg-white border border-sky-100 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Temperature
            </span>
            <div className="text-lg font-bold text-slate-800">{temperature}</div>
            <span className="text-[10px] font-medium text-emerald-600">Normal & Healthy</span>
          </div>
        </div>

        {/* Nap Time & Rest */}
        <div className="p-3.5 rounded-xl bg-white border border-sky-100 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Afternoon Nap
            </span>
            <div className="text-lg font-bold text-slate-800">{napMinutes} mins</div>
            <span className="text-[10px] font-medium text-indigo-600">12:30 PM – 2:00 PM</span>
          </div>
        </div>

        {/* Meals & Nutrition */}
        <div className="p-3.5 rounded-xl bg-white border border-sky-100 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Nutrition & Meals
            </span>
            <div className="text-lg font-bold text-slate-800">100% Eaten</div>
            <span className="text-[10px] font-medium text-amber-700">Fruit, Oats & Milk</span>
          </div>
        </div>

        {/* Mood & Wellbeing */}
        <div className="p-3.5 rounded-xl bg-white border border-sky-100 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-100">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Daily Mood
            </span>
            <div className="text-lg font-bold text-slate-800 capitalize">{mood}</div>
            <span className="text-[10px] font-medium text-pink-600">Active & Cheerful</span>
          </div>
        </div>
      </div>

      {/* Timeline of Day's Activities & Educator Notes */}
      <div className="p-4 rounded-xl bg-white border border-sky-100 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Today&apos;s Early Learning Journey</span>
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
              09:15 AM
            </span>
            <span className="text-slate-700">
              <strong>Morning Welcome Circle:</strong> Participated with enthusiasm in action songs and attendance game.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
              10:45 AM
            </span>
            <span className="text-slate-700">
              <strong>Sensory Motor Play:</strong> Built a 6-block colored tower and recognized red, blue, and yellow blocks.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
              01:15 PM
            </span>
            <span className="text-slate-700">
              <strong>Storybook Hour:</strong> Listened attentively to &ldquo;The Friendly Caterpillar&rdquo; with classmates.
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 bg-sky-50/60 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <strong className="text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              Educator Remarks:
            </strong>
            {isTeacherView && (
              <button
                type="button"
                onClick={() => setIsEditingNote(!isEditingNote)}
                className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> {isEditingNote ? 'Done' : 'Update'}
              </button>
            )}
          </div>
          {isEditingNote && isTeacherView ? (
            <div className="space-y-2 mt-2">
              <textarea
                value={caregiverNote}
                onChange={(e) => setCaregiverNote(e.target.value)}
                className="w-full p-2 text-xs border border-sky-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                rows={2}
              />
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="font-semibold text-slate-700">Quick Mood:</span>
                {(['happy', 'playful', 'sleepy', 'curious'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    className={`px-2 py-0.5 rounded capitalize ${
                      mood === m ? 'bg-sky-600 text-white font-bold' : 'bg-white border text-slate-600'
                    }`}
                  >
                    {m}
                  </button>
                ))}
                <span className="font-semibold text-slate-700 ml-2">Temp:</span>
                <button
                  type="button"
                  onClick={() => setTemperature('98.4°F')}
                  className="px-2 py-0.5 rounded bg-white border text-slate-600 hover:bg-slate-50"
                >
                  98.4°F
                </button>
                <button
                  type="button"
                  onClick={() => setNapMinutes((prev) => (prev === 90 ? 120 : 90))}
                  className="px-2 py-0.5 rounded bg-white border text-slate-600 hover:bg-slate-50"
                >
                  Toggle Nap ({napMinutes}m)
                </button>
              </div>
            </div>
          ) : (
            <p>{caregiverNote}</p>
          )}
        </div>
      </div>
    </div>
  );
}
