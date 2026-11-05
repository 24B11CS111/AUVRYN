'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { CommunicationsNav } from '../CommunicationsNav';
import type { CommunicationThread, CommunicationMessage } from '@edu-platform/types';
import {
  getThreadMessagesAction,
  sendMessageAction,
  createCommunicationThreadAction,
} from '../actions';
import {
  MessageSquare,
  PlusCircle,
  Search,
  Send,
  Lock,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';

interface MessagesClientProps {
  initialThreads: CommunicationThread[];
  currentUserId: string;
  userRole?: string;
  potentialRecipients: Array<{ id: string; fullName: string; role: string }>;
}

export function MessagesClient({
  initialThreads,
  currentUserId,
  userRole,
  potentialRecipients,
}: MessagesClientProps) {
  const [threads, setThreads] = useState<CommunicationThread[]>(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreads[0]?.id || null
  );
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSending, startSending] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // New Thread Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newType, setNewType] = useState<any>('parent_teacher');
  const [newRecipientId, setNewRecipientId] = useState(potentialRecipients[0]?.id || '');
  const [newInitialMsg, setNewInitialMsg] = useState('');
  const [isCreating, startCreating] = useTransition();

  // Load messages when selected thread changes
  useEffect(() => {
    if (!selectedThreadId) return;
    setLoadingMessages(true);
    getThreadMessagesAction(selectedThreadId).then((res) => {
      setLoadingMessages(false);
      if (res.success && res.data) {
        setMessages(res.data);
      }
    });
  }, [selectedThreadId]);

  const activeThread = threads.find((t) => t.id === selectedThreadId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreadId || !messageText.trim()) return;
    setError(null);

    const body = messageText.trim();
    setMessageText('');

    startSending(async () => {
      const res = await sendMessageAction({
        threadId: selectedThreadId,
        body,
        attachments: [],
      });

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        // Update thread in list
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedThreadId
              ? { ...t, lastMessageAt: new Date().toISOString(), messageCount: t.messageCount + 1 }
              : t
          )
        );
      } else {
        setError(res.error || 'Failed to send message');
      }
    });
  };

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newInitialMsg.trim() || !newRecipientId) return;

    startCreating(async () => {
      const res = await createCommunicationThreadAction({
        subject: newSubject.trim(),
        threadType: newType,
        initialMessage: newInitialMsg.trim(),
        participantUserIds: [newRecipientId],
        attachments: [],
      });

      if (res.success && res.data) {
        setThreads((prev) => [res.data!, ...prev]);
        setSelectedThreadId(res.data!.id);
        setShowNewModal(false);
        setNewSubject('');
        setNewInitialMsg('');
      } else {
        setError(res.error || 'Failed to start conversation');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Threaded Messaging
          </h1>
          <p className="text-sm text-slate-500">
            Secure parent-teacher and student-faculty messaging with moderation
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      <CommunicationsNav userRole={userRole} />

      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Messaging Interface */}
      <div className="grid grid-cols-1 md:grid-cols-3 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden min-h-[550px]">
        {/* Threads List Sidebar */}
        <div className="border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search threads..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {threads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active conversations yet
              </div>
            ) : (
              threads.map((t) => {
                const isSelected = t.id === selectedThreadId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedThreadId(t.id)}
                    className={`w-full text-left p-3.5 transition flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-slate-100/80 border-l-3 border-slate-900'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 truncate">
                        {t.subject}
                      </span>
                      {t.isLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="capitalize">{t.threadType.replace('_', ' ')}</span>
                      <span>
                        {new Date(t.lastMessageAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Messages Panel */}
        <div className="md:col-span-2 flex flex-col">
          {activeThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">{activeThread.subject}</h2>
                    {activeThread.isLocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 capitalize mt-0.5">
                    {activeThread.threadType.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/20">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400">
                    No messages in this conversation yet
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === currentUserId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-slate-400 mb-1 px-1">
                          {isMe ? 'You' : m.sender?.fullName || 'Participant'} •{' '}
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div
                          className={`max-w-[75%] p-3 rounded-xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-slate-900 text-white rounded-br-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                          }`}
                        >
                          {m.body}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  disabled={activeThread.isLocked || isSending}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    activeThread.isLocked
                      ? 'This thread is locked'
                      : 'Type your message...'
                  }
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={activeThread.isLocked || isSending || !messageText.trim()}
                  className="p-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-8 h-8 mb-2 stroke-1" />
              <div className="text-xs">Select a conversation or start a new thread</div>
            </div>
          )}
        </div>
      </div>

      {/* New Thread Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Start New Conversation</h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Conversation Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="parent_teacher">Parent - Teacher</option>
                  <option value="student_faculty">Student - Faculty</option>
                  <option value="staff_internal">Staff Internal</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient</label>
                <select
                  value={newRecipientId}
                  onChange={(e) => setNewRecipientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  {potentialRecipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} ({r.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Query regarding Mathematics Term 1 result"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type your message..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Start Conversation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
