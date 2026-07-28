import { getImpersonationOrgId } from "@/lib/platform/impersonation";
import { getSession } from "@/lib/auth/session";

export async function getEffectiveOrganizationId(): Promise<string | null> {
  const deploymentMode = process.env.DEPLOYMENT_MODE ?? "standalone";
  const impersonateOrgId = await getImpersonationOrgId();

  if (impersonateOrgId) {
    return impersonateOrgId;
  }

  if (deploymentMode === "standalone") {
    return process.env.DEFAULT_ORGANIZATION_ID ?? null;
  }

  const session = await getSession();
  return session?.membership.organizationId ?? null;
}
