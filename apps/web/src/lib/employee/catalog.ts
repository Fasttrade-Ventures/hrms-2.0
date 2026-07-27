import {
  getAnnouncementViewer,
  listVisibleAnnouncements,
} from "@/lib/announcements/queries";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { createClient } from "@/lib/supabase/server";

export async function listClaimTypes() {
  const { organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("claim_types")
    .select("id, name, max_amount")
    .eq("organization_id", organizationId)
    .order("name");

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
