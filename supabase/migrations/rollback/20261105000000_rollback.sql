-- ==============================================================================
-- ROLLBACK SCRIPT: 20261105000000_rollback.sql
-- Reverses 20261105000000_initial_schema.sql in strict reverse dependency order
-- ==============================================================================

-- 1. Drop Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop Functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_institution_with_owner(
  TEXT, TEXT, TEXT, institution_type, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, term_system
);
DROP FUNCTION IF EXISTS public.log_institution_audit_event(UUID, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.shares_active_institution_with(UUID);
DROP FUNCTION IF EXISTS public.is_institution_owner(UUID);
DROP FUNCTION IF EXISTS public.is_institution_member(UUID);
DROP FUNCTION IF EXISTS public.has_institution_role(UUID, membership_role[]);
DROP FUNCTION IF EXISTS public.get_user_institution_ids();

-- 3. Drop Tables (in foreign key dependency order)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.academic_terms CASCADE;
DROP TABLE IF EXISTS public.academic_years CASCADE;
DROP TABLE IF EXISTS public.campuses CASCADE;
DROP TABLE IF EXISTS public.institution_memberships CASCADE;
DROP TABLE IF EXISTS public.institutions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 4. Drop Custom Enums
DROP TYPE IF EXISTS term_system;
DROP TYPE IF EXISTS membership_status;
DROP TYPE IF EXISTS membership_role;
DROP TYPE IF EXISTS institution_status;
DROP TYPE IF EXISTS institution_type;
