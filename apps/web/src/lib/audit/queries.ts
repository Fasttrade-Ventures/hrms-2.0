import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type AuditEventRow = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  occurredAt: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmployeeNumber: string | null;
  metadata: Record<string, unknown>;
};

export type AuditEventListResult = {
  events: AuditEventRow[];
  nextCursor: string | null;
};

type ListOptions = {
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};

async function resolveActors(
  organizationId: string,
  actorUserIds: string[],
): Promise<Map<string, { name: string | null; employeeNumber: string | null }>> {
  const map = new Map<string, { name: string | null; employeeNumber: string | null }>();
  if (actorUserIds.length === 0) return map;

  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_memberships")
    .select("user_id, employees(full_name, employee_number)")
    .eq("organization_id", organizationId)
    .in("user_id", actorUserIds);

  for (const row of data ?? []) {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    map.set(row.user_id, {
      name: (employee as { full_name?: string } | null)?.full_name ?? null,
      employeeNumber: (employee as { employee_number?: string } | null)?.employee_number ?? null,
    });
  }

  return map;
}

function mapRow(
  row: {
    id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    occurred_at: string;
    actor_user_id: string | null;
    metadata: Record<string, unknown> | null;
  },
  actors: Map<string, { name: string | null; employeeNumber: string | null }>,
): AuditEventRow {
  const actor = row.actor_user_id ? actors.get(row.actor_user_id) : undefined;
  return {
    id: row.id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    occurredAt: row.occurred_at,
    actorUserId: row.actor_user_id,
    actorName: actor?.name ?? null,
    actorEmployeeNumber: actor?.employeeNumber ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export async function listAuditEvents(options: ListOptions = {}): Promise<AuditEventListResult> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIST_PAGE_SIZE, 1), 200);

  let query = supabase
    .from("audit_events")
    .select("id, action, resource_type, resource_id, occurred_at, actor_user_id, metadata")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options.action) query = query.ilike("action", `%${options.action}%`);
  if (options.resourceType) query = query.eq("resource_type", options.resourceType);
  if (options.from) query = query.gte("occurred_at", options.from);
  if (options.to) query = query.lte("occurred_at", `${options.to}T23:59:59.999Z`);

  if (options.cursor) {
    const [occurredAt, id] = options.cursor.split("|");
    if (occurredAt && id) {
      query = query.or(`occurred_at.lt.${occurredAt},and(occurred_at.eq.${occurredAt},id.lt.${id})`);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const actorIds = [
    ...new Set(pageRows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id))),
  ];
  const actors = await resolveActors(organizationId, actorIds);

  const events = pageRows.map((row) => mapRow(row, actors));
  const last = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && last ? `${last.occurred_at}|${last.id}` : null;

  return { events, nextCursor };
}

export function auditEventsToCsv(events: AuditEventRow[]): string {
  const header = [
    "occurred_at",
    "action",
    "resource_type",
    "resource_id",
    "actor_name",
    "actor_employee_number",
    "metadata",
  ];
  const lines = events.map((event) =>
    [
      event.occurredAt,
      event.action,
      event.resourceType,
      event.resourceId,
      event.actorName ?? "",
      event.actorEmployeeNumber ?? "",
      JSON.stringify(event.metadata),
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
