'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { InstitutionMembership, EducationType } from '@edu-platform/types';
import { resolveEducationType, EDUCATION_TYPE_DEFINITIONS } from '@edu-platform/types';
import { InstitutionSwitcher } from './InstitutionSwitcher';
import { AuvrynLogo } from '@/components/branding';
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
  CreditCard,
  FileClock,
  Settings,
  Shield,
  X,
  Megaphone,
  BookOpen,
  CalendarOff,
  User,
  HeartHandshake,
  Bus,
  Library,
  Building2,
  Calendar,
  Sparkles,
  Layers,
  Baby,
  Landmark,
} from 'lucide-react';

interface SidebarProps {
  memberships: InstitutionMembership[];
  activeInstitutionId: string;
  isOpen: boolean;
  onClose: () => void;
}

const EDUCATION_ICONS: Record<EducationType, React.ComponentType<{ className?: string }>> = {
  preschool: Baby,
  primary_school: GraduationCap,
  intermediate: BookOpen,
  university: Landmark,
};

export function Sidebar({
  memberships,
  activeInstitutionId,
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const activeMembership =
    memberships.find((m) => m.institutionId === activeInstitutionId) || memberships[0];

  const institution = activeMembership?.institution;
  const educationType = resolveEducationType(institution);
  const eduDef = EDUCATION_TYPE_DEFINITIONS[educationType];
  const EduIcon = EDUCATION_ICONS[educationType] || GraduationCap;

  // Build education-aware navigation items
  const getNavItems = () => {
    const isPreschool = educationType === 'preschool';
    const isIntermediate = educationType === 'intermediate';
    const isUniversity = educationType === 'university';

    return [
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
        label: isUniversity
          ? 'Faculties & Depts'
          : isIntermediate
          ? 'Streams & Groups'
          : 'Academics',
        href: '/dashboard/academics',
        icon: GraduationCap,
        roles: ['owner', 'admin', 'academic_admin', 'faculty', 'student'],
      },
      {
        label: isPreschool
          ? 'Child Profiles'
          : isIntermediate
          ? 'Students & Aspirants'
          : 'Students',
        href: '/dashboard/students',
        icon: UserCheck,
        roles: ['owner', 'admin', 'academic_admin', 'admissions_officer', 'faculty', 'staff', 'student', 'parent'],
      },
      {
        label: isUniversity
          ? 'Enrolment & Admissions'
          : isPreschool
          ? 'Little Admissions'
          : 'Admissions',
        href: '/dashboard/admissions',
        icon: ClipboardList,
        roles: ['owner', 'admin', 'academic_admin', 'admissions_officer'],
      },
      {
        label: isIntermediate ? 'Faculty Allocation' : 'Staff & Faculty',
        href: '/dashboard/staff',
        icon: UserCog,
        roles: ['owner', 'admin', 'hr_administrator', 'academic_admin', 'department_head', 'faculty', 'accountant', 'staff'],
      },
      {
        label: isPreschool ? 'Daily Attendance' : 'Attendance',
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
      // Formal examinations are hidden for preschools
      ...(!isPreschool
        ? [
            {
              label: isUniversity
                ? 'Semesters & Transcripts'
                : isIntermediate
                ? 'Internal & Prep Exams'
                : 'Examinations',
              href: '/dashboard/examinations',
              icon: Award,
              roles: ['owner', 'admin', 'academic_admin', 'department_head', 'faculty', 'staff', 'student', 'parent'],
            },
          ]
        : []),
      {
        label: 'Fees & Payments',
        href: '/dashboard/fees',
        icon: CreditCard,
        roles: ['owner', 'admin', 'accountant', 'academic_admin', 'department_head', 'admissions_officer', 'student', 'parent'],
      },
      {
        label: isPreschool ? 'Parent Updates' : 'Communications',
        href: '/dashboard/communications',
        icon: Megaphone,
        roles: ['owner', 'admin', 'academic_admin', 'department_head', 'faculty', 'staff', 'student', 'parent', 'admissions_officer', 'accountant', 'hr_administrator'],
      },
      {
        label: isPreschool ? 'Daily Activities' : 'Assignments',
        href: '/dashboard/assignments',
        icon: BookOpen,
        roles: ['owner', 'admin', 'academic_admin', 'department_head', 'faculty', 'student', 'parent'],
      },
      {
        label: 'Leave Management',
        href: '/dashboard/leave',
        icon: CalendarOff,
        roles: ['owner', 'admin', 'hr_administrator', 'academic_admin', 'department_head', 'faculty', 'staff', 'student', 'parent', 'accountant'],
      },
      {
        label: isPreschool ? 'Pickup & Transport' : 'Transport',
        href: '/dashboard/transport',
        icon: Bus,
        roles: ['owner', 'admin', 'academic_admin', 'staff', 'faculty', 'student', 'parent'],
      },
      {
        label: 'Library',
        href: '/dashboard/library',
        icon: Library,
        roles: ['owner', 'admin', 'academic_admin', 'faculty', 'staff', 'student', 'parent', 'accountant'],
      },
      // Hostel is hidden for preschools
      ...(!isPreschool
        ? [
            {
              label: 'Hostel',
              href: '/dashboard/hostel',
              icon: Building2,
              roles: ['owner', 'admin', 'academic_admin', 'faculty', 'staff', 'student', 'parent', 'accountant'],
            },
          ]
        : []),
      {
        label: 'Events',
        href: '/dashboard/events',
        icon: Calendar,
        roles: ['owner', 'admin', 'academic_admin', 'faculty', 'staff', 'student', 'parent'],
      },
      {
        label: 'Teacher Portal',
        href: '/portal/teacher',
        icon: GraduationCap,
        roles: ['owner', 'admin', 'faculty'],
      },
      {
        label: 'Parent Portal',
        href: '/portal/parent',
        icon: HeartHandshake,
        roles: ['owner', 'admin', 'parent'],
      },
      {
        label: 'Student Portal',
        href: '/portal/student',
        icon: User,
        roles: ['owner', 'admin', 'student'],
      },
      {
        label: 'AI Assistant',
        href: '/dashboard/ai-assistant',
        icon: Sparkles,
        roles: ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'],
      },
      {
        label: 'AI Drafts & Review',
        href: '/dashboard/ai-drafts',
        icon: Layers,
        roles: ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'],
      },
      {
        label: 'AI Intelligence',
        href: '/dashboard/ai-intelligence',
        icon: Sparkles,
        roles: ['owner', 'admin', 'academic_admin'],
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
  };

  const userRole = activeMembership?.role || 'student';
  const filteredNavItems = getNavItems().filter((item) => item.roles.includes(userRole));

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
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 bg-white">
          <AuvrynLogo variant="horizontal" size="sm" showDescriptor={true} href="/dashboard" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Institution Switcher */}
        <div className="p-3 border-b border-slate-100 space-y-2">
          <InstitutionSwitcher
            memberships={memberships}
            activeInstitutionId={activeInstitutionId}
          />

          {/* Education Level Badge Indicator */}
          <div
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-between border"
            style={{
              backgroundColor: eduDef.theme.softBg,
              color: eduDef.theme.primary,
              borderColor: eduDef.theme.accent + '40',
            }}
          >
            <span className="flex items-center gap-1.5 truncate">
              <EduIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{eduDef.label}</span>
            </span>
            <span className="uppercase text-[9px] font-black tracking-wider opacity-85 shrink-0">
              {eduDef.categoryName}
            </span>
          </div>
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
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  isActive
                    ? 'bg-[#EAF2FF] text-[#0B1E3F] font-semibold border-l-2 border-[#2563EB] shadow-xs'
                    : 'text-[#64748B] hover:bg-slate-50 hover:text-[#0B1E3F]'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-[#2563EB]' : 'text-slate-400')} />
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
                {activeMembership?.role ? activeMembership.role.replace('_', ' ') : 'Member'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
