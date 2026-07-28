import Link from "next/link";

import { ApiKeysPanel } from "@/components/hr/integrations/api-keys-panel";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { loadApiKeys } from "@/app/(hr)/hr/integrations/api/actions";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export default async function Page() {
  await requireModule("api");
  await requireRole("hr_administrator", "organization_owner");

  const keys = await loadApiKeys();

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <Link className="text-sm font-medium text-primary" href="/hr/integrations">
            Back to integrations
          </Link>
        }
        description="Issue read-only API keys for employees, leave, and payroll."
        title="API keys"
      />
      <ApiKeysPanel keys={keys} />
    </div>
  );
}
