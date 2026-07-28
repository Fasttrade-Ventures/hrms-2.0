import { Label } from "@/components/ui/label";

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

export function RatingSelect({
  id,
  name,
  label,
  defaultValue,
  required = true,
  disabled = false,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: number | null;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        id={id}
        name={name}
        required={required && !disabled}
      >
        <option disabled value="">
          Select rating
        </option>
        {RATING_OPTIONS.map((rating) => (
          <option key={rating} value={rating}>
            {rating} / 5
          </option>
        ))}
      </select>
    </div>
  );
}
