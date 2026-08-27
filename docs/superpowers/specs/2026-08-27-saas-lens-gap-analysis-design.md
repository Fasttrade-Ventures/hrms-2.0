# SaaS-lens master-prompt gap analysis — design

**Date:** 2026-08-27  
**Status:** Approved (option C) · Findings published 2026-08-27  
**Source:** Ultimate Standalone SaaS System Master Prompt  
**Lens:** SaaS-first commercial readiness (hybrid depth)  
**Relation:** Complements standalone findings in `2026-08-27-saas-master-prompt-gap-analysis-findings.md`

## Goal

Map the existing HRMS against the master prompt for **SaaS / multi-tenant** readiness. Produce KEEP / REFACTOR / MISSING / FUTURE classifications and a prioritized backlog. Do **not** implement fixes in this track.

## Decisions locked

| Topic | Decision |
| --- | --- |
| Deliverable | Gap analysis only |
| Depth | Hybrid (option C): ~18 clusters; deep dive Critical/High REFACTOR\|MISSING |
| Prioritization lens | SaaS-first (self-serve multi-tenant + packaging) |
| Standalone | Already remediated — cite as KEEP where shared; do not re-litigate |
| Billing / marketing | In scorecard; classify FUTURE or REFACTOR by evidence (not auto-excluded) |
| Implementation | Out of scope until findings accepted |

## Severity (SaaS lens)

| Severity | Meaning |
| --- | --- |
| Critical | Blocks tenant isolation, money path, or safe multi-org GA |
| High | Blocks self-serve signup→use or daily multi-tenant ops |
| Medium | Quality / maturity debt for SaaS scale |
| Low | Polish |

## Capability clusters (same 18)

Reuse standalone cluster list; re-score each under SaaS assumptions (many orgs, shared DB, Platform Admin, registration, entitlements per tenant, billing).

## Outputs

1. This design  
2. Findings: `docs/superpowers/specs/2026-08-27-saas-lens-gap-analysis-findings.md`  
3. Canvas scorecard  
4. Ranked SaaS work packages  

## Out of scope

- Implementing remediations  
- Changing standalone product decisions already locked  
- Fake billing demos  
