# HRMS development phases

**Last updated:** 23 Jul 2026  
**Audience:** product + engineering  
**Design source:** [`pencil-new.pen`](../pencil-new.pen) · [ui-design-inventory.md](./ui-design-inventory.md)  
**Architecture:** [developer-brief.md](./developer-brief.md) · [architecture-notes.md](./architecture-notes.md)

---

## How to use this doc

Each phase has:

- **Goal** — what “done” means
- **UI** — Pencil frames to implement
- **Function** — backend / auth / data work
- **Exit gate** — how we know we can move on

**Rule:** implement UI from Pencil; do not invent parallel designs. If a screen is missing from Pencil, design it first.

**Current deployment:** `DEPLOYMENT_MODE=standalone` (single org: Fasttrade HRMS).

---

## Where we are today

| Area | Status |
|------|--------|
| Monorepo, Supabase schema, CI, domain packages | ✅ Done |
| Infrastructure (Vercel, Supabase, R2, Resend, DNS) | ✅ Live |
| Auth: login, session, logout, password reset/activate | ✅ Done |
| Auth UI (Forest Sage split layout) | ✅ Deployed |
| Bootstrap admin account | ✅ Created |
| Portal routes (Employee, Manager, HR, etc.) | 🟡 Scaffold + shell |
| Role-based route guards | ✅ Done |
| HR Create Employee | ❌ Not started |
| Business modules (leave, payroll, …) | ❌ Schema only |

---

## Phase overview

```text
Phase 1 ─ Auth complete (UI + flows + guards)
Phase 2 ─ Design system + portal shell in code
Phase 3 ─ Identity & people (HR create employee, lists, detail)
Phase 4 ─ Employee portal (self-service)
Phase 5 ─ Manager portal (approvals + team)
Phase 6 ─ Shared services (approvals engine, email, R2, audit)
Phase 7 ─ Daily HR modules (leave, attendance, claims, OT)
Phase 8 ─ Supporting HR (documents, assets, announcements, appraisal)
Phase 9 ─ Malaysia payroll + payslips
Phase 10 ─ Professional / Enterprise + SaaS registration
Phase 11 ─ Legacy migration + UAT + cutover
```

Phases 1–3 unlock real users. Phases 4–9 deliver product value. Phases 10–11 are scale + go-live.

---

## Phase 1 — Auth complete (UI + login functionality)

**Goal:** Every auth screen matches Pencil; every auth flow works end-to-end in standalone mode; users land in the correct portal safely.

### 1A — Auth UI (Pencil → code)

| Screen | Pencil frame | Status | Notes |
|--------|--------------|--------|-------|
| Login (standalone) | Auth / Login (Standalone) | ✅ | |
| Login (SaaS) | Auth / Login (SaaS) | ✅ | Register CTA; hidden in standalone |
| Login mobile | Auth / Login Mobile (×2) | ✅ | Responsive shell covers both |
| Forgot password | Auth / Forgot Password | ✅ | |
| Reset link sent | Auth / Reset Link Sent | ✅ | |
| Reset password | Auth / Reset Password | ✅ | |
| Activate account | Auth / Activate Account | ✅ | Invite context from session |
| Register org (SaaS) | Auth / Register Organization | ✅ | UI only until Phase 10 |

**Tasks**

- [x] Deploy auth UI + `/cgi-sys` redirect to production
- [x] Set `NEXT_PUBLIC_SITE_URL` + Supabase redirect URLs on production
- [x] Wire “Remember me” — documented in [auth-session.md](./auth-session.md)
- [x] Activate page: load invite metadata (org name, role, email) from token/session
- [x] Profile → Change password — `/auth/change-password` + profile security stubs
- [x] Auth error states (no membership, callback failed, invalid link)

**Exit gate:** All auth routes match Pencil on desktop + mobile; smoke test on production URL.

### 1B — Auth functionality (security + flows)

| Capability | Status | Notes |
|------------|--------|-------|
| Email + password login | ✅ | |
| Session refresh (middleware) | ✅ | |
| Logout | ✅ | |
| Forgot / reset password email | 🟡 | Verify on production with Resend |
| Activate via email link | 🟡 | HR create employee sends link (Phase 3) |
| Post-login redirect by role | ✅ | |
| **Role-based route guards** | ✅ | |
| **Portal layout per role** | 🟡 | Forest Sage shell in Phase 2 |
| SaaS org registration API | ❌ | Phase 10 |
| 2FA | ❌ | Design exists on Manager Profile — later |

