import { EmptyState } from "@hrms/ui";

import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { acknowledgePolicy } from "@/lib/policies/actions";
import { listPoliciesForEmployee } from "@/lib/policies/service";

export default async function EmployeePoliciesPage() {
  const policies = await listPoliciesForEmployee();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Read each company policy and confirm the current version."
        title="Policies"
      />

      {policies.length === 0 ? (
        <Card className="py-0">
          <CardContent className="px-5 py-8">
            <EmptyState
              description="HR has not published a policy for you to acknowledge."
              title="No policies yet"
              variant="flat"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {policies.map((policy) => (
            <Card className="py-0" key={policy.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 border-b px-5 py-4">
                <div className="min-w-0 space-y-1">
                  <CardTitle>{policy.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">Version {policy.version}</p>
                </div>
                <Badge variant={policy.acknowledged ? "success" : "warning"}>
                  {policy.acknowledged ? "Acknowledged" : "Needs acknowledgement"}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                {policy.fileId ? (
                  <HrLinkButton href={`/api/files/${policy.fileId}/download`} size="sm" variant="outline">
                    Read PDF
                  </HrLinkButton>
                ) : (
                  <p className="text-sm text-muted-foreground">No file is attached to this version.</p>
                )}
                {policy.acknowledged ? (
                  <p className="text-sm text-muted-foreground">You have acknowledged this version.</p>
                ) : (
                  <form action={acknowledgePolicy}>
                    <input name="policyId" type="hidden" value={policy.id} />
                    <Button type="submit">I have read this version</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
