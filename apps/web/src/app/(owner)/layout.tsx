import type { ReactNode } from "react";

import { PortalLayout } from "@/components/portal-layout";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <PortalLayout portal="Organization Owner">{children}</PortalLayout>;
}
