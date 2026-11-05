import { describe, it, expect } from 'vitest';
import {
  feeCategoryEnum,
  feePaymentMethodEnum,
  feePaymentStatusEnum,
  feeHeadCreateSchema,
  feeStructureCreateSchema,
  studentFeeAssignmentCreateSchema,
  feePaymentRecordSchema,
  feeConcessionRequestSchema,
  feeConcessionApprovalSchema,
  feeRefundRequestSchema,
  feeRefundProcessSchema,
  institutionFeeSettingsUpdateSchema,
  gatewayOrderCreateSchema,
} from '../../packages/validators/src';

describe('Unit: Fee & Payment Validation Schemas', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const validUuid2 = '223e4567-e89b-12d3-a456-426614174001';

  describe('feeCategoryEnum & feePaymentMethodEnum', () => {
    it('accepts all required institutional fee categories', () => {
      const categories = [
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
        'other',
      ];
      categories.forEach((cat) => {
        expect(feeCategoryEnum.safeParse(cat).success).toBe(true);
      });
      expect(feeCategoryEnum.safeParse('invalid_cat').success).toBe(false);
    });

    it('accepts all supported payment methods including advance wallet', () => {
      const methods = [
        'cash',
        'upi',
        'bank_transfer',
        'card',
        'payment_gateway',
        'cheque',
        'demand_draft',
        'advance_wallet',
      ];
      methods.forEach((m) => {
        expect(feePaymentMethodEnum.safeParse(m).success).toBe(true);
      });
      expect(feePaymentMethodEnum.safeParse('bitcoin').success).toBe(false);
    });
  });

  describe('feeHeadCreateSchema', () => {
    it('validates a valid fee head successfully', () => {
      const valid = {
        name: 'Annual Tuition Fee',
        code: 'TUIT-ANNUAL',
        category: 'tuition',
        description: 'Standard tuition fee for academic year',
        isRefundable: false,
        isActive: true,
      };
      const result = feeHeadCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('TUIT-ANNUAL');
      }
    });

    it('rejects fee head with name too short or empty code', () => {
      const invalid = {
        name: 'A',
        code: '',
      };
      const result = feeHeadCreateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('feeStructureCreateSchema', () => {
    it('validates a valid multi-head fee structure with installment splits', () => {
      const valid = {
        academicYearId: validUuid,
        studentCategory: 'general',
        name: 'Grade 10 Annual Fee Structure',
        code: 'G10-2026',
        items: [
          { feeHeadId: validUuid, amount: 25000, isMandatory: true, orderIndex: 1 },
          { feeHeadId: validUuid2, amount: 5000, isMandatory: true, orderIndex: 2 },
        ],
        installments: [
          { installmentNumber: 1, name: 'Term 1', percentage: 60, dueDaysOffset: 0 },
          { installmentNumber: 2, name: 'Term 2', percentage: 40, dueDaysOffset: 90 },
        ],
      };
      const result = feeStructureCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects structure with negative fee head amount', () => {
      const invalid = {
        academicYearId: validUuid,
        name: 'Invalid Fee Structure',
        code: 'INV-01',
        items: [{ feeHeadId: validUuid, amount: -100 }],
      };
      const result = feeStructureCreateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects structure with 0 items', () => {
      const invalid = {
        academicYearId: validUuid,
        name: 'Empty Fee Structure',
        code: 'EMPTY',
        items: [],
      };
      const result = feeStructureCreateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('studentFeeAssignmentCreateSchema', () => {
    it('validates student fee assignment with valid due date and discount', () => {
      const valid = {
        studentId: validUuid,
        enrollmentId: validUuid2,
        academicYearId: validUuid,
        feeStructureId: validUuid2,
        dueDate: '2026-06-30',
        customDiscounts: 1000,
      };
      const result = studentFeeAssignmentCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid due date format or negative discount', () => {
      const invalid = {
        studentId: validUuid,
        enrollmentId: validUuid2,
        academicYearId: validUuid,
        feeStructureId: validUuid2,
        dueDate: '30-06-2026', // Invalid regex YYYY-MM-DD
        customDiscounts: -500,
      };
      const result = studentFeeAssignmentCreateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('feePaymentRecordSchema', () => {
    it('validates cash payment with zero or positive amount', () => {
      const valid = {
        studentId: validUuid,
        amountReceived: 15000,
        paymentMethod: 'cash',
        paymentDate: '2026-07-15',
        notes: 'Counter payment received with thanks',
      };
      const result = feePaymentRecordSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects zero or negative payment received', () => {
      const invalid = {
        studentId: validUuid,
        amountReceived: 0,
        paymentMethod: 'cash',
      };
      expect(feePaymentRecordSchema.safeParse(invalid).success).toBe(false);

      const invalidNegative = {
        studentId: validUuid,
        amountReceived: -500,
        paymentMethod: 'cash',
      };
      expect(feePaymentRecordSchema.safeParse(invalidNegative).success).toBe(false);
    });

    it('validates cheque payment with cheque details', () => {
      const validCheque = {
        studentId: validUuid,
        amountReceived: 20000,
        paymentMethod: 'cheque',
        paymentDate: '2026-07-20',
        chequeNumber: 'CHQ-98124',
        chequeDate: '2026-07-19',
        bankName: 'State Bank of India',
      };
      const result = feePaymentRecordSchema.safeParse(validCheque);
      expect(result.success).toBe(true);
    });
  });

  describe('feeConcessionRequestSchema & Approval', () => {
    it('validates concession request with valid calculation type and positive value', () => {
      const valid = {
        studentId: validUuid,
        assignmentId: validUuid2,
        concessionType: 'merit_scholarship',
        calculationType: 'percentage',
        concessionValue: 25,
        reason: 'Rank 1 in academic term entrance examination',
      };
      const result = feeConcessionRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects concession request with reason too short', () => {
      const invalid = {
        studentId: validUuid,
        assignmentId: validUuid2,
        concessionValue: 10,
        reason: 'Poor', // Less than 5 characters
      };
      expect(feeConcessionRequestSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates concession approval decision', () => {
      const validApproval = {
        concessionId: validUuid,
        status: 'approved',
      };
      expect(feeConcessionApprovalSchema.safeParse(validApproval).success).toBe(true);

      const validRejection = {
        concessionId: validUuid,
        status: 'rejected',
        rejectionReason: 'Exceeded department scholarship quota for academic term',
      };
      expect(feeConcessionApprovalSchema.safeParse(validRejection).success).toBe(true);
    });
  });

  describe('feeRefundRequestSchema & Process', () => {
    it('validates refund request with valid positive amount and reason', () => {
      const valid = {
        paymentId: validUuid,
        studentId: validUuid2,
        refundAmount: 5000,
        reason: 'Student transferred to another branch; pro-rata tuition refund',
      };
      expect(feeRefundRequestSchema.safeParse(valid).success).toBe(true);
    });

    it('validates refund processing with valid disbursement method', () => {
      const validProcess = {
        refundId: validUuid,
        status: 'approved',
        disbursementMethod: 'bank_transfer',
        disbursementReference: 'NEFT-AXIS-9823412',
        reviewNotes: 'Verified with bank transfer statement',
      };
      expect(feeRefundProcessSchema.safeParse(validProcess).success).toBe(true);
    });
  });

  describe('institutionFeeSettingsUpdateSchema & gatewayOrderCreateSchema', () => {
    it('validates fee settings update with defaults', () => {
      const valid = {
        currency: 'INR',
        currencySymbol: '₹',
        receiptPrefix: 'RCP',
        invoicePrefix: 'INV',
        lateFeeDailyAmount: 20,
        gracePeriodDays: 5,
        isGatewayEnabled: true,
        gatewayProvider: 'razorpay',
      };
      expect(institutionFeeSettingsUpdateSchema.safeParse(valid).success).toBe(true);
    });

    it('validates gateway order creation for minimum amount of 1.00', () => {
      const valid = {
        studentId: validUuid,
        assignmentId: validUuid2,
        amount: 5000,
        currency: 'INR',
      };
      expect(gatewayOrderCreateSchema.safeParse(valid).success).toBe(true);

      const invalidAmount = {
        studentId: validUuid,
        amount: 0.5,
      };
      expect(gatewayOrderCreateSchema.safeParse(invalidAmount).success).toBe(false);
    });
  });
});
