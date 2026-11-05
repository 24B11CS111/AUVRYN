'use client';

import React, { useState, useTransition } from 'react';
import { CommunicationsNav } from '../CommunicationsNav';
import type { NotificationTemplate } from '@edu-platform/types';
import { createNotificationTemplateAction } from '../actions';
import {
  FileText,
  PlusCircle,
  X,
  AlertCircle,
} from 'lucide-react';

interface TemplatesClientProps {
  initialTemplates: NotificationTemplate[];
  userRole?: string;
}

export function TemplatesClient({
  initialTemplates,
  userRole,
}: TemplatesClientProps) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(initialTemplates);
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [templateCode, setTemplateCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('attendance');
  const [channel, setChannel] = useState('in_app');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [variablesStr, setVariablesStr] = useState('student_name, date, status');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const variables = variablesStr
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    startTransition(async () => {
      const res = await createNotificationTemplateAction({
        templateCode: templateCode.trim(),
        name: name.trim(),
        category,
        channel,
        subjectTemplate: subjectTemplate.trim() || undefined,
        bodyTemplate: bodyTemplate.trim(),
        variables,
      });

      if (res.success && res.data) {
        setTemplates((prev) => [res.data!, ...prev.filter((t) => t.templateCode !== res.data!.templateCode)]);
        setShowModal(false);
        setTemplateCode('');
        setName('');
        setBodyTemplate('');
      } else {
        setError(res.error || 'Failed to save template');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Notification Templates
          </h1>
          <p className="text-sm text-slate-500">
            Pre-approved message blueprints with dynamic placeholder interpolation
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      <CommunicationsNav userRole={userRole} />

      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No templates found</h3>
            <p className="text-xs text-slate-500 mt-1">Create your first automated notification template.</p>
          </div>
        ) : (
          templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{tpl.name}</h3>
                  <div className="text-[11px] font-mono text-slate-500">{tpl.templateCode}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {tpl.channel}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {tpl.category}
                  </span>
                </div>
              </div>

              {tpl.subjectTemplate && (
                <div className="text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-slate-400">Subject: </span>
                  {tpl.subjectTemplate}
                </div>
              )}

              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-[11px] whitespace-pre-wrap">
                {tpl.bodyTemplate}
              </div>

              {tpl.variables && tpl.variables.length > 0 && (
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium">Placeholders:</span>
                  {tpl.variables.map((v, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create Notification Template</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Template Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="ATTENDANCE_ABSENT_ALERT"
                    value={templateCode}
                    onChange={(e) => setTemplateCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Friendly Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Student Absence Alert"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="attendance">Attendance</option>
                    <option value="examinations">Examinations</option>
                    <option value="results">Results</option>
                    <option value="fees_payments">Fees & Payments</option>
                    <option value="homework">Homework</option>
                    <option value="announcements">Announcements</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Channel *</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="in_app">In-App</option>
                    <option value="push">Push</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Subject (Optional)</label>
                <input
                  type="text"
                  placeholder="Absence notification for {{student_name}}"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message Body *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Dear Parent, your child {{student_name}} was marked {{status}} on {{date}}."
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Placeholders (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="student_name, date, status"
                  value={variablesStr}
                  onChange={(e) => setVariablesStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
