import { describe, it, expect, beforeEach } from 'vitest';
import {
  FIXTURES,
  resetTestFixtures,
  queryAsUser,
  mutateAsUser,
} from './db';

describe('Integration Scenario C & D: Attendance & Storage Security', () => {
  beforeEach(() => {
    resetTestFixtures();
  });

  describe('Scenario C: Attendance RLS and Access Control', () => {
    it('authorized faculty (Bob) can create attendance session and record student attendance', () => {
      // Bob is faculty at Alpha
      const newSessionId = '70000000-0000-0000-0000-000000000099';
      const sessionRes = mutateAsUser({
        userId: FIXTURES.userBobTeacher,
        sql: `
          INSERT INTO public.attendance_sessions (
            id, institution_id, academic_year_id, class_id, session_date, marked_by_staff_id, topic_covered
          ) VALUES (
            '${newSessionId}', '${FIXTURES.instAlpha}', '${FIXTURES.academicYearAlpha}',
            '${FIXTURES.academicClassAlpha}', CURRENT_DATE + INTERVAL '1 day', '${FIXTURES.staffBobId}', 'Algebra II'
          );
        `,
      });

      expect(sessionRes.success).toBe(true);
      expect(sessionRes.output).toContain('INSERT 0 1');

      // Faculty Bob inserts student attendance record
      const newRecordId = '71000000-0000-0000-0000-000000000099';
      const recordRes = mutateAsUser({
        userId: FIXTURES.userBobTeacher,
        sql: `
          INSERT INTO public.student_attendance_records (
            id, institution_id, session_id, student_id, enrollment_id, status
          ) VALUES (
            '${newRecordId}', '${FIXTURES.instAlpha}', '${newSessionId}',
            '${FIXTURES.studentCharlieId}', '${FIXTURES.enrollmentCharlieId}', 'present'
          );
        `,
      });

      expect(recordRes.success).toBe(true);
      expect(recordRes.output).toContain('INSERT 0 1');
    });

    it('student Charlie can view own attendance record but cannot view peer Charlie2 records', () => {
      // Charlie queries attendance records
      const res = queryAsUser<{ id: string; student_id: string; status: string }>({
        userId: FIXTURES.userCharlieStudent,
        sql: `SELECT id, student_id, status FROM public.student_attendance_records;`,
      });

      expect(res.error).toBeUndefined();
      expect(res.rowCount).toBe(1);
      expect(res.rows[0].student_id).toBe(FIXTURES.studentCharlieId);

      // Verify Charlie2 is not returned
      expect(res.rows.find((r) => r.student_id === FIXTURES.studentCharlie2Id)).toBeUndefined();
    });

    it('verified guardian Grace can view Charlie attendance record but not unrelated students', () => {
      // Grace is verified mother of Charlie
      const res = queryAsUser<{ id: string; student_id: string }>({
        userId: FIXTURES.userGraceGuardian,
        sql: `SELECT id, student_id FROM public.student_attendance_records;`,
      });

      expect(res.error).toBeUndefined();
      expect(res.rowCount).toBe(1);
      expect(res.rows[0].student_id).toBe(FIXTURES.studentCharlieId);
      expect(res.rows.find((r) => r.student_id === FIXTURES.studentCharlie2Id)).toBeUndefined();
    });

    it('student Charlie cannot alter or insert attendance correction records', () => {
      // Charlie attempts to insert an attendance correction
      const corrRes = mutateAsUser({
        userId: FIXTURES.userCharlieStudent,
        sql: `
          INSERT INTO public.attendance_corrections (
            id, institution_id, record_id, session_id, student_id, previous_status,
            new_status, reason, corrected_by
          ) VALUES (
            '72000000-0000-0000-0000-000000000001', '${FIXTURES.instAlpha}',
            '71000000-0000-0000-0000-000000000001', '${FIXTURES.attendanceSessionAlpha}',
            '${FIXTURES.studentCharlieId}',
            'absent', 'present', 'Falsifying attendance',
            '${FIXTURES.userCharlieStudent}'
          );
        `,
      });

      // Insert should fail with RLS violation (row-level security policy check fails)
      expect(corrRes.success).toBe(false);
      expect(corrRes.error || corrRes.output).toMatch(/violates row-level security policy/i);

      // Charlie attempts to directly mutate student_attendance_records
      const mutateRes = mutateAsUser({
        userId: FIXTURES.userCharlieStudent,
        sql: `
          UPDATE public.student_attendance_records
          SET status = 'present'
          WHERE student_id = '${FIXTURES.studentCharlie2Id}';
        `,
      });

      expect(mutateRes.output).toContain('UPDATE 0');
    });
  });

  describe('Scenario D: Storage RLS & Document Isolation', () => {
    it('Institution Alpha owner (Alice) can view Alpha student documents but not Institution Beta documents', () => {
      const res = queryAsUser<{ id: string; bucket_id: string; name: string }>({
        userId: FIXTURES.userAliceOwner,
        sql: `SELECT id, bucket_id, name FROM storage.objects WHERE bucket_id = 'student-documents';`,
      });

      expect(res.error).toBeUndefined();
      // Should see Charlie and Charlie2 documents belonging to Alpha
      expect(res.rowCount).toBe(2);
      expect(res.rows.every((o) => o.name.startsWith(FIXTURES.instAlpha))).toBe(true);

      // Verify Beta document is not visible
      expect(res.rows.some((o) => o.name.startsWith(FIXTURES.instBeta))).toBe(false);
    });

    it('student Charlie can read own birth_cert.pdf but cannot read Charlie2 report_card.pdf', () => {
      const res = queryAsUser<{ id: string; name: string }>({
        userId: FIXTURES.userCharlieStudent,
        sql: `SELECT id, name FROM storage.objects WHERE bucket_id = 'student-documents';`,
      });

      expect(res.error).toBeUndefined();
      expect(res.rowCount).toBe(1);
      expect(res.rows[0].name).toBe(`${FIXTURES.instAlpha}/students/${FIXTURES.studentCharlieId}/birth_cert.pdf`);
    });

    it('student Charlie cannot delete own storage documents', () => {
      // Storage delete policy allows only owners and admins
      const deleteRes = mutateAsUser({
        userId: FIXTURES.userCharlieStudent,
        sql: `
          DELETE FROM storage.objects
          WHERE id = '81000000-0000-0000-0000-000000000001';
        `,
      });

      expect(deleteRes.success).toBe(true);
      expect(deleteRes.output).toContain('DELETE 0');

      // Verify file still exists
      const verifyRes = queryAsUser<{ id: string }>({
        userId: FIXTURES.userCharlieStudent,
        sql: `SELECT id FROM storage.objects WHERE id = '81000000-0000-0000-0000-000000000001';`,
      });
      expect(verifyRes.rowCount).toBe(1);
    });

    it('Institution Alpha owner (Alice) can delete Alpha storage objects', () => {
      const deleteRes = mutateAsUser({
        userId: FIXTURES.userAliceOwner,
        sql: `
          DELETE FROM storage.objects
          WHERE id = '81000000-0000-0000-0000-000000000001';
        `,
      });

      expect(deleteRes.success).toBe(true);
      expect(deleteRes.output).toContain('DELETE 1');

      // Verify document was removed
      const checkRes = queryAsUser<{ id: string }>({
        userId: FIXTURES.userAliceOwner,
        sql: `SELECT id FROM storage.objects WHERE id = '81000000-0000-0000-0000-000000000001';`,
      });
      expect(checkRes.rowCount).toBe(0);
    });
  });
});
