"use client";

import {
  HrField,
  HrSelect,
  HrTextarea,
  HrTextInput,
} from "@/components/hr/employees/form-fields";

export type OrgSelectOption = { id: string; name: string };

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
] as const;

export function RequisitionFormFields({
  branches,
  departments,
  defaults,
  idPrefix = "",
}: {
  branches: OrgSelectOption[];
  departments: OrgSelectOption[];
  defaults?: {
    title?: string;
    description?: string | null;
    headcount?: number;
    employmentType?: string | null;
    departmentId?: string | null;
    branchId?: string | null;
  };
  idPrefix?: string;
}) {
  const titleId = `${idPrefix}title`;
  const descriptionId = `${idPrefix}description`;
  const headcountId = `${idPrefix}headcount`;
  const employmentTypeId = `${idPrefix}employmentType`;
  const departmentId = `${idPrefix}departmentId`;
  const branchId = `${idPrefix}branchId`;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <HrField id={titleId} label="Title">
          <HrTextInput
            defaultValue={defaults?.title ?? ""}
            id={titleId}
            name="title"
            required
          />
        </HrField>
      </div>
      <div className="md:col-span-2">
        <HrField id={descriptionId} label="Description">
          <HrTextarea
            defaultValue={defaults?.description ?? ""}
            id={descriptionId}
            name="description"
            rows={3}
          />
        </HrField>
      </div>
      <HrField id={headcountId} label="Headcount">
        <HrTextInput
          defaultValue={String(defaults?.headcount ?? 1)}
          id={headcountId}
          max={99}
          min={1}
          name="headcount"
          required
          type="number"
        />
      </HrField>
      <HrField id={employmentTypeId} label="Employment type">
        <HrSelect
          defaultValue={defaults?.employmentType ?? "full_time"}
          id={employmentTypeId}
          name="employmentType"
        >
          {EMPLOYMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </HrSelect>
      </HrField>
      <HrField id={departmentId} label="Department">
        <HrSelect defaultValue={defaults?.departmentId ?? ""} id={departmentId} name="departmentId">
          <option value="">None</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </HrSelect>
      </HrField>
      <HrField id={branchId} label="Branch">
        <HrSelect defaultValue={defaults?.branchId ?? ""} id={branchId} name="branchId">
          <option value="">None</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </HrSelect>
      </HrField>
    </div>
  );
}
