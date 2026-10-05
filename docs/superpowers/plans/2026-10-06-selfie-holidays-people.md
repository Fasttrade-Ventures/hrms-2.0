# Selfie, holiday sync, birthdays, surveys, and goals

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional selfie clock-in, automatic Malaysia state-holiday refresh, and three employee extras: birthday and work-anniversary notices, a one-question pulse survey, and simple goals on an appraisal cycle.

**Architecture:** Reuse the existing clock-in path, R2 file storage, MyCal holiday import, notification outbox, and performance cycles. Do not add face recognition, WhatsApp, or a survey builder.

**Tech Stack:** Next.js server actions, Supabase migrations and RLS, existing R2 upload, Vercel crons, Vitest.

## Global Constraints

- Brand copy says BukuHR.
- No face matching and no storing a face template. A selfie is a photo on that clock-in only.
- Holiday names stay English, matching the current MyCal import.
- Birthday and anniversary mail uses the existing email outbox. No WhatsApp.
- These three people features are not in the locked Core / Professional / Enterprise table in `docs/pricing.md`. Ship them behind the existing `performance` module for goals, and behind Professional for selfie, surveys, and the digest. Holiday sync stays with the holiday screen HR already has.
- Do not start the staff-board cards (apply-on-behalf, mileage, multi-level approvals).

---

## What already exists

State holiday import is live. HR sets `branches.state`, then imports a year from `/hr/organization/holidays` through `importHolidays` and `fetchMalaysiaHolidaysForState` (`apps/web/src/lib/hr/malaysia-holidays-api.ts`). The plan does not rebuild that button. It adds a yearly refresh that calls the same function.

Clock-in is `clockIn` in `apps/web/src/lib/employee/attendance.ts`. It already stores GPS on `attendance_records`. There is no photo column.

`employee_profiles.date_of_birth` and `employees.join_date` already exist. Nothing sends a birthday or anniversary notice.

There is no survey table and no goal table. Appraisals and KPI rows already exist under `/hr/performance` and `/employee/performance`.

---

### Task 1: Yearly state-holiday refresh

**Files:** `apps/web/src/lib/hr/malaysia-holidays-api.ts`, `apps/web/src/app/(hr)/hr/organization/actions.ts`, new `apps/web/src/lib/hr/sync-state-holidays.ts`, new `apps/web/src/app/api/cron/state-holidays/route.ts`, `apps/web/vercel.json`

- [ ] Extract the insert/update loop inside `importHolidays` into `syncBranchHolidays(organizationId, branchId, year)` so the button and the cron share it.
- [ ] Cron `GET /api/cron/state-holidays` uses `authorizeCron`. For every branch with a state, sync the current calendar year. Skip branches with no state. One branch failure does not stop the others.
- [ ] Schedule it `0 2 2 1 *` (2 January, 02:00 UTC) in `vercel.json`.
- [ ] Test: a known MyCal payload updates an existing date name and inserts a new date, and a second run skips unchanged rows.

**Done when:** HR can still import from the holiday screen, and the cron refreshes every branch that has a state without duplicating dates.

---

### Task 2: Optional selfie on clock-in

**Files:** new migration `supabase/migrations/*_attendance_selfie.sql`, `apps/web/src/lib/employee/attendance.ts`, employee attendance page and clock action, `apps/web/src/lib/files/`

- [ ] Add `attendance_records.selfie_file_id` nullable, foreign key to `file_objects`.
- [ ] Add organization setting `require_clock_in_selfie boolean not null default false` on `organizations` (or the existing org settings table if one already holds attendance flags). Default off, so current GPS clock-in keeps working.
- [ ] When the setting is on, clock-in requires one image. Upload it to R2 with category `attendance-selfies` before inserting the attendance row. Store the file id. GPS rules stay as they are.
- [ ] Employee attendance screen: if the setting is on, open the camera, capture one frame, then submit with the existing clock-in. Show the photo on that day’s record for the employee. HR attendance detail can open the same file through the existing download auth, limited to that organization.
- [ ] Do not run clock-out through the camera.
- [ ] Test: setting off clocks in with no file. Setting on rejects a clock-in with no image. A stored file id belongs to the same organization as the attendance row.

**Done when:** a Professional org can turn selfie clock-in on, and a clock-in without a photo is rejected only while that setting is on.

---

### Task 3: Birthday and work-anniversary digest

**Files:** new `apps/web/src/lib/employees/celebrations.ts`, new `apps/web/src/app/api/cron/celebrations/route.ts`, `apps/web/vercel.json`, notification template next to the existing outbox templates

- [ ] Daily cron `0 0 * * *`. Find active employees whose `date_of_birth` month-day is today in Asia/Kuala_Lumpur, and whose `join_date` month-day is today and year is not this year.
- [ ] Queue one email and one in-app notice per match to that employee. Queue one digest email to HR administrators of that organization listing the names. Idempotency key `celebration:{organizationId}:{employeeId}:{kind}:{yyyy-mm-dd}`.
- [ ] Skip employees with a null birth date for birthdays. Anniversaries only need `join_date`.
- [ ] Test: 6 Oct birth date matches on 6 Oct any year. Join date this year does not count as an anniversary. The same day does not queue twice.

**Done when:** the morning job sends the employee notice and one HR digest, and a rerun does not send a second copy.

---

### Task 4: One-question pulse survey

**Files:** new migration `*_pulse_surveys.sql`, `apps/web/src/lib/hr/pulse.ts`, `/hr/performance` or a small `/hr/pulse` page, `/employee/pulse`

- [ ] Tables: `pulse_surveys` (organization, question, opens_on, closes_on, created_by) and `pulse_responses` (survey, employee, score 0–10, unique on survey + employee).
- [ ] HR creates one open question. Employees with a login submit one score while it is open. They cannot edit after submit.
- [ ] HR sees count and average. Do not show who gave which score on the summary. Store the employee id for the unique constraint only.
- [ ] Test: a second submit by the same employee is rejected. A score of 11 is rejected. Average of 8 and 10 is 9.

**Done when:** HR can open one pulse, staff can answer once, and HR sees the average without a per-person list.

---

### Task 5: Goals on an appraisal cycle

**Files:** new migration `*_appraisal_goals.sql`, `apps/web/src/lib/performance/goals.ts`, employee and manager appraisal pages

- [ ] Table `appraisal_goals`: organization, review cycle, employee, title, note, status `open` or `done`. An employee may add up to 5 goals on a cycle they are in.
- [ ] Employee adds and marks their own goals done from `/employee/performance`. Manager of that employee can read them on the review page and add one comment column `manager_note`. Manager cannot delete the employee’s goal.
- [ ] Do not score goals into the appraisal rating. KPI scores stay as they are.
- [ ] Test: a sixth goal is rejected. A manager outside that employee’s line cannot write `manager_note`.

**Done when:** an employee in an open cycle can keep up to five goals, and their manager can comment without changing the KPI score.

---

## Order

1. Holiday refresh, because the import already works.
2. Selfie clock-in.
3. Birthday and anniversary digest.
4. Pulse survey.
5. Goals.

Each task ships on its own. Do not wait for selfie before the holiday cron.

## Not in this plan

Face recognition, WhatsApp, Bahasa, native apps, zakat, salary advance, shift swap, org chart, and the staff-board cards already in To do.
