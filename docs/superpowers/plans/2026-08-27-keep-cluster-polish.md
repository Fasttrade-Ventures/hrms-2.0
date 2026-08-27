# KEEP cluster polish + Platform Admin (cluster 12) Plan

> **For agentic workers:** Execute inline. No FUTURE (billing, marketing, multi-org GA, MFA productization).

**Goal:** Promote Medium KEEP clusters 2/9/10 to Low and REFACTOR cluster 12 → KEEP by shipping small honesty/ops fixes.

**Architecture:** Fail closed on R2 in outbox; document email ops; fix login error/copy; surface health on Platform dashboard for standalone ops.

**Tech Stack:** Next.js, `@hrms/platform` health, existing portal UI

## Tasks

### Task 1 — Files (#10): remove outbox R2 stub
- Modify `apps/web/src/lib/notifications/process-outbox.ts`
- Fail job when R2 unavailable unless `ALLOW_R2_STUB=1` (non-prod escape hatch)

### Task 2 — Notifications (#9): email ops checklist
- Create `docs/email-ops-checklist.md`
- Link from `docs/development-phases.md` / architecture-notes

### Task 3 — Identity (#2): login honesty
- Map `session_check_timeout` in login form
- Soften remember-me copy to match `docs/auth-session.md`

### Task 4 — Platform Admin (#12): health on dashboard
- Modify `apps/web/src/app/(platform)/platform/dashboard/page.tsx` (+ small UI)
- Call `runHealthChecks()`; show services + outbox depths
- Update features/ui inventory for thin shipped Platform Admin

### Task 5 — Findings scorecard
- Mark clusters 2,9,10,12 KEEP Low; note 15 KEEP + 0 REFACTOR (2 FUTURE remain)
