import { describe, it, expect } from 'vitest';
import {
  createLibraryBranchSchema,
  createLibraryBookSchema,
  createLibraryCopySchema,
  createLibraryMemberSchema,
  issueBookSchema,
  returnBookSchema,
  renewBookSchema,
  createReservationSchema,
  payFineSchema,
  waiveFineSchema,
  updateLibrarySettingsSchema,
  createHostelBuildingSchema,
  createHostelRoomSchema,
  createHostelBedSchema,
  allocateBedSchema,
  vacateBedSchema,
  submitHostelApplicationSchema,
  reviewHostelApplicationSchema,
  createOutpassSchema,
  updateOutpassStatusSchema,
  registerVisitorSchema,
  createComplaintSchema,
  resolveComplaintSchema,
  manageMessSchema,
  createInstitutionEventSchema,
  updateEventStatusSchema,
  registerEventParticipantSchema,
  recordEventAttendanceSchema,
  issueEventCertificateSchema,
} from '../../packages/validators/src';

describe('Unit: Milestone 11 Library Validators', () => {
  it('validates library branch creation', () => {
    const valid = {
      name: 'Central Science Library',
      code: 'LIB-SCI',
      location: 'Block C, 2nd Floor',
      openingHours: '8:00 AM - 8:00 PM',
    };
    expect(createLibraryBranchSchema.parse(valid)).toMatchObject(valid);

    // Invalid code
    expect(() =>
      createLibraryBranchSchema.parse({
        name: 'Science Library',
        code: 's', // Min 2 chars
      })
    ).toThrow();
  });

  it('validates book catalogue entries', () => {
    const valid = {
      title: 'Introduction to Algorithms, Fourth Edition',
      author: 'Thomas H. Cormen, Charles E. Leiserson',
      isbn: '978-0262046305',
      category: 'Computer Science',
      publisher: 'The MIT Press',
      pages: 1312,
      language: 'English',
    };
    expect(createLibraryBookSchema.parse(valid)).toMatchObject({
      title: 'Introduction to Algorithms, Fourth Edition',
      category: 'Computer Science',
    });

    // Missing title or author
    expect(() =>
      createLibraryBookSchema.parse({
        author: 'Charles E. Leiserson',
        category: 'Computer Science',
      })
    ).toThrow();
  });

  it('validates book copy accession numbers and barcodes', () => {
    const valid = {
      bookId: '123e4567-e89b-12d3-a456-426614174000',
      accessionNumber: 'ACC-2026-00142',
      barcode: 'BAR-9780262046305-01',
      status: 'available',
      condition: 'good',
      price: 1500,
    };
    expect(createLibraryCopySchema.parse(valid)).toMatchObject({
      accessionNumber: 'ACC-2026-00142',
      status: 'available',
    });

    // Invalid UUID
    expect(() =>
      createLibraryCopySchema.parse({
        bookId: 'not-a-uuid',
        accessionNumber: 'ACC-1',
        barcode: 'BAR-1',
      })
    ).toThrow();
  });

  it('validates library member registration quotas', () => {
    const studentMember = {
      memberType: 'student',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      membershipNumber: 'LIB-STU-2026-01',
      barcode: 'STU-CARD-001',
      maxBooksAllowed: 3,
      borrowDurationDays: 14,
    };
    expect(createLibraryMemberSchema.parse(studentMember)).toMatchObject({
      memberType: 'student',
      maxBooksAllowed: 3,
    });
  });

  it('validates book issue, return, and renewal constraints', () => {
    const issueInput = {
      copyId: '123e4567-e89b-12d3-a456-426614174002',
      memberId: '123e4567-e89b-12d3-a456-426614174003',
      loanDurationDays: 14,
    };
    expect(issueBookSchema.parse(issueInput)).toMatchObject({
      loanDurationDays: 14,
    });

    const returnInput = {
      circulationId: '123e4567-e89b-12d3-a456-426614174004',
      condition: 'damaged',
    };
    expect(returnBookSchema.parse(returnInput)).toMatchObject({
      condition: 'damaged',
    });

    const renewInput = {
      circulationId: '123e4567-e89b-12d3-a456-426614174004',
      extensionDays: 7,
    };
    expect(renewBookSchema.parse(renewInput)).toMatchObject({
      extensionDays: 7,
    });
  });

  it('validates fine payments and administrative waivers', () => {
    const payInput = {
      fineId: '123e4567-e89b-12d3-a456-426614174005',
      paymentMethod: 'cash',
      receiptNumber: 'REC-LIB-0091',
    };
    expect(payFineSchema.parse(payInput)).toMatchObject({
      paymentMethod: 'cash',
    });

    const waiveInput = {
      fineId: '123e4567-e89b-12d3-a456-426614174005',
      waiverReason: 'Approved medical absence by student dean',
    };
    expect(waiveFineSchema.parse(waiveInput)).toMatchObject({
      waiverReason: 'Approved medical absence by student dean',
    });

    // Too short waiver reason
    expect(() =>
      waiveFineSchema.parse({
        fineId: '123e4567-e89b-12d3-a456-426614174005',
        waiverReason: 'ab',
      })
    ).toThrow();
  });
});

