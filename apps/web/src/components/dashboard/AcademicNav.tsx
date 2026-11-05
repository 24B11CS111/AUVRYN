'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { InstitutionType } from '@edu-platform/types';
import { getAcademicTerminology } from '@edu-platform/types';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  GraduationCap,
  Users2,
  BookmarkCheck,
  BookOpen,
} from 'lucide-react';

interface AcademicNavProps {
  institutionType: InstitutionType;
}

export function AcademicNav({ institutionType }: AcademicNavProps) {
  const pathname = usePathname();
  const terminology = getAcademicTerminology(institutionType);

  const tabs = [
    {
      label: 'Overview',
      href: '/dashboard/academics',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'Academic Years',
      href: '/dashboard/academics/years',
      icon: Calendar,
      exact: false,
    },
    {
      label: terminology.departmentTitle,
      href: '/dashboard/academics/departments',
      icon: Layers,
      exact: false,
    },
    {
      label: terminology.programTitle,
      href: '/dashboard/academics/programs',
      icon: GraduationCap,
      exact: false,
    },
    {
      label: terminology.classTitle,
      href: '/dashboard/academics/classes',
      icon: BookmarkCheck,
      exact: false,
    },
    {
      label: terminology.sectionTitle,
      href: '/dashboard/academics/sections',
      icon: Users2,
      exact: false,
    },
    {
      label: terminology.subjectTitle,
      href: '/dashboard/academics/subjects',
      icon: BookOpen,
      exact: false,
    },
  ];

  return (
    <div className="border-b border-slate-200/80 mb-6 bg-white rounded-xl shadow-xs overflow-x-auto">
      <nav className="flex space-x-1 p-1.5 min-w-max" aria-label="Academic Navigation">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + '/');

          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-600' : 'text-slate-400')} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
