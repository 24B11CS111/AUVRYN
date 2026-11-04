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
    }
  });
});
