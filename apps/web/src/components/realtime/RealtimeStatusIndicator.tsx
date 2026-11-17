'use client';

import React from 'react';
import type { RealtimeConnectionState } from '@edu-platform/types';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RealtimeStatusIndicatorProps {
  state: RealtimeConnectionState;
  onRetry?: () => void;
  className?: string;
  showText?: boolean;
}

export function RealtimeStatusIndicator({
  state,
  onRetry,
  className,
  showText = true,
}: RealtimeStatusIndicatorProps) {
  if (state === 'CONNECTED') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60',
          className
        )}
        title="Real-time synchronization active"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {showText && <span>Live</span>}
      </div>
    );
  }

  if (state === 'CONNECTING' || state === 'RECONNECTING') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60',
          className
        )}
        title="Reconnecting to real-time sync service"
      >
        <RefreshCw className="w-2.5 h-2.5 text-amber-600 animate-spin" />
        {showText && <span>Syncing...</span>}
      </div>
    );
  }

  // DISCONNECTED or ERROR
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200',
        className
      )}
      title="Real-time disconnected. Click to reconnect."
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      {showText && <span>Offline</span>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-0.5 text-slate-500 hover:text-slate-800"
          title="Retry connection"
        >
          <RefreshCw className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}
