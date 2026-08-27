"use server";

import { revalidatePath } from "next/cache";

import { setActiveOrganizationCookie } from "@/lib/auth/organization-context";
import { listUserMemberships, requireAuth } from "@/lib/auth/session";

export async function switchOrganizationAction(organizationId: string): Promise<{ error?: string }> {
  const session = await requireAuth();
  const memberships = await listUserMemberships(session.user.id);
  const allowed = memberships.some((row) => row.organizationId === organizationId);

  if (!allowed) {
    return { error: "You are not a member of that organization." };
  }

  await setActiveOrganizationCookie(organizationId);

  revalidatePath("/", "layout");
  return {};
}
