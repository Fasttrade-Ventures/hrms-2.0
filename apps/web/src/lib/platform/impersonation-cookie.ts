import { cookies } from "next/headers";

export const IMPERSONATION_COOKIE = "hrms_impersonate_org_id";

export async function getImpersonationOrgId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get?.(IMPERSONATION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}
