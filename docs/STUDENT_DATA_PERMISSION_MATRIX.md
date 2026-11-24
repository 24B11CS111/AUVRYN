# AUVRYN — Student Data & Identity Permission Matrix

**Access Control Specification & Role-Based Authorization Guide**  
**Module**: RBAC, Row-Level Security (RLS) & Confidentiality Boundaries  
**Status**: Production-Ready  

---

## 1. Overview & Role Definitions

AUVRYN enforces zero-trust, role-based data partitioning. Even within an educational institution, not all staff members have the need or legal authorization to view sensitive personal identity documents or confidential medical histories.

### The 7 Platform Roles:
1. **Institution Owner (`owner`)**: Executive administrator with full institutional governance authority.
2. **Institution Admin (`admin`)**: Operational administrator managing campus facilities, admissions, and records.
3. **Admissions Officer (`admissions_officer`)**: Authorized admissions personnel holding the specific `admissions.verify_documents` capability.
4. **Teacher / Faculty (`faculty`)**: Instructional staff managing classroom instruction, attendance, marks, and student learning.
5. **Parent / Guardian (`guardian`)**: Verified legal guardian or custodial parent linked to specific enrolled student(s).
6. **Student (`student`)**: Enrolled student accessing their own academic record, timetable, and study materials.
7. **HRIX Platform Administrator (`hrix_admin`)**: Global infrastructure operator managing tenants, platform health, and billing.

---

## 2. Granular Data & Feature Permission Matrix

| Data Entity / Operation | Owner | Admin | Admissions Officer | Teacher / Faculty | Parent / Guardian | Student | HRIX Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admission Applications (Create/Draft)** | Full | Full | Full | ❌ No | Own Only | Own (Uni) | ❌ No |
| **Admission Applications (View All)** | Full | Full | Full | ❌ No | Own Only | Own (Uni) | ❌ No (Tenant Isolated) |
| **Identity Documents (View/Signed URL)** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ **DENIED** | Own Child | Own Only | ❌ **DENIED** |
| **Identity Documents (Verify / Reject)** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Identity Document Audit Logs** | ✅ View | ✅ View | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No (Tenant Isolated) |
| **Personal Demographics (Name, DOB)** | Full | Full | Full | Read Enrolled | Own Child | Own Only | ❌ No |
| **Residential Address** | Full | Full | Full | ❌ No | Own Child | Own Only | ❌ No |
| **Sensitive Medical Alerts & Diet** | Full | Full | Read-Only | Read Enrolled | Own Child | Own Only | ❌ No |
| **Emergency Contacts (View)** | Full | Full | Full | Read Enrolled | Own Child | Own Only | ❌ No |
| **Emergency Contacts (Update)** | Full | Full | Full | ❌ No | Own Child | ❌ No | ❌ No |
| **Authorized Pickups (Manage)** | Full | Full | Full | View Enrolled | Own Child | ❌ No | ❌ No |
| **DPDP Consents (View)** | Full | Full | Full | ❌ No | Own Child | Own Only | ❌ No |
| **DPDP Consents (Withdraw Media)** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Can Withdraw | ❌ No | ❌ No |
| **Academic Records (Grades, Exams)** | Full | Full | ❌ No | Class Scope | Own Child | Own Only | ❌ No |
| **Convert Application to Enrolled Student**| ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |

*Note: "Read Enrolled" allows teachers to see contact/medical details solely for students actively assigned to their classes or timetable periods.*

---

## 3. Critical Security Boundaries

### 3.1 Faculty Identity Isolation
> **Hard Security Rule**: Teachers and faculty members are **STRICTLY BLOCKED** from accessing identity documents (Aadhaar cards, passports, birth certificates, voter IDs).

- **Rationale**: Teachers require access to student names, attendance records, academic assignments, and emergency contact phone numbers for classroom management. However, possessing student national identity cards or parent tax/identity documents violates the principle of data minimization (DPDP Act Section 6).
- **Enforcement**: In PostgreSQL RLS on `public.student_identity_documents`, faculty roles are omitted from `public.has_institution_role()` policies, returning empty query results (`[]`).

---

### 3.2 HRIX Platform Administrator Isolation
> **Hard Security Rule**: HRIX Platform Administrators have **NO AUTOMATIC ACCESS** to student identity documents or personal demographic databases.

- **Rationale**: Platform admins maintain server health, database migrations, compute scaling, and payment gateway health. Tenant data is isolated through tenant separation, and platform staff cannot browse student files or download identity records without explicit, logged emergency data access protocols.
- **Enforcement**: Application code, Supabase policies, and private bucket policies restrict access to tenant institution memberships (`public.has_institution_role(institution_id, ...)`).

---

### 3.3 Parent-to-Parent Cross-Tenant & Cross-Student Isolation
> **Hard Security Rule**: A verified parent can **ONLY** view records of children explicitly linked via `public.student_guardians`.

- **Rationale**: In multi-family environments, viewing other students' residential addresses, photos, or identity proofs constitutes a critical privacy breach.
- **Enforcement**:
  ```sql
  CREATE POLICY "Guardians can view identity docs of their children"
    ON public.student_identity_documents
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.student_guardians sg
        JOIN public.guardians g ON g.id = sg.guardian_id
        WHERE g.user_id = auth.uid()
          AND sg.student_id = student_identity_documents.student_id
      )
    );
  ```

---

## 4. Permission Flag Reference

| Permission Key | Description | Typical Assignees |
| :--- | :--- | :--- |
| `admissions.view` | View admission applications list and status overview | Owner, Admin, Admissions Officer |
| `admissions.create` | Create a new admission application or enter offline forms | Owner, Admin, Admissions Officer |
| `admissions.verify_documents` | Open Identity Verification Drawer, generate signed URLs, approve/reject identity documents | Owner, Admin, Admissions Officer |
| `admissions.approve_application`| Formally approve admission application and trigger student conversion | Owner, Admin, Admissions Officer |
| `admissions.request_docs` | Request missing or amended documents from parents | Owner, Admin, Admissions Officer |
| `guardians.link_account` | Link an existing parent user account to a student record | Owner, Admin |
| `students.view_emergency` | View emergency medical notes and contact numbers for campus safety | Owner, Admin, Faculty |
| `consents.withdraw_media` | Withdraw optional photo/media or non-essential communication consent | Parent / Guardian |
