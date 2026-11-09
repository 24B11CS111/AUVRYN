'use server';

import { createClient } from '@/lib/supabase/server';
import { requireInstitution } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createLibraryBranchSchema,
  createLibraryBookSchema,
  createLibraryCopySchema,
  createLibraryMemberSchema,
  issueBookSchema,
  returnBookSchema,
  renewBookSchema,
  createReservationSchema,
  payFineSchema,
  waiveFineSchema,
  createDigitalResourceSchema,
  updateLibrarySettingsSchema,
  type CreateLibraryBranchInput,
  type CreateLibraryBookInput,
  type CreateLibraryCopyInput,
  type CreateLibraryMemberInput,
  type IssueBookInput,
  type ReturnBookInput,
  type RenewBookInput,
  type CreateReservationInput,
  type PayFineInput,
  type WaiveFineInput,
  type CreateDigitalResourceInput,
  type UpdateLibrarySettingsInput,
} from '@edu-platform/validators';

// ============================================================================
// 1. Library Overview & Stats
// ============================================================================

export async function getLibraryOverviewStatsAction() {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const [
      { data: books },
      { data: copies },
      { data: circulations },
      { data: members },
      { data: fines },
      { data: reservations },
    ] = await Promise.all([
      supabase.from('library_books').select('id, category').eq('institution_id', institutionId),
      supabase.from('library_book_copies').select('id, status').eq('institution_id', institutionId),
      supabase
        .from('library_circulations')
        .select('id, status, due_date, member:library_members(member_type, membership_number)')
        .eq('institution_id', institutionId),
      supabase.from('library_members').select('id, status, member_type').eq('institution_id', institutionId),
      supabase.from('library_fines').select('id, amount, status').eq('institution_id', institutionId),
      supabase.from('library_reservations').select('id, status').eq('institution_id', institutionId),
    ]);

    const bookList = books || [];
    const copyList = copies || [];
    const circList = circulations || [];
    const memberList = members || [];
    const fineList = fines || [];
    const resList = reservations || [];

    const totalTitles = bookList.length;
    const totalCopies = copyList.length;
    const availableCopies = copyList.filter((c: any) => c.status === 'available').length;
    const issuedCopies = copyList.filter((c: any) => c.status === 'borrowed').length;

    const todayStr = new Date().toISOString().split('T')[0] || '';
    const activeCirculations = circList.filter((c: any) => c.status === 'issued').length;
    const overdueCirculations = circList.filter(
      (c: any) => c.status === 'overdue' || (c.status === 'issued' && c.due_date < todayStr)
    ).length;

    const totalMembers = memberList.filter((m: any) => m.status === 'active').length;
    const studentMembers = memberList.filter((m: any) => m.member_type === 'student').length;
    const staffMembers = memberList.filter((m: any) => m.member_type === 'staff').length;

    const pendingFines = fineList
      .filter((f: any) => f.status === 'pending')
      .reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);

    const pendingReservations = resList.filter((r: any) => r.status === 'pending').length;

    return {
      success: true,
      data: {
        totalTitles,
        totalCopies,
        availableCopies,
        issuedCopies,
        activeCirculations,
        overdueCirculations,
        totalMembers,
        studentMembers,
        staffMembers,
        pendingFines,
        pendingReservations,
      },
    };
  } catch (error: any) {
    console.error('getLibraryOverviewStatsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch library stats' };
  }
}

// ============================================================================
// 2. Branches Management
// ============================================================================

