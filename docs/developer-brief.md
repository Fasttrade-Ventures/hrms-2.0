# HRMS — Developer brief

**Audience:** engineers building the new HRMS  
**Product owner intent:** greenfield rebuild; PHP legacy is the *behaviour* reference only  
**Last updated:** 23 Jul 2026  
**Full feature list:** [features.md](./features.md)

---

## 1. What we are building

A **standalone-first HRMS** for Malaysian SMEs, with optional **SaaS multi-tenant** mode later, using the **same codebase and schema**.

- Rebuild features from legacy [`hrms-fasttrade`](../../hrms-fasttrade) (PHP/MySQL) — do **not** extend the PHP app.
- Design-first UI lives in [`pencil-new.pen`](../pencil-new.pen). Implement screens from that file; do not invent a parallel design system.
- Fully migrate legacy MySQL data + uploaded files, then **one-time cutover** (no ongoing two-way sync).

### Product tiers (capability flags, not separate codebases)

| Tier | Intent |
|------|--------|
| **Core** | Complete HRMS day-to-day ops |
| **Professional** | Automation (reminders, accruals, multi-level approvals, etc.) |
| **Enterprise** | Analytics, integrations, governance, advanced workflows |

Enforce entitlements **server-side**; UI visibility is not security.

---

## 2. Fixed technical decisions

| Area | Decision |
|------|----------|
| App | Next.js App Router (TypeScript) |
| Monorepo | pnpm + Turborepo |
| Auth + DB | Supabase Auth + PostgreSQL + **strict RLS** |
| Files | Cloudflare R2, private objects, short-lived signed URLs |
| Hosting | Vercel (web) |
| Validation | Zod (shared package) |
| Money / payroll | Exact decimal math only — **never** JS floats for payroll |
| Time | `timestamptz` in DB; business rules in Asia/Kuala_Lumpur |

### Deployment modes

```text
DEPLOYMENT_MODE=standalone   → one customer, one Supabase DB, one R2 bucket
DEPLOYMENT_MODE=saas         → many orgs, shared DB, isolation via organization_id + RLS
```

Same migrations and application code for both.

### Target packages

```text
apps/web
packages/domain          # leave, attendance, approval, payroll rules (framework-free)
packages/platform        # tenant, entitlements, Supabase, R2, mail, jobs
packages/db              # generated types + repositories (server-only)
packages/ui              # design system + shell
packages/validation      # Zod schemas
packages/testkit         # fixtures
supabase/migrations
supabase/tests           # pgTAP + RLS matrices
scripts/legacy-import
tests/integration | e2e | migration
docs/
```

---

## 3. Roles and access

Authorization = **Role + Scope + Permission**.

| Role | Scope | Typical access |
|------|--------|----------------|
| **Employee** | Self | Leave, attendance, claims, OT, payslips, profile, docs, news |
| **Manager** | Direct reports / team | Approvals, team leave/attendance/calendar/performance |
| **Branch Admin** | One branch | Branch-scoped ops (design pending) |
| **HR Administrator** | Whole organization | People, org structure, apply-on-behalf, payroll views, assets, audit, announcements |
| **Director** | Organization | Read + approve at org level (design pending) |
| **Organization Owner** | Whole organization | Full org control, modules, billing (design pending) |
| **Platform Administrator** | SaaS only | Tenant ops — **not** in standalone |

Specialist capabilities are **permissions**, not roles: payroll processor/approver, recruiter, document custodian, asset manager, auditor, exporter, integration manager.

### Auth model rules (non-negotiable)

1. Supabase Auth user ≠ employee row. Link via membership.
2. Every business table has `organization_id`.
3. Derive authorization from membership / role / scope rows — **not** from editable JWT metadata.
4. RLS must enforce tenant + role isolation; add pgTAP positive/negative tests per phase.

### HR creates employees (not “invite”)

- HR **creates** an employee record (employment, branch, role, statutory fields).
- System may then send an **account activation / set-password** email so the person can log in.
- Do **not** model the primary HR flow as “invite to join org” like a SaaS self-serve invite.
- CSV import is supported for bulk create (Phase 2).

---

## 4. Modules to implement

### Employee portal

Dashboard · Apply Leave · Leave detail · Attendance (clock + overlays) · Manual attendance · Report late · Timesheet · Claims (+ detail) · OT (+ detail) · Replacement credit · Payslips (+ view) · Documents · Calendar · Announcements (+ detail) · Notifications · Profile (Personal / Address / Emergency / Employment read-only / Bank read-only / Security) · My Assets · Performance (self-appraisal)

### Manager portal

