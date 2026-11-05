-- ==============================================================================
-- Milestone 8: Universal Fees & Payments Management
-- Migration: 20261105070000_fees_payments.sql
-- Description: Universal fee heads, fee structures, student fee assignments,
-- multi-head/installment allocations, scholarships/concessions with approval workflows,
-- payment collection, collision-proof receipt numbering, immutable financial ledger,
-- refunds/reversals, and payment gateway abstraction.
-- ==============================================================================

-- 1. ENUMS
-- ------------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE fee_category AS ENUM (
    'tuition',
    'admission',
    'registration',
    'examination',
    'laboratory',
    'library',
    'transport',
    'hostel',
    'fine',
    'deposit',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fee_payment_method AS ENUM (
    'cash',
    'upi',
    'bank_transfer',
    'card',
    'payment_gateway',
    'cheque',
    'demand_draft',
    'advance_wallet'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fee_payment_status AS ENUM (
    'pending',
    'completed',
    'reconciled',
    'reversed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fee_assignment_status AS ENUM (
    'pending',
    'partial',
    'paid',
    'overdue',
    'waived',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fee_installment_status AS ENUM (
    'pending',
    'partial',
    'paid',
    'overdue',
    'waived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE concession_type AS ENUM (
    'merit_scholarship',
    'need_based',
    'sibling_discount',
    'staff_child',
    'sports_quota',
    'institutional_waiver',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE concession_calculation_type AS ENUM (
    'percentage',
    'fixed_amount'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE concession_status AS ENUM (
    'requested',
    'under_review',
    'approved',
    'rejected',
    'revoked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM (
    'requested',
    'under_review',
    'approved',
    'rejected',
    'processed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE financial_ledger_entry_type AS ENUM (
    'charge',
    'payment',
    'concession',
    'penalty',
    'reversal',
    'refund',
    'advance_credit',
    'advance_debit'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE gateway_order_status AS ENUM (
    'created',
    'authorized',
    'captured',
    'failed',
    'refunded',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. Institution Fee Settings (Receipt Prefix, Invoicing, Gateway Config)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.institution_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL UNIQUE REFERENCES public.institutions(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  receipt_prefix TEXT NOT NULL DEFAULT 'RCP',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  last_receipt_seq BIGINT NOT NULL DEFAULT 0,
  last_invoice_seq BIGINT NOT NULL DEFAULT 0,
  late_fee_enabled BOOLEAN NOT NULL DEFAULT false,
  late_fee_daily_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  grace_period_days INTEGER NOT NULL DEFAULT 0,
  terms_and_conditions TEXT,
  gateway_provider TEXT DEFAULT 'razorpay',
  gateway_key_id TEXT,
  gateway_webhook_secret TEXT,
  is_gateway_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_fee_settings_institution ON public.institution_fee_settings(institution_id);

-- ==============================================================================
-- 3. Fee Heads
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fee_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  category fee_category NOT NULL DEFAULT 'tuition',
  description TEXT,
  is_refundable BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_fee_head_code_institution UNIQUE (institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_fee_heads_institution ON public.fee_heads(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_heads_category ON public.fee_heads(institution_id, category);

-- ==============================================================================
-- 4. Reusable Fee Structures & Items
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.academic_programs(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.academic_classes(id) ON DELETE SET NULL,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  student_category TEXT DEFAULT 'general',
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_fee_structure_code_institution UNIQUE (institution_id, code),
  CONSTRAINT chk_fee_structure_positive CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_inst ON public.fee_structures(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_ay ON public.fee_structures(institution_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class ON public.fee_structures(institution_id, class_id);

CREATE TABLE IF NOT EXISTS public.fee_structure_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  fee_structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  fee_head_id UUID NOT NULL REFERENCES public.fee_heads(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_fee_structure_item_amount CHECK (amount >= 0),
  CONSTRAINT uq_fee_structure_item UNIQUE (fee_structure_id, fee_head_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_structure_items_struct ON public.fee_structure_items(fee_structure_id);

CREATE TABLE IF NOT EXISTS public.fee_structure_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  fee_structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  due_days_offset INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_installment_percentage CHECK (percentage > 0 AND percentage <= 100),
  CONSTRAINT uq_fee_structure_installment UNIQUE (fee_structure_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_fee_structure_installments_struct ON public.fee_structure_installments(fee_structure_id);

-- ==============================================================================
-- 5. Student Fee Assignments & Installments
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_fee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  base_amount NUMERIC(12,2) NOT NULL,
  concession_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  fine_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_payable_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  outstanding_balance NUMERIC(12,2) NOT NULL,
  status fee_assignment_status NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_fee_assignment_invoice UNIQUE (institution_id, invoice_number),
  CONSTRAINT chk_assignment_base_positive CHECK (base_amount >= 0),
  CONSTRAINT chk_assignment_balance CHECK (outstanding_balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_fee_assignments_inst ON public.student_fee_assignments(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_student ON public.student_fee_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_enrollment ON public.student_fee_assignments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_status ON public.student_fee_assignments(institution_id, status);

CREATE TABLE IF NOT EXISTS public.student_fee_assignment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.student_fee_assignments(id) ON DELETE CASCADE,
  fee_head_id UUID NOT NULL REFERENCES public.fee_heads(id) ON DELETE RESTRICT,
  base_amount NUMERIC(12,2) NOT NULL,
  concession_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_assign_item_base CHECK (base_amount >= 0),
  CONSTRAINT uq_assign_fee_head UNIQUE (assignment_id, fee_head_id)
);

CREATE INDEX IF NOT EXISTS idx_assign_items_assignment ON public.student_fee_assignment_items(assignment_id);

CREATE TABLE IF NOT EXISTS public.student_fee_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.student_fee_assignments(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  fine_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status fee_installment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_installment_amount CHECK (amount >= 0),
  CONSTRAINT uq_student_installment UNIQUE (assignment_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_student_installments_assign ON public.student_fee_installments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_installments_due ON public.student_fee_installments(institution_id, due_date, status);

-- ==============================================================================
-- 6. Scholarships, Discounts and Concessions (Strict Approval Workflow)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fee_concessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  concession_code TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.student_fee_assignments(id) ON DELETE CASCADE,
  fee_head_id UUID REFERENCES public.fee_heads(id) ON DELETE SET NULL,
  concession_type concession_type NOT NULL DEFAULT 'need_based',
  calculation_type concession_calculation_type NOT NULL DEFAULT 'fixed_amount',
  concession_value NUMERIC(10,2) NOT NULL,
  applied_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  reason TEXT NOT NULL,
  status concession_status NOT NULL DEFAULT 'requested',
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_concession_value_pos CHECK (concession_value >= 0),
  CONSTRAINT uq_concession_code UNIQUE (institution_id, concession_code)
);

CREATE INDEX IF NOT EXISTS idx_fee_concessions_inst ON public.fee_concessions(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_concessions_student ON public.fee_concessions(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_concessions_status ON public.fee_concessions(institution_id, status);

-- ==============================================================================
-- 7. Payment Transactions & Allocations
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  transaction_reference TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  enrollment_id UUID REFERENCES public.student_enrollments(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.student_fee_assignments(id) ON DELETE SET NULL,
  amount_received NUMERIC(12,2) NOT NULL,
  payment_method fee_payment_method NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  external_transaction_id TEXT,
  bank_name TEXT,
  cheque_number TEXT,
  cheque_date DATE,
  status fee_payment_status NOT NULL DEFAULT 'completed',
  advance_balance_generated NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  qr_verification_hash TEXT NOT NULL,
  collected_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_payment_amount_positive CHECK (amount_received > 0),
  CONSTRAINT uq_fee_payment_receipt UNIQUE (institution_id, receipt_number),
  CONSTRAINT uq_fee_payment_trans_ref UNIQUE (institution_id, transaction_reference)
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_inst ON public.fee_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt ON public.fee_payments(institution_id, receipt_number);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON public.fee_payments(institution_id, payment_date);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.student_fee_assignments(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES public.student_fee_installments(id) ON DELETE SET NULL,
  fee_head_id UUID NOT NULL REFERENCES public.fee_heads(id) ON DELETE RESTRICT,
  amount_allocated NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_payment_alloc_pos CHECK (amount_allocated > 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_assign ON public.payment_allocations(assignment_id);

CREATE TABLE IF NOT EXISTS public.student_advance_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_advance_balance_non_neg CHECK (balance_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_student_advance_inst ON public.student_advance_balances(institution_id);

-- ==============================================================================
-- 8. Immutable Financial Ledger
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.financial_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  entry_number BIGSERIAL,
  transaction_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  entry_type financial_ledger_entry_type NOT NULL,
  debit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  balance_after NUMERIC(12,2) NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  assignment_id UUID REFERENCES public.student_fee_assignments(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.fee_payments(id) ON DELETE SET NULL,
  refund_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT chk_ledger_positive_entry CHECK (debit_amount >= 0 AND credit_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_inst ON public.financial_ledger_entries(institution_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_student ON public.financial_ledger_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_type ON public.financial_ledger_entries(institution_id, entry_type);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_time ON public.financial_ledger_entries(institution_id, transaction_timestamp DESC);

-- ==============================================================================
-- 9. Refunds and Reversals
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fee_refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  refund_number TEXT NOT NULL,
  payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  assignment_id UUID REFERENCES public.student_fee_assignments(id) ON DELETE SET NULL,
  refund_amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  status refund_status NOT NULL DEFAULT 'requested',
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  disbursement_method fee_payment_method,
  disbursement_reference TEXT,
  disbursed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_refund_amount_pos CHECK (refund_amount > 0),
  CONSTRAINT uq_fee_refund_number UNIQUE (institution_id, refund_number)
);

CREATE INDEX IF NOT EXISTS idx_fee_refunds_inst ON public.fee_refund_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_refunds_student ON public.fee_refund_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_refunds_status ON public.fee_refund_requests(institution_id, status);

-- ==============================================================================
-- 10. Payment Gateway Lifecycle & Webhook Events
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.gateway_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.student_fee_assignments(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status gateway_order_status NOT NULL DEFAULT 'created',
  payment_id UUID REFERENCES public.fee_payments(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_gateway_provider_order UNIQUE (institution_id, provider, provider_order_id)
);

CREATE INDEX IF NOT EXISTS idx_gateway_orders_inst ON public.gateway_orders(institution_id);
CREATE INDEX IF NOT EXISTS idx_gateway_orders_status ON public.gateway_orders(institution_id, status);

CREATE TABLE IF NOT EXISTS public.gateway_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_gateway_webhook_event UNIQUE (institution_id, provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_inst ON public.gateway_webhook_events(institution_id, event_id);

-- ==============================================================================
-- 11. Stored Procedures & Atomic Financial Operations
-- ==============================================================================

-- 11.1 Collision-Proof Receipt Number Generator
CREATE OR REPLACE FUNCTION public.generate_receipt_number(
  p_institution_id UUID,
  p_prefix TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_seq BIGINT;
  v_year TEXT := to_char(CURRENT_DATE, 'YYYY');
  v_result TEXT;
BEGIN
  -- Row-lock the institution fee settings row to prevent sequence races during concurrent payments
  SELECT COALESCE(p_prefix, receipt_prefix, 'RCP'), last_receipt_seq + 1
  INTO v_prefix, v_seq
  FROM public.institution_fee_settings
  WHERE institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.institution_fee_settings (
      institution_id, receipt_prefix, last_receipt_seq
    ) VALUES (
      p_institution_id, COALESCE(p_prefix, 'RCP'), 1
    );
    v_prefix := COALESCE(p_prefix, 'RCP');
    v_seq := 1;
  ELSE
    UPDATE public.institution_fee_settings
    SET last_receipt_seq = v_seq,
        updated_at = timezone('utc', now())
    WHERE institution_id = p_institution_id;
  END IF;

  v_result := v_prefix || '-' || v_year || '-' || lpad(v_seq::text, 6, '0');
  RETURN v_result;
END;
$$;

-- 11.2 Atomic Payment Recording, Multi-Head Allocation & Ledger Journaling
CREATE OR REPLACE FUNCTION public.record_fee_payment_atomic(
  p_institution_id UUID,
  p_student_id UUID,
  p_enrollment_id UUID,
  p_assignment_id UUID,
  p_amount_received NUMERIC,
  p_payment_method fee_payment_method,
  p_external_ref TEXT,
  p_allocations JSONB, -- Array of { fee_head_id: UUID, amount: NUMERIC, installment_id: UUID? }
  p_notes TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt_number TEXT;
  v_trans_ref TEXT;
  v_payment_id UUID;
  v_total_allocated NUMERIC := 0.00;
  v_advance_amount NUMERIC := 0.00;
  v_elem JSONB;
  v_head_id UUID;
  v_alloc_amt NUMERIC;
  v_inst_id UUID;
  v_assign_balance NUMERIC := 0.00;
  v_assign_paid NUMERIC := 0.00;
  v_assign_net NUMERIC := 0.00;
  v_new_status fee_assignment_status;
  v_qr_hash TEXT;
BEGIN
  IF p_amount_received <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- 1. Generate sequential collision-proof receipt number and reference
  v_receipt_number := public.generate_receipt_number(p_institution_id);
  v_trans_ref := 'TXN-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
  v_qr_hash := encode(digest(p_institution_id::text || ':' || v_receipt_number || ':' || p_amount_received::text || ':' || timezone('utc', now())::text, 'sha256'), 'hex');

  -- 2. Insert primary fee payment record
  INSERT INTO public.fee_payments (
    institution_id,
    receipt_number,
    transaction_reference,
    student_id,
    enrollment_id,
    assignment_id,
    amount_received,
    payment_method,
    payment_date,
    external_transaction_id,
    status,
    notes,
    qr_verification_hash,
    collected_by
  ) VALUES (
    p_institution_id,
    v_receipt_number,
    v_trans_ref,
    p_student_id,
    p_enrollment_id,
    p_assignment_id,
    p_amount_received,
    p_payment_method,
    CURRENT_DATE,
    p_external_ref,
    'completed',
    p_notes,
    v_qr_hash,
    p_user_id
  ) RETURNING id INTO v_payment_id;

  -- 3. Process line-item and installment allocations
  IF p_allocations IS NOT NULL AND jsonb_array_length(p_allocations) > 0 THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
      v_head_id := (v_elem->>'fee_head_id')::UUID;
      v_alloc_amt := (v_elem->>'amount')::NUMERIC;
      v_inst_id := NULL;
      IF v_elem ? 'installment_id' AND v_elem->>'installment_id' IS NOT NULL AND (v_elem->>'installment_id') != '' THEN
        v_inst_id := (v_elem->>'installment_id')::UUID;
      END IF;

      IF v_alloc_amt > 0 THEN
        v_total_allocated := v_total_allocated + v_alloc_amt;

        -- Record payment allocation
        INSERT INTO public.payment_allocations (
          institution_id, payment_id, assignment_id, installment_id, fee_head_id, amount_allocated
        ) VALUES (
          p_institution_id, v_payment_id, p_assignment_id, v_inst_id, v_head_id, v_alloc_amt
        );

        -- Update line item paid amount
        UPDATE public.student_fee_assignment_items
        SET paid_amount = paid_amount + v_alloc_amt
        WHERE assignment_id = p_assignment_id AND fee_head_id = v_head_id;

        -- If installment linked, update installment
        IF v_inst_id IS NOT NULL THEN
          UPDATE public.student_fee_installments
          SET paid_amount = paid_amount + v_alloc_amt,
              status = CASE
                WHEN (paid_amount + v_alloc_amt) >= amount THEN 'paid'::fee_installment_status
                ELSE 'partial'::fee_installment_status
              END,
              updated_at = timezone('utc', now())
          WHERE id = v_inst_id;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 4. Handle excess money as student advance wallet balance (Never discard money!)
  IF p_amount_received > v_total_allocated THEN
    v_advance_amount := p_amount_received - v_total_allocated;

    INSERT INTO public.student_advance_balances (
      institution_id, student_id, balance_amount
    ) VALUES (
      p_institution_id, p_student_id, v_advance_amount
    )
    ON CONFLICT (student_id) DO UPDATE
    SET balance_amount = public.student_advance_balances.balance_amount + v_advance_amount,
        updated_at = timezone('utc', now());

    UPDATE public.fee_payments
    SET advance_balance_generated = v_advance_amount
    WHERE id = v_payment_id;

    -- Record advance credit into financial ledger
    INSERT INTO public.financial_ledger_entries (
      institution_id, entry_type, debit_amount, credit_amount, balance_after,
      student_id, payment_id, description, created_by
    ) VALUES (
      p_institution_id, 'advance_credit', 0.00, v_advance_amount, v_advance_amount,
      p_student_id, v_payment_id, 'Excess payment credited to student advance wallet', p_user_id
    );
  END IF;

  -- 5. Update parent Student Fee Assignment balance & status
  IF p_assignment_id IS NOT NULL THEN
    SELECT net_payable_amount, paid_amount
    INTO v_assign_net, v_assign_paid
    FROM public.student_fee_assignments
    WHERE id = p_assignment_id
    FOR UPDATE;

    v_assign_paid := v_assign_paid + v_total_allocated;
    v_assign_balance := GREATEST(0.00, v_assign_net - v_assign_paid);

    IF v_assign_balance = 0 THEN
      v_new_status := 'paid';
    ELSIF v_assign_paid > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'pending';
    END IF;

    UPDATE public.student_fee_assignments
    SET paid_amount = v_assign_paid,
        outstanding_balance = v_assign_balance,
        status = v_new_status,
        updated_at = timezone('utc', now())
    WHERE id = p_assignment_id;
  END IF;

  -- 6. Append Immutable Financial Ledger Entry
  INSERT INTO public.financial_ledger_entries (
    institution_id, entry_type, debit_amount, credit_amount, balance_after,
    student_id, assignment_id, payment_id, description, created_by
  ) VALUES (
    p_institution_id, 'payment', 0.00, p_amount_received, v_assign_balance,
    p_student_id, p_assignment_id, v_payment_id,
    'Fee collection receipt ' || v_receipt_number || ' via ' || p_payment_method::text,
    p_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'receipt_number', v_receipt_number,
    'transaction_reference', v_trans_ref,
    'total_allocated', v_total_allocated,
    'advance_generated', v_advance_amount,
    'outstanding_balance', v_assign_balance
  );
END;
$$;

-- 11.3 Authorized Concession Approval Workflow
CREATE OR REPLACE FUNCTION public.approve_fee_concession_atomic(
  p_institution_id UUID,
  p_concession_id UUID,
  p_approved_by UUID,
  p_new_status concession_status,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_concession RECORD;
  v_assignment RECORD;
  v_discount_amount NUMERIC := 0.00;
  v_new_net NUMERIC := 0.00;
  v_new_balance NUMERIC := 0.00;
  v_new_status fee_assignment_status;
BEGIN
  -- 1. Fetch concession record
  SELECT * INTO v_concession
  FROM public.fee_concessions
  WHERE id = p_concession_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Concession record not found';
  END IF;

  IF v_concession.status != 'requested' AND v_concession.status != 'under_review' THEN
    RAISE EXCEPTION 'Concession is already in status %', v_concession.status;
  END IF;

  -- Separation of duty: Requester cannot approve their own concession
  IF v_concession.requested_by = p_approved_by THEN
    RAISE EXCEPTION 'Unauthorized: The user who requested the concession cannot approve it.';
  END IF;

  IF p_new_status = 'approved' THEN
    -- 2. Fetch assignment
    SELECT * INTO v_assignment
    FROM public.student_fee_assignments
    WHERE id = v_concession.assignment_id
    FOR UPDATE;

    -- Calculate discount amount
    IF v_concession.calculation_type = 'percentage' THEN
      v_discount_amount := round((v_assignment.base_amount * (v_concession.concession_value / 100.0)), 2);
    ELSE
      v_discount_amount := LEAST(v_concession.concession_value, v_assignment.base_amount);
    END IF;

    v_new_net := GREATEST(0.00, v_assignment.base_amount + v_assignment.fine_amount - (v_assignment.concession_amount + v_discount_amount));
    v_new_balance := GREATEST(0.00, v_new_net - v_assignment.paid_amount);

    IF v_new_balance = 0 AND v_assignment.paid_amount >= v_new_net THEN
      v_new_status := 'paid';
    ELSIF v_assignment.paid_amount > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'pending';
    END IF;

    -- Update assignment
    UPDATE public.student_fee_assignments
    SET concession_amount = concession_amount + v_discount_amount,
        net_payable_amount = v_new_net,
        outstanding_balance = v_new_balance,
        status = v_new_status,
        updated_at = timezone('utc', now())
    WHERE id = v_assignment.id;

    -- Update concession record
    UPDATE public.fee_concessions
    SET status = 'approved',
        applied_amount = v_discount_amount,
        approved_by = p_approved_by,
        approved_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    WHERE id = p_concession_id;

    -- Record in immutable financial ledger
    INSERT INTO public.financial_ledger_entries (
      institution_id, entry_type, debit_amount, credit_amount, balance_after,
      student_id, assignment_id, description, created_by
    ) VALUES (
      p_institution_id, 'concession', 0.00, v_discount_amount, v_new_balance,
      v_concession.student_id, v_concession.assignment_id,
      'Approved ' || v_concession.concession_type::text || ' concession of ' || v_discount_amount::text,
      p_approved_by
    );
  ELSE
    -- Rejected
    UPDATE public.fee_concessions
    SET status = 'rejected',
        approved_by = p_approved_by,
        approved_at = timezone('utc', now()),
        rejection_reason = p_rejection_reason,
        updated_at = timezone('utc', now())
    WHERE id = p_concession_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'concession_id', p_concession_id,
    'status', p_new_status,
    'applied_amount', v_discount_amount
  );
END;
$$;

-- 11.4 Atomic Fee Refund & Reversal Processing
CREATE OR REPLACE FUNCTION public.process_fee_refund_atomic(
  p_institution_id UUID,
  p_refund_id UUID,
  p_processed_by UUID,
  p_disbursement_method fee_payment_method,
  p_disbursement_ref TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund RECORD;
  v_payment RECORD;
  v_assignment RECORD;
  v_new_paid NUMERIC;
  v_new_balance NUMERIC;
  v_new_status fee_assignment_status;
BEGIN
  -- 1. Fetch refund request
  SELECT * INTO v_refund
  FROM public.fee_refund_requests
  WHERE id = p_refund_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund request not found';
  END IF;

  IF v_refund.status != 'approved' THEN
    RAISE EXCEPTION 'Refund request must be approved by an administrator before processing. Current status: %', v_refund.status;
  END IF;

  -- 2. Fetch original payment
  SELECT * INTO v_payment
  FROM public.fee_payments
  WHERE id = v_refund.payment_id
  FOR UPDATE;

  IF v_refund.refund_amount > v_payment.amount_received THEN
    RAISE EXCEPTION 'Refund amount cannot exceed original payment amount (%)', v_payment.amount_received;
  END IF;

  -- 3. Adjust assignment paid amount if assignment was linked
  IF v_refund.assignment_id IS NOT NULL THEN
    SELECT * INTO v_assignment
    FROM public.student_fee_assignments
    WHERE id = v_refund.assignment_id
    FOR UPDATE;

    v_new_paid := GREATEST(0.00, v_assignment.paid_amount - v_refund.refund_amount);
    v_new_balance := v_assignment.net_payable_amount - v_new_paid;

    IF v_new_balance >= v_assignment.net_payable_amount THEN
      v_new_status := 'pending';
    ELSE
      v_new_status := 'partial';
    END IF;

    UPDATE public.student_fee_assignments
    SET paid_amount = v_new_paid,
        outstanding_balance = v_new_balance,
        status = v_new_status,
        updated_at = timezone('utc', now())
    WHERE id = v_assignment.id;
  END IF;

  -- 4. Mark refund as processed
  UPDATE public.fee_refund_requests
  SET status = 'processed',
      disbursement_method = p_disbursement_method,
      disbursement_reference = p_disbursement_ref,
      disbursed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  WHERE id = p_refund_id;

  -- 5. Record refund in immutable financial ledger
  INSERT INTO public.financial_ledger_entries (
    institution_id, entry_type, debit_amount, credit_amount, balance_after,
    student_id, assignment_id, payment_id, refund_id, description, created_by
  ) VALUES (
    p_institution_id, 'refund', v_refund.refund_amount, 0.00, COALESCE(v_new_balance, 0.00),
    v_refund.student_id, v_refund.assignment_id, v_refund.payment_id, v_refund.id,
    'Processed refund ' || v_refund.refund_number || ' for payment ' || v_payment.receipt_number || ': ' || v_refund.reason,
    p_processed_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'refund_id', p_refund_id,
    'refund_number', v_refund.refund_number,
    'refund_amount', v_refund.refund_amount,
    'status', 'processed'
  );
END;
$$;

-- 11.5 Gateway Webhook Idempotency & Order Processing
CREATE OR REPLACE FUNCTION public.process_gateway_webhook_idempotent(
  p_institution_id UUID,
  p_provider TEXT,
  p_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB,
  p_signature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Idempotency check: verify if event was already received and processed
  SELECT * INTO v_existing
  FROM public.gateway_webhook_events
  WHERE institution_id = p_institution_id AND provider = p_provider AND event_id = p_event_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'message', 'Webhook event already processed'
    );
  END IF;

  -- Record webhook event
  INSERT INTO public.gateway_webhook_events (
    institution_id, provider, event_id, event_type, payload, signature_verified, processed, processed_at
  ) VALUES (
    p_institution_id, p_provider, p_event_id, p_event_type, p_payload, true, true, timezone('utc', now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'event_id', p_event_id
  );
END;
$$;

-- ==============================================================================
-- 12. PostgreSQL Row-Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.institution_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structure_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structure_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_assignment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_concessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_advance_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_webhook_events ENABLE ROW LEVEL SECURITY;

-- 12.1 Settings
CREATE POLICY "Fee settings viewable by institution members" ON public.institution_fee_settings
  FOR SELECT TO authenticated
  USING (is_institution_member(institution_id));

CREATE POLICY "Fee settings manageable by admin/owner" ON public.institution_fee_settings
  FOR ALL TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin']));

-- 12.2 Fee Heads
CREATE POLICY "Fee heads viewable by institution members" ON public.fee_heads
  FOR SELECT TO authenticated
  USING (is_institution_member(institution_id));

CREATE POLICY "Fee heads manageable by admin/owner/accountant" ON public.fee_heads
  FOR ALL TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']));

-- 12.3 Fee Structures
CREATE POLICY "Fee structures viewable by institution members" ON public.fee_structures
  FOR SELECT TO authenticated
  USING (is_institution_member(institution_id));

CREATE POLICY "Fee structures manageable by admin/owner/accountant" ON public.fee_structures
  FOR ALL TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']));

CREATE POLICY "Fee structure items viewable by institution members" ON public.fee_structure_items
  FOR SELECT TO authenticated
  USING (is_institution_member(institution_id));

CREATE POLICY "Fee structure items manageable by admin/owner/accountant" ON public.fee_structure_items
  FOR ALL TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']));

CREATE POLICY "Fee structure installments viewable by institution members" ON public.fee_structure_installments
  FOR SELECT TO authenticated
  USING (is_institution_member(institution_id));

CREATE POLICY "Fee structure installments manageable by admin/owner/accountant" ON public.fee_structure_installments
  FOR ALL TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']));

-- 12.4 Student Fee Assignments (Strict Privacy Boundary)
CREATE POLICY "Fee assignments viewable by staff or student/guardian" ON public.student_fee_assignments
  FOR SELECT TO authenticated
  USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'accountant'])
    OR student_id = auth.uid()
    OR is_guardian_of_student(student_id)
  );

CREATE POLICY "Fee assignments manageable by admin/owner/accountant" ON public.student_fee_assignments
  FOR ALL TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant', 'academic_admin']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant', 'academic_admin']));

CREATE POLICY "Assignment items viewable by staff or student/guardian" ON public.student_fee_assignment_items
  FOR SELECT TO authenticated
  USING (is_institution_member(institution_id));

CREATE POLICY "Assignment items manageable by staff" ON public.student_fee_assignment_items
  FOR ALL TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant', 'academic_admin']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant', 'academic_admin']));

CREATE POLICY "Student installments viewable by staff or student/guardian" ON public.student_fee_installments
  FOR SELECT TO authenticated
  USING (is_institution_member(institution_id));

CREATE POLICY "Student installments manageable by staff" ON public.student_fee_installments
  FOR ALL TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant', 'academic_admin']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant', 'academic_admin']));

-- 12.5 Concessions
CREATE POLICY "Fee concessions viewable by staff or applicant student/guardian" ON public.fee_concessions
  FOR SELECT TO authenticated
  USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'accountant'])
    OR student_id = auth.uid()
    OR is_guardian_of_student(student_id)
  );

CREATE POLICY "Fee concessions insertable by authorized users" ON public.fee_concessions
  FOR INSERT TO authenticated
  WITH CHECK (is_institution_member(institution_id));

CREATE POLICY "Fee concessions modifiable by admin/owner" ON public.fee_concessions
  FOR UPDATE TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin']));

-- 12.6 Fee Payments & Allocations
CREATE POLICY "Fee payments viewable by staff or paying student/guardian" ON public.fee_payments
  FOR SELECT TO authenticated
  USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant'])
    OR student_id = auth.uid()
    OR is_guardian_of_student(student_id)
  );

CREATE POLICY "Fee payments insertable by admin/owner/accountant" ON public.fee_payments
  FOR INSERT TO authenticated
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']));

CREATE POLICY "Payment allocations viewable by members" ON public.payment_allocations
  FOR SELECT TO authenticated
  USING (is_institution_member(institution_id));

CREATE POLICY "Payment allocations insertable by admin/owner/accountant" ON public.payment_allocations
  FOR INSERT TO authenticated
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']));

CREATE POLICY "Student advance balances viewable by student/staff" ON public.student_advance_balances
  FOR SELECT TO authenticated
  USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant'])
    OR student_id = auth.uid()
    OR is_guardian_of_student(student_id)
  );

-- 12.7 Financial Ledger (Immutable Append-Only Audit Trail)
CREATE POLICY "Financial ledger viewable by admin/owner/accountant" ON public.financial_ledger_entries
  FOR SELECT TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']));

CREATE POLICY "Financial ledger insertable by admin/owner/accountant" ON public.financial_ledger_entries
  FOR INSERT TO authenticated
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant']));

-- Immutable safeguard: Prevent UPDATE and DELETE on ledger entries
CREATE OR REPLACE RULE financial_ledger_no_update AS ON UPDATE TO public.financial_ledger_entries DO INSTEAD NOTHING;
CREATE OR REPLACE RULE financial_ledger_no_delete AS ON DELETE TO public.financial_ledger_entries DO INSTEAD NOTHING;

-- 12.8 Refunds
CREATE POLICY "Fee refunds viewable by staff or student/guardian" ON public.fee_refund_requests
  FOR SELECT TO authenticated
  USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant'])
    OR student_id = auth.uid()
    OR is_guardian_of_student(student_id)
  );

CREATE POLICY "Fee refunds insertable by members" ON public.fee_refund_requests
  FOR INSERT TO authenticated
  WITH CHECK (is_institution_member(institution_id));

CREATE POLICY "Fee refunds modifiable by admin/owner" ON public.fee_refund_requests
  FOR UPDATE TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['owner', 'admin']));

-- 12.9 Gateway Orders & Webhooks
CREATE POLICY "Gateway orders viewable by staff or paying student" ON public.gateway_orders
  FOR SELECT TO authenticated
  USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'accountant'])
    OR student_id = auth.uid()
  );

CREATE POLICY "Gateway orders insertable by members" ON public.gateway_orders
  FOR INSERT TO authenticated
  WITH CHECK (is_institution_member(institution_id));

CREATE POLICY "Gateway webhooks viewable by admin/owner" ON public.gateway_webhook_events
  FOR SELECT TO authenticated
  USING (has_institution_role(institution_id, ARRAY['owner', 'admin']));
