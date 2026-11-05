-- ==============================================================================
-- Milestone 8: Universal Fees & Payments Management
-- Rollback Migration: 20261105070000_rollback.sql
-- Description: Completely reverses 20261105070000_fees_payments.sql
-- ==============================================================================

-- 1. Drop Stored Procedures & Functions
DROP FUNCTION IF EXISTS public.process_gateway_webhook_idempotent;
DROP FUNCTION IF EXISTS public.process_fee_refund_atomic;
DROP FUNCTION IF EXISTS public.approve_fee_concession_atomic;
DROP FUNCTION IF EXISTS public.record_fee_payment_atomic;
DROP FUNCTION IF EXISTS public.generate_receipt_number;

-- 2. Drop Rules
DROP RULE IF EXISTS financial_ledger_no_delete ON public.financial_ledger_entries;
DROP RULE IF EXISTS financial_ledger_no_update ON public.financial_ledger_entries;

-- 3. Drop Tables in Reverse Dependency Order
DROP TABLE IF EXISTS public.gateway_webhook_events CASCADE;
DROP TABLE IF EXISTS public.gateway_orders CASCADE;
DROP TABLE IF EXISTS public.fee_refund_requests CASCADE;
DROP TABLE IF EXISTS public.financial_ledger_entries CASCADE;
DROP TABLE IF EXISTS public.student_advance_balances CASCADE;
DROP TABLE IF EXISTS public.payment_allocations CASCADE;
DROP TABLE IF EXISTS public.fee_payments CASCADE;
DROP TABLE IF EXISTS public.fee_concessions CASCADE;
DROP TABLE IF EXISTS public.student_fee_installments CASCADE;
DROP TABLE IF EXISTS public.student_fee_assignment_items CASCADE;
DROP TABLE IF EXISTS public.student_fee_assignments CASCADE;
DROP TABLE IF EXISTS public.fee_structure_installments CASCADE;
DROP TABLE IF EXISTS public.fee_structure_items CASCADE;
DROP TABLE IF EXISTS public.fee_structures CASCADE;
DROP TABLE IF EXISTS public.fee_heads CASCADE;
DROP TABLE IF EXISTS public.institution_fee_settings CASCADE;

-- 4. Drop Enums
DROP TYPE IF EXISTS gateway_order_status CASCADE;
DROP TYPE IF EXISTS financial_ledger_entry_type CASCADE;
DROP TYPE IF EXISTS refund_status CASCADE;
DROP TYPE IF EXISTS concession_status CASCADE;
DROP TYPE IF EXISTS concession_calculation_type CASCADE;
DROP TYPE IF EXISTS concession_type CASCADE;
DROP TYPE IF EXISTS fee_installment_status CASCADE;
DROP TYPE IF EXISTS fee_assignment_status CASCADE;
DROP TYPE IF EXISTS fee_payment_status CASCADE;
DROP TYPE IF EXISTS fee_payment_method CASCADE;
DROP TYPE IF EXISTS fee_category CASCADE;
