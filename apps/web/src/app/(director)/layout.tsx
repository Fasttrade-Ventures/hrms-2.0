import type { ReactNode } from "react";

import { PortalLayout } from "@/components/portal-layout";

export default function DirectorLayout({ children }: { children: ReactNode }) {
  return <PortalLayout portal="Director">{children}</PortalLayout>;
}
