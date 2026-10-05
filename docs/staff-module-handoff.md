# Staff module — programmer handoff

**Last updated:** 2026-10-06  
**Audience:** Engineering team  
**Product name in UI:** **Employee portal** (`/employee/*`)  
**Legacy name:** **Staff** (`hrms-fasttrade/staff/`)  
**Status:** Employee portal through PR #35 is on `main`. Open product gaps are in [features.md](./features.md) §23.

---

## 1. What is the Staff module?

In the old PHP system, everyday employees used the **Staff** area. In HRMS 2.0 this is the **Employee portal** — self-service for people who are not managers/HR.

| Legacy (`staff/`) | New route | Status | Notes |
|---|---|---|---|
| `dashboard.php` | `/employee/dashboard` | ✅ Built | Leave balance, attendance summary, doc compliance, quick actions |
| `profile.php` | `/employee/profile` (+ address, security, payroll) | ✅ Built | TP1/Zakat/EPF declarations, self-service password reset |
| `apply_leave.php`, `history.php` | `/employee/leave` | ✅ Built | Full lifecycle: apply, cancel, revoke, attachments, blackout check, replacement credit |
| `my_calendar.php` | `/employee/calendar` | ✅ Built | Approved leaves, public holidays, shift schedules |
| `my_attendance.php` | `/employee/attendance` | ✅ Built | Clock in/out, GPS geofencing, overnight shifts, shift grace late detection |
| `apply_manual_attendance.php` | `/employee/manual-attendance` | ✅ Built | Manual clock adjustment requests |
| `apply_late.php` | `/employee/report-late` | ✅ Built | Late justification submissions |
| `apply_ot.php` | `/employee/overtime` | ✅ Built | Overtime claim requests |
| `apply_claim.php` | `/employee/claims` | ✅ Built | Expense claims submission & tracking |
| `replacement_credit.php` | `/employee/replacement-credit` | ✅ Built | Earned replacement credit balance & consumption |
| `payslips.php`, `payslip_view.php` | `/employee/payslips` | ✅ Built | Locked payrun only, PDF download, email delivery |
| `my_documents.php` | `/employee/documents` | ✅ Built | Employee document upload & expiry tracking |
| `announcements.php` | `/employee/announcements` | ✅ Built | Company-wide & branch announcement feeds |
| `my_performance.php` | `/employee/performance` | ✅ Built | Self-appraisals during active cycles |
| `my_assets.php` | `/employee/assets` | ✅ Built | Assigned company assets list |
| — | `/employee/schedule` | ✅ Built | Connected to live HR roster & shift entries |
| — | `/employee/notifications` | ✅ Built | Live notification outbox / in-app feed & mark-as-read |
| — | `/employee/timesheet` | ✅ Built | Monthly & weekly timesheet view |

**Design source:** `pencil-new.pen` → see [ui-design-inventory.md](./ui-design-inventory.md) § Employee portal.  
**Demo login:** `employee@demo.hrms.local` (after `pnpm seed-role-accounts`)

---

## 2. Module boundaries

### In scope (Staff / Employee)

- View own employment data (read-only)
- Submit requests: leave (with MC/attachment), attendance correction, late report, OT, claims, replacement credit
- Cancel pending requests / submit revocation for approved leaves
- Clock in/out with GPS geofencing & overnight shift support
- View and download payslips from **locked** payruns only
- Upload required compliance documents & monitor expiry
- Update **payroll declarations** (TP1 reliefs, zakat, voluntary EPF) — `/employee/profile/payroll`
- Change own password — `/employee/profile/security`
- Self-appraisal during performance review cycles
- View personal schedule & shift roster

### Out of scope (other roles)

| Task | Owner | Route |
|------|-------|-------|
| Create/edit employee records | HR Admin | `/hr/employees` |
| Approve leave/claims/OT/late/revocations | Manager | `/manager/approvals` |
| Payroll calculation & locking | HR Admin | `/hr/payroll` |
| Org structure, policies, rosters, blackout dates | HR Admin | `/hr/organization`, `/hr/rostering` |

