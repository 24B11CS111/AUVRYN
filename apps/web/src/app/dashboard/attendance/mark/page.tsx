import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AttendanceMarkingClient } from './AttendanceMarkingClient';

export default async function MarkAttendancePage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const todayDate = new Date().toISOString().slice(0, 10);

  // Fetch academic years, classes, sections, subjects
  const [
    { data: academicYearsData },
    { data: classesData },
    { data: sectionsData },
    { data: subjectsData },
    { data: currentStaffProfile },
  ] = await Promise.all([
    supabase
      .from('academic_years')
      .select('id, name, is_current')
      .eq('institution_id', institution.id)
      .order('start_date', { ascending: false }),
    supabase
      .from('academic_classes')
      .select('id, name')
      .eq('institution_id', institution.id)
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
    supabase
      .from('academic_sections')
      .select('id, name, class_id')
      .eq('institution_id', institution.id)
      .eq('status', 'active')
      .order('name', { ascending: true }),
    supabase
      .from('academic_subjects')
      .select('id, name, code')
      .eq('institution_id', institution.id)
      .eq('status', 'active')
      .order('name', { ascending: true }),
    supabase
      .from('staff_profiles')
      .select('id')
      .eq('institution_id', institution.id)
      .eq('user_id', session.user.id)
      .maybeSingle(),
  ]);

  const academicYears = (academicYearsData || []).map((y: any) => ({
    id: y.id,
    name: y.name,
    isCurrent: !!y.is_current,
  }));

  const classes = (classesData || []).map((c: any) => ({
    id: c.id,
    name: c.name,
  }));

  const sections = (sectionsData || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    classId: s.class_id,
  }));

  const subjects = (subjectsData || []).map((sub: any) => ({
    id: sub.id,
    name: sub.name,
    code: sub.code,
  }));

  return (
    <AttendanceMarkingClient
      institution={institution}
      academicYears={academicYears}
      classes={classes}
      sections={sections}
      subjects={subjects}
      todayDate={todayDate}
      defaultStaffId={currentStaffProfile?.id || null}
    />
  );
}
