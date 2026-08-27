import type { ReactNode } from "react";

import { PortalLayout } from "@/components/portal-layout";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout portal="Organization Owner" requiredRoles={["organization_owner"]}>
      {children}
    </PortalLayout>
  );
}
