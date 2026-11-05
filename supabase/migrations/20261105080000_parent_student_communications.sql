-- ==============================================================================
-- MILESTONE 9: UNIVERSAL PARENT & STUDENT COMMUNICATION ECOSYSTEM
-- ==============================================================================
-- Migration: 20261105080000_parent_student_communications.sql
-- Rollback: rollback/20261105080000_rollback.sql

-- 1. Create Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_category') THEN
    CREATE TYPE notification_category AS ENUM (
      'attendance',
      'examinations',
      'results',
      'fees_payments',
      'admissions',
      'homework',
      'timetable',
      'leave',
      'transport',
      'announcements',
      'emergency',
      'general'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
    CREATE TYPE notification_channel AS ENUM (
      'in_app',
      'push',
      'email',
      'sms',
      'whatsapp'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
    CREATE TYPE notification_priority AS ENUM (
      'low',
      'normal',
      'high',
      'urgent'
    );
  END IF;

  -- Add new statuses to notification_delivery_status if needed
  ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'sending';
  ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'cancelled';

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_scope') THEN
    CREATE TYPE announcement_scope AS ENUM (
      'institution',
      'campus',
      'department',
      'program',
      'class',
      'section',
      'role',
      'individual'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_priority') THEN
    CREATE TYPE announcement_priority AS ENUM (
      'low',
      'standard',
      'important',
      'urgent'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_status') THEN
    CREATE TYPE announcement_status AS ENUM (
      'draft',
      'scheduled',
      'published',
      'archived'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_submission_status') THEN
    CREATE TYPE assignment_submission_status AS ENUM (
      'pending',
      'submitted',
      'late',
      'graded',
      'resubmit_requested'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_type') THEN
    CREATE TYPE conversation_type AS ENUM (
      'parent_teacher',
      'student_faculty',
      'admin_broadcast',
      'staff_internal'
    );
  END IF;
END $$;

-- 2. Central Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category notification_category NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'normal',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. Notification Deliveries (Outbox Queue)
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL DEFAULT 'in_app',
  destination TEXT,
  status notification_delivery_status NOT NULL DEFAULT 'pending',
  attempts_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_notification_delivery_idempotency UNIQUE (institution_id, idempotency_key)
);

-- 4. Notification Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category notification_category NOT NULL,
  enabled_channels notification_channel[] NOT NULL DEFAULT ARRAY['in_app']::notification_channel[],
  is_muted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_notification_preference_user_cat UNIQUE (institution_id, user_id, category)
);

-- 5. Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  category notification_category NOT NULL DEFAULT 'general',
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  supported_channels notification_channel[] NOT NULL DEFAULT ARRAY['in_app', 'email']::notification_channel[],
  variables TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_notification_template_code UNIQUE (institution_id, code)
);

-- 6. Push Device Tokens
CREATE TABLE IF NOT EXISTS public.push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android',
  app_version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.academic_departments(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.academic_programs(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.academic_classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.academic_sections(id) ON DELETE CASCADE,
  scope announcement_scope NOT NULL DEFAULT 'institution',
  target_roles membership_role[] NOT NULL DEFAULT '{}'::membership_role[],
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority announcement_priority NOT NULL DEFAULT 'standard',
  status announcement_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  requires_acknowledgement BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. Announcement Acknowledgements
CREATE TABLE IF NOT EXISTS public.announcement_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  acknowledged_at TIMESTAMPTZ,
  CONSTRAINT uq_announcement_ack_user UNIQUE (announcement_id, user_id)
);

-- 9. Homework Assignments
CREATE TABLE IF NOT EXISTS public.homework_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.academic_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
  faculty_staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  max_marks NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
  due_date DATE NOT NULL,
  due_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT '23:59:59',
  allow_late_submissions BOOLEAN NOT NULL DEFAULT true,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 10. Homework Submissions
CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.homework_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  submission_text TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  is_late BOOLEAN NOT NULL DEFAULT false,
  marks_obtained NUMERIC(6, 2),
  feedback TEXT,
  graded_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  status assignment_submission_status NOT NULL DEFAULT 'submitted',
  CONSTRAINT uq_homework_submission_student UNIQUE (assignment_id, student_id)
);

-- 11. Communication Threads
CREATE TABLE IF NOT EXISTS public.communication_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  conversation_type conversation_type NOT NULL DEFAULT 'parent_teacher',
  subject TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  initiator_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_reason TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 12. Communication Participants
CREATE TABLE IF NOT EXISTS public.communication_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role membership_role NOT NULL,
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_thread_participant UNIQUE (thread_id, user_id)
);

-- 13. Communication Messages
CREATE TABLE IF NOT EXISTS public.communication_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_moderated BOOLEAN NOT NULL DEFAULT false,
  moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  moderation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 14. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(institution_id, recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_queue ON public.notification_deliveries(status, attempts_count) WHERE status IN ('pending', 'queued');
CREATE INDEX IF NOT EXISTS idx_announcements_query ON public.announcements(institution_id, status, scope, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_homework_class ON public.homework_assignments(institution_id, class_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.homework_submissions(assignment_id, status);
CREATE INDEX IF NOT EXISTS idx_threads_institution ON public.communication_threads(institution_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread ON public.communication_messages(thread_id, created_at ASC);

-- 15. Stored Procedures

-- A. Atomic Notification Dispatch
CREATE OR REPLACE FUNCTION public.dispatch_notification_atomic(
  p_institution_id UUID,
  p_recipient_user_id UUID,
  p_category notification_category,
  p_title TEXT,
  p_body TEXT,
  p_priority notification_priority DEFAULT 'normal',
  p_data JSONB DEFAULT '{}'::jsonb,
  p_channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[],
  p_idempotency_key TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_delivery_count INT := 0;
  v_channel notification_channel;
  v_existing_id UUID;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT notification_id INTO v_existing_id
    FROM public.notification_deliveries
    WHERE institution_id = p_institution_id AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'duplicate', true,
        'notification_id', v_existing_id
      );
    END IF;
  END IF;

  -- 1. Insert central notification
  INSERT INTO public.notifications (
    institution_id,
    recipient_user_id,
    category,
    title,
    body,
    priority,
    data,
    created_by
  ) VALUES (
    p_institution_id,
    p_recipient_user_id,
    p_category,
    p_title,
    p_body,
    p_priority,
    COALESCE(p_data, '{}'::jsonb),
    p_created_by
  )
  RETURNING id INTO v_notification_id;

  -- 2. Insert delivery queue records
  FOREACH v_channel IN ARRAY p_channels
  LOOP
    INSERT INTO public.notification_deliveries (
      institution_id,
      notification_id,
      channel,
      status,
      idempotency_key
    ) VALUES (
      p_institution_id,
      v_notification_id,
      v_channel,
      'queued',
      CASE WHEN p_idempotency_key IS NOT NULL THEN p_idempotency_key || '_' || v_channel::text ELSE NULL END
    );
    v_delivery_count := v_delivery_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'notification_id', v_notification_id,
    'delivery_count', v_delivery_count
  );
END;
$$;

-- B. Atomic Homework Submission
CREATE OR REPLACE FUNCTION public.submit_homework_atomic(
  p_assignment_id UUID,
  p_student_id UUID,
  p_submission_text TEXT,
  p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment RECORD;
  v_is_late BOOLEAN := false;
  v_now TIMESTAMPTZ := timezone('utc', now());
  v_due_timestamp TIMESTAMPTZ;
  v_submission_id UUID;
BEGIN
  SELECT * INTO v_assignment
  FROM public.homework_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  v_due_timestamp := (v_assignment.due_date || ' ' || v_assignment.due_time)::timestamp AT TIME ZONE 'utc';

  IF v_now > v_due_timestamp THEN
    IF NOT v_assignment.allow_late_submissions THEN
      RAISE EXCEPTION 'Late submissions are disabled for this assignment';
    END IF;
    v_is_late := true;
  END IF;

  INSERT INTO public.homework_submissions (
    assignment_id,
    student_id,
    submission_text,
    attachments,
    submitted_at,
    is_late,
    status
  ) VALUES (
    p_assignment_id,
    p_student_id,
    p_submission_text,
    COALESCE(p_attachments, '[]'::jsonb),
    v_now,
    v_is_late,
    CASE WHEN v_is_late THEN 'late'::assignment_submission_status ELSE 'submitted'::assignment_submission_status END
  )
  ON CONFLICT (assignment_id, student_id) DO UPDATE SET
    submission_text = EXCLUDED.submission_text,
    attachments = EXCLUDED.attachments,
    submitted_at = EXCLUDED.submitted_at,
    is_late = EXCLUDED.is_late,
    status = EXCLUDED.status
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'is_late', v_is_late
  );
END;
$$;

-- C. Atomic Parent Child Leave Request
CREATE OR REPLACE FUNCTION public.submit_parent_child_leave_atomic(
  p_institution_id UUID,
  p_guardian_user_id UUID,
  p_student_id UUID,
  p_leave_type leave_type,
  p_start_date DATE,
  p_end_date DATE,
  p_reason TEXT,
  p_supporting_document_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_guardian BOOLEAN;
  v_leave_id UUID;
BEGIN
  -- Verify guardian linkage
  SELECT EXISTS (
    SELECT 1 FROM public.student_guardians sg
    JOIN public.guardians g ON g.id = sg.guardian_id
    WHERE sg.student_id = p_student_id
      AND g.user_id = p_guardian_user_id
      AND g.institution_id = p_institution_id
  ) INTO v_is_guardian;

  IF NOT v_is_guardian THEN
    RAISE EXCEPTION 'Unauthorized: User is not an active verified guardian of this student';
  END IF;

  -- Insert into existing leave_requests table
  INSERT INTO public.leave_requests (
    institution_id,
    applicant_type,
    student_id,
    leave_type,
    start_date,
    end_date,
    reason,
    supporting_document_url,
    status
  ) VALUES (
    p_institution_id,
    'student',
    p_student_id,
    p_leave_type,
    p_start_date,
    p_end_date,
    p_reason,
    p_supporting_document_url,
    'pending'
  )
  RETURNING id INTO v_leave_id;

  RETURN jsonb_build_object(
    'success', true,
    'leave_request_id', v_leave_id
  );
END;
$$;

-- 16. Enable Row-Level Security (RLS) on all tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;

-- 17. RLS Policies

-- Notifications: Users view only their own notifications
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (
    recipient_user_id = auth.uid() OR
    has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT WITH CHECK (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator', 'academic_admin', 'faculty', 'staff', 'accountant'])
  );

CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE USING (
    recipient_user_id = auth.uid() OR
    has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

-- Notification Deliveries: Admins only
CREATE POLICY notification_deliveries_all ON public.notification_deliveries
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

-- Notification Preferences: User own preferences
CREATE POLICY notification_preferences_select ON public.notification_preferences
  FOR SELECT USING (
    user_id = auth.uid() OR
    has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY notification_preferences_write ON public.notification_preferences
  FOR ALL USING (
    user_id = auth.uid() OR
    has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

-- Notification Templates: Members view, admins manage
CREATE POLICY notification_templates_select ON public.notification_templates
  FOR SELECT USING (is_institution_member(institution_id));

CREATE POLICY notification_templates_manage ON public.notification_templates
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin']));

-- Push Device Tokens: User manages own tokens
CREATE POLICY push_device_tokens_user ON public.push_device_tokens
  FOR ALL USING (user_id = auth.uid());

-- Announcements: Institution members view published announcements within scope
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT USING (
    status = 'published' AND is_institution_member(institution_id) OR
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'department_head'])
  );

CREATE POLICY announcements_manage ON public.announcements
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'department_head', 'faculty'])
  );

-- Announcement Acknowledgements
CREATE POLICY announcement_ack_select ON public.announcement_acknowledgements
  FOR SELECT USING (user_id = auth.uid() OR has_institution_role((SELECT institution_id FROM public.announcements WHERE id = announcement_id), ARRAY['owner', 'admin']));

CREATE POLICY announcement_ack_write ON public.announcement_acknowledgements
  FOR ALL USING (user_id = auth.uid());

-- Homework Assignments: Members view, faculty/admins manage
CREATE POLICY homework_assignments_select ON public.homework_assignments
  FOR SELECT USING (is_institution_member(institution_id));

CREATE POLICY homework_assignments_manage ON public.homework_assignments
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'faculty']));

-- Homework Submissions: Students own submissions, guardians of student, faculty/admin view
CREATE POLICY homework_submissions_select ON public.homework_submissions
  FOR SELECT USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    is_guardian_of_student(student_id) OR
    has_institution_role((SELECT institution_id FROM public.homework_assignments WHERE id = assignment_id), ARRAY['owner', 'admin', 'academic_admin', 'faculty'])
  );

CREATE POLICY homework_submissions_write ON public.homework_submissions
  FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    has_institution_role((SELECT institution_id FROM public.homework_assignments WHERE id = assignment_id), ARRAY['owner', 'admin', 'faculty'])
  );

