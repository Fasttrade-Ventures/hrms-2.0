# Cutover runbook

Phase 10 — one-time production cutover procedure.

## Pre-cutover

1. Freeze legacy PHP writes (maintenance banner).
2. Take final MySQL dump + uploads archive (checksum both).
3. Run `pnpm legacy-import --dry-run` against snapshot; reconcile to [migration-acceptance-criteria.md](../../docs/legacy-feature-map/migration-acceptance-criteria.md).
4. Complete role-based UAT (legacy QA guide + Playwright).
5. Rehearse rollback: restore snapshot, verify legacy operational.

## Cutover window

1. Enable maintenance mode on legacy.
2. Final snapshot (DB + files).
3. `pnpm legacy-import` (idempotent).
4. Verify reconciliation reports — all PASS.
5. Smoke test new system per role.
6. Switch DNS / user communication.
7. Keep legacy read-only for agreed audit period.

## Post-cutover

- Monitor audit logs and error rates for 72h.
- Archive reconciliation reports and snapshot checksums.
- Schedule statutory rule review (annual).
