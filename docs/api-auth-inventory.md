# API auth inventory

Middleware authenticates the user for non-public paths but **does not** run `canAccessPath` for `/api/*`. Each route must self-authenticate. Health and cron paths bypass session checks entirely.

| Route | Auth | Notes |
| --- | --- | --- |
| `GET /api/health` | none (public) | middleware bypass |
| `GET /api/cron/*` | `Authorization: Bearer CRON_SECRET` | middleware bypass; each route checks secret |
| `POST /api/auth/logout` | session cookies (optional user) | clears session; logs if user present |
| `POST /api/register` | SaaS-only + IP rate limit | no session; 429 when limited |
| `GET /api/v1/*` | `withApiAuth` (API key) | org-scoped via key |
| `GET /api/v1/openapi.json` | none (public schema doc) | Live `/api/v1/*` data routes still require API key |
| `GET /api/files/[fileId]/download` | session + download ACL | module + `canDownloadFile` |
| `GET /api/hr/audit/export` | `requireAuditAccess` | session role/permission |
| `GET /api/hr/performance/export` | session role (HR) | inspect route for exact gate |
| `GET /api/hr/payroll/exports/[exportId]/download` | `requireRole("hr_administrator")` | signed redirect |

**Rate limiting today:** durable Postgres RPC `consume_rate_limit` via `checkRateLimitDurable` (register + employee leave/claim/clock). In-memory `checkRateLimit` remains as unit-test / fallback path when admin RPC is unavailable.

**Last updated:** 2026-08-27 (residual package #5)
