import { combineDateAndLocalTime } from "@/lib/datetime/org-timezone";
import { createAdminClient } from "@/lib/supabase/admin";

/** Upsert attendance_records when a manual attendance request is approved. */
export async function applyApprovedAttendanceRequest(
  organizationId: string,
  attendanceRequestId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: request, error } = await admin
    .from("attendance_requests")
    .select("employee_id, request_date, session, clock_in_time, clock_out_time")
    .eq("id", attendanceRequestId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!request?.clock_in_time) return;

  const clockInAt = combineDateAndLocalTime(request.request_date, request.clock_in_time);
  const clockOutAt = request.clock_out_time
    ? combineDateAndLocalTime(request.request_date, request.clock_out_time)
    : null;

  const { error: upsertError } = await admin.from("attendance_records").upsert(
    {
      organization_id: organizationId,
      employee_id: request.employee_id,
      work_date: request.request_date,
      session: request.session ?? 1,
      clock_in_at: clockInAt,
      clock_out_at: clockOutAt,
      status: "manual",
    },
    { onConflict: "organization_id,employee_id,work_date,session" },
  );

  if (upsertError) throw new Error(upsertError.message);
}
