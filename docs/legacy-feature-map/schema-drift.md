# Legacy schema drift & auth weaknesses

Preserve **intended business behaviour**, not insecure implementation details.

## Schema drift

| Issue | Detail | Migration note |
|-------|--------|----------------|
| Dual schema sources | `setup.php.example` vs `repair_database.php` can diverge | Use repair script output on production snapshot as canonical column list |
| Collation mismatch | `utf8mb4_0900_ai_ci` vs `utf8mb4_unicode_ci` | Normalize to PostgreSQL `utf8` / ICU collation |
| No foreign keys | App-enforced relationships only | Add FKs + orphan detection in import reconciliation |
| Leave type reference | `leave_requests.leave_type` is VARCHAR name, not FK | Map by normalized name; dedupe legacy duplicates |
| Incremental columns | GPS, tax flags, statutory_wage_base via ALTER | Import script must handle NULL legacy rows |
| Legacy payroll rows | `statutory_wage_base` NULL → falls back to gross | Backfill during import where possible |
| EPF rate default | Schema default 13% vs seed 12% | Use per-employee stored rates as authoritative |
| String enums | Status values patched via MODIFY | Map to PostgreSQL enums + migration lookup table |

## Auth & security weaknesses (do not replicate)

| Area | Legacy risk | New system requirement |
|------|-------------|------------------------|
| `repair_database.php` | Public HTTP schema ALTER | Migrations via Supabase CLI only |
| Plaintext DB config | `config/db.php` on disk | Env / secrets manager |
| Session invalidation | Stale POST after logout | Supabase session + server actions |
| Per-page auth checks | Direct URL bypass risk | Middleware + RLS + route guards |
| API token | Single company-wide token | Per-integration scoped keys (Enterprise) |
| Cron endpoints | Optional secret only | Authenticated job ledger + Vercel cron secret |
| PIC-based manager scope | `users.pic_id` only | Formal `reporting_lines` + membership scope |

## Behaviour to preserve

- Two-level leave approval when configured
- Branch weekend modes and holiday calendars
- Replacement credit balance invariants
- Payrun Draft → In Review → Approved → Locked immutability
- Claims excluded from statutory base by default
- Join-date exclusion from earning period