-- Communication Threads: Participants view their threads
CREATE POLICY communication_threads_select ON public.communication_threads
  FOR SELECT USING (
    id IN (SELECT thread_id FROM public.communication_participants WHERE user_id = auth.uid()) OR
    has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY communication_threads_manage ON public.communication_threads
  FOR ALL USING (
    id IN (SELECT thread_id FROM public.communication_participants WHERE user_id = auth.uid()) OR
    has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

-- Communication Participants: Thread participants view
CREATE POLICY communication_participants_all ON public.communication_participants
  FOR ALL USING (
    user_id = auth.uid() OR
    thread_id IN (SELECT thread_id FROM public.communication_participants WHERE user_id = auth.uid()) OR
    has_institution_role((SELECT institution_id FROM public.communication_threads WHERE id = thread_id), ARRAY['owner', 'admin'])
  );

-- Communication Messages: Participants view and send messages
CREATE POLICY communication_messages_select ON public.communication_messages
  FOR SELECT USING (
    thread_id IN (SELECT thread_id FROM public.communication_participants WHERE user_id = auth.uid()) OR
    has_institution_role((SELECT institution_id FROM public.communication_threads WHERE id = thread_id), ARRAY['owner', 'admin'])
  );

CREATE POLICY communication_messages_insert ON public.communication_messages
  FOR INSERT WITH CHECK (
    sender_user_id = auth.uid() AND
    thread_id IN (SELECT thread_id FROM public.communication_participants WHERE user_id = auth.uid())
  );
