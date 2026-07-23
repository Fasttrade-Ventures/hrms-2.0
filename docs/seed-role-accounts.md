# Seed role accounts

Creates one login per **portal role** so you can test every dashboard without editing Supabase manually.

## Command

```bash
set -a && source apps/web/.env.local && set +a

pnpm seed-role-accounts --password 'DemoPass123!'
```

Optional flags:

| Flag | Description |
|------|-------------|
| `--domain <domain>` | Email domain (default: `demo.hrms.local`) |
| `--include-platform` | Also create `platform_administrator` |
| `--dry-run` | Show planned accounts only |

## Accounts created

| Role | Email (default domain) | Employee # |
|------|------------------------|------------|
| `employee` | `employee@demo.hrms.local` | DEMO-EMP |
| `manager` | `manager@demo.hrms.local` | DEMO-MGR |
| `branch_admin` | `branch-admin@demo.hrms.local` | DEMO-BRN |
| `hr_administrator` | `hr-administrator@demo.hrms.local` | DEMO-HR |
| `director` | `director@demo.hrms.local` | DEMO-DIR |
| `organization_owner` | `organization-owner@demo.hrms.local` | DEMO-OWN |

> **Note:** Role names use hyphens in the email local part (`hr-administrator@…`, not `hr_administrator@…`).

## Behaviour

- **Idempotent:** re-running updates password and ensures the role is present on the membership.
- Does **not** remove your existing bootstrap admin (`acap_sum41@hotmail.com`).
- Uses service role (same as `bootstrap-admin`).

## Production tip

Use a real domain you control:

```bash
pnpm seed-role-accounts \
  --password 'YourSecurePass123!' \
  --domain 'asyrafdigital.com'
```

Emails become `employee@asyrafdigital.com`, `manager@asyrafdigital.com`, etc.

## Required env

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEFAULT_ORGANIZATION_ID`