---

## 3. Tech map (where to code)

| Area | Path |
|------|------|
| Routes / pages | `apps/web/src/app/(employee)/employee/**` |
| Layout + mobile nav | `apps/web/src/app/(employee)/layout.tsx`, `apps/web/src/components/employee/employee-mobile-nav.tsx` |
| Server actions | `apps/web/src/app/(employee)/employee/actions.ts`, per-page `actions.ts` |
| Employee data queries | `apps/web/src/lib/employees/self.ts` |
| Leave domain & engine | `apps/web/src/lib/leave/`, `packages/domain/src/leave/` |
| Attendance & geofencing | `apps/web/src/lib/attendance/`, `apps/web/src/lib/attendance/geofence.ts` |
| Payslips | `apps/web/src/lib/employee/payslips.ts`, `apps/web/src/lib/email/payslip-mailer.ts` |
| Payroll declarations | `apps/web/src/lib/employee/payroll-declarations.ts` |
| Notifications outbox | `apps/web/src/lib/notifications/` |
| Security / rate limiting | `apps/web/src/lib/rate-limit.ts`, `apps/web/src/middleware.ts` |
| Domain rules | `packages/domain/` |
| Auth / role guard | `apps/web/src/middleware.ts`, `apps/web/src/lib/auth/session.ts` |

---

## 4. Completed PRs & changelog

Employee-portal work merged through PR #35. Product gaps that are still open live in [features.md](./features.md) §23A.

### Foundation, Core Sprints & Polish (PR #1 – PR #20)

| PR | Branch / Topic | Description & Scope |
|---|---|---|
| **#1** | `feat/employee-leave-attachment-upload` | MC / Medical & supporting document uploads for leave requests with Cloudflare R2 storage & signed URLs. |
| **#2** | `enhancement/employee-notifications` | Real notifications engine replacing mock data; database outbox, mark as read, event subscription. |
| **#3** | `feat/sync-approval-status` | Real-time approval status sync across leave, claims, OT, and manual attendance with event-driven cache invalidation. |
| **#4** | `feat/secure-payslip-access` | Strict RLS & server-side enforcement: locked payruns only, employee tenant isolation test suite. |
| **#5** | `feat/employee-activation` | End-to-end employee onboarding: invitation token verification, password set, direct dashboard onboarding. |
| **#6** | `feat/attendance-clock-status` | Clock UI states (success, GPS denied, already clocked in, out of bounds) aligned with Pencil design. |
| **#7** | `feat/employee-leave-balance` | Accurate entitlement computation (entitled, taken, pending, balance) on dashboard and leave apply form. |
| **#8** | `feat/leave-blackout-period` | Validation engine blocking employee leave requests overlapping company/branch blackout periods. |
| **#9** | `feat/employee-document-compliance-dashboard` | Document compliance widget on dashboard alerting employees on missing or expired mandatory documents. |
| **#10** | `feat/standardize-empty-states` | Standardized `ListCard` empty states across claims, announcements, payslips, and documents. |
| **#11** | `feat/mobile-responsive` | Mobile viewport audit & responsiveness across all `/employee/*` screens down to 375px width. |
| **#12** | `feat/employee-schedule-roster` | Real shift schedule & roster view for employees powered by HR shift assignments. |
| **#13** | `feat/automated-payslip-email` | Background cron job and email worker dispatching payslip links/PDFs upon payrun lock. |
| **#14** | `feat/document-expiry-reminder` | Automated cron notification alerts for employees and HR prior to document expiration. |
| **#15** | `feat/gps-geofence-clock-in` | Branch GPS geofencing validation with radius checks and audit trail logging on clock in/out. |
| **#16** | `feat/employee-playwright-testing` | Full Playwright E2E test suite covering login, clock in/out, leave application, and payslip viewing. |
| **#17** | `feat/employee-RLS-security-audit` | Comprehensive database RLS security audit preventing cross-tenant and cross-employee data leaks. |
| **#18** | `feat/database-performance-optimization` | Database index creation for hot query paths (`attendance_records`, `leave_requests`, `file_objects`). |
| **#19** | `feat/employee-rate-limiting` | Upstash/in-memory rate limiting guards on clock-in, leave apply, and authentication endpoints. |
| **#20** | `enhancement/email-and-payslip-template` | Responsive HTML email templates for payslips and system notifications. |

