'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  departmentCreateSchema,
  departmentUpdateSchema,
  programCreateSchema,
  programUpdateSchema,
  classCreateSchema,
  classUpdateSchema,
  sectionCreateSchema,
  sectionUpdateSchema,
  subjectCreateSchema,
  subjectUpdateSchema,
  classSubjectAssignSchema,
  academicYearCreateSchema,
  type DepartmentCreateInput,
  type DepartmentUpdateInput,
  type ProgramCreateInput,
  type ProgramUpdateInput,
  type ClassCreateInput,
  type ClassUpdateInput,
  type SectionCreateInput,
  type SectionUpdateInput,
  type SubjectCreateInput,
  type SubjectUpdateInput,
  type ClassSubjectAssignInput,
  type AcademicYearCreateInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const ACADEMIC_WRITE_ROLES = ['owner', 'admin', 'academic_admin'] as const;

function isAuthorized(role: string): boolean {
  return ACADEMIC_WRITE_ROLES.includes(role as any);
}

// ==============================================================================
// 1. Academic Years Actions
// ==============================================================================

export async function createAcademicYearAction(
  data: AcademicYearCreateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to manage academic years.' };
    }

    const parsed = academicYearCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid academic year data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Check code uniqueness within institution
    const { data: existing } = await supabase
      .from('academic_years')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('code', parsed.data.code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Academic year with code "${parsed.data.code}" already exists.` };
    }

    // If marked current, unset other current sessions
    if (parsed.data.isCurrent) {
      await supabase
        .from('academic_years')
        .update({ is_current: false })
        .eq('institution_id', institutionId)
        .eq('is_current', true);
    }

    const { data: newYear, error: insertError } = await supabase
      .from('academic_years')
      .insert({
        institution_id: institutionId,
        name: parsed.data.name,
        code: parsed.data.code,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        term_system: parsed.data.termSystem,
        is_current: parsed.data.isCurrent,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    // Record audit event
    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_year.created',
      entity_type: 'academic_years',
      entity_id: newYear.id,
      metadata: { name: parsed.data.name, code: parsed.data.code },
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/years');
    return { success: true, data: newYear };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create academic year.' };
  }
}

// ==============================================================================
// 2. Department Actions (Wings / Streams / Faculties)
// ==============================================================================

export async function createDepartmentAction(
  data: DepartmentCreateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to manage departments.' };
    }

    const parsed = departmentCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid department data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Check code uniqueness within institution
    const { data: existing } = await supabase
      .from('academic_departments')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('code', parsed.data.code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Department with code "${parsed.data.code}" already exists.` };
    }

    const { data: newDept, error: insertError } = await supabase
      .from('academic_departments')
      .insert({
        institution_id: institutionId,
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description || null,
        campus_id: parsed.data.campusId || null,
        parent_department_id: parsed.data.parentDepartmentId || null,
        head_profile_id: parsed.data.headProfileId || null,
        status: parsed.data.status || 'active',
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_department.created',
      entity_type: 'academic_departments',
      entity_id: newDept.id,
      metadata: { name: parsed.data.name, code: parsed.data.code },
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/departments');
    return { success: true, data: newDept };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create department.' };
  }
}

export async function updateDepartmentAction(
  id: string,
  data: DepartmentUpdateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to edit departments.' };
    }

    const parsed = departmentUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid update data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description || null;
    if (parsed.data.campusId !== undefined) updatePayload.campus_id = parsed.data.campusId || null;
    if (parsed.data.headProfileId !== undefined) updatePayload.head_profile_id = parsed.data.headProfileId || null;
    if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('academic_departments')
      .update(updatePayload)
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_department.updated',
      entity_type: 'academic_departments',
      entity_id: id,
      metadata: updatePayload,
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/departments');
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update department.' };
  }
}

export async function archiveDepartmentAction(id: string): Promise<ActionResult> {
  return updateDepartmentAction(id, { status: 'archived' });
}

// ==============================================================================
// 3. Program Actions (Degrees / Curriculums / Tracks)
// ==============================================================================

