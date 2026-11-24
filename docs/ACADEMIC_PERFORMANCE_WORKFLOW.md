# AUVRYN — Academic Performance & Communication Workflows

## 1. Executive Summary

This document specifies the closed-loop operational workflows linking academic activity (attendance recording, homework assignment, student submissions, and grading) to instantaneous stakeholder communication and mobile push notifications.

---

## 2. Workflow 1: Attendance Marking & Parent Absence Alerts

```
[Teacher in /portal/teacher or Mobile App]
                |
                v  Submits Section Roll Call (recordTeacherAttendanceAction)
[Verify Teacher Allocation for Section]
                |
                v  Upsert Attendance Records in student_attendance_records
[Identify Absent Students]
                |
                v  processAttendanceAbsenceNotifications()
[Resolve Linked Guardians via student_guardians]
                |
                v  queueAbsenceNotificationForGuardian()
[Batch Insert 'notifications' + 'notification_deliveries' with Category 'attendance']
                |
                +---> Realtime WebSocket Ping to Parent Web Portal
                |
                +---> Push Notification Dispatched to Parent Mobile Device
                      "Attendance Alert — AUVRYN: Student Absent for Session"
```

### Security & Verification Details
- **RBAC**: Teachers can only submit roll calls for sections where an active record exists in `academic_faculty_allocations`.
- **Deduplication**: Guaranteed by deterministic idempotency keys (`att_absence_${sessionId}_${studentId}_${guardianId}`). Re-submitting the same attendance roster does not send duplicate alerts.
- **Isolation**: Verified in `tests/security/academic-workflow-notifications.test.ts` (passed 100%).

---

## 3. Workflow 2: Coursework Assignment Lifecycle

### Step 1: Teacher Assigns Coursework
- **Action**: `createTeacherHomeworkAction`
- **Payload**: `classId`, `sectionId`, `subjectId`, `title`, `description`, `dueDate`, `maxMarks`.
- **Fan-Out Execution**:
  - Resolves enrolled students in the target class/section.
  - Resolves active guardians linked to enrolled students.
  - Automatically fans out in-app notifications and queues push deliveries:
    - Title: `New Coursework: [Title] Assigned`
    - Body: `Coursework assigned by [Teacher Name]. Due by [Date].`
    - Deep Link: `/portal/student/homework` or `/portal/parent/academics`

### Step 2: Student Submits Homework
- **Action**: `submitStudentHomeworkAction`
- **Payload**: `assignmentId`, `submissionContent`, `attachments`.
- **Execution**:
  - Inserts/updates `homework_submissions` with status `'submitted'`.
  - Notifies the allocated faculty member:
    - Title: `Coursework Submission: [Student Name]`
    - Body: `Submitted coursework for [Assignment Title].`
    - Deep Link: `/portal/teacher/homework`

### Step 3: Teacher Grades & Provides Individualized Feedback
- **Action**: `gradeTeacherHomeworkAction`
- **Payload**: `submissionId`, `marksObtained`, `teacherFeedback`.
- **Execution**:
  - Updates submission with `status: 'graded'`.
  - Fans out personalized notification strictly to the submitter and their guardians:
    - Title: `Coursework Graded: [Assignment Title]`
    - Body: `Score: [Marks]/[MaxMarks]. Feedback: [Feedback Preview]`
    - Deep Link: `/portal/student/results` or `/portal/parent/results`
  - **Confidentiality Check**: Verified in `tests/security/academic-workflow-notifications.test.ts` that grades and feedback are NEVER leaked to other students.

---

## 4. Workflow 3: Examination Marks & Report Cards

1. **Exam Configuration**: Owners & Academic Admins configure exams, grade scales, and schedules in `/dashboard/examinations`.
2. **Marks Entry**: Faculty submit marks per subject for their allocated classes.
3. **Publication Approval**: Academic Admin approves release of results.
4. **Stakeholder Broadcast**: Automated fan-out notifies all students and parents with official grade card summaries and GPA/rank progression.
