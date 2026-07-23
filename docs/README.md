# HRMS documentation

Hand these docs to engineering before implementation.

| Doc | Purpose |
|-----|---------|
| [Feature list](./features.md) | **Full product features** — all modules, Core / Pro / Ent, UI status |
| [Developer brief](./developer-brief.md) | **Primary handoff** — product scope, stack, roles, modules, build order, rules |
| [UI design inventory](./ui-design-inventory.md) | Pencil screen checklist by role (source of truth for UI) |
| [Architecture notes](./architecture-notes.md) | Deployment modes, authz model, packages, data boundaries |
| [Architecture decisions](./architecture/README.md) | ADRs |
| [Legacy feature map](./legacy-feature-map/README.md) | Phase 0 baseline — tables, modules, migration domains |
| [Cutover runbook](./architecture/cutover-runbook.md) | Phase 10 one-time cutover procedure |

**Design file:** [`../pencil-new.pen`](../pencil-new.pen)  
**Legacy reference (read-only):** [`hrms-fasttrade`](../../hrms-fasttrade)  
**Roadmap (planning):** `~/.cursor/plans/hybrid-hrms-roadmap_8f773285.plan.md`

## Getting started (scaffold)

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm test
pnpm build
pnpm legacy-import --dry-run
```

See [root README](../README.md) for monorepo layout.

**Status (UI design):** Employee ✅ · Manager ✅ · HR Admin 🟡 · Branch Admin / Director / Owner / Platform Admin ⬜
