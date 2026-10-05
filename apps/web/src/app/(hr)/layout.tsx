import type { ReactNode } from "react";

import { PortalLayout } from "@/components/portal-layout";

export default function HrLayout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout
      portal="HR Administrator"
      requiredPermissions={["recruiter", "document_custodian", "asset_manager"]}
      requiredRoles={["hr_administrator", "organization_owner"]}
    >
      {children}
    </PortalLayout>
  );
}
