export function Avatar({
  name,
  email,
  size = "md",
}: {
  name?: string;
  email?: string;
  size?: "sm" | "md";
}) {
  const label = name?.trim() || email?.trim() || "User";
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const sizeClass = size === "sm" ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-xs";

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-[var(--surface-accent-soft)] font-semibold text-[var(--accent-primary)] ${sizeClass}`}
    >
      {initials || "U"}
    </div>
  );
}
