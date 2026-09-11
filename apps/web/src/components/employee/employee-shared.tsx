import { StatusPill } from "@hrms/ui";

export function RequestStatusPill({ status }: { status: string }) {
  const tone =
    status === "approved"
      ? "success"
      : status === "pending"
        ? "warning"
        : status === "rejected" || status === "cancelled" || status === "revoked"
          ? "danger"
          : "neutral";

  const label = status
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return <StatusPill label={label} tone={tone} />;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${day}/${month}/${year}, ${time}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const [year, month, day] = value.split("T")[0]?.split("-") ?? [];
  if (year && month && day) {
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dayStr = String(d.getDate()).padStart(2, "0");
  const monthStr = String(d.getMonth() + 1).padStart(2, "0");
  const yearNum = d.getFullYear();
  return `${dayStr}/${monthStr}/${yearNum}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amount);
}
