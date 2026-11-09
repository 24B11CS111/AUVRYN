'use client';

import React, { useState, useTransition } from 'react';
import { CommunicationsNav } from '../CommunicationsNav';
import type { NotificationDelivery } from '@edu-platform/types';
import {
  retryOutboxDeliveryAction,
  requeueDeadLetterDeliveryAction,
  triggerOutboxWorkerAction,
} from '../actions';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Play,
  Skull,
  RefreshCw,
} from 'lucide-react';

interface DeliveryQueueClientProps {
  initialDeliveries: NotificationDelivery[];
  userRole?: string;
}

export function DeliveryQueueClient({
  initialDeliveries,
  userRole,
}: DeliveryQueueClientProps) {
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>(initialDeliveries);
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isProcessing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const filtered = deliveries.filter((d) => {
    if (channelFilter !== 'all' && d.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const handleRetry = (id: string) => {
    setError(null);
    setInfoMessage(null);
    startTransition(async () => {
      const res = await retryOutboxDeliveryAction(id);
      if (res.success) {
        setDeliveries((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status: 'queued' } : d))
        );
        setInfoMessage('Delivery requeued for retry');
      } else {
        setError(res.error || 'Failed to retry delivery');
      }
    });
  };

  const handleRequeue = (id: string) => {
    setError(null);
    setInfoMessage(null);
    startTransition(async () => {
      const res = await requeueDeadLetterDeliveryAction(id);
      if (res.success) {
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: 'queued',
                  attemptCount: 0,
                  errorMessage: undefined,
                }
              : d
          )
        );
        setInfoMessage('Dead-letter job successfully requeued to outbox');
      } else {
        setError(res.error || 'Failed to requeue delivery');
      }
    });
  };

  const handleTriggerWorker = () => {
    setError(null);
    setInfoMessage(null);
    startTransition(async () => {
      const res = await triggerOutboxWorkerAction(25);
      if (res.success && res.data) {
        setInfoMessage(
          `Processed ${res.data.claimedCount} jobs: ${res.data.successCount} delivered, ${res.data.transientFailedCount} retried, ${res.data.deadLetterCount} dead-lettered.`
        );
      } else {
        setError(res.error || 'Failed to execute worker batch');
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {status}
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3 h-3 animate-spin" />
            processing
          </span>
        );
      case 'dead_letter':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-300">
            <Skull className="w-3 h-3 text-red-700" />
            dead letter
          </span>
        );
      case 'failed':
      case 'bounced':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
      case 'sending':
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Delivery Outbox Queue
          </h1>
          <p className="text-sm text-slate-500">
            Transactional delivery monitoring, dead letter inspection, and exponential backoff retries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTriggerWorker}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
          >
            {isProcessing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Process Outbox</span>
          </button>
        </div>
      </div>

      <CommunicationsNav userRole={userRole} />

      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
        >
          <option value="all">All Channels</option>
          <option value="in_app">In-App</option>
          <option value="push">Push</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="queued">Queued</option>
          <option value="processing">Processing</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="dead_letter">Dead Letter</option>
        </select>
      </div>

      {/* Outbox Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px] bg-slate-50/50">
                <th className="py-2.5 px-4">Channel</th>
                <th className="py-2.5 px-4">Recipient Target</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Attempts</th>
                <th className="py-2.5 px-4">Last Attempt</th>
                <th className="py-2.5 px-4">Error / Response</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No delivery records match the current filters
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold uppercase text-[11px] text-slate-700">
                      {d.channel}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-mono text-[11px]">
                      {d.recipientTarget}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(d.status)}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {d.attemptCount} / {d.maxAttempts}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {d.lastAttemptAt ? new Date(d.lastAttemptAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 max-w-[200px] truncate">
                      {d.errorMessage ? (
                        <span className="text-rose-600 font-mono">{d.errorMessage}</span>
                      ) : (
                        <span className="text-slate-400">OK</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => handleRetry(d.id)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                      {d.status === 'dead_letter' && (
                        <button
                          type="button"
                          onClick={() => handleRequeue(d.id)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-700 text-white text-[11px] font-semibold hover:bg-rose-800 transition disabled:opacity-50"
                          title="Requeue to outbox after resolving issues"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Requeue</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