**Tasks**

- [x] Middleware or layout guards: map routes → allowed roles
- [x] Unauthorized → `/unauthorized` with dashboard link
- [x] Server helpers: `getSession()`, `requireRole()`, `requireOrgMembership()`
- [x] Auth audit events → `audit_events` table via service role
- [x] Document bootstrap admin — [bootstrap-admin.md](./bootstrap-admin.md)
- [x] Integration tests: route guard matrix (`tests/integration/auth-routes.test.ts`)

**Exit gate:** Employee cannot open `/hr/employees`; HR admin can; all auth emails work on production.

---

## Phase 2 — Design system + portal shell in code

**Goal:** Reusable components from Pencil (`Portal Components`, `Auth Components`) power every portal — not one-off pages.

### UI

| Component set | Pencil source | Use |
|---------------|---------------|-----|
| Auth components | Auth Components | ✅ `components/auth/` |
| Portal shell | Portal Components | 🟡 Forest Sage shell in `portal-shell.tsx` |
| List card pattern | Documents-style lists | HR lists, manager inboxes |
| Empty states | In-page empties | All list screens |
| Confirm dialog / toast | Shared | Approvals, destructive actions |

### Function

- [x] Forest Sage tokens in `globals.css` for auth + portals
- [x] `PortalShell` matching Pencil: 248px sidebar, nav icons, user menu, sign out
- [x] Topbar with portal label + user menu
- [x] Mobile: collapsible sidebar
- [x] Loading / error / empty state components in `@hrms/ui` (empty, list card, stat card, status pill, avatar)

**Exit gate:** Employee dashboard renders with real shell (not generic scaffold); HR dashboard same shell pattern.

---

## Phase 3 — Identity & people (HR core)

**Goal:** HR can create employees, view/edit profiles, and activate logins. This is the **first real business workflow**.

### UI (Pencil)

| Screen | Priority |
|--------|----------|
| **HR Admin / Create Employee** | P0 — design in Pencil if not final |
| HR Admin / Employees (list) | P0 |
| HR Admin / Employees — Empty | P0 |
| Employee Detail tabs (Personal, Address, Emergency, Employment, Bank, Security) | P1 |

### Function

- [ ] `POST` create employee: `employees` + `employee_profiles` + `organization_memberships` (roles)
- [ ] Optional: create `auth.users` + send activation email (Resend)
- [ ] Employee number generation; uniqueness per org
- [ ] List employees with search/filter (Documents-style card)
- [ ] Employee detail read/update with RLS
- [ ] Branch / department / manager assignment
- [ ] Deactivate employee (status → inactive/terminated)

**Exit gate:** HR creates employee → activation email → employee sets password → logs in as Employee portal.

---

## Phase 4 — Employee portal

**Goal:** Employee self-service for daily HR tasks.

### UI (~30 Pencil frames)

Implement in order:

1. Dashboard (+ mobile)
2. Profile (+ Address, Security, Change password)
3. Leave (apply + detail)
4. Attendance (+ clock states, manual, report late, timesheet)
5. Claims, OT, replacement credit
6. Payslips (+ view payslip)
7. Documents, calendar, announcements, notifications, assets, performance

### Function

Per module: API/server actions + RLS + validation. Start with **read-only** where possible, then **create** flows.

**Exit gate:** Employee applies leave (even if approval is stubbed); sees own profile and payslip list.

---

## Phase 5 — Manager portal

**Goal:** Manager approves team requests and views team data.

### UI (~25 Pencil frames)

1. Dashboard (+ mobile)
2. Approvals inbox (+ empty, bulk confirm, detail per type)
3. Team leave / attendance / calendar / performance
4. Profile tabs

### Function

- Depends on **Phase 6** approval engine for real approve/reject; can stub inbox with sample data during UI build.

**Exit gate:** Manager approves leave request end-to-end.

---

## Phase 6 — Shared services

**Goal:** Cross-cutting platform capabilities used by all modules.