export async function getLibraryBranchesAction(campusId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let query = supabase
      .from('library_branches')
      .select('*, campus:campuses(id, name)')
      .eq('institution_id', institutionId)
      .order('name', { ascending: true });

    if (campusId) {
      query = query.eq('campus_id', campusId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getLibraryBranchesAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch branches' };
  }
}

export async function createLibraryBranchAction(input: CreateLibraryBranchInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to create library branch' };
    }

    const validated = createLibraryBranchSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('library_branches')
      .insert({
        institution_id: institutionId,
        campus_id: validated.campusId || null,
        name: validated.name,
        code: validated.code.toUpperCase(),
        location: validated.location || null,
        opening_hours: validated.openingHours || null,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/library');
    return { success: true, data };
  } catch (error: any) {
    console.error('createLibraryBranchAction error:', error);
    return { success: false, error: error.message || 'Failed to create branch' };
  }
}

// ============================================================================
// 3. Books & Catalogue
// ============================================================================

export async function getLibraryBooksAction(filters?: {
  branchId?: string;
  category?: string;
  query?: string;
}) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('library_books')
      .select(
        `
        *,
        branch:library_branches(id, name, code),
        copies:library_book_copies(id, status, accession_number, barcode)
      `
      )
      .eq('institution_id', institutionId)
      .order('title', { ascending: true });

    if (filters?.branchId) {
      queryBuilder = queryBuilder.eq('branch_id', filters.branchId);
    }
    if (filters?.category) {
      queryBuilder = queryBuilder.eq('category', filters.category);
    }
    if (filters?.query) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${filters.query}%,author.ilike.%${filters.query}%,isbn.ilike.%${filters.query}%`
      );
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getLibraryBooksAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch books' };
  }
}

export async function getLibraryBookDetailsAction(bookId: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('library_books')
      .select(
        `
        *,
        branch:library_branches(id, name, code),
        copies:library_book_copies(*),
        reservations:library_reservations(*, member:library_members(*))
      `
      )
      .eq('institution_id', institutionId)
      .eq('id', bookId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('getLibraryBookDetailsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch book details' };
  }
}

export async function createLibraryBookAction(input: CreateLibraryBookInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to add book to catalog' };
    }

    const validated = createLibraryBookSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('library_books')
      .insert({
        institution_id: institutionId,
        branch_id: validated.branchId || null,
        title: validated.title,
        author: validated.author,
        isbn: validated.isbn || null,
        publisher: validated.publisher || null,
        category: validated.category,
        edition: validated.edition || null,
        subject: validated.subject || null,
        dewey_decimal: validated.deweyDecimal || null,
        description: validated.description || null,
        cover_url: validated.coverUrl || null,
        pages: validated.pages || null,
        language: validated.language || 'English',
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/library');
    revalidatePath('/dashboard/library/books');
    return { success: true, data };
  } catch (error: any) {
    console.error('createLibraryBookAction error:', error);
    return { success: false, error: error.message || 'Failed to create book catalog entry' };
  }
}

export async function deleteLibraryBookAction(bookId: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to delete book catalog entry' };
    }

    const supabase = (await createClient()) as any;
    const { error } = await supabase
      .from('library_books')
      .delete()
      .eq('institution_id', institutionId)
      .eq('id', bookId);

    if (error) throw error;
    revalidatePath('/dashboard/library/books');
    return { success: true };
  } catch (error: any) {
    console.error('deleteLibraryBookAction error:', error);
    return { success: false, error: error.message || 'Failed to delete book' };
  }
}

// ============================================================================
// 4. Book Copies
// ============================================================================

export async function getLibraryCopiesAction(bookId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('library_book_copies')
      .select(
        `
        *,
        book:library_books(id, title, author, category),
        branch:library_branches(id, name)
      `
      )
      .eq('institution_id', institutionId)
      .order('accession_number', { ascending: true });

    if (bookId) {
      queryBuilder = queryBuilder.eq('book_id', bookId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getLibraryCopiesAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch book copies' };
  }
}

export async function createLibraryCopyAction(input: CreateLibraryCopyInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to create book copy' };
    }

    const validated = createLibraryCopySchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('library_book_copies')
      .insert({
        institution_id: institutionId,
        book_id: validated.bookId,
        branch_id: validated.branchId || null,
        accession_number: validated.accessionNumber.toUpperCase(),
        barcode: validated.barcode,
        copy_number: validated.copyNumber || 1,
        status: validated.status || 'available',
        condition: validated.condition || 'good',
        shelf_location: validated.shelfLocation || null,
        price: validated.price || 0,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/library/books');
    revalidatePath(`/dashboard/library/books/${validated.bookId}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('createLibraryCopyAction error:', error);
    return { success: false, error: error.message || 'Failed to create copy' };
  }
}

