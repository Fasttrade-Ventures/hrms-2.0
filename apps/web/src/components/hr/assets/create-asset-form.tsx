"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  createAssetAction,
  type HrActionState,
} from "@/app/(hr)/hr/assets/actions";
import {
  AssetCustomFields,
} from "@/components/hr/assets/asset-custom-fields";
import {
  HrField,
  HrFormMessage,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";
import type { AssetCategoryRow } from "@/lib/assets/types";

const initialState: HrActionState = {};

export function CreateAssetForm({
  categories,
  branches,
  employees,
}: {
  categories: AssetCategoryRow[];
  branches: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
}) {
  const [state, action, pending] = useActionState(createAssetAction, initialState);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");

  const fieldSchema = useMemo(
    () => categories.find((item) => item.id === categoryId)?.fieldSchema ?? [],
    [categories, categoryId],
  );

  return (
    <PortalSectionCard description="Register equipment and optionally assign on create." title="Add asset">
      <form action={action} className="space-y-4">
        <HrField id="name" label="Asset name">
          <HrTextInput id="name" name="name" required />
        </HrField>
        <HrField id="categoryId" label="Category">
          <HrSelect
            id="categoryId"
            name="categoryId"
            onChange={(event) => setCategoryId(event.target.value)}
            required
            value={categoryId}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </HrSelect>
        </HrField>
        <AssetCustomFields fieldSchema={fieldSchema} />
        <HrField id="serialNumber" label="Serial number">
          <HrTextInput id="serialNumber" name="serialNumber" />
        </HrField>
        <HrField id="branchId" label="Branch">
          <HrSelect defaultValue="" id="branchId" name="branchId">
            <option value="">Unassigned</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </HrSelect>
        </HrField>
        <HrField id="condition" label="Condition">
          <HrSelect defaultValue="" id="condition" name="condition">
            <option value="">—</option>
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="damaged">Damaged</option>
          </HrSelect>
        </HrField>
        <div className="grid gap-4 md:grid-cols-2">
          <HrField id="purchaseDate" label="Purchase date">
            <HrTextInput id="purchaseDate" name="purchaseDate" type="date" />
          </HrField>
          <HrField id="purchaseValue" label="Purchase value (MYR)">
            <HrTextInput id="purchaseValue" name="purchaseValue" />
          </HrField>
        </div>
        <HrField id="warrantyExpiresOn" label="Warranty expires">
          <HrTextInput id="warrantyExpiresOn" name="warrantyExpiresOn" type="date" />
        </HrField>
        <HrField id="notes" label="Notes">
          <HrTextInput id="notes" name="notes" />
        </HrField>
        <HrField id="assignedEmployeeId" label="Assign to">
          <HrSelect defaultValue="" id="assignedEmployeeId" name="assignedEmployeeId">
            <option value="">Leave unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_number} · {employee.full_name}
              </option>
            ))}
          </HrSelect>
        </HrField>
        <HrField id="issuedAt" label="Issued date">
          <HrTextInput id="issuedAt" name="issuedAt" type="date" />
        </HrField>
        <HrFormMessage error={state.error} success={state.success} />
        <HrPrimaryButton disabled={pending} type="submit">
          {pending ? "Saving…" : "Create asset"}
        </HrPrimaryButton>
        <p className="text-sm text-muted-foreground">
          Manage categories under{" "}
          <Link className="underline" href="/hr/organization/asset-categories">
            Organization → Asset categories
          </Link>
          .
        </p>
      </form>
    </PortalSectionCard>
  );
}
