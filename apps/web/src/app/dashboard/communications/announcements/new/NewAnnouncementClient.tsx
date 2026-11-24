'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createAnnouncementAction } from '../../actions';
import {
  ArrowLeft,
  Megaphone,
  Paperclip,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export function NewAnnouncementClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<any>('institution');
  const [targetRole, setTargetRole] = useState<string>('parent');
  const [targetEntityId, setTargetEntityId] = useState<string>('');
  const [priority, setPriority] = useState<any>('standard');
  const [status, setStatus] = useState<any>('published');
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string }>>([]);
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');

  const handleAddAttachment = () => {
    if (!attName.trim() || !attUrl.trim()) return;
    setAttachments([...attachments, { name: attName.trim(), url: attUrl.trim() }]);
    setAttName('');
    setAttUrl('');
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !content.trim()) {
      setError('Please provide both title and content.');
      return;
    }

    startTransition(async () => {
      const res = await createAnnouncementAction({
        title: title.trim(),
        content: content.trim(),
        scope,
        targetRole: scope === 'role' ? (targetRole as any) : undefined,
        targetEntityId: scope !== 'institution' && scope !== 'role' && targetEntityId ? targetEntityId : undefined,
        priority,
        status,
        requiresAcknowledgement,
        attachments,
      });

      if (res.success) {
        router.push('/dashboard/communications/announcements');
      } else {
        setError(res.error || 'Failed to create announcement');
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/communications/announcements"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Announcement
          </h1>
          <p className="text-sm text-slate-500">
            Draft and publish a new official notice or institutional circular
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
            Announcement Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Annual Sports Meet 2026 Schedule & Guidelines"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Scope *
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            >
              <option value="institution">Whole Institution</option>
              <option value="role">Specific Role</option>
              <option value="class">Class</option>
              <option value="department">Department</option>
              <option value="campus">Campus</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Priority Level *
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            >
              <option value="standard">Standard</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Publication Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            >
              <option value="published">Publish Immediately</option>
              <option value="draft">Save as Draft</option>
            </select>
          </div>
        </div>

        {scope === 'role' && (
          <div className="p-3.5 rounded-lg border border-indigo-100 bg-indigo-50/50">
            <label className="block text-xs font-semibold text-indigo-950 mb-1">
              Select Recipient Audience Role *
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full sm:w-72 px-3 py-2 text-xs rounded-lg border border-indigo-200 bg-white text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
            >
              <option value="parent">Parents &amp; Guardians Only</option>
              <option value="student">Students Only</option>
              <option value="faculty">Faculty / Teaching Staff Only</option>
              <option value="staff">Administrative Staff Only</option>
            </select>
            <p className="text-[11px] text-indigo-600/80 mt-1.5">
              Only users assigned to this institutional role will receive notifications and feed visibility.
            </p>
          </div>
        )}

        {(scope === 'class' || scope === 'department' || scope === 'campus') && (
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Target {scope.charAt(0).toUpperCase() + scope.slice(1)} Identifier / ID *
            </label>
            <input
              type="text"
              required
              value={targetEntityId}
              onChange={(e) => setTargetEntityId(e.target.value)}
              placeholder={`Enter the target ${scope} UUID or code`}
              className="w-full sm:w-96 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Announcement Body *
          </label>
          <textarea
            required
            rows={7}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the full circular notice here..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 leading-relaxed"
          />
        </div>

        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-900">Mandatory Read Receipt</div>
            <div className="text-[11px] text-slate-500">Require parents or recipients to explicitly acknowledge this notice</div>
          </div>
          <input
            type="checkbox"
            checked={requiresAcknowledgement}
            onChange={(e) => setRequiresAcknowledgement(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
        </div>

        {/* Attachments */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-slate-700">
            Document Attachments (PDFs, Circular Memos)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Document Name (e.g. Schedule.pdf)"
              value={attName}
              onChange={(e) => setAttName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            />
            <input
              type="url"
              placeholder="https://example.com/doc.pdf"
              value={attUrl}
              onChange={(e) => setAttUrl(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            />
            <button
              type="button"
              onClick={handleAddAttachment}
              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition"
            >
              Add
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-1 pt-1">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{att.name}</span>
                    <span className="text-[10px] text-slate-400 truncate">({att.url})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            href="/dashboard/communications/announcements"
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
            <span>{status === 'published' ? 'Publish Announcement' : 'Save Draft'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
