'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Bell,
  FileText,
  Send,
} from 'lucide-react';

interface CommunicationsNavProps {
  userRole?: string;
}

export function CommunicationsNav({ userRole }: CommunicationsNavProps) {
  const pathname = usePathname();
  const isAdmin = ['owner', 'admin', 'academic_admin'].includes(userRole || '');

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard/communications',
      icon: LayoutDashboard,
      active: pathname === '/dashboard/communications',
    },
    {
      label: 'Announcements',
      href: '/dashboard/communications/announcements',
      icon: Megaphone,
      active: pathname.startsWith('/dashboard/communications/announcements'),
    },
    {
      label: 'Messages',
      href: '/dashboard/communications/messages',
      icon: MessageSquare,
      active: pathname.startsWith('/dashboard/communications/messages'),
    },
    {
      label: 'Notifications',
      href: '/dashboard/communications/notifications',
      icon: Bell,
      active: pathname.startsWith('/dashboard/communications/notifications'),
    },
    {
      label: 'Templates',
      href: '/dashboard/communications/templates',
      icon: FileText,
      active: pathname.startsWith('/dashboard/communications/templates'),
      hide: !isAdmin,
    },
    {
      label: 'Delivery Queue',
      href: '/dashboard/communications/delivery',
      icon: Send,
      active: pathname.startsWith('/dashboard/communications/delivery'),
      hide: !isAdmin,
    },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-6 overflow-x-auto">
      {navItems.filter((i) => !i.hide).map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
              item.active
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
