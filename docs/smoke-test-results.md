# Smoke test results

**Last run:** 23 Jul 2026 (Apply Behalf implementation)  
**Command:** `pnpm smoke-test` (local + production)

## Summary

| Environment | Result |
|-------------|--------|
| Local (`http://localhost:3000`) | **19/19 passed** (after clearing corrupted `.next` and restarting `dev`) |
| Production (`https://hrms.asyrafdigital.com`) | **19/19 passed** |
| Unit/integration tests (`pnpm test`) | Previously **21/21** (not re-run this session) |

## Notes

- Smoke gate cleared before Apply Behalf UI work.
- Earlier local failure was environmental (stale/corrupt Next.js `.next`), not product regressions.
- Smoke script now tolerates non-JSON `/api/health` bodies instead of crashing.
- Full activation email / Org CRUD / payrun lock remain manual checks.

## Re-run

```bash
set -a && source apps/web/.env.local && set +a
pnpm smoke-test --base-url http://localhost:3000
pnpm smoke-test --base-url https://hrms.asyrafdigital.com
```
