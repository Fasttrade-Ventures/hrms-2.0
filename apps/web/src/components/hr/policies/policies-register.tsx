import { EmptyState } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { HrField, HrTextInput } from "@/components/hr/employees/form-fields";
import { HrStatCards, HrTableCard } from "@/components/hr/hr-ui";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { publishPolicy } from "@/lib/policies/actions";

type PolicyRow = {
  id: string;
  title: string;
  version: number;
  fileId: string | null;
  publishedAt: string;
  missingCount: number;
  missingNames: string[];
};

const pdfInputClassName =
  "block w-full min-w-0 cursor-pointer rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-2 text-sm leading-none text-[var(--foreground-primary)] file:mr-3 file:inline-flex file:cursor-pointer file:items-center file:rounded-md file:border-0 file:bg-[var(--accent-primary)] file:px-3.5 file:py-2 file:align-middle file:text-sm file:font-medium file:leading-none file:text-white";

export function PoliciesRegister({ policies }: { policies: PolicyRow[] }) {
  const outstanding = policies.reduce((sum, policy) => sum + policy.missingCount, 0);
  const complete = policies.filter((policy) => policy.missingCount === 0).length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Publish a company PDF. Active staff must acknowledge each version. A new version asks them to read it again."
        title="Policies"
      />

      <HrStatCards
        items={[
          { label: "Policies", value: policies.length, hint: "Published documents" },
          { label: "Outstanding", value: outstanding, hint: "Acknowledgements still due" },
          { label: "Fully acknowledged", value: complete, hint: "Current version signed by everyone" },
        ]}
      />

      <Card className="py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle>Publish a policy</CardTitle>
          <CardDescription>Starts at version 1. PDF only. It appears on each staff member&apos;s Policies page.</CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <form action={publishPolicy} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <HrField id="policy-title" label="Title">
              <HrTextInput id="policy-title" name="title" placeholder="e.g. Code of conduct" required />
            </HrField>
            <HrField id="policy-file" label="PDF file">
              <input accept="application/pdf,.pdf" className={pdfInputClassName} id="policy-file" name="file" required type="file" />
            </HrField>
            <Button type="submit">Publish</Button>
          </form>
        </CardContent>
      </Card>

      <HrTableCard>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="font-medium text-foreground">Policy register</p>
            <p className="text-sm text-muted-foreground">Who still needs to confirm the current version.</p>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {policies.length} {policies.length === 1 ? "policy" : "policies"}
          </p>
        </div>

        {policies.length === 0 ? (
          <div className="px-5 py-8">
            <EmptyState
              description="Publish the first PDF above. Staff will be asked to acknowledge it."
              title="No policies yet"
              variant="flat"
            />
          </div>
        ) : (
          <div className="divide-y">
            {policies.map((policy) => (
              <article key={policy.id}>
                <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.6fr)_7rem_11rem_auto] lg:items-start">
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="font-semibold text-foreground">{policy.title}</p>
                      <p className="text-sm text-muted-foreground">Published {formatDate(policy.publishedAt)}</p>
                    </div>
                    {policy.missingNames.length > 0 ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">Still to acknowledge: </span>
                        {policy.missingNames.join(", ")}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Every active staff member has acknowledged this version.</p>
                    )}
                  </div>
                  <Badge variant="outline">Version {policy.version}</Badge>
                  <Badge variant={policy.missingCount === 0 ? "success" : "warning"}>
                    {policy.missingCount === 0
                      ? "Acknowledged"
                      : `${policy.missingCount} outstanding`}
                  </Badge>
                  {policy.fileId ? (
                    <HrLinkButton href={`/api/files/${policy.fileId}/download`} size="sm" variant="outline">
                      View PDF
                    </HrLinkButton>
                  ) : (
                    <span className="text-sm text-muted-foreground">No file</span>
                  )}
                </div>
                <form action={publishPolicy} className="border-t bg-muted/40 px-5 py-3">
                  <input name="policyId" type="hidden" value={policy.id} />
                  <input name="title" type="hidden" value={policy.title} />
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <HrField id={`policy-file-${policy.id}`} label="New PDF version">
                      <input
                        accept="application/pdf,.pdf"
                        className={pdfInputClassName}
                        id={`policy-file-${policy.id}`}
                        name="file"
                        required
                        type="file"
                      />
                    </HrField>
                    <Button type="submit" variant="outline">
                      Publish version {policy.version + 1}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Staff who already signed must acknowledge this version again.
                  </p>
                </form>
              </article>
            ))}
          </div>
        )}
      </HrTableCard>
    </div>
  );
}
