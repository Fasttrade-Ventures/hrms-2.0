import Link from "next/link";

import { EmptyState } from "@hrms/ui";

import { formatDateTime } from "@/components/employee/employee-shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuditEventRow } from "@/lib/audit/queries";

export function AuditLogPanel({
  events,
  nextCursor,
  exportHref,
  basePath,
  filters,
}: {
  events: AuditEventRow[];
  nextCursor: string | null;
  exportHref: string;
  basePath: string;
  filters: {
    action?: string;
    resourceType?: string;
    from?: string;
    to?: string;
  };
}) {
  const nextParams = new URLSearchParams();
  if (filters.action) nextParams.set("action", filters.action);
  if (filters.resourceType) nextParams.set("resourceType", filters.resourceType);
  if (filters.from) nextParams.set("from", filters.from);
  if (filters.to) nextParams.set("to", filters.to);
  if (nextCursor) nextParams.set("cursor", nextCursor);
  const nextHref = nextCursor ? `${basePath}?${nextParams.toString()}` : null;

  return (
    <div className="space-y-6">
      <form className="grid gap-4 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] p-4 lg:grid-cols-6">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="action">Action contains</Label>
          <Input defaultValue={filters.action ?? ""} id="action" name="action" placeholder="approval.approved" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="resourceType">Resource type</Label>
          <Input
            defaultValue={filters.resourceType ?? ""}
            id="resourceType"
            name="resourceType"
            placeholder="employee"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="from">From</Label>
          <Input defaultValue={filters.from ?? ""} id="from" name="from" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input defaultValue={filters.to ?? ""} id="to" name="to" type="date" />
        </div>
        <div className="flex items-end gap-2">
          <button
            className="h-8 rounded-lg border border-[var(--border-primary)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
            type="submit"
          >
            Filter
          </button>
          <Link
            className="inline-flex h-8 items-center rounded-lg px-4 text-sm text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
            href={basePath}
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--foreground-secondary)]">{events.length} events on this page</p>
        <a
          className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
          href={exportHref}
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-hidden border border-[var(--border-primary)] bg-[var(--surface-card)]">
        {events.length === 0 ? (
          <div className="p-6">
            <EmptyState description="Audit events will appear as users take actions." title="No events" />
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-primary)]">
            {events.map((event) => (
              <div className="px-5 py-4" key={event.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-[var(--foreground-primary)]">{event.action}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{formatDateTime(event.occurredAt)}</p>
                </div>
                <p className="text-sm text-[var(--foreground-secondary)]">
                  {event.resourceType} · {event.resourceId}
                </p>
                {event.actorName || event.actorEmployeeNumber ? (
                  <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
                    Actor: {event.actorName ?? "Unknown"}
                    {event.actorEmployeeNumber ? ` (${event.actorEmployeeNumber})` : ""}
                  </p>
                ) : null}
                {Object.keys(event.metadata).length > 0 ? (
                  <p className="mt-1 truncate text-xs text-[var(--foreground-muted)]">
                    {JSON.stringify(event.metadata)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {nextHref ? (
        <div className="flex justify-center">
          <Link
            className="rounded-lg border border-[var(--border-primary)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href={nextHref}
          >
            Load more
          </Link>
        </div>
      ) : null}
    </div>
  );
}
