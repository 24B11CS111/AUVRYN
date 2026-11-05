import { describe, it, expect } from 'vitest';
import {
  roomCreateSchema,
  roomUpdateSchema,
  timetableStructureCreateSchema,
  timetablePeriodsBatchSchema,
  timetableEntryCreateSchema,
  timetableSubstitutionCreateSchema,
  timetableSubstitutionReviewSchema,
} from '../../packages/validators/src';

describe('Unit: Timetable & Scheduling Validators', () => {
  // 1. Room Creation Schema
  describe('roomCreateSchema', () => {
    it('accepts valid classroom with facilities', () => {
      const valid = roomCreateSchema.safeParse({
        roomNumber: '101',
        name: 'Science Classroom A',
        building: 'Block A',
        floor: 'Ground Floor',
        roomType: 'classroom',
        capacity: 45,
        facilities: ['projector', 'smartboard', 'air_conditioned'],
        isActive: true,
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.roomNumber).toBe('101');
        expect(valid.data.capacity).toBe(45);
        expect(valid.data.facilities).toHaveLength(3);
      }
    });

    it('accepts specialized laboratory or auditorium', () => {
      const valid = roomCreateSchema.safeParse({
        roomNumber: 'L-204',
        name: 'Turing Computer Science Lab',
        building: 'Engineering Block',
        floor: '2nd Floor',
        roomType: 'computer_lab',
        capacity: 60,
        facilities: ['60_workstations', 'gigabit_lan', 'projector'],
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.roomType).toBe('computer_lab');
      }
    });

    it('rejects empty room number or building', () => {
      const invalid = roomCreateSchema.safeParse({
        roomNumber: '   ',
        building: '',
        roomType: 'classroom',
        capacity: 40,
      });

      expect(invalid.success).toBe(false);
    });

    it('rejects negative or zero capacity', () => {
      const invalid = roomCreateSchema.safeParse({
        roomNumber: '102',
        building: 'Block A',
        capacity: 0,
      });

      expect(invalid.success).toBe(false);
    });
  });

  // 2. Room Update Schema
  describe('roomUpdateSchema', () => {
    it('accepts partial updates with valid room ID', () => {
      const valid = roomUpdateSchema.safeParse({
        id: '11111111-1111-1111-1111-111111111111',
        capacity: 55,
        facilities: ['projector', 'whiteboard'],
      });

      expect(valid.success).toBe(true);
    });

    it('rejects update without valid UUID', () => {
      const invalid = roomUpdateSchema.safeParse({
        id: 'not-a-uuid',
        capacity: 50,
      });

      expect(invalid.success).toBe(false);
    });
  });

  // 3. Timetable Structure Creation Schema
  describe('timetableStructureCreateSchema', () => {
    it('accepts valid timetable structure with working days', () => {
      const valid = timetableStructureCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        name: 'Senior Secondary Morning Shift',
        description: 'Standard 7-period schedule for intermediate classes',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        startTime: '08:30:00',
        endTime: '15:30:00',
        periodsPerDay: 7,
        isDefault: true,
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.workingDays).toHaveLength(6);
        expect(valid.data.periodsPerDay).toBe(7);
      }
    });

    it('rejects structure when end time is before or equal to start time', () => {
      const invalid = timetableStructureCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        name: 'Invalid Timing Shift',
        workingDays: ['monday', 'tuesday'],
        startTime: '14:00:00',
        endTime: '09:00:00', // end before start
        periodsPerDay: 5,
      });

      expect(invalid.success).toBe(false);
    });

    it('rejects structure with empty working days', () => {
      const invalid = timetableStructureCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        name: 'No Days Shift',
        workingDays: [],
        startTime: '08:00:00',
        endTime: '14:00:00',
        periodsPerDay: 6,
      });

      expect(invalid.success).toBe(false);
    });
  });

  // 4. Timetable Period Batch Schema
  describe('timetablePeriodsBatchSchema', () => {
    it('accepts valid period slots including breaks', () => {
      const valid = timetablePeriodsBatchSchema.safeParse({
        structureId: '11111111-1111-1111-1111-111111111111',
        periods: [
          {
            periodNumber: 1,
            name: 'Period 1',
            startTime: '08:30',
            endTime: '09:20',
            isBreak: false,
            breakType: 'none',
            sessionSlot: 'morning',
          },
          {
            periodNumber: 2,
            name: 'Morning Recess',
            startTime: '09:20',
            endTime: '09:35',
            isBreak: true,
            breakType: 'short_break',
            sessionSlot: 'morning',
          },
          {
            periodNumber: 3,
            name: 'Period 2',
            startTime: '09:35',
            endTime: '10:25',
            isBreak: false,
            breakType: 'none',
            sessionSlot: 'morning',
          },
        ],
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.periods).toHaveLength(3);
        expect(valid.data.periods[1]?.isBreak).toBe(true);
      }
    });

    it('rejects period where end time is before start time', () => {
      const invalid = timetablePeriodsBatchSchema.safeParse({
        structureId: '11111111-1111-1111-1111-111111111111',
        periods: [
          {
            periodNumber: 1,
            name: 'Broken Period',
            startTime: '10:00',
            endTime: '09:00',
          },
        ],
      });

      expect(invalid.success).toBe(false);
    });
  });

  // 5. Timetable Entry Creation Schema
  describe('timetableEntryCreateSchema', () => {
    it('accepts valid weekly recurring lecture slot', () => {
      const valid = timetableEntryCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        classId: '22222222-2222-2222-2222-222222222222',
        sectionId: '33333333-3333-3333-3333-333333333333',
        subjectId: '44444444-4444-4444-4444-444444444444',
        facultyId: '55555555-5555-5555-5555-555555555555',
        roomId: '66666666-6666-6666-6666-666666666666',
        dayOfWeek: 'monday',
        periodNumber: 2,
        startTime: '09:30',
        endTime: '10:20',
        sessionType: 'theory',
        effectiveStartDate: '2026-06-01',
        colorCode: '#3b82f6',
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.dayOfWeek).toBe('monday');
        expect(valid.data.periodNumber).toBe(2);
      }
    });

    it('accepts laboratory / practical session without section for combined cohort', () => {
      const valid = timetableEntryCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        classId: '22222222-2222-2222-2222-222222222222',
        subjectId: '44444444-4444-4444-4444-444444444444',
        facultyId: '55555555-5555-5555-5555-555555555555',
        dayOfWeek: 'thursday',
        periodNumber: 4,
        startTime: '13:30',
        endTime: '15:10',
        sessionType: 'laboratory',
        effectiveStartDate: '2026-06-01',
      });

      expect(valid.success).toBe(true);
    });

    it('rejects invalid timing order', () => {
      const invalid = timetableEntryCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        classId: '22222222-2222-2222-2222-222222222222',
        subjectId: '44444444-4444-4444-4444-444444444444',
        facultyId: '55555555-5555-5555-5555-555555555555',
        dayOfWeek: 'monday',
        periodNumber: 1,
        startTime: '11:00',
        endTime: '10:00', // invalid
        effectiveStartDate: '2026-06-01',
      });

      expect(invalid.success).toBe(false);
    });

    it('rejects invalid hex color code', () => {
      const invalid = timetableEntryCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        classId: '22222222-2222-2222-2222-222222222222',
        subjectId: '44444444-4444-4444-4444-444444444444',
        facultyId: '55555555-5555-5555-5555-555555555555',
        dayOfWeek: 'monday',
        periodNumber: 1,
        startTime: '08:30',
        endTime: '09:20',
        effectiveStartDate: '2026-06-01',
        colorCode: 'blue-not-hex',
      });

      expect(invalid.success).toBe(false);
    });
  });

  // 6. Faculty Substitution Schema
  describe('timetableSubstitutionCreateSchema', () => {
    it('accepts valid substitution request with distinct substitute faculty', () => {
      const valid = timetableSubstitutionCreateSchema.safeParse({
        timetableEntryId: '11111111-1111-1111-1111-111111111111',
        substitutionDate: '2026-11-10',
        originalFacultyId: '22222222-2222-2222-2222-222222222222',
        substituteFacultyId: '33333333-3333-3333-3333-333333333333',
        reason: 'Attending national curriculum conference in Delhi',
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.substitutionDate).toBe('2026-11-10');
      }
    });

    it('rejects substitution when substitute faculty is the same as original faculty', () => {
      const sameId = '22222222-2222-2222-2222-222222222222';
      const invalid = timetableSubstitutionCreateSchema.safeParse({
        timetableEntryId: '11111111-1111-1111-1111-111111111111',
        substitutionDate: '2026-11-10',
        originalFacultyId: sameId,
        substituteFacultyId: sameId,
        reason: 'Self-substitution is invalid',
      });

      expect(invalid.success).toBe(false);
    });

    it('rejects substitution with short reason', () => {
      const invalid = timetableSubstitutionCreateSchema.safeParse({
        timetableEntryId: '11111111-1111-1111-1111-111111111111',
        substitutionDate: '2026-11-10',
        originalFacultyId: '22222222-2222-2222-2222-222222222222',
        substituteFacultyId: '33333333-3333-3333-3333-333333333333',
        reason: 'Sick', // less than 5 chars
      });

      expect(invalid.success).toBe(false);
    });
  });

  // 7. Substitution Review Schema
  describe('timetableSubstitutionReviewSchema', () => {
    it('accepts approval or rejection review decision', () => {
      const approved = timetableSubstitutionReviewSchema.safeParse({
        substitutionId: '11111111-1111-1111-1111-111111111111',
        status: 'approved',
        remarks: 'Approved by Vice Principal',
      });

      const rejected = timetableSubstitutionReviewSchema.safeParse({
        substitutionId: '11111111-1111-1111-1111-111111111111',
        status: 'rejected',
        remarks: 'Substitute faculty has a lab session scheduled',
      });

      expect(approved.success).toBe(true);
      expect(rejected.success).toBe(true);
    });
  });
});