export async function createProgramAction(
  data: ProgramCreateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to manage programs.' };
    }

    const parsed = programCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid program data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Check code uniqueness
    const { data: existing } = await supabase
      .from('academic_programs')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('code', parsed.data.code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Program with code "${parsed.data.code}" already exists.` };
    }

    const { data: newProg, error: insertError } = await supabase
      .from('academic_programs')
      .insert({
        institution_id: institutionId,
        department_id: parsed.data.departmentId || null,
        campus_id: parsed.data.campusId || null,
        name: parsed.data.name,
        code: parsed.data.code,
        description: parsed.data.description || null,
        level: parsed.data.level,
        duration_years: parsed.data.durationYears,
        term_system: parsed.data.termSystem,
        total_terms: parsed.data.totalTerms,
        status: parsed.data.status || 'active',
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_program.created',
      entity_type: 'academic_programs',
      entity_id: newProg.id,
      metadata: { name: parsed.data.name, code: parsed.data.code },
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/programs');
    return { success: true, data: newProg };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create program.' };
  }
}

export async function updateProgramAction(
  id: string,
  data: ProgramUpdateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to edit programs.' };
    }

    const parsed = programUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid update data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description || null;
    if (parsed.data.departmentId !== undefined) updatePayload.department_id = parsed.data.departmentId || null;
    if (parsed.data.campusId !== undefined) updatePayload.campus_id = parsed.data.campusId || null;
    if (parsed.data.level !== undefined) updatePayload.level = parsed.data.level;
    if (parsed.data.durationYears !== undefined) updatePayload.duration_years = parsed.data.durationYears;
    if (parsed.data.termSystem !== undefined) updatePayload.term_system = parsed.data.termSystem;
    if (parsed.data.totalTerms !== undefined) updatePayload.total_terms = parsed.data.totalTerms;
    if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('academic_programs')
      .update(updatePayload)
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_program.updated',
      entity_type: 'academic_programs',
      entity_id: id,
      metadata: updatePayload,
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/programs');
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update program.' };
  }
}

export async function archiveProgramAction(id: string): Promise<ActionResult> {
  return updateProgramAction(id, { status: 'archived' });
}

// ==============================================================================
// 4. Class / Batch Actions
// ==============================================================================

export async function createClassAction(
  data: ClassCreateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to manage classes.' };
    }

    const parsed = classCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid class data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Check code uniqueness per academic year session
    const { data: existing } = await supabase
      .from('academic_classes')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('academic_year_id', parsed.data.academicYearId)
      .eq('code', parsed.data.code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Class with code "${parsed.data.code}" already exists in this academic year.` };
    }

    const { data: newClass, error: insertError } = await supabase
      .from('academic_classes')
      .insert({
        institution_id: institutionId,
        program_id: parsed.data.programId,
        academic_year_id: parsed.data.academicYearId,
        campus_id: parsed.data.campusId || null,
        name: parsed.data.name,
        code: parsed.data.code,
        level_number: parsed.data.levelNumber,
        status: parsed.data.status || 'active',
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_class.created',
      entity_type: 'academic_classes',
      entity_id: newClass.id,
      metadata: { name: parsed.data.name, code: parsed.data.code },
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/classes');
    return { success: true, data: newClass };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create class.' };
  }
}

export async function updateClassAction(
  id: string,
  data: ClassUpdateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to edit classes.' };
    }

    const parsed = classUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid update data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
    if (parsed.data.campusId !== undefined) updatePayload.campus_id = parsed.data.campusId || null;
    if (parsed.data.levelNumber !== undefined) updatePayload.level_number = parsed.data.levelNumber;
    if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('academic_classes')
      .update(updatePayload)
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_class.updated',
      entity_type: 'academic_classes',
      entity_id: id,
      metadata: updatePayload,
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/classes');
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update class.' };
  }
}

export async function archiveClassAction(id: string): Promise<ActionResult> {
  return updateClassAction(id, { status: 'archived' });
}

// ==============================================================================
// 5. Section Actions (Divisions / Groups)
// ==============================================================================

