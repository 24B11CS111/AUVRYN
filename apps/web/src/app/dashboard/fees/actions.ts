'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  feeHeadCreateSchema,
  feeStructureCreateSchema,
  studentFeeAssignmentCreateSchema,
  feePaymentRecordSchema,
  feeConcessionRequestSchema,
  feeConcessionApprovalSchema,
  feeRefundRequestSchema,
  feeRefundProcessSchema,
  institutionFeeSettingsUpdateSchema,
  gatewayOrderCreateSchema,
  type FeeHeadCreateInput,
  type FeeStructureCreateInput,
  type StudentFeeAssignmentCreateInput,
  type FeePaymentRecordInput,
  type FeeConcessionRequestInput,
  type FeeConcessionApprovalInput,
  type FeeRefundRequestInput,
  type FeeRefundProcessInput,
  type InstitutionFeeSettingsUpdateInput,
  type GatewayOrderCreateInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const FEES_MANAGE_ROLES = ['owner', 'admin'] as const;
const FEES_COLLECT_ROLES = ['owner', 'admin', 'accountant'] as const;
const FEES_ASSIGN_ROLES = ['owner', 'admin', 'accountant', 'academic_admin', 'admissions_officer'] as const;

function canManageFees(role: string): boolean {
  return (FEES_MANAGE_ROLES as readonly string[]).includes(role);
}

function canCollectFees(role: string): boolean {
  return (FEES_COLLECT_ROLES as readonly string[]).includes(role);
}

function canAssignFees(role: string): boolean {
  return (FEES_ASSIGN_ROLES as readonly string[]).includes(role);
}

/**
 * Resolves the linked student ID(s) if the current user is a student or parent.
 */
async function resolveUserStudentScope(supabase: any, institutionId: string, userId: string, role: string) {
  if (role === 'student') {
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .maybeSingle();
    return { isRestricted: true, studentIds: student ? [student.id] : [] };
  }

  if (role === 'parent') {
    const { data: guardian } = await supabase
      .from('guardians')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!guardian) {
      return { isRestricted: true, studentIds: [] };
    }

    const { data: links } = await supabase
      .from('student_guardians')
      .select('student_id')
      .eq('guardian_id', guardian.id);

    const studentIds = (links || []).map((l: any) => l.student_id);
    return { isRestricted: true, studentIds };
  }

  return { isRestricted: false, studentIds: [] };
}

// ==============================================================================
// 1. Fee Overview & Metrics
// ==============================================================================

export async function getFeeOverviewStatsAction(): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || 'student';
    const supabase = createClient() as any;

    const studentScope = await resolveUserStudentScope(supabase, institutionId, session.user.id, role);

    let assignmentsQuery = supabase
      .from('student_fee_assignments')
      .select('id, gross_amount, discount_amount, net_amount, paid_amount, balance_amount, status')
      .eq('institution_id', institutionId);

    if (studentScope.isRestricted) {
      if (studentScope.studentIds.length === 0) {
        return {
          success: true,
          data: {
            totalAssigned: 0,
            totalCollected: 0,
            totalOutstanding: 0,
            overdueAmount: 0,
            collectionRate: 0,
            activeAssignmentsCount: 0,
            recentPayments: [],
            advanceBalance: 0,
          },
        };
      }
      assignmentsQuery = assignmentsQuery.in('student_id', studentScope.studentIds);
    }

    const { data: assignments, error: assignError } = await assignmentsQuery;
    if (assignError) throw assignError;

    let totalAssigned = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;

    (assignments || []).forEach((a: any) => {
      totalAssigned += Number(a.net_amount || 0);
      totalCollected += Number(a.paid_amount || 0);
      totalOutstanding += Number(a.balance_amount || 0);
      if (a.status === 'overdue') {
        overdueAmount += Number(a.balance_amount || 0);
      }
    });

    // Recent payments
    let paymentsQuery = supabase
      .from('fee_payments')
      .select(`
        id,
        receipt_number,
        amount_received,
        payment_method,
        payment_status,
        payment_date,
        student_id,
        students:student_id (id, first_name, last_name, admission_number)
      `)
      .eq('institution_id', institutionId)
      .eq('payment_status', 'completed')
      .order('payment_date', { ascending: false })
      .limit(5);

    if (studentScope.isRestricted) {
      paymentsQuery = paymentsQuery.in('student_id', studentScope.studentIds);
    }

    const { data: recentPayments, error: payError } = await paymentsQuery;
    if (payError) throw payError;

    // Student advance balance if student
    let advanceBalance = 0;
    if (studentScope.isRestricted && studentScope.studentIds.length > 0) {
      const { data: adv } = await supabase
        .from('student_advance_balances')
        .select('balance_amount')
        .eq('institution_id', institutionId)
        .in('student_id', studentScope.studentIds);

      (adv || []).forEach((b: any) => {
        advanceBalance += Number(b.balance_amount || 0);
      });
    }

    const collectionRate = totalAssigned > 0 ? Math.round((totalCollected / totalAssigned) * 100 * 10) / 10 : 0;

    return {
      success: true,
      data: {
        totalAssigned,
        totalCollected,
        totalOutstanding,
        overdueAmount,
        collectionRate,
        activeAssignmentsCount: (assignments || []).length,
        recentPayments: recentPayments || [],
        advanceBalance,
      },
    };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 2. Fee Heads
