# Legacy import pipeline

Repeatable MySQL → PostgreSQL and uploads → R2 migration tooling.

## Planned layout

```text
scripts/legacy-import/
  README.md
  src/
    index.ts          # CLI entry
    mysql/            # table mappers
    files/            # upload → R2
    reconcile/        # row & file checks
```

Phase 0 deliverable. Not implemented in scaffold.
