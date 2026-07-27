export type DatePreset = "this_month" | "last_month" | "this_quarter" | "ytd" | "custom";

export function resolveDatePreset(
  preset: DatePreset,
  today: string,
): { from: string; to: string } {
  const parts = today.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const endOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

  if (preset === "this_month") {
    const last = endOfMonth(year, month);
    return {
      from: `${today.slice(0, 7)}-01`,
      to: `${today.slice(0, 7)}-${String(last).padStart(2, "0")}`,
    };
  }

  if (preset === "last_month") {
    const d = new Date(Date.UTC(year, month - 2, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const last = endOfMonth(y, m);
    return {
      from: `${y}-${String(m).padStart(2, "0")}-01`,
      to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    };
  }

  if (preset === "this_quarter") {
    const qStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
    const qEndMonth = qStartMonth + 2;
    const last = endOfMonth(year, qEndMonth);
    return {
      from: `${year}-${String(qStartMonth).padStart(2, "0")}-01`,
      to: `${year}-${String(qEndMonth).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    };
  }

  return { from: `${year}-01-01`, to: today };
}
