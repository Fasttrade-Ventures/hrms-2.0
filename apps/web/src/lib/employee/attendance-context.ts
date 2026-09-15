import type { GeofenceConfig } from "@/lib/attendance/geofence";
import type { EmployeeShift } from "@/lib/attendance/shift";
import { resolveEmployeeShift } from "@/lib/attendance/shift";
import { orgLocalDateString } from "@/lib/datetime/org-timezone";
import { requireEmployeeContext } from "@/lib/employee/leave";
import { getEntitlements } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export type EmployeeAttendanceContext = {
  geofence: GeofenceConfig | null;
  locationModuleEnabled: boolean;
  shift: EmployeeShift | null;
};

export async function getEmployeeAttendanceContext(targetWorkDate?: string): Promise<EmployeeAttendanceContext> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();
  const effectiveDate = targetWorkDate || orgLocalDateString();

  const [entitlements, shift] = await Promise.all([
    getEntitlements(),
    resolveEmployeeShift(supabase, organizationId, employeeId, effectiveDate),
  ]);

  const locationModuleEnabled = entitlements.hasModule("location");
  if (!locationModuleEnabled) {
    return { geofence: null, locationModuleEnabled: false, shift };
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("branch_id")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!employee?.branch_id) {
    return { geofence: null, locationModuleEnabled: true, shift };
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("name, geofence_enabled, latitude, longitude, geofence_radius_m, geofence_outside_action")
    .eq("id", employee.branch_id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!branch?.geofence_enabled || branch.latitude == null || branch.longitude == null) {
    return { geofence: null, locationModuleEnabled: true, shift };
  }

  return {
    locationModuleEnabled: true,
    shift,
    geofence: {
      enabled: true,
      branchName: branch.name,
      latitude: Number(branch.latitude),
      longitude: Number(branch.longitude),
      radiusMeters: branch.geofence_radius_m ?? 100,
      outsideAction: branch.geofence_outside_action === "block" ? "block" : "flag",
    },
  };
}
