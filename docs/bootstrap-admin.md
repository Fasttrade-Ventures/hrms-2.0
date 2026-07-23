# Bootstrap admin account

Use this once per environment to create the first HR administrator.

## Command

```bash
set -a && source apps/web/.env.local && set +a   # or export vars manually

pnpm bootstrap-admin \
  --email "you@company.com" \
  --password 'YourSecurePass123!' \
  --name "Your Name"
```

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEFAULT_ORGANIZATION_ID`

## What it creates

1. Supabase Auth user (email confirmed)
2. `employees` row (`ADMIN-001` if first admin)
3. `organization_memberships` with roles: `hr_administrator`, `organization_owner`

## After bootstrap

1. Sign in at `/auth/login`
2. **Change the password** via `/auth/forgot-password` or `/auth/change-password`
3. Do not share bootstrap credentials in chat or email

## Production (Fasttrade HRMS)

A bootstrap account was created during initial setup. Rotate its password before wider use.

To add role-specific test users later, either:

- Run `bootstrap-admin` with a different email and manually adjust roles in Supabase, or
- Wait for **Phase 3 — HR Create Employee** (preferred)

## Rotating credentials

```bash
# Option A: user self-service
# Forgot password on /auth/forgot-password

# Option B: delete and re-bootstrap (dev only)
# Remove user in Supabase Auth dashboard, then re-run bootstrap-admin
```
