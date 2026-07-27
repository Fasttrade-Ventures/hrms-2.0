# Smoke test results

**Last run:** 24 Jul 2026 (Documents hardening)  
**Command:** `pnpm smoke-test` (local + production)

## Summary

| Environment | Result |
|-------------|--------|
| Local (`http://localhost:3000`) | Run after deploy |
| Production (`https://hrms.asyrafdigital.com`) | Run after deploy |
| Unit/integration tests (`pnpm test`) | **12/12** documents compliance + folder ACL |

## Documents checklist (manual)

- [ ] HR upload PDF → appears in library → download works
- [ ] HR delete document → removed from library and R2
- [ ] Replace expired document → single row per type (unique index)
- [ ] Employee cannot download HR-only folder file (403 via file URL)
- [ ] Compliance matrix cell links open filtered library
- [ ] In-app notification appears for missing/expiring required doc
- [ ] Audit event logged for upload/delete

## Production env

Set on Vercel:

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`
- `CRON_SECRET`
- `RESEND_API_KEY` (email notifications)

## Migrations

```bash
supabase db push
```

Includes:

- `20260724180000_required_documents.sql`
- `20260724190000_seed_default_required_documents.sql`
- `20260724200000_employee_documents_unique_type.sql`

## Re-run

```bash
set -a && source apps/web/.env.local && set +a
pnpm smoke-test --base-url http://localhost:3000
pnpm test tests/integration/documents-compliance.test.ts
```
