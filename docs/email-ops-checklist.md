# Email ops checklist (Resend)

Production mail needs a **verified Resend domain** aligned with `MAIL_FROM`. Health already fails when no domain is verified (`packages/platform/src/health/check.ts`).

## Before go-live

1. Create/verify a domain in [Resend](https://resend.com/domains).
2. Add DNS records (SPF, DKIM; DMARC recommended).
3. Confirm domain status is **verified** in Resend.
4. Set env:
   - `RESEND_API_KEY=…`
   - `MAIL_FROM=noreply@your-verified-domain`
5. Hit `GET /api/health` — `services.resend.ok` must be `true` and list a verified domain.
6. Smoke: forgot-password + HR activation email on a real inbox.

## Ongoing

- Cron routes (`/api/cron/notifications`, announcements, report-subscriptions, payslip-email) require `Authorization: Bearer CRON_SECRET`.
- Outbox pending depth is exposed on `/api/health` → `ops.notificationOutboxPending`.
- Payslip attachment uploads require real R2 (`R2_*`). Stub storage is **not** used in production unless `ALLOW_R2_STUB=1` (local escape hatch only).

## Related

- `.env.example`
- `docs/architecture-notes.md` (environments)
- `docs/development-phases.md` (Resend domain checkbox)
