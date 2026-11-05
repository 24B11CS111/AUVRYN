# Milestone 7: Universal Examination & Results Management

## 1. Architectural Overview & Universal Design

Milestone 7 delivers a configurable, institution-wide examination, evaluation, and results engine supporting every educational institution archetype:
- **K-12 Schools**: Periodic unit tests, midterms, CBSE/State letter grading ($A1 - E$), continuous comprehensive evaluation (CCE), and annual examinations.
- **Junior / Intermediate Colleges**: State board practicals, theory exams, and percentage marks.
- **Degree Colleges**: Semester examinations, theory/practical splits, continuous assessments, and percentage / GPA conversions.
- **Engineering Colleges**: Autonomous credit-based systems, internal assessments ($30\%$), semester end examinations ($70\%$), laboratory viva-voce, SGPA/CGPA calculations, and backlog tracking.
- **Universities**: Multi-program departmental grading, relative/absolute 10-point scales (UGC/AICTE), supplementary exams, and revaluations.

This engine unifies all assessment types into a normalized PostgreSQL schema with Row-Level Security (RLS), stored procedures for atomic transactions, and a Next.js 14 Web Dashboard.

```
+-------------------------------------------------------------------------------------------------------+
|                                    UNIVERSAL EXAMINATION ARCHITECTURE                                 |
+-------------------------------------------------------------------------------------------------------+
|  Examinations (Title, Type, Academic Year, Class, Grading Scheme, Max/Passing Marks, Status)          |
|    |                                                                                                  |
|    +---> Exam Subjects (Subject, Assessment Type, Credits, Max Marks, Date, Room, Invigilator Staff) |
|    |       |                                                                                          |
|    |       +---> Student Exam Marks (Student, Marks Obtained, Absent, Exempt, Grade, Audit History)   |
|    |       |       |                                                                                  |
|    |       |       +---> Marks Corrections (Previous Marks, New Marks, Reason, Timestamp, Corrector)  |
|    |       |                                                                                          |
|    |       +---> Schedule Conflict Checker (Verifies room & invigilator availability without clashes) |
|    |                                                                                                  |
|    +---> Grading Schemes & Rules (GPA 10, GPA 4, Letter Grade A1-E, Percentage intervals, Pass/Fail)  |
|    |                                                                                                  |
|    +---> Consolidated Results Ledger (Total Marks, Percentage, GPA/CGPA, Backlogs, Stamped Version)   |
|    |                                                                                                  |
|    +---> Hall Tickets (Admit card number, Examination Timetable, Room Allocation, Tamper-proof QR)    |
|    |                                                                                                  |
|    +---> Revaluation Applications (Original Marks, Revised Marks, Reviewer Notes, Audited Sync)      |
+-------------------------------------------------------------------------------------------------------+
```

---

## 2. Examination Lifecycle & Supported Assessment Types

### Examination Lifecycle States
- `draft`: Configuration phase; subjects and rules being drafted.
- `scheduled`: Dates finalized; hall tickets generated; visible on timetable.
- `in_progress`: Active examination window; faculty entry rosters active.
- `completed`: All subjects concluded; marks verification in progress.
- `published`: Consolidated results ledger finalized and open to student/parent visibility.
- `cancelled`: Aborted examination cycle.

### Publication Security Boundary
- `unpublished`: Draft/internal results. **RLS strictly blocks students and parents from viewing marks or results**.
- `under_review`: Moderator review. Still inaccessible to students.
- `published`: Legally published. Accessible to students (own transcript only) and parents (linked child only).
- `withdrawn`: Temporarily withheld results pending re-audit.

### Assessment Types
1. `theory`: Traditional written examinations.
2. `practical`: Laboratory and hands-on experiments.
3. `laboratory`: Computational or clinical lab evaluations.
4. `internal_assessment`: Continuous formative assessments, quizzes, assignments.
5. `external_assessment`: Central university or board invigilated evaluations.
6. `viva`: Oral defense, interviews, or project viva-voce.
7. `project`: Capstone reviews, theses, and industrial training presentations.

---

## 3. Configurable Grading Schemes & Version Retention

Grading systems vary across institutions. Milestone 7 implements a polymorphic grading scheme architecture:
- `gpa_10_point`: UGC/AICTE standard 10-point scale ($O: 10, A+: 9, A: 8, B+: 7, B: 6, C: 5, F: 0$).
- `gpa_4_point`: US/International 4.0 GPA scale ($A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0$).
- `letter_grade_percentage`: CBSE 8-point percentile division ($A1, A2, B1, B2, C1, C2, D, E$).
- `marks_based`: Direct percentage aggregation without grade points.
- `pass_fail`: Binary qualification (e.g. for audits or non-credit courses).

### Version Retention Guarantee
When results are published:
$$\text{GradingScaleVersion} \leftarrow \text{scale.version}$$
The exact version and rules used to compute the results are permanently stamped on `student_exam_results`. If an institution updates its grading scheme in the future, past transcripts remain authentic, reproducible, and legally immutable.

---

## 4. Faculty Marks Entry Roster & Audited Revision History

### Features
1. **Roster Auto-Generation**: Enrolled students for the target class and academic year are populated into the roster.
2. **Boundary Enforcement**:
   $$\text{marks\_obtained} \le \text{max\_marks} \quad \text{and} \quad \text{marks\_obtained} \ge 0$$
