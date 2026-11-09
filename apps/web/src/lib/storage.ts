export const STORAGE_BUCKETS = {
  STUDENT_DOCUMENTS: 'student-documents',
  STAFF_DOCUMENTS: 'staff-documents',
  TRANSPORT_DOCUMENTS: 'transport-documents',
  ACADEMIC_DOCUMENTS: 'academic-documents',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export interface StorageBucketConfig {
  id: StorageBucket;
  maxSizeBytes: number;
  allowedMimeTypes: readonly string[];
  allowedExtensions: readonly string[];
  description: string;
}

export const STORAGE_BUCKET_CONFIGS: Record<StorageBucket, StorageBucketConfig> = {
  [STORAGE_BUCKETS.STUDENT_DOCUMENTS]: {
    id: STORAGE_BUCKETS.STUDENT_DOCUMENTS,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
    description: 'Private bucket for student compliance, identity, and academic record documents',
  },
  [STORAGE_BUCKETS.STAFF_DOCUMENTS]: {
    id: STORAGE_BUCKETS.STAFF_DOCUMENTS,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
    description: 'Private bucket for staff employment contracts, resumes, and HR verification files',
  },
  [STORAGE_BUCKETS.TRANSPORT_DOCUMENTS]: {
    id: STORAGE_BUCKETS.TRANSPORT_DOCUMENTS,
    maxSizeBytes: 15 * 1024 * 1024, // 15MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
    description: 'Private bucket for vehicle RC, insurance certificates, permits, and maintenance invoices',
  },
  [STORAGE_BUCKETS.ACADEMIC_DOCUMENTS]: {
    id: STORAGE_BUCKETS.ACADEMIC_DOCUMENTS,
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/epub+zip',
    ],
    allowedExtensions: [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.epub',
    ],
    description: 'Private bucket for assignments, study materials, library digital resources, and event certificates',
  },
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.dll',
  '.bat',
  '.cmd',
  '.sh',
  '.bin',
  '.vbs',
  '.ps1',
  '.msi',
  '.com',
  '.scr',
  '.pif',
  '.jar',
  '.jsp',
  '.php',
  '.asp',
  '.aspx',
];

/**
 * Sanitizes an uploaded file name to remove path traversal sequences,
 * control characters, and unsafe characters.
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return 'document.pdf';
  }

  // Strip path traversal attempts and directory separators
  let clean = fileName.replace(/[\/\\]/g, '_');
  clean = clean.replace(/\.\.+/g, '.');

  // Strip non-printable / control characters
  clean = clean.replace(/[\x00-\x1f\x80-\x9f]/g, '');

  // Strip leading dots and spaces
  clean = clean.replace(/^[\.\s]+/, '');

  // Allow only alphanumeric, dot, underscore, and hyphen
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Truncate length if unreasonably long (max 120 chars)
  if (clean.length > 120) {
    const ext = clean.substring(clean.lastIndexOf('.'));
    const base = clean.substring(0, 120 - ext.length);
    clean = `${base}${ext}`;
  }

  return clean || 'document.pdf';
}

/**
 * Generates an institution-scoped, standardized storage path:
 * Format: {institutionId}/{category}/{entityId}/{timestamp}-{sanitizedFileName}
 */
export function generateStoragePath(
  institutionId: string,
  category: 'students' | 'staff' | 'transport' | 'academic' | 'applications',
  entityId: string,
  fileName: string
): string {
  if (!UUID_REGEX.test(institutionId)) {
    throw new Error(`Invalid institution ID: "${institutionId}" is not a valid UUID.`);
  }

  if (!UUID_REGEX.test(entityId)) {
    throw new Error(`Invalid entity ID: "${entityId}" is not a valid UUID.`);
  }

  const validCategories = ['students', 'staff', 'transport', 'academic', 'applications'] as const;
  if (!validCategories.includes(category as any)) {
    throw new Error(`Invalid storage category: "${category}".`);
  }

  const sanitized = sanitizeFileName(fileName);
  const timestamp = Date.now();
  return `${institutionId}/${category}/${entityId}/${timestamp}-${sanitized}`;
}

export interface ParsedStoragePath {
  institutionId: string;
  category: string;
  entityId: string;
  fileName: string;
}

/**
 * Parses a storage path into its components, verifying UUID format.
 */
