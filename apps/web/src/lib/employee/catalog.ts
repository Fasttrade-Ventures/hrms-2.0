import {
  getAnnouncementViewer,
  listVisibleAnnouncements,
} from "@/lib/announcements/queries";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { createClient } from "@/lib/supabase/server";

export async function listClaimTypes() {
  const { organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  let { data, error } = await supabase
    .from("claim_types")
    .select("id, name, max_amount, is_mileage, rate_per_km, requires_receipt")
    .eq("organization_id", organizationId)
    .order("name");

  if (error && error.message.includes("requires_receipt")) {
    const fallback = await supabase
      .from("claim_types")
      .select("id, name, max_amount, is_mileage, rate_per_km")
      .eq("organization_id", organizationId)
      .order("name");
    data = (fallback.data ?? []).map((ct) => ({
      ...ct,
      requires_receipt: !ct.is_mileage,
    }));
    error = fallback.error;
  }

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAnnouncements() {
  const { organizationId, employeeId, session } = await requireEmployeeContext();
  const viewer = await getAnnouncementViewer({
    organizationId,
    employeeId,
    roles: session.membership.roles,
  });
  return listVisibleAnnouncements({ organizationId, viewer });
}

export async function listMyAssets() {
  const { listMyAssets: listAssets } = await import("@/lib/assets/queries");
  return listAssets();
}
