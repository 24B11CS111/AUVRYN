/**
 * @edu-platform/types
 * Core domain types for multi-institution education management SaaS.
 */

// ==========================================
// 1. Institution Types & Metadata
// ==========================================

export type InstitutionType =
  | 'school'
  | 'junior_college'
  | 'degree_college'
  | 'engineering_college'
  | 'university';

export type InstitutionStatus =
  | 'active'
  | 'pending_verification'
  | 'suspended'
  | 'archived';

export interface InstitutionSettings {
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  gradingSystem?: 'percentage' | 'gpa_4' | 'gpa_10' | 'letter';
  academicTermType?: 'semester' | 'trimester' | 'annual';
  allowSelfRegistration?: boolean;
  featuresEnabled?: string[];
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  code: string;
  type: InstitutionType;
  status: InstitutionStatus;
  logoUrl?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  settings: InstitutionSettings;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionTypeDefinition {
  type: InstitutionType;
  label: string;
  description: string;
  departmentLabel: string; // e.g. "Grades / Divisions", "Streams", "Departments", "Faculties"
  cohortLabel: string;     // e.g. "Class / Section", "Batch", "Branch", "Course"
  defaultTermType: 'semester' | 'trimester' | 'annual';
  icon: string;
}

export const INSTITUTION_TYPE_DEFINITIONS: Record<InstitutionType, InstitutionTypeDefinition> = {
  school: {
    type: 'school',
    label: 'K-12 School',
    description: 'Primary, middle, and high schools following national or international boards.',
    departmentLabel: 'Grade Levels / Wings',
    cohortLabel: 'Classes & Sections',
    defaultTermType: 'annual',
    icon: 'GraduationCap',
  },
  junior_college: {
    type: 'junior_college',
    label: 'Junior College / Pre-University',
    description: 'Higher secondary institutions (11th & 12th / +2 / Intermediate) preparing students for universities.',
    departmentLabel: 'Streams',
    cohortLabel: 'Batches & Groups',
    defaultTermType: 'annual',
    icon: 'BookOpen',
  },
  degree_college: {
    type: 'degree_college',
    label: 'Degree College',
    description: 'Undergraduate and postgraduate colleges offering liberal arts, science, and commerce degrees.',
    departmentLabel: 'Departments',
    cohortLabel: 'Programs & Semesters',
    defaultTermType: 'semester',
    icon: 'Building2',
  },
  engineering_college: {
    type: 'engineering_college',
    label: 'Engineering / Technical College',
    description: 'Institutions specializing in technical, engineering, and polytechnic disciplines with lab tracks.',
    departmentLabel: 'Engineering Departments',
    cohortLabel: 'Branches & Batches',
    defaultTermType: 'semester',
    icon: 'Cpu',
  },
  university: {
    type: 'university',
    label: 'University / Multiversity',
    description: 'Large multi-faculty institutions managing multiple constituent colleges, schools, and research centers.',
    departmentLabel: 'Schools & Faculties',
    cohortLabel: 'Degrees & Cohorts',
    defaultTermType: 'semester',
    icon: 'Landmark',
  },
};

// ==========================================
// 2. User Profile & Identity
// ==========================================

export interface Profile {
  id: string; // corresponds to auth.users.id
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 3. Roles, Permissions & Membership
// ==========================================

export type Role =
  | 'owner'
  | 'admin'
  | 'hr_administrator'
  | 'academic_admin'
  | 'department_head'
  | 'admissions_officer'
  | 'faculty'
  | 'staff'
  | 'accountant'
  | 'student'
  | 'parent';

export type MembershipStatus =
  | 'active'
  | 'invited'
  | 'suspended'
  | 'revoked';

export type Permission =
  | 'institution:manage'
  | 'institution:view'
  | 'members:manage'
  | 'members:view'
  | 'campuses:manage'
  | 'campuses:view'
  | 'academics:manage'
  | 'academics:view'
  | 'students:manage'
  | 'students:view'
  | 'guardians:manage'
  | 'guardians:view'
  | 'admissions:manage'
  | 'admissions:view'
  | 'staff:manage'
  | 'staff:view'
  | 'faculty:assign'
  | 'invitations:manage'
  | 'invitations:view'
  | 'documents:manage'
  | 'documents:verify'
  | 'audit:view'
  | 'billing:manage'
  | 'attendance:mark'
  | 'attendance:view'
  | 'attendance:correct'
  | 'attendance:reports'
  | 'leaves:apply'
  | 'leaves:approve'
  | 'leaves:view'
  | 'timetable:manage'
  | 'timetable:view'
  | 'timetable:substitute'
  | 'rooms:manage'
  | 'rooms:view'
  | 'exams:manage'
  | 'exams:view'
  | 'marks:enter'
  | 'marks:verify'
  | 'results:publish'
  | 'results:view'
  | 'grading:manage'
  | 'revaluation:apply'
  | 'revaluation:review'
  | 'fees:manage'
  | 'fees:view'
  | 'fees:assign'
  | 'fees:collect'
  | 'fees:concession_apply'
  | 'fees:concession_approve'
  | 'fees:refund_request'
  | 'fees:refund_approve'
  | 'fees:reports_view'
  | 'receipts:view'
  | 'communications:manage'
  | 'announcements:publish'
  | 'announcements:view'
  | 'messages:send'
  | 'messages:moderate'
  | 'homework:manage'
  | 'homework:submit'
  | 'homework:grade'
  | 'notifications:manage';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'institution:manage',
    'institution:view',
    'members:manage',
    'members:view',
    'campuses:manage',
    'campuses:view',
    'academics:manage',
    'academics:view',
    'students:manage',
    'students:view',
    'guardians:manage',
    'guardians:view',
    'admissions:manage',
    'admissions:view',
    'staff:manage',
    'staff:view',
    'faculty:assign',
    'invitations:manage',
    'invitations:view',
    'documents:manage',
    'documents:verify',
    'audit:view',
    'billing:manage',
    'attendance:mark',
    'attendance:view',
    'attendance:correct',
    'attendance:reports',
    'leaves:apply',
    'leaves:approve',
    'leaves:view',
    'timetable:manage',
    'timetable:view',
    'timetable:substitute',
    'rooms:manage',
    'rooms:view',
    'exams:manage',
    'exams:view',
    'marks:enter',
    'marks:verify',
    'results:publish',
    'results:view',
    'grading:manage',
    'revaluation:apply',
    'revaluation:review',
    'fees:manage',
    'fees:view',
    'fees:assign',
    'fees:collect',
    'fees:concession_apply',
    'fees:concession_approve',
    'fees:refund_request',
    'fees:refund_approve',
    'fees:reports_view',
    'receipts:view',
    'communications:manage',
    'announcements:publish',
    'announcements:view',
    'messages:send',
    'messages:moderate',
    'homework:manage',
    'homework:submit',
    'homework:grade',
    'notifications:manage',
  ],
  admin: [
    'institution:manage',
    'institution:view',
    'members:manage',
    'members:view',
    'campuses:manage',
    'campuses:view',
    'academics:manage',
    'academics:view',
    'students:manage',
    'students:view',
    'guardians:manage',
    'guardians:view',
    'admissions:manage',
    'admissions:view',
    'staff:manage',
    'staff:view',
    'faculty:assign',
    'invitations:manage',
    'invitations:view',
    'documents:manage',
    'documents:verify',
    'audit:view',
    'attendance:mark',
    'attendance:view',
    'attendance:correct',
    'attendance:reports',
    'leaves:apply',
    'leaves:approve',
    'leaves:view',
    'timetable:manage',
    'timetable:view',
    'timetable:substitute',
    'rooms:manage',
    'rooms:view',
    'exams:manage',
    'exams:view',
    'marks:enter',
    'marks:verify',
    'results:publish',
    'results:view',
    'grading:manage',
    'revaluation:apply',
    'revaluation:review',
    'fees:manage',
    'fees:view',
    'fees:assign',
    'fees:collect',
    'fees:concession_apply',
    'fees:concession_approve',
    'fees:refund_request',
    'fees:refund_approve',
    'fees:reports_view',
    'receipts:view',
    'communications:manage',
    'announcements:publish',
    'announcements:view',
    'messages:send',
    'messages:moderate',
    'homework:manage',
    'homework:submit',
    'homework:grade',
    'notifications:manage',
  ],
  hr_administrator: [
    'institution:view',
    'members:manage',
    'members:view',
    'campuses:view',
    'staff:manage',
    'staff:view',
    'invitations:manage',
    'invitations:view',
    'documents:manage',
    'documents:verify',
    'students:view',
    'attendance:view',
    'attendance:correct',
    'attendance:reports',
    'leaves:apply',
    'leaves:approve',
    'leaves:view',
    'timetable:view',
    'exams:view',
    'announcements:view',
    'messages:send',
    'notifications:manage',
  ],
  academic_admin: [
    'institution:view',
    'members:view',
    'campuses:view',
    'academics:manage',
    'academics:view',
    'students:manage',
    'students:view',
    'guardians:view',
    'staff:view',
    'faculty:assign',
    'attendance:mark',
    'attendance:view',
    'attendance:correct',
    'attendance:reports',
    'leaves:apply',
    'leaves:approve',
    'leaves:view',
    'timetable:manage',
    'timetable:view',
    'timetable:substitute',
    'rooms:manage',
    'rooms:view',
    'exams:manage',
    'exams:view',
    'marks:enter',
    'marks:verify',
    'results:publish',
    'results:view',
    'grading:manage',
    'revaluation:apply',
    'revaluation:review',
    'fees:view',
    'fees:assign',
    'fees:concession_apply',
    'fees:reports_view',
    'receipts:view',
    'communications:manage',
    'announcements:publish',
    'announcements:view',
    'messages:send',
    'messages:moderate',
    'homework:manage',
    'homework:grade',
    'notifications:manage',
  ],
  department_head: [
    'institution:view',
    'members:view',
    'campuses:view',
    'academics:view',
    'students:view',
    'guardians:view',
    'staff:view',
    'faculty:assign',
    'attendance:mark',
    'attendance:view',
    'attendance:correct',
    'attendance:reports',
    'leaves:apply',
    'leaves:approve',
    'leaves:view',
    'timetable:manage',
    'timetable:view',
    'timetable:substitute',
    'rooms:view',
    'exams:manage',
    'exams:view',
    'marks:enter',
    'marks:verify',
    'results:publish',
    'results:view',
    'grading:manage',
    'revaluation:review',
    'fees:view',
    'communications:manage',
    'announcements:publish',
    'announcements:view',
    'messages:send',
    'messages:moderate',
    'homework:manage',
    'homework:grade',
    'notifications:manage',
  ],
  admissions_officer: [
    'institution:view',
    'members:view',
    'campuses:view',
    'academics:view',
    'students:manage',
    'students:view',
    'guardians:manage',
    'guardians:view',
    'admissions:manage',
    'admissions:view',
    'documents:manage',
    'documents:verify',
    'attendance:view',
    'leaves:apply',
    'leaves:view',
    'timetable:view',
    'rooms:view',
    'exams:view',
    'results:view',
    'fees:view',
    'receipts:view',
    'announcements:view',
    'messages:send',
  ],
  faculty: [
    'institution:view',
    'members:view',
    'campuses:view',
    'academics:view',
    'students:view',
    'guardians:view',
    'staff:view',
    'attendance:mark',
    'attendance:view',
    'attendance:correct',
    'attendance:reports',
    'leaves:apply',
    'leaves:view',
    'timetable:view',
    'timetable:substitute',
    'rooms:view',
    'exams:view',
    'marks:enter',
    'results:view',
    'revaluation:review',
    'announcements:view',
    'messages:send',
    'homework:manage',
    'homework:grade',
  ],
  staff: [
    'institution:view',
    'campuses:view',
    'students:view',
    'staff:view',
    'attendance:view',
    'leaves:apply',
    'leaves:view',
    'timetable:view',
    'rooms:view',
    'exams:view',
    'results:view',
    'announcements:view',
    'messages:send',
  ],
  accountant: [
    'institution:view',
    'students:view',
    'staff:view',
    'billing:manage',
    'attendance:view',
    'attendance:reports',
    'leaves:apply',
    'leaves:view',
    'timetable:view',
    'exams:view',
    'results:view',
    'revaluation:apply',
    'fees:view',
    'fees:collect',
    'fees:concession_apply',
    'fees:refund_request',
    'fees:reports_view',
    'receipts:view',
    'announcements:view',
    'messages:send',
  ],
  student: [
    'institution:view',
    'academics:view',
    'students:view',
    'attendance:view',
    'leaves:apply',
    'leaves:view',
    'timetable:view',
    'exams:view',
    'results:view',
    'revaluation:apply',
    'fees:view',
    'receipts:view',
    'fees:concession_apply',
    'fees:refund_request',
    'announcements:view',
    'messages:send',
    'homework:submit',
  ],
  parent: [
    'institution:view',
    'academics:view',
    'students:view',
    'guardians:view',
    'attendance:view',
    'leaves:apply',
    'leaves:view',
    'timetable:view',
    'exams:view',
    'results:view',
    'revaluation:apply',
    'fees:view',
    'receipts:view',
    'fees:concession_apply',
    'fees:refund_request',
    'announcements:view',
    'messages:send',
    'homework:manage',
  ],
};

