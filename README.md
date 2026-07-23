# HRMS

Hybrid standalone-first HRMS monorepo (Next.js + Supabase + R2).

## Docs

Start with [docs/README.md](./docs/README.md).

## Quick start

```bash
pnpm install
cp .env.example .env.local   # apps/web — copy manually when needed
pnpm dev                     # starts @hrms/web on :3000
pnpm build
pnpm typecheck
```

## Structure

```text
apps/web              Next.js App Router (role route groups)
packages/domain       Pure domain rules
packages/platform     Tenant, entitlements, adapters
packages/db           Repositories + generated types
packages/ui           Design system shell
packages/validation   Zod schemas
packages/testkit      Fixtures
supabase/             Migrations + pgTAP tests
scripts/legacy-import Migration tooling
tests/                integration | e2e | migration
docs/                 Developer handoff
```

## Portals (scaffold routes)

- `/auth/*` — login, reset, activate, register
- `/employee/*` — employee self-service modules
- `/manager/*` — manager team + approvals
- `/hr/*` — HR administrator
- `/branch-admin/*`, `/director/*`, `/owner/*`, `/platform/*` — placeholders

Open `/` for a portal index.