// ==============================================================================

export async function getFeeHeadsAction(filter?: {
  category?: string;
  isActive?: boolean;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    let query = supabase
      .from('fee_heads')
      .select('*')
      .eq('institution_id', institutionId)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }
    if (filter?.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function createFeeHeadAction(input: FeeHeadCreateInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || '';

    if (!canManageFees(role)) {
      return { success: false, error: 'Unauthorized: Only administrators can create fee heads.' };
    }

    const parsed = feeHeadCreateSchema.parse(input);
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('fee_heads')
      .insert({
        institution_id: institutionId,
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        category: parsed.category,
        description: parsed.description || null,
        is_refundable: parsed.isRefundable ?? false,
        is_optional: false,
        tax_exempt: true,
        is_active: parsed.isActive ?? true,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/fees');
    revalidatePath('/dashboard/fees/structures');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 3. Master Fee Structures
// ==============================================================================

export async function getFeeStructuresAction(filter?: {
  campusId?: string;
  academicYearId?: string;
  classId?: string;
  programId?: string;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    let query = supabase
      .from('fee_structures')
      .select(`
        *,
        campus:campuses(id, name, code),
        academic_year:academic_years(id, name, code),
        academic_class:academic_classes(id, name, code),
        program:academic_programs(id, name, code),
        fee_structure_items(
          id,
          fee_head_id,
          amount,
          is_mandatory,
          due_date,
          sequence_order,
          fee_head:fee_heads(id, name, code, category)
        ),
        fee_structure_installments(
          id,
          installment_number,
          name,
          percentage,
          due_date,
          late_fee_grace_days,
          late_fee_amount
        )
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (filter?.campusId) {
      query = query.eq('campus_id', filter.campusId);
    }
    if (filter?.academicYearId) {
      query = query.eq('academic_year_id', filter.academicYearId);
    }
    if (filter?.classId) {
      query = query.eq('class_id', filter.classId);
    }
    if (filter?.programId) {
      query = query.eq('program_id', filter.programId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function getFeeStructureByIdAction(id: string): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('fee_structures')
      .select(`
        *,
        campus:campuses(id, name, code),
        academic_year:academic_years(id, name, code),
        academic_class:academic_classes(id, name, code),
        program:academic_programs(id, name, code),
        fee_structure_items(
          id,
          fee_head_id,
          amount,
          is_mandatory,
          due_date,
          sequence_order,
          fee_head:fee_heads(id, name, code, category)
        ),
        fee_structure_installments(
          id,
          installment_number,
          name,
          percentage,
          due_date,
          late_fee_grace_days,
          late_fee_amount
        )
      `)
      .eq('institution_id', institutionId)
      .eq('id', id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function createFeeStructureAction(input: FeeStructureCreateInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || '';

    if (!canManageFees(role)) {
      return { success: false, error: 'Unauthorized: Only administrators can create master fee structures.' };
    }

    const parsed = feeStructureCreateSchema.parse(input);
    const supabase = createClient() as any;

    // Calculate total amount from items
    const totalAmount = parsed.items.reduce((acc, it) => acc + it.amount, 0);

    // 1. Insert fee structure
    const { data: structure, error: structError } = await supabase
      .from('fee_structures')
      .insert({
        institution_id: institutionId,
        academic_year_id: parsed.academicYearId,
        campus_id: parsed.campusId || null,
        term_id: parsed.termId || null,
        program_id: parsed.programId || null,
        class_id: parsed.classId || null,
        student_category: parsed.studentCategory || 'general',
        name: parsed.name,
        code: parsed.code.toUpperCase(),
        total_amount: totalAmount,
        currency: 'INR',
        status: 'draft',
        is_template: false,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (structError) throw structError;

    // 2. Insert items
    const itemsToInsert = parsed.items.map((item, index) => ({
      fee_structure_id: structure.id,
      fee_head_id: item.feeHeadId,
      amount: item.amount,
      is_mandatory: item.isMandatory ?? true,
      sequence_order: item.orderIndex ?? index + 1,
    }));

    const { error: itemsError } = await supabase
      .from('fee_structure_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // 3. Insert installments
    if (parsed.installments && parsed.installments.length > 0) {
      const now = new Date();
      const installmentsToInsert = parsed.installments.map((inst, index) => {
        const dueDateObj = new Date(now.getTime() + (inst.dueDaysOffset || 0) * 86400000);
        const dueDate = dueDateObj.toISOString().slice(0, 10);
        return {
          fee_structure_id: structure.id,
          installment_number: inst.installmentNumber ?? index + 1,
          name: inst.name,
          percentage: inst.percentage,
          due_date: dueDate,
          late_fee_grace_days: 7,
          late_fee_amount: 0,
        };
      });

      const { error: instError } = await supabase
        .from('fee_structure_installments')
        .insert(installmentsToInsert);

      if (instError) throw instError;
    }

    revalidatePath('/dashboard/fees');
    revalidatePath('/dashboard/fees/structures');
    return { success: true, data: structure };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 4. Student Fee Assignments
// ==============================================================================

export async function getStudentFeeAssignmentsAction(filter?: {
  studentId?: string;
  academicYearId?: string;
  status?: string;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || 'student';
    const supabase = createClient() as any;

    const studentScope = await resolveUserStudentScope(supabase, institutionId, session.user.id, role);

    let query = supabase
      .from('student_fee_assignments')
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          admission_number,
          roll_number,
          academic_class:academic_classes(id, name, code),
          academic_section:academic_sections(id, name)
        ),
        fee_structure:fee_structures(id, name, code),
        academic_year:academic_years(id, name, code),
        student_fee_assignment_items(
          id,
          fee_head_id,
          base_amount,
          discount_amount,
          net_amount,
          paid_amount,
          balance_amount,
          fee_head:fee_heads(id, name, code, category)
        ),
        student_fee_installments(
          id,
          installment_number,
          name,
          due_date,
          amount,
          paid_amount,
          balance_amount,
          late_fee_amount,
          late_fee_paid,
          status
        )
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (studentScope.isRestricted) {
      if (studentScope.studentIds.length === 0) {
        return { success: true, data: [] };
      }
      query = query.in('student_id', studentScope.studentIds);
    } else if (filter?.studentId) {
      query = query.eq('student_id', filter.studentId);
    }

    if (filter?.academicYearId) {
      query = query.eq('academic_year_id', filter.academicYearId);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function getStudentFeeAssignmentByIdAction(id: string): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || 'student';
    const supabase = createClient() as any;

    const studentScope = await resolveUserStudentScope(supabase, institutionId, session.user.id, role);

    const { data, error } = await supabase
      .from('student_fee_assignments')
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          admission_number,
          roll_number,
          email,
          phone,
          academic_class:academic_classes(id, name, code),
          academic_section:academic_sections(id, name)
        ),
        fee_structure:fee_structures(id, name, code),
        academic_year:academic_years(id, name, code),
        student_fee_assignment_items(
          id,
          fee_head_id,
          base_amount,
          discount_amount,
          net_amount,
          paid_amount,
          balance_amount,
          fee_head:fee_heads(id, name, code, category)
        ),
        student_fee_installments(
          id,
          installment_number,
          name,
          due_date,
          amount,
          paid_amount,
          balance_amount,
          late_fee_amount,
          late_fee_paid,
          status
        ),
        fee_concessions(
          id,
          concession_type,
          calculation_type,
          calculation_value,
          original_amount,
          approved_amount,
          reason,
          status
        ),
        fee_payments(
          id,
          receipt_number,
          amount_received,
          allocated_amount,
          advance_credit_amount,
          payment_method,
          payment_status,
          payment_date
        )
      `)
      .eq('institution_id', institutionId)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Check student scope authorization
    if (studentScope.isRestricted && !studentScope.studentIds.includes(data.student_id)) {
      return { success: false, error: 'Unauthorized to view this student fee assignment.' };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function createStudentFeeAssignmentAction(
  input: StudentFeeAssignmentCreateInput
): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || '';

    if (!canAssignFees(role)) {
      return { success: false, error: 'Unauthorized: You do not have permission to assign fees to students.' };
    }

    const parsed = studentFeeAssignmentCreateSchema.parse(input);
    const supabase = createClient() as any;

    // 1. Fetch fee structure details
    const { data: structure, error: structError } = await supabase
      .from('fee_structures')
      .select(`
        id,
        total_amount,
        currency,
        fee_structure_items(
          id,
          fee_head_id,
          amount,
          is_mandatory
        ),
        fee_structure_installments(
          id,
          installment_number,
          name,
          percentage,
          due_date,
          late_fee_amount
        )
      `)
      .eq('institution_id', institutionId)
      .eq('id', parsed.feeStructureId)
      .single();

    if (structError || !structure) {
      return { success: false, error: 'Fee structure not found or does not belong to this institution.' };
    }

    const grossAmount = structure.total_amount;
    const discountAmount = parsed.customDiscounts || 0;
    const netAmount = Math.max(0, grossAmount - discountAmount);
    const balanceAmount = netAmount;

    // 2. Insert student fee assignment
    const { data: assignment, error: assignError } = await supabase
      .from('student_fee_assignments')
      .insert({
        institution_id: institutionId,
        student_id: parsed.studentId,
        enrollment_id: parsed.enrollmentId,
        fee_structure_id: parsed.feeStructureId,
        academic_year_id: parsed.academicYearId,
        gross_amount: grossAmount,
        discount_amount: discountAmount,
        net_amount: netAmount,
        paid_amount: 0,
        balance_amount: balanceAmount,
        status: 'assigned',
        currency: structure.currency || 'INR',
        remarks: null,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (assignError) throw assignError;

    // 3. Insert assignment items
    if (structure.fee_structure_items && structure.fee_structure_items.length > 0) {
      const itemsToInsert = structure.fee_structure_items.map((it: any) => ({
        assignment_id: assignment.id,
        fee_head_id: it.fee_head_id,
        base_amount: it.amount,
        discount_amount: 0,
        net_amount: it.amount,
        paid_amount: 0,
        balance_amount: it.amount,
      }));

      const { error: itemsError } = await supabase
        .from('student_fee_assignment_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // 4. Insert assignment installments
    if (structure.fee_structure_installments && structure.fee_structure_installments.length > 0) {
      const instToInsert = structure.fee_structure_installments.map((inst: any) => {
        const instAmount = Math.round((netAmount * (inst.percentage / 100)) * 100) / 100;
        return {
          assignment_id: assignment.id,
          installment_number: inst.installment_number,
          name: inst.name,
          due_date: parsed.dueDate || inst.due_date,
          amount: instAmount,
          paid_amount: 0,
          balance_amount: instAmount,
          late_fee_amount: inst.late_fee_amount || 0,
          late_fee_paid: 0,
          status: 'pending',
        };
      });

      const { error: instError } = await supabase
        .from('student_fee_installments')
        .insert(instToInsert);

      if (instError) throw instError;
    }

    // 5. Append-only ledger record: fee_charged
    const { error: ledgerError } = await supabase
      .from('financial_ledger_entries')
      .insert({
        institution_id: institutionId,
        student_id: parsed.studentId,
        entry_type: 'fee_charged',
        debit_amount: netAmount,
        credit_amount: 0,
        balance_after: netAmount,
        currency: structure.currency || 'INR',
        reference_type: 'student_fee_assignments',
        reference_id: assignment.id,
        description: `Fee assigned via structure ${parsed.feeStructureId}`,
        created_by: session.user.id,
      });

    if (ledgerError) throw ledgerError;

    revalidatePath('/dashboard/fees');
    revalidatePath('/dashboard/fees/assignments');
    return { success: true, data: assignment };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 5. Payment Collection & Allocations
// ==============================================================================

export async function recordFeePaymentAction(input: FeePaymentRecordInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || '';

    if (!canCollectFees(role)) {
      return { success: false, error: 'Unauthorized: Only accountants and administrators can collect payments.' };
    }

    const parsed = feePaymentRecordSchema.parse(input);
    const supabase = createClient() as any;

    // Call stored procedure: record_fee_payment_atomic
    const { data, error } = await supabase.rpc('record_fee_payment_atomic', {
      p_institution_id: institutionId,
      p_student_id: parsed.studentId,
      p_enrollment_id: parsed.enrollmentId || null,
      p_assignment_id: parsed.assignmentId || null,
      p_amount_received: parsed.amountReceived,
      p_payment_method: parsed.paymentMethod,
      p_external_ref: parsed.externalTransactionId || parsed.chequeNumber || null,
      p_allocations: parsed.allocations || [],
      p_notes: parsed.notes || null,
      p_user_id: session.user.id,
    });

    if (error) throw error;

    revalidatePath('/dashboard/fees');
    revalidatePath('/dashboard/fees/collections');
    revalidatePath('/dashboard/fees/receipts');
    revalidatePath('/dashboard/fees/assignments');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function getFeePaymentsAction(filter?: {
  studentId?: string;
  receiptNumber?: string;
  method?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || 'student';
    const supabase = createClient() as any;

    const studentScope = await resolveUserStudentScope(supabase, institutionId, session.user.id, role);

    let query = supabase
      .from('fee_payments')
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          admission_number,
          roll_number,
          academic_class:academic_classes(id, name, code)
        ),
        payment_allocations(
          id,
          assignment_id,
          assignment_item_id,
          installment_id,
          allocated_amount,
          fee_head:fee_heads(id, name, code, category)
        )
      `)
      .eq('institution_id', institutionId)
      .order('payment_date', { ascending: false });

    if (studentScope.isRestricted) {
      if (studentScope.studentIds.length === 0) {
        return { success: true, data: [] };
      }
      query = query.in('student_id', studentScope.studentIds);
    } else if (filter?.studentId) {
      query = query.eq('student_id', filter.studentId);
    }

    if (filter?.receiptNumber) {
      query = query.ilike('receipt_number', `%${filter.receiptNumber}%`);
    }
    if (filter?.method) {
      query = query.eq('payment_method', filter.method);
    }
    if (filter?.startDate) {
      query = query.gte('payment_date', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte('payment_date', filter.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function getPaymentReceiptAction(receiptNumberOrId: string): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || 'student';
    const supabase = createClient() as any;

    const studentScope = await resolveUserStudentScope(supabase, institutionId, session.user.id, role);

    // Search by receipt_number or id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receiptNumberOrId);
    let query = supabase
      .from('fee_payments')
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          admission_number,
          roll_number,
          email,
          phone,
          academic_class:academic_classes(id, name, code),
          academic_section:academic_sections(id, name)
        ),
        payment_allocations(
          id,
          allocated_amount,
          installment_id,
          fee_head:fee_heads(id, name, code, category)
        )
      `)
      .eq('institution_id', institutionId);

    if (isUuid) {
      query = query.eq('id', receiptNumberOrId);
    } else {
      query = query.eq('receipt_number', receiptNumberOrId);
    }

    const { data: payment, error } = await query.single();
    if (error || !payment) {
      return { success: false, error: 'Payment receipt not found.' };
    }

    // Verify student/parent privacy
    if (studentScope.isRestricted && !studentScope.studentIds.includes(payment.student_id)) {
      return { success: false, error: 'Unauthorized to view this payment receipt.' };
    }

    // Fetch institution and fee settings
    const { data: instSettings } = await supabase
      .from('institution_fee_settings')
      .select('*')
      .eq('institution_id', institutionId)
      .maybeSingle();

    const { data: institution } = await supabase
      .from('institutions')
      .select('id, name, code, address, city, state, country, postal_code, email, phone')
      .eq('id', institutionId)
      .single();

    return {
      success: true,
      data: {
        payment,
        institution,
        settings: instSettings,
      },
    };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 6. Concessions & Scholarships (Separation of Duty)
// ==============================================================================

export async function getFeeConcessionsAction(filter?: {
  studentId?: string;
  status?: string;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || 'student';
    const supabase = createClient() as any;

    const studentScope = await resolveUserStudentScope(supabase, institutionId, session.user.id, role);

    let query = supabase
      .from('fee_concessions')
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          admission_number,
          roll_number,
          academic_class:academic_classes(id, name, code)
        ),
        student_fee_assignments(
          id,
          gross_amount,
          discount_amount,
          net_amount,
          paid_amount,
          balance_amount
        )
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (studentScope.isRestricted) {
      if (studentScope.studentIds.length === 0) {
        return { success: true, data: [] };
      }
      query = query.in('student_id', studentScope.studentIds);
    } else if (filter?.studentId) {
      query = query.eq('student_id', filter.studentId);
    }

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function requestFeeConcessionAction(input: FeeConcessionRequestInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    const parsed = feeConcessionRequestSchema.parse(input);
    const supabase = createClient() as any;

    // Verify assignment exists and get original amount
    const { data: assignment, error: assignError } = await supabase
      .from('student_fee_assignments')
      .select('id, student_id, gross_amount, net_amount, balance_amount')
      .eq('institution_id', institutionId)
      .eq('id', parsed.assignmentId)
      .single();

    if (assignError || !assignment) {
      return { success: false, error: 'Fee assignment not found for this institution.' };
    }

    const originalAmount = Number(assignment.net_amount);

    const { data: concession, error } = await supabase
      .from('fee_concessions')
      .insert({
        institution_id: institutionId,
        assignment_id: parsed.assignmentId,
        student_id: parsed.studentId,
        concession_type: parsed.concessionType,
        calculation_type: parsed.calculationType,
        calculation_value: parsed.concessionValue,
        original_amount: originalAmount,
        approved_amount: 0,
        reason: parsed.reason,
        status: 'requested',
        requested_by: session.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/fees');
    revalidatePath('/dashboard/fees/concessions');
    return { success: true, data: concession };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function approveFeeConcessionAction(input: FeeConcessionApprovalInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || '';

    // STRICT ROLE CHECK: Only owner and admin can approve concessions
    if (!canManageFees(role)) {
      return {
        success: false,
        error: 'Unauthorized: Only institutional administrators (Owners/Admins) have authority to approve concessions.',
      };
    }

    const parsed = feeConcessionApprovalSchema.parse(input);
    const supabase = createClient() as any;

    // Call stored procedure: approve_fee_concession_atomic
    const { data, error } = await supabase.rpc('approve_fee_concession_atomic', {
      p_institution_id: institutionId,
      p_concession_id: parsed.concessionId,
      p_approved_by: session.user.id,
      p_new_status: parsed.status,
      p_rejection_reason: parsed.rejectionReason || null,
    });

    if (error) throw error;

    revalidatePath('/dashboard/fees');
    revalidatePath('/dashboard/fees/concessions');
    revalidatePath('/dashboard/fees/assignments');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 7. Refunds Management (Separation of Duty)
// ==============================================================================

export async function getFeeRefundsAction(filter?: {
  studentId?: string;
  status?: string;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || 'student';
    const supabase = createClient() as any;

    const studentScope = await resolveUserStudentScope(supabase, institutionId, session.user.id, role);

    let query = supabase
      .from('fee_refund_requests')
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          admission_number,
          roll_number,
          academic_class:academic_classes(id, name, code)
        ),
        fee_payments(
          id,
          receipt_number,
          amount_received,
          payment_method,
          payment_date
        )
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (studentScope.isRestricted) {
      if (studentScope.studentIds.length === 0) {
        return { success: true, data: [] };
      }
      query = query.in('student_id', studentScope.studentIds);
    } else if (filter?.studentId) {
      query = query.eq('student_id', filter.studentId);
    }

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function requestFeeRefundAction(input: FeeRefundRequestInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const parsed = feeRefundRequestSchema.parse(input);
    const supabase = createClient() as any;

    // Verify payment exists and has completed status
    const { data: payment, error: payError } = await supabase
      .from('fee_payments')
      .select('id, student_id, amount_received, payment_status')
      .eq('institution_id', institutionId)
      .eq('id', parsed.paymentId)
      .single();

    if (payError || !payment) {
      return { success: false, error: 'Payment record not found.' };
    }

    if (payment.payment_status !== 'completed' && payment.payment_status !== 'partially_refunded') {
      return { success: false, error: 'Only completed payments can be refunded.' };
    }

    if (parsed.refundAmount > Number(payment.amount_received)) {
      return { success: false, error: 'Requested refund amount exceeds payment amount received.' };
    }

    const refundSeq = Date.now().toString().slice(-6);
    const refundNumber = `REF-${new Date().getFullYear()}-${refundSeq}`;

    const { data: refund, error } = await supabase
      .from('fee_refund_requests')
      .insert({
        institution_id: institutionId,
        student_id: parsed.studentId,
        payment_id: parsed.paymentId,
        refund_number: refundNumber,
        amount_requested: parsed.refundAmount,
        reason: parsed.reason,
        status: 'requested',
        requested_by: session.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/fees');
    revalidatePath('/dashboard/fees/refunds');
    return { success: true, data: refund };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function processFeeRefundAction(input: FeeRefundProcessInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || '';

    // STRICT ROLE CHECK: Only owner and admin can process/approve refunds
    if (!canManageFees(role)) {
      return {
        success: false,
        error: 'Unauthorized: Only institutional administrators (Owners/Admins) have authority to approve and process refunds.',
      };
    }

    const parsed = feeRefundProcessSchema.parse(input);
    const supabase = createClient() as any;

    // Call stored procedure: process_fee_refund_atomic
    const { data, error } = await supabase.rpc('process_fee_refund_atomic', {
      p_institution_id: institutionId,
      p_refund_id: parsed.refundId,
      p_processed_by: session.user.id,
      p_disbursement_method: parsed.disbursementMethod || 'bank_transfer',
      p_disbursement_ref: parsed.disbursementReference || null,
    });

    if (error) throw error;

    revalidatePath('/dashboard/fees');
    revalidatePath('/dashboard/fees/refunds');
    revalidatePath('/dashboard/fees/collections');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 8. Financial Ledger (Immutable Audit)
// ==============================================================================

export async function getFinancialLedgerAction(filter?: {
  studentId?: string;
  entryType?: string;
  limit?: number;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || 'student';
    const supabase = createClient() as any;

    const studentScope = await resolveUserStudentScope(supabase, institutionId, session.user.id, role);

    let query = supabase
      .from('financial_ledger_entries')
      .select(`
        *,
        student:students(
          id,
          first_name,
          last_name,
          admission_number,
          roll_number
        )
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(filter?.limit || 100);

    if (studentScope.isRestricted) {
      if (studentScope.studentIds.length === 0) {
        return { success: true, data: [] };
      }
      query = query.in('student_id', studentScope.studentIds);
    } else if (filter?.studentId) {
      query = query.eq('student_id', filter.studentId);
    }

    if (filter?.entryType) {
      query = query.eq('entry_type', filter.entryType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 9. Institution Fee Settings
// ==============================================================================

export async function getInstitutionFeeSettingsAction(): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('institution_fee_settings')
      .select('*')
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (error) throw error;

    // If no row exists, create default settings
    if (!data) {
      const { data: created, error: createError } = await supabase
        .from('institution_fee_settings')
        .insert({
          institution_id: institutionId,
          receipt_prefix: 'RCP',
          invoice_prefix: 'INV',
          enable_partial_payments: true,
          allow_advance_payments: true,
          default_late_fee_per_day: 10,
          grace_period_days: 7,
          tax_percentage: 0,
          currency: 'INR',
          gateway_provider: 'razorpay',
          is_gateway_live: false,
        })
        .select()
        .single();

      if (createError) throw createError;
      return { success: true, data: created };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function updateInstitutionFeeSettingsAction(
  input: InstitutionFeeSettingsUpdateInput
): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const role = session.activeMembership?.role || '';

    if (!canManageFees(role)) {
      return { success: false, error: 'Unauthorized: Only institutional administrators can modify fee settings.' };
    }

    const parsed = institutionFeeSettingsUpdateSchema.parse(input);
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('institution_fee_settings')
      .update({
        receipt_prefix: parsed.receiptPrefix?.toUpperCase(),
        invoice_prefix: parsed.invoicePrefix?.toUpperCase(),
        enable_partial_payments: true,
        allow_advance_payments: true,
        default_late_fee_per_day: parsed.lateFeeDailyAmount || 0,
        grace_period_days: parsed.gracePeriodDays || 0,
        currency: parsed.currency?.toUpperCase() || 'INR',
        gateway_provider: parsed.gatewayProvider || 'razorpay',
        is_gateway_live: parsed.isGatewayEnabled || false,
        gateway_key_id: parsed.gatewayKeyId || null,
        webhook_secret_ciphertext: parsed.gatewayWebhookSecret || null,
      })
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/fees');
    revalidatePath('/dashboard/fees/settings');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 10. Payment Gateway Abstraction & Online Checkout
// ==============================================================================

export async function createGatewayOrderAction(input: GatewayOrderCreateInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const parsed = gatewayOrderCreateSchema.parse(input);
    const supabase = createClient() as any;

    const orderRef = `ORD-${Date.now().toString().slice(-8)}`;
    const mockGatewayOrderId = `gw_order_${Date.now()}`;

    const { data, error } = await supabase
      .from('gateway_orders')
      .insert({
        institution_id: institutionId,
        student_id: parsed.studentId,
        assignment_id: parsed.assignmentId || null,
        order_reference: orderRef,
        gateway_provider: 'razorpay',
        gateway_order_id: mockGatewayOrderId,
        amount: parsed.amount,
        currency: parsed.currency || 'INR',
        status: 'created',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function verifyGatewayPaymentAction(input: {
  orderReference: string;
  externalTransactionId?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    const { data: order, error: orderErr } = await supabase
      .from('gateway_orders')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('order_reference', input.orderReference)
      .single();

    if (orderErr || !order) {
      return { success: false, error: 'Gateway order not found.' };
    }

    if (order.status === 'paid') {
      return { success: true, data: { payment_id: order.payment_id, already_paid: true } };
    }

    // Call atomic payment procedure
    const { data: paymentResult, error: payError } = await supabase.rpc('record_fee_payment_atomic', {
      p_institution_id: institutionId,
      p_student_id: order.student_id,
      p_enrollment_id: null,
      p_assignment_id: order.assignment_id || null,
      p_amount_received: order.amount,
      p_payment_method: 'payment_gateway',
      p_external_ref: input.externalTransactionId || order.gateway_order_id,
      p_allocations: [],
      p_notes: `Online Gateway Checkout (Order: ${order.order_reference})`,
      p_user_id: session.user.id,
    });

    if (payError) throw payError;

    // Update order status to paid
    await supabase
      .from('gateway_orders')
      .update({
        status: 'paid',
        payment_id: paymentResult.payment_id,
      })
      .eq('id', order.id);

    revalidatePath('/dashboard/fees');
    revalidatePath('/dashboard/fees/collections');
    revalidatePath('/dashboard/fees/receipts');
    return { success: true, data: paymentResult };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}
