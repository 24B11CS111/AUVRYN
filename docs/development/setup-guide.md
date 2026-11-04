# Developer Setup Guide

## 1. Prerequisites
- **Node.js**: v18+ or v20+ (tested on Node v24)
- **npm**: v10+ (tested on npm 11)
- **Git**
- **Supabase Account / Local CLI** (PostgreSQL instance with `uuid-ossp` and `pgcrypto`)

---

## 2. Installation

Clone repository and install dependencies across all workspaces:

```bash
git clone <repo-url>
cd School
npm install
```

---

## 3. Environment Configuration

Copy environment templates in both root and web app directories:

```bash
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
```

Configure your Supabase credentials:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. Database Setup & Migrations

Execute the initial migration script located at:
`packages/database/migrations/001_initial_schema.sql`

This script sets up:
- Custom domain enums (`institution_type`, `membership_role`, etc.)
- Tables: `profiles`, `institutions`, `institution_memberships`, `campuses`, `academic_years`, `academic_terms`, `audit_logs`
- Indexes for query optimization
- Security helper functions
- Atomic procedure `create_institution_with_owner`
- Row Level Security (RLS) policies for tenant isolation

---

## 5. Running the Applications

### 5.1 Web Application (Next.js)
```bash
npm run dev:web
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5.2 Mobile Application (Expo / React Native)
```bash
npm run dev:mobile
```

---

## 6. Testing & Quality Assurance

Run the automated test suite:
```bash
npm test
```

Perform type checking across all packages and applications:
```bash
npm run typecheck
```
