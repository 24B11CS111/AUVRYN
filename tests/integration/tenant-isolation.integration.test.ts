import { describe, it, expect, beforeEach } from 'vitest';
import {
  FIXTURES,
  resetTestFixtures,
  queryAsUser,
  mutateAsUser,
  queryAsAnon,
} from './db';

describe('Integration Scenario A & B: Multi-Tenant Isolation & RBAC', () => {
  beforeEach(() => {
    resetTestFixtures();
  });

  describe('Scenario A: Cross-Tenant Isolation', () => {
    it('Institution A owner cannot view Institution B records under RLS', () => {
      // Alice is Owner of Alpha
      const resInst = queryAsUser<{ id: string; name: string }>({
        userId: FIXTURES.userAliceOwner,
        sql: `SELECT id, name FROM public.institutions;`,
      });

      expect(resInst.error).toBeUndefined();
      expect(resInst.rowCount).toBe(1);
      expect(resInst.rows[0].id).toBe(FIXTURES.instAlpha);
      expect(resInst.rows.find((i) => i.id === FIXTURES.instBeta)).toBeUndefined();

      // Alice selects students: sees Alpha students, 0 Beta students
      const resStudents = queryAsUser<{ id: string; institution_id: string }>({
        userId: FIXTURES.userAliceOwner,
        sql: `SELECT id, institution_id FROM public.students;`,
      });

      expect(resStudents.error).toBeUndefined();
      expect(resStudents.rowCount).toBe(2);
      expect(resStudents.rows.every((s) => s.institution_id === FIXTURES.instAlpha)).toBe(true);
      expect(resStudents.rows.find((s) => s.id === FIXTURES.studentBetaId)).toBeUndefined();
    });

    it('Institution A owner cannot update or delete Institution B records', () => {
      // Attempt cross-tenant update
      const updateRes = mutateAsUser({
        userId: FIXTURES.userAliceOwner,
        sql: `UPDATE public.institutions SET name = 'Breached' WHERE id = '${FIXTURES.instBeta}';`,
      });

      expect(updateRes.success).toBe(true);
      expect(updateRes.output).toContain('UPDATE 0');

      // Attempt cross-tenant delete
      const deleteRes = mutateAsUser({
        userId: FIXTURES.userAliceOwner,
        sql: `DELETE FROM public.students WHERE id = '${FIXTURES.studentBetaId}';`,
      });

      expect(deleteRes.success).toBe(true);
      expect(deleteRes.output).toContain('DELETE 0');
    });

    it('suspended memberships lose all data access under RLS', () => {
      // Eve is faculty in Alpha with status = 'suspended'
      const res = queryAsUser({
        userId: FIXTURES.userEveSuspended,
        sql: `SELECT id FROM public.students;`,
      });

      expect(res.rowCount).toBe(0);

      const mutateRes = mutateAsUser({
        userId: FIXTURES.userEveSuspended,
        sql: `UPDATE public.staff_profiles SET designation = 'Hacked' WHERE user_id = '${FIXTURES.userEveSuspended}';`,
      });

      expect(mutateRes.output).toContain('UPDATE 0');
    });

    it('multi-institution user only accesses institutions where active membership exists', () => {
      // Frank has active membership in Alpha and Beta
      const res = queryAsUser<{ id: string }>({
        userId: FIXTURES.userFrankMultiInst,
        sql: `SELECT id FROM public.institutions ORDER BY id;`,
      });

      expect(res.error).toBeUndefined();

      expect(res.error).toBeUndefined();
      expect(res.rowCount).toBe(2);
      const ids = res.rows.map((r) => r.id);
      expect(ids).toContain(FIXTURES.instAlpha);
      expect(ids).toContain(FIXTURES.instBeta);
    });
  });

  describe('Scenario B: Authentication & Role-Based Access Control', () => {
    it('anonymous users are blocked from reading protected records', () => {
      const resInst = queryAsAnon(`SELECT id, name FROM public.institutions;`);
      expect(resInst.rowCount).toBe(0);

      const resStudents = queryAsAnon(`SELECT id, first_name FROM public.students;`);
      expect(resStudents.rowCount).toBe(0);

      const resStaff = queryAsAnon(`SELECT id, first_name FROM public.staff_profiles;`);
      expect(resStaff.rowCount).toBe(0);
    });

    it('student cannot view peer student records', () => {
      // Charlie is a student at Alpha
      const res = queryAsUser<{ id: string; user_id: string }>({
        userId: FIXTURES.userCharlieStudent,
        sql: `SELECT id, user_id FROM public.students;`,
      });

      expect(res.error).toBeUndefined();
      expect(res.rowCount).toBe(1);
      expect(res.rows[0].id).toBe(FIXTURES.studentCharlieId);
      expect(res.rows[0].user_id).toBe(FIXTURES.userCharlieStudent);
    });

    it('guardians can access only their verified children', () => {
      // Grace is verified guardian of Charlie, NOT Charlie2
      const res = queryAsUser<{ id: string }>({
        userId: FIXTURES.userGraceGuardian,
        sql: `SELECT id FROM public.students;`,
      });

      expect(res.error).toBeUndefined();
      expect(res.rowCount).toBe(1);
      expect(res.rows[0].id).toBe(FIXTURES.studentCharlieId);
    });

    it('teachers and staff cannot perform unauthorized administrative operations', () => {
      // Bob is faculty, cannot delete staff profiles or modify institution
      const res = mutateAsUser({
        userId: FIXTURES.userBobTeacher,
        sql: `DELETE FROM public.staff_profiles WHERE id = '${FIXTURES.staffHenryDriverId}';`,
      });

      expect(res.output).toContain('DELETE 0');
    });

    it('institution administrators cannot cross tenant boundaries into another institution', () => {
      // David is Owner of Beta
      const res = queryAsUser<{ id: string }>({
        userId: FIXTURES.userDavidOwnerBeta,
        sql: `SELECT id FROM public.students WHERE institution_id = '${FIXTURES.instAlpha}';`,
      });

      expect(res.rowCount).toBe(0);
    });
  });
});
