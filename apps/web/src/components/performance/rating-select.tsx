import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-[var(--surface-card)] px-3.5 text-sm outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-60",
        )}
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
