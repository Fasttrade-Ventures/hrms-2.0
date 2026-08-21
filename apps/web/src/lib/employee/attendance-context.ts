import type { GeofenceConfig } from "@/lib/attendance/geofence";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { getEntitlements } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export async function getEmployeeAttendanceContext(): Promise<{
  geofence: GeofenceConfig | null;
  locationModuleEnabled: boolean;
}> {
  const entitlements = await getEntitlements();
  const locationModuleEnabled = entitlements.hasModule("location");
  if (!locationModuleEnabled) {
    return { geofence: null, locationModuleEnabled: false };
  }

  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("branch_id")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!employee?.branch_id) {
    return { geofence: null, locationModuleEnabled: true };
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("name, geofence_enabled, latitude, longitude, geofence_radius_m")
    .eq("id", employee.branch_id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!branch?.geofence_enabled || branch.latitude == null || branch.longitude == null) {
    return { geofence: null, locationModuleEnabled: true };
  }

  return {
    locationModuleEnabled: true,
    geofence: {
      enabled: true,
      branchName: branch.name,
      latitude: Number(branch.latitude),
      longitude: Number(branch.longitude),
      radiusMeters: branch.geofence_radius_m ?? 100,
    },
  };
}
