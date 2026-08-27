import { redirect } from "next/navigation";

import { requireAuth, type AuthSession } from "@/lib/auth/session";

/** HR org-wide reports and CSV export (not branch-scoped). */
export function canAccessOrgReports(session: AuthSession): boolean {
  return (
    session.membership.roles.includes("hr_administrator") ||
    session.membership.permissions.includes("auditor")
  );
}

export function canAccessReports(session: AuthSession): boolean {
  return (
    canAccessOrgReports(session) ||
    session.membership.roles.includes("branch_admin")
  );
}

export function canRunOrgReports(session: AuthSession): boolean {
  return (
    canAccessOrgReports(session) ||
    session.membership.roles.includes("director") ||
    session.membership.roles.includes("branch_admin")
  );
}

export async function requireReportsAccess(): Promise<AuthSession> {
  const session = await requireAuth();
  if (!canAccessReports(session)) redirect("/unauthorized");
  return session;
}

/** Gate org-wide CSV export — branch admins must use exportBranchReportCsv. */
export async function requireOrgReportExportAccess(): Promise<AuthSession> {
  const session = await requireAuth();
  if (!canAccessOrgReports(session)) redirect("/unauthorized");
  return session;
}

export async function requireReportRunnerAccess(): Promise<AuthSession> {
  const session = await requireAuth();
  if (!canRunOrgReports(session)) redirect("/unauthorized");
  return session;
}