3. **Status Workflow**:
   - `draft`: Unsaved or work-in-progress faculty marks.
   - `submitted`: Finalized by instructor and locked against inadvertent edits.
   - `verified`: Approved by department chair or examination controller.
   - `locked`: Archival state.
4. **No Silent Overwrites**:
   Once a mark is in `submitted` status, direct row updates are forbidden. All modifications require an audit reason and must pass through the `correct_student_exam_mark` stored procedure. Every revision captures:
   - `previous_marks`
   - `new_marks`
   - `reason` (mandatory audit trail justification)
   - `corrected_by` (authenticated user UUID)
   - `corrected_at` (UTC timestamp)

---

## 5. Examination Timetable & Conflict Checking Engine

Examination scheduling runs on dedicated dates and times without disrupting normal weekly timetables.

### Stored Procedure: `check_exam_schedule_conflicts`
Checks for physical venue collisions and faculty invigilator double-booking:
$$\text{Overlap} \iff (\text{start}_1 < \text{end}_2) \land (\text{end}_1 > \text{start}_2)$$
- Checks if `room_id` is assigned to another exam subject during the same window.
- Checks if `invigilator_staff_id` is assigned to another exam subject during the same window.
- Returns JSON payload with `{ has_conflict: boolean, conflicts: [...] }`.

---

## 6. Digital Hall Tickets with Tamper-Proof Verification

Digital Hall Tickets (Admit Cards) can be batch-generated for all eligible students enrolled in the examination's target class.
- **Ticket Numbering**: Deterministic prefix (e.g., `HT-{admissionNumber}`).
- **Timetable Grid**: Complete schedule of allocated exam subjects, assessment types, dates, start/end times, and room locations.
- **Cryptographic QR Token**: Base64 SHA-256 validation token embedding institution ID, exam ID, student ID, and generation timestamp for offline invigilator verification.

---

## 7. Revaluation & Retotalling Workflow

1. **Student Application**:
   - Applied after result publication.
   - Captures subject, original marks, and student's detailed grievance reason.
2. **Reviewer Assignment**:
   - Academic administrator assigns an independent teaching faculty member to re-evaluate answer scripts.
3. **Outcome Resolution**:
   - `completed`: Revised marks are recorded. If marks changed, `correct_student_exam_mark` is automatically invoked to update `student_exam_marks` and write an immutable correction record.
   - `rejected`: Original marks upheld with explanatory reviewer notes.

---

## 8. Database Migrations & Stored Procedures

### Migrations
- Up: `supabase/migrations/20261105060000_examination_results.sql` (1,174 lines)
- Down: `supabase/migrations/rollback/20261105060000_rollback.sql`

### Tables Created
1. `grading_scales`
2. `grading_scale_rules`
3. `examinations`
4. `exam_subjects`
5. `student_exam_marks`
6. `marks_entry_corrections`
7. `student_exam_results`
8. `hall_tickets`
9. `exam_revaluations`

### Stored Procedures
1. `check_exam_schedule_conflicts(...)`
2. `record_student_marks_batch(...)`
3. `correct_student_exam_mark(...)`
4. `publish_examination_results(...)`

---

## 9. Web Dashboard Routes & Component Architecture

| Route | Client Component | Functionality |
|---|---|---|
| `/dashboard/examinations` | `ExamOverviewClient.tsx` | Overview metrics, quick actions, filterable examination ledger |
| `/dashboard/examinations/new` | `NewExamClient.tsx` | Form for scheduling new exams, targets, grading schemes |
| `/dashboard/examinations/[id]` | `ExamDetailsClient.tsx` | Subject allocation, conflict pre-checks, hall ticket generation |
| `/dashboard/examinations/[id]/marks` | `ExamMarksClient.tsx` | Marks roster, bulk paste, draft save, audited correction modal |
| `/dashboard/examinations/results` | `ExamResultsClient.tsx` | Published results ledger, search, printable student mark cards |
| `/dashboard/examinations/grading` | `GradingScalesClient.tsx` | Grading scale creator, rule thresholds, 10-point/4-point presets |
| `/dashboard/examinations/schedule` | `ExamScheduleClient.tsx` | Timetable calendar view, live room/staff conflict testing widget |
| `/dashboard/examinations/revaluation` | `RevaluationClient.tsx` | Revaluation workflow, reviewer assignments, marks correction sync |

---

## 10. Quality Assurance & Verification Results

### Vitest Test Suite
- **177 / 177 tests passing** across 15 test suites:
  - `tests/unit/exam-validators.test.ts`: 19 tests
  - `tests/security/exam-security.test.ts`: 14 tests
  - `tests/unit/rbac.test.ts`: 13 tests (9 exam permissions across 11 roles)
  - `tests/security/attendance-security.test.ts`: 6 tests
  - `tests/security/timetable-conflict.test.ts`: 6 tests
  - All existing student, staff, academic, and RLS suites.

### Monorepo Typecheck
- `@edu-platform/database`: 0 errors
- `@edu-platform/supabase-client`: 0 errors
- `@edu-platform/types`: 0 errors
- `@edu-platform/validators`: 0 errors
- `@edu-platform/mobile`: 0 errors
- `@edu-platform/web`: 0 errors

### Next.js Production Build
- `npx --workspace=@edu-platform/web next build`: **Compiled successfully**
- All 46 static and dynamic routes built with zero compiler errors.