// ============================================================================
// 5. Members Management
// ============================================================================

export async function getLibraryMembersAction(filters?: {
  memberType?: 'student' | 'staff';
  query?: string;
}) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('library_members')
      .select(
        `
        *,
        student:students(id, first_name, last_name, admission_number),
        staff:staff_profiles(id, first_name, last_name, employee_id)
      `
      )
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (filters?.memberType) {
      queryBuilder = queryBuilder.eq('member_type', filters.memberType);
    }
    if (filters?.query) {
      queryBuilder = queryBuilder.or(
        `membership_number.ilike.%${filters.query}%,barcode.ilike.%${filters.query}%`
      );
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getLibraryMembersAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch library members' };
  }
}

export async function createLibraryMemberAction(input: CreateLibraryMemberInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to register library members' };
    }

    const validated = createLibraryMemberSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('library_members')
      .insert({
        institution_id: institutionId,
        member_type: validated.memberType,
        student_id: validated.studentId || null,
        staff_id: validated.staffId || null,
        membership_number: validated.membershipNumber.toUpperCase(),
        barcode: validated.barcode,
        max_books_allowed: validated.maxBooksAllowed ?? (validated.memberType === 'student' ? 3 : 6),
        borrow_duration_days:
          validated.borrowDurationDays ?? (validated.memberType === 'student' ? 14 : 30),
        status: (validated as any).status || 'active',
        notes: validated.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/library/members');
    return { success: true, data };
  } catch (error: any) {
    console.error('createLibraryMemberAction error:', error);
    return { success: false, error: error.message || 'Failed to register member' };
  }
}

// ============================================================================
// 6. Circulation Desk (Atomic Issue, Return, Renewal)
// ============================================================================

export async function issueLibraryBookAction(input: IssueBookInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: only staff can issue books' };
    }

    const validated = issueBookSchema.parse(input);
    const supabase = (await createClient()) as any;

    // Call atomic stored procedure
    const { data, error } = await supabase.rpc('issue_library_book_atomic', {
      p_institution_id: institutionId,
      p_copy_id: validated.copyId,
      p_member_id: validated.memberId,
      p_issued_by: session.user.id,
      p_loan_days: validated.loanDurationDays || 14,
    });

    if (error) throw error;
    if (data && !data.success) {
      return { success: false, error: data.error || 'Failed to issue book' };
    }

    revalidatePath('/dashboard/library');
    revalidatePath('/dashboard/library/circulation');
    revalidatePath('/dashboard/library/books');
    return { success: true, data };
  } catch (error: any) {
    console.error('issueLibraryBookAction error:', error);
    return { success: false, error: error.message || 'Failed to issue book' };
  }
}

export async function returnLibraryBookAction(input: ReturnBookInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: only staff can accept book returns' };
    }

    const validated = returnBookSchema.parse(input);
    const supabase = (await createClient()) as any;

    // Call atomic stored procedure
    const { data, error } = await supabase.rpc('return_library_book_atomic', {
      p_institution_id: institutionId,
      p_circulation_id: validated.circulationId,
      p_received_by: session.user.id,
      p_condition: validated.condition || 'good',
    });

    if (error) throw error;
    if (data && !data.success) {
      return { success: false, error: data.error || 'Failed to return book' };
    }

    revalidatePath('/dashboard/library');
    revalidatePath('/dashboard/library/circulation');
    revalidatePath('/dashboard/library/fines');
    return { success: true, data };
  } catch (error: any) {
    console.error('returnLibraryBookAction error:', error);
    return { success: false, error: error.message || 'Failed to return book' };
  }
}

