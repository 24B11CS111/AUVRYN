'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bus,
  MapPin,
  Route,
  Users,
  Compass,
  CheckCircle2,
  Wrench,
  BarChart3,
  Settings,
  CalendarDays,
  UserCheck,
} from 'lucide-react';

export const TransportNav: React.FC = () => {
  const pathname = usePathname();

  const links = [
    { label: 'Overview', href: '/dashboard/transport', icon: Bus, exact: true },
    { label: 'Fleet & Vehicles', href: '/dashboard/transport/vehicles', icon: Bus },
    { label: 'Drivers & Staff', href: '/dashboard/transport/drivers', icon: UserCheck },
    { label: 'Routes', href: '/dashboard/transport/routes', icon: Route },
    { label: 'Stops', href: '/dashboard/transport/stops', icon: MapPin },
    { label: 'Student Assignments', href: '/dashboard/transport/assignments', icon: Users },
    { label: 'Daily Journeys', href: '/dashboard/transport/journeys', icon: CalendarDays },
    { label: 'Live Tracking', href: '/dashboard/transport/tracking', icon: Compass },
    { label: 'Boarding Terminal', href: '/dashboard/transport/boarding', icon: CheckCircle2 },
    { label: 'Maintenance', href: '/dashboard/transport/maintenance', icon: Wrench },
    { label: 'Reports', href: '/dashboard/transport/reports', icon: BarChart3 },
    { label: 'Settings', href: '/dashboard/transport/settings', icon: Settings },
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
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};
