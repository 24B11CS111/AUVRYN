# Architecture Decision Records (ADRs)

**Project:** Multi-Institution Education Management Platform  
**Status:** Approved & Implemented  

---

## ADR-001: Monorepo Architecture with npm Workspaces

### Context
The platform requires a Web application (Next.js), a Mobile application (Expo/React Native), and shared domain logic (TypeScript types, Zod validators, database definitions, Supabase client abstractions).

### Decision
Use native **npm workspaces** with a flat `packages/*` and `apps/*` directory structure:
- `packages/types`: Shared domain contracts.
- `packages/validators`: Shared Zod validation schemas.
- `packages/database`: PostgreSQL schema definitions, table constants, typed row aliases.
- `packages/supabase-client`: Client configuration and error formatting.
- `apps/web`: Next.js 14 App Router application.
- `apps/mobile`: React Native / Expo application.

### Consequences
- **Positive:** Single dependency tree, zero logic duplication between web and mobile, immediate type-safety propagation across apps, simplified CI/CD.
- **Negative:** Requires package transpilation in `apps/web/next.config.mjs` (`transpilePackages`).

---

## ADR-002: Multi-Tenant Isolation via PostgreSQL Row Level Security (RLS)

### Context
The platform serves schools, junior colleges, degree colleges, engineering institutes, and universities. Tenant data leakage would be catastrophic for compliance and security.

### Decision
Implement a **shared database, shared schema** multi-tenant architecture with mandatory PostgreSQL Row Level Security (RLS) on all tenant-owned tables:
- Every tenant record is foreign-keyed to `institution_id`.
- The database enforces `USING (institution_id IN (SELECT institution_id FROM public.get_user_institution_ids()))`.
- RLS policies are enabled on all tables.
- Table mutation policies enforce role hierarchies and prevent cross-tenant modification.

### Consequences
- **Positive:** Infrastructure cost efficiency, single migration lifecycle, database-level guarantee that application bugs in `WHERE` clauses cannot leak tenant data.
- **Negative:** Requires strict discipline to avoid mutual recursion in RLS policies (resolved via `SECURITY DEFINER` helpers with `SET search_path = public`).

---

## ADR-003: Single Identity with Multi-Tenant Memberships

### Context
Users (e.g. educators, administrators, parents) often interact with more than one institution (e.g., an administrator of an engineering college who is also a parent of a school student).

### Decision
Decouple identity (`auth.users` + `public.profiles`) from authorization:
- A user authenticates once with their email address.
- Institutional affiliations are stored in `public.institution_memberships`.
- Each membership grants a specific `role` (`owner`, `admin`, `academic_admin`, `faculty`, `staff`, `student`, `parent`) within that institution.
- Roles are evaluated strictly within the active institution context.
- Client-provided roles are never trusted.

### Consequences
- **Positive:** Seamless single sign-on across institutions, no redundant accounts for users with multi-institution roles.
- **Negative:** The application must maintain an active institution context switcher.

---

## ADR-004: Atomic Institutional Onboarding via Stored Procedure

### Context
Creating an institution involves multiple relational records: the institution, the owner membership, the primary campus, the initial academic calendar session, and an audit log entry. If any step fails halfway through, the database would be left in an inconsistent or orphaned state.

### Decision
Implement `public.create_institution_with_owner(...)` as an atomic PostgreSQL stored procedure (`plpgsql` with `SECURITY DEFINER`):
- Executes inside a single transaction.
- If any insert fails, the transaction rolls back completely.
- Direct client `INSERT` into `public.institutions` is disabled via RLS (`WITH CHECK (false)`), forcing all creations through this procedure.

### Consequences
- **Positive:** Guarantees zero orphaned institutions and prevents headless accounts.
- **Negative:** Business logic for initial institutional structure lives in PostgreSQL rather than purely in application code.

---

## ADR-005: Next.js App Router with Server-Side Cookie Authentication

### Context
Authentication tokens stored in client-side `localStorage` are vulnerable to Cross-Site Scripting (XSS) and cannot be inspected on the server during initial page rendering.

### Decision
Adopt Next.js 14 App Router with `@supabase/ssr` utilizing secure HTTP-only cookies:
- Server Components render HTML pre-authenticated on the server.
- Middleware (`middleware.ts`) refreshes JWT sessions on each request.
- Route guards (`requireAuth()`, `requireInstitution()`) execute on the server, redirecting unauthorized users before HTML is streamed.

### Consequences
- **Positive:** Immunity against XSS token theft, zero layout shift on initial load, high SEO performance.
- **Negative:** Requires handling cookie stores in Server Components and Server Actions.

---

## ADR-006: Mobile Navigation Architecture & Session Controller

### Context
In React Native / Expo applications, session expiry or revocation must immediately unmount protected dashboard views without navigation race conditions or state desynchronization.

### Decision
Implement a reactive session controller in `apps/mobile/App.tsx`:
- Listens to `supabase.auth.onAuthStateChange`.
- Uses `expo-secure-store` as an encrypted persistent storage adapter.
- Dynamically swaps between the Auth Stack (`LoginScreen`, `RegisterScreen`) and Authenticated Dashboard (`DashboardScreen`).

### Evaluation of File-Based Expo Router
- **Status:** Evaluated and deferred for business module expansion.
- **Rationale:** The current reactive session router guarantees that upon token invalidation, the dashboard unmounts synchronously. When nested mobile sub-modules (e.g. Attendance, Gradebook, Fees) are introduced, `expo-router` can be introduced using `app/(auth)` and `app/(app)` route groups with `useSegments()`.

---

## ADR-007: Authoritative Migrations via Supabase CLI

### Context
Database migrations must be version-controlled, repeatable, and compatible with automated CI/CD and Supabase local development workflows.

### Decision
Standardize on `supabase/migrations/` as the single authoritative migration repository:
- Canonical schema: `supabase/migrations/20261105000000_initial_schema.sql`.
- Rollback script: `supabase/migrations/rollback/20261105000000_rollback.sql`.
- Configuration: `supabase/config.toml`.
- Remove all duplicate migrations from `packages/database/migrations/`.

### Consequences
- **Positive:** 100% compatibility with `supabase db reset`, `supabase db push`, and `supabase test db`.
- **Negative:** Developers must run migrations through Supabase CLI or `psql`.

---

## ADR-008: Zero Mock Data Principle

### Context
Displaying hardcoded or fabricated statistics creates false security and masks real database query failures.

### Decision
All dashboards, metrics cards, campuses lists, member tables, and audit logs display real data queried from PostgreSQL:
- Empty states are rendered with actionable setup guides when data has not yet been populated.
- No placeholder statistics or simulated records are shown.

### Consequences
- **Positive:** High fidelity, immediate detection of database or query bugs.
- **Negative:** Initial dashboards appear empty until institutional records are created.
