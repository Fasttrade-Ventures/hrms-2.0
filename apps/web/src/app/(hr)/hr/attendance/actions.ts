"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { getEntitlements } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setClockInSelfieRequired(formData: FormData): Promise<void> {
  await requireRole("hr_administrator");
  const entitlements = await getEntitlements();
  if (entitlements.tier === "core") {
    throw new Error("Selfie clock-in is a Professional feature.");
  }
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ require_clock_in_selfie: enabled })
    .eq("id", await requireOrganizationId());
  if (error) throw new Error(error.message);
  revalidatePath("/hr/attendance");
  revalidatePath("/employee/attendance");
  revalidatePath("/employee/dashboard");
}