export interface InstitutionMembership {
  id: string;
  institutionId: string;
  userId: string;
  role: Role;
  permissions?: Permission[];
  status: MembershipStatus;
  title?: string | null;
  department?: string | null;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  // Join extensions
  institution?: Institution;
  profile?: Profile;
}

// ==========================================
// 4. Campuses & Academic Years
// ==========================================

export interface Campus {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  isPrimary: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicTerm {
  id: string;
  academicYearId: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface AcademicYear {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  termSystem: 'semester' | 'trimester' | 'annual';
  createdAt: string;
  updatedAt: string;
  terms?: AcademicTerm[];
}

// ==========================================
// 5. Academic Hierarchy & Structure (Milestone 2)
// ==========================================

export type AcademicRecordStatus = 'active' | 'inactive' | 'archived';

export type AcademicLevelType =
  | 'primary'
  | 'middle_school'
  | 'secondary'
  | 'higher_secondary'
  | 'diploma'
  | 'undergraduate'
  | 'postgraduate'
  | 'doctoral';

export type SubjectCategoryType =
  | 'theory'
  | 'practical'
  | 'lab'
  | 'elective'
  | 'vocational'
  | 'project';

export interface AcademicDepartment {
  id: string;
  institutionId: string;
  campusId?: string | null;
  parentDepartmentId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  headProfileId?: string | null;
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  headProfile?: Profile | null;
  campus?: Campus | null;
  parentDepartment?: AcademicDepartment | null;
}

export interface AcademicProgram {
  id: string;
  institutionId: string;
  departmentId?: string | null;
  campusId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  level: AcademicLevelType;
  durationYears: number;
  termSystem: 'semester' | 'trimester' | 'annual';
  totalTerms: number;
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  department?: AcademicDepartment | null;
  campus?: Campus | null;
}

export interface AcademicClass {
  id: string;
  institutionId: string;
  programId: string;
  academicYearId: string;
  campusId?: string | null;
  name: string;
  code: string;
  levelNumber: number;
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  program?: AcademicProgram | null;
  academicYear?: AcademicYear | null;
  campus?: Campus | null;
  sectionsCount?: number;
}

export interface AcademicSection {
  id: string;
  institutionId: string;
  classId: string;
  campusId?: string | null;
  name: string;
  code: string;
  capacity: number;
  roomNumber?: string | null;
  classTeacherProfileId?: string | null;
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  academicClass?: AcademicClass | null;
  classTeacher?: Profile | null;
  campus?: Campus | null;
}

export interface AcademicSubject {
  id: string;
  institutionId: string;
  departmentId?: string | null;
  name: string;
  code: string;
  subjectType: SubjectCategoryType;
  creditHours: number;
  description?: string | null;
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  department?: AcademicDepartment | null;
}

export interface AcademicClassSubject {
  id: string;
  institutionId: string;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  termId?: string | null;
  facultyProfileId?: string | null;
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  academicClass?: AcademicClass | null;
  section?: AcademicSection | null;
  subject?: AcademicSubject | null;
  term?: AcademicTerm | null;
  faculty?: Profile | null;
}

export interface AcademicTerminology {
  departmentTitle: string;
  departmentDescription: string;
  programTitle: string;
  programDescription: string;
  classTitle: string;
  classDescription: string;
  sectionTitle: string;
  sectionDescription: string;
  teacherTitle: string;
  subjectTitle: string;
}

export function getAcademicTerminology(type: InstitutionType): AcademicTerminology {
  switch (type) {
    case 'school':
      return {
        departmentTitle: 'Academic Wings',
        departmentDescription: 'Organizational levels such as Primary, Middle, and Senior Wing',
        programTitle: 'Curriculum Tracks',
        programDescription: 'Educational boards and curricula (e.g. CBSE, ICSE, Cambridge)',
        classTitle: 'Grades & Classes',
        classDescription: 'Standard grade levels (e.g. Grade 1 through Grade 12)',
        sectionTitle: 'Sections',
        sectionDescription: 'Classroom divisions (e.g. Section A, Section B)',
        teacherTitle: 'Class Teacher',
        subjectTitle: 'Subjects',
      };
    case 'junior_college':
      return {
        departmentTitle: 'Academic Streams',
        departmentDescription: 'Pre-university streams (e.g. Science, Commerce, Arts)',
        programTitle: 'Stream Groups',
        programDescription: 'Specialized subject combinations (e.g. MPC, BiPC, MEC, CEC)',
        classTitle: 'Year Batches',
        classDescription: 'Intermediate cohorts (e.g. 1st Year, 2nd Year)',
        sectionTitle: 'Groups & Sections',
        sectionDescription: 'Batch subdivisions and study cohorts',
        teacherTitle: 'Stream Mentor / Class Teacher',
        subjectTitle: 'Stream Subjects',
      };
    case 'degree_college':
      return {
        departmentTitle: 'Academic Departments',
        departmentDescription: 'Discipline departments (e.g. Computer Science, Commerce, Physics)',
        programTitle: 'Degree Programs',
        programDescription: 'Undergraduate and postgraduate degrees (e.g. B.Sc, B.Com, M.Sc)',
        classTitle: 'Batches & Years',
        classDescription: 'Annual student cohorts and academic years',
        sectionTitle: 'Sections & Divisions',
        sectionDescription: 'Class lecture divisions and tutorial groups',
        teacherTitle: 'Faculty Mentor / Advisor',
        subjectTitle: 'Courses & Papers',
      };
    case 'engineering_college':
      return {
        departmentTitle: 'Engineering Departments',
        departmentDescription: 'Core departments (e.g. CSE, ECE, Mechanical, Civil)',
        programTitle: 'Branches & Degrees',
        programDescription: 'Technical engineering programs (e.g. B.Tech CSE, M.Tech VLSI)',
        classTitle: 'Batches & Semesters',
        classDescription: 'Engineering cohort years and current semester classes',
        sectionTitle: 'Sections & Lab Batches',
        sectionDescription: 'Lecture sections and laboratory practical groups',
        teacherTitle: 'Faculty Proctor / Advisor',
        subjectTitle: 'Course Modules & Labs',
      };
    case 'university':
    default:
      return {
        departmentTitle: 'Schools & Faculties',
        departmentDescription: 'Constituent schools and faculties (e.g. School of Computing, Faculty of Law)',
        programTitle: 'Academic Programs',
        programDescription: 'Conferred degrees and specialized graduate programs',
        classTitle: 'Degree Cohorts',
        classDescription: 'Enrolled matriculation cohorts across academic years',
        sectionTitle: 'Cohort Sections',
        sectionDescription: 'Instructional divisions and research groups',
        teacherTitle: 'Faculty Advisor',
        subjectTitle: 'Credit Courses',
      };
  }
}

// ==========================================
// 6. Student & Admissions Management (Milestone 3)
// ==========================================

export type StudentStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'alumni'
  | 'withdrawn'
  | 'transferred';

export type StudentGender =
  | 'male'
  | 'female'
  | 'other'
  | 'prefer_not_to_say';

export type EnrollmentStatus =
  | 'enrolled'
  | 'promoted'
  | 'retained'
  | 'transferred'
  | 'graduated'
  | 'dropped';

export type DocumentType =
  | 'photo'
  | 'birth_certificate'
  | 'previous_record'
  | 'transfer_certificate'
  | 'national_id'
  | 'medical_record'
  | 'other';

export type DocumentVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected';

export type AdmissionStatus =
  | 'submitted'
  | 'received'
  | 'documents_pending'
  | 'under_verification'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'confirmed'
  | 'enrolled';

export interface Student {
  id: string;
  institutionId: string;
  admissionNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: StudentGender;
  bloodGroup?: string | null;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  nationality: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  status: StudentStatus;
  dateOfJoining: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  currentEnrollment?: StudentEnrollment | null;
  guardians?: StudentGuardianJoin[];
}

export interface Guardian {
  id: string;
  institutionId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  relationshipDefault?: string | null;
  occupation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface StudentGuardian {
  id: string;
  institutionId: string;
  studentId: string;
  guardianId: string;
  relationship: string;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  createdAt: string;
}

export interface StudentGuardianJoin extends StudentGuardian {
  guardian?: Guardian;
}

export interface StudentEnrollment {
  id: string;
  institutionId: string;
  studentId: string;
  campusId?: string | null;
  academicYearId: string;
  programId: string;
  classId: string;
  sectionId?: string | null;
  rollNumber?: string | null;
  status: EnrollmentStatus;
  enrollmentDate: string;
  exitDate?: string | null;
  exitReason?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  campus?: Campus | null;
  academicYear?: AcademicYear | null;
  program?: AcademicProgram | null;
  academicClass?: AcademicClass | null;
  section?: AcademicSection | null;
}

export interface StudentDocument {
  id: string;
  institutionId: string;
  studentId?: string | null;
  applicationId?: string | null;
  documentType: DocumentType;
  title: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  verificationStatus: DocumentVerificationStatus;
  verificationNotes?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: string | null;
}

export interface AdmissionApplication {
  id: string;
  institutionId: string;
  applicationNumber: string;
  campusId?: string | null;
  academicYearId: string;
  programId: string;
  classId?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: StudentGender;
  bloodGroup?: string | null;
  email?: string | null;
  phone: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  nationality: string;
  previousSchoolName?: string | null;
  previousGradeOrScore?: string | null;
  primaryGuardianName: string;
  primaryGuardianRelationship: string;
  primaryGuardianPhone: string;
  primaryGuardianEmail?: string | null;
  primaryGuardianOccupation?: string | null;
  secondaryGuardianName?: string | null;
  secondaryGuardianRelationship?: string | null;
  secondaryGuardianPhone?: string | null;
  secondaryGuardianEmail?: string | null;
  status: AdmissionStatus;
  internalRemarks?: string | null;
  convertedStudentId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  campus?: Campus | null;
  academicYear?: AcademicYear | null;
  program?: AcademicProgram | null;
  academicClass?: AcademicClass | null;
  documents?: StudentDocument[];
}

export interface AdmissionStatusHistory {
  id: string;
  applicationId: string;
  fromStatus?: AdmissionStatus | null;
  toStatus: AdmissionStatus;
  remarks?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

// ==========================================
// 7. Audit Logging
// ==========================================

export interface AuditLog {
  id: string;
  institutionId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actorProfile?: Profile | null;
}

// ==========================================
// 8. User Session & Multi-Tenancy Context
// ==========================================

export interface UserSessionContext {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
  memberships: InstitutionMembership[];
  activeInstitutionId: string | null;
  activeMembership: InstitutionMembership | null;
}

// ==========================================
// 9. Staff & Faculty Management (Milestone 4)
// ==========================================

export type StaffCategory =
  | 'teaching'
  | 'non_teaching'
  | 'administrative'
  | 'technical'
  | 'transport'
  | 'support';

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'adjunct'
  | 'visiting';

export type EmploymentStatus =
  | 'active'
  | 'probation'
  | 'notice_period'
  | 'suspended'
  | 'terminated'
  | 'resigned'
  | 'retired';

export type StaffDocumentType =
  | 'qualification'
  | 'experience'
  | 'identity'
  | 'contract'
  | 'appointment_letter'
  | 'other';

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'revoked';

export interface StaffProfile {
  id: string;
  institutionId: string;
  employeeId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  photoUrl?: string | null;
  dateOfBirth: string;
  gender: StudentGender;
  email: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  joiningDate: string;
  staffCategory: StaffCategory;
  designation: string;
  departmentId?: string | null;
  campusId?: string | null;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  qualification?: string | null;
  yearsOfExperience?: number;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Relational Joins
  department?: AcademicDepartment | null;
  campus?: Campus | null;
  userProfile?: Profile | null;
  employments?: StaffEmployment[];
  allocations?: FacultyAllocation[];
  documents?: StaffDocument[];
}

export interface StaffEmployment {
  id: string;
  institutionId: string;
  staffId: string;
  campusId?: string | null;
  departmentId?: string | null;
  designation: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  startDate: string;
  endDate?: string | null;
  reportingManagerId?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  campus?: Campus | null;
  department?: AcademicDepartment | null;
  reportingManager?: StaffProfile | null;
}

export interface FacultyAllocation {
  id: string;
  institutionId: string;
  staffId: string;
  academicYearId: string;
  programId: string;
  classId?: string | null;
  sectionId?: string | null;
  subjectId?: string | null;
  isClassTeacher: boolean;
  isCoordinator: boolean;
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  staff?: StaffProfile;
  academicYear?: AcademicYear;
  program?: AcademicProgram;
  academicClass?: AcademicClass | null;
  section?: AcademicSection | null;
  subject?: AcademicSubject | null;
}

export interface StaffDocument {
  id: string;
  institutionId: string;
  staffId: string;
  documentType: StaffDocumentType;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  verificationStatus: DocumentVerificationStatus;
  verificationNotes?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffInvitation {
  id: string;
  institutionId: string;
  staffId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  departmentId?: string | null;
  campusId?: string | null;
  invitationToken: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string | null;
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
  // Joins
  department?: AcademicDepartment | null;
  campus?: Campus | null;
  staff?: StaffProfile | null;
  inviter?: Profile | null;
}

// ==========================================
// 9. Universal Attendance & Leave Management (Milestone 5)
// ==========================================

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'excused'
  | 'on_leave';

export type AttendanceSessionType =
  | 'daily'
  | 'lecture'
  | 'lab'
  | 'practical'
  | 'tutorial';

export type AttendanceSessionStatus =
  | 'draft'
  | 'submitted'
  | 'locked';

export type StaffAttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'on_leave'
  | 'excused';

export type LeaveApplicantType =
  | 'student'
  | 'staff';

export type LeaveType =
  | 'casual'
  | 'sick'
  | 'medical'
  | 'academic'
  | 'bereavement'
  | 'maternity'
  | 'emergency'
  | 'other';

export type LeaveStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type NotificationDeliveryStatus =
  | 'pending'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'cancelled';

export interface LeaveRequest {
  id: string;
  institutionId: string;
  applicantType: LeaveApplicantType;
  studentId?: string | null;
  staffId?: string | null;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  supportingDocumentUrl?: string | null;
  status: LeaveStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  student?: Student;
  staff?: StaffProfile;
  reviewer?: Profile;
}

export interface AttendanceSession {
  id: string;
  institutionId: string;
  academicYearId: string;
  campusId?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId?: string | null;
  sessionDate: string;
  sessionType: AttendanceSessionType;
  periodNumber?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  topicCovered?: string | null;
  markedByStaffId?: string | null;
  status: AttendanceSessionStatus;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  excusedCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  academicYear?: AcademicYear;
  campus?: Campus | null;
  academicClass?: AcademicClass;
  section?: AcademicSection | null;
  subject?: AcademicSubject | null;
  markedByStaff?: StaffProfile | null;
}

export interface StudentAttendanceRecord {
  id: string;
  institutionId: string;
  sessionId: string;
  studentId: string;
  enrollmentId?: string | null;
  status: AttendanceStatus;
  remarks?: string | null;
  isExcused: boolean;
  leaveRequestId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  student?: Student;
  session?: AttendanceSession;
  enrollment?: StudentEnrollment;
  leaveRequest?: LeaveRequest;
}

export interface AttendanceCorrection {
  id: string;
  institutionId: string;
  recordId: string;
  sessionId: string;
  studentId: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  correctedBy: string;
  correctedAt: string;
  // Joins
  corrector?: Profile;
  student?: Student;
}

export interface StaffAttendanceRecord {
  id: string;
  institutionId: string;
  staffId: string;
  attendanceDate: string;
  status: StaffAttendanceStatus;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  remarks?: string | null;
  leaveRequestId?: string | null;
  markedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  staff?: StaffProfile;
  leaveRequest?: LeaveRequest;
  marker?: Profile;
}

export interface StaffAttendanceCorrection {
  id: string;
  institutionId: string;
  recordId: string;
  staffId: string;
  previousStatus: StaffAttendanceStatus;
  newStatus: StaffAttendanceStatus;
  reason: string;
  correctedBy: string;
  correctedAt: string;
  // Joins
  corrector?: Profile;
  staff?: StaffProfile;
}

export interface AttendanceNotification {
  id: string;
  institutionId: string;
  sessionId: string;
  recordId: string;
  studentId: string;
  guardianId: string;
  channel: string;
  status: NotificationDeliveryStatus;
  title: string;
  message: string;
  deliveryError?: string | null;
  sentAt?: string | null;
  createdAt: string;
  // Joins
  student?: Student;
  guardian?: Guardian;
}

export interface AttendanceOverviewStats {
  date: string;
  totalSessions: number;
  totalStudentsRecorded: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  excusedCount: number;
  attendancePercentage: number;
  staffTotal: number;
  staffPresent: number;
  staffAbsent: number;
  staffOnLeave: number;
}

export interface ClassAttendanceSummary {
  classId: string;
  className: string;
  sectionId?: string | null;
  sectionName?: string | null;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
}

export interface StudentAttendanceMetric {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  className: string;
  sectionName?: string | null;
  totalSessions: number;
  attendedSessions: number; // Present + Late + (HalfDay * 0.5)
  absentSessions: number;
  attendancePercentage: number;
  isShortage: boolean; // < 75%
}

// ==========================================
// 8. Timetable & Scheduling Models (Milestone 6)
// ==========================================

export type RoomType =
  | 'classroom'
  | 'laboratory'
  | 'seminar_hall'
  | 'auditorium'
  | 'computer_lab'
  | 'library'
  | 'workshop'
  | 'other';

export type TimetableSessionType =
  | 'theory'
  | 'practical'
  | 'laboratory'
  | 'tutorial'
  | 'seminar';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type TimetableBreakType =
  | 'none'
  | 'short_break'
  | 'lunch'
  | 'assembly'
  | 'recess';

export type SessionSlot =
  | 'morning'
  | 'afternoon'
  | 'evening';

export type SubstitutionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type ScheduleChangeType =
  | 'substitution'
  | 'rescheduled'
  | 'cancelled'
  | 'room_change'
  | 'general';

export type ScheduleNotificationRecipient =
  | 'student'
  | 'faculty'
  | 'guardian'
  | 'class'
  | 'institution';

export interface Room {
  id: string;
  institutionId: string;
  campusId?: string | null;
  roomNumber: string;
  name?: string | null;
  building: string;
  floor?: string | null;
  roomType: RoomType;
  capacity: number;
  facilities: string[];
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  campus?: Campus;
}

export interface TimetableStructure {
  id: string;
  institutionId: string;
  academicYearId: string;
  campusId?: string | null;
  programId?: string | null;
  name: string;
  description?: string | null;
  workingDays: DayOfWeek[];
  startTime: string; // HH:MM:SS
  endTime: string;   // HH:MM:SS
  periodsPerDay: number;
  isDefault: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  academicYear?: AcademicYear;
  campus?: Campus;
  program?: AcademicProgram;
  periods?: TimetablePeriod[];
}

export interface TimetablePeriod {
  id: string;
  institutionId: string;
  structureId: string;
  periodNumber: number;
  name: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakType: TimetableBreakType;
  sessionSlot: SessionSlot;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEntry {
  id: string;
  institutionId: string;
  academicYearId: string;
  campusId?: string | null;
  structureId?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  facultyId: string;
  roomId?: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  periodNumber: number;
  sessionType: TimetableSessionType;
  effectiveStartDate: string;
  effectiveEndDate?: string | null;
  isActive: boolean;
  colorCode?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  academicYear?: AcademicYear;
  campus?: Campus;
  academicClass?: AcademicClass;
  academicSection?: AcademicSection;
  subject?: AcademicSubject;
  faculty?: StaffProfile;
  room?: Room;
}

export interface TimetableSubstitution {
  id: string;
  institutionId: string;
  timetableEntryId: string;
  substitutionDate: string;
  originalFacultyId: string;
  substituteFacultyId: string;
  reason: string;
  status: SubstitutionStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  timetableEntry?: TimetableEntry;
  originalFaculty?: StaffProfile;
  substituteFaculty?: StaffProfile;
  approver?: Profile;
}

export interface ScheduleNotification {
  id: string;
  institutionId: string;
  recipientType: ScheduleNotificationRecipient;
  recipientId?: string | null;
  timetableEntryId?: string | null;
  substitutionId?: string | null;
  title: string;
  message: string;
  changeType: ScheduleChangeType;
  effectiveDate?: string | null;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  createdBy?: string | null;
}

export interface TimetableConflict {
  type: 'faculty_conflict' | 'room_conflict' | 'class_conflict' | 'timing_conflict';
  conflictingEntryId?: string;
  message: string;
}

export interface TimetableConflictReport {
  hasConflict: boolean;
  conflicts: TimetableConflict[];
}

export interface TimetableGridCell {
  periodNumber: number;
  periodName: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakType?: TimetableBreakType;
  entries: TimetableEntry[];
  substitutions?: TimetableSubstitution[];
}

export interface WeeklyTimetableDay {
  dayOfWeek: DayOfWeek;
  dayLabel: string;
  slots: TimetableGridCell[];
}

// ==========================================
// 9. Examination & Results Management (Milestone 7)
// ==========================================

export type ExamType =
  | 'internal_assessment'
  | 'unit_test'
  | 'midterm'
  | 'semester_exam'
  | 'annual_exam'
  | 'practical_exam'
  | 'laboratory_exam'
  | 'assignment'
  | 'project'
  | 'viva'
  | 'final_exam';

export type ExamStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'published'
  | 'cancelled';

export type ExamPublicationStatus =
  | 'unpublished'
  | 'under_review'
  | 'published'
  | 'withdrawn';

export type AssessmentType =
  | 'theory'
  | 'practical'
  | 'laboratory'
  | 'internal_assessment'
  | 'external_assessment'
  | 'viva'
  | 'project';

export type ExamSubjectStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled';

export type GradingCalculationType =
  | 'gpa_10_point'
  | 'gpa_4_point'
  | 'letter_grade_percentage'
  | 'marks_based'
  | 'pass_fail';

export type MarksEntryStatus =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'locked';

export type ExamResultStatus =
  | 'pass'
  | 'fail'
  | 'distinction'
  | 'promoted_with_backlog'
  | 'withheld';

export type RevaluationStatus =
  | 'applied'
  | 'assigned'
  | 'under_review'
  | 'completed'
  | 'rejected';

export interface GradingScaleRule {
  id: string;
  gradingScaleId: string;
  grade: string;
  gradePoint: number;
  minPercentage: number;
  maxPercentage: number;
  description?: string | null;
  isPassing: boolean;
  createdAt: string;
}

export interface GradingScale {
  id: string;
  institutionId: string;
  name: string;
  description?: string | null;
  calculationType: GradingCalculationType;
  isCreditBased: boolean;
  version: number;
  isDefault: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  rules?: GradingScaleRule[];
}

export interface Examination {
  id: string;
  institutionId: string;
  campusId?: string | null;
  academicYearId: string;
  termId?: string | null;
  programId?: string | null;
  classId?: string | null;
  name: string;
  examType: ExamType;
  startDate: string;
  endDate: string;
  maxMarks: number;
  passingMarks: number;
  weightagePercentage: number;
  gradingScaleId?: string | null;
  status: ExamStatus;
  publicationStatus: ExamPublicationStatus;
  publishedAt?: string | null;
  publishedBy?: string | null;
  instructions?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  academicYear?: AcademicYear;
  campus?: Campus;
  academicClass?: AcademicClass;
  program?: AcademicProgram;
  gradingScale?: GradingScale;
  subjects?: ExamSubject[];
}

export interface ExamSubject {
  id: string;
  institutionId: string;
  examinationId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  maxMarks: number;
  passingMarks: number;
  credits: number;
  examDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  roomId?: string | null;
  invigilatorStaffId?: string | null;
  status: ExamSubjectStatus;
  createdAt: string;
  updatedAt: string;
  // Joins
  subject?: AcademicSubject;
  room?: Room;
  invigilator?: StaffProfile;
  examination?: Examination;
}

export interface StudentExamMark {
  id: string;
  institutionId: string;
  examinationId: string;
  examSubjectId: string;
  studentId: string;
  enrollmentId?: string | null;
  marksObtained?: number | null;
  isAbsent: boolean;
  isExempted: boolean;
  grade?: string | null;
  gradePoint?: number | null;
  status: MarksEntryStatus;
  remarks?: string | null;
  enteredByStaffId?: string | null;
  submittedAt?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Joins
  student?: Student;
  examSubject?: ExamSubject;
  examination?: Examination;
  enteredByStaff?: StaffProfile;
}

export interface MarksEntryCorrection {
  id: string;
  institutionId: string;
  studentExamMarkId: string;
  previousMarks?: number | null;
  newMarks: number;
  previousStatus: MarksEntryStatus;
  newStatus: MarksEntryStatus;
  reason: string;
  correctedBy: string;
  correctedAt: string;
  // Joins
  corrector?: Profile;
}

export interface StudentExamResult {
  id: string;
  institutionId: string;
  examinationId: string;
  studentId: string;
  academicYearId: string;
  classId: string;
  sectionId?: string | null;
  gradingScaleId?: string | null;
  gradingScaleVersion: number;
  totalMaxMarks: number;
  totalObtainedMarks: number;
  percentage: number;
  gpa?: number | null;
  cgpa?: number | null;
  finalGrade?: string | null;
  resultStatus: ExamResultStatus;
  backlogCount: number;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Joins
  student?: Student;
  examination?: Examination;
  academicClass?: AcademicClass;
  academicSection?: AcademicSection;
  gradingScale?: GradingScale;
}

export interface HallTicket {
  id: string;
  institutionId: string;
  examinationId: string;
  studentId: string;
  ticketNumber: string;
  isEligible: boolean;
  ineligibilityReason?: string | null;
  qrCodeHash: string;
  generatedAt: string;
  generatedBy?: string | null;
  // Joins
  student?: Student;
  examination?: Examination;
}

export interface ExamRevaluation {
  id: string;
  institutionId: string;
  studentExamMarkId: string;
  studentId: string;
  examinationId: string;
  subjectId: string;
  originalMarks: number;
  revisedMarks?: number | null;
  status: RevaluationStatus;
  reason: string;
  reviewerStaffId?: string | null;
  reviewNotes?: string | null;
  appliedAt: string;
  completedAt?: string | null;
  reviewedBy?: string | null;
  // Joins
  student?: Student;
  examination?: Examination;
  subject?: AcademicSubject;
  reviewer?: StaffProfile;
}

export interface ExamOverviewStats {
  totalExams: number;
  activeExams: number;
  publishedExams: number;
  pendingReviews: number;
  revaluationsCount: number;
  totalGradingScales: number;
}

// ==============================================================================
// Milestone 8: Universal Fees & Payments Management
// ==============================================================================

export type FeeCategory =
  | 'tuition'
  | 'admission'
  | 'registration'
  | 'examination'
  | 'laboratory'
  | 'library'
  | 'transport'
  | 'hostel'
  | 'fine'
  | 'deposit'
  | 'other';

export type FeePaymentMethod =
  | 'cash'
  | 'upi'
  | 'bank_transfer'
  | 'card'
  | 'payment_gateway'
  | 'cheque'
  | 'demand_draft'
  | 'advance_wallet';

export type FeePaymentStatus =
  | 'pending'
  | 'completed'
  | 'reconciled'
  | 'reversed'
  | 'failed';

export type FeeAssignmentStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'waived'
  | 'cancelled';

export type FeeInstallmentStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'waived';

export type ConcessionType =
  | 'merit_scholarship'
  | 'need_based'
  | 'sibling_discount'
  | 'staff_child'
  | 'sports_quota'
  | 'institutional_waiver'
  | 'custom';

export type ConcessionCalculationType =
  | 'percentage'
  | 'fixed_amount';

export type ConcessionStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'revoked';

export type RefundStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'processed';

export type FinancialLedgerEntryType =
  | 'charge'
  | 'payment'
  | 'concession'
  | 'penalty'
  | 'reversal'
  | 'refund'
  | 'advance_credit'
  | 'advance_debit';

export type GatewayOrderStatus =
  | 'created'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'expired';

export interface InstitutionFeeSettings {
  id: string;
  institutionId: string;
  currency: string;
  currencySymbol: string;
  receiptPrefix: string;
  invoicePrefix: string;
  lastReceiptSeq: number;
  lastInvoiceSeq: number;
  lateFeeEnabled: boolean;
  lateFeeDailyAmount: number;
  gracePeriodDays: number;
  termsAndConditions?: string | null;
  gatewayProvider: string;
  gatewayKeyId?: string | null;
  gatewayWebhookSecret?: string | null;
  isGatewayEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeeHead {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  category: FeeCategory;
  description?: string | null;
  isRefundable: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface FeeStructureItem {
  id: string;
  institutionId: string;
  feeStructureId: string;
  feeHeadId: string;
  amount: number;
  isMandatory: boolean;
  orderIndex: number;
  createdAt: string;
  // Joins
  feeHead?: FeeHead;
}

export interface FeeStructureInstallment {
  id: string;
  institutionId: string;
  feeStructureId: string;
  installmentNumber: number;
  name: string;
  percentage: number;
  dueDaysOffset: number;
  createdAt: string;
}

export interface FeeStructure {
  id: string;
  institutionId: string;
  academicYearId: string;
  campusId?: string | null;
  programId?: string | null;
  classId?: string | null;
  termId?: string | null;
  studentCategory?: string | null;
  name: string;
  code: string;
  totalAmount: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Joins
  academicYear?: AcademicYear;
  campus?: Campus;
  program?: AcademicProgram;
  academicClass?: AcademicClass;
  items?: FeeStructureItem[];
  installments?: FeeStructureInstallment[];
}

export interface StudentFeeAssignmentItem {
  id: string;
  institutionId: string;
  assignmentId: string;
  feeHeadId: string;
  baseAmount: number;
  concessionAmount: number;
  netAmount: number;
  paidAmount: number;
  createdAt: string;
  // Joins
  feeHead?: FeeHead;
}

export interface StudentFeeInstallment {
  id: string;
  institutionId: string;
  assignmentId: string;
  installmentNumber: number;
  title: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  fineAmount: number;
  status: FeeInstallmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFeeAssignment {
  id: string;
  institutionId: string;
  studentId: string;
  enrollmentId: string;
  academicYearId: string;
  feeStructureId?: string | null;
  invoiceNumber: string;
  baseAmount: number;
  concessionAmount: number;
  fineAmount: number;
  netPayableAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  status: FeeAssignmentStatus;
  dueDate: string;
  assignedBy?: string | null;
  assignedAt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joins
  student?: Student;
  enrollment?: StudentEnrollment;
  academicYear?: AcademicYear;
  feeStructure?: FeeStructure;
  items?: StudentFeeAssignmentItem[];
  installments?: StudentFeeInstallment[];
}

export interface FeeConcession {
  id: string;
  institutionId: string;
  concessionCode: string;
  studentId: string;
  assignmentId: string;
  feeHeadId?: string | null;
  concessionType: ConcessionType;
  calculationType: ConcessionCalculationType;
  concessionValue: number;
  appliedAmount: number;
  reason: string;
  status: ConcessionStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joins
  student?: Student;
  assignment?: StudentFeeAssignment;
  feeHead?: FeeHead;
  requester?: Profile;
  approver?: Profile;
}

export interface PaymentAllocation {
  id: string;
  institutionId: string;
  paymentId: string;
  assignmentId: string;
  installmentId?: string | null;
  feeHeadId: string;
  amountAllocated: number;
  createdAt: string;
  // Joins
  feeHead?: FeeHead;
}

export interface FeePayment {
  id: string;
  institutionId: string;
  receiptNumber: string;
  transactionReference: string;
  studentId: string;
  enrollmentId?: string | null;
  assignmentId?: string | null;
  amountReceived: number;
  paymentMethod: FeePaymentMethod;
  paymentDate: string;
  externalTransactionId?: string | null;
  bankName?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  status: FeePaymentStatus;
  advanceBalanceGenerated: number;
  notes?: string | null;
  qrVerificationHash: string;
  collectedBy: string;
  createdAt: string;
  updatedAt: string;
  // Joins
  student?: Student;
  collector?: Profile;
  assignment?: StudentFeeAssignment;
  allocations?: PaymentAllocation[];
}

export interface StudentAdvanceBalance {
  id: string;
  institutionId: string;
  studentId: string;
  balanceAmount: number;
  updatedAt: string;
  // Joins
  student?: Student;
}

export interface FinancialLedgerEntry {
  id: string;
  institutionId: string;
  entryNumber: number;
  transactionTimestamp: string;
  entryType: FinancialLedgerEntryType;
  debitAmount: number;
  creditAmount: number;
  balanceAfter: number;
  studentId: string;
  assignmentId?: string | null;
  paymentId?: string | null;
  refundId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
  // Joins
  student?: Student;
  creator?: Profile;
}

export interface FeeRefundRequest {
  id: string;
  institutionId: string;
  refundNumber: string;
  paymentId: string;
  studentId: string;
  assignmentId?: string | null;
  refundAmount: number;
  reason: string;
  status: RefundStatus;
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  disbursementMethod?: FeePaymentMethod | null;
  disbursementReference?: string | null;
  disbursedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Joins
  payment?: FeePayment;
  student?: Student;
  requester?: Profile;
  reviewer?: Profile;
}

export interface GatewayOrder {
  id: string;
  institutionId: string;
  studentId: string;
  assignmentId?: string | null;
  provider: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  status: GatewayOrderStatus;
  paymentId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joins
  student?: Student;
}

export interface GatewayWebhookEvent {
  id: string;
  institutionId: string;
  provider: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signatureVerified: boolean;
  processed: boolean;
  processedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface FeeOverviewStats {
  totalAssigned: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalConcessions: number;
  totalRefunds: number;
  activeStructuresCount: number;
  pendingConcessionsCount: number;
  pendingRefundsCount: number;
}

// ============================================================================
// Milestone 9: Universal Parent & Student Communication Ecosystem
// ============================================================================

export type NotificationCategory =
  | 'attendance'
  | 'examinations'
  | 'results'
  | 'fees_payments'
  | 'admissions'
  | 'homework'
  | 'timetable'
  | 'leave'
  | 'transport'
  | 'announcements'
  | 'emergency'
  | 'general';

export type NotificationChannel =
  | 'in_app'
  | 'push'
  | 'email'
  | 'sms'
  | 'whatsapp';

export type NotificationPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

export type AnnouncementScope =
  | 'institution'
  | 'campus'
  | 'department'
  | 'program'
  | 'class'
  | 'section'
  | 'role'
  | 'individual';

export type AnnouncementPriority =
  | 'low'
  | 'standard'
  | 'important'
  | 'urgent';

export type AnnouncementStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'archived';

export type AssignmentSubmissionStatus =
  | 'pending'
  | 'submitted'
  | 'late'
  | 'graded'
  | 'resubmit_requested';

export type ConversationType =
  | 'parent_teacher'
  | 'student_faculty'
  | 'admin_broadcast'
  | 'staff_internal';

export interface Notification {
  id: string;
  institutionId: string;
  recipientUserId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  priority: NotificationPriority;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  createdBy?: string | null;
  recipient?: Profile;
  creator?: Profile;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  institutionId: string;
  channel: NotificationChannel;
  recipientTarget: string;
  status: NotificationDeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  responsePayload?: Record<string, unknown> | null;
  errorMessage?: string | null;
  externalMessageId?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  institutionId: string;
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTemplate {
  id: string;
  institutionId: string;
  templateCode: string;
  name: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  subjectTemplate?: string | null;
  bodyTemplate: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PushDeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceModel?: string | null;
  appVersion?: string | null;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  institutionId: string;
  title: string;
  content: string;
  scope: AnnouncementScope;
  targetEntityId?: string | null;
  targetRole?: Role | null;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishedAt?: string | null;
  expiresAt?: string | null;
  scheduledFor?: string | null;
  requiresAcknowledgement: boolean;
  acknowledgementDeadline?: string | null;
  attachments: Array<{ name: string; url: string; size?: number; type?: string }>;
  viewCount: number;
  acknowledgementCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: Profile;
  isAcknowledged?: boolean;
}

export interface AnnouncementAcknowledgement {
  id: string;
  announcementId: string;
  institutionId: string;
  userId: string;
  acknowledgedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  user?: Profile;
}

export interface HomeworkAssignment {
  id: string;
  institutionId: string;
  academicYearId: string;
  campusId?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teacherId: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  attachments: Array<{ name: string; url: string; size?: number }>;
  maxMarks: number;
  dueDate: string;
  dueTime?: string | null;
  allowLateSubmissions: boolean;
  latePenaltyPercent: number;
  status: 'draft' | 'published' | 'closed' | 'archived';
  createdAt: string;
  updatedAt: string;
  academicYear?: AcademicYear;
  campus?: Campus;
  academicClass?: AcademicClass;
  academicSection?: AcademicSection;
  academicSubject?: AcademicSubject;
  class?: AcademicClass;
  section?: AcademicSection;
  subject?: AcademicSubject;
  teacher?: Profile;
  submissionCount?: number;
  userSubmission?: HomeworkSubmission;
}

export interface HomeworkSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  institutionId: string;
  submissionText?: string | null;
  attachments: Array<{ name: string; url: string; size?: number }>;
  submittedAt: string;
  isLate: boolean;
  status: AssignmentSubmissionStatus;
  marksObtained?: number | null;
  feedback?: string | null;
  gradedBy?: string | null;
  gradedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignment?: HomeworkAssignment;
  student?: Student;
  grader?: Profile;
}

export interface CommunicationThread {
  id: string;
  institutionId: string;
  threadType: ConversationType;
  subject: string;
  createdBy: string;
  isLocked: boolean;
  isArchived: boolean;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  creator?: Profile;
  participants?: CommunicationParticipant[];
  messages?: CommunicationMessage[];
  unreadCount?: number;
}

export interface CommunicationParticipant {
  id: string;
  threadId: string;
  institutionId: string;
  userId: string;
  role: string;
  lastReadAt?: string | null;
  isMuted: boolean;
  createdAt: string;
  user?: Profile;
}

export interface CommunicationMessage {
  id: string;
  threadId: string;
  institutionId: string;
  senderId: string;
  body: string;
  attachments: Array<{ name: string; url: string; size?: number; type?: string }>;
  isEdited: boolean;
  isFlagged: boolean;
  isDeleted: boolean;
  flaggedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: Profile;
}

export interface CommunicationsOverviewStats {
  totalAnnouncements: number;
  activeAnnouncements: number;
  unreadNotifications: number;
  pendingDeliveries: number;
  failedDeliveries: number;
  activeThreads: number;
  pendingHomework: number;
}





