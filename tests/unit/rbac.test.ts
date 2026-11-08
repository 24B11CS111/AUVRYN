import { describe, it, expect } from 'vitest';
import {
  ROLE_PERMISSIONS,
  type Role,
  type Permission,
} from '../../packages/types/src';

describe('Unit: RBAC Permissions Matrix & Hierarchy', () => {
  function checkPermission(role: Role, requiredPermission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    return rolePermissions.includes(requiredPermission);
  }

  it('verifies Owner has complete administrative and billing authority', () => {
    const ownerPermissions = ROLE_PERMISSIONS['owner'];
    expect(ownerPermissions).toContain('institution:manage');
    expect(ownerPermissions).toContain('members:manage');
    expect(ownerPermissions).toContain('campuses:manage');
    expect(ownerPermissions).toContain('academics:manage');
    expect(ownerPermissions).toContain('audit:view');
    expect(ownerPermissions).toContain('billing:manage');
  });

  it('verifies Admin has administrative rights but is strictly barred from billing', () => {
    expect(checkPermission('admin', 'institution:manage')).toBe(true);
    expect(checkPermission('admin', 'members:manage')).toBe(true);
    expect(checkPermission('admin', 'audit:view')).toBe(true);
    expect(checkPermission('admin', 'billing:manage')).toBe(false);
  });

  it('verifies Academic Admin can only manage academic domains', () => {
    expect(checkPermission('academic_admin', 'academics:manage')).toBe(true);
    expect(checkPermission('academic_admin', 'campuses:view')).toBe(true);
    expect(checkPermission('academic_admin', 'institution:manage')).toBe(false);
    expect(checkPermission('academic_admin', 'members:manage')).toBe(false);
    expect(checkPermission('academic_admin', 'audit:view')).toBe(false);
  });

  it('verifies Faculty has view-only access to institution and members, view academics', () => {
    expect(checkPermission('faculty', 'institution:view')).toBe(true);
    expect(checkPermission('faculty', 'members:view')).toBe(true);
    expect(checkPermission('faculty', 'academics:view')).toBe(true);
    expect(checkPermission('faculty', 'institution:manage')).toBe(false);
    expect(checkPermission('faculty', 'members:manage')).toBe(false);
    expect(checkPermission('faculty', 'campuses:manage')).toBe(false);
    expect(checkPermission('faculty', 'audit:view')).toBe(false);
  });

  it('verifies Student and Parent cannot manage any institution entities', () => {
    const restrictedRoles: Role[] = ['student', 'parent'];

    for (const r of restrictedRoles) {
      expect(checkPermission(r, 'institution:manage')).toBe(false);
      expect(checkPermission(r, 'members:manage')).toBe(false);
      expect(checkPermission(r, 'campuses:manage')).toBe(false);
      expect(checkPermission(r, 'academics:manage')).toBe(false);
      expect(checkPermission(r, 'audit:view')).toBe(false);
      expect(checkPermission(r, 'billing:manage')).toBe(false);
      expect(checkPermission(r, 'students:manage')).toBe(false);
      expect(checkPermission(r, 'admissions:manage')).toBe(false);
    }
  });

  it('verifies Admissions Officer can manage admissions and students, but cannot manage billing or members', () => {
    expect(checkPermission('admissions_officer', 'admissions:manage')).toBe(true);
    expect(checkPermission('admissions_officer', 'admissions:view')).toBe(true);
    expect(checkPermission('admissions_officer', 'students:manage')).toBe(true);
    expect(checkPermission('admissions_officer', 'students:view')).toBe(true);
    expect(checkPermission('admissions_officer', 'billing:manage')).toBe(false);
    expect(checkPermission('admissions_officer', 'members:manage')).toBe(false);
    expect(checkPermission('admissions_officer', 'institution:manage')).toBe(false);
  });

  it('verifies Accountant can manage billing and view students, but cannot manage admissions', () => {
    expect(checkPermission('accountant', 'billing:manage')).toBe(true);
    expect(checkPermission('accountant', 'institution:view')).toBe(true);
    expect(checkPermission('accountant', 'students:view')).toBe(true);
    expect(checkPermission('accountant', 'students:manage')).toBe(false);
    expect(checkPermission('accountant', 'admissions:manage')).toBe(false);
    expect(checkPermission('accountant', 'members:manage')).toBe(false);
  });

  it('verifies HR Administrator has full staff, onboarding invitation, and document verification authority', () => {
    expect(checkPermission('hr_administrator', 'staff:manage')).toBe(true);
    expect(checkPermission('hr_administrator', 'staff:view')).toBe(true);
    expect(checkPermission('hr_administrator', 'invitations:manage')).toBe(true);
    expect(checkPermission('hr_administrator', 'invitations:view')).toBe(true);
    expect(checkPermission('hr_administrator', 'documents:manage')).toBe(true);
    expect(checkPermission('hr_administrator', 'documents:verify')).toBe(true);
    expect(checkPermission('hr_administrator', 'members:view')).toBe(true);
    expect(checkPermission('hr_administrator', 'members:manage')).toBe(true);
    // HR Admin cannot view audit logs, modify institution billing or curricula
    expect(checkPermission('hr_administrator', 'audit:view')).toBe(false);
    expect(checkPermission('hr_administrator', 'billing:manage')).toBe(false);
    expect(checkPermission('hr_administrator', 'academics:manage')).toBe(false);
  });

  it('verifies Department Head can assign faculty and view staff and academics, but cannot alter HR records', () => {
    expect(checkPermission('department_head', 'staff:view')).toBe(true);
    expect(checkPermission('department_head', 'faculty:assign')).toBe(true);
    expect(checkPermission('department_head', 'academics:view')).toBe(true);
    expect(checkPermission('department_head', 'students:view')).toBe(true);
    expect(checkPermission('department_head', 'staff:manage')).toBe(false);
    expect(checkPermission('department_head', 'invitations:manage')).toBe(false);
    expect(checkPermission('department_head', 'billing:manage')).toBe(false);
  });

  it('verifies Faculty and Staff cannot manage staff profiles, change roles, or invite members', () => {
    const roles: Role[] = ['faculty', 'staff'];
    for (const r of roles) {
      expect(checkPermission(r, 'staff:manage')).toBe(false);
      expect(checkPermission(r, 'invitations:manage')).toBe(false);
      expect(checkPermission(r, 'billing:manage')).toBe(false);
      expect(checkPermission(r, 'members:manage')).toBe(false);
      expect(checkPermission(r, 'institution:manage')).toBe(false);
    }
  });

  it('verifies Attendance & Leave management permissions matrix', () => {
    // Faculty can mark, view and correct attendance
    expect(checkPermission('faculty', 'attendance:mark')).toBe(true);
    expect(checkPermission('faculty', 'attendance:view')).toBe(true);
    expect(checkPermission('faculty', 'attendance:correct')).toBe(true);
    expect(checkPermission('faculty', 'attendance:reports')).toBe(true);
    expect(checkPermission('faculty', 'leaves:apply')).toBe(true);
    expect(checkPermission('faculty', 'leaves:approve')).toBe(false);

    // Academic Admin and Department Head can approve leaves and manage attendance
    expect(checkPermission('academic_admin', 'attendance:mark')).toBe(true);
    expect(checkPermission('academic_admin', 'leaves:approve')).toBe(true);
    expect(checkPermission('department_head', 'attendance:mark')).toBe(true);
    expect(checkPermission('department_head', 'leaves:approve')).toBe(true);

    // HR Administrator can view/correct attendance and approve staff leaves
    expect(checkPermission('hr_administrator', 'attendance:view')).toBe(true);
    expect(checkPermission('hr_administrator', 'attendance:correct')).toBe(true);
    expect(checkPermission('hr_administrator', 'leaves:approve')).toBe(true);

    // Students and Parents have view-only attendance & apply-only leave permissions
    const viewerRoles: Role[] = ['student', 'parent'];
    for (const r of viewerRoles) {
      expect(checkPermission(r, 'attendance:view')).toBe(true);
      expect(checkPermission(r, 'leaves:apply')).toBe(true);
      expect(checkPermission(r, 'leaves:view')).toBe(true);
      expect(checkPermission(r, 'attendance:mark')).toBe(false);
      expect(checkPermission(r, 'attendance:correct')).toBe(false);
      expect(checkPermission(r, 'leaves:approve')).toBe(false);
    }
  });

  it('verifies Timetable and Room permissions across roles (Milestone 6)', () => {
    // Owner, Admin, and Academic Admin can manage timetables and rooms
    expect(checkPermission('owner', 'timetable:manage')).toBe(true);
    expect(checkPermission('owner', 'rooms:manage')).toBe(true);
    expect(checkPermission('admin', 'timetable:manage')).toBe(true);
    expect(checkPermission('admin', 'rooms:manage')).toBe(true);
    expect(checkPermission('academic_admin', 'timetable:manage')).toBe(true);
    expect(checkPermission('academic_admin', 'rooms:manage')).toBe(true);

    // Department Head can manage timetables and request/approve substitutions, view rooms
    expect(checkPermission('department_head', 'timetable:manage')).toBe(true);
    expect(checkPermission('department_head', 'timetable:substitute')).toBe(true);
    expect(checkPermission('department_head', 'rooms:view')).toBe(true);
    expect(checkPermission('department_head', 'rooms:manage')).toBe(false);

    // Faculty can view timetable, request substitution, and view rooms
    expect(checkPermission('faculty', 'timetable:view')).toBe(true);
    expect(checkPermission('faculty', 'timetable:substitute')).toBe(true);
    expect(checkPermission('faculty', 'rooms:view')).toBe(true);
    expect(checkPermission('faculty', 'timetable:manage')).toBe(false);
    expect(checkPermission('faculty', 'rooms:manage')).toBe(false);

    // Students and Parents have view-only access to timetables
    expect(checkPermission('student', 'timetable:view')).toBe(true);
    expect(checkPermission('student', 'timetable:manage')).toBe(false);
    expect(checkPermission('student', 'timetable:substitute')).toBe(false);
    expect(checkPermission('parent', 'timetable:view')).toBe(true);
    expect(checkPermission('parent', 'timetable:manage')).toBe(false);
  });

  it('verifies Examination, Marks Entry, Results, and Revaluation permissions (Milestone 7)', () => {
    // Owner, Admin, and Academic Admin can manage examinations, grading schemes, and publish results
    const adminRoles: Role[] = ['owner', 'admin', 'academic_admin'];
    for (const r of adminRoles) {
      expect(checkPermission(r, 'exams:manage')).toBe(true);
      expect(checkPermission(r, 'exams:view')).toBe(true);
      expect(checkPermission(r, 'grading:manage')).toBe(true);
      expect(checkPermission(r, 'results:publish')).toBe(true);
      expect(checkPermission(r, 'results:view')).toBe(true);
      expect(checkPermission(r, 'marks:verify')).toBe(true);
      expect(checkPermission(r, 'revaluation:review')).toBe(true);
    }

    // Faculty can enter marks, view exams and results, review revaluations, but CANNOT publish results or manage grading
    expect(checkPermission('faculty', 'exams:view')).toBe(true);
    expect(checkPermission('faculty', 'marks:enter')).toBe(true);
    expect(checkPermission('faculty', 'results:view')).toBe(true);
    expect(checkPermission('faculty', 'revaluation:review')).toBe(true);
    expect(checkPermission('faculty', 'exams:manage')).toBe(false);
    expect(checkPermission('faculty', 'results:publish')).toBe(false);
    expect(checkPermission('faculty', 'grading:manage')).toBe(false);

    // Students and Parents can view published results, view exams, and apply for revaluation
    const studentFamilyRoles: Role[] = ['student', 'parent'];
    for (const r of studentFamilyRoles) {
      expect(checkPermission(r, 'exams:view')).toBe(true);
      expect(checkPermission(r, 'results:view')).toBe(true);
      expect(checkPermission(r, 'revaluation:apply')).toBe(true);
      expect(checkPermission(r, 'exams:manage')).toBe(false);
      expect(checkPermission(r, 'marks:enter')).toBe(false);
      expect(checkPermission(r, 'marks:verify')).toBe(false);
      expect(checkPermission(r, 'results:publish')).toBe(false);
      expect(checkPermission(r, 'grading:manage')).toBe(false);
      expect(checkPermission(r, 'revaluation:review')).toBe(false);
    }
  });

  it('verifies Fees and Payments RBAC permissions and strict separation of duties', () => {
    // Owner and Admin have complete fee management, concession approval, and refund approval authority
    const adminRoles: Role[] = ['owner', 'admin'];
    for (const r of adminRoles) {
      expect(checkPermission(r, 'fees:manage')).toBe(true);
      expect(checkPermission(r, 'fees:assign')).toBe(true);
      expect(checkPermission(r, 'fees:collect')).toBe(true);
      expect(checkPermission(r, 'fees:concession_apply')).toBe(true);
      expect(checkPermission(r, 'fees:concession_approve')).toBe(true);
      expect(checkPermission(r, 'fees:refund_request')).toBe(true);
      expect(checkPermission(r, 'fees:refund_approve')).toBe(true);
      expect(checkPermission(r, 'fees:reports_view')).toBe(true);
      expect(checkPermission(r, 'fees:view')).toBe(true);
      expect(checkPermission(r, 'receipts:view')).toBe(true);
    }

    // Accountant can collect payments, apply for concessions, request refunds, and view reports
    expect(checkPermission('accountant', 'fees:collect')).toBe(true);
    expect(checkPermission('accountant', 'fees:concession_apply')).toBe(true);
    expect(checkPermission('accountant', 'fees:refund_request')).toBe(true);
    expect(checkPermission('accountant', 'fees:reports_view')).toBe(true);
    expect(checkPermission('accountant', 'fees:view')).toBe(true);
    expect(checkPermission('accountant', 'receipts:view')).toBe(true);

    // CRITICAL SEPARATION OF DUTIES: Accountant CANNOT approve concessions, approve refunds, or manage fee heads!
    expect(checkPermission('accountant', 'fees:concession_approve')).toBe(false);
    expect(checkPermission('accountant', 'fees:refund_approve')).toBe(false);
    expect(checkPermission('accountant', 'fees:manage')).toBe(false);
    expect(checkPermission('accountant', 'fees:assign')).toBe(false);

    // Academic Admin and Admissions Officer have selective fee view rights
    expect(checkPermission('admissions_officer', 'fees:view')).toBe(true);
    expect(checkPermission('admissions_officer', 'receipts:view')).toBe(true);
    expect(checkPermission('admissions_officer', 'fees:concession_approve')).toBe(false);
    expect(checkPermission('admissions_officer', 'fees:refund_approve')).toBe(false);

    // Student and Parent can view their own fees and receipts, but CANNOT manage, assign, or collect
    const studentParentRoles: Role[] = ['student', 'parent'];
    for (const r of studentParentRoles) {
      expect(checkPermission(r, 'fees:view')).toBe(true);
      expect(checkPermission(r, 'receipts:view')).toBe(true);
      expect(checkPermission(r, 'fees:manage')).toBe(false);
      expect(checkPermission(r, 'fees:assign')).toBe(false);
      expect(checkPermission(r, 'fees:collect')).toBe(false);
      expect(checkPermission(r, 'fees:concession_approve')).toBe(false);
      expect(checkPermission(r, 'fees:refund_approve')).toBe(false);
      expect(checkPermission(r, 'fees:reports_view')).toBe(false);
    }
  });

  it('verifies Communications, Announcements, Messaging, and Homework RBAC permissions (Milestone 9)', () => {
    // Owner and Admin have complete communications and homework management
    const adminRoles: Role[] = ['owner', 'admin'];
    for (const r of adminRoles) {
      expect(checkPermission(r, 'communications:manage')).toBe(true);
      expect(checkPermission(r, 'announcements:publish')).toBe(true);
      expect(checkPermission(r, 'announcements:view')).toBe(true);
      expect(checkPermission(r, 'messages:send')).toBe(true);
      expect(checkPermission(r, 'messages:moderate')).toBe(true);
      expect(checkPermission(r, 'homework:manage')).toBe(true);
      expect(checkPermission(r, 'homework:grade')).toBe(true);
      expect(checkPermission(r, 'notifications:manage')).toBe(true);
    }

    // Faculty can manage homework, grade, view announcements, and send messages, but cannot moderate
    expect(checkPermission('faculty', 'homework:manage')).toBe(true);
    expect(checkPermission('faculty', 'homework:grade')).toBe(true);
    expect(checkPermission('faculty', 'announcements:view')).toBe(true);
    expect(checkPermission('faculty', 'messages:send')).toBe(true);
    expect(checkPermission('faculty', 'messages:moderate')).toBe(false);
    expect(checkPermission('faculty', 'communications:manage')).toBe(false);

    // Students can view announcements, send messages, and submit homework, but cannot manage or grade
    expect(checkPermission('student', 'announcements:view')).toBe(true);
    expect(checkPermission('student', 'messages:send')).toBe(true);
    expect(checkPermission('student', 'homework:submit')).toBe(true);
    expect(checkPermission('student', 'homework:manage')).toBe(false);
    expect(checkPermission('student', 'homework:grade')).toBe(false);
    expect(checkPermission('student', 'announcements:publish')).toBe(false);
    expect(checkPermission('student', 'messages:moderate')).toBe(false);

    // Parents can view announcements, send messages, and view homework, but cannot submit or grade
    expect(checkPermission('parent', 'announcements:view')).toBe(true);
    expect(checkPermission('parent', 'messages:send')).toBe(true);
    expect(checkPermission('parent', 'homework:manage')).toBe(true);
    expect(checkPermission('parent', 'homework:submit')).toBe(false);
    expect(checkPermission('parent', 'homework:grade')).toBe(false);
    expect(checkPermission('parent', 'announcements:publish')).toBe(false);
    expect(checkPermission('parent', 'messages:moderate')).toBe(false);
  });

  it('correctly maps Milestone 10 Transport & Tracking permissions across roles', () => {
    // Owners and Admins have full transport permissions
    for (const r of ['owner', 'admin'] as const) {
      expect(checkPermission(r, 'transport:manage')).toBe(true);
      expect(checkPermission(r, 'transport:view')).toBe(true);
      expect(checkPermission(r, 'transport:assign')).toBe(true);
      expect(checkPermission(r, 'transport:journey_manage')).toBe(true);
      expect(checkPermission(r, 'transport:track')).toBe(true);
      expect(checkPermission(r, 'transport:board')).toBe(true);
      expect(checkPermission(r, 'transport:driver')).toBe(true);
    }

    // Staff have driver and operational permissions but cannot alter root transport policies
    expect(checkPermission('staff', 'transport:view')).toBe(true);
    expect(checkPermission('staff', 'transport:assign')).toBe(true);
    expect(checkPermission('staff', 'transport:journey_manage')).toBe(true);
    expect(checkPermission('staff', 'transport:track')).toBe(true);
    expect(checkPermission('staff', 'transport:board')).toBe(true);
    expect(checkPermission('staff', 'transport:driver')).toBe(true);
    expect(checkPermission('staff', 'transport:manage')).toBe(false);

    // Faculty can view and mark boarding but cannot manage journeys or drive
    expect(checkPermission('faculty', 'transport:view')).toBe(true);
    expect(checkPermission('faculty', 'transport:board')).toBe(true);
    expect(checkPermission('faculty', 'transport:manage')).toBe(false);
    expect(checkPermission('faculty', 'transport:driver')).toBe(false);

    // Students and Parents can view and track routes, but cannot manage, assign, or drive
    for (const r of ['student', 'parent'] as const) {
      expect(checkPermission(r, 'transport:view')).toBe(true);
      expect(checkPermission(r, 'transport:track')).toBe(true);
      expect(checkPermission(r, 'transport:manage')).toBe(false);
      expect(checkPermission(r, 'transport:assign')).toBe(false);
      expect(checkPermission(r, 'transport:journey_manage')).toBe(false);
      expect(checkPermission(r, 'transport:board')).toBe(false);
      expect(checkPermission(r, 'transport:driver')).toBe(false);
    }
  });
});
