import { describe, it, expect, beforeEach } from 'vitest';
import type { Role, MembershipStatus, IdentityDocumentType, IdentityVerificationStatus, ConsentType } from '../../packages/types/src';

interface MockUser {
  id: string;
  email: string;
}

interface MockMembership {
  id: string;
  institutionId: string;
  userId: string;
  role: Role;
  status: MembershipStatus;
}

interface MockStudent {
  id: string;
  institutionId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  userId: string | null;
  status: string;
}

interface MockGuardian {
  id: string;
  institutionId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  userId: string | null;
}

interface MockStudentGuardian {
  id: string;
  institutionId: string;
  studentId: string;
  guardianId: string;
  relationship: string;
  isPrimary: boolean;
}

interface MockIdentityDocument {
  id: string;
  institutionId: string;
  studentId: string | null;
  applicationId: string | null;
  documentType: IdentityDocumentType;
  maskedReference: string;
  documentFilePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  verificationStatus: IdentityVerificationStatus;
  verificationNotes: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
}

interface MockEmergencyContact {
  id: string;
  institutionId: string;
  studentId: string | null;
  applicationId: string | null;
  priority: 'primary' | 'secondary';
  name: string;
  relationship: string;
  phonePrimary: string;
  isAuthorizedPickup: boolean;
}

interface MockConsentRecord {
  id: string;
  institutionId: string;
  studentId: string | null;
  applicationId: string | null;
  consentType: ConsentType;
  granted: boolean;
  grantedByName: string;
  grantedByRelationship: string;
  grantedByUserId: string | null;
  grantedAt: string;
  withdrawn: boolean;
  withdrawnAt: string | null;
  withdrawnBy: string | null;
  withdrawalReason: string | null;
}

interface MockIdentityAuditLog {
  id: string;
  institutionId: string;
  documentId: string;
  actorUserId: string;
  action: 'view' | 'download' | 'verify' | 'reject';
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface MockAdmissionApplication {
  id: string;
  institutionId: string;
  applicationNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  createdByUserId: string;
  convertedStudentId: string | null;
}

class MockStudentIdentitySecuritySystem {
  users: MockUser[] = [];
  memberships: MockMembership[] = [];
  students: MockStudent[] = [];
  guardians: MockGuardian[] = [];
  studentGuardians: MockStudentGuardian[] = [];
  applications: MockAdmissionApplication[] = [];
  identityDocuments: MockIdentityDocument[] = [];
  emergencyContacts: MockEmergencyContact[] = [];
  consentRecords: MockConsentRecord[] = [];
  auditLogs: MockIdentityAuditLog[] = [];

  hasRole(userId: string, institutionId: string, allowedRoles: Role[]): boolean {
    const membership = this.memberships.find(
      (m) => m.userId === userId && m.institutionId === institutionId && m.status === 'active'
    );
    if (!membership) return false;
    return allowedRoles.includes(membership.role);
  }

  isGuardianOfStudent(userId: string, studentId: string): boolean {
    const guardian = this.guardians.find((g) => g.userId === userId);
    if (!guardian) return false;
    return this.studentGuardians.some(
      (sg) => sg.guardianId === guardian.id && sg.studentId === studentId
    );
  }

  isCreatorOfApplication(userId: string, applicationId: string): boolean {
    return this.applications.some(
      (app) => app.id === applicationId && app.createdByUserId === userId
    );
  }

  // RLS Simulation: SELECT ON student_identity_documents
  selectIdentityDocuments(userId: string, institutionId: string): MockIdentityDocument[] {
    const isAdminOrOfficer = this.hasRole(userId, institutionId, ['owner', 'admin', 'admissions_officer']);

    return this.identityDocuments.filter((doc) => {
      if (doc.institutionId !== institutionId) return false;

      // 1. Admin / Owner / Admissions Officer has full access
      if (isAdminOrOfficer) return true;

      // 2. Student themselves (if doc.studentId matches)
      const student = this.students.find((s) => s.userId === userId);
      if (student && doc.studentId === student.id) return true;

      // 3. Parent / Guardian of the student
      if (doc.studentId && this.isGuardianOfStudent(userId, doc.studentId)) return true;

      // 4. Guardian who created the application
      if (doc.applicationId && this.isCreatorOfApplication(userId, doc.applicationId)) return true;

      // Denied for teachers, other students, and unauthorized users
      return false;
    });
  }

