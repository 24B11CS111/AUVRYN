'use client';

import React, { useState, useTransition } from 'react';
import { CommunicationsNav } from '../CommunicationsNav';
import type { NotificationDelivery } from '@edu-platform/types';
import { retryOutboxDeliveryAction } from '../actions';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
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
  const [isRetrying, startRetrying] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = deliveries.filter((d) => {
    if (channelFilter !== 'all' && d.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const handleRetry = (id: string) => {
    setError(null);
    startRetrying(async () => {
      const res = await retryOutboxDeliveryAction(id);
      if (res.success) {
        setDeliveries((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status: 'queued' } : d))
        );
      } else {
        setError(res.error || 'Failed to retry delivery');
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
      </div>

      <CommunicationsNav userRole={userRole} />

      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
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
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
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
                          disabled={isRetrying}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
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
