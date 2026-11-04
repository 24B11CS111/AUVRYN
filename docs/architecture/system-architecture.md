# System Architecture Specification

## 1. Overview
The Multi-Institution Education Management Platform is designed as an enterprise SaaS solution supporting multiple tiers of educational organizations:
- **K-12 Schools**
- **Junior Colleges / Pre-University (+2)**
- **Degree Colleges**
- **Engineering / Technical Colleges**
- **Universities**

The platform maintains absolute database-level multi-tenant isolation, unified identity across institutions, and a cross-platform foundation for Web (Next.js App Router) and Mobile (React Native / Expo).

---

## 2. Monorepo Organization (npm Workspaces)

```
├── apps/
│   ├── web/                    # Next.js 14 App Router (React, Tailwind CSS, SSR)
│   └── mobile/                 # React Native / Expo (SecureStore, Mobile Navigation)
├── packages/
│   ├── types/                  # Domain contracts (Institution, Role, Campus, AcademicYear)
│   ├── validators/             # Zod validation schemas (Auth, Onboarding, Membership)
│   ├── database/               # PostgreSQL schema DDL, RLS, functions, and DB types
│   └── supabase-client/        # Shared client configurations & error normalization
├── docs/                       # Architecture, database, security, and setup documentation
└── tests/                      # Automated unit, RBAC, and multi-tenant isolation tests
```

---

## 3. Core Architectural Principles

### 3.1 Tenant Isolation
Every institutional entity (`campuses`, `academic_years`, `academic_terms`, `audit_logs`, and future modules) is hard-keyed with an `institution_id` (foreign key referencing `institutions.id`).
Isolation is guaranteed at the PostgreSQL database layer via Row Level Security (RLS) rather than relying solely on application-level `WHERE` clauses.

### 3.2 Single Identity, Multi-Tenant Memberships
Users authenticate once with Supabase Auth (`auth.users`).
A user can belong to multiple institutions with distinct, independent roles:
- Example: A user can be the **Owner** of an engineering college and simultaneously a **Faculty** or **Parent** at a K-12 school.
- Roles and permissions are evaluated exclusively against the active institution context.
- Client-provided roles are never trusted. All permissions are verified on the server and in the database.

### 3.3 Atomic Institutional Provisioning
Institution onboarding occurs through a secure, atomic PostgreSQL stored procedure (`create_institution_with_owner`). Within a single transaction:
1. The institution record is inserted.
2. The caller is granted the `owner` role in `institution_memberships`.
3. The initial central campus is created.
4. The first active academic calendar session is established.
5. An immutable audit record is logged.

If any step fails, the entire transaction rolls back, preventing orphaned institutions or headless accounts.

---

## 4. Web Application Architecture (Next.js App Router)

- **Server-Side Authentication**: Employs `@supabase/ssr` with secure HTTP-only cookies.
- **Middleware**: Intercepts requests, refreshes auth tokens, protects `/dashboard/*` and `/onboarding`, and redirects unauthenticated requests.
- **Server Actions**: Mutations (e.g. `submitOnboarding`) execute on the server, enforcing Zod schema validation and calling atomic database procedures.
- **Zero Mock Data Principle**: Dashboards and management tables query real database records and render structured empty states when data has not yet been populated.

---

## 5. Mobile Application Architecture (Expo / React Native)

- **Secure Session Storage**: Uses `expo-secure-store` on iOS and Android (and localStorage on Web) as a persistent JWT storage adapter for Supabase.
- **Shared Codebase**: Directly imports `@edu-platform/validators`, `@edu-platform/types`, and `@edu-platform/database` from the monorepo packages, preventing business logic drift.
- **Role-Aware UI**: Adapts views, banners, and operational controls based on the user's active membership role.
