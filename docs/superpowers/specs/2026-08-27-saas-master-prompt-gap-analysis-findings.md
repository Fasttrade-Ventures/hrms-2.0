# Standalone SaaS master-prompt gap analysis — findings (re-audit)

**Date:** 2026-08-27 (evening re-audit + KEEP polish)  
**Prior pass:** Morning findings → residuals 1–10 → residuals 1–6 → KEEP cluster polish  
**Status:** All **15 KEEP + 1 former REFACTOR** promoted to KEEP (2 FUTURE remain).  
**Design:** [2026-08-27-saas-master-prompt-gap-analysis-design.md](./2026-08-27-saas-master-prompt-gap-analysis-design.md)  
**Lens:** Standalone-first (Approach 1) · Hybrid depth  
**Source:** Ultimate Standalone SaaS System Master Prompt  

**Verdict:** Standalone commercial readiness **~9/10** sellable pilot. Non-FUTURE scorecard is entirely **KEEP**. Remaining open work is intentional **Defer** (Pro automation, global search) or **FUTURE** SaaS packaging (billing, marketing, multi-org GA, MFA productization).

---

## Scorecard (18 clusters)

| # | Cluster | Class | Severity | One-line |
| --- | --- | --- | --- | --- |
| 1 | Product identity & modes | KEEP | Low | Auth / portals / platform surfaces clear; `/` is app entry |
| 2 | Identity & authentication | KEEP | Low | SSR + activate/reset; honest remember-me; `session_check_timeout` mapped |
| 3 | Tenancy & organization model | KEEP | Low | Standalone `DEFAULT_ORGANIZATION_ID` + org-scoped schema fit |
| 4 | Roles & permissions | KEEP | Low | Layouts aligned; deferred specialists documented as catalog-only |
| 5 | Core HR domain | KEEP | Low | Daily workflows + Branch Admin parity shipped; Pro automation remains upsell |
| 6 | Payroll (Malaysia) | KEEP | Low | Commercial GA checklist + domain calc + integration tests |
| 7 | Entitlements & feature gating | KEEP | Low | Standalone→enterprise default documented |
| 8 | Billing & payments | FUTURE | Low | No payment provider; correct for offline/standalone sales |
| 9 | Notifications & email | KEEP | Low | Outbox + Resend + crons; [email-ops-checklist.md](../../email-ops-checklist.md) |
| 10 | Files & media | KEEP | Low | R2 signed downloads; production fail-closed (stub only via `ALLOW_R2_STUB`) |
| 11 | Reporting, search, export/import | KEEP | Low | Soft-caps + export banner + payrun totals RPC; no global search (defer) |
| 12 | Audit & platform administration | KEEP | Low | Audit + crons; Platform dashboard shows `/api/health` probes |
| 13 | UX systems | KEEP | Low | Shared portal primitives; Branch Admin backlog closed |
| 14 | Security & API hardening | KEEP | Low | RLS CI-gated; durable rate limits; `/api/*` per-route by design |
| 15 | Jobs, cron, observability | KEEP | Low | Ledger deprecated; outbox SoT; health + Platform UI |
| 16 | Testing & CI | KEEP | Low | Unit + payroll-integration + RLS matrix + e2e-smoke |
| 17 | Documentation & ops readiness | KEEP | Low | Portal matrix, security checklist, email ops |
| 18 | Public website / SEO / GEO | FUTURE | Low | Login-only public surface |

**Summary:** 16 KEEP · 0 REFACTOR · 2 FUTURE

---

## KEEP polish shipped (this pass)

| Cluster | Fix |
| --- | --- |
| 2 Identity | `session_check_timeout` login message; remember-me copy matches `auth-session.md` |
| 9 Notifications | `docs/email-ops-checklist.md` + phases link |
| 10 Files | Outbox R2 stub gated (`ALLOW_R2_STUB` / non-prod only) |
| 12 Platform Admin | `/platform/dashboard` health + outbox depths |

---

## Still deferred / FUTURE

| Item | Class |
| --- | --- |
| Pro leave/attendance automation | Defer (Pro upsell) |
| Global search | Defer |
| Payment billing, marketing/SEO, multi-org GA, MFA productization | FUTURE |

---

## Acceptance

KEEP polish accepted 2026-08-27 — plan `docs/superpowers/plans/2026-08-27-keep-cluster-polish.md`.
