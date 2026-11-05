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
  | 'academic_admin'
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
  | 'documents:manage'
  | 'documents:verify'
  | 'audit:view'
  | 'billing:manage';

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
    'documents:manage',
    'documents:verify',
    'audit:view',
    'billing:manage',
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
    'documents:manage',
    'documents:verify',
    'audit:view',
  ],
  academic_admin: [
    'institution:view',
    'members:view',
    'campuses:view',
    'academics:manage',
    'academics:view',
    'students:view',
    'guardians:view',
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
  ],
  faculty: [
    'institution:view',
    'members:view',
    'campuses:view',
    'academics:view',
    'students:view',
    'guardians:view',
  ],
  staff: [
    'institution:view',
    'campuses:view',
    'students:view',
  ],
  accountant: [
    'institution:view',
    'students:view',
    'billing:manage',
  ],
  student: [
    'institution:view',
    'academics:view',
    'students:view',
  ],
  parent: [
    'institution:view',
    'academics:view',
    'students:view',
    'guardians:view',
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
