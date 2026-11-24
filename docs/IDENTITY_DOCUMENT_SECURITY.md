# AUVRYN — Identity Document Security & Aadhaar Compliance

**Information Security Architecture & Legal Compliance Policy**  
**Module**: Identity Documents, Aadhaar Masking & Storage Security  
**Regulatory Standards**: Aadhaar Act 2016 (as amended), UIDAI Regulations, DPDP Act 2023  
**Status**: Production-Ready  

---

## 1. Statutory Compliance & Non-Negotiable Directives

In compliance with Supreme Court of India directives (*K.S. Puttaswamy v. Union of India*), UIDAI circulars on Aadhaar masking, and the Digital Personal Data Protection (DPDP) Act, 2023:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TEN SECURITY COMMANDMENTS                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. NEVER make full Aadhaar number submission mandatory.                │
│ 2. NEVER collect, process, or store Aadhaar biometrics (iris, finger). │
│ 3. NEVER store raw 12-digit unmasked Aadhaar numbers.                  │
│ 4. NEVER use Aadhaar numbers as database primary keys.                 │
│ 5. NEVER expose Aadhaar or private identity documents in public URLs.  │
│ 6. NEVER print unmasked identity documents on general reports.         │
│ 7. ALWAYS accept alternative official identity documents with parity.  │
│ 8. ALWAYS store identity uploads in strictly private storage buckets.  │
│ 9. ALWAYS access documents through short-lived, signed URLs.           │
│ 10. ALWAYS log an immutable audit trail for every document access.     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Layer Aadhaar Protection Architecture

AUVRYN employs an automated four-layer defense-in-depth model that prevents raw Aadhaar exposure before data can ever be stored:

```
[Layer 1: User Interface]
     └── Client-side regex & format mask: enforces "XXXX-XXXX-1234" or "1234".
         Rejects any raw 12-digit numeric input before form submission.
               │
               ▼
[Layer 2: Schema Validation (Zod)]
     └── packages/validators: identityDocumentSchema refinement.
         Regex test prohibits /^\d{12}$/ (including space-separated strings).
               │
               ▼
[Layer 3: Database Check Constraint (PostgreSQL)]
     └── supabase/migrations: CONSTRAINT chk_no_unmasked_aadhaar
         CHECK (masked_reference !~ '^[0-9]{12}$')
               │
               ▼
[Layer 4: Data Obfuscation & Logging Sanitization]
     └── Logs, APIs, and analytics never serialize or output document buffers.
```

---

## 3. Storage Architecture: Private Bucket `student-documents`

Identity documents are stored in an isolated Supabase storage bucket configured with zero public access:

```sql
-- Private Storage Bucket Isolation
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false, -- STRICTLY PRIVATE
  5242880, -- 5 MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = false;
```

### Storage File Path Conventions:
Documents follow an institution-partitioned structure:
```
student-documents/
  └── <institution_id>/
        ├── admissions/
        │     └── <application_id>/
        │           ├── <uuid>-birth_certificate.pdf
        │           └── <uuid>-masked_aadhaar.pdf
        └── students/
              └── <student_id>/
                    ├── <uuid>-passport.pdf
                    └── <uuid>-national_id.jpg
```

---

## 4. Cryptographic Access Control: Signed URLs

No direct URLs to documents exist. Any authorized inspection or download requires an ephemeral, cryptographically signed URL:

```typescript
// Server Action: createSignedDownloadUrl
const { data, error } = await supabase.storage
  .from('student-documents')
  .createSignedUrl(storagePath, 3600); // 1-Hour Ephemeral Expiry
```

### Access Lifecycle:
1. When an admissions officer opens the **Identity Verification Drawer**, the server verifies the caller's role (`owner`, `admin`, or `admissions_officer`).
2. If authorized, the server calls `createSignedUrl` with a **3,600-second (1 hour)** validity window.
3. The server synchronously records a `view` action in `public.identity_document_audit_logs`.
4. The client renders the document inside an embedded sandbox iframe or protected image tag.
5. Once the 1-hour window elapses, the signed URL becomes permanently invalid.

---

## 5. Immutable Audit Logging

Every interaction with a student identity document generates an immutable row in `public.identity_document_audit_logs`:

```sql
CREATE TABLE public.identity_document_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.student_identity_documents(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'view', 'download', 'verify', 'reject', 'delete'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

### Audit Properties:
- **Append-Only**: No UPDATE or DELETE policies are granted on `identity_document_audit_logs`.
- **Actor Attribution**: Stores the authenticated `auth.users(id)` and the caller's IP address.
- **Action Granularity**: Distinguishes between `view` (previewing in drawer), `download` (fetching raw binary), `verify` (marking verified), and `reject` (flagging invalid).

---

## 6. Retention, Archival & Purging Policies

1. **Rejected Applications**: Identity documents associated with rejected applications that are not appealed within 90 days are purged in accordance with the DPDP minimization mandate.
2. **Graduated / Alumni Students**: Upon graduation or transfer, digital document archives are placed in encrypted cold storage and deleted upon expiration of statutory academic record retention periods.
3. **Draft Applications**: Incomplete draft applications inactive for more than 45 days are scheduled for automated removal.
