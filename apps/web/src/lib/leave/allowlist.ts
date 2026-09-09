import type { BalanceClient } from "@/lib/leave/balance";
import { createClient } from "@/lib/supabase/server";

/**
 * Empty allow-list means all org leave types are permitted (documented product policy).
 */
export async function assertLeaveTypeAllowed(params: {
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  client?: BalanceClient;
}): Promise<void> {
  const supabase = params.client ?? (await createClient());

  const { data: allowedRows, error: allowedError } = await supabase
    .from("employee_allowed_leave_types")
    .select("leave_type_id")
    .eq("organization_id", params.organizationId)
    .eq("employee_id", params.employeeId);

  if (allowedError) throw new Error(allowedError.message);

  const allowedIds = (allowedRows ?? []).map((row) => row.leave_type_id);
  if (allowedIds.length === 0) return;

  if (!allowedIds.includes(params.leaveTypeId)) {
    const { data: targetType } = await supabase
      .from("leave_types")
      .select("name")
      .eq("id", params.leaveTypeId)
      .maybeSingle();

    if (targetType?.name?.toLowerCase().includes("replacement")) {
      return;
    }

    throw new Error("This leave type is not available for your account.");
  }
}
