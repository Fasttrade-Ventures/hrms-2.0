import { RostersPlanner } from "@/components/hr/organization/rosters";
import { requireRole } from "@/lib/auth/session";
import { requireProfessionalTier } from "@/lib/entitlements";
import { listBranches, listShifts } from "@/lib/hr/organization";
import { listRosterWeek } from "@/lib/hr/rosters";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export default async function RostersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProfessionalTier();
  await requireRole("hr_administrator");
  const params = await searchParams;
  const weekStart = typeof params.weekStart === "string" ? params.weekStart : undefined;
  const branchId = typeof params.branchId === "string" ? params.branchId : undefined;
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const [{ weekStart: resolvedWeekStart, weekDates, entries }, branches, shifts] = await Promise.all([
    listRosterWeek({ weekStart, branchId }),
    listBranches(),
    listShifts(),
  ]);

  let employeeQuery = supabase
    .from("employees")
    .select("id, full_name, employee_number")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("full_name");

  if (branchId) {
    employeeQuery = employeeQuery.eq("branch_id", branchId);
  }

  const { data: employees } = await employeeQuery;

  return (
    <RostersPlanner
      branchId={branchId}
      branches={branches}
      employees={(employees ?? []).map((row) => ({
        id: row.id,
        name: row.full_name ?? row.employee_number ?? "Employee",
        employeeNumber: row.employee_number ?? "—",
      }))}
      entries={entries}
      shifts={shifts}
      weekDates={weekDates}
      weekStart={resolvedWeekStart}
    />
  );
}