export async function createSectionAction(
  data: SectionCreateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to manage sections.' };
    }

    const parsed = sectionCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid section data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Check code uniqueness within parent class
    const { data: existing } = await supabase
      .from('academic_sections')
      .select('id')
      .eq('class_id', parsed.data.classId)
      .eq('code', parsed.data.code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Section with code "${parsed.data.code}" already exists in this class.` };
    }

    const { data: newSec, error: insertError } = await supabase
      .from('academic_sections')
      .insert({
        institution_id: institutionId,
        class_id: parsed.data.classId,
        campus_id: parsed.data.campusId || null,
        name: parsed.data.name,
        code: parsed.data.code,
        capacity: parsed.data.capacity,
        room_number: parsed.data.roomNumber || null,
        class_teacher_profile_id: parsed.data.classTeacherProfileId || null,
        status: parsed.data.status || 'active',
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_section.created',
      entity_type: 'academic_sections',
      entity_id: newSec.id,
      metadata: { name: parsed.data.name, code: parsed.data.code },
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/sections');
    return { success: true, data: newSec };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create section.' };
  }
}

export async function updateSectionAction(
  id: string,
  data: SectionUpdateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to edit sections.' };
    }

    const parsed = sectionUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid update data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
    if (parsed.data.capacity !== undefined) updatePayload.capacity = parsed.data.capacity;
    if (parsed.data.roomNumber !== undefined) updatePayload.room_number = parsed.data.roomNumber || null;
    if (parsed.data.classTeacherProfileId !== undefined) {
      updatePayload.class_teacher_profile_id = parsed.data.classTeacherProfileId || null;
    }
    if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('academic_sections')
      .update(updatePayload)
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_section.updated',
      entity_type: 'academic_sections',
      entity_id: id,
      metadata: updatePayload,
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/sections');
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update section.' };
  }
}

export async function archiveSectionAction(id: string): Promise<ActionResult> {
  return updateSectionAction(id, { status: 'archived' });
}

// ==============================================================================
// 6. Subject Actions (Courses / Modules)
// ==============================================================================

export async function createSubjectAction(
  data: SubjectCreateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to manage subjects.' };
    }

    const parsed = subjectCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid subject data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Check code uniqueness
    const { data: existing } = await supabase
      .from('academic_subjects')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('code', parsed.data.code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Subject with code "${parsed.data.code}" already exists.` };
    }

    const { data: newSubj, error: insertError } = await supabase
      .from('academic_subjects')
      .insert({
        institution_id: institutionId,
        department_id: parsed.data.departmentId || null,
        name: parsed.data.name,
        code: parsed.data.code,
        subject_type: parsed.data.subjectType,
        credit_hours: parsed.data.creditHours,
        description: parsed.data.description || null,
        status: parsed.data.status || 'active',
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_subject.created',
      entity_type: 'academic_subjects',
      entity_id: newSubj.id,
      metadata: { name: parsed.data.name, code: parsed.data.code },
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/subjects');
    return { success: true, data: newSubj };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create subject.' };
  }
}

export async function updateSubjectAction(
  id: string,
  data: SubjectUpdateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to edit subjects.' };
    }

    const parsed = subjectUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid update data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description || null;
    if (parsed.data.departmentId !== undefined) updatePayload.department_id = parsed.data.departmentId || null;
    if (parsed.data.subjectType !== undefined) updatePayload.subject_type = parsed.data.subjectType;
    if (parsed.data.creditHours !== undefined) updatePayload.credit_hours = parsed.data.creditHours;
    if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('academic_subjects')
      .update(updatePayload)
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_subject.updated',
      entity_type: 'academic_subjects',
      entity_id: id,
      metadata: updatePayload,
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/subjects');
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update subject.' };
  }
}

export async function archiveSubjectAction(id: string): Promise<ActionResult> {
  return updateSubjectAction(id, { status: 'archived' });
}

// ==============================================================================
// 7. Class Subject & Faculty Assignment Actions
// ==============================================================================

export async function assignClassSubjectAction(
  data: ClassSubjectAssignInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to assign subjects.' };
    }

    const parsed = classSubjectAssignSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid assignment data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: newAssignment, error: insertError } = await supabase
      .from('academic_class_subjects')
      .insert({
        institution_id: institutionId,
        class_id: parsed.data.classId,
        section_id: parsed.data.sectionId || null,
        subject_id: parsed.data.subjectId,
        term_id: parsed.data.termId || null,
        faculty_profile_id: parsed.data.facultyProfileId || null,
        status: parsed.data.status || 'active',
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'academic_class_subject.assigned',
      entity_type: 'academic_class_subjects',
      entity_id: newAssignment.id,
      metadata: { classId: parsed.data.classId, subjectId: parsed.data.subjectId },
    });

    revalidatePath('/dashboard/academics');
    revalidatePath('/dashboard/academics/assignments');
    return { success: true, data: newAssignment };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to assign subject.' };
  }
}
