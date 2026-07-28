import { redirect } from "next/navigation";

import { requireAuth, type AuthSession } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export function canAccessAudit(session: AuthSession): boolean {
  return (
    session.membership.roles.includes("hr_administrator") ||
    session.membership.permissions.includes("auditor")
  );
}

export async function requireAuditAccess(): Promise<AuthSession> {
  const session = await requireAuth();
  if (!canAccessAudit(session)) redirect("/unauthorized");
  try {
    await requireModule("audit");
  } catch {
    redirect("/unauthorized");
  }
  return session;
}
