export type AssetCategoryFieldType = "text" | "number" | "date" | "select";

export type AssetCategoryField = {
  key: string;
  label: string;
  type: AssetCategoryFieldType;
  required?: boolean;
  options?: string[];
};

export type AssetCustomValues = Record<string, string | number | null>;

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function validateCustomValues(
  schema: AssetCategoryField[],
  values: Record<string, unknown>,
): AssetCustomValues {
  const normalized: AssetCustomValues = {};

  for (const field of schema) {
    const raw = values[field.key];

    if (isBlank(raw)) {
      if (field.required) {
        throw new Error(`${field.label} is required.`);
      }
      normalized[field.key] = null;
      continue;
    }

    switch (field.type) {
      case "text": {
        const text = String(raw).trim();
        if (!text && field.required) {
          throw new Error(`${field.label} is required.`);
        }
        normalized[field.key] = text || null;
        break;
      }
      case "number": {
        const num = typeof raw === "number" ? raw : Number(raw);
        if (Number.isNaN(num)) {
          throw new Error(`${field.label} must be a number.`);
        }
        normalized[field.key] = num;
        break;
      }
      case "date": {
        const date = String(raw).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw new Error(`${field.label} must be a valid date (YYYY-MM-DD).`);
        }
        normalized[field.key] = date;
        break;
      }
      case "select": {
        const option = String(raw).trim();
        const options = field.options ?? [];
        if (!options.includes(option)) {
          throw new Error(`${field.label} must be one of: ${options.join(", ")}.`);
        }
        normalized[field.key] = option;
        break;
      }
      default:
        normalized[field.key] = String(raw);
    }
  }

  return normalized;
}
