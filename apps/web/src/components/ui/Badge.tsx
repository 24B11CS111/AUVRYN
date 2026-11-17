import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'navy' | 'outline';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-[#17243A] border-slate-200',
    success: 'bg-[#DCFCE7] text-[#16A36A] border-[#86EFAC]',
    warning: 'bg-[#FEF3C7] text-[#D99A22] border-[#FDE68A]',
    danger: 'bg-[#FEE2E2] text-[#DC4545] border-[#FCA5A5]',
    info: 'bg-[#EAF2FF] text-[#2563EB] border-[#BFDBFE]',
    purple: 'bg-[#EAF2FF] text-[#1D4ED8] border-[#BFDBFE]',
    navy: 'bg-[#0B1E3F] text-white border-[#07152B]',
    outline: 'bg-white text-slate-600 border-[#E2E8F0]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
