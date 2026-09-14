# Staff module — programmer handoff

**Last updated:** 2026-08-03  
**Audience:** Engineering team  
**Product name in UI:** **Employee portal** (`/employee/*`)  
**Legacy name:** **Staff** (`hrms-fasttrade/staff/`)

---

## 1. What is the Staff module?

In the old PHP system, everyday employees used the **Staff** area. In HRMS 2.0 this is the **Employee portal** — self-service for people who are not managers/HR.

| Legacy (`staff/`) | New route | Status |
|-------------------|-----------|--------|
| `dashboard.php` | `/employee/dashboard` | ✅ Built |
| `profile.php` | `/employee/profile` (+ address, security, payroll) | ✅ Built |
| `apply_leave.php`, `history.php` | `/employee/leave` | ✅ Built |
| `my_calendar.php` | `/employee/calendar` | ✅ Built |
| `my_attendance.php` | `/employee/attendance` | ✅ Built |
| `apply_manual_attendance.php` | `/employee/manual-attendance` | ✅ Built |
| `apply_late.php` | `/employee/report-late` | ✅ Built |
| `apply_ot.php` | `/employee/overtime` | ✅ Built |
| `apply_claim.php` | `/employee/claims` | ✅ Built |
| `replacement_credit.php` | `/employee/replacement-credit` | ✅ Built |
| `payslips.php`, `payslip_view.php` | `/employee/payslips` | ✅ Built |
| `my_documents.php` | `/employee/documents` | ✅ Built |
| `announcements.php` | `/employee/announcements` | ✅ Built |
| `my_performance.php` | `/employee/performance` | ✅ Built |
| `my_assets.php` | `/employee/assets` | ✅ Built |
| — | `/employee/schedule` | ✅ Built (needs roster data from HR) |
| — | `/employee/notifications` | 🟡 UI only — **placeholder data** |
| — | `/employee/timesheet` | ✅ Built |

**Design source:** `pencil-new.pen` → see [ui-design-inventory.md](./ui-design-inventory.md) § Employee portal.

**Demo login:** `employee@demo.hrms.local` (after `pnpm seed-role-accounts`)

---

## 2. Module boundaries

### In scope (Staff / Employee)

- View own employment data (mostly read-only)
- Submit requests: leave, attendance correction, late, OT, claims, replacement credit
- Clock in/out (with optional GPS geofence — Pro)
- View payslips from **locked** payruns only
- Upload missing required documents
- Update **payroll declarations** (TP1 reliefs, zakat, voluntary EPF) — `/employee/profile/payroll`
- Change own password — `/employee/profile/security`
- Self-appraisal during review cycles

### Out of scope (other roles)

| Task | Owner |
|------|--------|
| Create/edit employee records | HR Admin (`/hr/employees`) |
| Approve leave/claims/OT/late | Manager (`/manager/approvals`) |
| Payroll processing | HR Admin (`/hr/payroll`) |
| Org structure, policies | HR Admin (`/hr/organization`) |

---

## 3. Tech map (where to code)

| Area | Path |
|------|------|
| Routes / pages | `apps/web/src/app/(employee)/employee/**` |
| Layout + mobile nav | `apps/web/src/app/(employee)/layout.tsx`, `components/employee/employee-mobile-nav.tsx` |
| Server actions | `apps/web/src/app/(employee)/employee/actions.ts`, per-page `actions.ts` |
| Employee data queries | `apps/web/src/lib/employees/self.ts` |
| Leave / attendance / claims | `apps/web/src/lib/leave/`, `apps/web/src/lib/attendance/` |
| Payslips | `apps/web/src/lib/employee/payslips.ts` |
| Payroll declarations | `apps/web/src/lib/employee/payroll-declarations.ts` |
| Documents | `apps/web/src/app/(employee)/employee/documents/` |
| Domain rules | `packages/domain/` |
| Auth / role guard | `apps/web/src/middleware.ts`, `lib/auth/session.ts` |

---

## 4. TODO backlog (priority order)

Use this as the sprint backlog. **P0 = must have for production Staff module.**

### P0 — Wire real data & close gaps

| # | Task | Details | Acceptance criteria |
|---|------|---------|---------------------|
| 1 | **Real notifications** | Replace `getPlaceholderNotifications()` on `/employee/notifications` with DB outbox/in-app feed | Employee sees actual approval + document + announcement events; mark-as-read works |
| 2 | **Leave attachments** | MC / attachment upload when leave type `requires_attachment = true` | Apply-leave form accepts file; stored in R2; manager/HR can view on approval |
| 3 | **Approval status sync** | After manager approves/rejects, employee sees updated status without stale cache | Leave/claim/OT/late detail pages show timeline; dashboard counts refresh |
| 4 | **Payslip access rules** | Enforce locked-payrun-only + own-employee RLS | Employee cannot view draft payruns or other people's payslips (integration test) |
| 5 | **Auth E2E** | Activation + login + password change on production | HR creates employee → activation email → set password → lands on `/employee/dashboard` |

### P1 — Polish & parity with legacy

