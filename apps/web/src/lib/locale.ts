export type DisplayCountry = "MY" | "AU";

/** Weekday and month names follow the organisation. The numeric date stays day/month/year. */
export function localeForCountry(country: DisplayCountry | null | undefined): "en-MY" | "en-AU" {
  return country === "AU" ? "en-AU" : "en-MY";
}

export function formatPortalDate(date: Date, country?: DisplayCountry | null): string {
  const weekday = date.toLocaleDateString(localeForCountry(country), { weekday: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${weekday}, ${day}/${month}/${date.getFullYear()}`;
}

export function formatPortalMonth(date: Date, country?: DisplayCountry | null): string {
  return date.toLocaleDateString(localeForCountry(country), { month: "long", year: "numeric" });
}

export function formatPortalTime(date: Date, country?: DisplayCountry | null, hour12 = true): string {
  return date.toLocaleTimeString(localeForCountry(country), {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  });
}