describe('Unit: Milestone 11 Hostel Validators', () => {
  it('validates hostel building definitions', () => {
    const valid = {
      name: 'Mandakini Boys Hostel',
      buildingCode: 'H-MAN-01',
      genderPolicy: 'boys',
      totalFloors: 4,
      status: 'active',
    };
    expect(createHostelBuildingSchema.parse(valid)).toMatchObject({
      genderPolicy: 'boys',
      totalFloors: 4,
    });
  });

  it('validates hostel rooms and bed allocation models', () => {
    const roomInput = {
      buildingId: '123e4567-e89b-12d3-a456-426614174010',
      roomNumber: '302',
      floorNumber: 3,
      roomType: 'double',
      bedCapacity: 2,
      isAc: true,
      isAttachedWashroom: true,
      baseFeeMonthly: 6000,
    };
    expect(createHostelRoomSchema.parse(roomInput)).toMatchObject({
      bedCapacity: 2,
      isAc: true,
    });

    const bedInput = {
      roomId: '123e4567-e89b-12d3-a456-426614174011',
      bedNumber: '302-A',
      status: 'available',
    };
    expect(createHostelBedSchema.parse(bedInput)).toMatchObject({
      bedNumber: '302-A',
    });

    const allocInput = {
      studentId: '123e4567-e89b-12d3-a456-426614174012',
      bedId: '123e4567-e89b-12d3-a456-426614174013',
      academicYearId: '123e4567-e89b-12d3-a456-426614174014',
      allocatedFrom: '2026-08-01',
    };
    expect(allocateBedSchema.parse(allocInput)).toMatchObject({
      allocatedFrom: '2026-08-01',
    });
  });

  it('validates student outpass and gate pass creation', () => {
    const outpassInput = {
      studentId: '123e4567-e89b-12d3-a456-426614174015',
      departureTime: '2026-11-10T16:00:00Z',
      expectedReturnTime: '2026-11-12T18:00:00Z',
      purpose: 'Visiting home for festive holidays',
      destination: 'Pune, Maharashtra',
      emergencyContact: '+91 98765 43210',
      parentConsentStatus: 'approved',
    };
    expect(createOutpassSchema.parse(outpassInput)).toMatchObject({
      destination: 'Pune, Maharashtra',
      parentConsentStatus: 'approved',
    });

    const updateStatus = {
      outpassId: '123e4567-e89b-12d3-a456-426614174016',
      status: 'departed',
    };
    expect(updateOutpassStatusSchema.parse(updateStatus)).toMatchObject({
      status: 'departed',
    });
  });

  it('validates visitor registration and maintenance complaints', () => {
    const visitor = {
      studentId: '123e4567-e89b-12d3-a456-426614174017',
      visitorName: 'Sanjay Gupta',
      relationship: 'Father',
      contactPhone: '+91 91234 56789',
      idProofType: 'government_id',
      idProofNumber: 'XXXX-XXXX-1234',
    };
    expect(registerVisitorSchema.parse(visitor)).toMatchObject({
      visitorName: 'Sanjay Gupta',
    });

    const complaint = {
      studentId: '123e4567-e89b-12d3-a456-426614174017',
      category: 'plumbing',
      title: 'Water tap leaking in washroom',
      description: 'Continuous water leakage from wash basin tap',
      priority: 'high',
    };
    expect(createComplaintSchema.parse(complaint)).toMatchObject({
      category: 'plumbing',
      priority: 'high',
    });
  });
});

describe('Unit: Milestone 11 Events & Activities Validators', () => {
  it('validates institution event creation and capacities', () => {
    const eventInput = {
      title: 'TechNexus 2026: National Hackathon',
      eventType: 'competition',
      venue: 'Main Innovation Lab & Auditorium',
      startTime: '2026-12-05T09:00:00Z',
      endTime: '2026-12-07T18:00:00Z',
      maxParticipants: 150,
      isRegistrationOpen: true,
      status: 'published',
    };
    expect(createInstitutionEventSchema.parse(eventInput)).toMatchObject({
      title: 'TechNexus 2026: National Hackathon',
      eventType: 'competition',
      maxParticipants: 150,
    });
  });

  it('validates participant registrations and certificate issuance', () => {
    const regStudent = {
      eventId: '123e4567-e89b-12d3-a456-426614174020',
      participantCategory: 'student',
      studentId: '123e4567-e89b-12d3-a456-426614174021',
    };
    expect(registerEventParticipantSchema.parse(regStudent)).toMatchObject({
      participantCategory: 'student',
    });

    const regGuest = {
      eventId: '123e4567-e89b-12d3-a456-426614174020',
      participantCategory: 'guest',
      guestName: 'Dr. Anita Roy',
      guestEmail: 'anita.roy@example.com',
    };
    expect(registerEventParticipantSchema.parse(regGuest)).toMatchObject({
      participantCategory: 'guest',
      guestName: 'Dr. Anita Roy',
    });

    const certInput = {
      registrationId: '123e4567-e89b-12d3-a456-426614174022',
      title: 'Certificate of Excellence - First Place Winner',
      certificateType: 'merit',
    };
    expect(issueEventCertificateSchema.parse(certInput)).toMatchObject({
      certificateType: 'merit',
    });
  });
});
