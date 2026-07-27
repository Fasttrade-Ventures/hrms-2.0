import { redirect } from "next/navigation";

import { requireAuth, type AuthSession } from "@/lib/auth/session";

export function canAccessReports(session: AuthSession): boolean {
  return (
    session.membership.roles.includes("hr_administrator") ||
    session.membership.permissions.includes("auditor")
  );
}

export async function requireReportsAccess(): Promise<AuthSession> {
  const session = await requireAuth();
  if (!canAccessReports(session)) redirect("/unauthorized");
  return session;
}
