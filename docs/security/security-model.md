# Security Model & Multi-Tenant Authorization

## 1. Security Architecture Principles

The security model is founded on a **defense-in-depth** strategy:
1. **Network & Session Boundary**: Encrypted TLS connections and secure, HTTP-only cookie-backed JWT sessions via `@supabase/ssr`.
2. **Application Boundary**: Next.js middleware and server-side route guards validating session authenticity and active membership status.
3. **Database Boundary**: PostgreSQL Row Level Security (RLS) policies guaranteeing that no database query can ever access or leak records outside the authenticated caller's active institutions.

---

## 2. Row Level Security (RLS) Policy Specifications

### 2.1 Helper Functions (Security Definer)
- `public.get_user_institution_ids()`: Returns table of institution IDs where the current authenticated user (`auth.uid()`) holds an active membership.
- `public.has_institution_role(p_institution_id UUID, p_roles membership_role[])`: Returns boolean indicating if `auth.uid()` has any of the specified roles in the target institution.
- `public.is_institution_member(p_institution_id UUID)`: Returns boolean confirming membership.

### 2.2 Table Policies
| Table | Operation | Allowed Roles / Scope | Enforcement Rule |
| :--- | :--- | :--- | :--- |
| `profiles` | SELECT | Self OR Shared Institution Members | `id = auth.uid() OR shares_active_institution()` |
| `profiles` | UPDATE | Self Only | `id = auth.uid()` |
| `institutions` | SELECT | Active Members | `id IN (SELECT institution_id FROM get_user_institution_ids())` |
| `institutions` | INSERT | Authenticated Users | Allowed (governed via `create_institution_with_owner`) |
| `institutions` | UPDATE | `owner`, `admin` | `has_institution_role(id, ARRAY['owner', 'admin'])` |
| `institutions` | DELETE | `owner` Only | `has_institution_role(id, ARRAY['owner'])` |
| `campuses` | SELECT | Active Members | `institution_id IN (SELECT get_user_institution_ids())` |
| `campuses` | ALL | `owner`, `admin` | `has_institution_role(institution_id, ARRAY['owner', 'admin'])` |
| `academic_years`| SELECT | Active Members | `institution_id IN (SELECT get_user_institution_ids())` |
| `academic_years`| ALL | `owner`, `admin`, `academic_admin` | `has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin'])` |
| `audit_logs` | SELECT | `owner`, `admin` | `has_institution_role(institution_id, ARRAY['owner', 'admin'])` |
| `audit_logs` | INSERT | Trigger / Server RPC | Immutable (UPDATE and DELETE are denied for all roles) |

---

## 3. Role-Based Access Control (RBAC) Hierarchy

| Permission | Owner | Admin | Academic Admin | Faculty | Staff | Student | Parent |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `institution:manage` | **Yes** | **Yes** | No | No | No | No | No |
| `institution:view` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |
| `members:manage` | **Yes** | **Yes** | No | No | No | No | No |
| `members:view` | **Yes** | **Yes** | **Yes** | **Yes** | No | No | No |
| `campuses:manage` | **Yes** | **Yes** | No | No | No | No | No |
| `campuses:view` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | No | No |
| `academics:manage` | **Yes** | **Yes** | **Yes** | No | No | No | No |
| `academics:view` | **Yes** | **Yes** | **Yes** | **Yes** | No | **Yes** | **Yes** |
| `audit:view` | **Yes** | **Yes** | No | No | No | No | No |
| `billing:manage` | **Yes** | No | No | No | No | No | No |

---

## 4. Verification and Automated Testing

Tenant isolation and access control invariants are verified through automated test suites:
- `tests/multi-tenant-isolation.test.ts`: Proves that a user belonging to Institution A cannot read, query, or mutate Institution B records.
- `tests/rbac-and-security.test.ts`: Proves role-based permissions and privilege boundaries.
- `tests/validators.test.ts`: Enforces strict data contracts and prevents parameter tampering.
