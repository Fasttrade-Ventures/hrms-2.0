"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { ACTIVE_ORG_COOKIE } from "@/lib/auth/organization-context";
import { listUserMemberships, requireAuth } from "@/lib/auth/session";

export async function switchOrganizationAction(organizationId: string): Promise<{ error?: string }> {
  const session = await requireAuth();
  const memberships = await listUserMemberships(session.user.id);
  const allowed = memberships.some((row) => row.organizationId === organizationId);

  if (!allowed) {
    return { error: "You are not a member of that organization." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return {};
}