export function parseStoragePath(storagePath: string): ParsedStoragePath | null {
  if (!storagePath || typeof storagePath !== 'string') {
    return null;
  }

  if (storagePath.includes('..') || storagePath.startsWith('/') || storagePath.includes('\\')) {
    return null;
  }

  const parts = storagePath.split('/');
  if (parts.length < 4) {
    return null;
  }

  const institutionId = parts[0];
  const category = parts[1];
  const entityId = parts[2];
  const fileName = parts.slice(3).join('/');

  if (!institutionId || !category || !entityId || !fileName) {
    return null;
  }

  if (!UUID_REGEX.test(institutionId) || !UUID_REGEX.test(entityId)) {
    return null;
  }

  return {
    institutionId,
    category,
    entityId,
    fileName,
  };
}

/**
 * Validates a storage path against tenant isolation and path traversal attacks.
 */
export function validateStoragePath(
  storagePath: string,
  expectedInstitutionId?: string
): { valid: boolean; error?: string } {
  if (!storagePath || typeof storagePath !== 'string') {
    return { valid: false, error: 'Storage path is required.' };
  }

  if (storagePath.includes('..') || storagePath.includes('\\') || storagePath.startsWith('/')) {
    return { valid: false, error: 'Directory traversal detected in storage path.' };
  }

  const parsed = parseStoragePath(storagePath);
  if (!parsed) {
    return {
      valid: false,
      error: 'Storage path does not conform to required {institutionId}/{category}/{entityId}/{fileName} structure.',
    };
  }

  if (expectedInstitutionId && parsed.institutionId !== expectedInstitutionId) {
    return {
      valid: false,
      error: `Cross-tenant storage path violation: path belongs to institution ${parsed.institutionId}, expected ${expectedInstitutionId}.`,
    };
  }

  return { valid: true };
}

export interface FileUploadMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Validates an uploaded file's metadata against a bucket's size and MIME type restrictions.
 */
export function validateFileUpload(
  bucket: StorageBucket,
  file: FileUploadMetadata
): { valid: boolean; error?: string } {
  const config = STORAGE_BUCKET_CONFIGS[bucket];
  if (!config) {
    return { valid: false, error: `Unrecognized storage bucket: "${bucket}".` };
  }

  if (!file.fileName || typeof file.fileName !== 'string') {
    return { valid: false, error: 'File name is required.' };
  }

  if (!file.fileSize || file.fileSize <= 0) {
    return { valid: false, error: 'File must have a size greater than 0 bytes.' };
  }

  if (file.fileSize > config.maxSizeBytes) {
    const maxMb = (config.maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size (${(file.fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds bucket limit of ${maxMb} MB.`,
    };
  }

  const lowerName = file.fileName.toLowerCase();
  for (const dangerous of DANGEROUS_EXTENSIONS) {
    if (lowerName.endsWith(dangerous)) {
      return { valid: false, error: `Dangerous executable file type forbidden: "${dangerous}".` };
    }
  }

  // Check double extension attack e.g. "doc.pdf.exe"
  const dotParts = lowerName.split('.');
  if (dotParts.length > 2) {
    for (let i = 1; i < dotParts.length; i++) {
      if (DANGEROUS_EXTENSIONS.includes(`.${dotParts[i]}`)) {
        return { valid: false, error: 'Multi-extension executable payload detected and blocked.' };
      }
    }
  }

  const ext = lowerName.substring(lowerName.lastIndexOf('.'));
  if (!config.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension "${ext}" is not permitted for ${bucket}. Allowed: ${config.allowedExtensions.join(', ')}.`,
    };
  }

  if (!config.allowedMimeTypes.includes(file.mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `MIME type "${file.mimeType}" is not permitted for ${bucket}. Allowed: ${config.allowedMimeTypes.join(', ')}.`,
    };
  }

  return { valid: true };
}

/**
 * Creates a short-lived signed download URL for private bucket objects.
 * Default expiration is 300 seconds (5 minutes); maximum allowed is 3600 seconds (1 hour).
 */
export async function createSignedDownloadUrl(
  supabaseClient: any,
  bucket: StorageBucket,
  storagePath: string,
  expiresInSeconds: number = 300
): Promise<{ signedUrl: string | null; error: string | null }> {
  try {
    const pathValidation = validateStoragePath(storagePath);
    if (!pathValidation.valid) {
      return { signedUrl: null, error: pathValidation.error || 'Invalid storage path.' };
    }

    // Clamp expiration between 30 seconds and 3600 seconds (1 hour)
    const clampedExpiry = Math.min(Math.max(expiresInSeconds, 30), 3600);

    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .createSignedUrl(storagePath, clampedExpiry);

    if (error || !data?.signedUrl) {
      return {
        signedUrl: null,
        error: error?.message || 'Failed to generate signed download URL.',
      };
    }

    return { signedUrl: data.signedUrl, error: null };
  } catch (err: any) {
    return { signedUrl: null, error: err.message || 'Error creating signed URL.' };
  }
}