| # | Task | Details | Acceptance criteria |
|---|------|---------|---------------------|
| 6 | **Attendance clock states** | Match Pencil: success, GPS denied, already clocked in | UI states in `attendance-clock-panel.tsx`; E2E for each |
| 7 | **Leave balance display** | Show entitlement, used, pending, remaining on dashboard + apply form | Matches HR-configured `annual_leave_entitlement` + approved/pending requests |
| 8 | **Blackout period validation** | Block leave apply during org blackout (already on HR apply-behalf) | Employee apply shows clear error if dates overlap blackout |
| 9 | **Document compliance UX** | Highlight missing/expired required docs on dashboard | Link to `/employee/documents` with upload CTA |
| 10 | **Mobile responsive pass** | All `/employee/*` pages usable on phone (375px) | No horizontal scroll; forms usable; bottom nav not overlapping content |
| 11 | **Empty states** | In-page empties per Pencil (claims, announcements, payslips, documents) | Consistent `ListCard` / empty copy — no blank pages |

### P2 — Pro / Enterprise features

| # | Task | Tier | Details |
|---|------|------|---------|
| 12 | **GPS geofence clock-in** | Pro | Wire `lib/attendance/geofence.ts` to branch settings; block or flag out-of-radius clock-in |
| 13 | **My schedule / rosters** | Pro | HR publishes `roster_entries`; employee `/employee/schedule` shows real data |
| 14 | **Payslip email** | Pro | Cron `api/cron/payslip-email` sends PDF/link on pay date |
| 15 | **Document expiry notifications** | Pro | Cron notifies employee + HR before `expires_at` |

### P3 — Quality, performance, security

| # | Task | Details |
|---|------|---------|
| 16 | **Playwright journeys** | Desktop + mobile: login → apply leave → view status; clock in/out; view payslip |
| 17 | **RLS audit** | Employee queries only return `employee_id` matching session membership |
| 18 | **Query performance** | Index hot paths: `attendance_records(work_date)`, `leave_requests(employee_id, status)` |
| 19 | **Rate limiting** | Clock-in / form submit abuse protection |

---

## 5. What is already done (do not rebuild)

- ✅ All main routes exist under `/employee/*` (30 page files)
- ✅ Dashboard with leave balance, attendance status, request counts
- ✅ Profile tabs: Personal, Address, Security, Payroll declarations
- ✅ Leave apply + list + detail (`pending` → approval engine)
- ✅ Attendance clock in/out + timesheet + manual + report late
- ✅ Claims, OT, replacement credit submit → approval pipeline
- ✅ Payslips from locked `payroll_payrun_items`
- ✅ Documents upload/download (own files)
- ✅ Announcements list + detail
- ✅ Assets assigned to employee (read-only)
- ✅ Performance self-appraisal form
- ✅ Calendar (approved leave + holidays)
- ✅ Mobile bottom navigation (5 tabs)
- ✅ Module entitlement filtering on nav (`enabledModules`)

---

## 6. Business rules (must preserve)

1. **Profile editing:** Employee edits **only** password + payroll declarations (TP1/zakat/voluntary EPF). Personal/employment/bank changes go through HR.
2. **Payslips:** Visible only after payrun status = `locked`.
3. **Approvals:** Employee submissions create `approval_requests` → manager inbox. Status: `pending` → `approved` / `rejected`.
4. **Leave days:** Working-day calculation excludes weekends + branch holidays.
5. **Tenant isolation:** Every query scoped by `organization_id` + RLS; employee sees own row only.
6. **Files:** Uploads go to R2 via `file_objects`; download via signed URL API.

---

## 7. Dependencies on other modules

| Staff feature | Depends on |
|---------------|------------|
| Leave approval status | Manager portal + approvals engine (Phase 6) |
| Payslips | HR payroll lock (Phase 8/9) |
| Documents compliance | HR required-documents config |
| Schedule | HR rosters (Pro) |
| GPS attendance | Branch geofence config (Pro) |
| Notifications | Notification outbox + cron |

---

## 8. Suggested sprint plan (2–3 weeks)

| Week | Focus |
|------|--------|
| **Week 1** | P0 items 1–3 (notifications, leave attachments, approval sync) |
| **Week 2** | P0 items 4–5 + P1 items 6–8 (payslip security, auth E2E, attendance/leave polish) |
| **Week 3** | P1 items 9–11 + start P3 Playwright + mobile pass |

---

## 9. Verification commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm dev                    # http://localhost:3000

# Demo data
set -a && source apps/web/.env.local && set +a
pnpm seed-role-accounts --password 'DemoPass123!'
pnpm seed-rich-demo -- --count 45
pnpm seed-demo-data
```

**Manual test path:** Login as `employee@demo.hrms.local` → dashboard → apply 1-day leave → check list → view payslip → upload document.

---

## 10. Related docs

| Doc | Purpose |
|-----|---------|
| [features.md](./features.md) | Full product feature matrix |
| [developer-brief.md](./developer-brief.md) | Stack, roles, build order |
| [development-phases.md](./development-phases.md) | Phase 4 Employee portal checklist |
| [legacy-feature-map/module-index.md](./legacy-feature-map/module-index.md) | Legacy `staff/` file list |
| [ui-design-inventory.md](./ui-design-inventory.md) | Pencil screen checklist |
| [auth-session.md](./auth-session.md) | Login / session rules |
| [seed-role-accounts.md](./seed-role-accounts.md) | Demo account setup |

---

## 11. Open questions for product owner

1. Should employees **edit phone/address** themselves, or stay HR-only?
2. Should **dependents (spouse/children)** be employee self-service for TP1, or HR-only?
3. GPS clock-in: **hard block** or **allow with flag** when outside geofence?
4. Notifications: in-app only, or also **email/SMS** for approvals?

Resolve these before P1/P2 implementation to avoid rework.
