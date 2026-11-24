# AUVRYN — Complete Role Permission Matrix (RBAC)

## 1. Executive Summary

This matrix defines the authoritative access rights across all 5 user roles in AUVRYN, covering route access, server action execution, data mutation boundaries, and portal views.

---

## 2. Master Permission Matrix

| Feature / Operation | Institution Owner / Admin | Faculty / Teacher | Student | Parent / Guardian | HRIX Platform Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Route Access** | | | | | |
| `/dashboard/*` (Admin Hub) | **ALLOWED** | BLOCKED | BLOCKED | BLOCKED | BLOCKED (Use Admin Console) |
| `/portal/teacher` | AUDITED PREVIEW ONLY | **ALLOWED** | BLOCKED | BLOCKED | AUDITED PREVIEW ONLY |
| `/portal/student` | AUDITED PREVIEW ONLY | BLOCKED | **ALLOWED** | BLOCKED | AUDITED PREVIEW ONLY |
| `/portal/parent` | AUDITED PREVIEW ONLY | BLOCKED | BLOCKED | **ALLOWED** | AUDITED PREVIEW ONLY |
| `/hrix-admin` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | **ALLOWED** |
| **Institutional Governance** | | | | | |
| Institution Settings & Branding | **ALLOWED** | BLOCKED | BLOCKED | BLOCKED | **ALLOWED** |
| Academic Year & Campus Setup | **ALLOWED** | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Staff Hiring & Faculty Allocations | **ALLOWED** | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Student Admissions & Enrollment | **ALLOWED** | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Fee Structures & Invoicing | **ALLOWED** | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Platform Tenant Provisioning | BLOCKED | BLOCKED | BLOCKED | BLOCKED | **ALLOWED** |
| **Academic Operations** | | | | | |
| Mark Attendance | **OVERRIDE** | **ALLOCATED SECTIONS** | BLOCKED | BLOCKED | BLOCKED |
| View Attendance Records | **FULL INSTITUTION** | **ALLOCATED SECTIONS** | **OWN RECORDS** | **LINKED CHILDREN** | AUDIT LOG ONLY |
| Create Homework Assignments | **OVERRIDE** | **ALLOCATED SUBJECTS** | BLOCKED | BLOCKED | BLOCKED |
| Submit Homework | BLOCKED | BLOCKED | **ENROLLED SUBJECTS** | BLOCKED | BLOCKED |
| Grade Homework & Feedback | **OVERRIDE** | **ALLOCATED SUBJECTS** | BLOCKED | BLOCKED | BLOCKED |
| View Homework Scores & Feedback | **FULL INSTITUTION** | **ALLOCATED SUBJECTS** | **OWN SUBMISSIONS** | **LINKED CHILDREN** | AUDIT LOG ONLY |
| Publish Official Exam Results | **ALLOWED** | SUBMIT ONLY | BLOCKED | BLOCKED | BLOCKED |
| View Report Cards & Transcripts | **FULL INSTITUTION** | **ALLOCATED CLASSES** | **OWN REPORT** | **LINKED CHILDREN** | AUDIT LOG ONLY |
| **Communications & Alerts** | | | | | |
| Broadcast Institution Circulars | **ALLOWED** | BLOCKED | BLOCKED | BLOCKED | PLATFORM ADVISORIES |
| Broadcast Class/Section Circulars | **ALLOWED** | **ALLOCATED CLASSES** | BLOCKED | BLOCKED | BLOCKED |
| Receive Realtime Absence Alerts | BLOCKED | NOTIFICATION ONLY | NOTIFICATION ONLY | **PRIMARY / LINKED** | BLOCKED |
| Mark In-App Notifications Read | **OWN TRAY** | **OWN TRAY** | **OWN TRAY** | **OWN TRAY** | **OWN TRAY** |
| **Finance & Facilities** | | | | | |
| Collect & Record Fee Payments | **ALLOWED** | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Pay Fee Invoices Online | BLOCKED | BLOCKED | BLOCKED | **LINKED CHILDREN** | BLOCKED |
| School Bus Fleet & Driver Tracking | **MANAGE & DISPATCH** | VIEW BUS SCHEDULE | VIEW OWN ROUTE | **TRACK ASSIGNED BUS** | BLOCKED |
| Library Book Circulation | **MANAGE & ISSUE** | BORROW BOOKS | BORROW BOOKS | VIEW CHILD BORROWINGS | BLOCKED |
| Hostel Allocation & Leaves | **MANAGE & APPROVE** | BLOCKED | APPLY FOR LEAVE | APPROVE LEAVE | BLOCKED |

---

## 3. Audited Role Preview Architecture

In compliance with strict zero-trust standards:
- Institution Owners and Administrators **do not automatically inherit** parent, student, or teacher permissions on route guards.
- When an administrator requires visibility into how a dashboard appears to another role, they activate an explicit **Audited Role Preview Session**.
- During an Audited Role Preview:
  - An unambiguous visual warning banner is displayed across the top of the portal (`PortalTopNav.tsx` banner: *"AUDITED ROLE PREVIEW MODE"*).
  - All write mutations (grading, attendance submission, homework submission, fee payments) are cryptographically disabled in preview mode.
  - Every preview session is recorded in `audit_logs` with the actor's real user ID, target preview role, timestamp, and client IP address.
