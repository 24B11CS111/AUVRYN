import React from 'react';
import Link from 'next/link';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AcademicNav } from '@/components/dashboard/AcademicNav';
import { getAcademicTerminology, INSTITUTION_TYPE_DEFINITIONS } from '@edu-platform/types';
import {
  Calendar,
  Layers,
  GraduationCap,
  BookmarkCheck,
  Users2,
  BookOpen,
  ArrowRight,
  Info,
  CalendarCheck,
} from 'lucide-react';
import type {
  AcademicYearRow,
  AcademicDepartmentRow,
  AcademicProgramRow,
  AcademicClassRow,
  AcademicSectionRow,
  AcademicSubjectRow,
} from '@edu-platform/database';

export default async function AcademicOverviewPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;
  const terminology = getAcademicTerminology(institution.type);
  const typeDef = INSTITUTION_TYPE_DEFINITIONS[institution.type];
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin'].includes(userRole);

  // Fetch real database-backed counts and data
  const [
    { data: yearsData },
    { data: deptsData },
    { data: progsData },
    { data: classesData },
    { data: sectionsData },
    { data: subjectsData },
  ] = await Promise.all([
    supabase
      .from('academic_years')
      .select('*')
      .eq('institution_id', institution.id)
      .order('is_current', { ascending: false }),
    supabase
      .from('academic_departments')
      .select('id, status')
      .eq('institution_id', institution.id),
    supabase
      .from('academic_programs')
      .select('id, status')
      .eq('institution_id', institution.id),
    supabase
      .from('academic_classes')
      .select('id, status')
      .eq('institution_id', institution.id),
    supabase
      .from('academic_sections')
      .select('id, status')
      .eq('institution_id', institution.id),
    supabase
      .from('academic_subjects')
      .select('id, status')
      .eq('institution_id', institution.id),
  ]);

  const years = (yearsData || []) as unknown as AcademicYearRow[];
  const currentYear = years.find((y) => y.is_current) || years[0];

  const deptsCount = ((deptsData || []) as unknown as AcademicDepartmentRow[]).filter(
    (d) => d.status !== 'archived'
  ).length;

  const progsCount = ((progsData || []) as unknown as AcademicProgramRow[]).filter(
    (p) => p.status !== 'archived'
  ).length;

  const classesCount = ((classesData || []) as unknown as AcademicClassRow[]).filter(
    (c) => c.status !== 'archived'
  ).length;

  const sectionsCount = ((sectionsData || []) as unknown as AcademicSectionRow[]).filter(
    (s) => s.status !== 'archived'
  ).length;

  const subjectsCount = ((subjectsData || []) as unknown as AcademicSubjectRow[]).filter(
    (s) => s.status !== 'archived'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Academic Hierarchy & Structure
            </h1>
            <Badge variant="default" className="capitalize">
              {typeDef.label}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Structure and configure academic levels, departments, curriculum tracks, classes, sections, and subjects.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Link href="/dashboard/academics/years">
              <Button size="sm" variant="outline">
                <Calendar className="w-4 h-4 mr-1.5" />
                Manage Calendar
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <AcademicNav institutionType={institution.type} />

      {/* Current Academic Year Callout */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-slate-50 to-blue-50/50 border border-indigo-100/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-xs">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Active Academic Session
              </span>
              {currentYear?.is_current && <Badge variant="success">Current</Badge>}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {currentYear ? currentYear.name : 'No Active Academic Year Configured'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {currentYear ? (
                <>
                  Code: <span className="font-mono font-semibold">{currentYear.code}</span> • Term System:{' '}
                  <span className="font-semibold capitalize">{currentYear.term_system}</span> • Window:{' '}
                  <span>{currentYear.start_date}</span> to <span>{currentYear.end_date}</span>
                </>
              ) : (
                'Create an academic year to schedule courses, classes, and terms.'
              )}
            </p>
          </div>
        </div>

        <Link href="/dashboard/academics/years">
          <Button size="sm" variant="outline" className="w-full md:w-auto text-xs">
            Academic Calendar
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Sessions</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{years.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Academic Years</p>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">
              {terminology.departmentTitle.split(' ')[0]}
            </span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{deptsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{terminology.departmentTitle}</p>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">
              {terminology.programTitle.split(' ')[0]}
            </span>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{progsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{terminology.programTitle}</p>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">
              {terminology.classTitle.split(' ')[0]}
            </span>
            <BookmarkCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{classesCount}</div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{terminology.classTitle}</p>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">
              {terminology.sectionTitle.split(' ')[0]}
            </span>
            <Users2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{sectionsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{terminology.sectionTitle}</p>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">
              {terminology.subjectTitle.split(' ')[0]}
            </span>
            <BookOpen className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{subjectsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{terminology.subjectTitle}</p>
        </Card>
      </div>

      {/* Model Information Notice */}
      <Card className="p-4 bg-slate-50/60 border-slate-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div className="space-y-1 text-xs">
            <h3 className="font-semibold text-slate-900">
              Tier Model Configuration: {typeDef.label}
            </h3>
            <p className="text-slate-600 leading-relaxed">
              This institution is provisioned as a <span className="font-semibold text-slate-800">{typeDef.label}</span>. 
              The system organizes academic relationships into{' '}
              <span className="font-semibold text-slate-800">{terminology.departmentTitle}</span>,{' '}
              <span className="font-semibold text-slate-800">{terminology.programTitle}</span>,{' '}
              <span className="font-semibold text-slate-800">{terminology.classTitle}</span>, and{' '}
              <span className="font-semibold text-slate-800">{terminology.sectionTitle}</span> with{' '}
              <span className="font-semibold text-slate-800">{terminology.teacherTitle}</span> assignments.
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Academic Years Card */}
        <Card className="p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Calendar className="w-5 h-5" />
              </div>
              <Badge variant="outline">{years.length} Recorded</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-base">Academic Years & Calendar</h3>
            <p className="text-xs text-slate-500 mt-1">
              Define academic calendar windows, term structures, and active enrollment sessions.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/dashboard/academics/years"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Configure Sessions <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Departments Card */}
        <Card className="p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Layers className="w-5 h-5" />
              </div>
              <Badge variant="outline">{deptsCount} Active</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-base">{terminology.departmentTitle}</h3>
            <p className="text-xs text-slate-500 mt-1">{terminology.departmentDescription}</p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/dashboard/academics/departments"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Manage {terminology.departmentTitle.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Programs Card */}
        <Card className="p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <GraduationCap className="w-5 h-5" />
              </div>
              <Badge variant="outline">{progsCount} Active</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-base">{terminology.programTitle}</h3>
            <p className="text-xs text-slate-500 mt-1">{terminology.programDescription}</p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/dashboard/academics/programs"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Manage {terminology.programTitle.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Classes Card */}
        <Card className="p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <Badge variant="outline">{classesCount} Active</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-base">{terminology.classTitle}</h3>
            <p className="text-xs text-slate-500 mt-1">{terminology.classDescription}</p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/dashboard/academics/classes"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Manage {terminology.classTitle.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Sections Card */}
        <Card className="p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Users2 className="w-5 h-5" />
              </div>
              <Badge variant="outline">{sectionsCount} Active</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-base">{terminology.sectionTitle}</h3>
            <p className="text-xs text-slate-500 mt-1">{terminology.sectionDescription}</p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/dashboard/academics/sections"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Manage {terminology.sectionTitle.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Subjects Card */}
        <Card className="p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <Badge variant="outline">{subjectsCount} Active</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-base">{terminology.subjectTitle}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Curriculum subjects, practical labs, and elective courses catalog.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/dashboard/academics/subjects"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Manage {terminology.subjectTitle.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
