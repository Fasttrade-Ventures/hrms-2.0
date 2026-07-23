# Architecture decisions

Normative decisions for the hybrid HRMS rebuild. See [architecture-notes.md](../architecture-notes.md) for the short companion.

## ADR-001: Standalone-first, shared-schema SaaS

One codebase and one PostgreSQL schema. `DEPLOYMENT_MODE` selects tenant resolution and entitlement provider only.

## ADR-002: Authorization model

`Role + Scope + Permission` via `organization_memberships`. RLS enforces `organization_id` on every business table. UI visibility is not authorization.

## ADR-003: Identity separation

Supabase `auth.users` is separate from `employees`. HR creates employees; activation links auth identity to membership.

## ADR-004: Files on R2

Private bucket, tenant-prefixed keys, metadata in Postgres, download via short-lived signed URLs only.

## ADR-005: Payroll money

Use `decimal.js` (or equivalent) in `packages/domain`. Never JavaScript `number` for payroll amounts.

## ADR-006: Timezone

Store `timestamptz`; business rules evaluate in `Asia/Kuala_Lumpur`.

## ADR-007: Approvals

Single reusable approval state machine for leave, claims, OT, late, manual attendance, replacement credit.

## ADR-008: Design-first UI

Implement screens from `pencil-new.pen`. Shared shell components live in `packages/ui`.

## ADR-009: Legacy import

Repeatable idempotent pipeline in `scripts/legacy-import`. No bidirectional sync with PHP.

## ADR-010: Statutory payroll hierarchy

Official KWSP/PERKESO/LHDN schedules → Payroll.my fixtures → legacy PHP behaviour reference.
