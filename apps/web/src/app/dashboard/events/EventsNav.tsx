'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  PlusCircle,
  Users,
  CheckCircle2,
  Award,
  BarChart3,
} from 'lucide-react';

export const EventsNav: React.FC = () => {
  const pathname = usePathname();

  const links = [
    { label: 'Overview', href: '/dashboard/events', icon: Calendar, exact: true },
    { label: 'Create Event', href: '/dashboard/events/new', icon: PlusCircle },
    { label: 'Registrations', href: '/dashboard/events/registrations', icon: Users },
    { label: 'Check-in Attendance', href: '/dashboard/events/attendance', icon: CheckCircle2 },
    { label: 'Certificates', href: '/dashboard/events/certificates', icon: Award },
    { label: 'Reports', href: '/dashboard/events/reports', icon: BarChart3 },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
      {links.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
};