Dashboard · Approvals inbox (bulk + empty) · Approval details: Leave, Claim, OT, Late, Replacement credit · Team leave / attendance / calendar / performance · Performance review detail · Profile · Notifications

### HR Admin portal (UI partial)

Dashboard · Employees (+ employee detail tabs) · Organization · Apply behalf · Documents · Announcements · Calendar · Reports · Payroll · Assets · Audit · Profile  

**Still design / clarify before coding remaining HR screens:** Create Employee flow, empties, list polish, announcement publish, payrun detail, asset assign.

### Not designed yet (do not invent UI without design sign-off)

Branch Admin · Director · Organization Owner · Platform Admin

---

## 5. Design → code contract

1. **Source of truth for UI:** `pencil-new.pen` (Pencil). Screen inventory: [ui-design-inventory.md](./ui-design-inventory.md).
2. Visual language: blue shadcn-like tokens already in Pencil (`$accent.primary` ≈ `#2563EB`, card lists with soft shadow, muted header rows).
3. Lists follow the **Documents-style list card** pattern: padded card, title+count, rounded muted header, fixed column widths, one `fill` column, row bottom borders only.
4. Desktop-first frames in Pencil; implement responsive behaviour in code. Only a few mobile reference frames exist (Auth login mobile, Employee/Manager dashboard mobile).
5. Empty states are **in-page** (not separate routes), matching Empty/List component usage in design.

---

## 6. Recommended build order

Do not skip gates. Each phase needs its own implementation plan (files, interfaces, failing tests, acceptance).

| Phase | Focus | Exit gate |
|-------|--------|-----------|
| **0** | Legacy feature/schema map, fixtures, payroll golden cases | Map + fixtures reviewed |
| **1** | Monorepo, tenant mode, entitlements, UI shell, CI | Standalone + 2-tenant SaaS isolation |
| **2** | Org, memberships, roles, employees (**HR create employee**), branches/depts | Full RLS role/scope matrix |
| **3** | Approvals engine, notifications, audit, jobs, R2 | Cross-tenant file + approval tests |
| **4** | Leave + My Calendar | Leave importer reconciled |
| **5** | Attendance (clock, history, timesheet, manual, late) | Attendance importer reconciled |
| **6** | Claims, OT, replacement credit | Payout eligibility rules tested |
| **7** | Documents, assets, announcements, appraisal, compliance | File hash/count checks |
| **8** | Malaysia payroll (EPF/SOCSO/EIS/PCB/HRD) | Golden cases + statutory review |
| **9** | Professional + Enterprise add-ons | Server-side entitlement enforcement |
| **10** | Full migration rehearsal + cutover | Reconciliation thresholds met |

Payroll statutory sources of truth: official KWSP / PERKESO / LHDN / HRD schedules. Payroll.my = comparison only, never a runtime dependency. Reference JSON in repo: `malaysia-payroll-official-2026.json`.

---

## 7. Legacy reference

Treat PHP as **behavioural documentation**, not code to port line-by-line.

Useful entry points under `hrms-fasttrade`:

- `setup.php.example`, `repair_database.php`
- `docs/TESTING_AND_QA.md`, `docs/PAYROLL_ACCURACY.md`
- `includes/payroll_functions.php`, `includes/payroll_period.php`
- Staff flows under `staff/` (leave, attendance, claims, etc.)

Preserve intended business rules; **do not** preserve insecure auth patterns.

---

## 8. Quality bar (every phase)

- Typecheck, lint, format, production build
- Vitest for domain rules / state machines
- Local Supabase integration tests
- pgTAP constraints + RLS matrices
- R2 access / expiry / tenant isolation tests
- Playwright journeys for affected roles (mobile + desktop where relevant)
- Import dry-run reconciliation (rows, relationships, amounts, files)
- Security review for auth, RLS, payroll, uploads, jobs

---

## 9. Explicit non-goals (v1)

- Bidirectional sync with PHP during development
- Scraping or calling Payroll.my in production payroll
- Building Branch Admin / Director / Owner / Platform Admin UI before Pencil designs exist
- Treating JWT claims as the authorization source of truth

---

## 10. First engineering week (suggested)

1. Read this brief + [architecture-notes.md](./architecture-notes.md) + open `pencil-new.pen`.
2. Phase 0: draft legacy feature map (tables + staff pages → new modules).
3. Scaffold monorepo (Phase 1) with `DEPLOYMENT_MODE`, empty Supabase project, CI.
4. Implement identity skeleton: organizations, memberships, roles, **HR create employee** + activation email stub.
5. Shell: auth pages + Employee sidebar routing matching Pencil names.

Questions / ambiguity → product owner; do not guess payroll or leave entitlement rules.
