import { LeaveBlackoutsList } from "@/components/hr/organization/leave-blackouts";
import { requireProfessionalTier } from "@/lib/entitlements";
import { listLeaveTypes } from "@/lib/hr/organization";
import { listLeaveBlackouts } from "@/lib/leave/blackout";
import { requireRole } from "@/lib/auth/session";

export default async function LeaveBlackoutsPage() {
  await requireRole("hr_administrator");
  await requireProfessionalTier();

  const [blackouts, leaveTypes] = await Promise.all([listLeaveBlackouts(), listLeaveTypes()]);

  return <LeaveBlackoutsList blackouts={blackouts} leaveTypes={leaveTypes} />;
}
