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
  | 'faculty'
  | 'staff'
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
    'audit:view',
  ],
  academic_admin: [
    'institution:view',
    'members:view',
    'campuses:view',
    'academics:manage',
    'academics:view',
  ],
  faculty: [
    'institution:view',
    'members:view',
    'campuses:view',
    'academics:view',
  ],
  staff: [
    'institution:view',
    'campuses:view',
  ],
  student: [
    'institution:view',
    'academics:view',
  ],
  parent: [
    'institution:view',
    'academics:view',
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
  // Join extensions
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
  // Join extensions
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
  levelNumber: number; // e.g. Grade 1-12, or Year 1-4
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  // Join extensions
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
  // Join extensions
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
  // Join extensions
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
  // Join extensions
  academicClass?: AcademicClass | null;
  section?: AcademicSection | null;
  subject?: AcademicSubject | null;
  term?: AcademicTerm | null;
  faculty?: Profile | null;
}

// Dynamic terminology mapping helper
export interface AcademicTerminology {
  departmentTitle: string; // e.g., "Wings / Divisions", "Streams", "Departments", "Faculties"
  departmentDescription: string;
  programTitle: string;    // e.g., "Curriculums", "Stream Tracks", "Programs / Degrees", "Degrees"
  programDescription: string;
  classTitle: string;      // e.g., "Grades / Classes", "Year Batches", "Batches / Cohorts"
  classDescription: string;
  sectionTitle: string;    // e.g., "Sections", "Divisions", "Lab Batches / Sections"
  sectionDescription: string;
  teacherTitle: string;    // e.g., "Class Teacher", "Stream Mentor", "Faculty Advisor / Proctor"
  subjectTitle: string;    // e.g., "Subjects", "Subjects", "Course Modules", "Courses"
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
// 6. Audit Logging
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
  // Join extensions
  actorProfile?: Profile | null;
}

// ==========================================
// 7. User Session & Multi-Tenancy Context
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
