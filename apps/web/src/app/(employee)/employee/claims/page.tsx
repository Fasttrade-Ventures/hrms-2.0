import { submitClaim } from "@/app/(employee)/employee/actions";
import {
  EmployeeRequestForm,
  HrField,
  HrSelect,
  HrTextInput,
} from "@/components/employee/employee-request-form";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listClaimTypes } from "@/lib/employee/catalog";

export default async function Page() {
  const claimTypes = await listClaimTypes();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
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
    </div>
  );
}