  // RLS Simulation: UPDATE/VERIFY ON student_identity_documents
  verifyIdentityDocument(
    actorUserId: string,
    documentId: string,
    newStatus: IdentityVerificationStatus,
    notes: string,
    ip = '127.0.0.1'
  ): { success: boolean; error?: string } {
    const doc = this.identityDocuments.find((d) => d.id === documentId);
    if (!doc) return { success: false, error: 'Document not found' };

    const canVerify = this.hasRole(actorUserId, doc.institutionId, ['owner', 'admin', 'admissions_officer']);
    if (!canVerify) {
      return { success: false, error: 'Permission denied: Only admin, owner, or admissions officer can verify documents' };
    }

    doc.verificationStatus = newStatus;
    doc.verificationNotes = notes;
    doc.verifiedBy = actorUserId;
    doc.verifiedAt = new Date().toISOString();

    // Log the action to audit trail
    this.recordAuditLog(actorUserId, doc.institutionId, documentId, newStatus === 'verified' ? 'verify' : 'reject', ip);

    return { success: true };
  }

  recordAuditLog(
    actorUserId: string,
    institutionId: string,
    documentId: string,
    action: 'view' | 'download' | 'verify' | 'reject',
    ip = '127.0.0.1'
  ) {
    this.auditLogs.push({
      id: `audit-${this.auditLogs.length + 1}`,
      institutionId,
      documentId,
      actorUserId,
      action,
      ipAddress: ip,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: new Date().toISOString(),
    });
  }

  // Consent Withdrawal Simulation
  withdrawConsent(
    parentUserId: string,
    studentId: string,
    consentType: ConsentType,
    reason: string
  ): { success: boolean; error?: string } {
    if (!this.isGuardianOfStudent(parentUserId, studentId)) {
      return { success: false, error: 'Permission denied: Only a verified parent/guardian can withdraw consent' };
    }

    // Mandatory consents cannot be withdrawn while enrolled
    if (consentType === 'registration_terms' || consentType === 'privacy_notice' || consentType === 'emergency_medical_treatment') {
      return { success: false, error: 'Mandatory core consents cannot be unilaterally withdrawn while student is enrolled' };
    }

    const consent = this.consentRecords.find(
      (c) => c.studentId === studentId && c.consentType === consentType && !c.withdrawn
    );

    if (!consent) {
      return { success: false, error: 'No active consent record found to withdraw' };
    }

    consent.withdrawn = true;
    consent.withdrawnAt = new Date().toISOString();
    consent.withdrawnBy = parentUserId;
    consent.withdrawalReason = reason;

    return { success: true };
  }

  // Multi-Child Guardian Linking
  linkGuardianToStudent(
    guardianUserId: string,
    studentId: string,
    institutionId: string,
    relationship: string,
    isPrimary: boolean
  ): { guardianId: string; relationId: string } {
    let guardian = this.guardians.find((g) => g.userId === guardianUserId && g.institutionId === institutionId);
    if (!guardian) {
      guardian = {
        id: `guardian-${this.guardians.length + 1}`,
        institutionId,
        firstName: 'Parent',
        lastName: 'User',
        phone: '+91 9999900000',
        email: 'parent@example.com',
        userId: guardianUserId,
      };
      this.guardians.push(guardian);
    }

    const relation: MockStudentGuardian = {
      id: `sg-${this.studentGuardians.length + 1}`,
      institutionId,
      studentId,
      guardianId: guardian.id,
      relationship,
      isPrimary,
    };
    this.studentGuardians.push(relation);

    return { guardianId: guardian.id, relationId: relation.id };
  }

