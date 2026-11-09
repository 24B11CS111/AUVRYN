'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  DoorOpen,
  BedDouble,
  UserPlus,
  LogOut,
  UserCheck,
  Wrench,
  BarChart3,
  Layers,
} from 'lucide-react';

export const HostelNav: React.FC = () => {
  const pathname = usePathname();

  const links = [
    { label: 'Overview', href: '/dashboard/hostel', icon: Building2, exact: true },
    { label: 'Buildings', href: '/dashboard/hostel/buildings', icon: Layers },
    { label: 'Rooms & Beds', href: '/dashboard/hostel/rooms', icon: DoorOpen },
    { label: 'Allocations', href: '/dashboard/hostel/allocations', icon: BedDouble },
    { label: 'Applications', href: '/dashboard/hostel/applications', icon: UserPlus },
    { label: 'Leave / Outpasses', href: '/dashboard/hostel/leave', icon: LogOut },
    { label: 'Visitors Log', href: '/dashboard/hostel/visitors', icon: UserCheck },
    { label: 'Complaints', href: '/dashboard/hostel/complaints', icon: Wrench },
    { label: 'Reports', href: '/dashboard/hostel/reports', icon: BarChart3 },
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
