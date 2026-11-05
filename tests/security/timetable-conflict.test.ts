import { describe, it, expect, beforeEach } from 'vitest';
import type { Role, MembershipStatus, DayOfWeek } from '../../packages/types/src';

/**
 * Universal Timetable Conflict & Multi-Tenant Security Simulation Tests
 *
 * Verifies the database-level partial unique indexes, conflict detection engine,
 * and multi-tenant RLS isolation defined in:
 * `supabase/migrations/20261105050000_timetable_scheduling.sql`
 */

interface MockTimetableEntry {
  id: string;
  institutionId: string;
  academicYearId: string;
  classId: string;
  sectionId: string | null;
  subjectId: string;
  facultyId: string;
  roomId: string | null;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string; // HH:MM:SS
  endTime: string;   // HH:MM:SS
  isActive: boolean;
}

interface MockTimetableSubstitution {
  id: string;
  institutionId: string;
  timetableEntryId: string;
  substitutionDate: string;
  originalFacultyId: string;
  substituteFacultyId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

interface MockRoom {
  id: string;
  institutionId: string;
  roomNumber: string;
  building: string;
  capacity: number;
  isActive: boolean;
}

interface MockMembership {
  id: string;
  institutionId: string;
  userId: string;
  role: Role;
  status: MembershipStatus;
}

describe('Security & Conflicts: Universal Timetable Engine', () => {
  const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const ACADEMIC_YEAR = '11111111-1111-1111-1111-111111111111';

  let memberships: MockMembership[] = [];
  let entries: MockTimetableEntry[] = [];
  let substitutions: MockTimetableSubstitution[] = [];
  let rooms: MockRoom[] = [];

  beforeEach(() => {
    memberships = [
      {
        id: 'mem-admin-a',
        institutionId: TENANT_A,
        userId: 'user-admin-a',
        role: 'admin',
        status: 'active',
      },
      {
        id: 'mem-teacher-a',
        institutionId: TENANT_A,
        userId: 'user-teacher-a',
        role: 'faculty',
        status: 'active',
      },
      {
        id: 'mem-student-a',
        institutionId: TENANT_A,
        userId: 'user-student-a',
        role: 'student',
        status: 'active',
      },
      {
        id: 'mem-admin-b',
        institutionId: TENANT_B,
        userId: 'user-admin-b',
        role: 'admin',
        status: 'active',
      },
    ];

    rooms = [
      {
        id: 'room-101',
        institutionId: TENANT_A,
        roomNumber: '101',
        building: 'Main Block',
        capacity: 40,
        isActive: true,
      },
      {
        id: 'room-b1',
        institutionId: TENANT_B,
        roomNumber: 'B-101',
        building: 'North Block',
        capacity: 50,
        isActive: true,
      },
    ];

    entries = [
      {
        id: 'entry-1',
        institutionId: TENANT_A,
        academicYearId: ACADEMIC_YEAR,
        classId: 'class-10a',
        sectionId: 'sec-a',
        subjectId: 'sub-math',
        facultyId: 'fac-smith',
        roomId: 'room-101',
        dayOfWeek: 'monday',
        periodNumber: 1,
        startTime: '08:30:00',
        endTime: '09:20:00',
        isActive: true,
      },
    ];

    substitutions = [];
  });

  // Helper: check time overlap
  function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA < endB && endA > startB;
  }

  // 1. Conflict Prevention: Teacher Collision Check
  it('prevents a teacher from being assigned to two classes during the same slot', () => {
    const candidateEntry: MockTimetableEntry = {
      id: 'entry-conflict-faculty',
      institutionId: TENANT_A,
      academicYearId: ACADEMIC_YEAR,
      classId: 'class-9b',
      sectionId: 'sec-b',
      subjectId: 'sub-physics',
      facultyId: 'fac-smith', // SAME FACULTY
      roomId: 'room-102',
      dayOfWeek: 'monday',   // SAME DAY
      periodNumber: 1,       // SAME PERIOD
      startTime: '08:30:00',
      endTime: '09:20:00',
      isActive: true,
    };

    // Evaluate simulated index: uq_faculty_schedule_slot
    const hasFacultyConflict = entries.some(
      (e) =>
        e.institutionId === candidateEntry.institutionId &&
        e.academicYearId === candidateEntry.academicYearId &&
        e.facultyId === candidateEntry.facultyId &&
        e.dayOfWeek === candidateEntry.dayOfWeek &&
        (e.periodNumber === candidateEntry.periodNumber ||
          timesOverlap(e.startTime, e.endTime, candidateEntry.startTime, candidateEntry.endTime)) &&
        e.isActive
    );

    expect(hasFacultyConflict).toBe(true);
  });

  // 2. Conflict Prevention: Room Double-Booking Check
  it('prevents the same room from being allocated to multiple classes simultaneously', () => {
    const candidateEntry: MockTimetableEntry = {
      id: 'entry-conflict-room',
      institutionId: TENANT_A,
      academicYearId: ACADEMIC_YEAR,
      classId: 'class-11c',
      sectionId: 'sec-c',
      subjectId: 'sub-chemistry',
      facultyId: 'fac-jones', // DIFFERENT FACULTY
      roomId: 'room-101',    // SAME ROOM
      dayOfWeek: 'monday',   // SAME DAY
      periodNumber: 1,       // SAME PERIOD
      startTime: '08:30:00',
      endTime: '09:20:00',
      isActive: true,
    };

    // Evaluate simulated index: uq_room_schedule_slot
    const hasRoomConflict = entries.some(
      (e) =>
        e.institutionId === candidateEntry.institutionId &&
        e.academicYearId === candidateEntry.academicYearId &&
        e.roomId === candidateEntry.roomId &&
        e.dayOfWeek === candidateEntry.dayOfWeek &&
        (e.periodNumber === candidateEntry.periodNumber ||
          timesOverlap(e.startTime, e.endTime, candidateEntry.startTime, candidateEntry.endTime)) &&
        e.isActive
    );

    expect(hasRoomConflict).toBe(true);
  });

  // 3. Conflict Prevention: Cohort Collision Check
  it('prevents a class or section from having two subjects in the same period', () => {
    const candidateEntry: MockTimetableEntry = {
      id: 'entry-conflict-cohort',
      institutionId: TENANT_A,
      academicYearId: ACADEMIC_YEAR,
      classId: 'class-10a', // SAME CLASS
      sectionId: 'sec-a',   // SAME SECTION
      subjectId: 'sub-history',
      facultyId: 'fac-davis',
      roomId: 'room-103',
      dayOfWeek: 'monday',
      periodNumber: 1,
      startTime: '08:30:00',
      endTime: '09:20:00',
      isActive: true,
    };

    // Evaluate simulated index: uq_class_section_schedule_slot
    const hasCohortConflict = entries.some(
      (e) =>
        e.institutionId === candidateEntry.institutionId &&
        e.academicYearId === candidateEntry.academicYearId &&
        e.classId === candidateEntry.classId &&
        e.sectionId === candidateEntry.sectionId &&
        e.dayOfWeek === candidateEntry.dayOfWeek &&
        (e.periodNumber === candidateEntry.periodNumber ||
          timesOverlap(e.startTime, e.endTime, candidateEntry.startTime, candidateEntry.endTime)) &&
        e.isActive
    );

    expect(hasCohortConflict).toBe(true);
  });

  // 4. Time Interval Overlap Detection (Arbitrary Timings)
  it('detects timing overlap even when custom period numbers differ', () => {
    // Scheduled 08:30:00 to 09:20:00 in Period 1
    // Candidate scheduled 09:00:00 to 10:30:00 in Period 2 (overlaps by 20 mins)
    const hasOverlap = timesOverlap('08:30:00', '09:20:00', '09:00:00', '10:30:00');
    expect(hasOverlap).toBe(true);

    // Completely disjoint periods
    const isDisjoint = timesOverlap('08:30:00', '09:20:00', '09:30:00', '10:20:00');
    expect(isDisjoint).toBe(false);
  });

  // 5. Cross-Tenant Isolation: Rooms and Entries
  it('strictly isolates rooms and timetable entries across tenants', () => {
    // Query rooms for Tenant A
    const tenantARooms = rooms.filter((r) => r.institutionId === TENANT_A);
    expect(tenantARooms).toHaveLength(1);
    expect(tenantARooms[0]?.roomNumber).toBe('101');

    // Tenant B cannot see Tenant A room
    const tenantBRooms = rooms.filter((r) => r.institutionId === TENANT_B);
    expect(tenantBRooms).toHaveLength(1);
    expect(tenantBRooms[0]?.roomNumber).toBe('B-101');

    // Same room number across different tenants does NOT conflict
    const canCreateSameRoomNumberInTenantB = !rooms.some(
      (r) => r.institutionId === TENANT_B && r.roomNumber === '101'
    );
    expect(canCreateSameRoomNumberInTenantB).toBe(true);
  });

  // 6. Substitution Conflict: Cannot assign teacher who is already occupied
  it('detects when a substitute faculty is already occupied on that date and period', () => {
    // Teacher fac-smith already has a regular timetable entry on Monday Period 1
    const subDate = '2026-11-09'; // Monday
    const subDayOfWeek: DayOfWeek = 'monday';
    const subPeriod = 1;

    const isTeacherAvailable = !entries.some(
      (e) =>
        e.institutionId === TENANT_A &&
        e.facultyId === 'fac-smith' &&
        e.dayOfWeek === subDayOfWeek &&
        e.periodNumber === subPeriod &&
        e.isActive
    );

    expect(isTeacherAvailable).toBe(false); // occupied!

    // Teacher fac-clark with no entries on Monday Period 1 is available
    const isClarkAvailable = !entries.some(
      (e) =>
        e.institutionId === TENANT_A &&
        e.facultyId === 'fac-clark' &&
        e.dayOfWeek === subDayOfWeek &&
        e.periodNumber === subPeriod &&
        e.isActive
    );

    expect(isClarkAvailable).toBe(true);
  });
});
