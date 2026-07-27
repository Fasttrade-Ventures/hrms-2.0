"use client";

import type { AssetCategoryField } from "@hrms/domain";

import {
  HrField,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";

export function AssetCustomFields({
  fieldSchema,
  defaultValues = {},
}: {
  fieldSchema: AssetCategoryField[];
  defaultValues?: Record<string, unknown>;
}) {
  if (fieldSchema.length === 0) return null;

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <p className="text-sm font-medium">Category fields</p>
      {fieldSchema.map((field) => {
        const defaultValue = defaultValues[field.key];
        const name = `custom_${field.key}`;

        if (field.type === "select") {
          return (
            <HrField key={field.key} id={name} label={field.label}>
              <HrSelect defaultValue={String(defaultValue ?? "")} id={name} name={name} required={field.required}>
                <option value="">Select…</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </HrSelect>
            </HrField>
          );
        }

        return (
          <HrField key={field.key} id={name} label={field.label}>
            <HrTextInput
              defaultValue={defaultValue != null ? String(defaultValue) : ""}
              id={name}
              name={name}
              required={field.required}
              type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            />
          </HrField>
        );
      })}
    </div>
  );
}

export function readCustomValuesFromForm(
  formData: FormData,
  fieldSchema: AssetCategoryField[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fieldSchema) {
    const raw = String(formData.get(`custom_${field.key}`) ?? "").trim();
    if (raw) values[field.key] = field.type === "number" ? Number(raw) : raw;
  }
  return values;
}