  // Admission Conversion to Enrolled Student
  convertApplicationToStudent(
    actorUserId: string,
    applicationId: string
  ): { success: boolean; studentId?: string; admissionNumber?: string; error?: string } {
    const app = this.applications.find((a) => a.id === applicationId);
    if (!app) return { success: false, error: 'Application not found' };

    const canConvert = this.hasRole(actorUserId, app.institutionId, ['owner', 'admin', 'admissions_officer']);
    if (!canConvert) return { success: false, error: 'Permission denied to convert application' };

    const admissionNumber = `ADM-2026-${String(this.students.length + 1).padStart(4, '0')}`;
    const newStudent: MockStudent = {
      id: `student-${this.students.length + 1}`,
      institutionId: app.institutionId,
      admissionNumber,
      firstName: app.firstName,
      lastName: app.lastName,
      userId: null,
      status: 'active',
    };
    this.students.push(newStudent);

    // Transfer application identity docs to student
    for (const doc of this.identityDocuments.filter((d) => d.applicationId === applicationId)) {
      doc.studentId = newStudent.id;
    }

    // Transfer emergency contacts to student
    for (const ec of this.emergencyContacts.filter((e) => e.applicationId === applicationId)) {
      ec.studentId = newStudent.id;
    }

    // Transfer consents to student
    for (const cr of this.consentRecords.filter((c) => c.applicationId === applicationId)) {
      cr.studentId = newStudent.id;
    }

    app.status = 'enrolled';
    app.convertedStudentId = newStudent.id;

    return { success: true, studentId: newStudent.id, admissionNumber };
  }
}

describe('Security: Student Identity, RLS, Audit Trail & Consent Management (Scenarios 10-17)', () => {
  let db: MockStudentIdentitySecuritySystem;
  const INST_ID = 'inst-001';

  const USER_OWNER = 'user-owner';
  const USER_ADMIN = 'user-admin';
  const USER_OFFICER = 'user-officer';
  const USER_TEACHER = 'user-teacher';
  const USER_PARENT_A = 'user-parent-a';
  const USER_PARENT_B = 'user-parent-b';
  const USER_STUDENT_A = 'user-student-a';
  const USER_STUDENT_B = 'user-student-b';

  beforeEach(() => {
    db = new MockStudentIdentitySecuritySystem();

    db.memberships.push(
      { id: 'm1', institutionId: INST_ID, userId: USER_OWNER, role: 'owner', status: 'active' },
      { id: 'm2', institutionId: INST_ID, userId: USER_ADMIN, role: 'admin', status: 'active' },
      { id: 'm3', institutionId: INST_ID, userId: USER_OFFICER, role: 'admissions_officer', status: 'active' },
      { id: 'm4', institutionId: INST_ID, userId: USER_TEACHER, role: 'faculty', status: 'active' },
      { id: 'm5', institutionId: INST_ID, userId: USER_PARENT_A, role: 'guardian', status: 'active' },
      { id: 'm6', institutionId: INST_ID, userId: USER_PARENT_B, role: 'guardian', status: 'active' },
      { id: 'm7', institutionId: INST_ID, userId: USER_STUDENT_A, role: 'student', status: 'active' },
      { id: 'm8', institutionId: INST_ID, userId: USER_STUDENT_B, role: 'student', status: 'active' }
    );

    // Setup Student A (child of Parent A)
    const studentA: MockStudent = {
      id: 'student-A',
      institutionId: INST_ID,
      admissionNumber: 'ADM-2026-0001',
      firstName: 'Aarav',
      lastName: 'Sharma',
      userId: USER_STUDENT_A,
      status: 'active',
    };
    db.students.push(studentA);

    const guardianA: MockGuardian = {
      id: 'guardian-A',
      institutionId: INST_ID,
      firstName: 'Sunita',
      lastName: 'Sharma',
      phone: '+91 9876543220',
      email: 'sunita@example.com',
      userId: USER_PARENT_A,
    };
    db.guardians.push(guardianA);

    db.studentGuardians.push({
      id: 'sg-1',
      institutionId: INST_ID,
      studentId: studentA.id,
      guardianId: guardianA.id,
      relationship: 'mother',
      isPrimary: true,
    });

    // Setup Student B (child of Parent B)
    const studentB: MockStudent = {
      id: 'student-B',
      institutionId: INST_ID,
      admissionNumber: 'ADM-2026-0002',
      firstName: 'Kabir',
      lastName: 'Patel',
      userId: USER_STUDENT_B,
      status: 'active',
    };
    db.students.push(studentB);

    const guardianB: MockGuardian = {
      id: 'guardian-B',
      institutionId: INST_ID,
      firstName: 'Kiran',
      lastName: 'Patel',
      phone: '+91 9876543230',
      email: 'kiran@example.com',
      userId: USER_PARENT_B,
    };
    db.guardians.push(guardianB);

    db.studentGuardians.push({
      id: 'sg-2',
      institutionId: INST_ID,
      studentId: studentB.id,
      guardianId: guardianB.id,
      relationship: 'father',
      isPrimary: true,
    });

    // Identity Docs for Student A
    db.identityDocuments.push({
      id: 'doc-A-aadhaar',
      institutionId: INST_ID,
      studentId: studentA.id,
      applicationId: null,
      documentType: 'masked_aadhaar',
      maskedReference: 'XXXX-XXXX-1111',
      documentFilePath: 'institutions/inst-001/students/student-A/aadhaar.pdf',
      fileName: 'aadhaar_masked.pdf',
      fileSize: 1024 * 300,
      mimeType: 'application/pdf',
      verificationStatus: 'submitted',
      verificationNotes: null,
      verifiedBy: null,
      verifiedAt: null,
    });

    // Identity Docs for Student B
    db.identityDocuments.push({
      id: 'doc-B-birthcert',
      institutionId: INST_ID,
      studentId: studentB.id,
      applicationId: null,
      documentType: 'birth_certificate',
      maskedReference: 'BC-2018-9999',
      documentFilePath: 'institutions/inst-001/students/student-B/birthcert.pdf',
      fileName: 'birthcert.pdf',
      fileSize: 1024 * 400,
      mimeType: 'application/pdf',
      verificationStatus: 'submitted',
      verificationNotes: null,
      verifiedBy: null,
      verifiedAt: null,
    });

    // Consent records for Student A
    db.consentRecords.push(
      {
        id: 'cr-A-terms',
        institutionId: INST_ID,
        studentId: studentA.id,
        applicationId: null,
        consentType: 'registration_terms',
        granted: true,
        grantedByName: 'Sunita Sharma',
        grantedByRelationship: 'Mother',
        grantedByUserId: USER_PARENT_A,
        grantedAt: new Date().toISOString(),
        withdrawn: false,
        withdrawnAt: null,
        withdrawnBy: null,
        withdrawalReason: null,
      },
      {
        id: 'cr-A-photo',
        institutionId: INST_ID,
        studentId: studentA.id,
        applicationId: null,
        consentType: 'photo_media_publication',
        granted: true,
        grantedByName: 'Sunita Sharma',
        grantedByRelationship: 'Mother',
        grantedByUserId: USER_PARENT_A,
        grantedAt: new Date().toISOString(),
        withdrawn: false,
        withdrawnAt: null,
        withdrawnBy: null,
        withdrawalReason: null,
      }
    );
  });

  // Scenario 10: Multi-child parent registration
  it('Scenario 10: links a single parent/guardian account to multiple children without data conflict', () => {
    // Parent A has a second child (Ananya Sharma)
    const child2: MockStudent = {
      id: 'student-A2',
      institutionId: INST_ID,
      admissionNumber: 'ADM-2026-0003',
      firstName: 'Ananya',
      lastName: 'Sharma',
      userId: null,
      status: 'active',
    };
    db.students.push(child2);

    const linkResult = db.linkGuardianToStudent(USER_PARENT_A, child2.id, INST_ID, 'mother', true);
    expect(linkResult.guardianId).toBe('guardian-A'); // Reused existing guardian profile

    expect(db.isGuardianOfStudent(USER_PARENT_A, 'student-A')).toBe(true);
    expect(db.isGuardianOfStudent(USER_PARENT_A, 'student-A2')).toBe(true);
    expect(db.isGuardianOfStudent(USER_PARENT_A, 'student-B')).toBe(false); // Does not leak to Student B
  });

  // Scenario 11: RLS enforcement - Parent cannot view other students' identity docs
  it('Scenario 11: enforces RLS so Parent A cannot view Student B identity documents', () => {
    const parentADocs = db.selectIdentityDocuments(USER_PARENT_A, INST_ID);
    const parentBDocs = db.selectIdentityDocuments(USER_PARENT_B, INST_ID);

    expect(parentADocs.some((d) => d.id === 'doc-A-aadhaar')).toBe(true);
    expect(parentADocs.some((d) => d.id === 'doc-B-birthcert')).toBe(false); // Isolated!

    expect(parentBDocs.some((d) => d.id === 'doc-B-birthcert')).toBe(true);
    expect(parentBDocs.some((d) => d.id === 'doc-A-aadhaar')).toBe(false); // Isolated!
  });

  // Scenario 12: RLS enforcement - Teacher without permission cannot view identity docs
  it('Scenario 12: prevents teachers and faculty from accessing confidential identity documents', () => {
    const teacherDocs = db.selectIdentityDocuments(USER_TEACHER, INST_ID);
    expect(teacherDocs.length).toBe(0); // Zero identity documents exposed to teachers
  });

  // Scenario 13: RLS enforcement - Owner and Admin CAN view and verify identity docs
  it('Scenario 13: allows Owner, Admin, and Admissions Officer to view and verify identity docs', () => {
    const ownerDocs = db.selectIdentityDocuments(USER_OWNER, INST_ID);
    const adminDocs = db.selectIdentityDocuments(USER_ADMIN, INST_ID);
    const officerDocs = db.selectIdentityDocuments(USER_OFFICER, INST_ID);

    expect(ownerDocs.length).toBe(2);
    expect(adminDocs.length).toBe(2);
    expect(officerDocs.length).toBe(2);

    const verifyResult = db.verifyIdentityDocument(
      USER_OFFICER,
      'doc-A-aadhaar',
      'verified',
      'Masked Aadhaar verified successfully with QR code check'
    );

    expect(verifyResult.success).toBe(true);
    const docA = db.identityDocuments.find((d) => d.id === 'doc-A-aadhaar');
    expect(docA?.verificationStatus).toBe('verified');
    expect(docA?.verifiedBy).toBe(USER_OFFICER);
  });

  // Scenario 14: Consent withdrawal
  it('Scenario 14: allows parent to withdraw optional media consent, retaining immutable audit fields', () => {
    const withdrawResult = db.withdrawConsent(
      USER_PARENT_A,
      'student-A',
      'photo_media_publication',
      'Parent opted to keep child photographs private from annual magazine.'
    );

    expect(withdrawResult.success).toBe(true);
    const photoConsent = db.consentRecords.find((c) => c.id === 'cr-A-photo');
    expect(photoConsent?.withdrawn).toBe(true);
    expect(photoConsent?.withdrawalReason).toContain('keep child photographs private');
    expect(photoConsent?.withdrawnBy).toBe(USER_PARENT_A);

    // Mandatory registration terms cannot be withdrawn
    const mandatoryWithdraw = db.withdrawConsent(
      USER_PARENT_A,
      'student-A',
      'registration_terms',
      'Cannot withdraw mandatory terms'
    );
    expect(mandatoryWithdraw.success).toBe(false);
    expect(mandatoryWithdraw.error).toContain('Mandatory core consents cannot be unilaterally withdrawn');
  });

  // Scenario 15: Document verification lifecycle: submitted -> pending_verification -> verified / rejected
  it('Scenario 15: manages document verification lifecycle and records notes and reviewer', () => {
    const doc = db.identityDocuments.find((d) => d.id === 'doc-B-birthcert')!;
    expect(doc.verificationStatus).toBe('submitted');

    // Reject document due to illegible scan
    const rejectResult = db.verifyIdentityDocument(
      USER_ADMIN,
      doc.id,
      'rejected',
      'Upload is blurry and municipal seal is illegible. Please re-upload high resolution copy.'
    );

    expect(rejectResult.success).toBe(true);
    expect(doc.verificationStatus).toBe('rejected');
    expect(doc.verificationNotes).toContain('blurry');
    expect(doc.verifiedBy).toBe(USER_ADMIN);
  });

  // Scenario 16: Identity document audit log
  it('Scenario 16: logs every identity document view, download, verify, or reject with immutable timestamps', () => {
    expect(db.auditLogs.length).toBe(0);

    // Record view audit
    db.recordAuditLog(USER_OFFICER, INST_ID, 'doc-A-aadhaar', 'view', '192.168.1.50');
    // Record download audit
    db.recordAuditLog(USER_ADMIN, INST_ID, 'doc-A-aadhaar', 'download', '192.168.1.51');
    // Record verify audit
    db.verifyIdentityDocument(USER_ADMIN, 'doc-A-aadhaar', 'verified', 'Approved');

    expect(db.auditLogs.length).toBe(3);
    expect(db.auditLogs[0].action).toBe('view');
    expect(db.auditLogs[1].action).toBe('download');
    expect(db.auditLogs[2].action).toBe('verify');
    expect(db.auditLogs[2].actorUserId).toBe(USER_ADMIN);
  });

  // Scenario 17: Application conversion to enrolled student with admission number generation
  it('Scenario 17: atomically converts admission application to enrolled student and transfers documents and consents', () => {
    const newApp: MockAdmissionApplication = {
      id: 'app-999',
      institutionId: INST_ID,
      applicationNumber: 'APP-2026-0999',
      firstName: 'Rohan',
      lastName: 'Verma',
      status: 'approved',
      createdByUserId: USER_PARENT_A,
      convertedStudentId: null,
    };
    db.applications.push(newApp);

    // Attached docs and consents to application
    db.identityDocuments.push({
      id: 'doc-app-999',
      institutionId: INST_ID,
      studentId: null,
      applicationId: newApp.id,
      documentType: 'passport',
      maskedReference: 'P-9876543',
      documentFilePath: 'institutions/inst-001/admissions/app-999/passport.pdf',
      fileName: 'passport.pdf',
      fileSize: 1024 * 600,
      mimeType: 'application/pdf',
      verificationStatus: 'verified',
      verificationNotes: 'Passport verified',
      verifiedBy: USER_OFFICER,
      verifiedAt: new Date().toISOString(),
    });

    db.consentRecords.push({
      id: 'cr-app-999',
      institutionId: INST_ID,
      studentId: null,
      applicationId: newApp.id,
      consentType: 'registration_terms',
      granted: true,
      grantedByName: 'Sunita Sharma',
      grantedByRelationship: 'Mother',
      grantedByUserId: USER_PARENT_A,
      grantedAt: new Date().toISOString(),
      withdrawn: false,
      withdrawnAt: null,
      withdrawnBy: null,
      withdrawalReason: null,
    });

    const convertRes = db.convertApplicationToStudent(USER_ADMIN, newApp.id);
    expect(convertRes.success).toBe(true);
    expect(convertRes.admissionNumber).toBe('ADM-2026-0003');

    // Document and consent records transferred
    const doc = db.identityDocuments.find((d) => d.id === 'doc-app-999');
    expect(doc?.studentId).toBe(convertRes.studentId);

    const consent = db.consentRecords.find((c) => c.id === 'cr-app-999');
    expect(consent?.studentId).toBe(convertRes.studentId);

    expect(newApp.status).toBe('enrolled');
    expect(newApp.convertedStudentId).toBe(convertRes.studentId);
  });
});
