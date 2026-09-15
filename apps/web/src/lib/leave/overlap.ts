import type { BalanceClient } from "@/lib/leave/balance";
import { createClient } from "@/lib/supabase/server";

export { findOverlappingLeave, type LeaveDateSpan } from "./overlap-utils";

export async function assertNoOverlappingLeave(params: {
  organizationId: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  excludeRequestId?: string;
  client?: BalanceClient;
}): Promise<void> {
  const supabase = params.client ?? (await createClient());

  let query = supabase
    .from("leave_requests")
    .select("id, start_date, end_date")
    .eq("organization_id", params.organizationId)
    .eq("employee_id", params.employeeId)
    .in("status", ["pending", "approved"])
    .lte("start_date", params.endDate)
    .gte("end_date", params.startDate);

  if (params.excludeRequestId) {
    query = query.neq("id", params.excludeRequestId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw new Error(error.message);

  if (data && data.length > 0) {
    throw new Error(
      "You already have an active leave request covering these dates. Please cancel your existing request first before applying again.",
    );
  }
}
