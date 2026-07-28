import Link from "next/link";

import { CreateRequisitionForm } from "@/components/hr/recruitment/create-requisition-form";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listRequisitions } from "@/lib/recruitment/requisitions";

export default async function Page() {
  await requireModule("recruitment");
  await requireRole("hr_administrator");

  const requisitions = await listRequisitions();

  return (
    <div className="space-y-8">
      <PortalPageHeader description="Manage hiring requisitions and candidate pipeline." title="Recruitment" />
      <CreateRequisitionForm />
      <PortalSectionCard title="Open requisitions">
        <ul className="space-y-3">
          {requisitions.map((row) => (
            <li key={row.id}>
              <Link className="block rounded-lg border p-3 hover:bg-muted/30" href={`/hr/recruitment/${row.id}`}>
                <p className="font-medium">{row.title}</p>
                <p className="text-sm text-muted-foreground">
                  {row.status} · {row.headcount} headcount
                </p>
              </Link>
            </li>
          ))}
          {requisitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requisitions yet.</p>
          ) : null}
        </ul>
      </PortalSectionCard>
    </div>
  );
}
