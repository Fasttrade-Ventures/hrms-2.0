# Standalone SaaS master-prompt gap analysis — design

**Date:** 2026-08-27  
**Status:** Design approved · Findings published 2026-08-27 · **Re-audit published 2026-08-27 evening**  
**Source:** Ultimate Standalone SaaS System Master Prompt (uploaded)  
**Lens:** Standalone-first commercial readiness (Approach 1)  
**Depth:** Hybrid — cluster scorecard + deep dive only on Critical/High REFACTOR|MISSING

## Goal

Map the existing HRMS against the master prompt using existing-project rules (KEEP / REFACTOR / REPLACE / REMOVE / MISSING). Produce a prioritized backlog for standalone sellability. Do **not** rebuild the product. Do **not** implement fixes in this track.

**Re-audit note:** Evening pass re-scored after packages 1–10; method unchanged. Latest findings: `docs/superpowers/specs/2026-08-27-saas-master-prompt-gap-analysis-findings.md`.

## Decisions locked

| Topic | Decision |
| --- | --- |
| Deliverable | Gap analysis only (option D) |
| Depth | Hybrid (option C): ~18 clusters, drill Critical/High |
| Prioritization lens | Standalone-first (Approach 1) |
| SaaS packaging | FUTURE appendix only (billing provider, marketing site, multi-tenant GA) |
| Relation to audit | Align with / sequence after `docs/superpowers/plans/2026-08-27-audit-remediation.md` |
| Implementation | Out of scope until findings accepted, then `writing-plans` for top package only |

## Classification labels

| Label | Meaning |
| --- | --- |
| KEEP | Fits master-prompt intent; leave alone |
| REFACTOR | Exists but incomplete, inconsistent, or risky |
| MISSING | Needed for standalone commercial readiness; not built |
| FUTURE | Master-prompt item; defer until SaaS packaging |
| N/A | Not relevant to this HRMS (e.g. AI SaaS marketplace) |

`REPLACE` / `REMOVE` may appear in deep dives when evidence warrants; default preference is REFACTOR over rewrite.

## Severity (standalone lens)

| Severity | Meaning |
| --- | --- |
| Critical | Blocks trust, money, security, or payroll correctness |
| High | Hurts daily ops or commercial sellability |
| Medium | Quality / maturity debt |
| Low | Polish or nice-to-have |

## Capability clusters

1. Product identity & modes (public / app / platform admin)
2. Identity & authentication
3. Tenancy & organization model
4. Roles & permissions
5. Core HR domain (people, leave, attendance, claims/OT)
6. Payroll (Malaysia)
7. Entitlements & feature gating (not payment billing)
8. Billing & payments (mostly FUTURE)
9. Notifications & email
10. Files & media
11. Reporting, search, export/import
12. Audit & platform administration
13. UX systems (nav, tables, forms, empty/loading/error)
14. Security & API hardening
15. Jobs, cron, observability
16. Testing & CI
17. Documentation & ops readiness
18. Public website / SEO / GEO (FUTURE)

## Deep-dive rules

A cluster gets a deep dive only when:

- Classification is **REFACTOR** or **MISSING**, and
- Severity is **Critical** or **High**

Each deep dive must include:

1. Master-prompt section mapping (e.g. §7, §41)
2. Evidence paths (`apps/web/...`, `packages/...`, `docs/...`, `supabase/...`)
3. One-sentence gap statement
4. Impact (security / correctness / sellability / ops)
5. Recommended action (targeted; no redesign unless required)
6. Link to existing work when present (audit plan, `docs/branch-admin-backlog.md`, `docs/perf-followups.md`)

## Backlog prioritization order

1. Security & authz / tenant isolation  
2. Business correctness (leave, payroll, approvals)  
3. Data integrity & auditability  
4. Daily UX reliability (empty/loading/errors, Branch Admin parity blockers)  
5. Ops readiness (jobs, monitoring, docs)  
6. Commercial packaging that is not Stripe (onboarding, entitlements clarity)  
7. FUTURE SaaS items  

Backlog entries are **work packages** (not 110 checklist rows), each with: priority, effort band (S/M/L), depends-on, and whether to do after audit remediation.

## SaaS-delta appendix

One table covering at least: payment billing, public marketing/pricing site, multi-org switching, self-serve signup→pay, usage metering. All FUTURE under this lens, each with a one-line “when to promote.”

## Outputs

1. This design spec (method) — stable once approved  
2. Findings file: `docs/superpowers/specs/2026-08-27-saas-master-prompt-gap-analysis-findings.md` (scorecard table, deep dives, backlog, SaaS-delta)  
3. Interactive canvas scorecard (beside chat) mirroring the findings  
4. Ranked work-package backlog (section inside the findings file)  

## Research method

- Read-only pass over docs and targeted code  
- Prefer `docs/features.md`, `docs/architecture-notes.md`, `docs/developer-brief.md`, ADRs, payroll GA checklist, audit plan  
- Spot-check code when docs and audit plan disagree  
- Do not invent gaps for modules already marked done unless code evidence contradicts  

## Out of scope

- Implementing remediations or new product features  
- Rewriting modules that score KEEP  
- Promoting FUTURE SaaS work into Critical solely because the master prompt lists it  
- Changing locked audit product decisions (middleware fail-closed, leave empty-allowlist = all, Director approve vs HR lock, etc.)  

## Success criteria

- Every Critical/High claim has file/doc evidence  
- Scorecard covers all 18 clusters  
- Backlog is sequenced relative to current audit remediation  
- Clear stop: analysis complete → user accepts findings → only then writing-plans for #1 package  

## Next step after this spec is approved

Run the hybrid analysis, publish findings + canvas, then wait for acceptance before any implementation plan.
