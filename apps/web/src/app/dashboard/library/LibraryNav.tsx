'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Library,
  BookOpen,
  ArrowRightLeft,
  Users,
  BookmarkCheck,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

export const LibraryNav: React.FC = () => {
  const pathname = usePathname();

  const links = [
    { label: 'Overview', href: '/dashboard/library', icon: Library, exact: true },
    { label: 'Book Catalogue', href: '/dashboard/library/books', icon: BookOpen },
    { label: 'Circulation Desk', href: '/dashboard/library/circulation', icon: ArrowRightLeft },
    { label: 'Members', href: '/dashboard/library/members', icon: Users },
    { label: 'Reservations', href: '/dashboard/library/reservations', icon: BookmarkCheck },
    { label: 'Fines & Penalties', href: '/dashboard/library/fines', icon: AlertCircle },
    { label: 'Reports', href: '/dashboard/library/reports', icon: BarChart3 },
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
