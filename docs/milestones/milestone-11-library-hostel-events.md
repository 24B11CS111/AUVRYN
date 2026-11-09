# Milestone 11: Universal Library, Hostel & Events Management

## 1. Architectural Overview & Universal Design

Milestone 11 completes the campus operations trinity for our multi-tenant Education Management Platform, introducing enterprise-grade, privacy-respecting modules for **Library Management**, **Hostel & Residential Accommodation**, and **Campus Events & Extra-Curricular Activities**:

- **Module A — Universal Library Management**:
  - **Multi-Branch Catalogs**: Multi-campus and departmental branch management (`library_branches`) with geolocated branch codes, opening hours, and campus bindings.
  - **Comprehensive Book Cataloguing**: Titles with ISBN-10/13, Dewey Decimal Classification, author/publisher metadata, editions, subject tags, cover imagery, and digital resource linking (`library_books`, `digital_resources`).
  - **Accession & Barcode Inventory Tracking**: Physical copies tracked individually (`library_copies`) with unique accession numbers, barcodes, copy condition, and real-time status transitions (`available`, `issued`, `reserved`, `lost`, `damaged`, `under_repair`, `weeded`).
  - **Member Quotas & Circulation Desk**: Student and staff library membership profiles (`library_members`) with tier-specific borrow allowances and loan periods. Issue and return workflows are executed via atomic PostgreSQL transactions (`issue_library_book_atomic`, `return_library_book_atomic`) preventing double-issue and enforce borrowing quotas.
  - **Reservations & Holds**: Automatic waitlist queues (`library_reservations`) with configurable reservation expiry windows.
  - **Configurable Fines & Waivers**: Dynamic overdue rules with per-day fines, grace periods, and maximum liability caps (`library_settings`, `library_fines`) with auditable payment receipts and administrative waiver tracking.

- **Module B — Residential Hostel Management**:
  - **Hostel Infrastructure**: Multi-building residential facilities (`hostel_buildings`, `hostel_rooms`, `hostel_beds`) with floor hierarchies, gender segregation policies (`boys`, `girls`, `coed`), room specifications (`single`, `double`, `triple`, `dormitory`), AC and attached washroom flags, and fee structure linkages.
  - **Double-Allocation Prevention**: Strict database-level partial unique indexes (`idx_hostel_alloc_active_bed_unique` and `idx_hostel_alloc_active_student_unique`) and atomic functions (`allocate_hostel_bed_atomic`, `vacate_hostel_bed_atomic`) that physically guarantee no bed is assigned to multiple active residents, and no student holds multiple active rooms.
  - **Application & Room Transfer Workflows**: Room requests and internal room reassignment tracking (`hostel_applications`, `hostel_room_transfers`) with academic year preservation and approval states.
  - **Student Outpass & Gate Pass System**: End-to-end leave requests (`hostel_outpasses`) requiring parent digital consent and warden authorization, complete with verifiable gate pass codes and security checkpoint timestamp tracking (`departed`, `completed`, `overdue`).
  - **Visitor Log & Maintenance Desk**: Check-in/check-out logs for visitors (`hostel_visitors`) with identity proof records, and maintenance complaint management (`hostel_complaints`) categorized by maintenance discipline (`electrical`, `plumbing`, `carpentry`, `cleaning`, `internet`).
  - **Hostel Mess & Meal Plans**: Student boarding dietary subscriptions (`hostel_mess_records`) covering vegetarian, non-vegetarian, Jain, and special dietary preferences.

- **Module C — Events & Extra-Curricular Activities**:
  - **Multi-Category Campus Events**: Support for academic symposiums, cultural festivals, inter-collegiate sports meets, technical workshops, seminars, and student club activities (`institution_events`) with campus assignment, registration deadlines, and maximum capacity caps.
  - **Participant Registration & Auto-Waitlisting**: Atomic registration procedure (`register_event_participant_atomic`) verifying enrollment, enforcing capacity ceilings, generating unique alphanumeric ticket codes, and auto-waitlisting participants when full (`event_registrations`).
  - **Physical Check-in Attendance**: Rapid desk/scanner check-in logging (`event_attendance`) preventing duplicate check-ins and updating live turnout metrics.
  - **Verifiable Certificate Issuance**: Award and participation certificate issuance (`event_certificates`) supporting merit tiers (`participation`, `merit`, `winner`, `runner_up`) with unique certificate numbers and PDF verification links.

