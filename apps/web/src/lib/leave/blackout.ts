import { createClient } from "@/lib/supabase/server";

export type LeaveBlackoutRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  leaveTypeIds: string[] | null;
  leaveTypeNames: string[];
};

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

function datesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA <= endB && endA >= startB;
}

export async function listLeaveBlackouts(): Promise<LeaveBlackoutRow[]> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const [blackoutsRes, typesRes] = await Promise.all([
    supabase
      .from("leave_blackout_periods")
      .select("id, name, start_date, end_date, leave_type_ids")
      .eq("organization_id", organizationId)
      .order("start_date", { ascending: false }),
    supabase.from("leave_types").select("id, name").eq("organization_id", organizationId),
  ]);

  if (blackoutsRes.error) throw new Error(blackoutsRes.error.message);
  if (typesRes.error) throw new Error(typesRes.error.message);

  const typeNames = new Map((typesRes.data ?? []).map((row) => [row.id, row.name]));

  return (blackoutsRes.data ?? []).map((row) => {
    const leaveTypeIds = (row.leave_type_ids as string[] | null) ?? null;
    const leaveTypeNames =
      leaveTypeIds?.map((id) => typeNames.get(id) ?? "Unknown").filter(Boolean) ?? [];

    return {
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      leaveTypeIds,
      leaveTypeNames,
    };
  });
}

export async function assertLeaveDatesAllowed(
  organizationId: string,
  leaveTypeId: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leave_blackout_periods")
    .select("name, start_date, end_date, leave_type_ids")
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  for (const blackout of data ?? []) {
    const applies =
      !blackout.leave_type_ids?.length || (blackout.leave_type_ids as string[]).includes(leaveTypeId);
    if (!applies) continue;
    if (datesOverlap(startDate, endDate, blackout.start_date, blackout.end_date)) {
      throw new Error(
        `Leave is blocked during "${blackout.name}" (${blackout.start_date} to ${blackout.end_date}).`,
      );
    }
  }
}
