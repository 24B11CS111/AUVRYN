# Multi-Institution Education Management Platform

Production-ready, multi-tenant Education Management SaaS platform engineered for **Schools, Junior Colleges, Degree Colleges, Engineering Colleges, and Universities** with native Web and Mobile support.

---

## Architecture Highlights

- **Monorepo Architecture**: Clean separation of concerns with npm workspaces:
  - `apps/web`: Next.js 14 App Router, React, Tailwind CSS, Lucide Icons, SSR auth.
  - `apps/mobile`: React Native, Expo, SecureStore, unified auth state.
  - `packages/types`: Shared TypeScript contracts and domain models.
  - `packages/validators`: Shared Zod validation schemas for all mutations and forms.
  - `packages/database`: PostgreSQL schema DDL, RLS policies, migrations, and atomic stored procedures.
  - `packages/supabase-client`: Shared Supabase client configuration and error normalization.
- **Tenant Isolation**: Database-level isolation enforced via PostgreSQL Row Level Security (RLS) on all tenant-owned tables.
- **Single Identity, Multiple Institutions**: Users hold one identity and can participate in multiple institutions with distinct roles (`owner`, `admin`, `academic_admin`, `faculty`, `staff`, `student`, `parent`).
- **Atomic Onboarding**: High-integrity institutional registration executing as a single PostgreSQL transaction.
- **Zero Mock Data**: Dashboards display only real database records with structured, accessible empty states.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Start Development Server
```bash
npm run dev:web
```

---

## Documentation Links

- [System Architecture Specification](docs/architecture/system-architecture.md)
- [Database Design & Schema](docs/database/database-design.md)
- [Security Model & RLS Policies](docs/security/security-model.md)
- [Developer Setup Guide](docs/development/setup-guide.md)
