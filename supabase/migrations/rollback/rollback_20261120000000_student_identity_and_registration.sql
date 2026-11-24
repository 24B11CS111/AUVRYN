-- ==============================================================================
-- ROLLBACK: 20261120000000_student_identity_and_registration.sql
-- ==============================================================================

DROP TABLE IF EXISTS public.identity_document_audit_logs CASCADE;
DROP TABLE IF EXISTS public.student_consent_records CASCADE;
DROP TABLE IF EXISTS public.student_emergency_contacts CASCADE;
DROP TABLE IF EXISTS public.student_identity_documents CASCADE;

ALTER TABLE public.guardians
  DROP COLUMN IF EXISTS relationship_type,
  DROP COLUMN IF EXISTS phone_secondary,
  DROP COLUMN IF EXISTS employer,
  DROP COLUMN IF EXISTS annual_income_range,
  DROP COLUMN IF EXISTS education_qualification,
  DROP COLUMN IF EXISTS workplace_address,
  DROP COLUMN IF EXISTS preferred_communication_channel,
  DROP COLUMN IF EXISTS preferred_language,
  DROP COLUMN IF EXISTS portal_access_required,
  DROP COLUMN IF EXISTS phone_verified,
  DROP COLUMN IF EXISTS email_verified,
  DROP COLUMN IF EXISTS verification_status;

ALTER TABLE public.students
  DROP COLUMN IF EXISTS education_type,
  DROP COLUMN IF EXISTS admission_category,
  DROP COLUMN IF EXISTS preferred_name,
  DROP COLUMN IF EXISTS mother_tongue,
  DROP COLUMN IF EXISTS second_language,
  DROP COLUMN IF EXISTS religion,
  DROP COLUMN IF EXISTS caste_category,
  DROP COLUMN IF EXISTS birthplace_city,
  DROP COLUMN IF EXISTS birthplace_state,
  DROP COLUMN IF EXISTS birthplace_country,
  DROP COLUMN IF EXISTS identification_mark_1,
  DROP COLUMN IF EXISTS identification_mark_2,
  DROP COLUMN IF EXISTS medical_alerts,
  DROP COLUMN IF EXISTS special_needs,
  DROP COLUMN IF EXISTS transport_required,
  DROP COLUMN IF EXISTS hostel_required,
  DROP COLUMN IF EXISTS sibling_info;

ALTER TABLE public.admission_applications
  DROP COLUMN IF EXISTS education_type,
  DROP COLUMN IF EXISTS admission_category,
  DROP COLUMN IF EXISTS preferred_name,
  DROP COLUMN IF EXISTS mother_tongue,
  DROP COLUMN IF EXISTS second_language,
  DROP COLUMN IF EXISTS religion,
  DROP COLUMN IF EXISTS caste_category,
  DROP COLUMN IF EXISTS birthplace_city,
  DROP COLUMN IF EXISTS birthplace_state,
  DROP COLUMN IF EXISTS birthplace_country,
  DROP COLUMN IF EXISTS identification_mark_1,
  DROP COLUMN IF EXISTS identification_mark_2,
  DROP COLUMN IF EXISTS medical_alerts,
  DROP COLUMN IF EXISTS special_needs,
  DROP COLUMN IF EXISTS transport_required,
  DROP COLUMN IF EXISTS transport_pickup_stop,
  DROP COLUMN IF EXISTS transport_drop_stop,
  DROP COLUMN IF EXISTS hostel_required,
  DROP COLUMN IF EXISTS hostel_room_preference,
  DROP COLUMN IF EXISTS sibling_info,
  DROP COLUMN IF EXISTS is_draft,
  DROP COLUMN IF EXISTS draft_access_token;

DROP TYPE IF EXISTS emergency_contact_priority;
DROP TYPE IF EXISTS guardian_relationship_type;
DROP TYPE IF EXISTS admission_category;
DROP TYPE IF EXISTS consent_type;
DROP TYPE IF EXISTS identity_verification_status;
DROP TYPE IF EXISTS identity_document_type;
