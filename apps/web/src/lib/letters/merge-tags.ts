export const LETTER_MERGE_TAGS = [
  "candidate_name",
  "candidate_email",
  "job_title",
  "salary",
  "currency",
  "start_date",
  "organization_name",
  "requisition_title",
  "offer_date",
  "department",
  "employment_type",
  "work_location",
  "company_email",
  "company_phone",
] as const;

export type LetterMergeTag = (typeof LETTER_MERGE_TAGS)[number];

export type LetterMergeValues = Partial<Record<LetterMergeTag, string | number | null | undefined>>;

function formatValue(tag: LetterMergeTag, value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  if (tag === "salary" && typeof value === "number") return value.toFixed(2);
  if (tag === "salary" && typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value).toFixed(2);
  }
  return String(value);
}

/**
 * Keep merge replacements from gluing to neighbouring words
 * (e.g. `{{name}}procured` → `Ada procured`, or empty tag between tokens → single space).
 * Does not insert spaces next to punctuation like `{{name}},` or `({{name}})`.
 */
function withBoundarySpaces(value: string, before: string, after: string): string {
  if (value === "") {
    if (
      before &&
      after &&
      !/\s/.test(before) &&
      !/\s/.test(after) &&
      before !== "\n" &&
      after !== "\n" &&
      !/^[.,;:!?)\]}]/.test(after) &&
      !/[(\[{]$/.test(before)
    ) {
      return " ";
    }
    return "";
  }

  let out = value;
  if (
    before &&
    !/\s/.test(before) &&
    before !== "\n" &&
    !/[(\[{]$/.test(before) &&
    !/^[.,;:!?)\]}]/.test(out)
  ) {
    out = ` ${out}`;
  }
  if (
    after &&
    !/\s/.test(after) &&
    after !== "\n" &&
    !/^[.,;:!?)\]}]/.test(after) &&
    !/[(\[{]$/.test(out)
  ) {
    out = `${out} `;
  }
  return out;
}

/** Replace `{{tag}}` placeholders. Unknown tags are left unchanged. */
export function applyMergeTags(body: string, values: LetterMergeValues): string {
  return body.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (full, rawKey: string, offset: number, source: string) => {
    const key = rawKey.toLowerCase() as LetterMergeTag;
    if (!(LETTER_MERGE_TAGS as readonly string[]).includes(key)) return full;
    const raw = formatValue(key, values[key]);
    const before = offset > 0 ? source[offset - 1]! : "";
    const afterIndex = offset + full.length;
    const after = afterIndex < source.length ? source[afterIndex]! : "";
    return withBoundarySpaces(raw, before, after);
  });
}
