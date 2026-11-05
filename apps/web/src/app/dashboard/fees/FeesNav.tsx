'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Layers,
  Users,
  CreditCard,
  Receipt,
  Gift,
  RotateCcw,
  BarChart3,
  Settings,
} from 'lucide-react';

interface FeesNavProps {
  userRole?: string;
}

export function FeesNav({ userRole }: FeesNavProps) {
  const pathname = usePathname();

  const isStaffOrAdmin = ['owner', 'admin', 'accountant', 'academic_admin'].includes(userRole || '');
  const isAdmin = ['owner', 'admin'].includes(userRole || '');

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard/fees',
      icon: LayoutDashboard,
      active: pathname === '/dashboard/fees',
    },
    {
      label: 'Structures',
      href: '/dashboard/fees/structures',
      icon: Layers,
      active: pathname.startsWith('/dashboard/fees/structures'),
      hide: !isStaffOrAdmin,
    },
    {
      label: 'Assignments',
      href: '/dashboard/fees/assignments',
      icon: Users,
      active: pathname.startsWith('/dashboard/fees/assignments'),
    },
    {
      label: 'Collections',
      href: '/dashboard/fees/collections',
      icon: CreditCard,
      active: pathname.startsWith('/dashboard/fees/collections'),
    },
    {
      label: 'Receipts',
      href: '/dashboard/fees/receipts',
      icon: Receipt,
      active: pathname.startsWith('/dashboard/fees/receipts'),
    },
    {
      label: 'Concessions',
      href: '/dashboard/fees/concessions',
      icon: Gift,
      active: pathname.startsWith('/dashboard/fees/concessions'),
    },
    {
      label: 'Refunds',
      href: '/dashboard/fees/refunds',
      icon: RotateCcw,
      active: pathname.startsWith('/dashboard/fees/refunds'),
    },
    {
      label: 'Reports',
      href: '/dashboard/fees/reports',
      icon: BarChart3,
      active: pathname.startsWith('/dashboard/fees/reports'),
      hide: !isStaffOrAdmin,
    },
    {
      label: 'Settings',
      href: '/dashboard/fees/settings',
      icon: Settings,
      active: pathname.startsWith('/dashboard/fees/settings'),
      hide: !isAdmin,
    },
  ];

  return (
    <div className="flex items-center space-x-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 scrollbar-none dark:border-slate-800 dark:bg-slate-900">
      {navItems
        .filter((item) => !item.hide)
        .map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                item.active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
    </div>
  );
}
