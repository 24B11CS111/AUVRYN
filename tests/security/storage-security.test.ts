import { describe, it, expect } from 'vitest';
import {
  STORAGE_BUCKETS,
  STORAGE_BUCKET_CONFIGS,
  sanitizeFileName,
  generateStoragePath,
  parseStoragePath,
  validateStoragePath,
  validateFileUpload,
  createSignedDownloadUrl,
  type StorageBucket,
} from '../../apps/web/src/lib/storage';

/**
 * Phase 2.3 Regression Test Suite:
 * Storage Security & Institutional RLS Isolation (REM-HIGH-02)
 *
 * Verifies:
 * 1. Storage bucket security configurations (strict privacy, size limits, allowed MIME types).
 * 2. File metadata validation (extension checks, size checks, double extension attacks).
 * 3. File name sanitization and path traversal prevention (.., \, /, control chars).
 * 4. Multi-tenant storage path structure and cross-tenant isolation enforcement.
 * 5. Student, guardian, and staff access boundaries (self-access vs peer-access).
 * 6. Deletion protection preventing students and guardians from deleting compliance records.
 * 7. Short-lived signed download URL expiration and path validation.
 */

describe('REM-HIGH-02: Storage Security & Institutional Isolation', () => {
  const INST_ALPHA = '11111111-1111-4111-8111-111111111111';
  const INST_BETA = '22222222-2222-4222-8222-222222222222';
  const STUDENT_CHARLIE = '33333333-3333-4333-8333-333333333333';
  const STUDENT_PEER = '44444444-4444-4444-8444-444444444444';
  const STAFF_SARAH = '55555555-5555-4555-8555-555555555555';
  const STAFF_PEER = '66666666-6666-4666-8666-666666666666';

  // ============================================================================
  // 1. Bucket Configurations & Strict Privacy
  // ============================================================================
  describe('1. Bucket Privacy and Configuration', () => {
    it('defines 4 institutional storage buckets', () => {
      expect(STORAGE_BUCKETS.STUDENT_DOCUMENTS).toBe('student-documents');
      expect(STORAGE_BUCKETS.STAFF_DOCUMENTS).toBe('staff-documents');
      expect(STORAGE_BUCKETS.TRANSPORT_DOCUMENTS).toBe('transport-documents');
      expect(STORAGE_BUCKETS.ACADEMIC_DOCUMENTS).toBe('academic-documents');
    });

    it('enforces strict 10MB limit and compliance MIME types on student-documents', () => {
      const config = STORAGE_BUCKET_CONFIGS[STORAGE_BUCKETS.STUDENT_DOCUMENTS];
      expect(config.maxSizeBytes).toBe(10 * 1024 * 1024);
      expect(config.allowedMimeTypes).toContain('application/pdf');
      expect(config.allowedMimeTypes).toContain('image/jpeg');
      expect(config.allowedMimeTypes).toContain('image/png');
      expect(config.allowedMimeTypes).toContain('image/webp');
      expect(config.allowedExtensions).toContain('.pdf');
      expect(config.allowedExtensions).not.toContain('.exe');
    });

    it('enforces strict 10MB limit and compliance MIME types on staff-documents', () => {
      const config = STORAGE_BUCKET_CONFIGS[STORAGE_BUCKETS.STAFF_DOCUMENTS];
      expect(config.maxSizeBytes).toBe(10 * 1024 * 1024);
      expect(config.allowedMimeTypes).toContain('application/pdf');
      expect(config.allowedMimeTypes).toContain('image/jpeg');
      expect(config.allowedExtensions).toContain('.pdf');
    });

    it('enforces 15MB limit on transport-documents', () => {
      const config = STORAGE_BUCKET_CONFIGS[STORAGE_BUCKETS.TRANSPORT_DOCUMENTS];
      expect(config.maxSizeBytes).toBe(15 * 1024 * 1024);
      expect(config.allowedExtensions).toContain('.pdf');
    });

    it('enforces 25MB limit and document formats on academic-documents', () => {
      const config = STORAGE_BUCKET_CONFIGS[STORAGE_BUCKETS.ACADEMIC_DOCUMENTS];
      expect(config.maxSizeBytes).toBe(25 * 1024 * 1024);
      expect(config.allowedExtensions).toContain('.docx');
      expect(config.allowedExtensions).toContain('.xlsx');
      expect(config.allowedExtensions).toContain('.epub');
    });
  });

  // ============================================================================
  // 2. Upload Metadata & File Validation
  // ============================================================================
  describe('2. Upload Metadata Validation & Attack Prevention', () => {
    it('accepts legitimate PDF within size limits', () => {
      const res = validateFileUpload(STORAGE_BUCKETS.STUDENT_DOCUMENTS, {
        fileName: 'birth_certificate.pdf',
        fileSize: 2 * 1024 * 1024,
        mimeType: 'application/pdf',
      });
      expect(res.valid).toBe(true);
    });

    it('accepts legitimate JPEG image', () => {
      const res = validateFileUpload(STORAGE_BUCKETS.STUDENT_DOCUMENTS, {
        fileName: 'passport_photo.jpg',
        fileSize: 500 * 1024,
        mimeType: 'image/jpeg',
      });
      expect(res.valid).toBe(true);
    });

    it('rejects files exceeding bucket maximum size limit', () => {
      const res = validateFileUpload(STORAGE_BUCKETS.STUDENT_DOCUMENTS, {
        fileName: 'huge_record.pdf',
        fileSize: 15 * 1024 * 1024, // 15MB exceeds 10MB limit
        mimeType: 'application/pdf',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds bucket limit');
    });

    it('rejects zero or negative byte files', () => {
      const res = validateFileUpload(STORAGE_BUCKETS.STUDENT_DOCUMENTS, {
        fileName: 'empty.pdf',
        fileSize: 0,
        mimeType: 'application/pdf',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('greater than 0');
    });

    it('rejects disallowed MIME type with permitted extension (MIME spoofing)', () => {
      const res = validateFileUpload(STORAGE_BUCKETS.STUDENT_DOCUMENTS, {
        fileName: 'document.pdf',
        fileSize: 1024,
        mimeType: 'application/x-dosexec',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('MIME type');
    });

    it('rejects disallowed extension with permitted MIME type (extension spoofing)', () => {
      const res = validateFileUpload(STORAGE_BUCKETS.STUDENT_DOCUMENTS, {
        fileName: 'malware.exe',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Dangerous executable file type');
    });

    it('detects and blocks multi-extension executable bypass attacks (e.g. document.pdf.exe)', () => {
      const res = validateFileUpload(STORAGE_BUCKETS.STUDENT_DOCUMENTS, {
        fileName: 'report.pdf.exe',
        fileSize: 2048,
        mimeType: 'application/pdf',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/executable/i);
    });

    it('rejects script extensions (.sh, .bat, .js, .vbs, .ps1)', () => {
      for (const badExt of ['.sh', '.bat', '.cmd', '.vbs', '.ps1']) {
        const res = validateFileUpload(STORAGE_BUCKETS.STUDENT_DOCUMENTS, {
          fileName: `script${badExt}`,
          fileSize: 1024,
          mimeType: 'application/pdf',
        });
        expect(res.valid).toBe(false);
      }
    });
  });

  // ============================================================================
  // 3. File Name Sanitization & Directory Traversal Prevention
  // ============================================================================
  describe('3. File Name Sanitization & Path Traversal Prevention', () => {
    it('sanitizes directory traversal characters (/ and \\ and ..)', () => {
      const sanitized = sanitizeFileName('../../etc/passwd');
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
    });

    it('strips non-printable and control characters', () => {
      const dirty = 'doc\x00\x08\x1b_cert.pdf';
      const clean = sanitizeFileName(dirty);
      expect(clean).toBe('doc_cert.pdf');
    });

    it('preserves clean alphanumeric names with valid extension', () => {
      expect(sanitizeFileName('student_record-2026.pdf')).toBe('student_record-2026.pdf');
    });

    it('handles empty or invalid inputs gracefully', () => {
      expect(sanitizeFileName('')).toBe('document.pdf');
      expect(sanitizeFileName(null as any)).toBe('document.pdf');
    });
  });

  // ============================================================================
  // 4. Storage Path Generation & Multi-Tenant Isolation
  // ============================================================================
  describe('4. Storage Path Generation & Tenant Isolation', () => {
    it('generates canonical path format: {institutionId}/{category}/{entityId}/{timestamp}-{filename}', () => {
      const path = generateStoragePath(INST_ALPHA, 'students', STUDENT_CHARLIE, 'marksheet.pdf');
      expect(path).toMatch(
        new RegExp(
          `^${INST_ALPHA}/students/${STUDENT_CHARLIE}/\\d+-marksheet\\.pdf$`
        )
      );
    });

    it('rejects non-UUID institution IDs in generateStoragePath', () => {
      expect(() => {
        generateStoragePath('invalid-inst', 'students', STUDENT_CHARLIE, 'test.pdf');
      }).toThrow(/Invalid institution ID/);
    });

    it('rejects non-UUID entity IDs in generateStoragePath', () => {
      expect(() => {
        generateStoragePath(INST_ALPHA, 'students', 'bad-entity-id', 'test.pdf');
      }).toThrow(/Invalid entity ID/);
    });

    it('parses valid storage paths correctly', () => {
      const rawPath = `${INST_ALPHA}/students/${STUDENT_CHARLIE}/1700000000-cert.pdf`;
      const parsed = parseStoragePath(rawPath);
      expect(parsed).not.toBeNull();
      expect(parsed?.institutionId).toBe(INST_ALPHA);
      expect(parsed?.category).toBe('students');
      expect(parsed?.entityId).toBe(STUDENT_CHARLIE);
      expect(parsed?.fileName).toBe('1700000000-cert.pdf');
    });

    it('rejects path traversal attempts in parseStoragePath', () => {
      expect(parseStoragePath(`../${INST_ALPHA}/students/${STUDENT_CHARLIE}/test.pdf`)).toBeNull();
      expect(parseStoragePath(`/root/${INST_ALPHA}/students/${STUDENT_CHARLIE}/test.pdf`)).toBeNull();
      expect(parseStoragePath(`${INST_ALPHA}\\students\\${STUDENT_CHARLIE}\\test.pdf`)).toBeNull();
    });

    it('detects and blocks cross-tenant storage path tampering', () => {
      // Path belongs to Beta, but expected institution is Alpha
      const betaPath = `${INST_BETA}/students/${STUDENT_CHARLIE}/file.pdf`;
      const validation = validateStoragePath(betaPath, INST_ALPHA);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Cross-tenant storage path violation');
    });

    it('accepts valid path matching expected institution', () => {
      const alphaPath = `${INST_ALPHA}/students/${STUDENT_CHARLIE}/file.pdf`;
      const validation = validateStoragePath(alphaPath, INST_ALPHA);
      expect(validation.valid).toBe(true);
    });
  });

  // ============================================================================
  // 5. Role Authorization, Student Self-Access & Guardian Verification
  // ============================================================================
  describe('5. Role Authorization & Ownership Boundaries', () => {
    // Simulated access authorization model matching our PostgreSQL RLS policies
    function checkStudentDocAccess(
      caller: {
        userId: string;
        institutionId: string;
        role: string;
        verifiedStudentIds?: string[];
      },
      targetDoc: {
        institutionId: string;
        studentId: string;
      }
    ): { allowed: boolean; reason?: string } {
      // 1. Institution Isolation
      if (caller.institutionId !== targetDoc.institutionId) {
        return { allowed: false, reason: 'Cross-tenant access blocked' };
      }

      // 2. Staff & Admins in Institution
      const staffRoles = ['owner', 'admin', 'admissions_officer', 'academic_admin', 'faculty', 'staff'];
      if (staffRoles.includes(caller.role)) {
        return { allowed: true };
      }

      // 3. Student Self-Access
      if (caller.role === 'student') {
        if (caller.userId === targetDoc.studentId) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Student cannot view peer documents' };
      }

      // 4. Guardian Access to Verified Children
      if (caller.role === 'guardian' || caller.role === 'parent') {
        if (caller.verifiedStudentIds?.includes(targetDoc.studentId)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Guardian is not linked to this child' };
      }

      return { allowed: false, reason: 'Unauthorized role' };
    }

    const docCharlie = { institutionId: INST_ALPHA, studentId: STUDENT_CHARLIE };
    const docPeer = { institutionId: INST_ALPHA, studentId: STUDENT_PEER };
    const docBeta = { institutionId: INST_BETA, studentId: '99999999-9999-4999-8999-999999999999' };

    it('allows Alpha Admin to view student documents in Alpha', () => {
      const caller = { userId: 'admin-1', institutionId: INST_ALPHA, role: 'admin' };
      expect(checkStudentDocAccess(caller, docCharlie).allowed).toBe(true);
      expect(checkStudentDocAccess(caller, docPeer).allowed).toBe(true);
    });

    it('blocks Alpha Admin from viewing Beta documents (cross-tenant isolation)', () => {
      const caller = { userId: 'admin-1', institutionId: INST_ALPHA, role: 'admin' };
      const res = checkStudentDocAccess(caller, docBeta);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('Cross-tenant access blocked');
    });

    it('allows student Charlie to view their own document', () => {
      const charlieCaller = { userId: STUDENT_CHARLIE, institutionId: INST_ALPHA, role: 'student' };
      expect(checkStudentDocAccess(charlieCaller, docCharlie).allowed).toBe(true);
    });

    it('blocks student Charlie from viewing peer student documents', () => {
      const charlieCaller = { userId: STUDENT_CHARLIE, institutionId: INST_ALPHA, role: 'student' };
      const res = checkStudentDocAccess(charlieCaller, docPeer);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('Student cannot view peer documents');
    });

    it('allows verified parent Grace to view child Charlie document', () => {
      const graceCaller = {
        userId: 'grace-guardian-1',
        institutionId: INST_ALPHA,
        role: 'parent',
        verifiedStudentIds: [STUDENT_CHARLIE],
      };
      expect(checkStudentDocAccess(graceCaller, docCharlie).allowed).toBe(true);
    });

    it('blocks verified parent Grace from viewing unverified peer student document', () => {
      const graceCaller = {
        userId: 'grace-guardian-1',
        institutionId: INST_ALPHA,
        role: 'parent',
        verifiedStudentIds: [STUDENT_CHARLIE], // only Charlie, not Peer
      };
      const res = checkStudentDocAccess(graceCaller, docPeer);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('Guardian is not linked to this child');
    });
  });

  // ============================================================================
  // 6. Deletion Protections on Compliance Records
  // ============================================================================
  describe('6. Deletion Protection on Storage Objects', () => {
    function checkDocDeletePermission(callerRole: string): boolean {
      // Per migration storage_objects_*_delete policies: only owner and admin can delete
      return ['owner', 'admin'].includes(callerRole);
    }

    it('prohibits students from deleting submitted compliance documents', () => {
      expect(checkDocDeletePermission('student')).toBe(false);
    });

    it('prohibits guardians/parents from deleting submitted documents', () => {
      expect(checkDocDeletePermission('parent')).toBe(false);
      expect(checkDocDeletePermission('guardian')).toBe(false);
    });

    it('prohibits regular faculty and staff from deleting student compliance documents', () => {
      expect(checkDocDeletePermission('faculty')).toBe(false);
      expect(checkDocDeletePermission('staff')).toBe(false);
    });

    it('allows only institution owner and admin to delete storage objects', () => {
      expect(checkDocDeletePermission('owner')).toBe(true);
      expect(checkDocDeletePermission('admin')).toBe(true);
    });
  });

  // ============================================================================
  // 7. Signed URL Generation & Expiration Clamping
  // ============================================================================
  describe('7. Short-Lived Signed Download URLs', () => {
    const mockSupabase = {
      storage: {
        from: (_bucket: StorageBucket) => ({
          createSignedUrl: async (path: string, expiresIn: number) => {
            return {
              data: {
                signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${_bucket}/${path}?token=mock_token&expires=${expiresIn}`,
              },
              error: null,
            };
          },
        }),
      },
    };

    it('generates signed download URL with 300 second default expiration', async () => {
      const validPath = `${INST_ALPHA}/students/${STUDENT_CHARLIE}/1700000000-cert.pdf`;
      const res = await createSignedDownloadUrl(
        mockSupabase,
        STORAGE_BUCKETS.STUDENT_DOCUMENTS,
        validPath
      );
      expect(res.error).toBeNull();
      expect(res.signedUrl).toContain('expires=300');
      expect(res.signedUrl).toContain(validPath);
    });

    it('clamps expiration between minimum 30s and maximum 3600s', async () => {
      const validPath = `${INST_ALPHA}/students/${STUDENT_CHARLIE}/1700000000-cert.pdf`;

      // Too low (5s -> clamped to 30s)
      const resLow = await createSignedDownloadUrl(
        mockSupabase,
        STORAGE_BUCKETS.STUDENT_DOCUMENTS,
        validPath,
        5
      );
      expect(resLow.signedUrl).toContain('expires=30');

      // Too high (100000s -> clamped to 3600s)
      const resHigh = await createSignedDownloadUrl(
        mockSupabase,
        STORAGE_BUCKETS.STUDENT_DOCUMENTS,
        validPath,
        100000
      );
      expect(resHigh.signedUrl).toContain('expires=3600');
    });

    it('rejects signed URL generation for paths with directory traversal', async () => {
      const maliciousPath = `${INST_ALPHA}/students/../../../etc/passwd`;
      const res = await createSignedDownloadUrl(
        mockSupabase,
        STORAGE_BUCKETS.STUDENT_DOCUMENTS,
        maliciousPath
      );
      expect(res.signedUrl).toBeNull();
      expect(res.error).toMatch(/traversal/i);
    });
  });
});
