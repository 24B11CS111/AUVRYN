# Database Design & Schema Specification

## 1. Relational Model & Entity Relationships

The PostgreSQL database architecture is designed with tenant isolation at its core:

```
[auth.users] (Supabase Auth)
      |
      | 1:1
      v
[public.profiles]
      |
      | 1:N
      v
[public.institution_memberships]  <---- N:1 ----  [public.institutions]
      |                                                   |
      | (Role & Permissions)                              +--- 1:N ---> [public.campuses]
                                                          +--- 1:N ---> [public.academic_years]
                                                          |                     |
                                                          |                     +--- 1:N ---> [public.academic_terms]
                                                          |
                                                          +--- 1:N ---> [public.audit_logs]
```

---

## 2. Table Specifications

### 2.1 `public.profiles`
Stores extended user profile metadata linked 1:1 with `auth.users`.
- `id` (UUID, Primary Key, Foreign Key to `auth.users(id)` ON DELETE CASCADE)
- `email` (TEXT, NOT NULL)
- `full_name` (TEXT, NOT NULL)
- `avatar_url` (TEXT, Nullable)
- `phone` (TEXT, Nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.2 `public.institutions`
The tenant root entity.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `name` (TEXT, NOT NULL)
- `slug` (TEXT, UNIQUE, NOT NULL)
- `code` (TEXT, UNIQUE, NOT NULL)
- `type` (`institution_type` ENUM: `school`, `junior_college`, `degree_college`, `engineering_college`, `university`)
- `status` (`institution_status` ENUM: `active`, `pending_verification`, `suspended`, `archived`)
- `logo_url`, `website`, `email`, `phone`, `address` (TEXT, Nullable)
- `city`, `state`, `country` (TEXT, NOT NULL)
- `postal_code` (TEXT, Nullable)
- `settings` (JSONB, NOT NULL, Default: `{}`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.3 `public.institution_memberships`
Binds users to institutions and associates their roles and permissions.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `institution_id` (UUID, Foreign Key to `institutions(id)` ON DELETE CASCADE)
- `user_id` (UUID, Foreign Key to `profiles(id)` ON DELETE CASCADE)
- `role` (`membership_role` ENUM: `owner`, `admin`, `academic_admin`, `faculty`, `staff`, `student`, `parent`)
- `permissions` (TEXT[] DEFAULT `{}`)
- `status` (`membership_status` ENUM: `active`, `invited`, `suspended`, `revoked`)
- `title` (TEXT, Nullable, e.g. "Head of Computer Science")
- `department` (TEXT, Nullable)
- `joined_at`, `created_at`, `updated_at` (TIMESTAMPTZ)
- **Constraint**: `UNIQUE(institution_id, user_id)`

### 2.4 `public.campuses`
Represents physical or satellite campuses belonging to an institution.
- `id` (UUID, Primary Key)
- `institution_id` (UUID, Foreign Key to `institutions(id)` ON DELETE CASCADE)
- `name` (TEXT, NOT NULL)
- `code` (TEXT, NOT NULL)
- `is_primary` (BOOLEAN, Default: `false`)
- `address`, `city`, `state`, `country`, `postal_code`, `phone`, `email`
- **Constraint**: `UNIQUE(institution_id, code)`

### 2.5 `public.academic_years` & `academic_terms`
Maintains academic calendars, semesters, and sessions.
- `academic_years`: `id`, `institution_id`, `name`, `code`, `start_date`, `end_date`, `is_current`, `term_system` (`semester`, `trimester`, `annual`)
- `academic_terms`: `id`, `academic_year_id`, `institution_id`, `name`, `code`, `start_date`, `end_date`, `is_current`

### 2.6 `public.audit_logs`
Immutable audit ledger recording operational and security actions.
- `id` (UUID, Primary Key)
- `institution_id` (UUID, Foreign Key to `institutions(id)` ON DELETE CASCADE)
- `actor_user_id` (UUID, Foreign Key to `profiles(id)` ON DELETE SET NULL)
- `action` (TEXT, NOT NULL, e.g. `institution.created`, `member.invited`)
- `entity_type` (TEXT, NOT NULL)
- `entity_id` (TEXT, Nullable)
- `metadata` (JSONB, Default: `{}`)
- `ip_address`, `user_agent` (TEXT, Nullable)
- `created_at` (TIMESTAMPTZ, NOT NULL)

---

## 3. Database Indexes

- `idx_institutions_slug` on `institutions(slug)`
- `idx_memberships_user_id` on `institution_memberships(user_id)`
- `idx_memberships_institution_id` on `institution_memberships(institution_id)`
- `idx_memberships_status` on `institution_memberships(status)`
- `idx_campuses_institution_id` on `campuses(institution_id)`
- `idx_academic_years_institution_id` on `academic_years(institution_id)`
- `idx_audit_logs_institution_id` on `audit_logs(institution_id, created_at DESC)`