### Advanced Lifecycle & Attendance Enhancements (PR #25 – PR #30)

| PR | Branch / Topic | Description & Scope |
|---|---|---|
| **#25** | `feat/leave-lifecycle-and-approvals` | Comprehensive leave lifecycle: cancellation of pending requests, employee revocation workflow for approved leave, auto-expiry cron engine, and manager approvals view-all tabs. |
| **#26** | `feat/replacement-credit-consume` | Support for earning replacement credits and consuming replacement credits when applying for replacement leave. |
| **#27** | `feat/attendance-shift-grace-late-detection` | Dynamic tardiness detection based on rostered shift start time + branch-level grace period minutes. |
| **#28** | `feat/overnight-shift` | Full support for overnight shifts spanning past midnight, plus standardized Malaysian `DD/MM/YYYY` date displays. |
| **#29** | `feat/auto-clock-out-after-shift-ends` | Background cron engine automatically clocking out employees who forgot to clock out after shift conclusion. |
| **#30** | `feat/tardiness-alert` | Real-time automated tardiness notification alert triggered when an employee is unclocked after shift start + grace. |
| **#31** | `feat/real-notifications` | Live notification outbox replaces the placeholder feed, with unread filtering. |
| **#32** | `feat/leave-attachment-upload` | MC attachment required on apply; approvers can view the file from R2. |
| **#33** | `feat/hr-positions-catalog-and-status-styling` | Positions catalog under HR Organization; employee create/edit selects a position. |
| **#34** | `feat/leave-accrual-carry-forward-jobs` | Monthly leave accrual, year-end carry-forward rollover, and leave balance audit. |
| **#35** | `feat/appraisal-templates` | Reusable appraisal template builder, preview, and cycle creation. |

---

## 5. What is already done (Summary of capabilities)

- ✅ **Dashboard & Overview:** Leave balance cards, daily attendance status, pending request trackers, document compliance alert.
- ✅ **Leave Management:** 
  - Leave entitlement & balance tracking.
  - Blackout period blocking.
  - Mandatory attachment upload (MC / medical certs) via R2.
  - Pending leave self-cancellation.
  - Approved leave revocation workflow.
  - Replacement credit earning & consumption.
  - Leave balance auto-expiry engine & cron.
- ✅ **Attendance & Time Tracking:**
  - Clock in / Clock out with dynamic state feedback.
  - Branch GPS geofencing & distance calculation.
  - Shift grace period late detection.
  - Overnight shift handling (spanning midnight).
  - Automated clock-out cron for unattended shifts.
  - Employee tardiness notification alerts.
  - Manual attendance adjustment and late reporting requests.
- ✅ **Payroll & Payslips:**
  - Locked payrun payslip viewer and PDF export.
  - Strict RLS isolation (only own locked payslips visible).
  - Automated payslip email notification on lock.
  - Self-service payroll tax relief declarations (TP1, Zakat, voluntary EPF).
- ✅ **Documents & Compliance:**
  - Document upload, preview, and download.
  - Expiry date tracking with automated email reminders.
- ✅ **Notifications & Communications:**
  - Real database outbox and in-app feed.
  - Mark-as-read status persistence.
  - Company & branch announcement board.
- ✅ **Security & Performance:**
  - Strict PostgreSQL RLS audit verified.
  - Indexed query paths on hot tables.
  - Endpoint rate limiting against automated abuse.
  - Playwright E2E test suites for employee journeys.
  - All Vercel cron schedules aligned to Malaysia time (UTC+8).

---

## 6. Business rules (enforced)

