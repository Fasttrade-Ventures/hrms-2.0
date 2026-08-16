import Link from "next/link";
import { EmptyState, ListCard } from "@hrms/ui";
import { submitClaim } from "@/app/(employee)/employee/actions";
import {
  EmployeeRequestForm,
  HrField,
  HrSelect,
  HrTextInput,
} from "@/components/employee/employee-request-form";
import {
  formatDate,
  formatCurrency,
  RequestStatusPill,
} from "@/components/employee/employee-shared";
import { PortalIcon } from "@/components/portal/portal-icons";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listClaimTypes } from "@/lib/employee/catalog";
import { listClaims } from "@/lib/employee/requests";

export default async function Page() {
  const [claimTypes, claims] = await Promise.all([
    listClaimTypes(),
    listClaims(),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <PortalPageHeader description="Submit expense claims for approval." title="Claims" />

      <EmployeeRequestForm
        action={submitClaim}
        description="Attach receipts when the claims module supports file uploads."
        submitLabel="Submit claim"
        title="New claim"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <HrField id="claimTypeId" label="Claim type">
            <HrSelect id="claimTypeId" name="claimTypeId" required>
              <option value="">Select type</option>
              {claimTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                  {type.max_amount ? ` (max MYR ${type.max_amount})` : ""}
                </option>
              ))}
            </HrSelect>
          </HrField>
          <HrField id="amount" label="Amount (MYR)">
            <HrTextInput id="amount" name="amount" placeholder="0.00" required />
          </HrField>
          <HrField id="receiptDate" label="Receipt date">
            <HrTextInput defaultValue={today} id="receiptDate" name="receiptDate" required type="date" />
          </HrField>
          <HrField id="description" label="Description">
            <HrTextInput id="description" name="description" placeholder="Optional" />
          </HrField>
        </div>
      </EmployeeRequestForm>

      <ListCard
        columns={[
          { key: "type", label: "Type" },
          { key: "date", label: "Receipt date", className: "hidden md:block flex-1" },
          { key: "amount", label: "Amount", className: "w-28" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={
          <EmptyState
            description="Submit your first claim using the form above."
            icon={<PortalIcon name="claims" className="h-6 w-6" />}
            title="No claims submitted yet"
          />
        }
        header={
          <p className="text-sm font-medium text-[var(--foreground-primary)]">
            My claims ({claims.length})
          </p>
        }
        rows={claims.map((claim) => ({
          id: claim.id,
          cells: {
            type: (
              <div>
                <Link
                  className="font-medium text-[var(--foreground-primary)] hover:text-[var(--accent-primary)]"
                  href={`/employee/claims/${claim.id}`}
                >
                  {claim.claimTypeName}
                </Link>
                {claim.description ? (
                  <p className="text-sm text-[var(--foreground-muted)]">{claim.description}</p>
                ) : null}
              </div>
            ),
            date: formatDate(claim.receiptDate),
            amount: formatCurrency(claim.amount),
            status: <RequestStatusPill status={claim.status} />,
          },
          action: (
            <Link
              className="text-sm font-medium text-[var(--accent-primary)]"
              href={`/employee/claims/${claim.id}`}
            >
              View
            </Link>
          ),
        }))}
      />
    </div>
  );
}