| Service | Deliverable |
|---------|-------------|
| Approvals engine | State machine (domain package) + DB + inbox queries |
| Notifications | In-app + email (Resend templates) |
| Audit log | HR audit screen wired |
| File storage | R2 adapter (replace stub); signed URLs |
| Scheduled jobs | Job ledger + Vercel cron |
| Exports | CSV/PDF hooks for HR reports |

**Exit gate:** Approval + notification + file upload tested with tenant isolation.

---

## Phase 7 — Daily HR modules

**Goal:** Leave, attendance, claims, OT, replacement credit — full workflows.

| Module | HR | Employee | Manager |
|--------|----|----------|---------|
| Leave | Apply on behalf, policies | Apply, balance | Approve, team view |
| Attendance | — | Clock, manual, late | Team attendance |
| Claims | — | Submit | Approve |
| OT | — | Submit | Approve |
| Replacement credit | — | Submit | Approve |

**Exit gate:** Legacy import dry-run reconciles leave + attendance counts.

---

## Phase 8 — Supporting HR

Documents, assets, announcements, appraisal, compliance — UI from Pencil HR frames + employee views.

**Exit gate:** HR publishes announcement; employee sees it; document upload to R2 works.

---

## Phase 9 — Malaysia payroll

**Goal:** Payrun lifecycle + statutory calculations + payslips.

- Wire `packages/domain` payroll + golden tests
- HR Admin / Payroll + payrun detail (Pencil)
- Employee payslip view
- Lock/reopen rules; audit trail

**Exit gate:** Golden payroll cases pass; one payrun UAT on staging data.

---

## Phase 10 — Professional / Enterprise + SaaS

- Entitlement flags enforced server-side
- SaaS: Register Organization flow (UI + API)
- Multi-tenant org switcher
- Branch Admin, Director, Owner, Platform Admin portals (**after Pencil designs**)

---

## Phase 11 — Migration & cutover

- Legacy MySQL → Postgres import pipeline
- File migration → R2
- Full reconciliation + UAT
- One-time cutover (no ongoing dual-write)

---

## Recommended sequence (next 4–6 weeks)

| Week | Focus |
|------|--------|
| **Now** | Phase 1A deploy auth UI; Phase 1B role guards |
| **+1** | Phase 2 portal shell; Phase 3 Create Employee (Pencil + code) |
| **+2** | Phase 3 employee list/detail; activation email E2E |
| **+3** | Phase 4 Employee dashboard + profile + leave UI |
| **+4** | Phase 6 approvals skeleton; Phase 4 leave submit |
| **+5** | Phase 5 manager inbox; first approval E2E |

---

## Login & auth checklist (master)

Use this to track **all** login-related work:

### Screens (UI)

- [x] Login standalone (desktop)
- [x] Login SaaS variant (desktop)
- [x] Login mobile (responsive)
- [x] Forgot password
- [x] Reset link sent
- [x] Reset password
- [ ] Activate account (full invite fields)
- [ ] Register organization (SaaS — Phase 10)
- [ ] Change password (profile)
- [ ] Auth error states (invalid link, expired, no membership)

### Flows (function)

- [x] Sign in with email/password
- [x] Sign out
- [x] Session middleware
- [x] OAuth callback route (`/auth/callback`)
- [ ] Forgot password email (prod verified)
- [ ] Reset password completes + auto sign-in
- [ ] Activate account from HR invite
- [ ] HR-triggered activation email
- [x] Redirect by highest role
- [ ] Enforce role on routes
- [ ] SaaS register org (Phase 10)
- [ ] Optional remember-me behavior

### Production config

- [ ] `NEXT_PUBLIC_SITE_URL` on Vercel
- [ ] Supabase site URL + redirect allowlist
- [ ] Resend domain + `MAIL_FROM`
- [ ] Bootstrap admin password rotated

---

## What NOT to do yet

- Build Owner / Director / Branch Admin / Platform Admin UI before Pencil designs exist
- Implement payroll UI before Phase 9 domain tests are green
- Skip role guards and “test” by manually typing URLs
- Self-service employee registration in standalone mode

---

## Related docs

- [ui-design-inventory.md](./ui-design-inventory.md) — screen checklist by role
- [developer-brief.md](./developer-brief.md) — product rules + original phase 0–10 table
- [architecture-notes.md](./architecture-notes.md) — auth model, RLS, deployment modes
