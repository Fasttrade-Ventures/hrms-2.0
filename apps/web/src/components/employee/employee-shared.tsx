import { StatusPill } from "@hrms/ui";

export function RequestStatusPill({ status }: { status: string }) {
  const tone =
    status === "approved"
      ? "success"
      : status === "pending"
        ? "warning"
        : status === "rejected" || status === "cancelled"
          ? "danger"
          : "neutral";

  const label = status
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return <StatusPill label={label} tone={tone} />;
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amount);
}
