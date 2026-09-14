/** Default business timezone for Malaysian SME deployments. */
export const DEFAULT_ORG_TIMEZONE = "Asia/Kuala_Lumpur";

/** Calendar date (YYYY-MM-DD) in the org timezone. */
export function orgLocalDateString(date = new Date(), timeZone = DEFAULT_ORG_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

/** Combine a calendar date and HH:MM[:SS] time into an ISO timestamp in org local context. */
export function combineDateAndLocalTime(
  date: string,
  time: string,
  timeZone = DEFAULT_ORG_TIMEZONE,
): string {
  const normalized = time.trim().length === 5 ? `${time.trim()}:00` : time.trim();
  const probe = new Date(`${date}T${normalized}Z`);
  if (Number.isNaN(probe.getTime())) {
    throw new Error("Invalid date/time for attendance record.");
  }

  const utcMs = probe.getTime();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(probe);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const localIso = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
  const asUtc = new Date(`${localIso}Z`).getTime();
  const offsetMs = asUtc - utcMs;
  return new Date(utcMs - offsetMs).toISOString();
}
