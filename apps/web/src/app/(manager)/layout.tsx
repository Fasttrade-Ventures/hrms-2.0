import type { ReactNode } from "react";

import { PortalLayout } from "@/components/portal-layout";

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return <PortalLayout portal="Manager">{children}</PortalLayout>;
}
