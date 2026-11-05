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
});
