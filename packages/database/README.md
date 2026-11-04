# Database Package (`@edu-platform/database`)

This package provides generated TypeScript definitions, table names, and typed row aliases (`ProfileRow`, `InstitutionRow`, `MembershipRow`, `CampusRow`, `AcademicYearRow`, `AuditLogRow`) for client and server code.

## Authoritative Database Migrations

In accordance with Supabase standards, the single authoritative source of truth for PostgreSQL migrations is located at:
`supabase/migrations/`

- Forward migration: `supabase/migrations/20261105000000_initial_schema.sql`
- Rollback migration: `supabase/migrations/rollback/20261105000000_rollback.sql`
- CLI Config: `supabase/config.toml`
