"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createAssetCategoryAction,
  updateAssetCategoryAction,
  type OrgActionState,
} from "@/app/(hr)/hr/organization/actions";
import {
  HrCheckbox,
  HrField,
  HrTextInput,
  OrgFormActions,
  OrgFormCard,
  OrgStatCards,
  OrgTableCell,
  OrgTableEditLink,
  OrgTableRow,
  OrgTableShell,
  OrgTableStatus,
} from "@/components/hr/organization/org-ui";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { AssetCategoryRow } from "@/lib/assets/types";

const initialState: OrgActionState = {};

function FieldBuilder({
  defaultSchema = [],
}: {
  defaultSchema?: AssetCategoryRow["fieldSchema"];
}) {
  const [rows, setRows] = useState(
    defaultSchema.length > 0
      ? defaultSchema
      : [{ key: "", label: "", type: "text" as const, required: false }],
  );

  return (
    <div className="space-y-3">
      <input name="fieldSchemaJson" type="hidden" value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-4">
          <HrTextInput
            defaultValue={row.key}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...next[index]!, key: event.target.value };
              setRows(next);
            }}
            placeholder="key"
          />
          <HrTextInput
            defaultValue={row.label}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...next[index]!, label: event.target.value };
              setRows(next);
            }}
            placeholder="Label"
          />
          <select
            className="rounded-md border px-3 py-2"
            defaultValue={row.type}
            onChange={(event) => {
              const next = [...rows];
              next[index] = {
                ...next[index]!,
                type: event.target.value as "text" | "number" | "date" | "select",
              };
              setRows(next);
            }}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Select</option>
          </select>
          <HrTextInput
            defaultValue={row.options?.join(", ") ?? ""}
            onChange={(event) => {
              const next = [...rows];
              next[index] = {
                ...next[index]!,
                options: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              };
              setRows(next);
            }}
            placeholder="Options (comma-separated)"
          />
        </div>
      ))}
      <button
        className="text-sm underline"
        onClick={() => setRows([...rows, { key: "", label: "", type: "text", required: false }])}
        type="button"
      >
        Add field
      </button>
    </div>
  );
}

export function AssetCategoriesList({ categories }: { categories: AssetCategoryRow[] }) {
  const active = categories.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex gap-2">
            <HrLinkButton href="/hr/organization" variant="outline">
              Back to hub
            </HrLinkButton>
            <HrLinkButton href="/hr/organization/asset-categories/create">Add category</HrLinkButton>
          </div>
        }
        description="Define asset types and custom fields for the register."
        title="Asset categories"
      />

      <OrgStatCards
        items={[
          { label: "Categories", value: categories.length, hint: "configured" },
          { label: "Active", value: active, hint: "in use" },
        ]}
      />

      <OrgTableShell
        emptyDescription="Create categories before registering assets."
        emptyTitle="No asset categories yet"
        headers={["Name", "Fields", "Sort", "Status", "Action"]}
        isEmpty={categories.length === 0}
      >
        {categories.map((category) => (
          <OrgTableRow key={category.id}>
            <OrgTableCell variant="name">{category.name}</OrgTableCell>
            <OrgTableCell variant="muted">{category.fieldSchema.length} field(s)</OrgTableCell>
            <OrgTableCell variant="muted">{category.sortOrder}</OrgTableCell>
            <OrgTableStatus label={category.isActive ? "Active" : "Inactive"} />
            <OrgTableEditLink href={`/hr/organization/asset-categories/${category.id}/edit`} />
          </OrgTableRow>
        ))}
      </OrgTableShell>
    </div>
  );
}

export function AssetCategoryForm({ category }: { category?: AssetCategoryRow }) {
  const boundUpdate = useMemo(
    () => (category ? updateAssetCategoryAction.bind(null, category.id) : createAssetCategoryAction),
    [category],
  );
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/organization/asset-categories" variant="outline">
            Back to list
          </HrLinkButton>
        }
        description="Custom fields appear on asset create and edit forms."
        title={category ? "Edit asset category" : "Create asset category"}
      />

      <OrgFormCard
        backHref="/hr/organization/asset-categories"
        description="Field keys must be unique within the category."
        title={category ? "Edit category" : "Create category"}
      >
        <form action={formAction} className="space-y-5">
          <HrField id="name" label="Category name">
            <HrTextInput defaultValue={category?.name ?? ""} id="name" name="name" required />
          </HrField>
          <HrField id="description" label="Description">
            <HrTextInput defaultValue={category?.description ?? ""} id="description" name="description" />
          </HrField>
          <HrField id="sortOrder" label="Sort order">
            <HrTextInput defaultValue={String(category?.sortOrder ?? 0)} id="sortOrder" name="sortOrder" type="number" />
          </HrField>
          <HrCheckbox defaultChecked={category?.isActive ?? true} id="isActive" label="Active" name="isActive" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Custom fields</p>
            <FieldBuilder defaultSchema={category?.fieldSchema} />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
          <OrgFormActions
            cancelHref="/hr/organization/asset-categories"
            pending={pending}
            submitLabel={category ? "Save category" : "Create category"}
          />
        </form>
      </OrgFormCard>
    </div>
  );
}