export async function renewLibraryBookAction(input: RenewBookInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = renewBookSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data: circ, error: fetchErr } = await supabase
      .from('library_circulations')
      .select('*, member:library_members(*)')
      .eq('institution_id', institutionId)
      .eq('id', validated.circulationId)
      .single();

    if (fetchErr || !circ) {
      return { success: false, error: 'Circulation record not found' };
    }

    if (circ.status !== 'issued') {
      return { success: false, error: `Cannot renew book with status: ${circ.status}` };
    }

    if (circ.renewal_count >= circ.max_renewals) {
      return {
        success: false,
        error: `Maximum renewals reached (${circ.max_renewals} allowed)`,
      };
    }

    const newDueDate = new Date(
      new Date(circ.due_date).getTime() + (validated.extensionDays || 14) * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split('T')[0];

    const { data, error } = await supabase
      .from('library_circulations')
      .update({
        renewal_count: circ.renewal_count + 1,
        due_date: newDueDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', circ.id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/library/circulation');
    return { success: true, data };
  } catch (error: any) {
    console.error('renewLibraryBookAction error:', error);
    return { success: false, error: error.message || 'Failed to renew book' };
  }
}

export async function getLibraryCirculationsAction(filters?: {
  status?: string;
  memberId?: string;
}) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('library_circulations')
      .select(
        `
        *,
        copy:library_book_copies(id, accession_number, barcode, book:library_books(id, title, author)),
        member:library_members(id, member_type, membership_number, student:students(first_name, last_name), staff:staff_profiles(first_name, last_name))
      `
      )
      .eq('institution_id', institutionId)
      .order('issued_at', { ascending: false });

    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status);
    }
    if (filters?.memberId) {
      queryBuilder = queryBuilder.eq('member_id', filters.memberId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getLibraryCirculationsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch circulations' };
  }
}

// ============================================================================
// 7. Reservations
// ============================================================================

export async function createLibraryReservationAction(input: CreateReservationInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = createReservationSchema.parse(input);
    const supabase = (await createClient()) as any;

    const expiresAt = new Date(Date.now() + ((validated as any).holdDurationDays || 7) * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('library_reservations')
      .insert({
        institution_id: institutionId,
        book_id: validated.bookId,
        member_id: validated.memberId,
        expires_at: expiresAt,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/library/reservations');
    return { success: true, data };
  } catch (error: any) {
    console.error('createLibraryReservationAction error:', error);
    return { success: false, error: error.message || 'Failed to reserve book' };
  }
}

export async function getLibraryReservationsAction(filters?: {
  status?: string;
  bookId?: string;
}) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('library_reservations')
      .select(
        `
        *,
        book:library_books(id, title, author),
        member:library_members(id, member_type, membership_number, student:students(first_name, last_name), staff:staff_profiles(first_name, last_name))
      `
      )
      .eq('institution_id', institutionId)
      .order('reserved_at', { ascending: false });

    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status);
    }
    if (filters?.bookId) {
      queryBuilder = queryBuilder.eq('book_id', filters.bookId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getLibraryReservationsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch reservations' };
  }
}

export async function cancelLibraryReservationAction(reservationId: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('library_reservations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('institution_id', institutionId)
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/library/reservations');
    return { success: true, data };
  } catch (error: any) {
    console.error('cancelLibraryReservationAction error:', error);
    return { success: false, error: error.message || 'Failed to cancel reservation' };
  }
}

// ============================================================================
// 8. Fines Management
// ============================================================================

