'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { InstitutionMembership } from '@edu-platform/types';
import { InstitutionSwitcher } from './InstitutionSwitcher';
import {
  LayoutDashboard,
  Building,
  Users,
  GraduationCap,
  UserCheck,
  ClipboardList,
  UserCog,
  CalendarCheck,
  CalendarDays,
  Award,
  FileClock,
  Settings,
  Shield,
  X,
} from 'lucide-react';

interface SidebarProps {
  memberships: InstitutionMembership[];
  activeInstitutionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  memberships,
  activeInstitutionId,
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const activeMembership =
    memberships.find((m) => m.institutionId === activeInstitutionId) || memberships[0];

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['owner', 'admin', 'academic_admin', 'faculty', 'staff', 'student', 'parent'],
    },
    {
      label: 'Campuses',
      href: '/dashboard/campuses',
      icon: Building,
      roles: ['owner', 'admin', 'academic_admin', 'faculty', 'staff'],
    },
    {
      label: 'Members & Roles',
      href: '/dashboard/members',
      icon: Users,
      roles: ['owner', 'admin', 'academic_admin', 'faculty'],
    },
    {
      label: 'Academics',
      href: '/dashboard/academics',
      icon: GraduationCap,
      roles: ['owner', 'admin', 'academic_admin', 'faculty', 'student'],
    },
    {
      label: 'Students',
      href: '/dashboard/students',
      icon: UserCheck,
      roles: ['owner', 'admin', 'academic_admin', 'admissions_officer', 'faculty', 'staff', 'student', 'parent'],
    },
    {
      label: 'Admissions',
      href: '/dashboard/admissions',
      icon: ClipboardList,
      roles: ['owner', 'admin', 'academic_admin', 'admissions_officer'],
    },
    {
      label: 'Staff & Faculty',
      href: '/dashboard/staff',
      icon: UserCog,
      roles: ['owner', 'admin', 'hr_administrator', 'academic_admin', 'department_head', 'faculty', 'accountant', 'staff'],
    },
    {
      label: 'Attendance',
      href: '/dashboard/attendance',
      icon: CalendarCheck,
      roles: ['owner', 'admin', 'hr_administrator', 'academic_admin', 'department_head', 'faculty', 'staff', 'student', 'parent'],
    },
    {
      label: 'Timetable',
      href: '/dashboard/timetable',
      icon: CalendarDays,
      roles: ['owner', 'admin', 'academic_admin', 'department_head', 'faculty', 'staff', 'student', 'parent', 'admissions_officer', 'accountant'],
    },
    {
      label: 'Examinations',
      href: '/dashboard/examinations',
      icon: Award,
      roles: ['owner', 'admin', 'academic_admin', 'department_head', 'faculty', 'staff', 'student', 'parent'],
    },
    {
      label: 'Audit Trail',
      href: '/dashboard/audit',
      icon: FileClock,
      roles: ['owner', 'admin'],
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      roles: ['owner', 'admin'],
    },
  ];

  const userRole = activeMembership?.role || 'student';

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200/80 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Top Header / Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              E
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">
              EduPlatform
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Institution Switcher */}
        <div className="p-3 border-b border-slate-100">
          <InstitutionSwitcher
            memberships={memberships}
            activeInstitutionId={activeInstitutionId}
          />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: User Role Scope */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Current Role
              </div>
              <div className="font-semibold text-slate-800 capitalize truncate">
                {activeMembership?.role.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