1. **Profile editing:** Employee edits **only** password + payroll declarations (TP1/zakat/voluntary EPF). Core personal/employment/bank details remain HR-managed.
2. **Payslips:** Visible **only** after payrun status = `locked`. Draft payruns are strictly inaccessible via RLS.
3. **Approvals:** Employee submissions create `approval_requests` routed to the assigned manager inbox.
4. **Leave calculations:** Working days exclude weekends and branch-assigned Malaysian public holidays.
5. **Leave attachments:** Mandatory when `requires_attachment = true` (e.g. Medical Leave).
6. **Replacement credit:** Must be active and unexpired to be consumed during replacement leave application.
7. **Shift grace & late detection:** Late flag evaluates `clock_in_time > shift_start_time + grace_period_minutes`.
8. **Tenant isolation:** Every database query is scoped by `organization_id` + RLS; employees can only query their own records.
9. **File storage:** All uploads stream to Cloudflare R2 via `file_objects` with presigned, short-lived download URLs.

---

## 7. Dependencies & cross-module integration

| Staff feature | Integration point | Status |
|---|---|---|
| Leave approval status & revocations | Manager portal (`/manager/approvals`) | ✅ Connected |
| Payslip generation & release | HR payroll lock (`/hr/payroll`) | ✅ Connected |
| Document compliance | HR required-documents configuration | ✅ Connected |
| Shift schedule & late detection | HR Rostering & shift settings | ✅ Connected |
| GPS geofence validation | Branch latitude/longitude & radius config | ✅ Connected |
| Outbox notifications & crons | Notification engine & Vercel crons (UTC+8) | ✅ Connected |

---

## 8. Verification & testing commands

```bash
# Dependencies & types
pnpm install
pnpm typecheck
pnpm lint

# Unit & integration test suites
pnpm test

# Run employee Playwright E2E tests
pnpm test:e2e

# Local dev server
pnpm dev                    # http://localhost:3000

# Seed demo data for testing
pnpm seed-role-accounts --password 'DemoPass123!'
pnpm seed-rich-demo -- --count 45
pnpm seed-demo-data
```

**Key manual test paths:**
1. Login as `employee@demo.hrms.local` → apply leave with attachment → check balance reduction → test cancel.
2. Clock in with GPS check → verify shift grace status → view timesheet.
3. Check `/employee/notifications` for real approval/tardiness events → mark as read.
4. Access `/employee/payslips` → verify locked payslip PDF preview.

---

## 9. Related docs

| Doc | Purpose |
|-----|---------|
| [features.md](./features.md) | Full product feature matrix |
| [developer-brief.md](./developer-brief.md) | Stack, roles, build order |
| [development-phases.md](./development-phases.md) | Phase 4 Employee portal checklist |
| [ui-design-inventory.md](./ui-design-inventory.md) | Pencil screen checklist |
| [auth-session.md](./auth-session.md) | Login / session rules |
| [seed-role-accounts.md](./seed-role-accounts.md) | Demo account setup |

---

## 10. Resolved product decisions

All previous open questions have been decided and implemented:

1. **Phone & Address Editing:** **HR-only** (read-only for employees at `/employee/profile/address` with a "Contact HR if your address needs to be updated" notice) to prevent payroll tax/statutory mismatches without verification.
2. **Dependents & TP1 Declarations:** **Split model** — employees self-serve TP1 tax relief deductions, monthly/annual Zakat, and voluntary EPF extra contributions (`/employee/profile/payroll`). Marital status, statutory salary, and official dependent counts remain HR-managed.
3. **GPS Geofence Clock-in:** **Branch-configurable** via `outsideAction` (`block` vs `flag`) in branch geofence settings. If `outsideAction: "flag"`, clock-in is permitted with an `out_of_range` audit flag; if `"block"`, out-of-radius clock-ins are rejected.
4. **Notification Channels:** **Multi-channel** — powered by the database notifications outbox supporting both real-time in-app feed (`channel: "in_app"`) and asynchronous email notifications (`channel: "email"`) via Resend.