- **Mobile Experience (`apps/mobile`)**:
  - Student and guardian dashboard cards displaying active borrowed book count and impending due dates.
  - Hostel room allocation badge showing building, room, and bed numbers alongside live outpass statuses.
  - Upcoming institution events feed displaying registered ticket codes and schedules without leaking peers' records.

```
+--------------------------------------------------------------------------------------------------------------------------+
|                                    CAMPUS OPERATIONS & STUDENT LIFE ECOSYSTEM                                            |
+--------------------------------------------------------------------------------------------------------------------------+
|  Library Circulation & Cataloguing (`library_books`, `library_copies`, `library_circulations`, `library_fines`)           |
|    |                                                                                                                     |
|    +---> ISBN/Dewey Classification, Copy Accessioning, Atomic Issue/Return Transactions, Overdue Fine Calculations       |
|                                                                                                                          |
|  Residential Hostel Management (`hostel_buildings`, `hostel_rooms`, `hostel_beds`, `hostel_allocations`)                 |
|    |                                                                                                                     |
|    +---> Gender Policies, Partial Unique Bed Allocation Constraints, Atomic Check-in/Vacate, Warden/Parent Outpasses     |
|                                                                                                                          |
|  Campus Events & Activities (`institution_events`, `event_registrations`, `event_attendance`, `event_certificates`)      |
|    |                                                                                                                     |
|    +---> Capacity Management, Auto-Waitlist Queue, Ticket Codes, Check-In Attendance, Verifiable Digital Certificates    |
|                                                                                                                          |
|  Universal Dashboards & Mobile Portals (`/dashboard/library`, `/dashboard/hostel`, `/dashboard/events`, `apps/mobile`)    |
|    |                                                                                                                     |
|    +---> 24 Web Dashboard Routes across Library, Hostel & Events; Native Mobile Widgets for Borrowed Books & Outpasses   |
+--------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Database Schema & Migration Architecture

Canonical migration files:
- **Up migration**: `supabase/migrations/20261108090000_library_hostel_events.sql`
- **Rollback migration**: `supabase/migrations/rollback/20261108090000_rollback.sql`

### 2.1 Enums Defined
1. `library_copy_status`: `available`, `issued`, `reserved`, `lost`, `damaged`, `under_repair`, `weeded`
2. `library_circulation_status`: `issued`, `returned`, `overdue`, `lost`, `damaged`
3. `library_reservation_status`: `pending`, `fulfilled`, `cancelled`, `expired`
4. `library_fine_status`: `pending`, `paid`, `waived`
5. `library_resource_type`: `ebook`, `journal`, `thesis`, `audio`, `video`, `other`
6. `hostel_gender_policy`: `boys`, `girls`, `coed`
7. `hostel_room_type`: `single`, `double`, `triple`, `dormitory`
8. `hostel_allocation_status`: `active`, `vacated`, `cancelled`
9. `hostel_outpass_status`: `pending_consent`, `pending_approval`, `approved`, `rejected`, `departed`, `checked_out`, `completed`, `overdue`
10. `hostel_complaint_category`: `electrical`, `plumbing`, `carpentry`, `cleaning`, `internet`, `other`
11. `hostel_complaint_status`: `open`, `in_progress`, `resolved`, `closed`
12. `institution_event_type`: `academic`, `cultural`, `sports`, `workshop`, `seminar`, `club_activity`, `competition`, `other`
13. `event_status`: `draft`, `published`, `ongoing`, `completed`, `cancelled`
14. `event_registration_status`: `registered`, `waitlisted`, `confirmed`, `cancelled`
15. `event_certificate_type`: `participation`, `merit`, `winner`, `runner_up`

### 2.2 PostgreSQL Tables (23 Tables)
1. `library_branches`: Campus library facility branches.
2. `library_books`: Book titles and bibliographical records.
3. `library_copies`: Physical inventory copies with barcodes.
4. `library_members`: Registered library cardholders (student/staff).
5. `library_circulations`: Active and historical book borrowings.
6. `library_reservations`: Book reservations and hold queues.
7. `library_fines`: Overdue fines, fee records, and waiver notes.
8. `library_digital_resources`: Digital library assets and URLs.
9. `library_settings`: Institution library rules and fine rates.
10. `hostel_buildings`: Residential halls and warden assignments.
11. `hostel_rooms`: Room specs, bed counts, and amenities.
12. `hostel_beds`: Individual bed slots in rooms.
13. `hostel_allocations`: Resident student-to-bed assignments.
14. `hostel_applications`: Student hostel boarding applications.
15. `hostel_room_transfers`: Student room relocation requests.
16. `hostel_outpasses`: Digital gate passes and parent approvals.
17. `hostel_visitors`: Hostel guest check-in/out registers.
18. `hostel_complaints`: Facilities maintenance tracking.
19. `hostel_mess_records`: Dining and meal plan enrollments.
20. `institution_events`: Events, competitions, and seminars.
21. `event_registrations`: Participant tickets and waitlists.
22. `event_attendance`: Event check-in audit timestamps.
23. `event_certificates`: Verifiable achievement certificates.

### 2.3 Stored Procedures & Atomic Functions
- `issue_library_book_atomic(p_institution_id, p_copy_id, p_member_id, p_loan_days, p_issued_by, p_notes)`:
  Validates member active status, verifies borrowing quota against active loans, verifies copy availability with `FOR UPDATE` lock, creates circulation record, and marks copy as `issued`.
- `return_library_book_atomic(p_institution_id, p_circulation_id, p_returned_by, p_condition, p_notes)`:
  Locks circulation record, computes overdue days and fine against `library_settings`, records return timestamp, generates fine if applicable, and resets copy status to `available`.
- `allocate_hostel_bed_atomic(p_institution_id, p_student_id, p_bed_id, p_academic_year_id, p_allocated_from, p_allocated_to, p_allocated_by, p_fee_structure_id, p_notes)`:
  Locks bed record, asserts bed is `available`, verifies student has no active allocation, inserts `hostel_allocations` record, and updates bed status to `occupied`.
- `vacate_hostel_bed_atomic(p_institution_id, p_allocation_id, p_vacated_by, p_notes)`:
  Marks allocation as `vacated`, records actual check-out timestamp, and resets bed status to `available`.
- `register_event_participant_atomic(p_institution_id, p_event_id, p_category, p_student_id, p_staff_id, p_guest_name, p_guest_email, p_guest_phone, p_notes)`:
  Locks event row, checks capacity, verifies non-duplication, generates random ticket code, and assigns `registered` or `waitlisted` status.

### 2.4 Partial Unique Constraints
- Prevent bed double-allocation:
  ```sql
  CREATE UNIQUE INDEX idx_hostel_alloc_active_bed_unique 
  ON public.hostel_allocations (bed_id) 
  WHERE status = 'active';
  ```
- Prevent student holding multiple active rooms:
  ```sql
  CREATE UNIQUE INDEX idx_hostel_alloc_active_student_unique 
  ON public.hostel_allocations (institution_id, student_id) 
  WHERE status = 'active';
  ```

---

## 3. Web Dashboard Routes (24 Routes)

All routes are fully implemented with sub-navigation bars, role guards, filter queries, modal workflows, and responsive styling:

### Library Module (`/dashboard/library`)
1. `/dashboard/library`: Overall circulation metrics, loan counts, overdue books, and fine totals.
2. `/dashboard/library/books`: Book catalogue table with keyword, category, and branch filters.
3. `/dashboard/library/books/new`: Book catalogue creation form with ISBN, Dewey, and copy specifications.
4. `/dashboard/library/circulation`: Issue, return, and renewal circulation desk with member selection.
5. `/dashboard/library/members`: Student and staff library cards with borrow limits and barcodes.
6. `/dashboard/library/reservations`: Hold requests queue with automatic expiration indicators.
7. `/dashboard/library/fines`: Overdue fine ledger with payment recording and administrative waivers.
8. `/dashboard/library/reports`: Category distribution charts, borrow frequencies, and fine analytics.

### Hostel Module (`/dashboard/hostel`)
1. `/dashboard/hostel`: Residential overview, occupancy percentages, bed counts, and outpass overview.
2. `/dashboard/hostel/buildings`: Building management with floor counts, gender policies, and warden contacts.
3. `/dashboard/hostel/rooms`: Room inventory filtered by building with AC and washroom indicators.
4. `/dashboard/hostel/allocations`: Resident bed allocations with quick-vacate and search actions.
5. `/dashboard/hostel/applications`: Boarding applications review desk with approve/reject/waitlist modals.
6. `/dashboard/hostel/leave`: Multi-tier outpasses with parent consent status and warden departure/return controls.
7. `/dashboard/hostel/visitors`: Resident visitor logs with ID proofs and check-out timestamps.
8. `/dashboard/hostel/complaints`: Facilities maintenance ticketing system with category and priority flags.
9. `/dashboard/hostel/reports`: Occupancy breakdowns, complaint resolution rates, and floor heatmaps.

### Events Module (`/dashboard/events`)
1. `/dashboard/events`: Events catalog with status filters (draft, published, ongoing, completed).
2. `/dashboard/events/new`: Event creation form with venue, capacity, deadlines, and banner URLs.
3. `/dashboard/events/[id]`: Event details page with turnout ratios and registered participant rosters.
4. `/dashboard/events/registrations`: Participant rosters with ticket codes and waitlist status.
5. `/dashboard/events/attendance`: Real-time physical check-in desk with ticket code verification.
6. `/dashboard/events/certificates`: Achievement and participation certificate issuance modal.
7. `/dashboard/events/reports`: Turnout ratios, category breakdowns, and demographic participation stats.

---

## 4. Mobile Role-Based Experience (`apps/mobile`)

Implemented in `apps/mobile/src/screens/DashboardScreen.tsx`:
- **Student Profile**:
  - Displays currently borrowed books count, next due date, and overdue warnings.
  - Shows assigned hostel building, room number, bed number, and active outpass gate pass code.
  - Displays registered upcoming events with verifiable ticket codes.
- **Guardian Profile**:
  - Displays wards' library circulation state with fine warnings.
  - Highlights residential allocation and pending hostel outpasses requiring parent digital approval.
  - Displays wards' registered campus events and venues.
- **Privacy & Security**:
  - All queries are scoped strictly to the student's ID or the guardian's verified wards via `guardian_students`. Unrelated student records and rooms are inaccessible.

---

## 5. RBAC & Security Matrix

### 5.1 Permissions Added (12 New Permissions)
- `library:manage`: Full catalog and library branch management.
- `library:view`: Read-only access to books and circulation logs.
- `library:issue`: Desk operations for issuing and returning book copies.
- `library:catalog`: Adding and editing titles and copies.
- `hostel:manage`: Adding buildings, configuring room fees, and system settings.
- `hostel:view`: Viewing hostel buildings, resident lists, and complaints.
- `hostel:allocate`: Assigning and transferring students to beds.
- `hostel:outpass`: Approving outpasses and signing off gate passes.
- `events:manage`: Publishing events and altering capacities.
- `events:view`: Browsing public and institutional events.
- `events:register`: Registering oneself or dependent ward for an event.
- `events:certify`: Generating and issuing official participation certificates.

### 5.2 Role Permission Assignments
- `owner` & `admin`: Full access across all 12 permissions.
- `academic_admin`: Full library and event management, hostel view-only.
- `department_head`: Event view and register, library view, hostel view.
- `admissions_officer`: Hostel view and allocation rights during onboarding.
- `staff`: Library circulation desk operations (`issue`, `catalog`), hostel outpasses, event check-in and certificate issuance.
- `faculty`: Library view, event view, and event registration.
- `student` & `parent`: Library view, hostel view and outpass requests, event browsing and registration.

---

## 6. Verification & Quality Gates

| Check | Tool / Scope | Result | Details |
|---|---|---|---|
| **Unit & Security Tests** | Vitest (`tests/unit`, `tests/security`) | **288 / 288 PASS (100%)** | 24 test suites passing in 4.47s |
| **RBAC Matrix Verification** | `tests/unit/rbac.test.ts` | **PASS** | Validates staff desk limits, student view boundaries |
| **Bed Double-Booking Security** | `tests/security/library-hostel-events-security.test.ts` | **PASS** | Partial unique index simulation verifies concurrent safety |
| **Types Package Build** | `npm run build --workspace=@edu-platform/types` | **PASS (code 0)** | Clean TypeScript output |
| **Validators Package Build** | `npm run build --workspace=@edu-platform/validators` | **PASS (code 0)** | Clean Zod schemas with all aliases |
| **Database Package Build** | `npm run build --workspace=@edu-platform/database` | **PASS (code 0)** | 23 new tables mapped to Row types |
| **Web Workspace Typecheck** | `npm run typecheck --workspace=@edu-platform/web` | **PASS (code 0)** | `tsc --noEmit` with zero errors |
| **Mobile Workspace Typecheck** | `npm run typecheck --workspace=@edu-platform/mobile` | **PASS (code 0)** | Clean Expo/React Native TypeScript check |
| **Next.js Production Build** | `npm run build --workspace=@edu-platform/web` | **PASS (code 0)** | 106 routes compiled and prerendered |
| **Expo Android Bundle Export** | `npx --workspace=@edu-platform/mobile expo export --platform android` | **PASS (code 0)** | Metro bundled 613 modules into 2.45 MB bundle |
