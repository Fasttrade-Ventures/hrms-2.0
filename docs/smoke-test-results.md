# Smoke test results

**Last run:** 23 Jul 2026  
**Command:** `pnpm smoke-test` (local + production)

## Summary

| Environment | Result |
|-------------|--------|
| Local (`http://localhost:3000`) | **19/19 passed** |
| Production (`https://hrms.asyrafdigital.com`) | **19/19 passed** |
| Unit/integration tests (`pnpm test`) | **21/21 passed** |

## Phase 1 — Auth

| Check | Local | Production |
|-------|-------|------------|
| Login page loads | ✓ | ✓ |
| Forgot password loads | ✓ | ✓ |
| Logout POST/GET → login | ✓ | ✓ |
| Unauthenticated `/hr/*` guarded | ✓ | ✓ |
| Unauthenticated `/employee/*` guarded | ✓ | ✓ |
| `/unauthorized` loads | ✓ | ✓ |
| Supabase health service ok | ✓ | ✓ |
| Browser: employee login → dashboard | ✓ | — |

## Phase 2 — Portal shell

| Check | Local | Production |
|-------|-------|------------|
| Forest Sage auth markers | ✓ | ✓ |
| Login form content | ✓ | ✓ |
| Browser: employee portal shell + sidebar | ✓ | — |

## Phase 3 — HR employees

| Check | Local | Production |
|-------|-------|------------|
| Organization exists | ✓ | ✓ |
| Employees + memberships in DB | ✓ (13) | ✓ (13) |
| Seeded role accounts present | ✓ | ✓ |
| Employee profiles populated | ✓ | ✓ |
| Audit events accessible | ✓ | ✓ |

## Notes

- Local `/api/health` returns `ok: false` when R2/Resend env vars are missing — expected for dev. Smoke test passes if **Supabase** service is healthy.
- Full activation email flow requires manual test with Resend configured on Vercel.

## Re-run

```bash
set -a && source apps/web/.env.local && set +a
pnpm smoke-test --base-url http://localhost:3000
pnpm smoke-test --base-url https://hrms.asyrafdigital.com
```
