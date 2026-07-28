import { PortalLayout } from "@/components/portal-layout";

export default function AuditorLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayout portal="Auditor">{children}</PortalLayout>;
}