export async function getLibraryFinesAction(filters?: {
  status?: string;
  memberId?: string;
}) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('library_fines')
      .select(
        `
        *,
        member:library_members(id, member_type, membership_number, student:students(first_name, last_name), staff:staff_profiles(first_name, last_name)),
        circulation:library_circulations(id, copy:library_book_copies(accession_number, book:library_books(title)))
      `
      )
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status);
    }
    if (filters?.memberId) {
      queryBuilder = queryBuilder.eq('member_id', filters.memberId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getLibraryFinesAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch fines' };
  }
}

export async function payLibraryFineAction(input: PayFineInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = payFineSchema.parse(input);
    const supabase = (await createClient()) as any;

    const receiptNum = validated.receiptNumber || `LIB-REC-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from('library_fines')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        receipt_number: receiptNum,
        notes: validated.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('institution_id', institutionId)
      .eq('id', validated.fineId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/library/fines');
    return { success: true, data };
  } catch (error: any) {
    console.error('payLibraryFineAction error:', error);
    return { success: false, error: error.message || 'Failed to mark fine as paid' };
  }
}

export async function waiveLibraryFineAction(input: WaiveFineInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: only admin/owner can waive fines' };
    }

    const validated = waiveFineSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('library_fines')
      .update({
        status: 'waived',
        waived_at: new Date().toISOString(),
        waived_by: session.user.id,
        waiver_reason: validated.waiverReason,
        updated_at: new Date().toISOString(),
      })
      .eq('institution_id', institutionId)
      .eq('id', validated.fineId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/library/fines');
    return { success: true, data };
  } catch (error: any) {
    console.error('waiveLibraryFineAction error:', error);
    return { success: false, error: error.message || 'Failed to waive fine' };
  }
}

// ============================================================================
// 9. Digital Resources
// ============================================================================

export async function getLibraryDigitalResourcesAction(category?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('library_digital_resources')
      .select('*')
      .eq('institution_id', institutionId)
      .order('title', { ascending: true });

    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getLibraryDigitalResourcesAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch digital resources' };
  }
}

export async function createLibraryDigitalResourceAction(input: CreateDigitalResourceInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = createDigitalResourceSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('library_digital_resources')
      .insert({
        institution_id: institutionId,
        branch_id: validated.branchId || null,
        title: validated.title,
        author: validated.author || null,
        resource_type: validated.resourceType,
        category: validated.category,
        file_url: validated.fileUrl || null,
        external_url: validated.externalUrl || null,
        access_level: validated.accessLevel || 'all_members',
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/library');
    return { success: true, data };
  } catch (error: any) {
    console.error('createLibraryDigitalResourceAction error:', error);
    return { success: false, error: error.message || 'Failed to create digital resource' };
  }
}

// ============================================================================
// 10. Library Settings
// ============================================================================

export async function getLibrarySettingsAction() {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('library_settings')
      .select('*')
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Default settings fallback
      return {
        success: true,
        data: {
          fine_per_day: 5.0,
          grace_period_days: 2,
          max_fine_per_book: 200.0,
          default_loan_days_student: 14,
          default_loan_days_staff: 30,
          max_books_student: 3,
          max_books_staff: 6,
        },
      };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('getLibrarySettingsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch settings' };
  }
}

export async function updateLibrarySettingsAction(input: UpdateLibrarySettingsInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to update settings' };
    }

    const validated = updateLibrarySettingsSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('library_settings')
      .upsert(
        {
          institution_id: institutionId,
          fine_per_day: validated.finePerDay,
          grace_period_days: validated.gracePeriodDays,
          max_fine_per_book: validated.maxFinePerBook,
          default_loan_days_student: validated.defaultLoanDaysStudent,
          default_loan_days_staff: validated.defaultLoanDaysStaff,
          max_books_student: validated.maxBooksStudent,
          max_books_staff: validated.maxBooksStaff,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'institution_id' }
      )
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/library');
    return { success: true, data };
  } catch (error: any) {
    console.error('updateLibrarySettingsAction error:', error);
    return { success: false, error: error.message || 'Failed to update library settings' };
  }
}
